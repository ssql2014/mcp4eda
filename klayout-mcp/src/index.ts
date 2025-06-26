#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './utils/config.js';
import { CacheManager } from './utils/cache.js';
import { logger } from './utils/logger.js';
import { handleError } from './utils/error-handler.js';

// Import tools
import { LayoutInfoTool } from './tools/layout-info.js';
import { ConvertLayoutTool } from './tools/convert-layout.js';
import { RunDRCTool } from './tools/run-drc.js';
import { ExecuteScriptTool } from './tools/execute-script.js';
import { ExtractLayersTool } from './tools/extract-layers.js';
import { NaturalLanguageTool } from './tools/natural-language.js';
import { AbstractTool } from './tools/base.js';

// Import resources
import { ResourceManager } from './resources/index.js';

class KLayoutMCPServer {
  private server: Server;
  private config: ConfigManager;
  private cache: CacheManager;
  private resourceManager: ResourceManager;
  private tools: Map<string, AbstractTool> = new Map();

  constructor() {
    // Initialize server
    this.server = new Server(
      {
        name: 'klayout-mcp',
        vendor: 'MCP4EDA',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize configuration
    this.config = new ConfigManager();
    
    // Initialize cache
    this.cache = new CacheManager(
      this.config.isCacheEnabled(),
      this.config.getCacheTTL()
    );
    
    // Initialize resource manager
    this.resourceManager = new ResourceManager();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize configuration
      await this.config.initialize();

      // Register tools
      this.registerTools();

      // Set up request handlers
      this.setupHandlers();

      logger.info('KLayout MCP Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KLayout MCP Server:', error);
      throw error;
    }
  }

  private registerTools(): void {
    // Create tool instances
    const tools = [
      new LayoutInfoTool(this.config, this.cache),
      new ConvertLayoutTool(this.config, this.cache),
      new RunDRCTool(this.config, this.cache),
      new ExecuteScriptTool(this.config, this.cache),
      new ExtractLayersTool(this.config, this.cache),
      new NaturalLanguageTool(this.config, this.cache),
    ];

    // Register each tool
    for (const tool of tools) {
      this.tools.set(tool.getName(), tool);
      logger.info(`Registered tool: ${tool.getName()}`);
    }
  }

  private setupHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map(tool => tool.getTool());
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
      }

      try {
        const result = await tool.run(args || {});
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        throw handleError(error);
      }
    });

    // Handle list resources request
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const resources = await this.resourceManager.listResources();
        return { resources };
      } catch (error) {
        logger.error('Failed to list resources:', error);
        return { resources: [] };
      }
    });

    // Handle read resource request
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const content = await this.resourceManager.readResource(uri);
        return { 
          contents: [{ 
            uri, 
            mimeType: 'text/plain',
            text: content 
          }] 
        };
      } catch (error) {
        throw new McpError(ErrorCode.InvalidRequest, `Failed to read resource: ${error}`);
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('KLayout MCP Server started on stdio transport');
  }
}

// Main entry point
async function main() {
  try {
    const server = new KLayoutMCPServer();
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down KLayout MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down KLayout MCP Server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});