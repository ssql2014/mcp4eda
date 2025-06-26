export interface KLayoutConfig {
  executable: string;
  pythonPath?: string;
  maxFileSize: number;
  supportedFormats: string[];
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface LayoutInfo {
  format: string;
  topCells: string[];
  layers: LayerInfo[];
  boundingBox: BoundingBox;
  cellCount: number;
  statistics: LayoutStatistics;
}

export interface LayerInfo {
  layer: number;
  datatype: number;
  name?: string;
  shapeCount: number;
}

export interface BoundingBox {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface LayoutStatistics {
  polygons: number;
  paths: number;
  boxes: number;
  texts: number;
  instances: number;
}

export interface DRCResult {
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  count: number;
  violations: DRCViolation[];
}

export interface DRCViolation {
  location: BoundingBox;
  cell: string;
  description: string;
}

export interface LVSResult {
  status: 'clean' | 'failed' | 'error';
  netlistMismatches: number;
  deviceMismatches: number;
  connectivityErrors: number;
  details: string;
}

export interface ConversionOptions {
  inputFormat?: string;
  outputFormat?: string;
  scale?: number;
  mergeReferences?: boolean;
  layerMap?: Record<string, string>;
}

export interface MeasurementResult {
  type: 'distance' | 'area' | 'perimeter';
  value: number;
  unit: string;
  details?: Record<string, any>;
}

export interface ScriptExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
}