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
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleOpen(args: any): Promise<CallToolResult> {
    const { waveformFile, saveFile, startTime, endTime, background } = args;

    try {
      const gtkwaveArgs = [...this.config.defaultOptions];
      
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

      const gtkwave = spawn(this.config.gtkwaveExecutable, gtkwaveArgs, {
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
      const { stdout } = await this.executeCommand('gtkwave', [
        '-f', waveformFile,
        '-L', // List signals
      ]);

      let signals = stdout.split('\n').filter(s => s.trim());
      
      if (pattern) {
        const regex = new RegExp(pattern);
        signals = signals.filter(s => regex.test(s));
      }

      const result = hierarchical ? this.buildHierarchy(signals) : signals;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.error(ErrorCode.InternalError, `Failed to extract signals: ${error}`);
    }
  }

  private async handleAnalyzeTiming(args: any): Promise<CallToolResult> {
    const { waveformFile, signals, startTime, endTime, measurements } = args;

    try {
      const scriptFile = path.join(this.config.tempDir, `timing_${Date.now()}.tcl`);
      await fs.mkdir(this.config.tempDir, { recursive: true });

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
      const scriptFile = path.join(this.config.tempDir, `screenshot_${Date.now()}.tcl`);
      await fs.mkdir(this.config.tempDir, { recursive: true });

      const script = `
gtkwave::loadFile "${waveformFile}"
${saveFile ? `gtkwave::loadSaveFile "${saveFile}"` : ''}
gtkwave::setWindowSize ${width} ${height}
gtkwave::hardcopy "${outputFile}" ${format}
exit
`;
      await fs.writeFile(scriptFile, script);

      await this.executeCommand(this.config.gtkwaveExecutable, [
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${GTKWAVE_NAME} running on stdio`);
  }
}

const server = new GTKWaveServer();
server.run().catch(console.error);