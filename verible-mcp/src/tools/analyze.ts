import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AbstractTool } from './base.js';
import { CommandResult } from '../utils/executor.js';
import { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { SyntaxTool } from './syntax.js';

// Schema for analyze tool parameters
const AnalyzeParamsSchema = z.object({
  filepath: z.string().describe('Path to the file to analyze'),
  analysis_type: z.enum(['registers', 'modules', 'signals', 'all', 'module_detail', 'signal_trace']).default('all'),
  recursive: z.boolean().default(false).describe('Analyze all files in directory'),
  pattern: z.string().optional().describe('File pattern for recursive analysis'),
  module_name: z.string().optional().describe('Specific module to analyze'),
  signal_name: z.string().optional().describe('Specific signal to trace'),
});

type AnalyzeParams = z.infer<typeof AnalyzeParamsSchema>;

export interface RegisterInfo {
  name: string;
  width: number;
  type: 'flip_flop' | 'latch' | 'memory';
  clock?: string;
  reset?: string;
  file: string;
  line: number;
  module: string;
}

export interface AnalysisResult {
  registers: RegisterInfo[];
  totalRegisters: number;
  byType: Record<string, number>;
  byModule: Record<string, RegisterInfo[]>;
  totalBits: number;
  modules?: Array<{
    name: string;
    file: string;
    line: number;
    registerCount: number;
  }>;
}

export interface ModuleDetailResult {
  module: string;
  file: string;
  startLine: number;
  endLine: number;
  ports: Array<{
    name: string;
    direction: string;
    width: number;
    line: number;
  }>;
  parameters: Array<{
    name: string;
    value: string;
    line: number;
  }>;
  instances: Array<{
    module: string;
    instance: string;
    line: number;
  }>;
  signals: Array<{
    name: string;
    type: string;
    width: number;
    line: number;
  }>;
  hierarchy: Array<{
    module: string;
    instance: string;
  }>;
}

export interface SignalTraceResult {
  signal: string;
  totalUsages: number;
  usages: Array<{
    file: string;
    module: string;
    line: number;
    context: string;
    type: 'declaration' | 'assignment' | 'read' | 'port';
  }>;
  byModule: Record<string, Array<{
    file: string;
    module: string;
    line: number;
    context: string;
    type: 'declaration' | 'assignment' | 'read' | 'port';
  }>>;
  callGraph: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  summary: {
    declarations: number;
    assignments: number;
    reads: number;
    ports: number;
  };
}

export class AnalyzeTool extends AbstractTool<AnalyzeParams, AnalysisResult | ModuleDetailResult | SignalTraceResult> {
  private syntaxTool: SyntaxTool;

  constructor(configManager: any, cacheManager: any) {
    super('verible_analyze', 'syntax', configManager, cacheManager, AnalyzeParamsSchema);
    this.syntaxTool = new SyntaxTool(configManager, cacheManager);
  }

  getDescription(): string {
    return 'Analyze Verilog/SystemVerilog code for registers, modules, and signals';
  }

  protected buildArguments(params: AnalyzeParams): string[] {
    // We'll use the syntax tool to get the AST, then analyze it
    return [];
  }

  protected async processResult(
    result: CommandResult,
    params: AnalyzeParams
  ): Promise<ToolResult<AnalysisResult | ModuleDetailResult | SignalTraceResult>> {
    try {
      // Handle module_detail analysis
      if (params.analysis_type === 'module_detail' && params.module_name) {
        return await this.analyzeModuleDetail(params.filepath, params.module_name);
      }

      // Handle signal_trace analysis
      if (params.analysis_type === 'signal_trace' && params.signal_name) {
        return await this.traceSignal(params.filepath, params.signal_name, params.module_name);
      }

      // Original analysis logic for registers/modules/all
      const files = await this.getFilesToAnalyze(params);
      const allRegisters: RegisterInfo[] = [];
      const modules: Array<{ name: string; file: string; line: number; registerCount: number }> = [];

      for (const file of files) {
        const fileRegisters = await this.analyzeFile(file);
        allRegisters.push(...fileRegisters.registers);
        if (fileRegisters.modules) {
          modules.push(...fileRegisters.modules);
        }
      }

      // Group registers by type
      const byType: Record<string, number> = {};
      for (const reg of allRegisters) {
        byType[reg.type] = (byType[reg.type] || 0) + 1;
      }

      // Group registers by module
      const byModule: Record<string, RegisterInfo[]> = {};
      for (const reg of allRegisters) {
        if (!byModule[reg.module]) {
          byModule[reg.module] = [];
        }
        byModule[reg.module].push(reg);
      }

      // Calculate total bits
      const totalBits = allRegisters.reduce((sum, reg) => sum + reg.width, 0);

      // Update module register counts
      for (const module of modules) {
        module.registerCount = byModule[module.name]?.length || 0;
      }

      const analysisResult: AnalysisResult = {
        registers: allRegisters,
        totalRegisters: allRegisters.length,
        byType,
        byModule,
        totalBits,
        modules: params.analysis_type === 'all' || params.analysis_type === 'modules' ? modules : undefined,
      };

      return {
        success: true,
        data: analysisResult,
      };

    } catch (error) {
      logger.error('Failed to analyze files:', error);
      return {
        success: false,
        error: `Failed to analyze: ${error}`,
      };
    }
  }

  private async getFilesToAnalyze(params: AnalyzeParams): Promise<string[]> {
    if (!params.recursive) {
      return [params.filepath];
    }

    const stats = await fs.stat(params.filepath);
    if (!stats.isDirectory()) {
      return [params.filepath];
    }

    // Get all Verilog files in directory
    const pattern = params.pattern || '*.{v,sv}';
    const files: string[] = [];
    
    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.v') || entry.name.endsWith('.sv'))) {
          files.push(fullPath);
        }
      }
    }

    await walk(params.filepath);
    return files;
  }

  private async analyzeFile(filepath: string): Promise<{
    registers: RegisterInfo[];
    modules: Array<{ name: string; file: string; line: number; registerCount: number }>;
  }> {
    try {
      // Use Verible syntax parser to get the AST
      const syntaxResult = await this.syntaxTool.execute({
        filepath,
        output_format: 'json'
      });

      if (!syntaxResult.success || !syntaxResult.data) {
        logger.warn(`Failed to parse ${filepath} with Verible, falling back to regex parsing`);
        return await this.analyzeFileWithRegex(filepath);
      }

      const registers: RegisterInfo[] = [];
      const modules: Array<{ name: string; file: string; line: number; registerCount: number }> = [];

      // Parse the JSON AST from Verible
      const ast = syntaxResult.data;
      
      // Extract registers from AST
      const moduleNodes = this.findNodesOfType(ast, 'kModuleDeclaration');
      
      for (const moduleNode of moduleNodes) {
        const moduleName = this.getModuleName(moduleNode);
        const moduleLine = this.getNodeLine(moduleNode);
        
        if (moduleName) {
          modules.push({
            name: moduleName,
            file: filepath,
            line: moduleLine,
            registerCount: 0,
          });

          // Find all register declarations in this module
          const regDeclarations = this.findRegistersInModule(moduleNode);
          
          for (const regDecl of regDeclarations) {
            const regInfo = this.extractRegisterInfo(regDecl, filepath, moduleName);
            if (regInfo) {
              registers.push(regInfo);
            }
          }
        }
      }

      // Update module register counts
      for (const module of modules) {
        module.registerCount = registers.filter(r => r.module === module.name).length;
      }

      return { registers, modules };

    } catch (error) {
      logger.error(`Error parsing ${filepath} with Verible:`, error);
      // Fallback to regex-based parsing
      return await this.analyzeFileWithRegex(filepath);
    }
  }

  private findNodesOfType(node: any, type: string): any[] {
    const results: any[] = [];
    
    if (!node) return results;
    
    // Check if current node matches the type
    if (node.tag === type) {
      results.push(node);
    }
    
    // Recursively search children
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.findNodesOfType(child, type));
      }
    }
    
    return results;
  }

  private getModuleName(moduleNode: any): string | null {
    // Find the module identifier in the AST
    const identifiers = this.findNodesOfType(moduleNode, 'kUnqualifiedId');
    if (identifiers.length > 0 && identifiers[0].text) {
      return identifiers[0].text;
    }
    return null;
  }

  private getNodeLine(node: any): number {
    // Extract line number from node location
    if (node.start && node.start.line) {
      return node.start.line;
    }
    return 1;
  }

  private findRegistersInModule(moduleNode: any): any[] {
    const registers: any[] = [];
    
    // Find all data declarations
    const dataDeclarations = this.findNodesOfType(moduleNode, 'kDataDeclaration');
    
    for (const decl of dataDeclarations) {
      // Check if it's a register type (reg, logic)
      const typeInfo = this.getDeclarationType(decl);
      if (typeInfo && (typeInfo === 'reg' || typeInfo === 'logic')) {
        registers.push(decl);
      }
    }
    
    // Also find registers declared in always blocks
    const alwaysBlocks = this.findNodesOfType(moduleNode, 'kAlwaysStatement');
    for (const block of alwaysBlocks) {
      const blockRegs = this.findRegistersInAlwaysBlock(block);
      registers.push(...blockRegs);
    }
    
    return registers;
  }

  private getDeclarationType(declNode: any): string | null {
    // Look for reg or logic keywords
    const keywords = this.findNodesOfType(declNode, 'TK_reg') || this.findNodesOfType(declNode, 'TK_logic');
    if (keywords.length > 0) {
      return keywords[0].text || 'reg';
    }
    return null;
  }

  private findRegistersInAlwaysBlock(blockNode: any): any[] {
    const registers: any[] = [];
    
    // Find all assignments in the always block
    const assignments = this.findNodesOfType(blockNode, 'kNonblockingAssignmentStatement');
    assignments.push(...this.findNodesOfType(blockNode, 'kBlockingAssignmentStatement'));
    
    // Track which signals are assigned in always blocks - these are registers
    const assignedSignals = new Set<string>();
    
    for (const assignment of assignments) {
      const lvalue = this.getAssignmentTarget(assignment);
      if (lvalue) {
        assignedSignals.add(lvalue);
      }
    }
    
    return Array.from(assignedSignals).map(signal => ({ name: signal, fromAlwaysBlock: true }));
  }

  private getAssignmentTarget(assignmentNode: any): string | null {
    // Extract the left-hand side of an assignment
    const identifiers = this.findNodesOfType(assignmentNode, 'kUnqualifiedId');
    if (identifiers.length > 0) {
      return identifiers[0].text;
    }
    return null;
  }

  private extractRegisterInfo(regNode: any, filepath: string, moduleName: string): RegisterInfo | null {
    try {
      let name: string | null = null;
      let width = 1;
      let type: 'flip_flop' | 'latch' | 'memory' = 'flip_flop';
      
      // Handle different node types
      if (regNode.fromAlwaysBlock) {
        // This is a signal assigned in an always block
        name = regNode.name;
      } else {
        // This is a data declaration
        const identifiers = this.findNodesOfType(regNode, 'kUnqualifiedId');
        if (identifiers.length > 0) {
          name = identifiers[0].text;
        }
        
        // Extract width from packed dimensions
        const dimensions = this.findNodesOfType(regNode, 'kPackedDimensions');
        if (dimensions.length > 0) {
          width = this.calculateWidth(dimensions[0]);
        }
      }
      
      if (!name) return null;
      
      return {
        name,
        width,
        type,
        file: filepath,
        line: this.getNodeLine(regNode),
        module: moduleName,
      };
    } catch (error) {
      logger.error('Error extracting register info:', error);
      return null;
    }
  }

  private calculateWidth(dimensionNode: any): number {
    // Extract MSB and LSB from dimension node
    const numbers = this.findNodesOfType(dimensionNode, 'TK_DecNumber');
    if (numbers.length >= 2) {
      const msb = parseInt(numbers[0].text);
      const lsb = parseInt(numbers[1].text);
      return Math.abs(msb - lsb) + 1;
    }
    return 1;
  }

  // Fallback method using regex (original implementation)
  private async analyzeFileWithRegex(filepath: string): Promise<{
    registers: RegisterInfo[];
    modules: Array<{ name: string; file: string; line: number; registerCount: number }>;
  }> {
    const content = await fs.readFile(filepath, 'utf-8');
    const registers: RegisterInfo[] = [];
    const modules: Array<{ name: string; file: string; line: number; registerCount: number }> = [];

    // Parse file content for registers and modules
    const lines = content.split('\n');
    let currentModule: string | null = null;
    let currentModuleLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect module declarations
      const moduleMatch = line.match(/^\s*module\s+(\w+)/);
      if (moduleMatch) {
        currentModule = moduleMatch[1];
        currentModuleLine = lineNum;
        modules.push({
          name: currentModule,
          file: filepath,
          line: lineNum,
          registerCount: 0,
        });
      }

      // Detect endmodule
      if (line.match(/^\s*endmodule/)) {
        currentModule = null;
      }

      if (currentModule) {
        // Detect register declarations - more comprehensive pattern
        const regPatterns = [
          /^\s*(?:reg|logic)\s*(?:\[(\d+):(\d+)\])?\s*(\w+)\s*[;,]/,
          /^\s*(?:reg|logic)\s*(?:\[(\d+):(\d+)\])?\s*(\w+)\s*=/,
          /^\s*(?:input\s+)?(?:reg|logic)\s*(?:\[(\d+):(\d+)\])?\s*(\w+)/,
          /^\s*(?:output\s+)?(?:reg|logic)\s*(?:\[(\d+):(\d+)\])?\s*(\w+)/
        ];
        
        for (const pattern of regPatterns) {
          const regMatch = line.match(pattern);
          if (regMatch) {
            const [, msb, lsb, name] = regMatch;
            const width = msb && lsb ? Math.abs(parseInt(msb) - parseInt(lsb)) + 1 : 1;
            
            // Don't duplicate if already found
            if (!registers.some(r => r.name === name && r.module === currentModule)) {
              registers.push({
                name,
                width,
                type: 'flip_flop',
                file: filepath,
                line: lineNum,
                module: currentModule,
              });
            }
            break;
          }
        }
      }
    }

    return { registers, modules };
  }

  private isActualRegister(signalName: string, remainingLines: string[]): boolean {
    // Check if signal is assigned in an always block
    const alwaysBlockRegex = new RegExp(`always(?:_ff|_comb|_latch)?\\s*@[^\\n]*\\n[^}]*${signalName}\\s*<=`, 's');
    const remainingContent = remainingLines.slice(0, 50).join('\n'); // Check next 50 lines
    return alwaysBlockRegex.test(remainingContent);
  }

  private detectRegisterType(signalName: string, remainingLines: string[]): {
    type: 'flip_flop' | 'latch' | 'memory';
    clock?: string;
    reset?: string;
  } {
    const remainingContent = remainingLines.slice(0, 50).join('\n');
    
    // Check for clocked always block (flip-flop)
    const clockedMatch = remainingContent.match(
      /always(?:_ff)?\s*@\s*\(\s*(?:posedge|negedge)\s+(\w+)(?:.*?(?:posedge|negedge)\s+(\w+))?\s*\)[^}]*?\n[^}]*?${signalName}\s*<=/s
    );
    
    if (clockedMatch) {
      const [, clock, reset] = clockedMatch;
      return {
        type: 'flip_flop',
        clock,
        reset,
      };
    }

    // Check for latch (level-sensitive)
    const latchMatch = remainingContent.match(
      /always(?:_latch)?\s*@\s*\([^)]*\)[^}]*?\n[^}]*?if\s*\([^)]*\)[^}]*?${signalName}\s*<=/s
    );
    
    if (latchMatch) {
      return { type: 'latch' };
    }

    // Default to flip-flop
    return { type: 'flip_flop' };
  }

  protected getCacheKey(params: AnalyzeParams): string | null {
    const cacheData = {
      filepath: params.filepath,
      analysis_type: params.analysis_type,
      recursive: params.recursive,
    };
    return this.cacheManager.generateKey('analyze', cacheData);
  }

  protected getFilePath(params: AnalyzeParams): string | undefined {
    return params.recursive ? undefined : params.filepath;
  }

  private async analyzeModuleDetail(filepath: string, moduleName: string): Promise<ToolResult<ModuleDetailResult>> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.split('\n');
      
      let inModule = false;
      let moduleStartLine = 0;
      let moduleEndLine = 0;
      const ports: Array<{ name: string; direction: string; width: number; line: number }> = [];
      const parameters: Array<{ name: string; value: string; line: number }> = [];
      const instances: Array<{ module: string; instance: string; line: number }> = [];
      const signals: Array<{ name: string; type: string; width: number; line: number }> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        // Find module start
        const moduleMatch = line.match(new RegExp(`^\\s*module\\s+${moduleName}\\s*[#(]`));
        if (moduleMatch) {
          inModule = true;
          moduleStartLine = lineNum;
        }
        
        if (inModule) {
          // Find module end
          if (line.match(/^\s*endmodule/)) {
            moduleEndLine = lineNum;
            break;
          }
          
          // Extract parameters
          const paramMatch = line.match(/^\s*parameter\s+(\w+)\s*=\s*(.+?)\s*[;,]/);
          if (paramMatch) {
            parameters.push({
              name: paramMatch[1],
              value: paramMatch[2],
              line: lineNum,
            });
          }
          
          // Extract ports
          const portMatch = line.match(/^\s*(input|output|inout)\s+(?:wire|reg|logic)?\s*(?:\[(\d+):(\d+)\])?\s*(\w+)/);
          if (portMatch) {
            const [, direction, msb, lsb, name] = portMatch;
            const width = msb && lsb ? Math.abs(parseInt(msb) - parseInt(lsb)) + 1 : 1;
            ports.push({ name, direction, width, line: lineNum });
          }
          
          // Extract signal declarations
          const signalMatch = line.match(/^\s*(wire|reg|logic)\s*(?:\[(\d+):(\d+)\])?\s*(\w+)/);
          if (signalMatch) {
            const [, type, msb, lsb, name] = signalMatch;
            const width = msb && lsb ? Math.abs(parseInt(msb) - parseInt(lsb)) + 1 : 1;
            signals.push({ name, type, width, line: lineNum });
          }
          
          // Extract module instances
          const instanceMatch = line.match(/^\s*(\w+)\s+(\w+)\s*\(/);
          if (instanceMatch && !['module', 'function', 'task', 'always', 'initial', 'if', 'else', 'for', 'while', 'case'].includes(instanceMatch[1])) {
            instances.push({
              module: instanceMatch[1],
              instance: instanceMatch[2],
              line: lineNum,
            });
          }
        }
      }
      
      if (!inModule) {
        return {
          success: false,
          error: `Module '${moduleName}' not found in ${filepath}`,
        };
      }
      
      return {
        success: true,
        data: {
          module: moduleName,
          file: filepath,
          startLine: moduleStartLine,
          endLine: moduleEndLine,
          ports,
          parameters,
          instances,
          signals,
          hierarchy: instances.map(inst => ({
            module: inst.module,
            instance: inst.instance,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze module: ${error}`,
      };
    }
  }

  private async traceSignal(filepath: string, signalName: string, scope?: string): Promise<ToolResult<SignalTraceResult>> {
    try {
      const files = await this.getFilesToAnalyze({ filepath, recursive: true, analysis_type: 'all' });
      const usages: Array<{
        file: string;
        module: string;
        line: number;
        context: string;
        type: 'declaration' | 'assignment' | 'read' | 'port';
      }> = [];
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        let currentModule: string | null = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;
          
          // Track current module
          const moduleMatch = line.match(/^\s*module\s+(\w+)/);
          if (moduleMatch) {
            currentModule = moduleMatch[1];
          }
          
          if (line.match(/^\s*endmodule/)) {
            currentModule = null;
          }
          
          // Skip if scope is specified and doesn't match
          if (scope && currentModule !== scope) {
            continue;
          }
          
          // Check if line contains the signal
          if (line.includes(signalName)) {
            const wordBoundaryRegex = new RegExp(`\\b${signalName}\\b`);
            if (!wordBoundaryRegex.test(line)) {
              continue;
            }
            
            let usageType: 'declaration' | 'assignment' | 'read' | 'port' = 'read';
            
            // Determine usage type
            if (line.match(new RegExp(`^\\s*(?:wire|reg|logic).*\\b${signalName}\\b`))) {
              usageType = 'declaration';
            } else if (line.match(new RegExp(`^\\s*(?:input|output|inout).*\\b${signalName}\\b`))) {
              usageType = 'port';
            } else if (line.match(new RegExp(`\\b${signalName}\\s*(?:<=|=)`))) {
              usageType = 'assignment';
            }
            
            usages.push({
              file,
              module: currentModule || 'top-level',
              line: lineNum,
              context: line.trim(),
              type: usageType,
            });
          }
        }
      }
      
      // Group usages by module
      const byModule: Record<string, typeof usages> = {};
      for (const usage of usages) {
        if (!byModule[usage.module]) {
          byModule[usage.module] = [];
        }
        byModule[usage.module].push(usage);
      }
      
      // Create call graph (which modules use the signal)
      const callGraph: Array<{ from: string; to: string; type: string }> = [];
      const modules = Object.keys(byModule);
      
      for (const module of modules) {
        const moduleUsages = byModule[module];
        const hasDeclaration = moduleUsages.some(u => u.type === 'declaration');
        const hasPorts = moduleUsages.some(u => u.type === 'port');
        
        if (hasDeclaration || hasPorts) {
          // This module defines the signal
          for (const otherModule of modules) {
            if (otherModule !== module) {
              const otherUsages = byModule[otherModule];
              if (otherUsages.some(u => u.type === 'read' || u.type === 'assignment')) {
                callGraph.push({
                  from: module,
                  to: otherModule,
                  type: 'signal-usage',
                });
              }
            }
          }
        }
      }
      
      return {
        success: true,
        data: {
          signal: signalName,
          totalUsages: usages.length,
          usages,
          byModule,
          callGraph,
          summary: {
            declarations: usages.filter(u => u.type === 'declaration').length,
            assignments: usages.filter(u => u.type === 'assignment').length,
            reads: usages.filter(u => u.type === 'read').length,
            ports: usages.filter(u => u.type === 'port').length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to trace signal: ${error}`,
      };
    }
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file or directory to analyze',
        },
        analysis_type: {
          type: 'string',
          enum: ['registers', 'modules', 'signals', 'all', 'module_detail', 'signal_trace'],
          description: 'Type of analysis to perform',
          default: 'all',
        },
        recursive: {
          type: 'boolean',
          description: 'Analyze all files in directory recursively',
          default: false,
        },
        pattern: {
          type: 'string',
          description: 'File pattern for recursive analysis',
        },
        module_name: {
          type: 'string',
          description: 'Specific module to analyze (for module_detail)',
        },
        signal_name: {
          type: 'string',
          description: 'Specific signal to trace (for signal_trace)',
        },
      },
      required: ['filepath'],
    };
  }
}