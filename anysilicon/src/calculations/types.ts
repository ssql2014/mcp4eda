export type WaferDiameter = 150 | 200 | 300 | 450;

export interface DiePerWaferParams {
  wafer_diameter: WaferDiameter;
  die_width: number; // mm, min: 0.1, max: wafer_diameter
  die_height: number; // mm, min: 0.1, max: wafer_diameter
  scribe_lane?: number; // mm, min: 0.05, max: 0.2, default: 0.1
  edge_exclusion?: number; // mm, min: 2, max: 5, default: 3
}

export interface DiePerWaferResult {
  total_dies: number;
  wafer_area: number; // mm²
  utilized_area: number; // mm²
  utilization_percentage: number; // 0-100
  calculation_details: {
    effective_diameter: number;
    die_area: number;
    dies_per_row: number[];
    placement_efficiency: number;
    gross_die_count?: number;
    edge_die_loss?: number;
  };
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