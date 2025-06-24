import { z } from 'zod';
import { AbstractTool } from './base.js';
import { SynthesisResult } from '../types/index.js';
import { YosysParser } from '../utils/parser.js';
import { logger } from '../utils/logger.js';

// Schema for synthesis tool parameters
const SynthParamsSchema = z.object({
  filepath: z.string().describe('Path to the Verilog/SystemVerilog file to synthesize'),
  target: z.enum(['generic', 'xilinx', 'altera', 'intel', 'ice40', 'ecp5'])
    .default('generic')
    .describe('Target technology for synthesis'),
  topModule: z.string().optional().describe('Top module name (auto-detected if not specified)'),
  optimizationLevel: z.number().min(0).max(3).default(2)
    .describe('Optimization level (0=none, 1=basic, 2=standard, 3=aggressive)'),
  outputFile: z.string().optional().describe('Output file path (optional)'),
  outputFormat: z.enum(['verilog', 'json', 'blif', 'edif'])
    .default('verilog')
    .describe('Output format'),
  defines: z.record(z.string()).optional()
    .describe('Verilog defines as key-value pairs'),
  includeDirs: z.array(z.string()).optional()
    .describe('Include directories for `include directives'),
  keepHierarchy: z.boolean().default(false)
    .describe('Preserve module hierarchy (no flattening)'),
});

type SynthParams = z.infer<typeof SynthParamsSchema>;

export class SynthTool extends AbstractTool<SynthParams, SynthesisResult> {
  constructor(configManager: any, cacheManager: any) {
    super('yosys_synth', 'synthesis', configManager, cacheManager, SynthParamsSchema as z.ZodType<SynthParams>);
  }

  getDescription(): string {
    return 'Synthesize Verilog/SystemVerilog designs to gate-level netlists';
  }

  protected async executeInternal(params: SynthParams): Promise<SynthesisResult> {
    // Resolve and validate input file
    const inputPath = this.resolvePath(params.filepath);
    await this.validateFile(inputPath);

    logger.info(`Starting synthesis of ${inputPath} for target: ${params.target}`);

    // Determine output file
    let outputPath: string | undefined;
    if (params.outputFile) {
      outputPath = this.resolvePath(params.outputFile);
    } else {
      // Generate default output path
      const ext = params.outputFormat === 'verilog' ? 'v' : params.outputFormat;
      outputPath = this.generateOutputPath(inputPath, '_synth', ext);
    }

    // Create temporary directory for intermediate files
    const tempDir = await this.runner.createTempDir();

    try {
      // Build synthesis script
      const script = this.buildSynthesisScript(params, inputPath, outputPath, tempDir);

      // Run synthesis
      const result = await this.runner.runScript(script);

      // Parse results
      const summary = YosysParser.parseSynthesisSummary(result.stdout);
      const warnings = YosysParser.extractWarnings(result.stderr + result.stdout);

      // Get detailed statistics if available
      let stats;
      if (result.stdout.includes('Number of cells:')) {
        const parsedStats = YosysParser.parseStats(result.stdout);
        // Convert to expected format
        stats = {
          modules: parsedStats.modules.length,
          wires: parsedStats.summary.totalWires,
          memories: 0, // Not available in summary
          processes: 0, // Not available in summary  
          cells: {
            total: parsedStats.summary.totalCells,
            byType: {} // Would need to aggregate from modules
          }
        };
      }

      // Read the synthesized netlist if it was generated
      let netlist;
      try {
        const fs = await import('fs/promises');
        netlist = await fs.readFile(outputPath, 'utf-8');
      } catch (error) {
        // File might not exist or might be too large
        netlist = undefined;
      }

      // Clean up temporary directory
      await this.runner.cleanupTempDir(tempDir);

      return {
        success: true,
        data: {
          netlist,
          stats,
          gateCount: summary.gateCount,
          registerCount: summary.registerCount,
          lutCount: summary.lutCount,
        },
        warnings: warnings,
        outputFile: outputPath,
        metadata: {
          executionTime: result.duration,
        },
      };
    } catch (error) {
      // Clean up on error
      await this.runner.cleanupTempDir(tempDir);
      
      return this.createBaseResult(false, error instanceof Error ? error.message : 'Synthesis failed');
    }
  }

  private buildSynthesisScript(
    params: SynthParams,
    inputPath: string,
    outputPath: string,
    _tempDir: string
  ): string[] {
    const commands: string[] = [];

    // Read Verilog with options
    let readCmd = 'read_verilog';
    
    // Add defines
    if (params.defines) {
      for (const [name, value] of Object.entries(params.defines)) {
        readCmd += ` -D${name}=${value}`;
      }
    }
    
    // Add include directories
    if (params.includeDirs && params.includeDirs.length > 0) {
      for (const dir of params.includeDirs) {
        readCmd += ` -I"${this.resolvePath(dir)}"`;
      }
    }
    
    readCmd += ` "${inputPath}"`;
    commands.push(readCmd);

    // Set hierarchy
    if (params.topModule) {
      commands.push(`hierarchy -check -top ${params.topModule}`);
    } else {
      commands.push('hierarchy -check -auto-top');
    }

    // Target-specific synthesis
    switch (params.target) {
      case 'xilinx':
        this.addXilinxSynthesis(commands, params);
        break;
      case 'altera':
      case 'intel':
        this.addIntelSynthesis(commands, params);
        break;
      case 'ice40':
        this.addIce40Synthesis(commands, params);
        break;
      case 'ecp5':
        this.addEcp5Synthesis(commands, params);
        break;
      case 'generic':
      default:
        this.addGenericSynthesis(commands, params);
        break;
    }

    // Statistics before output
    commands.push('stat');

    // Write output
    this.addOutputCommands(commands, outputPath, params.outputFormat);

    return commands;
  }

  private addGenericSynthesis(commands: string[], params: SynthParams): void {
    // Process design
    commands.push('proc');
    
    if (!params.keepHierarchy) {
      commands.push('flatten');
    }

    // Basic optimizations
    commands.push('opt_expr');
    commands.push('opt_clean');

    if (params.optimizationLevel >= 1) {
      commands.push('opt');
      commands.push('wreduce');
      commands.push('alumacc');
      commands.push('share');
    }

    // Technology mapping
    commands.push('techmap');

    // Further optimizations
    if (params.optimizationLevel >= 2) {
      commands.push('opt -fast');
      commands.push('memory -nomap');
      commands.push('opt_clean');
    }

    if (params.optimizationLevel >= 3) {
      commands.push('opt -full');
      commands.push('clean -purge');
    }

    // Final cleanup
    commands.push('clean');
  }

  private addXilinxSynthesis(commands: string[], params: SynthParams): void {
    const opts = [];
    
    if (!params.keepHierarchy) {
      opts.push('-flatten');
    }
    
    if (params.optimizationLevel === 0) {
      opts.push('-noiopad');
    }
    
    commands.push(`synth_xilinx ${opts.join(' ')}`);

    if (params.optimizationLevel >= 3) {
      commands.push('opt -full');
    }
  }

  private addIntelSynthesis(commands: string[], params: SynthParams): void {
    const opts = [];
    
    if (!params.keepHierarchy) {
      opts.push('-flatten');
    }
    
    commands.push(`synth_intel ${opts.join(' ')}`);

    if (params.optimizationLevel >= 3) {
      commands.push('opt -full');
    }
  }

  private addIce40Synthesis(commands: string[], params: SynthParams): void {
    const opts = [];
    
    if (!params.keepHierarchy) {
      opts.push('-flatten');
    }
    
    if (params.optimizationLevel === 0) {
      opts.push('-noabc');
    }
    
    commands.push(`synth_ice40 ${opts.join(' ')}`);

    if (params.optimizationLevel >= 3) {
      commands.push('opt -full');
    }
  }

  private addEcp5Synthesis(commands: string[], params: SynthParams): void {
    const opts = [];
    
    if (!params.keepHierarchy) {
      opts.push('-flatten');
    }
    
    if (params.optimizationLevel === 0) {
      opts.push('-noabc');
    }
    
    commands.push(`synth_ecp5 ${opts.join(' ')}`);

    if (params.optimizationLevel >= 3) {
      commands.push('opt -full');
    }
  }

  private addOutputCommands(commands: string[], outputPath: string, format: string): void {
    switch (format) {
      case 'verilog':
        commands.push(`write_verilog -noattr "${outputPath}"`);
        break;
      case 'json':
        commands.push(`write_json "${outputPath}"`);
        break;
      case 'blif':
        commands.push(`write_blif "${outputPath}"`);
        break;
      case 'edif':
        commands.push(`write_edif "${outputPath}"`);
        break;
    }
  }
}