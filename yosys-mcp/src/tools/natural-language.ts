import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ConfigManager } from '../utils/config.js';
import { CacheManager } from '../utils/cache.js';
import { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface NaturalLanguageResult extends ToolResult {
  interpretation: string;
  suggestedTool: string | null;
  suggestedArguments: any;
  explanation: string;
  hints: string[];
}

const NaturalLanguageSchema = z.object({
  query: z.string().describe('Natural language query about synthesis'),
  context: z.object({
    currentFile: z.string().optional().describe('Current design file'),
    previousResults: z.any().optional().describe('Results from previous operations'),
    recentOperations: z.array(z.string()).optional().describe('Recent operations performed')
  }).optional()
});

type NaturalLanguageParams = z.infer<typeof NaturalLanguageSchema>;

export class NaturalLanguageTool extends AbstractTool<NaturalLanguageParams, NaturalLanguageResult> {
  constructor(configManager: ConfigManager, cacheManager: CacheManager) {
    super(
      'yosys_natural_language',
      'natural_language',
      configManager,
      cacheManager,
      NaturalLanguageSchema
    );
  }

  getDescription(): string {
    return 'Process natural language queries about synthesis operations';
  }

  protected async executeInternal(args: NaturalLanguageParams): Promise<NaturalLanguageResult> {
    const { query, context } = args;
    logger.info('Processing natural language query', { query });

    try {
      // Parse the query to understand intent
      const intent = this.parseIntent(query);
      const suggestion = this.generateSuggestion(intent, context);

      return {
        success: true,
        interpretation: intent.interpretation,
        suggestedTool: suggestion.tool,
        suggestedArguments: suggestion.arguments,
        explanation: suggestion.explanation,
        hints: suggestion.hints,
        metadata: {
          executionTime: 0
        }
      };
    } catch (error) {
      logger.error('Natural language processing error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        interpretation: '',
        suggestedTool: null,
        suggestedArguments: null,
        explanation: '',
        hints: [],
        metadata: {
          executionTime: 0
        }
      };
    }
  }

  private parseIntent(query: string) {
    const lowerQuery = query.toLowerCase();
    
    // Synthesis intents
    if (lowerQuery.includes('synthesize') || lowerQuery.includes('synthesis') || 
        lowerQuery.includes('compile') || lowerQuery.includes('generate netlist')) {
      return {
        action: 'synthesize',
        interpretation: 'You want to synthesize a design'
      };
    }

    // Analysis intents
    if (lowerQuery.includes('analyze') || lowerQuery.includes('statistics') || 
        lowerQuery.includes('stats') || lowerQuery.includes('check') || 
        lowerQuery.includes('hierarchy') || lowerQuery.includes('resources')) {
      return {
        action: 'analyze',
        interpretation: 'You want to analyze a design'
      };
    }

    // Visualization intents
    if (lowerQuery.includes('show') || lowerQuery.includes('visualize') || 
        lowerQuery.includes('diagram') || lowerQuery.includes('graph') ||
        lowerQuery.includes('display') || lowerQuery.includes('view')) {
      return {
        action: 'show',
        interpretation: 'You want to visualize a design'
      };
    }

    // Target-specific synthesis
    if (lowerQuery.includes('xilinx') || lowerQuery.includes('altera') || 
        lowerQuery.includes('intel') || lowerQuery.includes('ice40') || 
        lowerQuery.includes('ecp5') || lowerQuery.includes('fpga')) {
      return {
        action: 'synthesize',
        interpretation: 'You want to synthesize for a specific FPGA target'
      };
    }

    // Format conversion
    if (lowerQuery.includes('convert') || lowerQuery.includes('export') || 
        lowerQuery.includes('save as')) {
      return {
        action: 'synthesize',
        interpretation: 'You want to convert or export the design'
      };
    }

    // Optimization
    if (lowerQuery.includes('optimize') || lowerQuery.includes('reduce') || 
        lowerQuery.includes('smaller') || lowerQuery.includes('faster')) {
      return {
        action: 'synthesize',
        interpretation: 'You want to optimize the design'
      };
    }

    return {
      action: 'unknown',
      interpretation: 'I understand you want to work with Yosys, but I need more specific information'
    };
  }

  private generateSuggestion(intent: any, context?: any) {
    const currentFile = context?.currentFile || 'design.v';

    switch (intent.action) {
      case 'synthesize':
        return this.generateSynthesisSuggestion(intent, currentFile);
      case 'analyze':
        return this.generateAnalysisSuggestion(intent, currentFile);
      case 'show':
        return this.generateVisualizationSuggestion(intent, currentFile);
      default:
        return {
          tool: null,
          arguments: null,
          explanation: 'Please be more specific about what you want to do. I can help with synthesis, analysis, or visualization.',
          hints: [
            'Try: "Synthesize my design for Xilinx FPGA"',
            'Try: "Analyze the design statistics"',
            'Try: "Show me the circuit diagram"',
            'Try: "Convert to BLIF format"'
          ]
        };
    }
  }

  private generateSynthesisSuggestion(intent: any, filepath: string) {
    const query = intent.interpretation.toLowerCase();
    
    // Determine target
    let target = 'generic';
    if (query.includes('xilinx')) target = 'xilinx';
    else if (query.includes('altera') || query.includes('intel')) target = 'altera';
    else if (query.includes('ice40')) target = 'ice40';
    else if (query.includes('ecp5')) target = 'ecp5';

    // Determine output format
    let outputFormat = 'verilog';
    if (query.includes('json')) outputFormat = 'json';
    else if (query.includes('blif')) outputFormat = 'blif';
    else if (query.includes('edif')) outputFormat = 'edif';

    // Determine optimization level
    let optimizationLevel = 2;
    if (query.includes('no optim') || query.includes('unoptimized')) optimizationLevel = 0;
    else if (query.includes('minimal')) optimizationLevel = 1;
    else if (query.includes('aggressive') || query.includes('maximum')) optimizationLevel = 3;

    return {
      tool: 'yosys_synth',
      arguments: {
        filepath,
        target,
        outputFormat,
        optimizationLevel
      },
      explanation: `I'll synthesize ${filepath} targeting ${target} with optimization level ${optimizationLevel}`,
      hints: [
        `The output will be in ${outputFormat} format`,
        'You can specify different targets: xilinx, altera, ice40, ecp5, or generic',
        'Available output formats: verilog, json, blif, edif'
      ]
    };
  }

  private generateAnalysisSuggestion(intent: any, filepath: string) {
    const query = intent.interpretation.toLowerCase();
    
    // Determine analysis type
    let analysisType = 'stats';
    if (query.includes('check')) analysisType = 'check';
    else if (query.includes('hierarchy')) analysisType = 'hierarchy';
    else if (query.includes('resources')) analysisType = 'resources';

    return {
      tool: 'yosys_analyze',
      arguments: {
        filepath,
        analysisType,
        detailed: query.includes('detailed') || query.includes('verbose')
      },
      explanation: `I'll analyze ${filepath} to show ${analysisType}`,
      hints: [
        'Available analysis types: stats, check, hierarchy, resources',
        'Add "detailed" for more verbose output',
        'Use "check" to verify design correctness'
      ]
    };
  }

  private generateVisualizationSuggestion(intent: any, filepath: string) {
    const query = intent.interpretation.toLowerCase();
    
    // Determine format
    let format = 'svg';
    if (query.includes('dot')) format = 'dot';
    else if (query.includes('pdf')) format = 'pdf';
    else if (query.includes('png')) format = 'png';

    return {
      tool: 'yosys_show',
      arguments: {
        filepath,
        format,
        simplify: !query.includes('detailed') && !query.includes('full')
      },
      explanation: `I'll generate a ${format} visualization of ${filepath}`,
      hints: [
        'Available formats: svg, pdf, png, dot',
        'The design will be simplified by default for clarity',
        'Add "detailed" or "full" to see the complete design'
      ]
    };
  }

}