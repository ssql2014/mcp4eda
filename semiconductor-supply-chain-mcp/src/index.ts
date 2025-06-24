#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { findIpVendorsTool } from './tools/find-ip-vendors.js';
import { findAsicServicesTool } from './tools/find-asic-services.js';
import { priceCalculatorTool } from './tools/price-calculator.js';
import { compareVendorsTool } from './tools/compare-vendors.js';
import { naturalLanguageQueryTool } from './tools/natural-language-query.js';
import { setupResources } from './resources/index.js';

const server = new Server(
  {
    name: 'semiconductor-supply-chain-mcp',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Setup resources
setupResources(server);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      findIpVendorsTool.definition,
      findAsicServicesTool.definition,
      priceCalculatorTool.definition,
      compareVendorsTool.definition,
      naturalLanguageQueryTool.definition,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'find_ip_vendors':
        return await findIpVendorsTool.handler(args);
      
      case 'find_asic_services':
        return await findAsicServicesTool.handler(args);
      
      case 'get_price_estimation':
        return await priceCalculatorTool.handler(args);
      
      case 'compare_vendors':
        return await compareVendorsTool.handler(args);
      
      case 'natural_language_query':
        return await naturalLanguageQueryTool.handler(args);
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.message}`
      );
    }
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Internal error: ${error}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Semiconductor Supply Chain MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});