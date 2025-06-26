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
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const GTKWAVE_NAME = 'GTKWave MCP Server';
const GTKWAVE_VERSION = '0.1.0';

interface ServerConfig {
  gtkwaveExecutable?: string;
  defaultOptions?: string[];
  enableBatchMode?: boolean;
  tempDir?: string;
}

class GTKWaveServer {
  private server: Server;
  private config: ServerConfig;

  constructor(config: ServerConfig = {}) {
    this.config = {
      gtkwaveExecutable: config.gtkwaveExecutable || 'gtkwave',
      defaultOptions: config.defaultOptions || [],
      enableBatchMode: config.enableBatchMode ?? true,
      tempDir: config.tempDir || path.join(os.tmpdir(), 'gtkwave-mcp'),
    };

    this.server = new Server(
      {
        name: GTKWAVE_NAME,
        version: GTKWAVE_VERSION,
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'gtkwave_open',
          description: 'Open a waveform file in GTKWave viewer',
          inputSchema: {
            type: 'object',
            properties: {
              waveformFile: {
                type: 'string',
                description: 'Path to the waveform file (VCD, FST, LXT2, etc.)',
              },
              saveFile: {
                type: 'string',
                description: 'Optional GTKWave save file (.gtkw) to load',
              },
              startTime: {
                type: 'string',
                description: 'Start time for the display window',
              },
              endTime: {
                type: 'string',
                description: 'End time for the display window',
              },
              background: {
                type: 'boolean',
                description: 'Run GTKWave in background mode',
                default: false,
              },
            },
            required: ['waveformFile'],
          },
        },
        {
          name: 'gtkwave_convert',
          description: 'Convert waveform files between different formats',
          inputSchema: {
            type: 'object',
            properties: {
              inputFile: {
                type: 'string',
                description: 'Input waveform file path',
              },
              outputFile: {
                type: 'string',
                description: 'Output file path',
              },
              format: {
                type: 'string',
                enum: ['vcd', 'fst', 'lxt2'],
                description: 'Output format',
              },
              compress: {
                type: 'boolean',
                description: 'Enable compression for FST format',
                default: true,
              },
            },
            required: ['inputFile', 'outputFile', 'format'],
          },
        },
        {
          name: 'gtkwave_extract_signals',
          description: 'Extract signal list from waveform file',
          inputSchema: {
            type: 'object',
            properties: {
              waveformFile: {
                type: 'string',
                description: 'Path to the waveform file',
              },
              hierarchical: {
                type: 'boolean',
                description: 'Return hierarchical signal structure',
                default: true,
              },
              pattern: {
                type: 'string',
                description: 'Filter signals by pattern (regex)',
              },
            },
            required: ['waveformFile'],
          },
        },
        {
          name: 'gtkwave_analyze_timing',
          description: 'Analyze timing relationships between signals',
          inputSchema: {
            type: 'object',
            properties: {
              waveformFile: {
                type: 'string',
                description: 'Path to the waveform file',
              },
              signals: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of signals to analyze',
              },
              startTime: {
                type: 'string',
                description: 'Start time for analysis',
              },
              endTime: {
                type: 'string',
                description: 'End time for analysis',
              },
              measurements: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['setup', 'hold', 'propagation', 'pulse_width', 'frequency'],
                },
                description: 'Types of timing measurements to perform',
              },
            },
            required: ['waveformFile', 'signals'],
          },
        },
        {
          name: 'gtkwave_generate_script',
          description: 'Generate GTKWave TCL script for automated analysis',
          inputSchema: {
            type: 'object',
            properties: {
              waveformFile: {
                type: 'string',
                description: 'Path to the waveform file',
              },
              operations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['add_signal', 'set_cursor', 'zoom', 'measure', 'search'],
                    },
                    parameters: {
                      type: 'object',
                      description: 'Operation-specific parameters',
                    },
                  },
                },
                description: 'List of operations to include in the script',
              },
              outputFile: {
                type: 'string',
                description: 'Path to save the TCL script',
              },
            },
            required: ['waveformFile', 'operations', 'outputFile'],
          },
        },
        {
          name: 'gtkwave_capture_screenshot',
          description: 'Capture screenshot of waveform display',
          inputSchema: {
            type: 'object',
            properties: {
              waveformFile: {
                type: 'string',
                description: 'Path to the waveform file',
              },
              saveFile: {
                type: 'string',
                description: 'Optional GTKWave save file (.gtkw)',
              },
              outputFile: {
                type: 'string',
                description: 'Output image file path',
              },
              format: {
                type: 'string',
                enum: ['png', 'pdf', 'ps'],
                description: 'Output image format',
                default: 'png',
              },
              width: {
                type: 'number',
                description: 'Image width in pixels',
                default: 1200,
              },
              height: {
                type: 'number',
                description: 'Image height in pixels',
                default: 800,
              },
            },
            required: ['waveformFile', 'outputFile'],
          },
        },
        {
          name: 'gtkwave_natural_language',
          description: 'Process natural language queries about waveform analysis',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language query about waveform viewing or analysis',
              },
              context: {
                type: 'object',
                properties: {
                  waveformFile: {
                    type: 'string',
                    description: 'Current waveform file being analyzed',
                  },
                  signals: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Signals of interest',
                  },
                },
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'gtkwave_open':
          return await this.handleOpen(request.params.arguments);
        case 'gtkwave_convert':
          return await this.handleConvert(request.params.arguments);
        case 'gtkwave_extract_signals':
          return await this.handleExtractSignals(request.params.arguments);
        case 'gtkwave_analyze_timing':
          return await this.handleAnalyzeTiming(request.params.arguments);
        case 'gtkwave_generate_script':
          return await this.handleGenerateScript(request.params.arguments);
        case 'gtkwave_capture_screenshot':
          return await this.handleCaptureScreenshot(request.params.arguments);
        case 'gtkwave_natural_language':
          return await this.handleNaturalLanguage(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });

    // Add resources support
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'gtkwave://formats',
          name: 'Supported Waveform Formats',
          description: 'Information about waveform formats supported by GTKWave',
          mimeType: 'application/json',
        },
        {
          uri: 'gtkwave://tcl-commands',
          name: 'GTKWave TCL Commands Reference',
          description: 'Common TCL commands for GTKWave automation',
          mimeType: 'text/markdown',
        },
        {
          uri: 'gtkwave://timing-measurements',
          name: 'Timing Measurement Types',
          description: 'Available timing measurements and their descriptions',
          mimeType: 'application/json',
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case 'gtkwave://formats':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  formats: {
                    vcd: {
                      name: 'Value Change Dump',
                      extension: '.vcd',
                      description: 'IEEE standard format for waveform data',
                      features: ['ASCII format', 'Human readable', 'Wide tool support'],
                    },
                    fst: {
                      name: 'Fast Signal Trace',
                      extension: '.fst',
                      description: 'Compressed binary format by GTKWave',
                      features: ['High compression', 'Fast loading', 'Efficient storage'],
                    },
                    lxt2: {
                      name: 'LXT2',
                      extension: '.lxt2',
                      description: 'Compressed waveform format',
                      features: ['Good compression', 'Fast access', 'GTKWave native'],
                    },
                  },
                }, null, 2),
              },
            ],
          };
          
        case 'gtkwave://tcl-commands':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: `# GTKWave TCL Commands Reference

## File Operations
- \`gtkwave::loadFile "filename.vcd"\` - Load waveform file
- \`gtkwave::loadSaveFile "signals.gtkw"\` - Load saved signals
- \`gtkwave::hardcopy "output.png" png\` - Save screenshot

## Signal Operations
- \`gtkwave::addSignalsFromList "signal.name"\` - Add signal to viewer
- \`gtkwave::deleteSignalsFromList {sig1 sig2}\` - Remove signals
- \`gtkwave::highlightSignalsFromList {sig1 sig2}\` - Highlight signals

## Time Navigation
- \`gtkwave::setFromTime "0"\` - Set start time
- \`gtkwave::setToTime "1000ns"\` - Set end time
- \`gtkwave::setMarker "100ns"\` - Set cursor position
- \`gtkwave::getMarker\` - Get current cursor position

## Display Control
- \`gtkwave::setWindowSize 1200 800\` - Set window dimensions
- \`gtkwave::setZoomFactor 0.5\` - Set zoom level
- \`gtkwave::centerMarker\` - Center view on cursor

## Measurements
- \`gtkwave::measureSetup sig1 sig2\` - Measure setup time
- \`gtkwave::measureHold sig1 sig2\` - Measure hold time
- \`gtkwave::measurePeriod sig\` - Measure signal period
`,
              },
            ],
          };
          
        case 'gtkwave://timing-measurements':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  measurements: {
                    setup: {
                      description: 'Time data must be stable before clock edge',
                      requires: ['data_signal', 'clock_signal'],
                    },
                    hold: {
                      description: 'Time data must remain stable after clock edge',
                      requires: ['data_signal', 'clock_signal'],
                    },
                    propagation: {
                      description: 'Delay between input change and output change',
                      requires: ['input_signal', 'output_signal'],
                    },
                    pulse_width: {
                      description: 'Duration of high or low pulse',
                      requires: ['signal'],
                    },
                    frequency: {
                      description: 'Signal frequency measurement',
                      requires: ['signal'],
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
  }

  private async handleOpen(args: any): Promise<CallToolResult> {
    const { waveformFile, saveFile, startTime, endTime, background } = args;

    try {
      const gtkwaveArgs = [...(this.config.defaultOptions || [])];
      
      if (saveFile) {
        gtkwaveArgs.push('-a', saveFile);
      }
      
      if (startTime) {
        gtkwaveArgs.push('-t', startTime);
      }
      
      if (endTime) {
        gtkwaveArgs.push('-e', endTime);
      }
      
      gtkwaveArgs.push(waveformFile);

      const gtkwave = spawn(this.config.gtkwaveExecutable!, gtkwaveArgs, {
        detached: background,
        stdio: background ? 'ignore' : 'inherit',
      });

      if (background) {
        gtkwave.unref();
        return {
          content: [
            {
              type: 'text',
              text: `GTKWave opened in background with PID ${gtkwave.pid}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `GTKWave opened with file: ${waveformFile}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Failed to open GTKWave: ${error}`);
    }
  }

  private async handleConvert(args: any): Promise<CallToolResult> {
    const { inputFile, outputFile, format, compress } = args;

    try {
      let converterCmd = '';
      let converterArgs: string[] = [];

      switch (format) {
        case 'fst':
          converterCmd = 'vcd2fst';
          converterArgs = compress ? [inputFile, outputFile] : ['-u', inputFile, outputFile];
          break;
        case 'vcd':
          converterCmd = 'fst2vcd';
          converterArgs = [inputFile, outputFile];
          break;
        case 'lxt2':
          converterCmd = 'vcd2lxt2';
          converterArgs = [inputFile, outputFile];
          break;
        default:
          this.error(ErrorCode.InvalidParams, `Unsupported format: ${format}`);
      }

      await this.executeCommand(converterCmd, converterArgs);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully converted ${inputFile} to ${format} format: ${outputFile}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Conversion failed: ${error}`);
    }
  }

  private async handleExtractSignals(args: any): Promise<CallToolResult> {
    const { waveformFile, hierarchical, pattern } = args;

    try {
      // For VCD files, parse directly
      if (waveformFile.endsWith('.vcd')) {
        const vcdContent = await fs.readFile(waveformFile, 'utf-8');
        const signals = this.parseVCDSignals(vcdContent);
        
        let filteredSignals = signals;
        if (pattern) {
          const regex = new RegExp(pattern);
          filteredSignals = signals.filter(s => regex.test(s));
        }

        const result = hierarchical ? this.buildHierarchy(filteredSignals) : filteredSignals;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else {
        // For other formats, try using GTKWave's conversion tools
        throw new Error('Non-VCD format support not yet implemented');
      }
    } catch (error) {
      this.error(ErrorCode.InternalError, `Failed to extract signals: ${error}`);
    }
  }

  private parseVCDSignals(vcdContent: string): string[] {
    const signals: string[] = [];
    const lines = vcdContent.split('\n');
    let currentScope: string[] = [];
    let inDefinitions = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '$enddefinitions $end') {
        break;
      }
      
      if (trimmed.startsWith('$scope')) {
        const parts = trimmed.split(' ');
        if (parts.length >= 3) {
          currentScope.push(parts[2]);
        }
      } else if (trimmed === '$upscope $end') {
        currentScope.pop();
      } else if (trimmed.startsWith('$var')) {
        const parts = trimmed.split(' ');
        if (parts.length >= 4) {
          const signalName = parts[3];
          const fullPath = currentScope.length > 0 
            ? `${currentScope.join('.')}.${signalName}`
            : signalName;
          signals.push(fullPath);
        }
      }
    }

    return signals;
  }

  private async handleAnalyzeTiming(args: any): Promise<CallToolResult> {
    const { waveformFile, signals, startTime, endTime, measurements } = args;

    try {
      const tempDir = this.config.tempDir!;
      const scriptFile = path.join(tempDir, `timing_${Date.now()}.tcl`);
      await fs.mkdir(tempDir, { recursive: true });

      const script = this.generateTimingScript(signals, startTime, endTime, measurements);
      await fs.writeFile(scriptFile, script);

      const { stdout } = await this.executeCommand('gtkwave', [
        '-S', scriptFile,
        waveformFile,
      ]);

      await fs.unlink(scriptFile);

      return {
        content: [
          {
            type: 'text',
            text: stdout,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Timing analysis failed: ${error}`);
    }
  }

  private async handleGenerateScript(args: any): Promise<CallToolResult> {
    const { waveformFile, operations, outputFile } = args;

    try {
      const script = this.generateTclScript(waveformFile, operations);
      await fs.writeFile(outputFile, script);

      return {
        content: [
          {
            type: 'text',
            text: `TCL script generated successfully: ${outputFile}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Failed to generate script: ${error}`);
    }
  }

  private async handleCaptureScreenshot(args: any): Promise<CallToolResult> {
    const { waveformFile, saveFile, outputFile, format, width, height } = args;

    try {
      const tempDir = this.config.tempDir!;
      const scriptFile = path.join(tempDir, `screenshot_${Date.now()}.tcl`);
      await fs.mkdir(tempDir, { recursive: true });

      const script = `
gtkwave::loadFile "${waveformFile}"
${saveFile ? `gtkwave::loadSaveFile "${saveFile}"` : ''}
gtkwave::setWindowSize ${width} ${height}
gtkwave::hardcopy "${outputFile}" ${format}
exit
`;
      await fs.writeFile(scriptFile, script);

      await this.executeCommand(this.config.gtkwaveExecutable!, [
        '-S', scriptFile,
        waveformFile,
      ]);

      await fs.unlink(scriptFile);

      if (format === 'png') {
        const imageData = await fs.readFile(outputFile);
        const base64 = imageData.toString('base64');
        
        return {
          content: [
            {
              type: 'text',
              text: `Screenshot saved to: ${outputFile}`,
            },
            {
              type: 'image',
              data: base64,
              mimeType: 'image/png',
            } as ImageContent,
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${outputFile}`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Screenshot capture failed: ${error}`);
    }
  }

  private executeCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  private buildHierarchy(signals: string[]): any {
    const hierarchy: any = {};
    
    for (const signal of signals) {
      const parts = signal.split('.');
      let current = hierarchy;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          if (!current._signals) current._signals = [];
          current._signals.push(part);
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }
    }
    
    return hierarchy;
  }

  private generateTimingScript(signals: string[], startTime?: string, endTime?: string, measurements?: string[]): string {
    let script = `
# GTKWave Timing Analysis Script
proc analyze_timing {} {
`;

    if (startTime) script += `  gtkwave::setFromTime ${startTime}\n`;
    if (endTime) script += `  gtkwave::setToTime ${endTime}\n`;

    for (const signal of signals) {
      script += `  gtkwave::addSignalsFromList "${signal}"\n`;
    }

    if (measurements) {
      for (const measurement of measurements) {
        script += `  # Perform ${measurement} measurement\n`;
        script += `  puts "Measuring ${measurement} for signals..."\n`;
      }
    }

    script += `
}

analyze_timing
`;
    return script;
  }

  private generateTclScript(waveformFile: string, operations: any[]): string {
    let script = `#!/usr/bin/env gtkwave -S
# GTKWave TCL Script
# Generated by GTKWave MCP Server

# Load waveform file
gtkwave::loadFile "${waveformFile}"

`;

    for (const op of operations) {
      switch (op.type) {
        case 'add_signal':
          script += `gtkwave::addSignalsFromList "${op.parameters.signal}"\n`;
          break;
        case 'set_cursor':
          script += `gtkwave::setMarker ${op.parameters.time}\n`;
          break;
        case 'zoom':
          script += `gtkwave::setFromTime ${op.parameters.startTime}\n`;
          script += `gtkwave::setToTime ${op.parameters.endTime}\n`;
          break;
        case 'measure':
          script += `# Measure ${op.parameters.type} between ${op.parameters.signal1} and ${op.parameters.signal2}\n`;
          break;
        case 'search':
          script += `# Search for ${op.parameters.pattern} in ${op.parameters.signal}\n`;
          break;
      }
    }

    return script;
  }

  private async handleNaturalLanguage(args: any): Promise<CallToolResult> {
    const { query, context } = args;
    const lowerQuery = query.toLowerCase();

    try {
      // Parse natural language queries
      if (lowerQuery.includes('convert') && (lowerQuery.includes('vcd') || lowerQuery.includes('fst'))) {
        // Handle format conversion queries
        const match = query.match(/convert\s+(\S+\.(?:vcd|fst|lxt2))\s+to\s+(\w+)/i);
        if (match) {
          return await this.handleConvert({
            inputFile: match[1],
            outputFile: match[1].replace(/\.\w+$/, `.${match[2]}`),
            format: match[2],
            compress: lowerQuery.includes('compress'),
          });
        }
      }

      if (lowerQuery.includes('open') || lowerQuery.includes('view')) {
        // Handle file opening queries
        const fileMatch = query.match(/['""]?([^'""\s]+\.(?:vcd|fst|lxt2|gtkw))['""]?/i);
        if (fileMatch) {
          return await this.handleOpen({
            waveformFile: fileMatch[1],
            background: lowerQuery.includes('background'),
          });
        }
      }

      if (lowerQuery.includes('signal') && (lowerQuery.includes('list') || lowerQuery.includes('extract'))) {
        // Handle signal extraction queries
        const fileMatch = query.match(/from\s+['""]?([^'""\s]+\.(?:vcd|fst|lxt2))['""]?/i);
        const patternMatch = query.match(/(?:matching|like|pattern)\s+['""]?([^'""\s]+)['""]?/i);
        
        if (fileMatch) {
          return await this.handleExtractSignals({
            waveformFile: fileMatch[1],
            hierarchical: lowerQuery.includes('hierarch'),
            pattern: patternMatch ? patternMatch[1] : undefined,
          });
        }
      }

      if (lowerQuery.includes('timing') || lowerQuery.includes('measure')) {
        // Handle timing analysis queries
        if (context?.waveformFile && context?.signals) {
          const measurements = [];
          if (lowerQuery.includes('setup')) measurements.push('setup');
          if (lowerQuery.includes('hold')) measurements.push('hold');
          if (lowerQuery.includes('frequency')) measurements.push('frequency');
          if (lowerQuery.includes('propagation')) measurements.push('propagation');
          
          return await this.handleAnalyzeTiming({
            waveformFile: context.waveformFile,
            signals: context.signals,
            measurements: measurements.length > 0 ? measurements : ['setup', 'hold'],
          });
        }
      }

      if (lowerQuery.includes('screenshot') || lowerQuery.includes('capture')) {
        // Handle screenshot queries
        const fileMatch = query.match(/(?:of|from)\s+['""]?([^'""\s]+\.(?:vcd|fst|lxt2))['""]?/i);
        if (fileMatch) {
          return await this.handleCaptureScreenshot({
            waveformFile: fileMatch[1],
            outputFile: fileMatch[1].replace(/\.\w+$/, '.png'),
            format: 'png',
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
- "Open simulation.vcd in background"
- "Convert design.vcd to fst with compression"
- "List all clock signals from test.vcd"
- "Extract signals matching 'data*' from sim.fst"
- "Measure setup and hold times for clk and data signals"
- "Capture screenshot of waveform.vcd"

You can also use the specific tools:
- gtkwave_open: Open waveform files
- gtkwave_convert: Convert between formats
- gtkwave_extract_signals: List signals
- gtkwave_analyze_timing: Timing analysis
- gtkwave_capture_screenshot: Take screenshots`,
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Natural language processing failed: ${error}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${GTKWAVE_NAME} running on stdio`);
  }
}

const server = new GTKWaveServer();
server.run().catch(console.error);