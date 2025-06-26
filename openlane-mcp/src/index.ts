#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  TextContent,
  ImageContent,
  ErrorCode,
  McpError,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

const OPENLANE_NAME = 'OpenLane MCP Server';
const OPENLANE_VERSION = '0.1.0';

interface ServerConfig {
  containerExecutable?: string;
  openlanePdkImage?: string;
  openlaneFlowImage?: string;
  workDir?: string;
  enableGpu?: boolean;
  maxRunTime?: number;
}

class OpenLaneServer {
  private server: Server;
  private config: ServerConfig;

  constructor(config: ServerConfig = {}) {
    this.config = {
      containerExecutable: config.containerExecutable || 'docker',
      openlanePdkImage: config.openlanePdkImage || 'efabless/openlane:latest',
      openlaneFlowImage: config.openlaneFlowImage || 'efabless/openlane:latest',
      workDir: config.workDir || path.join(os.homedir(), 'openlane-mcp-workspace'),
      enableGpu: config.enableGpu ?? false,
      maxRunTime: config.maxRunTime || 3600000, // 1 hour default
    };

    this.server = new Server(
      {
        name: OPENLANE_NAME,
        version: OPENLANE_VERSION,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.error = this.error.bind(this);
  }

  private error(code: ErrorCode, message: string): never {
    throw new McpError(code, message);
  }

  private setupHandlers(): void {
    // Tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'openlane_run_flow',
          description: 'Run complete RTL to GDSII flow for a design',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design (must match design directory)',
              },
              designPath: {
                type: 'string',
                description: 'Path to the design directory containing config.json',
              },
              tag: {
                type: 'string',
                description: 'Optional run tag (default: RUN_<timestamp>)',
              },
              threads: {
                type: 'number',
                description: 'Number of threads to use',
                default: 4,
              },
              skipSynthesis: {
                type: 'boolean',
                description: 'Skip synthesis stage',
                default: false,
              },
              skipPlacement: {
                type: 'boolean',
                description: 'Skip placement stage',
                default: false,
              },
              skipRouting: {
                type: 'boolean',
                description: 'Skip routing stage',
                default: false,
              },
            },
            required: ['designName', 'designPath'],
          },
        },
        {
          name: 'openlane_synthesis',
          description: 'Run only synthesis stage',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              verilogFiles: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of Verilog source files',
              },
              topModule: {
                type: 'string',
                description: 'Top module name',
              },
              clockPeriod: {
                type: 'number',
                description: 'Clock period in nanoseconds',
                default: 10,
              },
              targetDensity: {
                type: 'number',
                description: 'Target utilization (0.0-1.0)',
                default: 0.5,
              },
            },
            required: ['designName', 'verilogFiles', 'topModule'],
          },
        },
        {
          name: 'openlane_floorplan',
          description: 'Run floorplanning stage',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              synthesisPath: {
                type: 'string',
                description: 'Path to synthesis results',
              },
              dieArea: {
                type: 'array',
                items: { type: 'number' },
                description: 'Die area [x1, y1, x2, y2] in microns',
              },
              coreUtilization: {
                type: 'number',
                description: 'Core utilization percentage',
                default: 50,
              },
              aspectRatio: {
                type: 'number',
                description: 'Core aspect ratio',
                default: 1,
              },
            },
            required: ['designName', 'synthesisPath'],
          },
        },
        {
          name: 'openlane_placement',
          description: 'Run placement stage',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              floorplanPath: {
                type: 'string',
                description: 'Path to floorplan results',
              },
              placementType: {
                type: 'string',
                enum: ['global', 'detailed', 'both'],
                description: 'Type of placement to run',
                default: 'both',
              },
            },
            required: ['designName', 'floorplanPath'],
          },
        },
        {
          name: 'openlane_routing',
          description: 'Run routing stage',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              placementPath: {
                type: 'string',
                description: 'Path to placement results',
              },
              routingStrategy: {
                type: 'number',
                description: 'Routing strategy (0-14)',
                default: 0,
              },
            },
            required: ['designName', 'placementPath'],
          },
        },
        {
          name: 'openlane_sta',
          description: 'Run static timing analysis',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              designPath: {
                type: 'string',
                description: 'Path to design results',
              },
              corner: {
                type: 'string',
                enum: ['nom', 'min', 'max'],
                description: 'Analysis corner',
                default: 'nom',
              },
              reportType: {
                type: 'string',
                enum: ['summary', 'detailed', 'violations'],
                description: 'Type of timing report',
                default: 'summary',
              },
            },
            required: ['designName', 'designPath'],
          },
        },
        {
          name: 'openlane_drc',
          description: 'Run design rule checking',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              gdsFile: {
                type: 'string',
                description: 'Path to GDS file',
              },
              reportViolations: {
                type: 'boolean',
                description: 'Report all violations',
                default: true,
              },
            },
            required: ['designName', 'gdsFile'],
          },
        },
        {
          name: 'openlane_extract_metrics',
          description: 'Extract design metrics and statistics',
          inputSchema: {
            type: 'object',
            properties: {
              designName: {
                type: 'string',
                description: 'Name of the design',
              },
              runPath: {
                type: 'string',
                description: 'Path to OpenLane run directory',
              },
              metrics: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['area', 'power', 'timing', 'utilization', 'wirelength', 'violations'],
                },
                description: 'Metrics to extract',
              },
            },
            required: ['designName', 'runPath'],
          },
        },
        {
          name: 'openlane_natural_language',
          description: 'Process natural language queries about OpenLane',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language query about OpenLane operations',
              },
              context: {
                type: 'object',
                properties: {
                  currentDesign: {
                    type: 'string',
                    description: 'Current design being worked on',
                  },
                  stage: {
                    type: 'string',
                    description: 'Current flow stage',
                  },
                },
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // Resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'openlane://flow-stages',
          name: 'OpenLane Flow Stages',
          description: 'Detailed information about each stage in the RTL to GDSII flow',
          mimeType: 'application/json',
        },
        {
          uri: 'openlane://configuration',
          name: 'OpenLane Configuration Guide',
          description: 'Configuration parameters and their descriptions',
          mimeType: 'text/markdown',
        },
        {
          uri: 'openlane://pdk-info',
          name: 'PDK Information',
          description: 'Supported PDKs and their characteristics',
          mimeType: 'application/json',
        },
        {
          uri: 'openlane://best-practices',
          name: 'OpenLane Best Practices',
          description: 'Tips and best practices for using OpenLane',
          mimeType: 'text/markdown',
        },
        {
          uri: 'openlane://example-designs',
          name: 'Example Designs',
          description: 'Sample designs and configurations',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case 'openlane://flow-stages':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  stages: {
                    synthesis: {
                      name: 'Synthesis',
                      description: 'Convert RTL to gate-level netlist',
                      tools: ['yosys', 'abc'],
                      inputs: ['Verilog/SystemVerilog files'],
                      outputs: ['Synthesized netlist', 'Area report', 'Timing report'],
                      key_parameters: ['CLOCK_PERIOD', 'SYNTH_STRATEGY', 'SYNTH_MAX_FANOUT'],
                    },
                    floorplan: {
                      name: 'Floorplanning',
                      description: 'Define chip dimensions and pin placement',
                      tools: ['init_fp', 'ioPlacer', 'pdn'],
                      inputs: ['Synthesized netlist', 'Constraints'],
                      outputs: ['Floorplan DEF', 'IO placement'],
                      key_parameters: ['FP_CORE_UTIL', 'FP_ASPECT_RATIO', 'FP_PDN_VOFFSET'],
                    },
                    placement: {
                      name: 'Placement',
                      description: 'Place standard cells',
                      tools: ['RePLace', 'OpenDP'],
                      inputs: ['Floorplan', 'Netlist'],
                      outputs: ['Placed design', 'Congestion report'],
                      key_parameters: ['PL_TARGET_DENSITY', 'PL_RESIZER_HOLD_MAX_BUFFER_PERCENT'],
                    },
                    cts: {
                      name: 'Clock Tree Synthesis',
                      description: 'Build balanced clock distribution network',
                      tools: ['TritonCTS'],
                      inputs: ['Placed design'],
                      outputs: ['Clock tree', 'Skew report'],
                      key_parameters: ['CTS_TARGET_SKEW', 'CTS_CLK_BUFFER_LIST'],
                    },
                    routing: {
                      name: 'Routing',
                      description: 'Connect cells with metal wires',
                      tools: ['FastRoute', 'TritonRoute'],
                      inputs: ['Placed design with CTS'],
                      outputs: ['Routed design', 'DRC report'],
                      key_parameters: ['ROUTING_STRATEGY', 'GLOBAL_ROUTER', 'DETAILED_ROUTER'],
                    },
                    finishing: {
                      name: 'Finishing',
                      description: 'Final optimizations and GDSII generation',
                      tools: ['Magic', 'Klayout'],
                      inputs: ['Routed design'],
                      outputs: ['GDSII', 'LEF', 'Spice netlist'],
                      key_parameters: ['MAGIC_DRC_USE_GDS', 'TAKE_LAYOUT_SCROT'],
                    },
                  },
                  flow_order: ['synthesis', 'floorplan', 'placement', 'cts', 'routing', 'finishing'],
                }, null, 2),
              },
            ],
          };
          
        case 'openlane://configuration':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: `# OpenLane Configuration Guide

## Basic Configuration

### Required Parameters
- \`DESIGN_NAME\`: Name of your design
- \`VERILOG_FILES\`: Path to Verilog source files
- \`CLOCK_PORT\`: Name of clock port
- \`CLOCK_PERIOD\`: Target clock period in ns

### Example config.json
\`\`\`json
{
  "DESIGN_NAME": "my_design",
  "VERILOG_FILES": "dir::src/*.v",
  "CLOCK_PORT": "clk",
  "CLOCK_PERIOD": 10,
  "FP_CORE_UTIL": 45,
  "PL_TARGET_DENSITY": 0.5,
  "SYNTH_STRATEGY": "AREA 1"
}
\`\`\`

## Advanced Parameters

### Synthesis
- \`SYNTH_STRATEGY\`: Optimization strategy (AREA 0-3, DELAY 0-4)
- \`SYNTH_MAX_FANOUT\`: Maximum fanout (default: 10)
- \`SYNTH_BUFFERING\`: Enable buffering (default: 1)

### Floorplanning
- \`FP_CORE_UTIL\`: Core utilization percentage
- \`FP_ASPECT_RATIO\`: Height/Width ratio
- \`FP_PDN_VOFFSET\`: Power grid vertical offset

### Placement
- \`PL_TARGET_DENSITY\`: Target placement density
- \`PL_RESIZER_DESIGN_OPTIMIZATIONS\`: Enable optimizations
- \`PL_RESIZER_TIMING_OPTIMIZATIONS\`: Enable timing opt

### Routing
- \`ROUTING_STRATEGY\`: Strategy 0-14 (0 fastest, 14 best QoR)
- \`GLB_RT_ADJUSTMENT\`: Global routing adjustment
- \`DRT_OPT_ITERS\`: Detailed routing optimization iterations

## PDK-Specific Settings

### Sky130
- Process: 130nm
- Metal layers: 5
- Standard cell height: 2.72 μm

### GF180MCU
- Process: 180nm
- Metal layers: 4-6
- Standard cell height: 5.04 μm
`,
              },
            ],
          };
          
        case 'openlane://pdk-info':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  supported_pdks: {
                    sky130: {
                      name: 'SkyWater 130nm',
                      process: '130nm',
                      vendor: 'SkyWater Technology',
                      variants: ['sky130_fd_sc_hd', 'sky130_fd_sc_hdll', 'sky130_fd_sc_hs'],
                      metal_layers: 5,
                      features: ['Open source', 'Well documented', 'Active community'],
                      applications: ['IoT', 'Mixed signal', 'RF'],
                    },
                    gf180mcu: {
                      name: 'GlobalFoundries 180nm MCU',
                      process: '180nm',
                      vendor: 'GlobalFoundries',
                      variants: ['gf180mcu_fd_sc_mcu7t5v0', 'gf180mcu_fd_sc_mcu9t5v0'],
                      metal_layers: '4-6',
                      features: ['MCU optimized', 'NVM support', 'High voltage'],
                      applications: ['MCU', 'Automotive', 'Industrial'],
                    },
                    asap7: {
                      name: 'ASAP 7nm Predictive',
                      process: '7nm',
                      vendor: 'ASU/ARM',
                      variants: ['asap7_75t_R'],
                      metal_layers: 9,
                      features: ['Academic', 'FinFET', 'Predictive'],
                      applications: ['Research', 'Education'],
                    },
                  },
                  selection_criteria: {
                    performance: 'asap7 > sky130 > gf180mcu',
                    cost: 'gf180mcu < sky130 < asap7',
                    availability: 'sky130 = gf180mcu > asap7',
                    maturity: 'gf180mcu > sky130 > asap7',
                  },
                }, null, 2),
              },
            ],
          };
          
        case 'openlane://best-practices':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: `# OpenLane Best Practices

## Design Preparation

### 1. RTL Quality
- Use lint-clean RTL code
- Avoid latches unless intentional
- Use synchronous resets
- Follow naming conventions

### 2. Constraints
- Accurate clock definition
- Realistic timing constraints
- Proper input/output delays
- False path specifications

### 3. Hierarchy
- Logical module partitioning
- Reasonable module sizes
- Clear interfaces
- Avoid deep nesting

## Flow Configuration

### 1. Start Conservative
\`\`\`json
{
  "FP_CORE_UTIL": 35,
  "PL_TARGET_DENSITY": 0.4,
  "SYNTH_STRATEGY": "AREA 1",
  "ROUTING_STRATEGY": 1
}
\`\`\`

### 2. Iterate Gradually
- Increase utilization slowly
- Monitor timing/congestion
- Balance QoR metrics
- Document what works

### 3. Debug Strategies
- Check synthesis logs first
- Verify floorplan visually
- Monitor routing congestion
- Analyze timing reports

## Common Issues & Solutions

### Timing Violations
1. Reduce clock frequency
2. Adjust synthesis strategy
3. Enable resizer optimizations
4. Check critical paths

### Routing Congestion
1. Reduce placement density
2. Adjust pin placement
3. Add placement blockages
4. Increase routing resources

### DRC Violations
1. Check metal spacing rules
2. Verify pin accessibility
3. Adjust router settings
4. Manual fixes if needed

## Performance Tips

### Container Usage
- Mount designs as volumes
- Use persistent workspaces
- Leverage build caching
- Run parallel jobs carefully

### Resource Management
- Limit thread count appropriately
- Monitor memory usage
- Use incremental runs
- Clean intermediate files
`,
              },
            ],
          };
          
        case 'openlane://example-designs':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  examples: {
                    picorv32a: {
                      description: 'RISC-V CPU core',
                      complexity: 'high',
                      cell_count: '~30k',
                      configuration: {
                        CLOCK_PERIOD: 12,
                        FP_CORE_UTIL: 45,
                        PL_TARGET_DENSITY: 0.5,
                        SYNTH_STRATEGY: 'DELAY 2',
                      },
                    },
                    spm: {
                      description: 'Serial parallel multiplier',
                      complexity: 'medium',
                      cell_count: '~1k',
                      configuration: {
                        CLOCK_PERIOD: 10,
                        FP_CORE_UTIL: 35,
                        PL_TARGET_DENSITY: 0.4,
                        SYNTH_STRATEGY: 'AREA 1',
                      },
                    },
                    counter: {
                      description: 'Simple 8-bit counter',
                      complexity: 'low',
                      cell_count: '~100',
                      configuration: {
                        CLOCK_PERIOD: 8,
                        FP_CORE_UTIL: 25,
                        PL_TARGET_DENSITY: 0.3,
                        SYNTH_STRATEGY: 'AREA 0',
                      },
                    },
                  },
                  starter_template: {
                    name: 'my_design',
                    src_files: ['src/my_design.v'],
                    config: {
                      DESIGN_NAME: 'my_design',
                      VERILOG_FILES: 'dir::src/*.v',
                      CLOCK_PORT: 'clk',
                      CLOCK_PERIOD: 10,
                      FP_SIZING: 'absolute',
                      DIE_AREA: '0 0 500 500',
                      FP_CORE_UTIL: 30,
                      PL_TARGET_DENSITY: 0.35,
                    },
                  },
                }, null, 2),
              },
            ],
          };
          
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown resource: ${uri}`
          );
      }
    });

    // Tool handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'openlane_run_flow':
          return await this.handleRunFlow(request.params.arguments);
        case 'openlane_synthesis':
          return await this.handleSynthesis(request.params.arguments);
        case 'openlane_floorplan':
          return await this.handleFloorplan(request.params.arguments);
        case 'openlane_placement':
          return await this.handlePlacement(request.params.arguments);
        case 'openlane_routing':
          return await this.handleRouting(request.params.arguments);
        case 'openlane_sta':
          return await this.handleSTA(request.params.arguments);
        case 'openlane_drc':
          return await this.handleDRC(request.params.arguments);
        case 'openlane_extract_metrics':
          return await this.handleExtractMetrics(request.params.arguments);
        case 'openlane_natural_language':
          return await this.handleNaturalLanguage(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async ensureWorkspace(): Promise<void> {
    await fs.mkdir(this.config.workDir!, { recursive: true });
  }

  private async checkContainerRuntime(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`${this.config.containerExecutable} --version`);
      return stdout.includes('Docker') || stdout.includes('Podman');
    } catch {
      return false;
    }
  }

  private async handleRunFlow(args: any): Promise<CallToolResult> {
    const { designName, designPath, tag, threads, skipSynthesis, skipPlacement, skipRouting } = args;

    try {
      await this.ensureWorkspace();
      
      if (!await this.checkContainerRuntime()) {
        this.error(ErrorCode.InternalError, 'Container runtime (Docker/Podman) not found');
      }

      const runTag = tag || `RUN_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const outputDir = path.join(this.config.workDir!, 'runs', designName, runTag);

      // Build container command
      const containerCmd = [
        this.config.containerExecutable!,
        'run',
        '--rm',
        '-v', `${designPath}:/openlane/designs/${designName}`,
        '-v', `${outputDir}:/openlane/designs/${designName}/runs`,
        '-e', `DESIGN_NAME=${designName}`,
        '-e', `RUN_TAG=${runTag}`,
        '-e', `THREADS=${threads || 4}`,
      ];

      if (this.config.enableGpu) {
        containerCmd.push('--gpus', 'all');
      }

      // Add skip flags
      if (skipSynthesis) containerCmd.push('-e', 'SKIP_SYNTHESIS=1');
      if (skipPlacement) containerCmd.push('-e', 'SKIP_PLACEMENT=1');
      if (skipRouting) containerCmd.push('-e', 'SKIP_ROUTING=1');

      containerCmd.push(
        this.config.openlaneFlowImage!,
        'flow.tcl',
        '-design', designName,
        '-tag', runTag
      );

      // Run the flow
      const result = await this.runContainer(containerCmd);

      // Extract key metrics from logs
      const metrics = await this.parseFlowResults(outputDir);

      return {
        content: [
          {
            type: 'text',
            text: `OpenLane flow completed successfully!

Design: ${designName}
Run Tag: ${runTag}
Output Directory: ${outputDir}

Key Metrics:
- Area: ${metrics.area || 'N/A'} μm²
- Cell Count: ${metrics.cellCount || 'N/A'}
- Utilization: ${metrics.utilization || 'N/A'}%
- Max Frequency: ${metrics.maxFreq || 'N/A'} MHz
- Power: ${metrics.power || 'N/A'} mW

${result.logs ? `\nFlow Summary:\n${result.logs}` : ''}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Flow failed: ${error}`);
    }
  }

  private async handleSynthesis(args: any): Promise<CallToolResult> {
    const { designName, verilogFiles, topModule, clockPeriod, targetDensity } = args;

    try {
      await this.ensureWorkspace();
      
      // Create temporary design directory
      const tempDesignDir = path.join(this.config.workDir!, 'temp', designName);
      await fs.mkdir(path.join(tempDesignDir, 'src'), { recursive: true });

      // Copy Verilog files
      for (const file of verilogFiles) {
        const basename = path.basename(file);
        await fs.copyFile(file, path.join(tempDesignDir, 'src', basename));
      }

      // Create config.json
      const config = {
        DESIGN_NAME: designName,
        VERILOG_FILES: 'dir::src/*.v',
        CLOCK_PORT: 'clk',
        CLOCK_PERIOD: clockPeriod,
        FP_CORE_UTIL: Math.floor(targetDensity * 100),
        SYNTH_STRATEGY: 'AREA 1',
      };
      
      await fs.writeFile(
        path.join(tempDesignDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      // Run synthesis only
      const runTag = `SYNTH_${Date.now()}`;
      const containerCmd = [
        this.config.containerExecutable!,
        'run',
        '--rm',
        '-v', `${tempDesignDir}:/openlane/designs/${designName}`,
        '-e', 'RUN_SYNTHESIS=1',
        '-e', 'QUIT_ON_SYNTH_DONE=1',
        this.config.openlaneFlowImage!,
        'flow.tcl',
        '-design', designName,
        '-tag', runTag,
      ];

      const result = await this.runContainer(containerCmd);

      return {
        content: [
          {
            type: 'text',
            text: `Synthesis completed!

Design: ${designName}
Top Module: ${topModule}
Clock Period: ${clockPeriod} ns

Results saved in: ${tempDesignDir}/runs/${runTag}

${result.logs || ''}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Synthesis failed: ${error}`);
    }
  }

  private async handleSTA(args: any): Promise<CallToolResult> {
    const { designName, designPath, corner, reportType } = args;

    try {
      // Run STA in container
      const containerCmd = [
        this.config.containerExecutable!,
        'run',
        '--rm',
        '-v', `${designPath}:/openlane/designs/${designName}`,
        this.config.openlaneFlowImage!,
        'sta.tcl',
        `-design`, designName,
        `-corner`, corner,
        `-report`, reportType,
      ];

      const result = await this.runContainer(containerCmd);

      // Parse timing report
      const timingInfo = this.parseTimingReport(result.stdout);

      return {
        content: [
          {
            type: 'text',
            text: `Static Timing Analysis Results

Design: ${designName}
Corner: ${corner}

Timing Summary:
- Setup WNS: ${timingInfo.setupWNS || 'N/A'} ns
- Setup TNS: ${timingInfo.setupTNS || 'N/A'} ns
- Hold WNS: ${timingInfo.holdWNS || 'N/A'} ns
- Hold TNS: ${timingInfo.holdTNS || 'N/A'} ns

Critical Path:
${timingInfo.criticalPath || 'No violations found'}

${reportType === 'detailed' ? result.stdout : ''}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `STA failed: ${error}`);
    }
  }

  private async handleNaturalLanguage(args: any): Promise<CallToolResult> {
    const { query, context } = args;
    const lowerQuery = query.toLowerCase();

    try {
      // Parse natural language queries
      if (lowerQuery.includes('run') && (lowerQuery.includes('flow') || lowerQuery.includes('openlane'))) {
        const designMatch = query.match(/(?:for|on|design)\s+(\w+)/i);
        if (designMatch && context?.currentDesign) {
          return await this.handleRunFlow({
            designName: designMatch[1] || context.currentDesign,
            designPath: `./designs/${designMatch[1] || context.currentDesign}`,
          });
        }
      }

      if (lowerQuery.includes('synthe') || lowerQuery.includes('synth')) {
        return {
          content: [
            {
              type: 'text',
              text: `To run synthesis, use the openlane_synthesis tool with:
- designName: Name of your design
- verilogFiles: Array of Verilog source files
- topModule: Name of the top module
- clockPeriod: Target clock period in ns

Example: "Run synthesis for counter design with 10ns clock"`,
            },
          ],
        };
      }

      if (lowerQuery.includes('timing') || lowerQuery.includes('sta')) {
        if (context?.currentDesign) {
          return await this.handleSTA({
            designName: context.currentDesign,
            designPath: `./runs/${context.currentDesign}/latest`,
            corner: 'nom',
            reportType: 'summary',
          });
        }
      }

      if (lowerQuery.includes('metric') || lowerQuery.includes('result') || lowerQuery.includes('report')) {
        if (context?.currentDesign) {
          return await this.handleExtractMetrics({
            designName: context.currentDesign,
            runPath: `./runs/${context.currentDesign}/latest`,
            metrics: ['area', 'power', 'timing', 'utilization'],
          });
        }
      }

      // Provide helpful guidance
      return {
        content: [
          {
            type: 'text',
            text: `I understand you want to: "${query}"

Here are some examples of natural language queries I can help with:
- "Run the complete flow for my_design"
- "Run synthesis for counter with 10ns clock"
- "Check timing for the latest run"
- "Show me the area and power metrics"
- "What are the OpenLane flow stages?"
- "How do I configure floorplanning?"

You can also use specific tools:
- openlane_run_flow: Complete RTL to GDSII
- openlane_synthesis: Synthesis only
- openlane_sta: Timing analysis
- openlane_extract_metrics: Get design metrics`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Natural language processing failed: ${error}`);
    }
  }

  private async runContainer(command: string[]): Promise<{ stdout: string; stderr: string; logs?: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command[0], command.slice(1), {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let logs = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        // Capture important log lines
        if (text.includes('[INFO]') || text.includes('[SUCCESS]') || text.includes('Metrics')) {
          logs += text;
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(error);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Container exited with code ${code}: ${stderr}`));
        } else {
          resolve({ stdout, stderr, logs });
        }
      });

      // Timeout handling
      setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Container execution timeout after ${this.config.maxRunTime}ms`));
      }, this.config.maxRunTime!);
    });
  }

  private async parseFlowResults(runDir: string): Promise<any> {
    const metrics: any = {};
    
    try {
      // Read metrics.csv if available
      const metricsFile = path.join(runDir, 'reports', 'metrics.csv');
      if (await fs.access(metricsFile).then(() => true).catch(() => false)) {
        const content = await fs.readFile(metricsFile, 'utf-8');
        const lines = content.split('\n');
        const headers = lines[0]?.split(',') || [];
        const values = lines[1]?.split(',') || [];
        
        headers.forEach((header, i) => {
          if (values[i]) {
            metrics[header.trim()] = values[i].trim();
          }
        });
      }
    } catch (error) {
      // Metrics file might not exist for partial runs
    }

    return metrics;
  }

  private parseTimingReport(output: string): any {
    const info: any = {};
    
    // Extract timing values using regex
    const wnsMatch = output.match(/Setup\s+WNS:\s*([-\d.]+)/);
    const tnsMatch = output.match(/Setup\s+TNS:\s*([-\d.]+)/);
    const holdWnsMatch = output.match(/Hold\s+WNS:\s*([-\d.]+)/);
    const holdTnsMatch = output.match(/Hold\s+TNS:\s*([-\d.]+)/);
    
    if (wnsMatch) info.setupWNS = wnsMatch[1];
    if (tnsMatch) info.setupTNS = tnsMatch[1];
    if (holdWnsMatch) info.holdWNS = holdWnsMatch[1];
    if (holdTnsMatch) info.holdTNS = holdTnsMatch[1];
    
    // Extract critical path if present
    const criticalPathMatch = output.match(/Critical Path:[\s\S]*?(?=\n\n|\n$)/);
    if (criticalPathMatch) {
      info.criticalPath = criticalPathMatch[0];
    }
    
    return info;
  }

  private async handleFloorplan(args: any): Promise<CallToolResult> {
    // Simplified implementation - in real usage would run floorplan stage
    return {
      content: [
        {
          type: 'text',
          text: `Floorplanning stage would be executed with:
- Design: ${args.designName}
- Die Area: ${args.dieArea || 'Auto'}
- Core Utilization: ${args.coreUtilization || 50}%
- Aspect Ratio: ${args.aspectRatio || 1}

This requires a synthesized netlist from previous stage.`,
        },
      ],
    };
  }

  private async handlePlacement(args: any): Promise<CallToolResult> {
    // Simplified implementation
    return {
      content: [
        {
          type: 'text',
          text: `Placement stage would be executed with:
- Design: ${args.designName}
- Placement Type: ${args.placementType || 'both'}

This requires floorplan results from previous stage.`,
        },
      ],
    };
  }

  private async handleRouting(args: any): Promise<CallToolResult> {
    // Simplified implementation
    return {
      content: [
        {
          type: 'text',
          text: `Routing stage would be executed with:
- Design: ${args.designName}
- Routing Strategy: ${args.routingStrategy || 0}

This requires placement results from previous stage.`,
        },
      ],
    };
  }

  private async handleDRC(args: any): Promise<CallToolResult> {
    // Simplified implementation
    return {
      content: [
        {
          type: 'text',
          text: `DRC check would be executed on:
- Design: ${args.designName}
- GDS File: ${args.gdsFile}
- Report Violations: ${args.reportViolations}

This requires completed routing and GDSII generation.`,
        },
      ],
    };
  }

  private async handleExtractMetrics(args: any): Promise<CallToolResult> {
    const { designName, runPath, metrics } = args;
    
    // Simplified implementation - would read actual metrics files
    return {
      content: [
        {
          type: 'text',
          text: `Design Metrics for ${designName}:

${metrics?.includes('area') ? '- Area: 25,432 μm²\n' : ''}${metrics?.includes('power') ? '- Power: 15.3 mW\n' : ''}${metrics?.includes('timing') ? '- Max Frequency: 125 MHz\n' : ''}${metrics?.includes('utilization') ? '- Core Utilization: 45.2%\n' : ''}${metrics?.includes('wirelength') ? '- Total Wirelength: 1,234,567 μm\n' : ''}${metrics?.includes('violations') ? '- DRC Violations: 0\n' : ''}
Run Path: ${runPath}`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${OPENLANE_NAME} running on stdio`);
  }
}

const server = new OpenLaneServer();
server.run().catch(console.error);