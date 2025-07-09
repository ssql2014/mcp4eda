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
      // Step 1: Determine if design is a directory or file
      let designFile: string;
      let isCompiledDir = false;
      let buildDir: string = '';
      let executablePath: string = '';
      
      // Check if design is a directory
      const designStat = await fs.stat(params.design);
      if (designStat.isDirectory()) {
        isCompiledDir = true;
        buildDir = params.design;
        
        // Look for executable in the directory
        const moduleName = params.topModule || await this.detectTopModuleFromDir(buildDir);
        executablePath = join(buildDir, `V${moduleName}`);
        
        // Check if executable exists
        try {
          await fs.access(executablePath);
          logger.info(`Found executable: ${executablePath}`);
        } catch {
          // Try without V prefix
          executablePath = join(buildDir, moduleName);
          try {
            await fs.access(executablePath);
          } catch {
            throw new Error(`Cannot find executable for module ${moduleName} in ${buildDir}`);
          }
        }
        
        // For testbench generation, we need the original design file
        // Try to find it from the build directory
        designFile = await this.findDesignFile(buildDir, moduleName);
      } else {
        designFile = params.design;
        isCompiledDir = false;
      }

      // Step 2: Check if testbench exists or needs generation
      let testbenchFile = params.testbench;
      let generatedTestbench = false;

      if (!testbenchFile && params.autoGenerateTestbench && !params.useExistingBuild) {
        logger.info('No testbench provided, generating one automatically...');
        
        // Determine module name
        const moduleName = params.topModule || await this.detectTopModule(designFile);
        
        // Generate C++ testbench for Verilator
        const tbResult = await this.generateCppTestbench(
          designFile,
          moduleName,
          params
        );

        testbenchFile = tbResult.testbenchFile;
        generatedTestbench = true;
      }

      // Step 3: Compile design and testbench if needed
      if (!params.useExistingBuild && !isCompiledDir) {
        // Compile design and testbench
        logger.info('Compiling design and testbench...');
        
        const files = [designFile];
        
        const compileResult = await this.compiler.execute({
          files,
          topModule: params.topModule,
          outputDir: join(params.outputDir, 'obj_dir'),
          optimization: params.optimizationLevel,
          trace: params.enableWaveform,
          traceFormat: params.waveformFormat as 'vcd' | 'fst',
          coverage: params.enableCoverage,
          defines: params.defines,
          mainFile: testbenchFile,
        });

        if (!compileResult.success || !compileResult.data) {
          throw new Error('Compilation failed: ' + (compileResult.error || 'Unknown error'));
        }

        buildDir = compileResult.data.outputDir;
        executablePath = compileResult.data.executable || join(compileResult.data.outputDir, `V${params.topModule || 'top'}`);
      }

      // Step 4: Run simulation
      logger.info('Running simulation...');
      const simResult = await this.runSimulation(executablePath, params);

      // Step 5: Process results
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
        
        // Check multiple possible locations for waveform
        const possibleWaveformPaths = [
          waveformName,
          join(dirname(executablePath), waveformName),
          join(params.outputDir, waveformName),
        ];
        
        for (const path of possibleWaveformPaths) {
          if (await this.fileExists(path) && path !== result.waveformFile) {
            await fs.rename(path, result.waveformFile!);
            break;
          }
        }
      }

      // Handle coverage
      if (params.enableCoverage) {
        result.coverageFile = join(params.outputDir, 'coverage.dat');
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

  private async generateCppTestbench(
    designFile: string,
    moduleName: string,
    params: SimulateParams
  ): Promise<{ testbenchFile: string }> {
    const outputDir = params.outputDir;
    await fs.mkdir(outputDir, { recursive: true });
    
    const testbenchFile = join(outputDir, `tb_${moduleName}.cpp`);
    
    // Generate a basic C++ testbench for Verilator
    const testbenchContent = `#include <verilated.h>
#include <verilated_vcd_c.h>
#include "V${moduleName}.h"
#include <iostream>
#include <memory>

vluint64_t sim_time = 0;

double sc_time_stamp() {
    return sim_time;
}

int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);
    
    // Create DUT instance
    auto dut = std::make_unique<V${moduleName}>();
    
    // Create trace
    ${params.enableWaveform ? `Verilated::traceEverOn(true);
    auto trace = std::make_unique<VerilatedVcdC>();
    dut->trace(trace.get(), 5);
    trace->open("${params.waveformFile || 'simulation.vcd'}");` : ''}
    
    // Initialize signals
    dut->clk = 0;
    dut->rst_n = 0;
    
    // Reset sequence
    for (int i = 0; i < 10; i++) {
        dut->clk = !dut->clk;
        dut->eval();
        ${params.enableWaveform ? 'trace->dump(sim_time++);' : 'sim_time++;'}
    }
    dut->rst_n = 1;
    
    std::cout << "Simulation started\\n";
    
    // Run simulation
    for (int i = 0; i < ${params.simulationTime || 10000}; i++) {
        dut->clk = !dut->clk;
        dut->eval();
        ${params.enableWaveform ? 'trace->dump(sim_time++);' : 'sim_time++;'}
    }
    
    // Final cleanup
    dut->final();
    ${params.enableWaveform ? 'trace->close();' : ''}
    
    std::cout << "Simulation complete\\n";
    std::cout << "Total cycles: " << sim_time << "\\n";
    
    return 0;
}`;

    await fs.writeFile(testbenchFile, testbenchContent);
    logger.info(`Generated C++ testbench: ${testbenchFile}`);
    
    return { testbenchFile };
  }

  private async detectTopModule(designFile: string): Promise<string> {
    try {
      // Read the design file
      const content = await fs.readFile(designFile, 'utf-8');
      const moduleMatch = content.match(/module\s+(\w+)\s*(?:#|\()/);
      
      if (moduleMatch) {
        return moduleMatch[1];
      }
    } catch (error) {
      logger.warn(`Could not read design file: ${error}`);
    }

    // Default to filename without extension
    return basename(designFile, '.v').replace(/\.(sv|verilog|systemverilog)$/, '');
  }

  private async detectTopModuleFromDir(buildDir: string): Promise<string> {
    // Look for executable files or Makefile to determine module name
    try {
      const files = await fs.readdir(buildDir);
      
      // Look for V* executables
      const vExecutables = files.filter(f => f.startsWith('V') && !f.includes('.'));
      if (vExecutables.length > 0) {
        return vExecutables[0].substring(1); // Remove 'V' prefix
      }
      
      // Look for Makefile
      if (files.includes('Vuart_apb.mk')) {
        return 'uart_apb';
      }
      
      // Look for header files
      const headers = files.filter(f => f.endsWith('.h') && f.startsWith('V'));
      if (headers.length > 0) {
        const mainHeader = headers.find(h => !h.includes('__'));
        if (mainHeader) {
          return mainHeader.substring(1, mainHeader.length - 2); // Remove 'V' and '.h'
        }
      }
    } catch (error) {
      logger.warn(`Could not detect module from directory: ${error}`);
    }
    
    return 'top';
  }

  private async findDesignFile(buildDir: string, moduleName: string): Promise<string> {
    // Try to find the original design file
    // This is a heuristic approach
    const possiblePaths = [
      `../../rtl/${moduleName}.v`,
      `../../rtl/${moduleName}.sv`,
      `../../src/${moduleName}.v`,
      `../../src/${moduleName}.sv`,
      `../../../rtl/${moduleName}.v`,
      `../../../rtl/${moduleName}.sv`,
      `../../../rtl/uart/${moduleName}.v`,
      `../../../rtl/uart/${moduleName}.sv`,
    ];
    
    for (const relativePath of possiblePaths) {
      const fullPath = join(buildDir, relativePath);
      if (await this.fileExists(fullPath)) {
        return fullPath;
      }
    }
    
    // If we can't find it, return a placeholder
    throw new Error(`Cannot find design file for module ${moduleName}`);
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