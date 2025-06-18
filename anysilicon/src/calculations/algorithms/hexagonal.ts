import type { DiePerWaferParams, DiePerWaferResult } from '../types.js';

export function calculateHexagonalPlacement(
  params: Required<DiePerWaferParams>
): Omit<DiePerWaferResult, 'visualization_url'> {
  const { wafer_diameter, die_width, die_height, scribe_lane, edge_exclusion } = params;

  // Calculate effective diameter after edge exclusion
  const effectiveDiameter = wafer_diameter - 2 * edge_exclusion;
  const effectiveRadius = effectiveDiameter / 2;

  // Die dimensions including scribe lane
  const dieWidthWithScribe = die_width + scribe_lane;
  const dieHeightWithScribe = die_height + scribe_lane;

  // Hexagonal packing parameters
  const horizontalSpacing = dieWidthWithScribe;
  const verticalSpacing = dieHeightWithScribe * 0.866; // sqrt(3)/2 for hexagonal packing

  let totalDies = 0;
  const diesPerRow: number[] = [];

  // Calculate dies for even and odd rows
  let rowIndex = 0;
  let y = -effectiveRadius + dieHeightWithScribe / 2;

  while (y <= effectiveRadius - dieHeightWithScribe / 2) {
    const isOddRow = rowIndex % 2 === 1;
    
    // Calculate x range for this row
    const xMax = Math.sqrt(effectiveRadius * effectiveRadius - y * y);
    
    // Offset for odd rows (hexagonal packing)
    const xOffset = isOddRow ? horizontalSpacing / 2 : 0;
    
    // Calculate number of dies that fit in this row
    let diesInRow = 0;
    
    // For even rows
    if (!isOddRow) {
      diesInRow = Math.floor((2 * xMax) / horizontalSpacing);
    } else {
      // For odd rows, account for the offset
      const availableWidth = 2 * xMax - xOffset;
      if (availableWidth > 0) {
        diesInRow = Math.floor(availableWidth / horizontalSpacing);
      }
    }
    
    if (diesInRow > 0) {
      diesPerRow.push(diesInRow);
      totalDies += diesInRow;
    }

    y += verticalSpacing;
    rowIndex++;
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
    algorithm_used: 'hexagonal',
    calculation_details: {
      effective_diameter: effectiveDiameter,
      die_area: dieArea,
      dies_per_row: diesPerRow,
      placement_efficiency: parseFloat((utilizedArea / (Math.PI * Math.pow(effectiveRadius, 2)) * 100).toFixed(2)),
    },
  };
}