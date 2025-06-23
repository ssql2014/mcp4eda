import { z } from 'zod';
import * as path from 'path';
import { AbstractTool } from './base.js';
import { CommandResult } from '../utils/executor.js';
import { ToolResult, ProjectResult, ProjectSymbol, ProjectDependency } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Schema for project tool parameters
const ProjectParamsSchema = z.object({
  root_path: z.string().describe('Root directory of the project'),
  file_list: z.string().optional().describe('File containing list of source files'),
  include_dirs: z.array(z.string()).optional().describe('Include directories'),
  exclude_patterns: z.array(z.string()).optional().describe('Patterns to exclude'),
  symbol_table: z.boolean().default(true).describe('Generate symbol table'),
  print_deps: z.boolean().default(false).describe('Print file dependencies'),
});

type ProjectParams = z.infer<typeof ProjectParamsSchema>;

export class ProjectTool extends AbstractTool<ProjectParams, ProjectResult> {
  constructor(configManager: any, cacheManager: any) {
    super('verible_project', 'project', configManager, cacheManager, ProjectParamsSchema);
  }

  getDescription(): string {
    return 'Analyze entire Verilog/SystemVerilog project structure, dependencies, and symbols';
  }

  protected buildArguments(params: ProjectParams): string[] {
    const args: string[] = [];

    // Add file list if provided
    if (params.file_list) {
      args.push(`--file_list_path=${params.file_list}`);
    }

    // Add include directories
    if (params.include_dirs) {
      for (const dir of params.include_dirs) {
        args.push(`--include_dir_path=${dir}`);
      }
    }

    // Symbol table generation
    if (params.symbol_table) {
      args.push('--symbol_table');
    }

    // Print dependencies
    if (params.print_deps) {
      args.push('--print_file_deps');
    }

    // Add root path
    args.push(params.root_path);

    return args;
  }

  protected async processResult(
    result: CommandResult,
    params: ProjectParams
  ): Promise<ToolResult<ProjectResult>> {
    try {
      // Parse the project analysis output
      const symbols = this.parseSymbols(result.stdout);
      const dependencies = this.parseDependencies(result.stdout);
      const stats = this.parseProjectStats(result.stdout);

      const projectResult: ProjectResult = {
        symbols,
        dependencies,
        fileCount: stats.fileCount,
        moduleCount: stats.moduleCount,
        stats: {
          totalLines: stats.totalLines,
          totalSymbols: symbols.length,
          byKind: this.groupSymbolsByKind(symbols),
        },
      };

      return {
        success: true,
        data: projectResult,
      };

    } catch (error) {
      logger.error('Failed to process project result:', error);
      return {
        success: false,
        error: `Failed to analyze project: ${error}`,
      };
    }
  }

  private parseSymbols(output: string): ProjectSymbol[] {
    const symbols: ProjectSymbol[] = [];
    const lines = output.split('\n');

    // Parse symbol table output
    // Format expected: <file>:<line>:<column>: <kind> <name> [in <parent>]
    const symbolRegex = /^(.+?):(\d+):(\d+):\s+(\w+)\s+(\w+)(?:\s+in\s+(\w+))?/;

    for (const line of lines) {
      const match = line.match(symbolRegex);
      if (match) {
        const [, file, lineStr, columnStr, kind, name, parent] = match;
        
        symbols.push({
          name,
          kind: this.normalizeKind(kind),
          file: path.resolve(file),
          line: parseInt(lineStr, 10),
          column: parseInt(columnStr, 10),
          parent,
        });
      }
    }

    return symbols;
  }

  private parseDependencies(output: string): ProjectDependency[] {
    const dependencies: ProjectDependency[] = [];
    const lines = output.split('\n');

    // Parse dependency information
    // Look for include statements and module instantiations
    let currentFile: string | null = null;
    
    for (const line of lines) {
      // File dependency header
      if (line.startsWith('File: ')) {
        currentFile = line.substring(6).trim();
        continue;
      }

      if (currentFile) {
        // Include dependency
        if (line.includes('includes:')) {
          const included = line.split('includes:')[1].trim();
          dependencies.push({
            from: currentFile,
            to: included,
            type: 'include',
          });
        }

        // Module instantiation
        if (line.includes('instantiates:')) {
          const instantiated = line.split('instantiates:')[1].trim();
          dependencies.push({
            from: currentFile,
            to: instantiated,
            type: 'instance',
          });
        }
      }
    }

    return dependencies;
  }

  private parseProjectStats(output: string): {
    fileCount: number;
    moduleCount: number;
    totalLines: number;
  } {
    let fileCount = 0;
    let moduleCount = 0;
    let totalLines = 0;

    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for summary statistics
      const fileMatch = line.match(/Total files:\s*(\d+)/);
      if (fileMatch) {
        fileCount = parseInt(fileMatch[1], 10);
      }

      const moduleMatch = line.match(/Total modules:\s*(\d+)/);
      if (moduleMatch) {
        moduleCount = parseInt(moduleMatch[1], 10);
      }

      const linesMatch = line.match(/Total lines:\s*(\d+)/);
      if (linesMatch) {
        totalLines = parseInt(linesMatch[1], 10);
      }
    }

    // If stats not found in output, count from parsed data
    if (fileCount === 0) {
      const uniqueFiles = new Set(this.parseSymbols(output).map(s => s.file));
      fileCount = uniqueFiles.size;
    }

    return { fileCount, moduleCount, totalLines };
  }

  private normalizeKind(kind: string): ProjectSymbol['kind'] {
    const normalized = kind.toLowerCase();
    
    if (normalized.includes('module')) return 'module';
    if (normalized.includes('class')) return 'class';
    if (normalized.includes('function')) return 'function';
    if (normalized.includes('variable') || normalized.includes('var')) return 'variable';
    if (normalized.includes('parameter') || normalized.includes('param')) return 'parameter';
    if (normalized.includes('port')) return 'port';
    
    return 'variable'; // default
  }

  private groupSymbolsByKind(symbols: ProjectSymbol[]): Record<string, number> {
    const byKind: Record<string, number> = {};
    
    for (const symbol of symbols) {
      byKind[symbol.kind] = (byKind[symbol.kind] || 0) + 1;
    }
    
    return byKind;
  }

  protected getCacheKey(params: ProjectParams): string | null {
    // Don't cache project analysis as it may change frequently
    return null;
  }

  protected getTimeout(params: ProjectParams): number {
    // Project analysis may take longer for large projects
    return 60000; // 60 seconds
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        root_path: {
          type: 'string',
          description: 'Root directory of the project',
        },
        file_list: {
          type: 'string',
          description: 'File containing list of source files',
        },
        include_dirs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Include directories',
        },
        exclude_patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to exclude',
        },
        symbol_table: {
          type: 'boolean',
          description: 'Generate symbol table',
          default: true,
        },
        print_deps: {
          type: 'boolean',
          description: 'Print file dependencies',
          default: false,
        },
      },
      required: ['root_path'],
    };
  }
}