import { calculateRectangularPlacement } from './algorithms/rectangular.js';
import { calculateHexagonalPlacement } from './algorithms/hexagonal.js';
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

    // Add safety check for die dimensions
    if (normalizedParams.die_width >= normalizedParams.wafer_diameter ||
        normalizedParams.die_height >= normalizedParams.wafer_diameter) {
      throw new ValidationError('Die dimensions exceed wafer diameter');
    }

    // Calculate based on selected algorithm
    let result: Omit<DiePerWaferResult, 'visualization_url'>;
    
    switch (normalizedParams.algorithm) {
      case 'rectangular':
        result = calculateRectangularPlacement(normalizedParams);
        break;
      case 'hexagonal':
        result = calculateHexagonalPlacement(normalizedParams);
        break;
      default:
        throw new ValidationError(`Unknown algorithm: ${normalizedParams.algorithm}`);
    }

    // Add visualization URL if requested
    if (normalizedParams.include_visualization) {
      // TODO: Implement visualization generation
      return {
        ...result,
        visualization_url: 'visualization-not-implemented',
      };
    }

    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Unexpected calculation error', { 
      originalError: error instanceof Error ? error.message : String(error) 
    });
  }
}

export function compareAlgorithms(params: DiePerWaferParams): {
  rectangular: DiePerWaferResult;
  hexagonal: DiePerWaferResult;
  recommendation: string;
} {
  const rectangularResult = calculateDiePerWafer({ ...params, algorithm: 'rectangular' });
  const hexagonalResult = calculateDiePerWafer({ ...params, algorithm: 'hexagonal' });

  const improvement = 
    ((hexagonalResult.total_dies - rectangularResult.total_dies) / rectangularResult.total_dies) * 100;

  let recommendation: string;
  if (improvement > 5) {
    recommendation = `Hexagonal placement recommended: ${improvement.toFixed(1)}% more dies`;
  } else if (improvement < -5) {
    recommendation = `Rectangular placement recommended: ${Math.abs(improvement).toFixed(1)}% more dies`;
  } else {
    recommendation = 'Both algorithms yield similar results';
  }

  return {
    rectangular: rectangularResult,
    hexagonal: hexagonalResult,
    recommendation,
  };
}