// Common types for Yosys MCP

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration?: number;
}

export interface ToolResult {
  success: boolean;
  error?: string;
  metadata?: {
    executionTime?: number;
    command?: string;
    version?: string;
  };
}

// Synthesis results
export interface SynthesisResult extends ToolResult {
  data?: {
    netlist?: string;
    stats?: {
      modules: number;
      wires: number;
      memories: number;
      processes: number;
      cells: {
        total: number;
        byType: Record<string, number>;
      };
    };
    gateCount?: number;
    registerCount?: number;
    lutCount?: number;
  };
  warnings?: string[];
  outputFile?: string;
}

// Analysis results
export interface AnalysisResult extends ToolResult {
  type: 'stats' | 'check' | 'hierarchy' | 'resources';
  data: StatsData | CheckData | HierarchyData | ResourceData;
}

export interface StatsData {
  modules: ModuleStats[];
  summary: {
    totalModules: number;
    totalCells: number;
    totalWires: number;
    totalPorts: number;
  };
}

export interface ModuleStats {
  name: string;
  cells: number;
  wires: number;
  inputPorts: number;
  outputPorts: number;
  memories: number;
  processes: number;
  cellTypes: Record<string, number>;
}

export interface CheckData {
  passed: boolean;
  errors: CheckIssue[];
  warnings: CheckIssue[];
}

export interface CheckIssue {
  type: string;
  message: string;
  location?: string;
  severity: 'error' | 'warning';
}

export interface HierarchyData {
  topModule: string;
  modules: HierarchyNode[];
}

export interface HierarchyNode {
  name: string;
  type: string;
  instances: number;
  children: HierarchyNode[];
}

export interface ResourceData {
  luts: number;
  registers: number;
  blockRams: number;
  dsp: number;
  io: number;
  clocks: number;
  estimated?: {
    area?: number;
    power?: number;
    frequency?: number;
  };
}

// Visualization result
export interface VisualizationResult extends ToolResult {
  format: 'dot' | 'svg' | 'pdf' | 'png';
  data?: string | { visualization: string }; // Base64 encoded for images or DOT content
  filePath?: string; // Path to generated file
}

// Query result
export interface QueryResult extends ToolResult {
  query: string;
  answer: string;
  context?: {
    modules?: string[];
    metrics?: Record<string, any>;
  };
}

// Project result
export interface ProjectResult extends ToolResult {
  topModule: string;
  synthesizedModules: string[];
  totalStats: StatsData;
  warnings: string[];
  errors: string[];
}

// Configuration types
export interface YosysConfig {
  binaryPath?: string;
  defaultTarget?: 'generic' | 'xilinx' | 'altera' | 'ice40' | 'ecp5';
  techLibPath?: string;
  optimizationLevel?: 0 | 1 | 2 | 3;
  timeout?: number;
  workDir?: string;
}