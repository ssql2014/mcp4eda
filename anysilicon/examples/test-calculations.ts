#!/usr/bin/env tsx
/**
 * Test script to demonstrate AnySilicon MCP calculations
 * Run with: npx tsx examples/test-calculations.ts
 */

import { calculateDiePerWafer, compareAlgorithms } from '../src/calculations/diePerWafer.js';
import { calculateYield, compareYieldModels } from '../src/calculations/yieldCalculator.js';
import { STANDARD_WAFER_SIZES } from '../src/config/defaults.js';

console.log('=== AnySilicon MCP Calculation Examples ===\n');

// Example 1: Basic die per wafer calculation
console.log('1. Basic Die Per Wafer Calculation');
console.log('   300mm wafer, 10x10mm dies');
try {
  const result1 = calculateDiePerWafer({
    wafer_diameter: 300,
    die_width: 10,
    die_height: 10,
    scribe_lane: 0.1,
    edge_exclusion: 3,
    algorithm: 'rectangular',
  });
  console.log(`   Result: ${result1.total_dies} dies`);
  console.log(`   Utilization: ${result1.utilization_percentage}%`);
  console.log(`   Wafer area: ${result1.wafer_area.toFixed(2)} mm²\n`);
} catch (error) {
  console.error('   Error:', error);
}

// Example 2: Compare algorithms
console.log('2. Algorithm Comparison');
console.log('   300mm wafer, 7x7mm dies');
try {
  const comparison = compareAlgorithms({
    wafer_diameter: 300,
    die_width: 7,
    die_height: 7,
    scribe_lane: 0.1,
    edge_exclusion: 3,
  });
  console.log(`   Rectangular: ${comparison.rectangular.total_dies} dies (${comparison.rectangular.utilization_percentage}%)`);
  console.log(`   Hexagonal: ${comparison.hexagonal.total_dies} dies (${comparison.hexagonal.utilization_percentage}%)`);
  console.log(`   ${comparison.recommendation}\n`);
} catch (error) {
  console.error('   Error:', error);
}

// Example 3: Different wafer sizes
console.log('3. Wafer Size Comparison (10x10mm dies)');
const waferSizes: Array<150 | 200 | 300 | 450> = [150, 200, 300, 450];
waferSizes.forEach(size => {
  try {
    const result = calculateDiePerWafer({
      wafer_diameter: size,
      die_width: 10,
      die_height: 10,
      algorithm: 'hexagonal',
    });
    console.log(`   ${size}mm wafer: ${result.total_dies} dies (${result.utilization_percentage}% utilization)`);
  } catch (error) {
    console.error(`   Error for ${size}mm:`, error);
  }
});
console.log();

// Example 4: Yield calculations
console.log('4. Yield Calculations');
console.log('   706 dies, 100mm² die area');
const defectDensities = [0.01, 0.05, 0.1];
defectDensities.forEach(dd => {
  try {
    const yield_result = calculateYield({
      total_dies: 706,
      defect_density: dd,
      die_area: 100,
      alpha: 3,
    });
    console.log(`   Defect density ${dd}/cm²: ${yield_result.yield_percentage}% yield (${yield_result.good_dies} good dies)`);
  } catch (error) {
    console.error(`   Error for DD ${dd}:`, error);
  }
});
console.log();

// Example 5: Standard wafer information
console.log('5. Standard Wafer Sizes');
Object.entries(STANDARD_WAFER_SIZES).forEach(([size, info]) => {
  console.log(`   ${size}mm: ${info.common_applications.join(', ')}`);
  console.log(`           Typical edge exclusion: ${info.typical_edge_exclusion}mm`);
  console.log(`           Defect density range: ${info.typical_defect_density_range.min}-${info.typical_defect_density_range.max} ${info.typical_defect_density_range.unit}`);
});
console.log();

// Example 6: Yield model comparison
console.log('6. Yield Model Comparison');
try {
  const yieldComparison = compareYieldModels({
    total_dies: 706,
    defect_density: 0.05,
    die_area: 100,
    alpha: 3,
  });
  console.log(`   Murphy model: ${yieldComparison.murphy.yield_percentage}% yield`);
  console.log(`   Poisson model: ${yieldComparison.poisson.yield_percentage}% yield`);
  console.log(`   ${yieldComparison.recommendation}\n`);
} catch (error) {
  console.error('   Error:', error);
}

// Example 7: Edge exclusion impact
console.log('7. Edge Exclusion Impact (300mm wafer, 10x10mm dies)');
const edgeExclusions = [2, 3, 4, 5];
edgeExclusions.forEach(ee => {
  try {
    const result = calculateDiePerWafer({
      wafer_diameter: 300,
      die_width: 10,
      die_height: 10,
      edge_exclusion: ee,
      algorithm: 'hexagonal',
    });
    console.log(`   ${ee}mm exclusion: ${result.total_dies} dies`);
  } catch (error) {
    console.error(`   Error for ${ee}mm:`, error);
  }
});

console.log('\n=== Calculations Complete ===');