#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
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
import { NaturalLanguageTool } from './tools/natural-language.js';
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
    this.tools.set('yosys_natural_language', new NaturalLanguageTool(this.configManager, this.cacheManager));
    
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

    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'yosys://examples/counter.v',
            name: 'Counter Example',
            description: 'Simple counter design in Verilog',
            mimeType: 'text/x-verilog'
          },
          {
            uri: 'yosys://examples/adder.v',
            name: 'Adder Example',
            description: '4-bit adder design',
            mimeType: 'text/x-verilog'
          },
          {
            uri: 'yosys://scripts/basic_synth.ys',
            name: 'Basic Synthesis Script',
            description: 'Basic Yosys synthesis flow',
            mimeType: 'text/plain'
          },
          {
            uri: 'yosys://scripts/fpga_synth.ys',
            name: 'FPGA Synthesis Script',
            description: 'FPGA-optimized synthesis flow',
            mimeType: 'text/plain'
          },
          {
            uri: 'yosys://docs/synthesis_tips.md',
            name: 'Synthesis Tips',
            description: 'Best practices for synthesis',
            mimeType: 'text/markdown'
          }
        ]
      };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      // Simple resource content based on URI
      const resources: Record<string, { text: string, mimeType: string }> = {
        'yosys://examples/counter.v': {
          text: `module counter (
    input clk,
    input reset,
    output reg [3:0] count
);

always @(posedge clk or posedge reset) begin
    if (reset)
        count <= 4'b0000;
    else
        count <= count + 1;
end

endmodule`,
          mimeType: 'text/x-verilog'
        },
        'yosys://examples/adder.v': {
          text: `module adder4bit (
    input [3:0] a,
    input [3:0] b,
    input cin,
    output [3:0] sum,
    output cout
);

assign {cout, sum} = a + b + cin;

endmodule`,
          mimeType: 'text/x-verilog'
        },
        'yosys://scripts/basic_synth.ys': {
          text: `# Basic Yosys synthesis script
read_verilog design.v
hierarchy -check -top top_module
proc
opt
memory
opt
techmap
opt
write_verilog synth_output.v`,
          mimeType: 'text/plain'
        },
        'yosys://scripts/fpga_synth.ys': {
          text: `# FPGA synthesis script
read_verilog design.v
hierarchy -check -top top_module
proc
flatten
tribuf -logic
deminout
opt
memory -nomap
opt_clean
check
opt -fast
fsm
opt -fast
memory_map
opt -full
techmap -map +/techmap.v
opt -fast
abc -fast
opt -fast
hierarchy -check
stat
write_verilog -noattr synth_output.v`,
          mimeType: 'text/plain'
        },
        'yosys://docs/synthesis_tips.md': {
          text: `# Yosys Synthesis Tips

## Optimization Levels

- **Level 0**: No optimization (debugging)
- **Level 1**: Basic optimization (fast)
- **Level 2**: Standard optimization (balanced)
- **Level 3**: Aggressive optimization (slow but thorough)

## Target-Specific Tips

### Xilinx FPGAs
- Use \`synth_xilinx\` for best results
- Enable DSP inference with \`-dsp\`
- Use \`-nodsp\` to disable DSP inference

### Intel/Altera FPGAs
- Use \`synth_intel\` or \`synth_altera\`
- Enable RAM inference with appropriate settings

### Lattice FPGAs
- Use \`synth_ice40\` for iCE40 series
- Use \`synth_ecp5\` for ECP5 series

## Common Optimizations

1. **Area optimization**: Use \`opt -full\` repeatedly
2. **Speed optimization**: Use \`abc -fast\` with timing constraints
3. **Power optimization**: Minimize switching activity

## Best Practices

- Always run \`check\` after major transformations
- Use \`stat\` to monitor resource usage
- Save intermediate results for debugging`,
          mimeType: 'text/markdown'
        }
      };

      const resource = resources[uri];
      if (!resource) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Resource not found: ${uri}`
        );
      }

      return {
        contents: [
          {
            uri,
            mimeType: resource.mimeType,
            text: resource.text
          }
        ]
      };
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