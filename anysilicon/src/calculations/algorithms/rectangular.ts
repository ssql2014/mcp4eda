import type { DiePerWaferParams, DiePerWaferResult } from '../types.js';

export function calculateRectangularPlacement(
  params: Required<DiePerWaferParams>
): Omit<DiePerWaferResult, 'visualization_url'> {
  const { wafer_diameter, die_width, die_height, scribe_lane, edge_exclusion } = params;

  // Calculate effective diameter after edge exclusion
  const effectiveDiameter = wafer_diameter - 2 * edge_exclusion;
  const effectiveRadius = effectiveDiameter / 2;

  // Die dimensions including scribe lane
  const dieWidthWithScribe = die_width + scribe_lane;
  const dieHeightWithScribe = die_height + scribe_lane;

  // Calculate dies per row for different y positions
  const diesPerRow: number[] = [];
  let totalDies = 0;

  // Start from bottom of wafer and work up
  let y = -effectiveRadius + dieHeightWithScribe / 2;

  while (y <= effectiveRadius - dieHeightWithScribe / 2) {
    // Calculate x range for this row
    const xMax = Math.sqrt(effectiveRadius * effectiveRadius - y * y);
    
    // Calculate number of dies that fit in this row
    const diesInRow = Math.floor((2 * xMax) / dieWidthWithScribe);
    
    if (diesInRow > 0) {
      diesPerRow.push(diesInRow);
      totalDies += diesInRow;
    }

    y += dieHeightWithScribe;
  }

  // Calculate areas
  const waferArea = Math.PI * Math.pow(wafer_diameter / 2, 2);
  const dieArea = die_width * die_height;
  const utilizedArea = totalDies * dieArea;
  const utilizationPercentage = (utilizedArea / waferArea) * 100;

  return {
    total_dies: totalDies,
    wafer_area: waferArea,
    utilized_area: utilizedArea,
    utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
    algorithm_used: 'rectangular',
    calculation_details: {
      effective_diameter: effectiveDiameter,
      die_area: dieArea,
      dies_per_row: diesPerRow,
      placement_efficiency: parseFloat((utilizedArea / (Math.PI * Math.pow(effectiveRadius, 2)) * 100).toFixed(2)),
    },
  };
}