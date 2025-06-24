#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

// Import utilities
import { ConfigManager } from './utils/config.js';
import { CacheManager } from './utils/cache.js';
import { logger } from './utils/logger.js';

// Import tools
import { CompileTool } from './tools/compile.js';
import { SimulateTool } from './tools/simulate.js';
import { TestbenchGeneratorTool } from './tools/testbench-generator.js';
import { NaturalLanguageTool } from './tools/natural-language.js';

// Resource schemas
const SimulationResourceSchema = z.object({
  projectId: z.string(),
  type: z.enum(['log', 'waveform', 'coverage', 'assertion']),
  simulationId: z.string(),
});

const DesignResourceSchema = z.object({
  projectId: z.string(),
  type: z.enum(['hierarchy', 'interface', 'parameter']),
});

class VerilatorMCPServer {
  private server: Server;
  private configManager: ConfigManager;
  private cacheManager: CacheManager;
  private tools: Map<string, any>;
  private resourceDir: string;

  constructor() {
    this.server = new Server(
      {
        name: 'verilator-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.configManager = ConfigManager.getInstance();
    this.cacheManager = new CacheManager();
    this.tools = new Map();
    this.resourceDir = join(homedir(), '.verilator-mcp', 'resources');

    this.initializeTools();
    this.setupHandlers();
  }

  private initializeTools() {
    // Initialize all tools
    const tools = [
      new CompileTool(this.configManager, this.cacheManager),
      new SimulateTool(this.configManager, this.cacheManager),
      new TestbenchGeneratorTool(this.configManager, this.cacheManager),
      new NaturalLanguageTool(this.configManager, this.cacheManager),
    ];

    // Register tools
    for (const tool of tools) {
      const toolName = tool.constructor.name.replace('Tool', '').toLowerCase();
      this.tools.set(`verilator_${toolName}`, tool);
    }
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.getDescription(),
        inputSchema: tool.getInputSchema(),
      }));

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }

      try {
        const result = await tool.execute(args);
        
        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}`,
              },
            ],
            isError: true,
          };
        }

        // Format response based on tool type
        const response = this.formatToolResponse(name, result.data);
        
        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      } catch (error) {
        logger.error(`Tool execution error for ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [];

      try {
        // List simulation artifacts
        const projectDirs = await this.listProjects();
        
        for (const projectId of projectDirs) {
          const projectPath = join(this.resourceDir, projectId);
          
          // Add simulation resources
          const simPath = join(projectPath, 'simulations');
          if (await this.pathExists(simPath)) {
            const simulations = await fs.readdir(simPath);
            
            for (const simId of simulations) {
              resources.push({
                uri: `simulation://${projectId}/logs/${simId}`,
                name: `Simulation Log - ${simId}`,
                description: 'Simulation output log',
                mimeType: 'text/plain',
              });

              resources.push({
                uri: `simulation://${projectId}/waves/${simId}`,
                name: `Waveform - ${simId}`,
                description: 'Simulation waveform data',
                mimeType: 'application/vcd',
              });
            }
          }

          // Add design resources
          resources.push({
            uri: `design://${projectId}/hierarchy`,
            name: `Design Hierarchy - ${projectId}`,
            description: 'Module hierarchy information',
            mimeType: 'application/json',
          });
        }
      } catch (error) {
        logger.error('Error listing resources:', error);
      }

      return { resources };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        const content = await this.readResource(uri);
        
        return {
          contents: [
            {
              uri,
              mimeType: this.getResourceMimeType(uri),
              text: content,
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private formatToolResponse(toolName: string, data: any): string {
    switch (toolName) {
      case 'verilator_compile':
        return this.formatCompileResponse(data);
      case 'verilator_simulate':
        return this.formatSimulateResponse(data);
      case 'verilator_testbenchgenerator':
        return this.formatTestbenchResponse(data);
      case 'verilator_naturallanguage':
        return this.formatNaturalLanguageResponse(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private formatCompileResponse(data: any): string {
    let response = `Compilation ${data.success ? 'Successful' : 'Failed'}\n`;
    response += `Output Directory: ${data.outputDir}\n`;
    
    if (data.executable) {
      response += `Executable: ${data.executable}\n`;
    }

    if (data.errors && data.errors.length > 0) {
      response += '\nErrors:\n';
      data.errors.forEach((err: any) => {
        response += `  ${err.file}:${err.line}: ${err.message}\n`;
      });
    }

    if (data.warnings && data.warnings.length > 0) {
      response += '\nWarnings:\n';
      data.warnings.forEach((warn: any) => {
        response += `  ${warn.file}:${warn.line}: ${warn.message}\n`;
      });
    }

    if (data.stats) {
      response += `\nStatistics:\n`;
      response += `  Modules: ${data.stats.modules}\n`;
      response += `  Lines: ${data.stats.lines}\n`;
    }

    return response;
  }

  private formatSimulateResponse(data: any): string {
    let response = `Simulation ${data.passed ? 'Passed' : 'Failed'}\n`;
    response += `Simulation Time: ${data.simulationTime} time units\n`;
    response += `Real Time: ${data.realTime}ms\n`;

    if (data.logFile) {
      response += `\nLog File: ${data.logFile}\n`;
    }

    if (data.waveformFile) {
      response += `Waveform File: ${data.waveformFile}\n`;
    }

    if (data.assertions && data.assertions.length > 0) {
      response += '\nAssertions:\n';
      const passed = data.assertions.filter((a: any) => a.passed).length;
      const failed = data.assertions.filter((a: any) => !a.passed).length;
      response += `  Passed: ${passed}\n`;
      response += `  Failed: ${failed}\n`;
      
      if (failed > 0) {
        response += '\nFailed Assertions:\n';
        data.assertions
          .filter((a: any) => !a.passed)
          .forEach((a: any) => {
            response += `  ${a.name} at ${a.file}:${a.line}\n`;
            if (a.message) {
              response += `    ${a.message}\n`;
            }
          });
      }
    }

    if (data.errors && data.errors.length > 0) {
      response += '\nErrors:\n';
      data.errors.forEach((err: string) => {
        response += `  ${err}\n`;
      });
    }

    if (data.statistics) {
      response += '\nStatistics:\n';
      response += `  Cycles: ${data.statistics.cycleCount}\n`;
      response += `  Events: ${data.statistics.eventCount}\n`;
      response += `  Memory: ${(data.statistics.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
    }

    return response;
  }

  private formatTestbenchResponse(data: any): string {
    let response = `Testbench Generated Successfully\n`;
    response += `File: ${data.generatedFile}\n`;
    response += `Module: ${data.moduleInfo.name}\n`;
    response += `Template: ${data.template}\n`;

    if (data.features && data.features.length > 0) {
      response += `\nFeatures:\n`;
      data.features.forEach((feature: string) => {
        response += `  - ${feature}\n`;
      });
    }

    response += `\nModule Interface:\n`;
    response += `  Inputs: ${data.moduleInfo.ports.filter((p: any) => p.direction === 'input').length}\n`;
    response += `  Outputs: ${data.moduleInfo.ports.filter((p: any) => p.direction === 'output').length}\n`;
    
    if (data.moduleInfo.parameters && data.moduleInfo.parameters.length > 0) {
      response += `  Parameters: ${data.moduleInfo.parameters.length}\n`;
    }

    if (data.moduleInfo.clockDomains && data.moduleInfo.clockDomains.length > 0) {
      response += `  Clock Domains: ${data.moduleInfo.clockDomains.length}\n`;
    }

    return response;
  }

  private formatNaturalLanguageResponse(data: any): string {
    let response = data.answer;

    if (data.suggestions && data.suggestions.length > 0) {
      response += '\n\nSuggestions:\n';
      data.suggestions.forEach((suggestion: string) => {
        response += `  - ${suggestion}\n`;
      });
    }

    if (data.references) {
      response += '\n\nReferences:\n';
      if (data.references.signals) {
        response += `  Signals: ${data.references.signals.join(', ')}\n`;
      }
      if (data.references.files) {
        response += `  Files: ${data.references.files.join(', ')}\n`;
      }
      if (data.references.times) {
        response += `  Times: ${data.references.times.join(', ')}\n`;
      }
    }

    if (data.actions && data.actions.length > 0) {
      response += '\n\nRecommended Actions:\n';
      data.actions.forEach((action: any) => {
        response += `  - ${action.type}: ${action.target}\n`;
      });
    }

    response += `\n[Confidence: ${(data.confidence * 100).toFixed(0)}%]`;

    return response;
  }

  private async listProjects(): Promise<string[]> {
    try {
      await fs.mkdir(this.resourceDir, { recursive: true });
      const entries = await fs.readdir(this.resourceDir);
      return entries.filter(entry => !entry.startsWith('.'));
    } catch {
      return [];
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async readResource(uri: string): Promise<string> {
    const match = uri.match(/^(simulation|design):\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid resource URI');
    }

    const [, type, projectId, path] = match;
    const basePath = join(this.resourceDir, projectId);

    if (type === 'simulation') {
      const [category, simId] = path.split('/');
      const filePath = join(basePath, 'simulations', simId, `${category}.txt`);
      return await fs.readFile(filePath, 'utf-8');
    } else if (type === 'design') {
      const filePath = join(basePath, 'design', `${path}.json`);
      return await fs.readFile(filePath, 'utf-8');
    }

    throw new Error('Unknown resource type');
  }

  private getResourceMimeType(uri: string): string {
    if (uri.includes('/waves/')) return 'application/vcd';
    if (uri.includes('/coverage/')) return 'application/json';
    if (uri.endsWith('.json')) return 'application/json';
    return 'text/plain';
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Verilator MCP server started');
  }
}

// Main entry point
const server = new VerilatorMCPServer();
server.run().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});