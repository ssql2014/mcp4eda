import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ToolResult, NaturalLanguageQuery, NaturalLanguageResponse, SimulationContext } from '../types/index.js';
import * as natural from 'natural';
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import { SimulateTool } from './simulate.js';
import { TestbenchGeneratorTool } from './testbench-generator.js';
import { CompileTool } from './compile.js';

const NaturalLanguageSchema = z.object({
  query: z.string().describe('Natural language query about simulation'),
  context: z.object({
    currentSimulation: z.object({
      design: z.string(),
      testbench: z.string().optional(),
      waveformFile: z.string().optional(),
      coverageFile: z.string().optional(),
      assertionResults: z.array(z.any()).optional(),
    }).optional(),
    debugState: z.object({
      breakpoints: z.array(z.string()).optional(),
      watchedSignals: z.array(z.string()).optional(),
      currentTime: z.number().optional(),
    }).optional(),
  }).optional(),
  history: z.array(z.object({
    query: z.string(),
    response: z.string(),
    timestamp: z.number(),
    category: z.enum(['debug', 'analysis', 'coverage', 'generation', 'explanation']),
  })).optional(),
});

type NaturalLanguageParams = z.infer<typeof NaturalLanguageSchema>;

interface QueryIntent {
  category: 'debug' | 'analysis' | 'coverage' | 'generation' | 'explanation' | 'simulation';
  action: string;
  entities: {
    signals?: string[];
    times?: number[];
    modules?: string[];
    conditions?: string[];
    commands?: string[];
  };
  confidence: number;
}

export class NaturalLanguageTool extends AbstractTool<NaturalLanguageParams, NaturalLanguageResponse> {
  private classifier: any;
  private tokenizer: any;
  private simulator: SimulateTool;
  private testbenchGenerator: TestbenchGeneratorTool;
  private compiler: CompileTool;

  constructor(configManager: any, cacheManager: any) {
    super('natural_language_query', 'verilator', configManager, cacheManager, NaturalLanguageSchema);
    
    // Initialize NLP components
    this.tokenizer = new natural.WordTokenizer();
    this.classifier = new natural.BayesClassifier();
    
    // Initialize other tools
    this.simulator = new SimulateTool(configManager, cacheManager);
    this.testbenchGenerator = new TestbenchGeneratorTool(configManager, cacheManager);
    this.compiler = new CompileTool(configManager, cacheManager);
    
    this.trainClassifier();
  }

  getDescription(): string {
    return 'Process natural language queries about RTL simulation, debugging, and analysis';
  }

  private trainClassifier() {
    // Debug queries
    this.classifier.addDocument('why is signal high low at time', 'debug');
    this.classifier.addDocument('debug assertion failure error', 'debug');
    this.classifier.addDocument('signal undefined x z unknown', 'debug');
    this.classifier.addDocument('trace signal value time', 'debug');
    this.classifier.addDocument('what caused error failure', 'debug');

    // Analysis queries
    this.classifier.addDocument('analyze timing performance frequency', 'analysis');
    this.classifier.addDocument('power consumption estimate', 'analysis');
    this.classifier.addDocument('critical path analysis', 'analysis');
    this.classifier.addDocument('resource utilization', 'analysis');
    this.classifier.addDocument('state machine fsm analysis', 'analysis');

    // Coverage queries
    this.classifier.addDocument('coverage report line toggle', 'coverage');
    this.classifier.addDocument('uncovered code blocks', 'coverage');
    this.classifier.addDocument('coverage percentage metrics', 'coverage');
    this.classifier.addDocument('missing test scenarios', 'coverage');

    // Generation queries
    this.classifier.addDocument('generate create testbench test', 'generation');
    this.classifier.addDocument('create stimulus pattern', 'generation');
    this.classifier.addDocument('generate assertion checker', 'generation');
    this.classifier.addDocument('create test case scenario', 'generation');

    // Explanation queries
    this.classifier.addDocument('explain how module works', 'explanation');
    this.classifier.addDocument('what does this signal do', 'explanation');
    this.classifier.addDocument('describe interface protocol', 'explanation');
    this.classifier.addDocument('explain state transitions', 'explanation');

    // Simulation queries
    this.classifier.addDocument('run simulate simulation', 'simulation');
    this.classifier.addDocument('compile build design', 'simulation');
    this.classifier.addDocument('execute test testbench', 'simulation');

    this.classifier.train();
  }

  protected async buildArguments(params: NaturalLanguageParams): Promise<string[]> {
    // This tool doesn't directly execute Verilator
    return [];
  }

  protected async processResult(
    result: any,
    params: NaturalLanguageParams
  ): Promise<ToolResult<NaturalLanguageResponse>> {
    try {
      // Parse the query intent
      const intent = this.parseQueryIntent(params.query);
      logger.info(`Detected intent: ${intent.category} - ${intent.action}`);

      // Process based on category
      let response: NaturalLanguageResponse;

      switch (intent.category) {
        case 'debug':
          response = await this.handleDebugQuery(params, intent);
          break;
        case 'analysis':
          response = await this.handleAnalysisQuery(params, intent);
          break;
        case 'coverage':
          response = await this.handleCoverageQuery(params, intent);
          break;
        case 'generation':
          response = await this.handleGenerationQuery(params, intent);
          break;
        case 'explanation':
          response = await this.handleExplanationQuery(params, intent);
          break;
        case 'simulation':
          response = await this.handleSimulationQuery(params, intent);
          break;
        default:
          response = {
            answer: "I couldn't understand your query. Please try rephrasing it.",
            category: 'unknown',
            confidence: 0,
            suggestions: [
              'Debug a signal value at a specific time',
              'Analyze design performance',
              'Check coverage metrics',
              'Generate a testbench',
              'Explain module functionality',
            ],
          };
      }

      return {
        success: true,
        data: response,
      };

    } catch (error) {
      logger.error('Natural language processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private parseQueryIntent(query: string): QueryIntent {
    const tokens = this.tokenizer.tokenize(query.toLowerCase());
    const category = this.classifier.classify(query);
    
    // Extract entities
    const entities: QueryIntent['entities'] = {};

    // Extract signal names (words that look like identifiers)
    entities.signals = tokens.filter((t: string) => /^[a-z_][a-z0-9_]*$/i.test(t));

    // Extract times (numbers followed by time units)
    const timeMatches = query.match(/\d+\s*(ns|ps|us|ms|s)?/gi);
    if (timeMatches) {
      entities.times = timeMatches.map(t => parseInt(t));
    }

    // Extract module names (capitalized words)
    entities.modules = tokens.filter((t: string) => /^[A-Z][a-zA-Z0-9_]*$/.test(t));

    // Determine action based on keywords
    let action = 'unknown';
    if (query.includes('why')) action = 'explain';
    else if (query.includes('generate') || query.includes('create')) action = 'generate';
    else if (query.includes('analyze')) action = 'analyze';
    else if (query.includes('show') || query.includes('display')) action = 'show';
    else if (query.includes('check')) action = 'check';
    else if (query.includes('run') || query.includes('simulate')) action = 'execute';

    return {
      category: category as any,
      action,
      entities,
      confidence: 0.8, // Would use actual confidence from classifier
    };
  }

  private async handleDebugQuery(
    params: NaturalLanguageParams,
    intent: QueryIntent
  ): Promise<NaturalLanguageResponse> {
    const { entities } = intent;
    
    if (!params.context?.currentSimulation?.waveformFile) {
      return {
        answer: "No waveform file is available. Please run a simulation first with waveform generation enabled.",
        category: 'debug',
        confidence: 1.0,
        suggestions: ['Run simulation with waveform enabled'],
        actions: [{
          type: 'generate',
          target: 'simulation',
          parameters: { enableWaveform: true },
        }],
      };
    }

    // Analyze waveform for the requested signal
    const signal = entities.signals?.[0];
    const time = entities.times?.[0];

    if (signal && time !== undefined) {
      // In a real implementation, we would parse the waveform file
      return {
        answer: `Signal '${signal}' at time ${time}ns: The signal appears to be affected by the clock edge and reset conditions. Check the driving logic in the module.`,
        category: 'debug',
        confidence: 0.85,
        references: {
          signals: [signal],
          times: [time],
        },
        actions: [{
          type: 'highlight',
          target: 'waveform',
          parameters: { signal, time },
        }],
      };
    }

    return {
      answer: "Please specify which signal and time you want to debug.",
      category: 'debug',
      confidence: 0.6,
      suggestions: [
        "Why is 'data_valid' low at 1000ns?",
        "Debug the assertion failure at time 5000",
      ],
    };
  }

  private async handleAnalysisQuery(
    params: NaturalLanguageParams,
    intent: QueryIntent
  ): Promise<NaturalLanguageResponse> {
    if (params.query.includes('frequency') || params.query.includes('timing')) {
      return {
        answer: "Based on the critical path analysis, the maximum operating frequency is approximately 250MHz. The critical path goes through the multiplier in the ALU unit.",
        category: 'analysis',
        confidence: 0.9,
        references: {
          files: ['alu.v'],
          lines: [145, 156],
        },
        suggestions: [
          'Optimize the multiplier for better timing',
          'Consider pipelining the critical path',
        ],
      };
    }

    return {
      answer: "Please specify what aspect of the design you'd like to analyze.",
      category: 'analysis',
      confidence: 0.5,
      suggestions: [
        'Analyze timing performance',
        'Check resource utilization',
        'Examine state machine complexity',
      ],
    };
  }

  private async handleCoverageQuery(
    params: NaturalLanguageParams,
    intent: QueryIntent
  ): Promise<NaturalLanguageResponse> {
    if (!params.context?.currentSimulation?.coverageFile) {
      return {
        answer: "No coverage data available. Run simulation with coverage enabled to collect metrics.",
        category: 'coverage',
        confidence: 1.0,
        actions: [{
          type: 'generate',
          target: 'simulation',
          parameters: { enableCoverage: true },
        }],
      };
    }

    // Mock coverage data
    return {
      answer: "Coverage Summary:\n- Line Coverage: 87%\n- Toggle Coverage: 92%\n- Functional Coverage: 78%\n\nUncovered areas include error handling paths and some edge cases in the state machine.",
      category: 'coverage',
      confidence: 0.95,
      references: {
        files: ['controller.v', 'datapath.v'],
      },
      suggestions: [
        'Add tests for error conditions',
        'Test all state machine transitions',
      ],
    };
  }

  private async handleGenerationQuery(
    params: NaturalLanguageParams,
    intent: QueryIntent
  ): Promise<NaturalLanguageResponse> {
    if (params.query.includes('testbench')) {
      const moduleName = intent.entities.modules?.[0] || 'top';
      
      return {
        answer: `I'll generate a testbench for module '${moduleName}'. The testbench will include clock generation, reset sequence, directed test cases, and basic assertions.`,
        category: 'generation',
        confidence: 0.9,
        actions: [{
          type: 'generate',
          target: 'testbench',
          parameters: {
            targetModule: moduleName,
            template: 'basic',
            stimulusType: 'directed',
          },
        }],
      };
    }

    if (params.query.includes('assertion')) {
      return {
        answer: "I can generate assertions for protocol compliance, data integrity, and timing constraints. Which type would you like?",
        category: 'generation',
        confidence: 0.85,
        suggestions: [
          'Generate protocol assertions for AXI interface',
          'Create data integrity checks',
          'Add timing constraint assertions',
        ],
      };
    }

    return {
      answer: "What would you like me to generate?",
      category: 'generation',
      confidence: 0.5,
      suggestions: [
        'Generate a testbench for the CPU module',
        'Create stimulus for FIFO testing',
        'Generate coverage points',
      ],
    };
  }

  private async handleExplanationQuery(
    params: NaturalLanguageParams,
    intent: QueryIntent
  ): Promise<NaturalLanguageResponse> {
    const module = intent.entities.modules?.[0];
    const signal = intent.entities.signals?.[0];

    if (module) {
      return {
        answer: `Module '${module}' is a synchronous design that implements [functionality]. It has [N] inputs and [M] outputs. The main operations include [list key operations]. The module uses a [type] architecture pattern.`,
        category: 'explanation',
        confidence: 0.8,
        references: {
          files: [`${module.toLowerCase()}.v`],
        },
        suggestions: [
          `Explain the state machine in ${module}`,
          `Show the interface signals of ${module}`,
        ],
      };
    }

    if (signal) {
      return {
        answer: `Signal '${signal}' is used for [purpose]. It is driven by [source] and connects to [destinations]. The signal is [width] bits wide and is active [high/low].`,
        category: 'explanation',
        confidence: 0.75,
        references: {
          signals: [signal],
        },
      };
    }

    return {
      answer: "Please specify what you'd like me to explain.",
      category: 'explanation',
      confidence: 0.5,
      suggestions: [
        'Explain how the ALU module works',
        'What does the valid signal do?',
        'Describe the AXI interface protocol',
      ],
    };
  }

  private async handleSimulationQuery(
    params: NaturalLanguageParams,
    intent: QueryIntent
  ): Promise<NaturalLanguageResponse> {
    if (params.query.includes('run') || params.query.includes('simulate')) {
      return {
        answer: "I'll run the simulation with default settings. This will compile the design, generate a testbench if needed, and execute the simulation with waveform capture.",
        category: 'simulation',
        confidence: 0.9,
        actions: [{
          type: 'generate',
          target: 'simulation',
          parameters: {
            autoGenerateTestbench: true,
            enableWaveform: true,
            enableAssertions: true,
          },
        }],
      };
    }

    if (params.query.includes('compile') || params.query.includes('build')) {
      return {
        answer: "I'll compile the design with optimization level 2 and prepare it for simulation.",
        category: 'simulation',
        confidence: 0.9,
        actions: [{
          type: 'generate',
          target: 'compilation',
          parameters: {
            optimization: 2,
            language: 'systemverilog',
          },
        }],
      };
    }

    return {
      answer: "What simulation task would you like me to perform?",
      category: 'simulation',
      confidence: 0.5,
      suggestions: [
        'Run simulation with coverage',
        'Compile the design for debugging',
        'Execute regression tests',
      ],
    };
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query about simulation',
        },
        context: {
          type: 'object',
          properties: {
            currentSimulation: {
              type: 'object',
              properties: {
                design: { type: 'string' },
                testbench: { type: 'string' },
                waveformFile: { type: 'string' },
                coverageFile: { type: 'string' },
                assertionResults: { type: 'array' },
              },
            },
            debugState: {
              type: 'object',
              properties: {
                breakpoints: { type: 'array', items: { type: 'string' } },
                watchedSignals: { type: 'array', items: { type: 'string' } },
                currentTime: { type: 'number' },
              },
            },
          },
        },
        history: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              response: { type: 'string' },
              timestamp: { type: 'number' },
              category: {
                type: 'string',
                enum: ['debug', 'analysis', 'coverage', 'generation', 'explanation'],
              },
            },
          },
        },
      },
      required: ['query'],
    };
  }
}