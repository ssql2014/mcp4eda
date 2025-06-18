export type WaferDiameter = 150 | 200 | 300 | 450;

export interface DiePerWaferParams {
  wafer_diameter: WaferDiameter;
  die_width: number; // mm, min: 0.1, max: wafer_diameter
  die_height: number; // mm, min: 0.1, max: wafer_diameter
  scribe_lane?: number; // mm, min: 0.05, max: 0.2, default: 0.1
  edge_exclusion?: number; // mm, min: 2, max: 5, default: 3
  algorithm?: 'rectangular' | 'hexagonal'; // default: 'rectangular'
  include_visualization?: boolean; // default: false
}

export interface DiePerWaferResult {
  total_dies: number;
  wafer_area: number; // mm²
  utilized_area: number; // mm²
  utilization_percentage: number; // 0-100
  algorithm_used: string;
  visualization_url?: string;
  calculation_details: {
    effective_diameter: number;
    die_area: number;
    dies_per_row?: number[];
    placement_efficiency: number;
  };
}

export interface YieldParams {
  total_dies: number;
  defect_density: number; // defects per cm²
  die_area: number; // mm²
  alpha?: number; // clustering factor, default: 3
}

export interface YieldResult {
  yield_percentage: number;
  good_dies: number;
  defective_dies: number;
  model_used: string;
}

export interface CostParams {
  wafer_cost: number; // currency units
  total_dies: number;
  yield_percentage: number;
  additional_costs?: {
    processing?: number;
    testing?: number;
    packaging?: number;
  };
}

export interface CostResult {
  cost_per_die: number;
  cost_per_good_die: number;
  cost_breakdown: {
    wafer: number;
    processing: number;
    testing: number;
    packaging: number;
    total: number;
  };
}

export interface BatchConfiguration {
  id: string;
  calculation_type: 'die_per_wafer' | 'yield' | 'cost';
  parameters: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BatchResult {
  id: string;
  calculation_type: string;
  result: DiePerWaferResult | YieldResult | CostResult;
  metadata?: Record<string, unknown>;
  execution_time_ms: number;
}

export interface MPWProject {
  id: string;
  die_width: number;
  die_height: number;
  quantity: number;
}

export interface MPWConfiguration {
  projects: MPWProject[];
  optimization_strategy: 'maximize_dies' | 'minimize_cost';
  wafer_diameter?: WaferDiameter; // default: 300
}

export interface MPWResult {
  total_dies_placed: number;
  projects_placement: Array<{
    project_id: string;
    quantity_placed: number;
    coordinates: Array<{ x: number; y: number }>;
  }>;
  utilization_percentage: number;
  optimization_score: number;
}

export interface StandardWaferInfo {
  diameter: WaferDiameter;
  area: number; // mm²
  typical_edge_exclusion: number; // mm
  common_applications: string[];
  typical_defect_density_range: {
    min: number;
    max: number;
    unit: string;
  };
}