# Basic Die Per Wafer Calculations

This example demonstrates basic die per wafer calculations using the AnySilicon MCP server.

## Example 1: Small Logic Chip on 300mm Wafer

Calculate how many 10x10mm dies fit on a 300mm wafer:

### Request
```json
{
  "tool": "calculate_die_per_wafer",
  "parameters": {
    "wafer_diameter": 300,
    "die_width": 10,
    "die_height": 10,
    "scribe_lane": 0.1,
    "edge_exclusion": 3,
    "algorithm": "rectangular"
  }
}
```

### Expected Response
```json
{
  "total_dies": 628,
  "wafer_area": 70685.83,
  "utilized_area": 62800,
  "utilization_percentage": 88.84,
  "algorithm_used": "rectangular",
  "calculation_details": {
    "effective_diameter": 294,
    "die_area": 100,
    "dies_per_row": [27, 28, 28, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 28, 28, 27],
    "placement_efficiency": 91.85
  }
}
```

## Example 2: Memory Chip with Hexagonal Placement

Calculate using hexagonal placement for better utilization:

### Request
```json
{
  "tool": "calculate_die_per_wafer",
  "parameters": {
    "wafer_diameter": 300,
    "die_width": 8,
    "die_height": 12,
    "scribe_lane": 0.08,
    "edge_exclusion": 3,
    "algorithm": "hexagonal"
  }
}
```

### Expected Response
```json
{
  "total_dies": 682,
  "wafer_area": 70685.83,
  "utilized_area": 65472,
  "utilization_percentage": 92.62,
  "algorithm_used": "hexagonal",
  "calculation_details": {
    "effective_diameter": 294,
    "die_area": 96,
    "dies_per_row": [30, 30, 31, 31, 32, 32, 32, 32, 33, 33, 33, 33, 33, 33, 33, 33, 32, 32, 32, 32, 31, 31, 30, 30],
    "placement_efficiency": 95.72
  }
}
```

## Example 3: Power Device on 200mm Wafer

Calculate for larger dies on smaller wafers:

### Request
```json
{
  "tool": "calculate_die_per_wafer",
  "parameters": {
    "wafer_diameter": 200,
    "die_width": 15,
    "die_height": 15,
    "scribe_lane": 0.15,
    "edge_exclusion": 3
  }
}
```

### Expected Response
```json
{
  "total_dies": 126,
  "wafer_area": 31415.93,
  "utilized_area": 28350,
  "utilization_percentage": 90.24,
  "algorithm_used": "rectangular",
  "calculation_details": {
    "effective_diameter": 194,
    "die_area": 225,
    "dies_per_row": [10, 11, 11, 12, 12, 12, 12, 12, 11, 11, 10],
    "placement_efficiency": 93.24
  }
}
```

## Example 4: MEMS Device on 150mm Wafer

Calculate for MEMS devices with larger edge exclusion:

### Request
```json
{
  "tool": "calculate_die_per_wafer",
  "parameters": {
    "wafer_diameter": 150,
    "die_width": 5,
    "die_height": 5,
    "scribe_lane": 0.1,
    "edge_exclusion": 5,
    "algorithm": "hexagonal"
  }
}
```

### Expected Response
```json
{
  "total_dies": 504,
  "wafer_area": 17671.46,
  "utilized_area": 12600,
  "utilization_percentage": 71.31,
  "algorithm_used": "hexagonal",
  "calculation_details": {
    "effective_diameter": 140,
    "die_area": 25,
    "dies_per_row": [22, 23, 24, 24, 25, 25, 25, 26, 26, 26, 26, 26, 26, 26, 26, 26, 25, 25, 25, 24, 24, 23, 22],
    "placement_efficiency": 81.88
  }
}
```

## Example 5: Algorithm Comparison

Compare rectangular vs hexagonal placement:

### Request
```json
{
  "tool": "compare_algorithms",
  "parameters": {
    "wafer_diameter": 300,
    "die_width": 7,
    "die_height": 7,
    "scribe_lane": 0.1,
    "edge_exclusion": 3
  }
}
```

### Expected Response
```json
{
  "rectangular": {
    "total_dies": 1278,
    "wafer_area": 70685.83,
    "utilized_area": 62622,
    "utilization_percentage": 88.59,
    "algorithm_used": "rectangular",
    "calculation_details": {
      "effective_diameter": 294,
      "die_area": 49,
      "dies_per_row": [39, 40, 41, 41, 41, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 41, 41, 41, 40, 39],
      "placement_efficiency": 91.56
    }
  },
  "hexagonal": {
    "total_dies": 1435,
    "wafer_area": 70685.83,
    "utilized_area": 70315,
    "utilization_percentage": 99.48,
    "algorithm_used": "hexagonal",
    "calculation_details": {
      "effective_diameter": 294,
      "die_area": 49,
      "dies_per_row": [42, 42, 42, 42, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 43, 42, 42, 42, 42],
      "placement_efficiency": 102.84
    }
  },
  "recommendation": "Hexagonal placement recommended: 12.3% more dies"
}
```

## Key Observations

1. **Die Size Impact**: Smaller dies result in better wafer utilization
2. **Algorithm Choice**: Hexagonal placement typically yields 10-15% more dies for square or near-square dies
3. **Edge Exclusion**: Larger edge exclusion significantly reduces die count, especially on smaller wafers
4. **Scribe Lane**: Narrower scribe lanes increase die count but may impact manufacturing yield

## Best Practices

1. Always validate parameters before calculation
2. Compare algorithms for square or near-square dies
3. Consider manufacturing constraints when selecting scribe lane width
4. Factor in edge exclusion requirements for your specific fab