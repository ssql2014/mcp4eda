import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ToolResult, ModuleInfo, TestbenchOptions, TestbenchResult, PortInfo } from '../types/index.js';
import { promises as fs } from 'fs';
import { dirname, join, basename, resolve } from 'path';
import { logger } from '../utils/logger.js';

const TestbenchGeneratorSchema = z.object({
  targetFile: z.string().describe('Verilog file containing the module to test'),
  targetModule: z.string().describe('Module name to generate testbench for'),
  outputFile: z.string().optional().describe('Output testbench file path'),
  template: z.enum(['basic', 'uvm', 'cocotb', 'protocol']).default('basic'),
  protocol: z.enum(['axi', 'apb', 'wishbone', 'avalon', 'custom']).optional(),
  stimulusType: z.enum(['directed', 'random', 'constrained_random', 'sequence']).default('directed'),
  clockPeriod: z.number().default(10).describe('Clock period in time units'),
  resetDuration: z.number().default(100).describe('Reset duration in time units'),
  simulationTime: z.number().default(10000).describe('Total simulation time'),
  generateAssertions: z.boolean().default(true),
  generateCoverage: z.boolean().default(true),
  generateCheckers: z.boolean().default(true),
  parseOnly: z.boolean().default(false).describe('Only parse module, don\'t generate testbench'),
});

type TestbenchGeneratorParams = z.infer<typeof TestbenchGeneratorSchema>;

export class TestbenchGeneratorTool extends AbstractTool<TestbenchGeneratorParams, TestbenchResult> {
  private protocolTemplates: Map<string, any> = new Map();

  constructor(configManager: any, cacheManager: any) {
    super('testbench_generator', 'verilator', configManager, cacheManager, TestbenchGeneratorSchema);
    this.initializeProtocolTemplates();
  }

  getDescription(): string {
    return 'Generate intelligent testbenches for Verilog/SystemVerilog modules with automatic stimulus generation';
  }

  private initializeProtocolTemplates() {
    this.protocolTemplates = new Map();
    
    // AXI protocol template
    this.protocolTemplates.set('axi', {
      signals: {
        clock: 'aclk',
        reset: 'aresetn',
        write_address: ['awaddr', 'awlen', 'awsize', 'awburst', 'awvalid', 'awready'],
        write_data: ['wdata', 'wstrb', 'wlast', 'wvalid', 'wready'],
        write_response: ['bresp', 'bvalid', 'bready'],
        read_address: ['araddr', 'arlen', 'arsize', 'arburst', 'arvalid', 'arready'],
        read_data: ['rdata', 'rresp', 'rlast', 'rvalid', 'rready'],
      },
      resetPolarity: 'active_low',
      transactions: ['write', 'read', 'burst_write', 'burst_read'],
    });

    // APB protocol template
    this.protocolTemplates.set('apb', {
      signals: {
        clock: 'pclk',
        reset: 'presetn',
        control: ['psel', 'penable', 'pwrite'],
        address: 'paddr',
        write_data: 'pwdata',
        read_data: 'prdata',
        response: ['pready', 'pslverr'],
      },
      resetPolarity: 'active_low',
      transactions: ['write', 'read', 'back_to_back'],
    });
  }

  protected async buildArguments(params: TestbenchGeneratorParams): Promise<string[]> {
    // For parsing, we use Verilator in lint mode to extract module information
    return [
      '--lint-only',
      '--quiet',
      '--xml-only',
      '--xml-output', 'module_info.xml',
      params.targetFile,
    ];
  }

  protected async processResult(
    result: any,
    params: TestbenchGeneratorParams
  ): Promise<ToolResult<TestbenchResult>> {
    try {
      // Parse the module to get interface information
      const moduleInfo = await this.parseModule(params.targetFile, params.targetModule);

    if (params.parseOnly) {
      return {
        success: true,
        data: {
          generatedFile: '',
          moduleInfo,
          template: params.template,
          features: [],
        },
      };
    }

    // Generate the testbench
    const testbench = await this.generateTestbench(moduleInfo, params);
    
    // Write to file
    const outputFile = params.outputFile || `tb_${moduleInfo.name}.sv`;
    
    // Ensure output directory exists
    const outputDir = dirname(resolve(outputFile));
    await fs.mkdir(outputDir, { recursive: true });
    
    await fs.writeFile(resolve(outputFile), testbench);

    // Determine features that were generated
    const features: string[] = [];
    if (params.generateAssertions) features.push('assertions');
    if (params.generateCoverage) features.push('coverage');
    if (params.generateCheckers) features.push('checkers');
    if (params.stimulusType === 'random' || params.stimulusType === 'constrained_random') {
      features.push('randomization');
    }
    if (params.protocol) features.push(`${params.protocol}_protocol`);

      return {
        success: true,
        data: {
          generatedFile: outputFile,
          moduleInfo,
          template: params.template,
          features,
        },
      };
    } catch (error) {
      logger.error('Testbench generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async parseModule(file: string, moduleName: string): Promise<ModuleInfo> {
    // For now, use a simple regex-based parser
    // In production, integrate with Verible's parser for accuracy
    const content = await fs.readFile(file, 'utf-8');
    
    const moduleInfo: ModuleInfo = {
      name: moduleName,
      file,
      ports: [],
      parameters: [],
      interfaces: [],
      clockDomains: [],
    };

    // Extract module declaration
    const moduleRegex = new RegExp(
      `module\\s+${moduleName}\\s*(?:#\\s*\\([^)]*\\))?\\s*\\(([^;]+)\\);`,
      'ms'
    );
    const moduleMatch = content.match(moduleRegex);
    
    if (!moduleMatch) {
      throw new Error(`Module ${moduleName} not found in ${file}`);
    }

    // Parse ports
    const portsText = moduleMatch[1];
    moduleInfo.ports = this.parsePorts(portsText);

    // Detect clock domains
    moduleInfo.clockDomains = this.detectClockDomains(moduleInfo.ports);

    // Parse parameters
    const paramRegex = /parameter\s+(?:\w+\s+)?(\w+)\s*=\s*([^,;]+)/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(content)) !== null) {
      moduleInfo.parameters.push({
        name: paramMatch[1],
        type: 'integer', // Simplified - would need better parsing
        defaultValue: paramMatch[2].trim(),
      });
    }

    return moduleInfo;
  }

  private parsePorts(portsText: string): PortInfo[] {
    const ports: PortInfo[] = [];
    
    // Split by comma, handling nested brackets
    const portDeclarations = this.splitPorts(portsText);
    
    for (const portDecl of portDeclarations) {
      const port = this.parsePortDeclaration(portDecl.trim());
      if (port) {
        ports.push(port);
      }
    }

    return ports;
  }

  private splitPorts(portsText: string): string[] {
    const ports: string[] = [];
    let current = '';
    let bracketDepth = 0;

    for (const char of portsText) {
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
      
      if (char === ',' && bracketDepth === 0) {
        ports.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      ports.push(current.trim());
    }

    return ports;
  }

  private parsePortDeclaration(portDecl: string): PortInfo | null {
    // Match port declaration pattern - handle parameterized widths and multiple spaces
    const portRegex = /^\s*(input|output|inout)\s+(wire|reg|logic|bit)?\s*(?:\[([^\]]+)\])?\s+(\w+)(?:\s*\[([^\]]+)\])?/;
    const match = portDecl.match(portRegex);

    if (!match) return null;

    const [, direction, type, widthExpr, name, arrayExpr] = match;

    // Calculate width - handle parameterized expressions like "WIDTH-1:0"
    let width = 1;
    if (widthExpr) {
      if (widthExpr.includes(':')) {
        const [msbExpr, lsbExpr] = widthExpr.split(':');
        // For simple cases like "7:0" or "WIDTH-1:0", assume common widths
        if (msbExpr.includes('WIDTH')) {
          width = 8; // Assume 8-bit for WIDTH-1:0
        } else {
          const msb = parseInt(msbExpr.trim());
          const lsb = parseInt(lsbExpr.trim());
          if (!isNaN(msb) && !isNaN(lsb)) {
            width = Math.abs(msb - lsb) + 1;
          }
        }
      }
    }

    const port: PortInfo = {
      name,
      direction: direction as 'input' | 'output' | 'inout',
      type: (type || 'wire') as any,
      width,
    };

    if (arrayExpr) {
      // Handle array dimensions
      if (arrayExpr.includes(':')) {
        const [msbExpr, lsbExpr] = arrayExpr.split(':');
        const msb = parseInt(msbExpr.trim());
        const lsb = parseInt(lsbExpr.trim());
        if (!isNaN(msb) && !isNaN(lsb)) {
          port.arrayDimensions = [Math.abs(msb - lsb) + 1];
        }
      }
    }

    return port;
  }

  private detectClockDomains(ports: PortInfo[]): any[] {
    const clockDomains: any[] = [];
    
    // Find clock signals
    const clockPorts = ports.filter(p => 
      p.direction === 'input' && 
      (p.name.match(/^(clk|clock|aclk|pclk|sclk)/i) || p.name.match(/(clk|clock)$/i))
    );

    for (const clockPort of clockPorts) {
      // Find associated reset
      const resetPort = ports.find(p =>
        p.direction === 'input' &&
        (p.name.includes('rst') || p.name.includes('reset')) &&
        (p.name.includes(clockPort.name.replace(/clk|clock/i, '')) || 
         clockPort.name.includes(p.name.replace(/rst|reset/i, '')))
      );

      clockDomains.push({
        name: clockPort.name,
        resetSignal: resetPort?.name,
        resetPolarity: resetPort?.name.includes('n') ? 'active_low' : 'active_high',
      });
    }

    return clockDomains;
  }

  private async generateTestbench(
    moduleInfo: ModuleInfo,
    params: TestbenchGeneratorParams
  ): Promise<string> {
    let testbench = '';

    // Header
    testbench += this.generateHeader(moduleInfo, params);

    // Module declaration
    testbench += this.generateModuleDeclaration(moduleInfo, params);

    // Signal declarations
    testbench += this.generateSignalDeclarations(moduleInfo, params);

    // DUT instantiation
    testbench += this.generateDUTInstantiation(moduleInfo, params);

    // Clock generation
    testbench += this.generateClockGeneration(moduleInfo, params);

    // Reset sequence
    testbench += this.generateResetSequence(moduleInfo, params);

    // Stimulus generation
    testbench += this.generateStimulus(moduleInfo, params);

    // Response checking
    if (params.generateCheckers) {
      testbench += this.generateCheckers(moduleInfo, params);
    }

    // Assertions
    if (params.generateAssertions) {
      testbench += this.generateAssertions(moduleInfo, params);
    }

    // Coverage
    if (params.generateCoverage) {
      testbench += this.generateCoverage(moduleInfo, params);
    }

    // Waveform dumping
    testbench += this.generateWaveformDumping(moduleInfo, params);

    // End module
    testbench += '\nendmodule\n';

    return testbench;
  }

  private generateHeader(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    return `// Testbench for ${moduleInfo.name}
// Generated by Verilator MCP
// Template: ${params.template}
// Stimulus Type: ${params.stimulusType}

\`timescale 1ns/1ps

`;
  }

  private generateModuleDeclaration(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    return `module tb_${moduleInfo.name}();

`;
  }

  private generateSignalDeclarations(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let signals = '  // Testbench signals\n';

    // Declare signals for each port
    for (const port of moduleInfo.ports) {
      const signalType = port.direction === 'input' ? 'reg' : 'wire';
      const width = port.width > 1 ? `[${port.width - 1}:0] ` : '';
      const array = port.arrayDimensions ? `[${port.arrayDimensions[0] - 1}:0]` : '';
      signals += `  ${signalType} ${width}${port.name}${array};\n`;
    }

    // Add testbench control signals
    signals += '\n  // Testbench control\n';
    signals += '  integer error_count = 0;\n';
    signals += '  integer test_count = 0;\n';
    
    if (params.stimulusType === 'random' || params.stimulusType === 'constrained_random') {
      signals += '  integer seed = 12345;\n';
    }

    signals += '\n';
    return signals;
  }

  private generateDUTInstantiation(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let inst = `  // DUT instantiation\n`;
    inst += `  ${moduleInfo.name} dut (\n`;

    const portConnections = moduleInfo.ports.map((port, index) => {
      const comma = index < moduleInfo.ports.length - 1 ? ',' : '';
      return `    .${port.name}(${port.name})${comma}`;
    }).join('\n');

    inst += portConnections;
    inst += '\n  );\n\n';

    return inst;
  }

  private generateClockGeneration(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let clocks = '  // Clock generation\n';

    for (const clockDomain of (moduleInfo.clockDomains || [])) {
      clocks += `  initial ${clockDomain.name} = 0;\n`;
      clocks += `  always #(${params.clockPeriod / 2}) ${clockDomain.name} = ~${clockDomain.name};\n\n`;
    }

    return clocks;
  }

  private generateResetSequence(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let reset = '  // Reset sequence\n';
    reset += '  initial begin\n';

    for (const clockDomain of (moduleInfo.clockDomains || [])) {
      if (clockDomain.resetSignal) {
        const activeValue = clockDomain.resetPolarity === 'active_low' ? '0' : '1';
        const inactiveValue = clockDomain.resetPolarity === 'active_low' ? '1' : '0';
        
        reset += `    ${clockDomain.resetSignal} = ${activeValue};\n`;
        reset += `    #${params.resetDuration};\n`;
        reset += `    ${clockDomain.resetSignal} = ${inactiveValue};\n`;
      }
    }

    reset += '  end\n\n';
    return reset;
  }

  private generateStimulus(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let stimulus = '  // Stimulus generation\n';
    stimulus += '  initial begin\n';
    stimulus += `    // Wait for reset\n`;
    stimulus += `    #${params.resetDuration + 10};\n\n`;

    if (params.protocol && this.protocolTemplates.has(params.protocol)) {
      stimulus += this.generateProtocolStimulus(moduleInfo, params);
    } else {
      stimulus += this.generateGenericStimulus(moduleInfo, params);
    }

    stimulus += '\n    // End simulation\n';
    stimulus += `    #${params.simulationTime};\n`;
    stimulus += '    $display("Simulation completed. Errors: %d, Tests: %d", error_count, test_count);\n';
    stimulus += '    $finish;\n';
    stimulus += '  end\n\n';

    return stimulus;
  }

  private generateProtocolStimulus(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    const protocol = this.protocolTemplates.get(params.protocol!);
    let stimulus = `    // ${params.protocol?.toUpperCase()} Protocol Transactions\n`;

    // Generate protocol-specific transactions
    if (params.protocol === 'axi') {
      stimulus += '    // AXI Write Transaction\n';
      stimulus += '    axi_write(32\'h1000, 32\'hDEADBEEF);\n';
      stimulus += '    // AXI Read Transaction\n';
      stimulus += '    axi_read(32\'h1000);\n';
    } else if (params.protocol === 'apb') {
      stimulus += '    // APB Write Transaction\n';
      stimulus += '    apb_write(32\'h100, 32\'h12345678);\n';
      stimulus += '    // APB Read Transaction\n';
      stimulus += '    apb_read(32\'h100);\n';
    }

    return stimulus;
  }

  private generateGenericStimulus(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let stimulus = '';

    const inputPorts = moduleInfo.ports.filter(p => 
      p.direction === 'input' && 
      !(moduleInfo.clockDomains || []).some(cd => cd.name === p.name || cd.resetSignal === p.name)
    );

    if (params.stimulusType === 'directed') {
      stimulus += '    // Directed test cases\n';
      for (let i = 0; i < 5; i++) {
        stimulus += `    // Test case ${i + 1}\n`;
        for (const port of inputPorts) {
          let value: string;
          if (port.width === 1) {
            value = (i % 2).toString(); // Alternate 0,1 for 1-bit signals
          } else if (port.width <= 4) {
            value = i.toString();
          } else {
            value = `${port.width}'h${i.toString(16)}`;
          }
          stimulus += `    ${port.name} = ${value};\n`;
        }
        stimulus += '    #100;\n';
        stimulus += '    test_count++;\n\n';
      }
    } else if (params.stimulusType === 'random' || params.stimulusType === 'constrained_random') {
      stimulus += '    // Random stimulus\n';
      stimulus += '    repeat(20) begin\n';
      for (const port of inputPorts) {
        if (port.width <= 32) {
          stimulus += `      ${port.name} = $random(seed);\n`;
        } else {
          stimulus += `      ${port.name} = {$random(seed), $random(seed)};\n`;
        }
      }
      stimulus += '      #100;\n';
      stimulus += '      test_count++;\n';
      stimulus += '    end\n';
    }

    return stimulus;
  }

  private generateCheckers(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let checkers = '  // Response checking\n';
    checkers += '  always @(posedge ' + ((moduleInfo.clockDomains || [])[0]?.name || 'clk') + ') begin\n';
    checkers += '    // Add your checking logic here\n';
    checkers += '    // Example: if (output !== expected) error_count++;\n';
    checkers += '  end\n\n';
    return checkers;
  }

  private generateAssertions(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let assertions = '  // Assertions\n';
    
    // Generate basic assertions
    const outputPorts = moduleInfo.ports.filter(p => p.direction === 'output');
    
    for (const port of outputPorts) {
      assertions += `  // Check that ${port.name} is never X or Z\n`;
      assertions += `  assert property (@(posedge ${(moduleInfo.clockDomains || [])[0]?.name || 'clk'}) \n`;
      assertions += `    !$isunknown(${port.name})\n`;
      assertions += `  ) else $error("${port.name} is X or Z");\n\n`;
    }

    return assertions;
  }

  private generateCoverage(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    let coverage = '  // Coverage\n';
    coverage += '  covergroup cg @(posedge ' + ((moduleInfo.clockDomains || [])[0]?.name || 'clk') + ');\n';
    
    // Generate coverage points for input signals
    const inputPorts = moduleInfo.ports.filter(p => 
      p.direction === 'input' && 
      !(moduleInfo.clockDomains || []).some(cd => cd.name === p.name || cd.resetSignal === p.name)
    );

    for (const port of inputPorts) {
      if (port.width <= 8) {
        coverage += `    ${port.name}_cp: coverpoint ${port.name};\n`;
      }
    }

    coverage += '  endgroup\n\n';
    coverage += '  cg cg_inst = new();\n\n';

    return coverage;
  }

  private generateWaveformDumping(moduleInfo: ModuleInfo, params: TestbenchGeneratorParams): string {
    return `  // Waveform dumping
  initial begin
    $dumpfile("tb_${moduleInfo.name}.vcd");
    $dumpvars(0, tb_${moduleInfo.name});
  end
`;
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        targetFile: {
          type: 'string',
          description: 'Verilog file containing the module to test',
        },
        targetModule: {
          type: 'string',
          description: 'Module name to generate testbench for',
        },
        outputFile: {
          type: 'string',
          description: 'Output testbench file path',
        },
        template: {
          type: 'string',
          enum: ['basic', 'uvm', 'cocotb', 'protocol'],
          default: 'basic',
          description: 'Testbench template style',
        },
        protocol: {
          type: 'string',
          enum: ['axi', 'apb', 'wishbone', 'avalon', 'custom'],
          description: 'Protocol type for protocol-aware testbench',
        },
        stimulusType: {
          type: 'string',
          enum: ['directed', 'random', 'constrained_random', 'sequence'],
          default: 'directed',
          description: 'Type of stimulus to generate',
        },
        clockPeriod: {
          type: 'number',
          default: 10,
          description: 'Clock period in time units',
        },
        resetDuration: {
          type: 'number',
          default: 100,
          description: 'Reset duration in time units',
        },
        simulationTime: {
          type: 'number',
          default: 10000,
          description: 'Total simulation time',
        },
        generateAssertions: {
          type: 'boolean',
          default: true,
          description: 'Generate assertions',
        },
        generateCoverage: {
          type: 'boolean',
          default: true,
          description: 'Generate coverage points',
        },
        generateCheckers: {
          type: 'boolean',
          default: true,
          description: 'Generate response checkers',
        },
        parseOnly: {
          type: 'boolean',
          default: false,
          description: 'Only parse module, don\'t generate testbench',
        },
      },
      required: ['targetFile', 'targetModule'],
    };
  }
}