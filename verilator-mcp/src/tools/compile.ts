import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ToolResult } from '../types/index.js';
import { glob } from 'glob';
import { join, resolve, dirname } from 'path';
import { promises as fs } from 'fs';
import { ErrorHandler, ParsedError } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';

const CompileSchema = z.object({
  files: z.array(z.string()).min(1).describe('Verilog/SystemVerilog files to compile'),
  topModule: z.string().optional().describe('Top module name'),
  outputDir: z.string().default('obj_dir').describe('Output directory for compiled files'),
  language: z.enum(['verilog', 'systemverilog']).default('systemverilog'),
  optimization: z.number().min(0).max(3).default(2).describe('Optimization level'),
  trace: z.boolean().default(false).describe('Enable waveform tracing'),
  traceFormat: z.enum(['vcd', 'fst']).default('vcd').describe('Waveform format'),
  coverage: z.boolean().default(false).describe('Enable coverage collection'),
  threads: z.number().min(1).default(1).describe('Number of threads for compilation'),
  defines: z.record(z.union([z.string(), z.number()])).optional().describe('Macro definitions'),
  includes: z.array(z.string()).optional().describe('Include directories'),
  warnings: z.array(z.string()).optional().describe('Warning flags to enable'),
  suppressWarnings: z.array(z.string()).optional().describe('Warning flags to suppress'),
  makeFlags: z.array(z.string()).optional().describe('Additional make flags'),
  verilatorFlags: z.array(z.string()).optional().describe('Additional Verilator flags'),
});

type CompileParams = z.infer<typeof CompileSchema>;

interface CompileResult {
  success: boolean;
  outputDir: string;
  executable?: string;
  makefileGenerated: boolean;
  errors: ParsedError[];
  warnings: ParsedError[];
  stats?: {
    modules: number;
    lines: number;
    compilationTime: number;
  };
}

export class CompileTool extends AbstractTool<CompileParams, CompileResult> {
  constructor(configManager: any, cacheManager: any) {
    super('verilator_compile', 'verilator', configManager, cacheManager, CompileSchema);
  }

  getDescription(): string {
    return 'Compile Verilog/SystemVerilog design files to C++ using Verilator';
  }

  protected async buildArguments(params: CompileParams): Promise<string[]> {
    const args: string[] = [];

    // Language mode
    if (params.language === 'systemverilog') {
      args.push('--language', '1800-2017');
    } else {
      args.push('--language', '1364-2005');
    }

    // C++ compilation
    args.push('--cc');

    // Top module
    if (params.topModule) {
      args.push('--top-module', params.topModule);
    }

    // Output directory
    args.push('--Mdir', params.outputDir);

    // Optimization
    args.push(`-O${params.optimization}`);

    // Tracing
    if (params.trace) {
      if (params.traceFormat === 'fst') {
        args.push('--trace-fst');
      } else {
        args.push('--trace');
      }
      args.push('--trace-structs');
      args.push('--trace-params');
      args.push('--trace-max-array', '1024');
    }

    // Coverage
    if (params.coverage) {
      args.push('--coverage');
      args.push('--coverage-line');
      args.push('--coverage-toggle');
      args.push('--coverage-user');
    }

    // Threading
    if (params.threads > 1) {
      args.push('--threads', params.threads.toString());
      args.push('--threads-dpi', 'all');
    }

    // Defines
    if (params.defines) {
      for (const [key, value] of Object.entries(params.defines)) {
        args.push('-D', `${key}=${value}`);
      }
    }

    // Include directories
    if (params.includes) {
      for (const inc of params.includes) {
        args.push('-I', inc);
      }
    }

    // Warnings - removed default warnings that cause issues in newer Verilator
    const warnings = params.warnings || [];
    for (const warning of warnings) {
      args.push(`-W${warning}`);
    }

    // Suppress warnings
    const defaultSuppressWarnings = ['EOFNEWLINE', 'TIMESCALEMOD', 'COVERIGN'];
    const suppressWarnings = params.suppressWarnings ? 
      [...defaultSuppressWarnings, ...params.suppressWarnings] : 
      defaultSuppressWarnings;
      
    for (const warning of suppressWarnings) {
      args.push(`-Wno-${warning}`);
    }

    // Additional Verilator flags
    if (params.verilatorFlags) {
      args.push(...params.verilatorFlags);
    }

    // Enable timing for testbenches
    args.push('--timing');
    
    // Only add --exe and --build if we have a C++ testbench
    // For pure SystemVerilog testbenches, just compile to library
    const hasCppFile = params.files.some(f => f.endsWith('.cpp') || f.endsWith('.cc'));
    if (hasCppFile) {
      args.push('--exe');
      args.push('--build');
    } else {
      // Just compile to library for SystemVerilog testbenches
      args.push('--binary');
    }

    // Input files
    const expandedFiles = await this.expandFilePatterns(params.files);
    args.push(...expandedFiles);

    return args;
  }

  protected async processResult(
    result: any,
    params: CompileParams
  ): Promise<ToolResult<CompileResult>> {
    try {
      if (!result) {
        throw new Error('No result from Verilator execution');
      }
      
      logger.debug(`Verilator result - exitCode: ${result.exitCode}, stderr: ${result.stderr?.substring(0, 500)}...`);
      
      const errors = ErrorHandler.parseVerilatorOutput(result.stderr || '');
      const actualErrors = errors.filter(e => e.type === 'error');
      const warnings = errors.filter(e => e.type === 'warning');

      // Check if compilation was successful
      const success = result.exitCode === 0 && actualErrors.length === 0;

      // Find generated executable
      let executable: string | undefined;
      if (success) {
        try {
          const exeName = `V${params.topModule || 'top'}`;
          const exePath = join(params.outputDir, exeName);
          await fs.access(exePath);
          executable = exePath;
        } catch {
          // Executable might have a different name or not be built
        }
      }

      // Check if makefile was generated
      let makefileGenerated = false;
      try {
        const makefilePath = join(params.outputDir, `V${params.topModule || 'top'}.mk`);
        await fs.access(makefilePath);
        makefileGenerated = true;
      } catch {
        // Makefile not found
      }

      // Extract statistics from output
      const stats = this.extractCompilationStats(result.stdout);

      const toolResult = {
        success,
        data: {
          success,
          outputDir: resolve(params.outputDir),
          executable,
          makefileGenerated,
          errors: actualErrors,
          warnings,
          stats,
        },
        error: success ? undefined : `Compilation failed: ${actualErrors.map(e => e.message).join('; ')}`,
      };

      logger.debug(`Returning compile result: ${JSON.stringify({ success, errorCount: actualErrors.length, warningCount: warnings.length })}`);
      return toolResult;
    } catch (error) {
      logger.error('Error in compile processResult:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async expandFilePatterns(patterns: string[]): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      if (pattern.includes('*') || pattern.includes('?')) {
        const matches = await glob(pattern);
        files.push(...matches);
      } else {
        files.push(pattern);
      }
    }

    // Resolve all paths
    return files.map(f => resolve(f));
  }

  private extractCompilationStats(output: string): CompileResult['stats'] | undefined {
    // Try to extract statistics from Verilator output
    const moduleMatch = output.match(/(\d+)\s+modules/i);
    const lineMatch = output.match(/(\d+)\s+lines/i);

    if (moduleMatch || lineMatch) {
      return {
        modules: moduleMatch ? parseInt(moduleMatch[1], 10) : 0,
        lines: lineMatch ? parseInt(lineMatch[1], 10) : 0,
        compilationTime: 0, // Would need to measure separately
      };
    }

    return undefined;
  }

  protected getCacheKey(params: CompileParams): string | null {
    // Create cache key based on files, flags, and options
    const fileKey = params.files.sort().join(',');
    const flagKey = JSON.stringify({
      topModule: params.topModule,
      language: params.language,
      optimization: params.optimization,
      trace: params.trace,
      coverage: params.coverage,
      defines: params.defines,
      includes: params.includes,
    });
    return this.cacheManager.generateKey('compile', fileKey, flagKey);
  }

  protected getDependencies(params: CompileParams): string[] {
    // All input files are dependencies
    return params.files;
  }

  protected getTimeout(params: CompileParams): number {
    // Larger designs need more time
    return 600000; // 10 minutes
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Verilog/SystemVerilog files to compile',
        },
        topModule: {
          type: 'string',
          description: 'Top module name',
        },
        outputDir: {
          type: 'string',
          default: 'obj_dir',
          description: 'Output directory for compiled files',
        },
        language: {
          type: 'string',
          enum: ['verilog', 'systemverilog'],
          default: 'systemverilog',
          description: 'HDL language standard',
        },
        optimization: {
          type: 'number',
          minimum: 0,
          maximum: 3,
          default: 2,
          description: 'Optimization level',
        },
        trace: {
          type: 'boolean',
          default: false,
          description: 'Enable waveform tracing',
        },
        traceFormat: {
          type: 'string',
          enum: ['vcd', 'fst'],
          default: 'vcd',
          description: 'Waveform format',
        },
        coverage: {
          type: 'boolean',
          default: false,
          description: 'Enable coverage collection',
        },
        threads: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Number of threads for compilation',
        },
        defines: {
          type: 'object',
          additionalProperties: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
          description: 'Macro definitions',
        },
        includes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Include directories',
        },
        warnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Warning flags to enable',
        },
        suppressWarnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Warning flags to suppress',
        },
        makeFlags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional make flags',
        },
        verilatorFlags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional Verilator flags',
        },
      },
      required: ['files'],
    };
  }
}