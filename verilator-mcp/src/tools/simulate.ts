import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ToolResult, SimulationOptions, SimulationResult, AssertionResult } from '../types/index.js';
import { TestbenchGeneratorTool } from './testbench-generator.js';
import { CompileTool } from './compile.js';
import { promises as fs } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

const SimulateSchema = z.object({
  design: z.string().describe('Design file or compiled directory'),
  testbench: z.string().optional().describe('Testbench file (will auto-generate if missing)'),
  topModule: z.string().optional().describe('Top module name'),
  autoGenerateTestbench: z.boolean().default(true).describe('Auto-generate testbench if missing'),
  outputDir: z.string().default('sim_output').describe('Output directory for simulation artifacts'),
  timeout: z.number().default(60000).describe('Simulation timeout in milliseconds'),
  enableWaveform: z.boolean().default(true).describe('Generate waveform dump'),
  waveformFormat: z.enum(['vcd', 'fst', 'lxt2']).default('vcd'),
  waveformFile: z.string().optional().describe('Waveform output file'),
  enableCoverage: z.boolean().default(false).describe('Enable coverage collection'),
  coverageTypes: z.array(z.enum(['line', 'toggle', 'functional', 'branch'])).optional(),
  enableAssertions: z.boolean().default(true).describe('Enable assertion checking'),
  optimizationLevel: z.number().min(0).max(3).default(2),
  defines: z.record(z.union([z.string(), z.number()])).optional(),
  plusargs: z.record(z.union([z.string(), z.number()])).optional(),
  useExistingBuild: z.boolean().default(false).describe('Use existing compiled output'),
  simulationTime: z.number().optional().describe('Override simulation time'),
  verbose: z.boolean().default(false).describe('Verbose output'),
});

type SimulateParams = z.infer<typeof SimulateSchema>;

export class SimulateTool extends AbstractTool<SimulateParams, SimulationResult> {
  private testbenchGenerator: TestbenchGeneratorTool;
  private compiler: CompileTool;

  constructor(configManager: any, cacheManager: any) {
    super('verilator_simulate', 'verilator', configManager, cacheManager, SimulateSchema);
    this.testbenchGenerator = new TestbenchGeneratorTool(configManager, cacheManager);
    this.compiler = new CompileTool(configManager, cacheManager);
  }

  getDescription(): string {
    return 'Run RTL simulation with automatic testbench generation if needed';
  }

  protected async buildArguments(params: SimulateParams): Promise<string[]> {
    // This tool orchestrates compilation and execution
    // Arguments will be built separately for each phase
    return [];
  }

  protected async processResult(
    result: any,
    params: SimulateParams
  ): Promise<ToolResult<SimulationResult>> {
    try {
      // Step 1: Check if testbench exists or needs generation
      let testbenchFile = params.testbench;
      let generatedTestbench = false;

      if (!testbenchFile && params.autoGenerateTestbench) {
        logger.info('No testbench provided, generating one automatically...');
        
        // Determine module name
        const moduleName = params.topModule || await this.detectTopModule(params.design);
        
        // Generate testbench
        const tbResult = await this.testbenchGenerator.execute({
          targetFile: params.design,
          targetModule: moduleName,
          outputFile: join(params.outputDir, `tb_${moduleName}.sv`),
          template: 'basic',
          stimulusType: 'directed',
          simulationTime: params.simulationTime || 10000,
          generateAssertions: params.enableAssertions,
          generateCoverage: params.enableCoverage,
        });

        if (!tbResult.success || !tbResult.data) {
          throw new Error('Failed to generate testbench: ' + (tbResult.error || 'Unknown error'));
        }

        testbenchFile = tbResult.data.generatedFile;
        generatedTestbench = true;
      }

      // Step 2: Compile design and testbench if needed
      let executablePath: string;
      let buildDir: string;

      if (params.useExistingBuild) {
        // Use existing build
        buildDir = params.design.endsWith('_dir') ? params.design : 'obj_dir';
        const moduleName = params.topModule || 'top';
        executablePath = join(buildDir, `V${moduleName}`);
        
        // Verify executable exists
        await fs.access(executablePath);
      } else {
        // Compile design and testbench
        logger.info('Compiling design and testbench...');
        
        const files = [params.design];
        if (testbenchFile) {
          files.push(testbenchFile);
        }

        const compileResult = await this.compiler.execute({
          files,
          topModule: testbenchFile ? `tb_${params.topModule || 'top'}` : params.topModule,
          outputDir: join(params.outputDir, 'obj_dir'),
          optimization: params.optimizationLevel,
          trace: params.enableWaveform,
          traceFormat: params.waveformFormat as 'vcd' | 'fst',
          coverage: params.enableCoverage,
          defines: params.defines,
        });

        if (!compileResult.success || !compileResult.data) {
          throw new Error('Compilation failed: ' + (compileResult.error || 'Unknown error'));
        }

        buildDir = compileResult.data.outputDir;
        executablePath = compileResult.data.executable || join(compileResult.data.outputDir, `V${params.topModule || 'top'}`);
      }

      // Step 3: Run simulation
      logger.info('Running simulation...');
      const simResult = await this.runSimulation(executablePath, params);

      // Step 4: Process results
      const result: SimulationResult = {
        passed: simResult.exitCode === 0,
        simulationTime: params.simulationTime || 10000,
        realTime: simResult.duration,
        logFile: join(params.outputDir, 'simulation.log'),
        errors: [],
        warnings: [],
      };

      // Save simulation log
      await fs.mkdir(params.outputDir, { recursive: true });
      await fs.writeFile(result.logFile!, simResult.stdout + '\n' + simResult.stderr);

      // Parse errors and warnings
      const errors = ErrorHandler.parseVerilatorOutput(simResult.stderr);
      result.errors = errors.filter(e => e.type === 'error').map(e => e.message);
      result.warnings = errors.filter(e => e.type === 'warning').map(e => e.message);

      // Handle waveform
      if (params.enableWaveform) {
        const waveformName = params.waveformFile || `simulation.${params.waveformFormat}`;
        result.waveformFile = join(params.outputDir, waveformName);
        
        // Move waveform file if it was generated in a different location
        try {
          const defaultWaveform = join(dirname(executablePath), waveformName);
          if (await this.fileExists(defaultWaveform)) {
            await fs.rename(defaultWaveform, result.waveformFile!);
          }
        } catch {
          // Waveform might already be in the right place
        }
      }

      // Handle coverage
      if (params.enableCoverage) {
        result.coverageFile = join(params.outputDir, 'coverage.dat');
        // Verilator coverage data would need to be processed
      }

      // Parse assertions
      result.assertions = this.parseAssertions(simResult.stdout);

      // Calculate statistics
      result.statistics = {
        cycleCount: this.extractNumber(simResult.stdout, /(\d+)\s+cycles?/i) || 0,
        eventCount: this.extractNumber(simResult.stdout, /(\d+)\s+events?/i) || 0,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuTime: simResult.duration,
      };

      return {
        success: result.passed,
        data: result,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
      };

    } catch (error) {
      logger.error('Simulation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async detectTopModule(designFile: string): Promise<string> {
    // Simple detection - look for module declaration
    const content = await fs.readFile(designFile, 'utf-8');
    const moduleMatch = content.match(/module\s+(\w+)\s*(?:#|\()/);
    
    if (moduleMatch) {
      return moduleMatch[1];
    }

    // Default to filename without extension
    return basename(designFile, '.v').replace(/\.(sv|verilog|systemverilog)$/, '');
  }

  private async runSimulation(
    executablePath: string,
    params: SimulateParams
  ): Promise<any> {
    const args: string[] = [];

    // Add plusargs
    if (params.plusargs) {
      for (const [key, value] of Object.entries(params.plusargs)) {
        args.push(`+${key}=${value}`);
      }
    }

    // Add simulation time if specified
    if (params.simulationTime) {
      args.push(`+simulation_time=${params.simulationTime}`);
    }

    // Add waveform arguments
    if (params.enableWaveform) {
      if (params.waveformFormat === 'vcd') {
        args.push('+trace');
      } else if (params.waveformFormat === 'fst') {
        args.push('+trace-fst');
      }
    }

    // Add coverage arguments
    if (params.enableCoverage) {
      args.push('+coverage');
    }

    // Add verbose flag
    if (params.verbose) {
      args.push('+verilator+verbose');
    }

    return await this.executor.execute(executablePath, args, {
      timeout: params.timeout,
      cwd: dirname(executablePath),
    });
  }

  private parseAssertions(output: string): AssertionResult[] {
    const assertions: AssertionResult[] = [];
    const assertionRegex = /Assertion\s+(\w+)\s+at\s+(.+):(\d+)\s+(passed|failed):\s*(.+)?/gi;
    
    let match;
    while ((match = assertionRegex.exec(output)) !== null) {
      const [, name, file, line, status, message] = match;
      assertions.push({
        name,
        file,
        line: parseInt(line, 10),
        type: 'assert',
        passed: status === 'passed',
        failures: status === 'failed' ? 1 : 0,
        message,
      });
    }

    return assertions;
  }

  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : null;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  protected getCacheKey(params: SimulateParams): string | null {
    // Don't cache simulation results as they may vary
    return null;
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        design: {
          type: 'string',
          description: 'Design file or compiled directory',
        },
        testbench: {
          type: 'string',
          description: 'Testbench file (will auto-generate if missing)',
        },
        topModule: {
          type: 'string',
          description: 'Top module name',
        },
        autoGenerateTestbench: {
          type: 'boolean',
          default: true,
          description: 'Auto-generate testbench if missing',
        },
        outputDir: {
          type: 'string',
          default: 'sim_output',
          description: 'Output directory for simulation artifacts',
        },
        timeout: {
          type: 'number',
          default: 60000,
          description: 'Simulation timeout in milliseconds',
        },
        enableWaveform: {
          type: 'boolean',
          default: true,
          description: 'Generate waveform dump',
        },
        waveformFormat: {
          type: 'string',
          enum: ['vcd', 'fst', 'lxt2'],
          default: 'vcd',
          description: 'Waveform format',
        },
        waveformFile: {
          type: 'string',
          description: 'Waveform output file',
        },
        enableCoverage: {
          type: 'boolean',
          default: false,
          description: 'Enable coverage collection',
        },
        coverageTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['line', 'toggle', 'functional', 'branch'],
          },
          description: 'Coverage types to collect',
        },
        enableAssertions: {
          type: 'boolean',
          default: true,
          description: 'Enable assertion checking',
        },
        optimizationLevel: {
          type: 'number',
          minimum: 0,
          maximum: 3,
          default: 2,
          description: 'Optimization level',
        },
        defines: {
          type: 'object',
          additionalProperties: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
          description: 'Macro definitions',
        },
        plusargs: {
          type: 'object',
          additionalProperties: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
          description: 'Plusargs to pass to simulation',
        },
        useExistingBuild: {
          type: 'boolean',
          default: false,
          description: 'Use existing compiled output',
        },
        simulationTime: {
          type: 'number',
          description: 'Override simulation time',
        },
        verbose: {
          type: 'boolean',
          default: false,
          description: 'Verbose output',
        },
      },
      required: ['design'],
    };
  }
}