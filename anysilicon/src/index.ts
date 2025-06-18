#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { calculateDiePerWafer } from './calculations/diePerWafer.js';
import { STANDARD_WAFER_SIZES } from './config/defaults.js';
import { validateDiePerWaferParams, isDiePerWaferParams } from './utils/validation.js';
import { AnySiliconError } from './errors/index.js';
import type {
  DiePerWaferParams,
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
      prompts: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'calculate_die_per_wafer': {
        if (!isDiePerWaferParams(args)) {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for calculate_die_per_wafer');
        }
        const result = calculateDiePerWafer(args);
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
      {
        uri: 'wafer://standards/defect-density',
        name: 'Typical Defect Densities',
        description: 'Typical defect density ranges for different process nodes',
        mimeType: 'application/json',
      },
      {
        uri: 'wafer://formulas/die-per-wafer',
        name: 'Die Per Wafer Formulas',
        description: 'Mathematical formulas used for die per wafer calculations',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case 'wafer://standards/sizes':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(STANDARD_WAFER_SIZES, null, 2),
        }],
      };
      
    case 'wafer://standards/defect-density':
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            process_nodes: {
              '180nm': { min: 0.5, max: 2.0, typical: 1.0, unit: 'defects/cm²' },
              '130nm': { min: 0.3, max: 1.5, typical: 0.8, unit: 'defects/cm²' },
              '90nm': { min: 0.2, max: 1.0, typical: 0.5, unit: 'defects/cm²' },
              '65nm': { min: 0.15, max: 0.8, typical: 0.4, unit: 'defects/cm²' },
              '45nm': { min: 0.1, max: 0.6, typical: 0.3, unit: 'defects/cm²' },
              '32nm': { min: 0.08, max: 0.5, typical: 0.2, unit: 'defects/cm²' },
              '22nm': { min: 0.05, max: 0.3, typical: 0.15, unit: 'defects/cm²' },
              '14nm': { min: 0.03, max: 0.2, typical: 0.1, unit: 'defects/cm²' },
              '10nm': { min: 0.02, max: 0.15, typical: 0.08, unit: 'defects/cm²' },
              '7nm': { min: 0.01, max: 0.1, typical: 0.05, unit: 'defects/cm²' },
              '5nm': { min: 0.008, max: 0.08, typical: 0.04, unit: 'defects/cm²' },
              '3nm': { min: 0.005, max: 0.05, typical: 0.025, unit: 'defects/cm²' },
            },
          }, null, 2),
        }],
      };
      
    case 'wafer://formulas/die-per-wafer':
      return {
        contents: [{
          uri,
          mimeType: 'text/markdown',
          text: `# Die Per Wafer Calculation Formula

## AnySilicon Formula
\`\`\`
Die Per Wafer = d × π × (d/(4×S) - 1/√(2×S))
\`\`\`

Where:
- **d** = wafer diameter (mm) - after edge exclusion
- **S** = die area (mm²) - including scribe lanes
- **π** = Pi (approximately 3.14159)

## Calculation Method
1. Calculate die area including scribe lanes: \`S = (die_width + scribe) × (die_height + scribe)\`
2. Apply edge exclusion to get effective diameter: \`d = wafer_diameter - 2 × edge_exclusion\`
3. Apply the AnySilicon formula to get total dies

## Key Parameters
- **Wafer Diameter**: Standard sizes are 150mm, 200mm, 300mm, and 450mm
- **Die Size**: Width and height of individual die in mm
- **Scribe Lane**: Separation between dies for cutting (typically 0.1mm)
- **Edge Exclusion**: Unusable area at wafer edge (typically 3mm)`,
        }],
      };
      
    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'quick-calculation',
        description: 'Quick die per wafer calculation for common scenarios',
        arguments: [
          {
            name: 'wafer_size',
            description: 'Wafer diameter (150, 200, 300, or 450 mm)',
            required: true,
          },
          {
            name: 'die_size',
            description: 'Die dimensions in format "widthxheight" (e.g., "10x10")',
            required: true,
          },
        ],
      },
      {
        name: 'optimization-study',
        description: 'Find optimal die size for a wafer',
        arguments: [
          {
            name: 'wafer_size',
            description: 'Wafer diameter',
            required: true,
          },
          {
            name: 'target_dies',
            description: 'Target number of dies',
            required: false,
          },
        ],
      },
    ],
  };
});

// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'quick-calculation': {
      const waferSize = args?.wafer_size || '300';
      const dieSize = args?.die_size || '10x10';
      const [width, height] = dieSize.split('x').map(Number);
      
      return {
        description: `Calculate dies per wafer for ${waferSize}mm wafer with ${dieSize}mm dies`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Calculate how many ${width}x${height}mm dies fit on a ${waferSize}mm wafer. Include utilization percentage and calculation details.`,
            },
          },
        ],
      };
    }
    
    case 'optimization-study': {
      const waferSize = args?.wafer_size || '300';
      const targetDies = args?.target_dies;
      
      return {
        description: `Optimization study for ${waferSize}mm wafer`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: targetDies 
                ? `Find die dimensions that yield approximately ${targetDies} dies on a ${waferSize}mm wafer. Test multiple aspect ratios.`
                : `Find optimal die sizes for a ${waferSize}mm wafer that maximize utilization. Test sizes from 5x5mm to 20x20mm.`,
            },
          },
        ],
      };
    }
    
    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
  }
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