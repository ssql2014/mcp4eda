import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import glob from 'glob';

import { VeribleWrapper } from './parsers/verible-wrapper.js';
import { CacheDatabase } from './database/cache.js';
import { QueryEngine } from './query/engine.js';
import { ParsedModule } from './types/index.js';
import { logger } from './utils/logger.js';

// Tool parameter schemas
const ParseFileSchema = z.object({
  filepath: z.string().describe('Path to the Verilog/SystemVerilog file'),
  options: z.object({
    include_paths: z.array(z.string()).optional(),
    defines: z.record(z.string()).optional()
  }).optional()
});

const ParseProjectSchema = z.object({
  root_path: z.string().describe('Root directory of the project'),
  file_patterns: z.array(z.string()).default(['*.v', '*.sv']),
  exclude_patterns: z.array(z.string()).optional()
});

const QueryRegistersSchema = z.object({
  scope: z.string().optional().describe('Module name to limit the search'),
  type: z.enum(['flip_flop', 'latch', 'all']).default('all')
});

const AnalyzeModuleSchema = z.object({
  module_name: z.string().describe('Name of the module to analyze'),
  analysis_type: z.enum(['hierarchy', 'ports', 'parameters', 'all']).default('all')
});

const TraceSignalSchema = z.object({
  signal_name: z.string().describe('Name of the signal to trace'),
  scope: z.string().optional().describe('Module name to limit the search')
});

const NaturalLanguageQuerySchema = z.object({
  query: z.string().describe('Natural language query about the RTL design'),
  context: z.object({
    current_module: z.string().optional(),
    recent_queries: z.array(z.string()).optional()
  }).optional()
});

class RTLParserMCP {
  private server: Server;
  private verible: VeribleWrapper;
  private cache: CacheDatabase;
  private queryEngine: QueryEngine;
  private parsedModules: Map<string, ParsedModule[]> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'rtl-parser-mcp',
        vendor: 'mcp4eda',
        version: '0.1.0'
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        }
      }
    );

    this.verible = new VeribleWrapper();
    this.cache = new CacheDatabase();
    this.queryEngine = new QueryEngine(this.cache);
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'parse_file',
          description: 'Parse a single Verilog/SystemVerilog file',
          inputSchema: {
            type: 'object',
            properties: {
              filepath: { type: 'string', description: 'Path to the file' },
              options: {
                type: 'object',
                properties: {
                  include_paths: { type: 'array', items: { type: 'string' } },
                  defines: { type: 'object' }
                }
              }
            },
            required: ['filepath']
          }
        },
        {
          name: 'parse_project',
          description: 'Parse all Verilog/SystemVerilog files in a project',
          inputSchema: {
            type: 'object',
            properties: {
              root_path: { type: 'string', description: 'Project root directory' },
              file_patterns: { 
                type: 'array', 
                items: { type: 'string' },
                default: ['*.v', '*.sv']
              },
              exclude_patterns: { type: 'array', items: { type: 'string' } }
            },
            required: ['root_path']
          }
        },
        {
          name: 'query_registers',
          description: 'Query register information (flip-flops, latches)',
          inputSchema: {
            type: 'object',
            properties: {
              scope: { type: 'string', description: 'Module name (optional)' },
              type: { 
                type: 'string', 
                enum: ['flip_flop', 'latch', 'all'],
                default: 'all'
              }
            }
          }
        },
        {
          name: 'analyze_module',
          description: 'Analyze a specific module',
          inputSchema: {
            type: 'object',
            properties: {
              module_name: { type: 'string' },
              analysis_type: {
                type: 'string',
                enum: ['hierarchy', 'ports', 'parameters', 'all'],
                default: 'all'
              }
            },
            required: ['module_name']
          }
        },
        {
          name: 'trace_signal',
          description: 'Trace signal usage across modules',
          inputSchema: {
            type: 'object',
            properties: {
              signal_name: { type: 'string' },
              scope: { type: 'string', description: 'Module name (optional)' }
            },
            required: ['signal_name']
          }
        },
        {
          name: 'natural_language_query',
          description: 'Query RTL design using natural language',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Natural language query' },
              context: {
                type: 'object',
                properties: {
                  current_module: { type: 'string' },
                  recent_queries: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            required: ['query']
          }
        }
      ]
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'rtl://project/stats',
          name: 'Project Statistics',
          description: 'Overall project statistics',
          mimeType: 'application/json'
        },
        {
          uri: 'rtl://modules',
          name: 'Module List',
          description: 'List of all parsed modules',
          mimeType: 'application/json'
        },
        {
          uri: 'rtl://registers',
          name: 'Register Summary',
          description: 'Summary of all registers in the design',
          mimeType: 'application/json'
        }
      ]
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const allModules = Array.from(this.parsedModules.values()).flat();
      
      switch (uri) {
        case 'rtl://project/stats': {
          const stats = await this.queryEngine.getProjectStats(allModules);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(stats.data, null, 2)
            }]
          };
        }
        
        case 'rtl://modules': {
          const moduleList = allModules.map(m => ({
            name: m.name,
            file: m.filepath,
            line: m.line,
            port_count: m.ports.length,
            register_count: m.registers.length,
            instance_count: m.instances.length
          }));
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(moduleList, null, 2)
            }]
          };
        }
        
        case 'rtl://registers': {
          const result = await this.queryEngine.queryRegisters(allModules);
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(result.data, null, 2)
            }]
          };
        }
        
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'parse_file':
            return await this.handleParseFile(args);
          
          case 'parse_project':
            return await this.handleParseProject(args);
          
          case 'query_registers':
            return await this.handleQueryRegisters(args);
          
          case 'analyze_module':
            return await this.handleAnalyzeModule(args);
          
          case 'trace_signal':
            return await this.handleTraceSignal(args);
          
          case 'natural_language_query':
            return await this.handleNaturalLanguageQuery(args);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        
        logger.error(`Error in tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
    
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'analyze_design',
          description: 'Comprehensive RTL design analysis prompt',
          arguments: [
            {
              name: 'focus_area',
              description: 'Specific area to focus on (e.g., clock domains, hierarchy, registers)',
              required: false
            }
          ]
        },
        {
          name: 'find_issues',
          description: 'Find potential issues in RTL design',
          arguments: []
        },
        {
          name: 'summarize_module',
          description: 'Summarize a specific module',
          arguments: [
            {
              name: 'module_name',
              description: 'Name of the module to summarize',
              required: true
            }
          ]
        }
      ]
    }));
    
    // Get specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'analyze_design':
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze the RTL design${args?.focus_area ? ` with focus on ${args.focus_area}` : ''}. 
                
Use the available tools to:
1. Get project statistics (rtl://project/stats)
2. List all modules (rtl://modules) 
3. Analyze register usage and distribution
4. Identify module hierarchy and interconnections
5. Find potential design issues or areas of concern

Provide a comprehensive analysis including:
- Design overview and statistics
- Module hierarchy and relationships
- Register utilization by module
- Clock domain analysis (if applicable)
- Recommendations for improvement`
              }
            }]
          };
          
        case 'find_issues':
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze the RTL design to find potential issues.

Use the available tools to check for:
1. Modules with unusually high register counts
2. Deeply nested module hierarchies
3. Signals that might be clock domain crossing candidates
4. Unconnected or unused signals
5. Potential naming convention violations

Report any findings with specific module and line references.`
              }
            }]
          };
          
        case 'summarize_module':
          if (!args?.module_name) {
            throw new McpError(ErrorCode.InvalidRequest, 'module_name is required');
          }
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `Please provide a detailed summary of the module "${args.module_name}".

Use the analyze_module tool to get information about:
- Module parameters and their default values
- Input/output ports with their widths
- Internal registers and their types
- Sub-module instantiations
- Module's role in the overall design hierarchy

Format the summary in a clear, readable way.`
              }
            }]
          };
          
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
      }
    });
  }

  private async handleParseFile(args: any) {
    const params = ParseFileSchema.parse(args);
    
    // Check cache first
    let modules = await this.cache.getCachedParse(params.filepath);
    
    if (!modules) {
      modules = await this.verible.parseFile(params.filepath);
      await this.cache.cacheParse(params.filepath, modules);
    }
    
    this.parsedModules.set(params.filepath, modules);
    
    return {
      content: [{
        type: 'text',
        text: `Parsed ${modules.length} modules from ${params.filepath}`
      }]
    };
  }

  private async handleParseProject(args: any) {
    const params = ParseProjectSchema.parse(args);
    
    // Find all matching files
    const files: string[] = [];
    for (const pattern of params.file_patterns) {
      const matches = await new Promise<string[]>((resolve, reject) => {
        glob(pattern, {
          cwd: params.root_path,
          ignore: params.exclude_patterns,
          absolute: true
        }, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      files.push(...matches);
    }
    
    let totalModules = 0;
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        let modules = await this.cache.getCachedParse(file);
        
        if (!modules) {
          modules = await this.verible.parseFile(file);
          await this.cache.cacheParse(file, modules);
        }
        
        this.parsedModules.set(file, modules);
        totalModules += modules.length;
      } catch (error) {
        const errorMsg = `Failed to parse ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }
    
    const result = `Parsed ${totalModules} modules from ${files.length} files`;
    const errorSummary = errors.length > 0 ? `\nErrors: ${errors.length} files failed to parse` : '';
    
    return {
      content: [{
        type: 'text',
        text: result + errorSummary
      }]
    };
  }

  private async handleQueryRegisters(args: any) {
    const params = QueryRegistersSchema.parse(args);
    const allModules = Array.from(this.parsedModules.values()).flat();
    
    if (allModules.length === 0) {
      throw new McpError(ErrorCode.InvalidRequest, 'No modules parsed yet. Please parse files first.');
    }
    
    const result = await this.queryEngine.queryRegisters(allModules, params);
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error || 'Query failed');
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.data, null, 2)
      }]
    };
  }

  private async handleAnalyzeModule(args: any) {
    const params = AnalyzeModuleSchema.parse(args);
    const allModules = Array.from(this.parsedModules.values()).flat();
    
    if (allModules.length === 0) {
      throw new McpError(ErrorCode.InvalidRequest, 'No modules parsed yet. Please parse files first.');
    }
    
    const result = await this.queryEngine.analyzeModule(
      allModules,
      params.module_name,
      params.analysis_type
    );
    
    if (!result.success) {
      throw new McpError(ErrorCode.InvalidRequest, result.error || 'Analysis failed');
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.data, null, 2)
      }]
    };
  }

  private async handleTraceSignal(args: any) {
    const params = TraceSignalSchema.parse(args);
    const allModules = Array.from(this.parsedModules.values()).flat();
    
    if (allModules.length === 0) {
      throw new McpError(ErrorCode.InvalidRequest, 'No modules parsed yet. Please parse files first.');
    }
    
    const result = await this.queryEngine.traceSignal(
      allModules,
      params.signal_name,
      params.scope
    );
    
    if (!result.success) {
      throw new McpError(ErrorCode.InternalError, result.error || 'Trace failed');
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result.data, null, 2)
      }]
    };
  }

  private async handleNaturalLanguageQuery(args: any) {
    const params = NaturalLanguageQuerySchema.parse(args);
    const query = params.query.toLowerCase();
    const allModules = Array.from(this.parsedModules.values()).flat();
    
    if (allModules.length === 0) {
      throw new McpError(ErrorCode.InvalidRequest, 'No modules parsed yet. Please parse files first.');
    }
    
    // Parse natural language query and convert to appropriate tool calls
    let result: any;
    
    // Register-related queries
    if (query.includes('register') || query.includes('flip-flop') || query.includes('flop') || query.includes('latch')) {
      let type: 'flip_flop' | 'latch' | 'all' = 'all';
      if (query.includes('flip-flop') || query.includes('flop')) {
        type = 'flip_flop';
      } else if (query.includes('latch')) {
        type = 'latch';
      }
      
      // Extract module name if mentioned
      let scope: string | undefined;
      for (const module of allModules) {
        if (query.includes(module.name.toLowerCase())) {
          scope = module.name;
          break;
        }
      }
      
      const queryResult = await this.queryEngine.queryRegisters(allModules, { type, scope });
      if (!queryResult.success) {
        throw new McpError(ErrorCode.InternalError, queryResult.error || 'Query failed');
      }
      
      result = queryResult.data;
    }
    // Module-related queries
    else if (query.includes('module') || query.includes('hierarchy') || query.includes('port') || query.includes('parameter')) {
      // Find module name in query
      let moduleName: string | undefined;
      for (const module of allModules) {
        if (query.includes(module.name.toLowerCase())) {
          moduleName = module.name;
          break;
        }
      }
      
      if (moduleName) {
        let analysisType: 'hierarchy' | 'ports' | 'parameters' | 'all' = 'all';
        if (query.includes('hierarchy')) analysisType = 'hierarchy';
        else if (query.includes('port')) analysisType = 'ports';
        else if (query.includes('parameter')) analysisType = 'parameters';
        
        const queryResult = await this.queryEngine.analyzeModule(allModules, moduleName, analysisType);
        if (!queryResult.success) {
          throw new McpError(ErrorCode.InvalidRequest, queryResult.error || 'Analysis failed');
        }
        result = queryResult.data;
      } else {
        // List all modules
        result = {
          modules: allModules.map(m => ({
            name: m.name,
            file: m.filepath,
            ports: m.ports.length,
            registers: m.registers.length
          }))
        };
      }
    }
    // Signal tracing queries
    else if (query.includes('signal') || query.includes('trace') || query.includes('where')) {
      // Extract signal name (usually in quotes or after specific keywords)
      const signalMatch = query.match(/["']([^"']+)["']/) || 
                          query.match(/signal\s+(\w+)/) ||
                          query.match(/trace\s+(\w+)/);
      
      if (signalMatch) {
        const signalName = signalMatch[1];
        const queryResult = await this.queryEngine.traceSignal(allModules, signalName);
        if (!queryResult.success) {
          throw new McpError(ErrorCode.InternalError, queryResult.error || 'Trace failed');
        }
        result = queryResult.data;
      } else {
        result = {
          error: "Could not identify signal name in query. Please specify the signal name in quotes or after 'signal' or 'trace'."
        };
      }
    }
    // Statistics queries
    else if (query.includes('statistic') || query.includes('stat') || query.includes('summary') || query.includes('how many')) {
      const statsResult = await this.queryEngine.getProjectStats(allModules);
      if (!statsResult.success) {
        throw new McpError(ErrorCode.InternalError, statsResult.error || 'Stats query failed');
      }
      result = statsResult.data;
    }
    else {
      result = {
        error: "Could not understand the query. Try asking about registers, modules, signals, or statistics.",
        suggestions: [
          "How many registers are in the design?",
          "Show me the ports of module cpu_core",
          "Where is signal clk used?",
          "What are the statistics of this project?"
        ]
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query: params.query,
          result
        }, null, 2)
      }]
    };
  }

  async start() {
    await this.cache.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('RTL Parser MCP server started');
  }
}

// Start the server
const mcp = new RTLParserMCP();
mcp.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});