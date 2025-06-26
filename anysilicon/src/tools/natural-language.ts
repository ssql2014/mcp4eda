import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const NaturalLanguageSchema = z.object({
  query: z.string().describe('Natural language query about die calculations'),
  context: z.object({
    previousCalculation: z.object({
      waferDiameter: z.number().optional(),
      dieWidth: z.number().optional(),
      dieHeight: z.number().optional(),
      result: z.any().optional()
    }).optional()
  }).optional()
});

export type NaturalLanguageInput = z.infer<typeof NaturalLanguageSchema>;

interface NaturalLanguageOutput {
  interpretation: string;
  suggestedTool: string | null;
  suggestedArguments: any;
  explanation: string;
  hints: string[];
}

export class NaturalLanguageTool {
  name = 'anysilicon_natural_language';
  description = 'Process natural language queries about die calculations and wafer yield';

  async execute(input: NaturalLanguageInput): Promise<NaturalLanguageOutput> {
    const { query, context } = input;
    
    try {
      const intent = this.parseIntent(query);
      const suggestion = this.generateSuggestion(intent, context);
      
      return {
        interpretation: intent.interpretation,
        suggestedTool: suggestion.tool,
        suggestedArguments: suggestion.arguments,
        explanation: suggestion.explanation,
        hints: suggestion.hints
      };
    } catch (error) {
      throw new Error(`Natural language processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseIntent(query: string) {
    const lowerQuery = query.toLowerCase();
    
    // Die calculation intents
    if (lowerQuery.includes('calculate') || lowerQuery.includes('how many') || 
        lowerQuery.includes('die') || lowerQuery.includes('chip') || 
        lowerQuery.includes('yield') || lowerQuery.includes('wafer')) {
      return {
        action: 'calculate',
        interpretation: 'You want to calculate dies per wafer'
      };
    }

    // Parameter validation intents
    if (lowerQuery.includes('valid') || lowerQuery.includes('check') || 
        lowerQuery.includes('verify')) {
      return {
        action: 'validate',
        interpretation: 'You want to validate calculation parameters'
      };
    }

    // Wafer size inquiry
    if (lowerQuery.includes('wafer size') || lowerQuery.includes('standard') || 
        lowerQuery.includes('available')) {
      return {
        action: 'wafer_info',
        interpretation: 'You want information about standard wafer sizes'
      };
    }

    return {
      action: 'unknown',
      interpretation: 'I can help with die calculations, parameter validation, and wafer size information'
    };
  }

  private generateSuggestion(intent: any, context?: any) {
    switch (intent.action) {
      case 'calculate':
        return this.generateCalculationSuggestion(intent, context);
      case 'validate':
        return this.generateValidationSuggestion(intent);
      case 'wafer_info':
        return this.generateWaferInfoSuggestion(intent);
      default:
        return {
          tool: null,
          arguments: null,
          explanation: 'Please be more specific about what you want to calculate or know.',
          hints: [
            'Try: "Calculate dies for 10x10mm chip on 300mm wafer"',
            'Try: "How many 5x5 chips fit on a 200mm wafer?"',
            'Try: "What are the standard wafer sizes?"',
            'Try: "Validate parameters for 300mm wafer with 3mm edge exclusion"'
          ]
        };
    }
  }

  private generateCalculationSuggestion(intent: any, context?: any) {
    const query = intent.interpretation.toLowerCase();
    
    // Extract numbers from query
    const numbers = query.match(/\d+(\.\d+)?/g)?.map((n: string) => parseFloat(n)) || [];
    
    // Determine wafer size
    let waferDiameter = 300; // default
    if (numbers.includes(200)) waferDiameter = 200;
    else if (numbers.includes(300)) waferDiameter = 300;
    else if (numbers.includes(150)) waferDiameter = 150;
    else if (numbers.includes(450)) waferDiameter = 450;
    else if (context?.previousCalculation?.waferDiameter) {
      waferDiameter = context.previousCalculation.waferDiameter;
    }

    // Extract die dimensions
    let dieWidth = 10; // default
    let dieHeight = 10; // default
    
    // Look for dimension patterns like "10x10", "5x7", etc.
    const dimensionMatch = query.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
    if (dimensionMatch) {
      dieWidth = parseFloat(dimensionMatch[1]);
      dieHeight = parseFloat(dimensionMatch[2]);
    } else {
      // Use previous calculation if available
      if (context?.previousCalculation?.dieWidth) {
        dieWidth = context.previousCalculation.dieWidth;
        dieHeight = context.previousCalculation.dieHeight || dieWidth;
      }
    }

    // Extract edge exclusion if mentioned
    let edgeExclusion = 3; // default
    if (query.includes('edge exclusion')) {
      const edgeMatch = query.match(/(\d+(?:\.\d+)?)\s*mm\s*edge/);
      if (edgeMatch) {
        edgeExclusion = parseFloat(edgeMatch[1]);
      }
    }

    // Extract scribe lane if mentioned
    let scribeLane = 0.1; // default
    if (query.includes('scribe')) {
      const scribeMatch = query.match(/(\d+(?:\.\d+)?)\s*mm\s*scribe/);
      if (scribeMatch) {
        scribeLane = parseFloat(scribeMatch[1]);
      }
    }

    return {
      tool: 'calculate_die_per_wafer',
      arguments: {
        wafer_diameter: waferDiameter,
        die_width: dieWidth,
        die_height: dieHeight,
        edge_exclusion: edgeExclusion,
        scribe_lane: scribeLane
      },
      explanation: `I'll calculate how many ${dieWidth}x${dieHeight}mm dies fit on a ${waferDiameter}mm wafer`,
      hints: [
        `Using edge exclusion of ${edgeExclusion}mm`,
        `Using scribe lane width of ${scribeLane}mm`,
        'You can specify different wafer sizes: 150mm, 200mm, 300mm, or 450mm',
        'You can adjust edge exclusion and scribe lane parameters'
      ]
    };
  }

  private generateValidationSuggestion(_intent: any) {
    return {
      tool: 'validate_parameters',
      arguments: {
        operation: 'calculate_die_per_wafer',
        parameters: {
          wafer_diameter: 300,
          die_width: 10,
          die_height: 10,
          edge_exclusion: 3,
          scribe_lane: 0.1
        }
      },
      explanation: "I'll validate the parameters for die calculation",
      hints: [
        'Checks if wafer diameter is standard (150, 200, 300, or 450mm)',
        'Validates die dimensions are positive and reasonable',
        'Ensures edge exclusion is within valid range (2-5mm)',
        'Verifies scribe lane width is reasonable (0.05-0.2mm)'
      ]
    };
  }

  private generateWaferInfoSuggestion(_intent: any) {
    return {
      tool: 'get_standard_wafer_sizes',
      arguments: {},
      explanation: "I'll show you the standard wafer sizes and their specifications",
      hints: [
        'Standard sizes are 150mm, 200mm, 300mm, and 450mm',
        'Each size has different edge exclusion zones',
        'Larger wafers generally have better die yield efficiency'
      ]
    };
  }

  getTool(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query about die calculations'
          },
          context: {
            type: 'object',
            properties: {
              previousCalculation: {
                type: 'object',
                properties: {
                  waferDiameter: { type: 'number' },
                  dieWidth: { type: 'number' },
                  dieHeight: { type: 'number' },
                  result: { type: 'object' }
                }
              }
            }
          }
        },
        required: ['query']
      }
    };
  }
}