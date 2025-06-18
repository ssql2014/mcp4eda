import { ValidationError } from '../errors/index.js';
import {
  DEFAULT_SCRIBE_LANE,
  DEFAULT_EDGE_EXCLUSION,
  SCRIBE_LANE_RANGE,
  EDGE_EXCLUSION_RANGE,
  DIE_SIZE_MIN,
} from '../config/defaults.js';
import type { DiePerWaferParams, WaferDiameter } from '../calculations/types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export function isValidWaferDiameter(diameter: number): diameter is WaferDiameter {
  return diameter === 150 || diameter === 200 || diameter === 300 || diameter === 450;
}

export function validateDiePerWaferParams(params: DiePerWaferParams): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate wafer diameter
  if (!isValidWaferDiameter(params.wafer_diameter)) {
    errors.push(
      `Invalid wafer diameter: ${params.wafer_diameter}. Must be one of: 150, 200, 300, 450 mm`
    );
  }

  // Validate die dimensions
  if (params.die_width < DIE_SIZE_MIN) {
    errors.push(`Die width must be at least ${DIE_SIZE_MIN} mm`);
  }
  if (params.die_height < DIE_SIZE_MIN) {
    errors.push(`Die height must be at least ${DIE_SIZE_MIN} mm`);
  }

  // Validate scribe lane
  const scribeLane = params.scribe_lane ?? DEFAULT_SCRIBE_LANE;
  if (scribeLane < SCRIBE_LANE_RANGE.min || scribeLane > SCRIBE_LANE_RANGE.max) {
    errors.push(
      `Scribe lane must be between ${SCRIBE_LANE_RANGE.min} and ${SCRIBE_LANE_RANGE.max} mm`
    );
  }

  // Validate edge exclusion
  const edgeExclusion = params.edge_exclusion ?? DEFAULT_EDGE_EXCLUSION;
  if (edgeExclusion < EDGE_EXCLUSION_RANGE.min || edgeExclusion > EDGE_EXCLUSION_RANGE.max) {
    errors.push(
      `Edge exclusion must be between ${EDGE_EXCLUSION_RANGE.min} and ${EDGE_EXCLUSION_RANGE.max} mm`
    );
  }

  // Check if die fits on wafer
  if (isValidWaferDiameter(params.wafer_diameter)) {
    const maxDimension = params.wafer_diameter - 2 * edgeExclusion;
    if (params.die_width > maxDimension) {
      errors.push(
        `Die width (${params.die_width} mm) exceeds maximum allowed (${maxDimension} mm) for this wafer`
      );
    }
    if (params.die_height > maxDimension) {
      errors.push(
        `Die height (${params.die_height} mm) exceeds maximum allowed (${maxDimension} mm) for this wafer`
      );
    }
  }

  // Warnings
  if (params.die_width > params.wafer_diameter / 2 || params.die_height > params.wafer_diameter / 2) {
    warnings.push('Die size is very large relative to wafer size, resulting in poor utilization');
  }

  if (scribeLane < 0.08) {
    warnings.push('Very narrow scribe lane may cause dicing issues');
  }

  // Suggestions
  if (params.die_width !== params.die_height) {
    suggestions.push('Consider rotating the die 90° to see if it improves utilization');
  }

  if (!params.algorithm || params.algorithm === 'rectangular') {
    suggestions.push('Try hexagonal placement algorithm for potentially better utilization');
  }

  const dieArea = params.die_width * params.die_height;
  if (dieArea < 25) {
    suggestions.push('Small dies may benefit from larger scribe lanes for easier handling');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

export function normalizeParams(params: DiePerWaferParams): Required<DiePerWaferParams> {
  return {
    wafer_diameter: params.wafer_diameter,
    die_width: params.die_width,
    die_height: params.die_height,
    scribe_lane: params.scribe_lane ?? DEFAULT_SCRIBE_LANE,
    edge_exclusion: params.edge_exclusion ?? DEFAULT_EDGE_EXCLUSION,
    algorithm: params.algorithm ?? 'rectangular',
    include_visualization: params.include_visualization ?? false,
  };
}

export function validateYieldParams(params: {
  total_dies: number;
  defect_density: number;
  die_area: number;
  alpha?: number;
}): void {
  if (params.total_dies <= 0) {
    throw new ValidationError('Total dies must be positive');
  }
  if (params.defect_density < 0) {
    throw new ValidationError('Defect density cannot be negative');
  }
  if (params.die_area <= 0) {
    throw new ValidationError('Die area must be positive');
  }
  if (params.alpha !== undefined && params.alpha <= 0) {
    throw new ValidationError('Alpha (clustering factor) must be positive');
  }
}

export function validateCostParams(params: {
  wafer_cost: number;
  total_dies: number;
  yield_percentage: number;
}): void {
  if (params.wafer_cost < 0) {
    throw new ValidationError('Wafer cost cannot be negative');
  }
  if (params.total_dies <= 0) {
    throw new ValidationError('Total dies must be positive');
  }
  if (params.yield_percentage < 0 || params.yield_percentage > 100) {
    throw new ValidationError('Yield percentage must be between 0 and 100');
  }
}