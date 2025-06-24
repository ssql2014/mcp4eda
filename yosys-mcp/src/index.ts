#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './utils/config.js';
import { CacheManager } from './utils/cache.js';
import { ErrorHandler } from './utils/error-handler.js';
import { mcpLogger } from './utils/logger.js';

// Tool implementations
import { SynthTool } from './tools/synth.js';
import { AnalyzeTool } from './tools/analyze.js';
import { ShowTool } from './tools/show.js';
// TODO: Import other tools as they are implemented
// import { QueryTool } from './tools/query.js';
// import { ProjectTool } from './tools/project.js';

import { AbstractTool } from './tools/base.js';

class YosysMCPServer {
  private server: Server;
  private configManager: ConfigManager;
  private cacheManager: CacheManager;
  private tools: Map<string, AbstractTool>;

  constructor() {
    this.server = new Server(
      {
        name: 'yosys-mcp',
        vendor: 'mcp4eda',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.configManager = new ConfigManager();
    this.cacheManager = new CacheManager({
      maxSize: 1000,
      ttl: 1000 * 60 * 30, // 30 minutes
    });

    this.tools = new Map();
    this.initializeTools();
    this.setupHandlers();
  }

  private initializeTools() {
    // Initialize all tools
    this.tools.set('yosys_synth', new SynthTool(this.configManager, this.cacheManager));
    this.tools.set('yosys_analyze', new AnalyzeTool(this.configManager, this.cacheManager));
    this.tools.set('yosys_show', new ShowTool(this.configManager, this.cacheManager));
    
    // TODO: Add other tools as they are implemented
    // this.tools.set('yosys_query', new QueryTool(this.configManager, this.cacheManager));
    // this.tools.set('yosys_project', new ProjectTool(this.configManager, this.cacheManager));
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      await this.configManager.initialize();
      
      const tools = [];
      for (const [name, tool] of this.tools) {
        const available = await this.configManager.isToolAvailable('yosys');
        if (available) {
          tools.push({
            name,
            description: tool.getDescription(),
            inputSchema: tool.getInputSchema(),
          });
        }
      }
      
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool not found: ${name}`
        );
      }

      try {
        const result = await tool.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const mcpError = ErrorHandler.toMcpError(error);
        throw mcpError;
      }
    });

    // Error handler
    this.server.onerror = (error) => {
      mcpLogger.error('Server error:', error);
    };

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  async start() {
    mcpLogger.info('Starting Yosys MCP server...');
    
    // Initialize configuration
    await this.configManager.initialize();
    
    // Check if Yosys is available
    const yosysPath = this.configManager.getYosysPath();
    if (!yosysPath) {
      mcpLogger.error('Yosys not found! Please install Yosys and ensure it is in PATH.');
      mcpLogger.error('You can also set YOSYS_PATH environment variable to point to the Yosys binary.');
      process.exit(1);
    }

    mcpLogger.info(`Found Yosys at: ${yosysPath}`);

    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    mcpLogger.info('Yosys MCP server started successfully');
  }

  private async cleanup() {
    mcpLogger.info('Cleaning up...');
    
    // Clear cache
    this.cacheManager.clear();
    
    // Clean up temporary files
    await this.configManager.cleanup();
    
    mcpLogger.info('Cleanup complete');
  }
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new YosysMCPServer();
  server.start().catch((error) => {
    mcpLogger.error('Failed to start server:', error);
    process.exit(1);
  });
}