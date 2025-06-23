import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AbstractTool } from './base.js';
import { CommandResult } from '../utils/executor.js';
import { ToolResult, ObfuscateResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Schema for obfuscate tool parameters
const ObfuscateParamsSchema = z.object({
  filepath: z.string().describe('Path to the file to obfuscate'),
  output_file: z.string().optional().describe('Output file path'),
  preserve_interface: z.boolean().default(true).describe('Preserve module interfaces'),
  save_map: z.boolean().default(true).describe('Save identifier mapping'),
  map_file: z.string().optional().describe('Path for identifier mapping file'),
  load_map: z.string().optional().describe('Load existing identifier mapping'),
  preserve: z.array(z.string()).optional().describe('Identifiers to preserve'),
});

type ObfuscateParams = z.infer<typeof ObfuscateParamsSchema>;

export class ObfuscateTool extends AbstractTool<ObfuscateParams, ObfuscateResult> {
  constructor(configManager: any, cacheManager: any) {
    super('verible_obfuscate', 'obfuscate', configManager, cacheManager, ObfuscateParamsSchema);
  }

  getDescription(): string {
    return 'Obfuscate Verilog/SystemVerilog code by renaming identifiers';
  }

  protected buildArguments(params: ObfuscateParams): string[] {
    const args: string[] = [];

    // Preserve interface
    if (params.preserve_interface) {
      args.push('--preserve_interface');
    }

    // Save mapping
    if (params.save_map) {
      if (params.map_file) {
        args.push(`--save_map=${params.map_file}`);
      } else {
        args.push('--save_map');
      }
    }

    // Load existing mapping
    if (params.load_map) {
      args.push(`--load_map=${params.load_map}`);
    }

    // Preserve specific identifiers
    if (params.preserve && params.preserve.length > 0) {
      for (const identifier of params.preserve) {
        args.push(`--preserve=${identifier}`);
      }
    }

    // Add input file
    args.push(params.filepath);

    // Add output file if specified
    if (params.output_file) {
      args.push(`--output=${params.output_file}`);
    }

    return args;
  }

  protected async processResult(
    result: CommandResult,
    params: ObfuscateParams
  ): Promise<ToolResult<ObfuscateResult>> {
    try {
      let obfuscatedContent: string;
      let mappingFile: string | undefined;
      
      // If output file was specified, read from it
      if (params.output_file) {
        obfuscatedContent = await fs.readFile(params.output_file, 'utf-8');
      } else {
        // Otherwise, output should be in stdout
        obfuscatedContent = result.stdout;
      }

      // Check if mapping file was created
      if (params.save_map) {
        mappingFile = params.map_file || `${params.filepath}.map`;
        try {
          await fs.access(mappingFile);
        } catch {
          mappingFile = undefined;
        }
      }

      // Parse preserved identifiers from output or mapping
      const preservedIdentifiers = await this.parsePreservedIdentifiers(
        result.stderr,
        mappingFile
      );

      // Count obfuscated identifiers
      const obfuscatedCount = this.countObfuscatedIdentifiers(
        await fs.readFile(params.filepath, 'utf-8'),
        obfuscatedContent,
        preservedIdentifiers
      );

      const obfuscateResult: ObfuscateResult = {
        obfuscated: true,
        content: obfuscatedContent,
        mappingFile,
        preservedIdentifiers,
        obfuscatedCount,
      };

      return {
        success: true,
        data: obfuscateResult,
      };

    } catch (error) {
      logger.error('Failed to process obfuscate result:', error);
      return {
        success: false,
        error: `Failed to obfuscate file: ${error}`,
      };
    }
  }

  private async parsePreservedIdentifiers(
    stderr: string,
    mappingFile?: string
  ): Promise<string[]> {
    const preserved: Set<string> = new Set();

    // Parse from stderr messages
    const lines = stderr.split('\n');
    for (const line of lines) {
      const match = line.match(/Preserving identifier: (\w+)/);
      if (match) {
        preserved.add(match[1]);
      }
    }

    // Parse from mapping file if available
    if (mappingFile) {
      try {
        const mapContent = await fs.readFile(mappingFile, 'utf-8');
        const mapLines = mapContent.split('\n');
        
        for (const line of mapLines) {
          const [original, obfuscated] = line.split('->').map(s => s.trim());
          if (original === obfuscated) {
            preserved.add(original);
          }
        }
      } catch (error) {
        logger.warn('Failed to read mapping file:', error);
      }
    }

    return Array.from(preserved);
  }

  private countObfuscatedIdentifiers(
    originalContent: string,
    obfuscatedContent: string,
    preservedIdentifiers: string[]
  ): number {
    // Extract all identifiers from original content
    const identifierRegex = /\b[a-zA-Z_]\w*\b/g;
    const originalIdentifiers = new Set(
      originalContent.match(identifierRegex) || []
    );

    // Remove Verilog keywords
    const keywords = new Set([
      'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg',
      'logic', 'always', 'begin', 'end', 'if', 'else', 'case', 'endcase',
      'for', 'while', 'function', 'endfunction', 'task', 'endtask',
      'parameter', 'localparam', 'assign', 'posedge', 'negedge'
    ]);

    let obfuscatedCount = 0;
    for (const identifier of originalIdentifiers) {
      if (!keywords.has(identifier) && 
          !preservedIdentifiers.includes(identifier) &&
          identifier.length > 1) {
        obfuscatedCount++;
      }
    }

    return obfuscatedCount;
  }

  protected getCacheKey(params: ObfuscateParams): string | null {
    // Don't cache obfuscation results as they may vary
    return null;
  }

  protected getFilePath(params: ObfuscateParams): string {
    return params.filepath;
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file to obfuscate',
        },
        output_file: {
          type: 'string',
          description: 'Output file path',
        },
        preserve_interface: {
          type: 'boolean',
          description: 'Preserve module interfaces',
          default: true,
        },
        save_map: {
          type: 'boolean',
          description: 'Save identifier mapping',
          default: true,
        },
        map_file: {
          type: 'string',
          description: 'Path for identifier mapping file',
        },
        load_map: {
          type: 'string',
          description: 'Load existing identifier mapping',
        },
        preserve: {
          type: 'array',
          items: { type: 'string' },
          description: 'Identifiers to preserve',
        },
      },
      required: ['filepath'],
    };
  }
}