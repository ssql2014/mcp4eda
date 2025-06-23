import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ParsedModule, Signal, Register, Port } from '../types/index.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export class VeribleWrapper {
  private verilatorPath: string = 'verible-verilog-syntax';
  private veribleLintPath: string = 'verible-verilog-lint';
  private veribleAvailable: boolean = false;
  
  constructor() {
    // Make the check non-blocking - initialize asynchronously
    this.checkVeribleInstallation().catch(err => {
      console.error('[RTL Parser MCP] Warning: Verible check failed:', err.message);
    });
  }

  private async checkVeribleInstallation(): Promise<void> {
    try {
      // First try to find verible in common locations
      const possiblePaths = [
        '/Users/qlss/.local/bin/verible-verilog-syntax',
        '/usr/local/bin/verible-verilog-syntax',
        '/opt/homebrew/bin/verible-verilog-syntax',
        'verible-verilog-syntax'
      ];
      
      let foundPath: string | null = null;
      for (const path of possiblePaths) {
        try {
          const { stdout } = await execAsync(`${path} --version`);
          foundPath = path;
          this.verilatorPath = path;
          this.veribleLintPath = path.replace('verilog-syntax', 'verilog-lint');
          console.error(`[RTL Parser MCP] Verible found at: ${path}`);
          console.error(`[RTL Parser MCP] Verible version: ${stdout.trim()}`);
          break;
        } catch (e) {
          // Try next path
        }
      }
      
      if (!foundPath) {
        // Try using which command as fallback
        try {
          const { stdout: whichPath } = await execAsync('which verible-verilog-syntax');
          if (whichPath.trim()) {
            this.verilatorPath = whichPath.trim();
            this.veribleLintPath = this.verilatorPath.replace('verilog-syntax', 'verilog-lint');
            foundPath = this.verilatorPath;
            console.error(`[RTL Parser MCP] Verible found via which: ${foundPath}`);
          }
        } catch (e) {
          // which command failed
        }
      }
      
      if (foundPath) {
        this.veribleAvailable = true;
        console.error('[RTL Parser MCP] Verible installation verified');
      } else {
        this.veribleAvailable = false;
        console.error('[RTL Parser MCP] Warning: Verible not found. Some features may be limited.');
        console.error('[RTL Parser MCP] Please install Verible for full functionality.');
      }
    } catch (error) {
      this.veribleAvailable = false;
      console.error('[RTL Parser MCP] Warning: Error checking Verible installation:', error);
    }
  }

  async parseFile(filepath: string): Promise<ParsedModule[]> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      
      // If Verible is available, use it for better parsing
      if (this.veribleAvailable) {
        try {
          // Use verible-verilog-syntax to get syntax tree
          const { stdout: syntaxTree } = await execAsync(
            `${this.verilatorPath} --printtree ${filepath}`
          );
          
          // Parse the syntax tree to extract module information
          const modules = this.extractModulesFromSyntaxTree(syntaxTree, filepath, content);
          
          return modules;
        } catch (veribleError) {
          logger.warn(`Verible parsing failed for ${filepath}, falling back to regex parsing:`, veribleError);
          // Fall through to regex-based parsing
        }
      }
      
      // Fallback to regex-based parsing
      logger.info(`Using regex-based parsing for ${filepath}`);
      return this.extractModulesFromContent(filepath, content);
      
    } catch (error) {
      logger.error(`Failed to parse file ${filepath}:`, error);
      throw error;
    }
  }

  private extractModulesFromContent(filepath: string, content: string): ParsedModule[] {
    // This is the same logic as extractModulesFromSyntaxTree but renamed for clarity
    return this.parseModulesWithRegex(content, filepath);
  }

  private extractModulesFromSyntaxTree(
    syntaxTree: string, 
    filepath: string,
    content: string
  ): ParsedModule[] {
    // For now, we'll use the same regex-based parsing
    // In the future, this could be enhanced to actually parse the Verible syntax tree
    return this.parseModulesWithRegex(content, filepath);
  }

  private parseModulesWithRegex(content: string, filepath: string): ParsedModule[] {
    const modules: ParsedModule[] = [];
    const lines = content.split('\n');
    
    // Regular expressions for parsing Verilog/SystemVerilog
    const moduleRegex = /^\s*module\s+(\w+)\s*(?:#\s*\([^)]*\))?\s*\(/gm;
    const portRegex = /^\s*(input|output|inout)\s+(?:(wire|reg|logic)\s+)?(?:\[([^\]]+)\]\s+)?(\w+)/gm;
    const paramRegex = /^\s*parameter\s+(?:(\w+)\s+)?(\w+)\s*=\s*([^;,]+)/gm;
    const regRegex = /^\s*(?:reg|logic)\s+(?:\[([^\]]+)\]\s+)?(\w+)/gm;
    const alwaysRegex = /^\s*always(?:_ff|_comb|_latch)?\s*@?\s*\(([^)]*)\)/gm;
    
    let match;
    let currentModule: ParsedModule | null = null;
    
    // Find modules
    while ((match = moduleRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      currentModule = {
        name: match[1],
        filepath,
        line: lineNum,
        ports: [],
        parameters: [],
        instances: [],
        signals: [],
        registers: [],
        always_blocks: []
      };
      modules.push(currentModule);
    }
    
    // For each module, extract its components
    for (const module of modules) {
      const moduleStart = content.indexOf(`module ${module.name}`);
      let moduleEnd = content.indexOf('endmodule', moduleStart);
      if (moduleEnd === -1) moduleEnd = content.length;
      
      const moduleContent = content.substring(moduleStart, moduleEnd);
      
      // Extract ports
      portRegex.lastIndex = 0;
      while ((match = portRegex.exec(moduleContent)) !== null) {
        const lineOffset = moduleContent.substring(0, match.index).split('\n').length - 1;
        module.ports.push({
          name: match[4],
          direction: match[1] as 'input' | 'output' | 'inout',
          type: match[2] || 'wire',
          width: this.parseWidth(match[3]),
          line: module.line + lineOffset
        });
      }
      
      // Extract parameters
      paramRegex.lastIndex = 0;
      while ((match = paramRegex.exec(moduleContent)) !== null) {
        const lineOffset = moduleContent.substring(0, match.index).split('\n').length - 1;
        module.parameters.push({
          name: match[2],
          type: match[1] || 'integer',
          value: match[3].trim(),
          line: module.line + lineOffset
        });
      }
      
      // Extract registers
      regRegex.lastIndex = 0;
      while ((match = regRegex.exec(moduleContent)) !== null) {
        const lineOffset = moduleContent.substring(0, match.index).split('\n').length - 1;
        const signal: Signal = {
          name: match[2],
          type: 'reg',
          width: this.parseWidth(match[1]),
          line: module.line + lineOffset
        };
        module.signals.push(signal);
        
        // Check if this is a register (flip-flop or latch)
        if (this.isRegister(match[2], moduleContent)) {
          module.registers.push({
            name: match[2],
            type: 'flip_flop', // Will be refined by analyzing always blocks
            width: signal.width,
            line: signal.line
          });
        }
      }
      
      // Extract always blocks
      alwaysRegex.lastIndex = 0;
      while ((match = alwaysRegex.exec(moduleContent)) !== null) {
        const lineOffset = moduleContent.substring(0, match.index).split('\n').length - 1;
        const sensitivity = match[1].trim();
        module.always_blocks.push({
          type: sensitivity.includes('edge') ? 'sequential' : 'combinational',
          sensitivity_list: sensitivity.split(',').map(s => s.trim()),
          line: module.line + lineOffset
        });
      }
    }
    
    return modules;
  }

  private parseWidth(widthStr: string | undefined): number {
    if (!widthStr) return 1;
    
    // Parse [MSB:LSB] format
    const match = widthStr.match(/(\d+)\s*:\s*(\d+)/);
    if (match) {
      const msb = parseInt(match[1]);
      const lsb = parseInt(match[2]);
      return Math.abs(msb - lsb) + 1;
    }
    
    // Parse single bit index [N]
    const singleMatch = widthStr.match(/(\d+)/);
    if (singleMatch) {
      return parseInt(singleMatch[1]) + 1;
    }
    
    return 1;
  }

  private isRegister(signalName: string, moduleContent: string): boolean {
    // Check if signal is assigned in an always block with clock edge
    const clockEdgeRegex = new RegExp(
      `always.*@.*(?:posedge|negedge).*\\n[^\\n]*${signalName}\\s*<=`,
      'gm'
    );
    return clockEdgeRegex.test(moduleContent);
  }

  async lintFile(filepath: string): Promise<any> {
    if (!this.veribleAvailable) {
      logger.warn('Verible not available, skipping lint');
      return { violations: [] };
    }
    
    try {
      const { stdout } = await execAsync(
        `${this.veribleLintPath} --rules=all ${filepath}`
      );
      return this.parseLintOutput(stdout);
    } catch (error: any) {
      // Verible lint returns non-zero exit code when violations found
      if (error.stdout) {
        return this.parseLintOutput(error.stdout);
      }
      logger.error('Lint failed:', error);
      return { violations: [] };
    }
  }

  private parseLintOutput(output: string): any {
    const violations = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(.+):(\d+):(\d+):\s*(.+)\s*\[(.+)\]/);
      if (match) {
        violations.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4].trim(),
          rule: match[5]
        });
      }
    }
    
    return { violations };
  }
}