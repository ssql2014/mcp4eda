export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  cached?: boolean;
  executionTime?: number;
}

export interface ModuleInfo {
  name: string;
  file: string;
  ports: PortInfo[];
  parameters: ParameterInfo[];
  interfaces?: InterfaceInfo[];
  clockDomains?: ClockDomain[];
}

export interface PortInfo {
  name: string;
  direction: 'input' | 'output' | 'inout';
  width: number;
  type: 'wire' | 'reg' | 'logic' | 'bit' | 'interface';
  signed?: boolean;
  arrayDimensions?: number[];
}

export interface ParameterInfo {
  name: string;
  type: 'integer' | 'real' | 'string' | 'bit' | 'logic';
  defaultValue?: any;
  value?: any;
}

export interface InterfaceInfo {
  name: string;
  type: string;
  modports?: string[];
}

export interface ClockDomain {
  name: string;
  frequency?: number;
  phase?: number;
  resetSignal?: string;
  resetPolarity?: 'active_high' | 'active_low';
}

export interface SimulationOptions {
  timeout?: number;
  enableWaveform?: boolean;
  waveformFormat?: 'vcd' | 'fst' | 'lxt2';
  enableCoverage?: boolean;
  coverageTypes?: ('line' | 'toggle' | 'functional' | 'branch')[];
  enableAssertions?: boolean;
  optimizationLevel?: 0 | 1 | 2 | 3;
  defines?: Record<string, string | number>;
  plusargs?: Record<string, string | number>;
}

export interface SimulationResult {
  passed: boolean;
  simulationTime: number;
  realTime: number;
  logFile?: string;
  waveformFile?: string;
  coverageFile?: string;
  assertions?: AssertionResult[];
  errors?: string[];
  warnings?: string[];
  statistics?: SimulationStatistics;
}

export interface AssertionResult {
  name: string;
  file: string;
  line: number;
  type: 'assert' | 'assume' | 'cover';
  passed: boolean;
  failures: number;
  message?: string;
  time?: number;
}

export interface SimulationStatistics {
  cycleCount: number;
  eventCount: number;
  memoryUsage: number;
  cpuTime: number;
}

export interface TestbenchOptions {
  targetModule: string;
  testbenchName?: string;
  outputFile?: string;
  template?: 'basic' | 'uvm' | 'cocotb' | 'protocol';
  protocol?: 'axi' | 'apb' | 'wishbone' | 'avalon' | 'custom';
  stimulusType?: 'directed' | 'random' | 'constrained_random' | 'sequence';
  clockPeriod?: number;
  resetDuration?: number;
  simulationTime?: number;
  generateAssertions?: boolean;
  generateCoverage?: boolean;
  generateCheckers?: boolean;
}

export interface TestbenchResult {
  generatedFile: string;
  moduleInfo: ModuleInfo;
  template: string;
  features: string[];
  warnings?: string[];
}

export interface WaveformQuery {
  waveformFile: string;
  signal?: string;
  timeRange?: [number, number];
  signals?: string[];
  format?: 'json' | 'csv' | 'text';
}

export interface WaveformData {
  signals: SignalData[];
  timeRange: [number, number];
  timeUnit: string;
}

export interface SignalData {
  name: string;
  width: number;
  values: SignalValue[];
}

export interface SignalValue {
  time: number;
  value: string | number;
  isX?: boolean;
  isZ?: boolean;
}

export interface CoverageData {
  summary: CoverageSummary;
  details: CoverageDetail[];
  uncoveredPoints?: UncoveredPoint[];
}

export interface CoverageSummary {
  line: number;
  toggle: number;
  functional: number;
  branch: number;
  overall: number;
}

export interface CoverageDetail {
  file: string;
  module: string;
  line?: number;
  toggle?: number;
  functional?: number;
  branch?: number;
}

export interface UncoveredPoint {
  type: 'line' | 'toggle' | 'functional' | 'branch';
  file: string;
  line?: number;
  signal?: string;
  description: string;
}

export interface NaturalLanguageQuery {
  query: string;
  context?: SimulationContext;
  history?: QueryHistory[];
}

export interface SimulationContext {
  currentSimulation?: {
    design: string;
    testbench: string;
    waveformFile?: string;
    coverageFile?: string;
    assertionResults?: AssertionResult[];
  };
  debugState?: {
    breakpoints?: string[];
    watchedSignals?: string[];
    currentTime?: number;
  };
}

export interface QueryHistory {
  query: string;
  response: string;
  timestamp: number;
  category: 'debug' | 'analysis' | 'coverage' | 'generation' | 'explanation';
}

export interface NaturalLanguageResponse {
  answer: string;
  category: string;
  confidence: number;
  suggestions?: string[];
  references?: {
    signals?: string[];
    times?: number[];
    files?: string[];
    lines?: number[];
  };
  actions?: {
    type: 'navigate' | 'highlight' | 'generate' | 'analyze';
    target: string;
    parameters?: any;
  }[];
}