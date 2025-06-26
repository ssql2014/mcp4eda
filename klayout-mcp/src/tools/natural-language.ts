import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ExecutionError } from '../utils/error-handler.js';

interface NLCommand {
  tool: string;
  args: Record<string, any>;
  explanation: string;
}

export class NaturalLanguageTool extends AbstractTool {
  getName(): string {
    return 'klayout_natural_language';
  }

  getDescription(): string {
    return 'Process natural language queries about IC layout operations and execute appropriate KLayout tools';
  }

  getInputSchema() {
    return z.object({
      query: z.string().describe('Natural language query about layout operations'),
      context: z.object({
        currentFile: z.string().optional().describe('Current layout file being worked on'),
        recentOperations: z.array(z.string()).optional().describe('Recent operations performed'),
      }).optional(),
    });
  }

  async execute(args: any): Promise<any> {
    const { query, context } = args;
    
    // Parse the natural language query
    const command = this.parseQuery(query, context);
    
    if (!command) {
      return {
        error: 'Could not understand the query. Please be more specific about the layout operation you want to perform.',
        suggestions: this.getSuggestions(query),
      };
    }

    // Execute the appropriate tool
    const tool = this.config.isKLayoutAvailable() ? command.tool : null;
    if (!tool) {
      throw new ExecutionError('KLayout is not available');
    }

    return {
      interpretation: command.explanation,
      tool: command.tool,
      arguments: command.args,
      hint: `To execute this command, use the '${command.tool}' tool with the provided arguments.`,
    };
  }

  private parseQuery(query: string, context?: any): NLCommand | null {
    const lowerQuery = query.toLowerCase();
    
    // Layout information queries
    if (lowerQuery.includes('analyze') || lowerQuery.includes('info') || lowerQuery.includes('tell me about')) {
      const fileMatch = query.match(/(?:file|layout)\s+["']?([^\s"']+)["']?/i);
      const topCellMatch = query.match(/(?:top cell|cell)\s+["']?([^\s"']+)["']?/i);
      
      return {
        tool: 'klayout_layout_info',
        args: {
          layoutFile: fileMatch ? fileMatch[1] : context?.currentFile || 'design.gds',
          topCell: topCellMatch ? topCellMatch[1] : undefined,
          includeHierarchy: lowerQuery.includes('hierarchy'),
        },
        explanation: 'Analyzing layout file to extract cell, layer, and statistical information',
      };
    }

    // Format conversion queries
    if (lowerQuery.includes('convert')) {
      const fromMatch = query.match(/(?:from|convert)\s+["']?([^\s"']+)["']?/i);
      const toMatch = query.match(/(?:to|into)\s+["']?([^\s"']+)["']?/i);
      const scaleMatch = query.match(/(?:scale|scaling)\s+(?:of\s+)?(\d*\.?\d+)/i);
      
      if (fromMatch && toMatch) {
        return {
          tool: 'klayout_convert_layout',
          args: {
            inputFile: fromMatch[1],
            outputFile: toMatch[1],
            scale: scaleMatch ? parseFloat(scaleMatch[1]) : 1.0,
            mergeReferences: lowerQuery.includes('flatten'),
          },
          explanation: `Converting layout from ${fromMatch[1]} to ${toMatch[1]}`,
        };
      }
    }

    // DRC queries
    if (lowerQuery.includes('drc') || lowerQuery.includes('design rule') || lowerQuery.includes('check')) {
      const layoutMatch = query.match(/(?:check|run drc on)\s+["']?([^\s"']+)["']?/i);
      const rulesMatch = query.match(/(?:rules?|using)\s+["']?([^\s"']+)["']?/i);
      
      return {
        tool: 'klayout_run_drc',
        args: {
          layoutFile: layoutMatch ? layoutMatch[1] : context?.currentFile || 'design.gds',
          drcFile: rulesMatch ? rulesMatch[1] : 'rules.drc',
          verbose: true,
        },
        explanation: 'Running design rule checks on the layout',
      };
    }

    // Layer extraction queries
    if (lowerQuery.includes('extract') && lowerQuery.includes('layer')) {
      const layersMatch = query.match(/layers?\s+([\d,\s/]+)/i);
      const fileMatch = query.match(/from\s+["']?([^\s"']+)["']?/i);
      const outputMatch = query.match(/(?:to|save as)\s+["']?([^\s"']+)["']?/i);
      
      if (layersMatch) {
        const layers = layersMatch[1].split(/[,\s]+/).filter(l => l.includes('/'));
        
        return {
          tool: 'klayout_extract_layers',
          args: {
            inputFile: fileMatch ? fileMatch[1] : context?.currentFile || 'design.gds',
            outputFile: outputMatch ? outputMatch[1] : 'extracted.gds',
            layers: layers,
            mergeShapes: lowerQuery.includes('merge'),
            flattenHierarchy: lowerQuery.includes('flatten'),
          },
          explanation: `Extracting layers ${layers.join(', ')} from the layout`,
        };
      }
    }

    // Script execution queries
    if (lowerQuery.includes('run script') || lowerQuery.includes('execute script')) {
      const scriptMatch = query.match(/script\s+["']?([^\s"']+)["']?/i);
      const langMatch = query.match(/(python|ruby)/i);
      
      if (scriptMatch) {
        return {
          tool: 'klayout_execute_script',
          args: {
            scriptFile: scriptMatch[1],
            language: langMatch ? langMatch[1].toLowerCase() : 'python',
          },
          explanation: `Executing ${langMatch ? langMatch[1] : 'Python'} script`,
        };
      }
    }

    // Layer density calculation
    if (lowerQuery.includes('density') || lowerQuery.includes('calculate') && lowerQuery.includes('layer')) {
      const fileMatch = query.match(/(?:of|for|in)\s+["']?([^\s"']+)["']?/i);
      
      return {
        tool: 'klayout_execute_script',
        args: {
          scriptFile: 'examples/layer_density.py',
          language: 'python',
          inputFiles: [fileMatch ? fileMatch[1] : context?.currentFile || 'design.gds'],
        },
        explanation: 'Calculating layer density for the layout',
      };
    }

    return null;
  }

  private getSuggestions(query: string): string[] {
    return [
      'Analyze my design.gds file and tell me about the layers',
      'Convert design.gds to design.oas with 0.001 scaling',
      'Run DRC checks on layout.gds using 45nm_rules.drc',
      'Extract layers 31/0, 32/0, 33/0 from chip.gds',
      'Calculate layer density for my layout',
      'Run script process_layout.py on my design',
    ];
  }
}