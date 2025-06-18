import { validateDiePerWaferParams, normalizeParams } from '../utils/validation.js';
import { ValidationError } from '../errors/index.js';
import type { DiePerWaferParams, DiePerWaferResult } from './types.js';

export function calculateDiePerWafer(params: DiePerWaferParams): DiePerWaferResult {
  try {
    // Validate parameters
    const validation = validateDiePerWaferParams(params);
    if (!validation.valid) {
      throw new ValidationError('Invalid parameters', { errors: validation.errors });
    }

    // Normalize parameters with defaults
    const normalizedParams = normalizeParams(params);
    const { wafer_diameter, die_width, die_height, scribe_lane, edge_exclusion } = normalizedParams;

    // Add safety check for die dimensions
    if (die_width >= wafer_diameter || die_height >= wafer_diameter) {
      throw new ValidationError('Die dimensions exceed wafer diameter');
    }

    // Apply AnySilicon formula: DPW = d × π × (d/(4×S) - 1/√(2×S))
    // where d = wafer diameter, S = die area (die size in square mm)
    
    // Calculate die area including scribe lanes
    const dieWidthWithScribe = die_width + scribe_lane;
    const dieHeightWithScribe = die_height + scribe_lane;
    const S = dieWidthWithScribe * dieHeightWithScribe; // die area in mm²
    
    // Apply edge exclusion to wafer diameter
    const d = wafer_diameter - 2 * edge_exclusion; // effective diameter
    
    // Calculate using AnySilicon formula
    const totalDies = Math.floor(
      d * Math.PI * (d / (4 * S) - 1 / Math.sqrt(2 * S))
    );

    // Calculate areas
    const waferArea = Math.PI * Math.pow(wafer_diameter / 2, 2);
    const dieArea = die_width * die_height; // actual die area without scribe
    const utilizedArea = totalDies * dieArea;
    const utilizationPercentage = (utilizedArea / waferArea) * 100;
    
    // Calculate effective wafer area after edge exclusion
    const effectiveWaferArea = Math.PI * Math.pow(d / 2, 2);
    const placementEfficiency = (utilizedArea / effectiveWaferArea) * 100;

    return {
      total_dies: totalDies,
      wafer_area: waferArea,
      utilized_area: utilizedArea,
      utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
      calculation_details: {
        effective_diameter: d,
        die_area: dieArea,
        dies_per_row: [], // Not applicable for this formula
        placement_efficiency: parseFloat(placementEfficiency.toFixed(2)),
      },
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Unexpected calculation error', { 
      originalError: error instanceof Error ? error.message : String(error) 
    });
  }
}

