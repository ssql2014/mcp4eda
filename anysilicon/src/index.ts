#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { calculateDiePerWafer, compareAlgorithms } from './calculations/diePerWafer.js';
import { calculateYield } from './calculations/yieldCalculator.js';
import { STANDARD_WAFER_SIZES } from './config/defaults.js';
import { validateDiePerWaferParams } from './utils/validation.js';
import { AnySiliconError } from './errors/index.js';
import type {
  DiePerWaferParams,
  YieldParams,
  StandardWaferInfo,
} from './calculations/types.js';

const server = new Server(
  {
    name: 'anysilicon-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'calculate_die_per_wafer': {
        const params = args as unknown as DiePerWaferParams;
        const result = calculateDiePerWafer(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'validate_parameters': {
        const { parameters } = args as { operation: string; parameters: DiePerWaferParams };
        const validation = validateDiePerWaferParams(parameters);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(validation, null, 2),
            },
          ],
        };
      }

      case 'get_standard_wafer_sizes': {
        const sizes: StandardWaferInfo[] = Object.values(STANDARD_WAFER_SIZES);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ sizes }, null, 2),
            },
          ],
        };
      }

      case 'calculate_yield': {
        const params = args as unknown as YieldParams;
        const result = calculateYield(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'compare_algorithms': {
        const params = args as unknown as DiePerWaferParams;
        const result = compareAlgorithms(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof AnySiliconError) {
      throw new McpError(ErrorCode.InvalidParams, error.message, error.details);
    }
    throw error;
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'calculate_die_per_wafer',
        description: 'Calculate the number of dies that fit on a wafer',
        inputSchema: {
          type: 'object',
          properties: {
            wafer_diameter: {
              type: 'number',
              enum: [150, 200, 300, 450],
              description: 'Wafer diameter in mm',
            },
            die_width: {
              type: 'number',
              description: 'Die width in mm',
              minimum: 0.1,
            },
            die_height: {
              type: 'number',
              description: 'Die height in mm',
              minimum: 0.1,
            },
            scribe_lane: {
              type: 'number',
              description: 'Scribe lane width in mm (default: 0.1)',
              minimum: 0.05,
              maximum: 0.2,
            },
            edge_exclusion: {
              type: 'number',
              description: 'Edge exclusion zone in mm (default: 3)',
              minimum: 2,
              maximum: 5,
            },
            algorithm: {
              type: 'string',
              enum: ['rectangular', 'hexagonal'],
              description: 'Placement algorithm (default: rectangular)',
            },
            include_visualization: {
              type: 'boolean',
              description: 'Generate placement visualization',
            },
          },
          required: ['wafer_diameter', 'die_width', 'die_height'],
        },
      },
      {
        name: 'validate_parameters',
        description: 'Validate calculation parameters before processing',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'Operation to validate for',
            },
            parameters: {
              type: 'object',
              description: 'Parameters to validate',
            },
          },
          required: ['operation', 'parameters'],
        },
      },
      {
        name: 'get_standard_wafer_sizes',
        description: 'Get standard wafer size information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'calculate_yield',
        description: 'Calculate die yield considering defect density',
        inputSchema: {
          type: 'object',
          properties: {
            total_dies: {
              type: 'number',
              description: 'Total number of dies on wafer',
            },
            defect_density: {
              type: 'number',
              description: 'Defects per cm²',
              minimum: 0,
            },
            die_area: {
              type: 'number',
              description: 'Die area in mm²',
              minimum: 0,
            },
            alpha: {
              type: 'number',
              description: 'Clustering factor (default: 3)',
              minimum: 0,
            },
          },
          required: ['total_dies', 'defect_density', 'die_area'],
        },
      },
      {
        name: 'compare_algorithms',
        description: 'Compare rectangular vs hexagonal placement algorithms',
        inputSchema: {
          type: 'object',
          properties: {
            wafer_diameter: {
              type: 'number',
              enum: [150, 200, 300, 450],
              description: 'Wafer diameter in mm',
            },
            die_width: {
              type: 'number',
              description: 'Die width in mm',
              minimum: 0.1,
            },
            die_height: {
              type: 'number',
              description: 'Die height in mm',
              minimum: 0.1,
            },
          },
          required: ['wafer_diameter', 'die_width', 'die_height'],
        },
      },
    ],
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'wafer://standards/sizes',
        name: 'Standard Wafer Sizes',
        description: 'Information about standard wafer sizes and their applications',
        mimeType: 'application/json',
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AnySilicon MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});