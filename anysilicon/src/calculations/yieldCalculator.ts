import { validateYieldParams } from '../utils/validation.js';
import { DEFAULT_ALPHA } from '../config/defaults.js';
import type { YieldParams, YieldResult } from './types.js';

/**
 * Calculate die yield using the Murphy model
 * Yield = [(1 - e^(-DA/alpha))/(DA/alpha)]^alpha
 * where:
 * - D = defect density (defects/cm²)
 * - A = die area (cm²)
 * - alpha = clustering factor
 */
export function calculateYield(params: YieldParams): YieldResult {
  validateYieldParams(params);

  const { total_dies, defect_density, die_area, alpha = DEFAULT_ALPHA } = params;

  // Convert die area from mm² to cm²
  const dieAreaCm2 = die_area / 100;

  // Calculate DA (defect density × area)
  const DA = defect_density * dieAreaCm2;

  // Murphy model calculation
  let yieldFraction: number;
  
  if (DA === 0) {
    yieldFraction = 1; // Perfect yield with no defects
  } else {
    const term = (1 - Math.exp(-DA / alpha)) / (DA / alpha);
    yieldFraction = Math.pow(term, alpha);
  }

  // Calculate results
  const yieldPercentage = yieldFraction * 100;
  const goodDies = Math.floor(total_dies * yieldFraction);
  const defectiveDies = total_dies - goodDies;

  return {
    yield_percentage: parseFloat(yieldPercentage.toFixed(2)),
    good_dies: goodDies,
    defective_dies: defectiveDies,
    model_used: 'Murphy',
  };
}

/**
 * Calculate yield using the Poisson model (simpler alternative)
 * Yield = e^(-DA)
 */
export function calculatePoissonYield(params: YieldParams): YieldResult {
  validateYieldParams(params);

  const { total_dies, defect_density, die_area } = params;

  // Convert die area from mm² to cm²
  const dieAreaCm2 = die_area / 100;

  // Calculate DA (defect density × area)
  const DA = defect_density * dieAreaCm2;

  // Poisson model calculation
  const yieldFraction = Math.exp(-DA);

  // Calculate results
  const yieldPercentage = yieldFraction * 100;
  const goodDies = Math.floor(total_dies * yieldFraction);
  const defectiveDies = total_dies - goodDies;

  return {
    yield_percentage: parseFloat(yieldPercentage.toFixed(2)),
    good_dies: goodDies,
    defective_dies: defectiveDies,
    model_used: 'Poisson',
  };
}

/**
 * Compare different yield models
 */
export function compareYieldModels(params: YieldParams): {
  murphy: YieldResult;
  poisson: YieldResult;
  recommendation: string;
} {
  const murphyResult = calculateYield(params);
  const poissonResult = calculatePoissonYield(params);

  const difference = Math.abs(murphyResult.yield_percentage - poissonResult.yield_percentage);

  let recommendation: string;
  if (difference < 5) {
    recommendation = 'Both models give similar results; Poisson model is simpler';
  } else {
    recommendation = 'Murphy model recommended for more accurate results with defect clustering';
  }

  return {
    murphy: murphyResult,
    poisson: poissonResult,
    recommendation,
  };
}