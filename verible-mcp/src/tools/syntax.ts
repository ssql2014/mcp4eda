import { z } from 'zod';
import { AbstractTool } from './base.js';
import { CommandResult } from '../utils/executor.js';
import { ToolResult, SyntaxResult, SyntaxNode, Token } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Schema for syntax tool parameters
const SyntaxParamsSchema = z.object({
  filepath: z.string().describe('Path to the file to parse'),
  output_format: z.enum(['tree', 'json', 'tokens']).default('tree').describe('Output format'),
  export_json: z.boolean().default(false).describe('Export as JSON'),
  printtree: z.boolean().default(false).describe('Print parse tree'),
  printtokens: z.boolean().default(false).describe('Print lexical tokens'),
  printrawtokens: z.boolean().default(false).describe('Print raw tokens'),
  verifytree: z.boolean().default(false).describe('Verify tree structure'),
});

type SyntaxParams = z.infer<typeof SyntaxParamsSchema>;

export class SyntaxTool extends AbstractTool<SyntaxParams, SyntaxResult> {
  constructor(configManager: any, cacheManager: any) {
    super('verible_syntax', 'syntax', configManager, cacheManager, SyntaxParamsSchema);
  }

  getDescription(): string {
    return 'Parse and analyze SystemVerilog/Verilog syntax structure';
  }

  protected buildArguments(params: SyntaxParams): string[] {
    const args: string[] = [];

    // Output format options
    if (params.output_format === 'json' || params.export_json) {
      args.push('--export_json');
      args.push('--printtree'); // Need both flags for JSON output with tree
    } else if (params.output_format === 'tree' || params.printtree) {
      args.push('--printtree');
    } else if (params.output_format === 'tokens') {
      if (params.printrawtokens) {
        args.push('--printrawtokens');
      } else {
        args.push('--printtokens');
      }
    }

    // Verification
    if (params.verifytree) {
      args.push('--verifytree');
    }

    // Add the file path
    args.push(params.filepath);

    return args;
  }

  protected async processResult(
    result: CommandResult,
    params: SyntaxParams
  ): Promise<ToolResult<SyntaxResult>> {
    try {
      if (result.exitCode !== 0 && !result.stdout) {
        return {
          success: false,
          error: `Syntax analysis failed: ${result.stderr}`,
        };
      }

      const syntaxResult: SyntaxResult = {
        format: params.output_format,
      };

      if (params.output_format === 'json' || params.export_json) {
        // Parse JSON output
        try {
          syntaxResult.json = JSON.parse(result.stdout);
        } catch (e) {
          logger.error('Failed to parse JSON output:', e);
          return {
            success: false,
            error: 'Failed to parse JSON output from verible-verilog-syntax',
          };
        }
      } else if (params.output_format === 'tree') {
        // Parse tree output
        syntaxResult.tree = this.parseTreeOutput(result.stdout);
      } else if (params.output_format === 'tokens') {
        // Parse token output
        syntaxResult.tokens = this.parseTokenOutput(result.stdout);
      }

      return {
        success: true,
        data: syntaxResult,
      };

    } catch (error) {
      logger.error('Failed to process syntax result:', error);
      return {
        success: false,
        error: `Failed to analyze syntax: ${error}`,
      };
    }
  }

  private parseTreeOutput(output: string): SyntaxNode {
    // Parse Verible's tree output format
    // This is a simplified parser - in production, would need more robust parsing
    const lines = output.split('\n');
    const root: SyntaxNode = {
      tag: 'root',
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
      children: [],
    };

    const stack: SyntaxNode[] = [root];
    let currentDepth = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      // Count leading spaces to determine depth
      const depth = line.search(/\S/);
      const content = line.trim();

      // Parse node information
      const nodeMatch = content.match(/^Node\s+@(\d+)-(\d+):\s*(.+)/);
      const leafMatch = content.match(/^Leaf\s+@(\d+)-(\d+):\s*\[(.+)\]\s*(.+)/);

      let node: SyntaxNode;
      
      if (nodeMatch) {
        const [, start, end, tag] = nodeMatch;
        node = {
          tag: tag.trim(),
          start: this.parsePosition(start),
          end: this.parsePosition(end),
          children: [],
        };
      } else if (leafMatch) {
        const [, start, end, tag, text] = leafMatch;
        node = {
          tag: tag.trim(),
          text: text.trim(),
          start: this.parsePosition(start),
          end: this.parsePosition(end),
        };
      } else {
        continue;
      }

      // Adjust stack based on depth
      while (stack.length > depth / 2 + 1) {
        stack.pop();
      }

      // Add node to parent
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);

      // Add to stack if it's not a leaf
      if (node.children) {
        stack.push(node);
      }
    }

    return root.children?.[0] || root;
  }

  private parseTokenOutput(output: string): Token[] {
    const tokens: Token[] = [];
    const lines = output.split('\n');

    // Token format: (@<start>-<end>: "<text>" : <tag>)
    const tokenRegex = /@(\d+)-(\d+):\s*"([^"]*)"\s*:\s*(.+)/;

    for (const line of lines) {
      const match = line.match(tokenRegex);
      if (match) {
        const [, start, end, text, tag] = match;
        tokens.push({
          tag: tag.trim(),
          text,
          start: this.parsePosition(start),
          end: this.parsePosition(end),
        });
      }
    }

    return tokens;
  }

  private parsePosition(offset: string): { line: number; column: number } {
    // Verible uses byte offsets - convert to line/column
    // This is a simplified version - would need file content for accurate conversion
    const pos = parseInt(offset, 10);
    return {
      line: Math.floor(pos / 80) + 1, // Rough estimate
      column: (pos % 80) + 1,
    };
  }

  protected getCacheKey(params: SyntaxParams): string | null {
    const cacheData = {
      filepath: params.filepath,
      output_format: params.output_format,
      export_json: params.export_json,
      printtree: params.printtree,
      printtokens: params.printtokens,
      printrawtokens: params.printrawtokens,
    };
    return this.cacheManager.generateKey('syntax', cacheData);
  }

  protected getFilePath(params: SyntaxParams): string {
    return params.filepath;
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file to parse',
        },
        output_format: {
          type: 'string',
          enum: ['tree', 'json', 'tokens'],
          description: 'Output format for syntax analysis',
          default: 'tree',
        },
        export_json: {
          type: 'boolean',
          description: 'Export as JSON',
          default: false,
        },
        printtree: {
          type: 'boolean',
          description: 'Print parse tree',
          default: false,
        },
        printtokens: {
          type: 'boolean',
          description: 'Print lexical tokens',
          default: false,
        },
        printrawtokens: {
          type: 'boolean',
          description: 'Print raw tokens',
          default: false,
        },
        verifytree: {
          type: 'boolean',
          description: 'Verify tree structure',
          default: false,
        },
      },
      required: ['filepath'],
    };
  }
}