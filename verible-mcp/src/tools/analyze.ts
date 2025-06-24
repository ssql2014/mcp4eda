import { AbstractTool } from './base.js';
import { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { CommandExecutor } from '../utils/executor.js';

// Schema for analyze parameters
const AnalyzeParamsSchema = z.object({
  filepath: z.string().describe('Path to the file or directory to analyze'),
  analysis_type: z.enum(['registers', 'modules', 'signals', 'all', 'module_detail', 'signal_trace'])
    .default('all')
    .describe('Type of analysis to perform'),
  recursive: z.boolean().default(false).describe('Analyze all files in directory recursively'),
  pattern: z.string().optional().describe('File pattern for recursive analysis'),
  module_name: z.string().optional().describe('Specific module to analyze (for module_detail)'),
  signal_name: z.string().optional().describe('Specific signal to trace (for signal_trace)'),
});

export type AnalyzeParams = z.infer<typeof AnalyzeParamsSchema>;

// Types for analysis results
interface RegisterInfo {
  name: string;
  width: number;
  type: 'flip_flop' | 'latch' | 'potential_register';
  file: string;
  line: number;
  module: string;
  clock?: string;
  reset?: string;
}

interface ModuleInfo {
  name: string;
  file: string;
  line: number;
  registerCount: number;
}

interface AnalysisResult {
  registers: RegisterInfo[];
  totalRegisters: number;
  byType: Record<string, number>;
  byModule: Record<string, RegisterInfo[]>;
  totalBits: number;
  modules?: ModuleInfo[];
}

// AST Node types from rtl-parser-mcp
interface SyntaxNode {
  tag?: string;
  children?: (SyntaxNode | SyntaxLeaf)[];
}

interface SyntaxLeaf {
  text: string;
  start: number;
  end: number;
  tag?: string;
}

export class AnalyzeTool extends AbstractTool<AnalyzeParams, AnalysisResult> {
  private analyzeExecutor: CommandExecutor;
  
  constructor(configManager: any, cacheManager: any, private syntaxTool: any) {
    super('verible_analyze', 'syntax', configManager, cacheManager, AnalyzeParamsSchema);
    this.analyzeExecutor = new CommandExecutor();
  }

  getDescription(): string {
    return 'Analyze Verilog/SystemVerilog code for registers, modules, and signals';
  }

  protected buildArguments(params: AnalyzeParams): string[] {
    // This tool doesn't use Verible directly, it uses the syntax tool
    return [];
  }

  protected async processResult(
    result: any,
    params: AnalyzeParams
  ): Promise<ToolResult<AnalysisResult>> {
    try {
      const files = await this.getFilesToAnalyze(params);
      
      if (params.analysis_type === 'registers' || params.analysis_type === 'all') {
        // Aggregate results from all files
        const allRegisters: RegisterInfo[] = [];
        const allModules: ModuleInfo[] = [];
        
        for (const file of files) {
          const fileResult = await this.analyzeFile(file);
          allRegisters.push(...fileResult.registers);
          allModules.push(...fileResult.modules);
        }
        
        // Group registers by type and module
        const byType: Record<string, number> = {};
        const byModule: Record<string, RegisterInfo[]> = {};
        let totalBits = 0;
        
        for (const reg of allRegisters) {
          // Count by type
          byType[reg.type] = (byType[reg.type] || 0) + 1;
          
          // Group by module
          if (!byModule[reg.module]) {
            byModule[reg.module] = [];
          }
          byModule[reg.module].push(reg);
          
          // Sum total bits
          totalBits += reg.width;
        }
        
        return {
          success: true,
          data: {
            registers: allRegisters,
            totalRegisters: allRegisters.length,
            byType,
            byModule,
            totalBits,
            modules: allModules,
          },
        };
      }
      
      // Default empty result
      return {
        success: true,
        data: {
          registers: [],
          totalRegisters: 0,
          byType: {},
          byModule: {},
          totalBits: 0,
        },
      };
    } catch (error) {
      logger.error('Error analyzing files:', error);
      return {
        success: false,
        error: `Analysis failed: ${error}`,
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
    modules: ModuleInfo[];
  }> {
    try {
      // Execute Verible directly to get raw text output
      const config = await this.configManager.getConfig();
      const syntaxPath = config.toolPaths.syntax;
      
      const result = await this.analyzeExecutor.execute(syntaxPath, ['--printtree', filepath]);
      
      if (result.exitCode !== 0) {
        logger.warn(`Failed to parse ${filepath} with Verible: ${result.stderr}`);
        return { registers: [], modules: [] };
      }
      
      const treeOutput = result.stdout;
      
      // Parse the tree structure from text output
      const tree = this.parseTreeStructure(treeOutput);
      
      if (!tree) {
        logger.warn(`Failed to parse tree structure for ${filepath}`);
        return { registers: [], modules: [] };
      }

      // Extract content for line number calculation
      const content = await fs.readFile(filepath, 'utf-8');
      
      // Extract modules and registers
      const modules: ModuleInfo[] = [];
      const registers: RegisterInfo[] = [];
      
      const moduleNodes = this.findNodesByTag(tree, 'kModuleDeclaration');
      
      for (const moduleNode of moduleNodes) {
        const moduleName = this.getModuleName(moduleNode);
        const moduleLine = this.getLineNumberFromNode(moduleNode, content);
        
        if (moduleName) {
          const moduleRegisters = this.extractRegistersFromModule(moduleNode, filepath, moduleName, content);
          registers.push(...moduleRegisters);
          
          modules.push({
            name: moduleName,
            file: filepath,
            line: moduleLine,
            registerCount: moduleRegisters.length,
          });
        }
      }

      return { registers, modules };

    } catch (error) {
      logger.error(`Error parsing ${filepath}:`, error);
      return { registers: [], modules: [] };
    }
  }

  // Parse Verible's text tree output into structured format
  private parseTreeStructure(output: string): SyntaxNode | null {
    const lines = output.split('\n');
    const stack: SyntaxNode[] = [];
    let root: SyntaxNode | null = null;
    
    for (const line of lines) {
      const nodeMatch = line.match(/^(\s*)Node @\d+ \(tag: (\w+)\)/);
      const leafMatch = line.match(/^(\s*)Leaf @\d+ \(#"?(\w+)"? @(\d+)-(\d+): "([^"]*)"\)/);
      
      if (nodeMatch) {
        const indent = nodeMatch[1].length / 2;
        const tag = nodeMatch[2];
        const node: SyntaxNode = { tag, children: [] };
        
        while (stack.length > indent) {
          stack.pop();
        }
        
        if (stack.length === 0) {
          root = node;
          stack.push(node);
        } else {
          const parent = stack[stack.length - 1];
          if (!parent.children) parent.children = [];
          parent.children.push(node);
          stack.push(node);
        }
      } else if (leafMatch) {
        const indent = leafMatch[1].length / 2;
        const tag = leafMatch[2];
        const start = parseInt(leafMatch[3]);
        const end = parseInt(leafMatch[4]);
        const text = leafMatch[5];
        
        const leaf: SyntaxLeaf = { tag, start, end, text };
        
        while (stack.length > indent) {
          stack.pop();
        }
        
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          if (!parent.children) parent.children = [];
          parent.children.push(leaf);
        }
      }
    }
    
    return root;
  }

  private findNodesByTag(node: SyntaxNode | SyntaxLeaf, tag: string): SyntaxNode[] {
    const results: SyntaxNode[] = [];
    
    if ('tag' in node && node.tag === tag && 'children' in node) {
      results.push(node as SyntaxNode);
    }
    
    if ('children' in node && node.children) {
      for (const child of node.children) {
        results.push(...this.findNodesByTag(child, tag));
      }
    }
    
    return results;
  }

  private getModuleName(moduleNode: SyntaxNode): string | null {
    const moduleHeader = this.findFirstNodeByTag(moduleNode, 'kModuleHeader');
    if (!moduleHeader) return null;
    
    const leaves = this.getAllLeaves(moduleHeader);
    for (const leaf of leaves) {
      if (leaf.tag === 'SymbolIdentifier' && leaf.text !== 'module') {
        return leaf.text;
      }
    }
    
    return null;
  }

  private extractRegistersFromModule(
    moduleNode: SyntaxNode,
    filepath: string,
    moduleName: string,
    content: string
  ): RegisterInfo[] {
    const registers: RegisterInfo[] = [];
    const potentialRegisters: RegisterInfo[] = [];
    
    // Find all data declarations
    const dataDeclarations = this.findNodesByTag(moduleNode, 'kDataDeclaration');
    
    for (const dataDecl of dataDeclarations) {
      const regInfo = this.parseDataDeclaration(dataDecl, content);
      for (const reg of regInfo.registers) {
        potentialRegisters.push({
          ...reg,
          file: filepath,
          module: moduleName,
        });
      }
    }
    
    // Find all port declarations for output reg
    const moduleHeader = this.findFirstNodeByTag(moduleNode, 'kModuleHeader');
    if (moduleHeader) {
      const portDecls = this.findNodesByTag(moduleHeader, 'kPortDeclaration');
      for (const portDecl of portDecls) {
        const portRegs = this.parsePortDeclaration(portDecl, content);
        for (const reg of portRegs) {
          potentialRegisters.push({
            ...reg,
            file: filepath,
            module: moduleName,
          });
        }
      }
    }
    
    // Refine register types by analyzing always blocks
    const alwaysBlocks = this.findNodesByTag(moduleNode, 'kAlwaysStatement');
    this.refineRegisters(alwaysBlocks, potentialRegisters);
    
    return potentialRegisters;
  }

  private parseDataDeclaration(dataDecl: SyntaxNode, content: string): { registers: RegisterInfo[] } {
    const registers: RegisterInfo[] = [];
    const leaves = this.getAllLeaves(dataDecl);
    
    let type: 'wire' | 'reg' | 'logic' = 'wire';
    let width = 1;
    
    // Find type (reg, wire, logic)
    for (const leaf of leaves) {
      if (['wire', 'reg', 'logic'].includes(leaf.text)) {
        type = leaf.text as 'wire' | 'reg' | 'logic';
        break;
      }
    }
    
    // Only process reg and logic types
    if (type !== 'reg' && type !== 'logic') {
      return { registers: [] };
    }
    
    // Find width in packed dimensions
    const packedDimNode = this.findFirstNodeByTag(dataDecl, 'kPackedDimensions');
    if (packedDimNode) {
      width = this.parsePackedDimensions(packedDimNode);
    }
    
    // Find register variables
    const regVarNodes = this.findNodesByTag(dataDecl, 'kRegisterVariable');
    for (const regVar of regVarNodes) {
      const regLeaves = this.getAllLeaves(regVar);
      const nameLeaf = regLeaves.find(leaf => leaf.tag === 'SymbolIdentifier');
      
      if (nameLeaf) {
        registers.push({
          name: nameLeaf.text,
          type: 'potential_register',
          width,
          line: this.getLineNumber(content, nameLeaf.start),
          file: '', // Will be set by caller
          module: '', // Will be set by caller
        });
      }
    }
    
    return { registers };
  }

  private parsePortDeclaration(portDecl: SyntaxNode, content: string): RegisterInfo[] {
    const registers: RegisterInfo[] = [];
    const leaves = this.getAllLeaves(portDecl);
    
    let isOutput = false;
    let type: 'wire' | 'reg' | 'logic' = 'wire';
    let width = 1;
    
    // Check if it's an output
    for (const leaf of leaves) {
      if (leaf.text === 'output') {
        isOutput = true;
      } else if (['wire', 'reg', 'logic'].includes(leaf.text)) {
        type = leaf.text as 'wire' | 'reg' | 'logic';
      }
    }
    
    // Only process output reg/logic
    if (!isOutput || (type !== 'reg' && type !== 'logic')) {
      return registers;
    }
    
    // Find width in packed dimensions
    const packedDimNode = this.findFirstNodeByTag(portDecl, 'kPackedDimensions');
    if (packedDimNode) {
      width = this.parsePackedDimensions(packedDimNode);
    }
    
    // Find port names
    const portNames = leaves.filter(leaf => 
      leaf.tag === 'SymbolIdentifier' && 
      !['input', 'output', 'inout', 'wire', 'reg', 'logic'].includes(leaf.text)
    );
    
    for (const portName of portNames) {
      registers.push({
        name: portName.text,
        type: 'potential_register',
        width,
        line: this.getLineNumber(content, portName.start),
        file: '', // Will be set by caller
        module: '', // Will be set by caller
      });
    }
    
    return registers;
  }

  private refineRegisters(alwaysNodes: SyntaxNode[], registers: RegisterInfo[]): void {
    const clockedSignals = new Set<string>();
    const latchSignals = new Set<string>();
    
    for (const alwaysNode of alwaysNodes) {
      // Check if this is a clocked always block
      const eventExpressions = this.findNodesByTag(alwaysNode, 'kEventExpression');
      
      let hasClockEdge = false;
      for (const eventExpr of eventExpressions) {
        const eventLeaves = this.getAllLeaves(eventExpr);
        if (eventLeaves.some(leaf => leaf.text === 'posedge' || leaf.text === 'negedge')) {
          hasClockEdge = true;
          break;
        }
      }
      
      // Find all assigned signals in this always block
      const assignedSignals = this.findAssignedSignals(alwaysNode);
      
      if (hasClockEdge) {
        // Sequential block - these are flip-flops
        assignedSignals.forEach(signal => clockedSignals.add(signal));
      } else {
        // Combinational block - these might be latches
        assignedSignals.forEach(signal => latchSignals.add(signal));
      }
    }
    
    // Update register types based on analysis
    for (const register of registers) {
      if (clockedSignals.has(register.name)) {
        register.type = 'flip_flop';
      } else if (latchSignals.has(register.name)) {
        register.type = 'latch';
      } else {
        // Not assigned in any always block - keep as potential_register
        register.type = 'flip_flop'; // Default to flip_flop for declared but unassigned registers
      }
    }
  }

  private findAssignedSignals(node: SyntaxNode): string[] {
    const assignedSignals: string[] = [];
    
    // Find all assignments (both blocking and non-blocking)
    const assignmentNodes = [
      ...this.findNodesByTag(node, 'kNetVariableAssignment'),
      ...this.findNodesByTag(node, 'kBlockingAssignmentStatement'),
      ...this.findNodesByTag(node, 'kNonblockingAssignmentStatement')
    ];
    
    for (const assignment of assignmentNodes) {
      // Get the LHS of the assignment
      const lhs = this.findFirstNodeByTag(assignment, 'kLPValue');
      if (lhs) {
        const leaves = this.getAllLeaves(lhs);
        for (const leaf of leaves) {
          if (leaf.tag === 'SymbolIdentifier') {
            assignedSignals.push(leaf.text);
            break; // Only take the first identifier
          }
        }
      }
    }
    
    return assignedSignals;
  }

  private parsePackedDimensions(dimNode: SyntaxNode): number {
    const leaves = this.getAllLeaves(dimNode);
    const numbers = leaves.filter(leaf => leaf.tag && leaf.tag.startsWith('TK_'));
    
    if (numbers.length >= 2) {
      // Format: [MSB:LSB]
      const msb = parseInt(numbers[0].text);
      const lsb = parseInt(numbers[1].text);
      if (!isNaN(msb) && !isNaN(lsb)) {
        return Math.abs(msb - lsb) + 1;
      }
    }
    
    return 1;
  }

  private findFirstNodeByTag(node: SyntaxNode | SyntaxLeaf, tag: string): SyntaxNode | null {
    if ('tag' in node && node.tag === tag && 'children' in node) {
      return node as SyntaxNode;
    }
    
    if ('children' in node && node.children) {
      for (const child of node.children) {
        const found = this.findFirstNodeByTag(child, tag);
        if (found) return found;
      }
    }
    
    return null;
  }

  private getAllLeaves(node: SyntaxNode | SyntaxLeaf): SyntaxLeaf[] {
    const leaves: SyntaxLeaf[] = [];
    
    if ('text' in node) {
      leaves.push(node as SyntaxLeaf);
    }
    
    if ('children' in node && node.children) {
      for (const child of node.children) {
        leaves.push(...this.getAllLeaves(child));
      }
    }
    
    return leaves;
  }

  private getLineNumber(content: string, byteOffset: number): number {
    let line = 1;
    for (let i = 0; i < byteOffset && i < content.length; i++) {
      if (content[i] === '\n') {
        line++;
      }
    }
    return line;
  }
  
  private getLineNumberFromNode(node: SyntaxNode, content: string): number {
    // Get the first leaf node to find byte offset
    const leaves = this.getAllLeaves(node);
    if (leaves.length > 0) {
      return this.getLineNumber(content, leaves[0].start);
    }
    return 1;
  }
}