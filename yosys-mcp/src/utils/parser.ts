import { 
  StatsData, 
  ModuleStats, 
  CheckData, 
  CheckIssue,
  HierarchyData,
  HierarchyNode,
  ResourceData 
} from '../types/index.js';
import { logger } from './logger.js';

export class YosysParser {
  /**
   * Parse stat command output
   */
  static parseStats(output: string): StatsData {
    const modules: ModuleStats[] = [];
    const lines = output.split('\n');
    
    let currentModule: ModuleStats | null = null;
    let inModuleSection = false;
    let totalCells = 0;
    let totalWires = 0;
    let totalPorts = 0;

    for (const line of lines) {
      // Module header
      const moduleMatch = line.match(/^=== (\S+) ===/);
      if (moduleMatch) {
        if (currentModule) {
          modules.push(currentModule);
        }
        currentModule = {
          name: moduleMatch[1],
          cells: 0,
          wires: 0,
          inputPorts: 0,
          outputPorts: 0,
          memories: 0,
          processes: 0,
          cellTypes: {},
        };
        inModuleSection = true;
        continue;
      }

      if (!inModuleSection || !currentModule) continue;

      // Parse statistics
      const statsPatterns = [
        { regex: /Number of wires:\s+(\d+)/, field: 'wires' },
        { regex: /Number of wire bits:\s+(\d+)/, field: 'wireBits' },
        { regex: /Number of public wires:\s+(\d+)/, field: 'publicWires' },
        { regex: /Number of memories:\s+(\d+)/, field: 'memories' },
        { regex: /Number of processes:\s+(\d+)/, field: 'processes' },
        { regex: /Number of cells:\s+(\d+)/, field: 'cells' },
      ];

      for (const { regex, field } of statsPatterns) {
        const match = line.match(regex);
        if (match) {
          (currentModule as any)[field] = parseInt(match[1], 10);
          
          // Update totals
          if (field === 'cells') totalCells += parseInt(match[1], 10);
          if (field === 'wires') totalWires += parseInt(match[1], 10);
        }
      }

      // Parse cell types
      const cellTypeMatch = line.match(/^\s+(\S+)\s+(\d+)/);
      if (cellTypeMatch && !line.includes('Number of')) {
        currentModule.cellTypes[cellTypeMatch[1]] = parseInt(cellTypeMatch[2], 10);
      }

      // Parse ports (simplified - would need more complex parsing for accurate counts)
      if (line.includes('input') && line.includes('wire')) {
        currentModule.inputPorts++;
        totalPorts++;
      }
      if (line.includes('output') && line.includes('wire')) {
        currentModule.outputPorts++;
        totalPorts++;
      }
    }

    // Add last module
    if (currentModule) {
      modules.push(currentModule);
    }

    return {
      modules,
      summary: {
        totalModules: modules.length,
        totalCells,
        totalWires,
        totalPorts,
      },
    };
  }

  /**
   * Parse check command output
   */
  static parseCheck(output: string): CheckData {
    const errors: CheckIssue[] = [];
    const warnings: CheckIssue[] = [];
    const lines = output.split('\n');
    let passed = true;

    for (const line of lines) {
      if (line.includes('ERROR:')) {
        passed = false;
        const match = line.match(/ERROR:\s*(.+?)(?:\s+in\s+(.+?))?$/);
        if (match) {
          errors.push({
            type: 'error',
            message: match[1],
            location: match[2],
            severity: 'error',
          });
        }
      } else if (line.includes('Warning:') || line.includes('WARNING:')) {
        const match = line.match(/(?:Warning|WARNING):\s*(.+?)(?:\s+in\s+(.+?))?$/);
        if (match) {
          warnings.push({
            type: 'warning',
            message: match[1],
            location: match[2],
            severity: 'warning',
          });
        }
      }
    }

    // Check for specific issues
    if (output.includes('found and reported') && output.includes('problems')) {
      const match = output.match(/found and reported (\d+) problems/);
      if (match && parseInt(match[1]) > 0) {
        passed = false;
      }
    }

    return {
      passed,
      errors,
      warnings,
    };
  }

  /**
   * Parse hierarchy output
   */
  static parseHierarchy(output: string): HierarchyData {
    const lines = output.split('\n');
    const modules: HierarchyNode[] = [];
    let topModule = '';
    const moduleStack: HierarchyNode[] = [];

    for (const line of lines) {
      // Skip empty lines and headers
      if (!line.trim() || line.includes('Hierarchy tree:')) continue;

      // Count indentation level
      const indent = line.search(/\S/);
      const level = Math.floor(indent / 2);

      // Extract module info
      const match = line.match(/(\S+)\s+\((\S+)\)(?:\s+\((\d+) instances?\))?/);
      if (!match) continue;

      const node: HierarchyNode = {
        name: match[1],
        type: match[2],
        instances: parseInt(match[3] || '1', 10),
        children: [],
      };

      // First module is top
      if (!topModule) {
        topModule = node.name;
      }

      // Build hierarchy
      if (level === 0) {
        modules.push(node);
        moduleStack[0] = node;
      } else {
        // Find parent at correct level
        while (moduleStack.length > level) {
          moduleStack.pop();
        }
        
        const parent = moduleStack[level - 1];
        if (parent) {
          parent.children.push(node);
          moduleStack[level] = node;
        }
      }
    }

    return {
      topModule,
      modules,
    };
  }

  /**
   * Parse resource utilization (FPGA specific)
   */
  static parseResources(output: string, _target: string): ResourceData {
    const resources: ResourceData = {
      luts: 0,
      registers: 0,
      blockRams: 0,
      dsp: 0,
      io: 0,
      clocks: 0,
    };

    const lines = output.split('\n');

    // Generic patterns that work across different targets
    const patterns = {
      luts: [
        /LUT\d+\s+(\d+)/,
        /\$lut\s+(\d+)/,
        /SB_LUT4\s+(\d+)/, // ice40
        /LUT4\s+(\d+)/,
      ],
      registers: [
        /DFF\w*\s+(\d+)/,
        /\$dff\s+(\d+)/,
        /FD\w+\s+(\d+)/, // xilinx
        /SB_DFF\w*\s+(\d+)/, // ice40
      ],
      blockRams: [
        /BRAM\w*\s+(\d+)/,
        /RAM\d+\w*\s+(\d+)/,
        /SB_RAM\w*\s+(\d+)/, // ice40
      ],
      dsp: [
        /DSP\w*\s+(\d+)/,
        /MULT\w*\s+(\d+)/,
        /SB_MAC\w*\s+(\d+)/, // ice40
      ],
      io: [
        /IO\w*\s+(\d+)/,
        /SB_IO\s+(\d+)/, // ice40
        /OBUF\s+(\d+)/, // xilinx
        /IBUF\s+(\d+)/, // xilinx
      ],
      clocks: [
        /BUFG\w*\s+(\d+)/,
        /SB_GB\s+(\d+)/, // ice40
        /CLKBUF\s+(\d+)/,
      ],
    };

    // Parse each resource type
    for (const [resource, patternList] of Object.entries(patterns)) {
      let total = 0;
      for (const pattern of patternList) {
        for (const line of lines) {
          const match = line.match(pattern);
          if (match) {
            total += parseInt(match[1], 10);
          }
        }
      }
      (resources as any)[resource] = total;
    }

    // Parse estimated metrics if available
    const areaMatch = output.match(/Chip area for \w+:\s+([\d.]+)/);
    if (areaMatch) {
      resources.estimated = resources.estimated || {};
      resources.estimated.area = parseFloat(areaMatch[1]);
    }

    const freqMatch = output.match(/Max frequency for \w+:\s+([\d.]+)\s*MHz/);
    if (freqMatch) {
      resources.estimated = resources.estimated || {};
      resources.estimated.frequency = parseFloat(freqMatch[1]);
    }

    return resources;
  }

  /**
   * Parse JSON output from write_json
   */
  static parseJson(jsonStr: string): any {
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error('Failed to parse Yosys JSON output:', error);
      throw new Error('Invalid JSON output from Yosys');
    }
  }

  /**
   * Extract module list from output
   */
  static extractModules(output: string): string[] {
    const modules: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Look for module definitions
      const moduleMatch = line.match(/module\s+(\w+)/);
      if (moduleMatch) {
        modules.push(moduleMatch[1]);
      }

      // Also check stat output format
      const statMatch = line.match(/^=== (\S+) ===/);
      if (statMatch) {
        modules.push(statMatch[1]);
      }
    }

    return [...new Set(modules)]; // Remove duplicates
  }

  /**
   * Parse synthesis summary
   */
  static parseSynthesisSummary(output: string): {
    gateCount: number;
    registerCount: number;
    lutCount: number;
    warnings: string[];
  } {
    let gateCount = 0;
    let registerCount = 0;
    let lutCount = 0;
    const warnings = this.extractWarnings(output);

    // Count gates (simplified - counts all cells)
    const cellMatches = output.matchAll(/\s+(\S+)\s+(\d+)/g);
    for (const match of cellMatches) {
      const cellType = match[1];
      const count = parseInt(match[2], 10);

      // Categorize cell types
      if (cellType.includes('LUT') || cellType.includes('lut')) {
        lutCount += count;
      } else if (cellType.includes('DFF') || cellType.includes('FF') || 
                 cellType.includes('dff') || cellType.includes('_reg')) {
        registerCount += count;
      }
      
      // All cells contribute to gate count
      if (!cellType.includes('Number')) {
        gateCount += count;
      }
    }

    return {
      gateCount,
      registerCount,
      lutCount,
      warnings,
    };
  }

  /**
   * Extract warnings from output
   */
  static extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Warning:') || line.includes('WARNING:')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}