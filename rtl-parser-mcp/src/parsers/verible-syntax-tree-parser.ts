import { ParsedModule, Port, Signal, Register, Parameter } from '../types/index.js';

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

export class VeribleSyntaxTreeParser {
  
  parseSyntaxTree(syntaxTreeOutput: string, filepath: string, content: string): ParsedModule[] {
    const modules: ParsedModule[] = [];
    
    // Parse the tree structure
    const tree = this.parseTreeStructure(syntaxTreeOutput);
    
    if (!tree) {
      throw new Error('Failed to parse Verible syntax tree');
    }
    
    // Extract modules from the tree
    const moduleNodes = this.findNodesByTag(tree, 'kModuleDeclaration');
    
    for (const moduleNode of moduleNodes) {
      const module = this.parseModule(moduleNode, filepath, content);
      if (module) {
        modules.push(module);
      }
    }
    
    return modules;
  }
  
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
  
  private parseModule(moduleNode: SyntaxNode, filepath: string, content: string): ParsedModule | null {
    const headerNode = this.findFirstNodeByTag(moduleNode, 'kModuleHeader');
    if (!headerNode) return null;
    
    const moduleName = this.findModuleName(headerNode);
    if (!moduleName) return null;
    
    const moduleLineNum = this.getLineNumber(content, moduleName.start);
    
    const module: ParsedModule = {
      name: moduleName.text,
      filepath,
      line: moduleLineNum,
      ports: [],
      parameters: [],
      instances: [],
      signals: [],
      registers: [],
      always_blocks: []
    };
    
    // Parse parameters
    const paramNodes = this.findNodesByTag(moduleNode, 'kParamDeclaration');
    for (const paramNode of paramNodes) {
      const param = this.parseParameter(paramNode, content);
      if (param) {
        module.parameters.push(param);
      }
    }
    
    // Parse ports from port declarations
    const portDeclarations = this.findNodesByTag(moduleNode, 'kPortDeclaration');
    for (const portDecl of portDeclarations) {
      const ports = this.parsePorts(portDecl, content);
      module.ports.push(...ports);
    }
    
    // Parse module items
    const itemList = this.findFirstNodeByTag(moduleNode, 'kModuleItemList');
    if (itemList) {
      // Parse data declarations (reg, wire, etc.)
      const dataDecls = this.findNodesByTag(itemList, 'kDataDeclaration');
      console.error(`[DEBUG] Found ${dataDecls.length} data declarations in ${module.name}`);
      for (const dataDecl of dataDecls) {
        const { signals, registers } = this.parseDataDeclaration(dataDecl, content);
        console.error(`[DEBUG] parseDataDeclaration returned ${signals.length} signals and ${registers.length} registers`);
        module.signals.push(...signals);
        module.registers.push(...registers);
      }
      
      // Parse always blocks to refine register identification
      const alwaysNodes = this.findNodesByTag(itemList, 'kAlwaysStatement');
      console.error(`[DEBUG] Found ${alwaysNodes.length} always blocks`);
      console.error(`[DEBUG] Module ${module.name} has ${module.registers.length} registers before refinement`);
      this.refineRegisters(alwaysNodes, module.registers, content);
      console.error(`[DEBUG] Module ${module.name} has ${module.registers.length} registers after refinement`);
      
      // Parse module instances
      const instanceNodes = this.findNodesByTag(itemList, 'kModuleInstantiation');
      for (const instNode of instanceNodes) {
        const instance = this.parseModuleInstance(instNode, content);
        if (instance) {
          module.instances.push(instance);
        }
      }
    }
    
    return module;
  }
  
  private findModuleName(headerNode: SyntaxNode): SyntaxLeaf | null {
    // Module name is typically the SymbolIdentifier after "module" keyword
    const leaves = this.getAllLeaves(headerNode);
    for (let i = 0; i < leaves.length; i++) {
      if (leaves[i].text === 'module' && i + 1 < leaves.length) {
        const nextLeaf = leaves[i + 1];
        if (nextLeaf.tag === 'SymbolIdentifier') {
          return nextLeaf;
        }
      }
    }
    return null;
  }
  
  private parseParameter(paramNode: SyntaxNode, content: string): Parameter | null {
    const leaves = this.getAllLeaves(paramNode);
    let name = '';
    let value = '';
    let type = 'integer';
    
    // Find parameter name
    for (const leaf of leaves) {
      if (leaf.tag === 'SymbolIdentifier' && !name) {
        name = leaf.text;
      }
    }
    
    // Find parameter value after '='
    let foundEquals = false;
    for (const leaf of leaves) {
      if (leaf.text === '=') {
        foundEquals = true;
      } else if (foundEquals && leaf.tag && leaf.tag.startsWith('TK_')) {
        value = leaf.text;
        break;
      }
    }
    
    if (name) {
      return {
        name,
        type,
        value,
        line: this.getLineNumber(content, leaves[0].start)
      };
    }
    
    return null;
  }
  
  private parsePorts(portDecl: SyntaxNode, content: string): Port[] {
    const ports: Port[] = [];
    const leaves = this.getAllLeaves(portDecl);
    
    let direction: 'input' | 'output' | 'inout' = 'input';
    let type: 'wire' | 'reg' | 'logic' = 'wire';
    let width = 1;
    
    // Find direction
    for (const leaf of leaves) {
      if (['input', 'output', 'inout'].includes(leaf.text)) {
        direction = leaf.text as 'input' | 'output' | 'inout';
      } else if (['wire', 'reg', 'logic'].includes(leaf.text)) {
        type = leaf.text as 'wire' | 'reg' | 'logic';
      }
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
      ports.push({
        name: portName.text,
        direction,
        type,
        width,
        line: this.getLineNumber(content, portName.start)
      });
    }
    
    return ports;
  }
  
  private parseDataDeclaration(dataDecl: SyntaxNode, content: string): { signals: Signal[], registers: Register[] } {
    const signals: Signal[] = [];
    const registers: Register[] = [];
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
        const signal: Signal = {
          name: nameLeaf.text,
          type,
          width,
          line: this.getLineNumber(content, nameLeaf.start)
        };
        signals.push(signal);
        
        // If it's a reg or logic type, consider it a potential register
        if (type === 'reg' || type === 'logic') {
          registers.push({
            name: nameLeaf.text,
            type: 'potential_register', // Will be refined by checking always blocks
            width,
            line: signal.line
          });
        }
      }
    }
    
    // Also handle signal names not in kRegisterVariable nodes (fallback)
    if (regVarNodes.length === 0) {
      const signalNames = leaves.filter(leaf => 
        leaf.tag === 'SymbolIdentifier' && 
        !['wire', 'reg', 'logic'].includes(leaf.text)
      );
      
      for (const signalName of signalNames) {
        signals.push({
          name: signalName.text,
          type,
          width,
          line: this.getLineNumber(content, signalName.start)
        });
      }
    }
    
    return { signals, registers };
  }
  
  private refineRegisters(alwaysNodes: SyntaxNode[], registers: Register[], content: string): void {
    const clockedSignals = new Set<string>();
    
    for (const alwaysNode of alwaysNodes) {
      // Check if this is a clocked always block
      // Look for event expressions within the always statement
      const eventExpressions = this.findNodesByTag(alwaysNode, 'kEventExpression');
      
      let hasClockEdge = false;
      for (const eventExpr of eventExpressions) {
        const eventLeaves = this.getAllLeaves(eventExpr);
        if (eventLeaves.some(leaf => leaf.text === 'posedge' || leaf.text === 'negedge')) {
          hasClockEdge = true;
          break;
        }
      }
      
      if (hasClockEdge) {
        // This is a sequential always block - find all assignments
        const assignments = this.findAssignedSignals(alwaysNode);
        assignments.forEach(signal => clockedSignals.add(signal));
      }
    }
    
    // Update register types based on whether they're assigned in clocked always blocks
    for (const register of registers) {
      if (clockedSignals.has(register.name)) {
        register.type = 'flip_flop';
      } else {
        register.type = 'latch';
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
            break; // Only take the first identifier (array indices might follow)
          }
        }
      }
    }
    
    return assignedSignals;
  }
  
  private parseModuleInstance(instNode: SyntaxNode, content: string): any {
    const leaves = this.getAllLeaves(instNode);
    
    let moduleName = '';
    let instanceName = '';
    
    // Module name is typically the first SymbolIdentifier
    // Instance name is typically the second SymbolIdentifier
    const identifiers = leaves.filter(leaf => leaf.tag === 'SymbolIdentifier');
    if (identifiers.length >= 2) {
      moduleName = identifiers[0].text;
      instanceName = identifiers[1].text;
    }
    
    if (moduleName && instanceName) {
      return {
        module: moduleName,
        name: instanceName,
        line: this.getLineNumber(content, leaves[0].start)
      };
    }
    
    return null;
  }
  
  private parsePackedDimensions(dimNode: SyntaxNode): number {
    const leaves = this.getAllLeaves(dimNode);
    const numbers = leaves.filter(leaf => leaf.tag && leaf.tag.startsWith('TK_'));
    
    if (numbers.length >= 2) {
      // Format: [MSB:LSB]
      const msb = parseInt(numbers[0].text);
      const lsb = parseInt(numbers[1].text);
      return Math.abs(msb - lsb) + 1;
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
    
    if (!('children' in node)) {
      // This is a leaf
      return [node as SyntaxLeaf];
    }
    
    if (node.children) {
      for (const child of node.children) {
        leaves.push(...this.getAllLeaves(child));
      }
    }
    
    return leaves;
  }
  
  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }
}