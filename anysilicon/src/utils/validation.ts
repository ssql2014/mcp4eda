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
      `Invalid wafer diameter: ${String(params.wafer_diameter)}. Must be one of: 150, 200, 300, 450 mm`
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
  if (params.scribe_lane !== undefined && (scribeLane < SCRIBE_LANE_RANGE.min || scribeLane > SCRIBE_LANE_RANGE.max)) {
    errors.push(
      `Scribe lane must be between ${SCRIBE_LANE_RANGE.min} and ${SCRIBE_LANE_RANGE.max} mm`
    );
  }

  // Validate edge exclusion
  const edgeExclusion = params.edge_exclusion ?? DEFAULT_EDGE_EXCLUSION;
  if (params.edge_exclusion !== undefined && (edgeExclusion < EDGE_EXCLUSION_RANGE.min || edgeExclusion > EDGE_EXCLUSION_RANGE.max)) {
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
  };
}


export function isDiePerWaferParams(obj: unknown): obj is DiePerWaferParams {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'wafer_diameter' in obj &&
    'die_width' in obj &&
    'die_height' in obj &&
    typeof (obj as DiePerWaferParams).wafer_diameter === 'number' &&
    typeof (obj as DiePerWaferParams).die_width === 'number' &&
    typeof (obj as DiePerWaferParams).die_height === 'number'
  );
}

export function sanitizeNumericInput(value: unknown): number {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new ValidationError('Invalid numeric input');
  }
  // Prevent extremely large numbers that could cause DoS
  if (Math.abs(value) > 1e6) {
    throw new ValidationError('Input value exceeds maximum allowed range');
  }
  return value;
}