# Batch Processing Examples

This example demonstrates batch processing capabilities for optimizing die sizes and comparing multiple configurations.

## Example 1: Die Size Optimization

Find the optimal die size for maximum utilization on a 300mm wafer:

### Request
```json
{
  "tool": "batch_calculate",
  "parameters": {
    "configurations": [
      {
        "id": "config_5x5",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 5,
          "die_height": 5,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "config_7x7",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 7,
          "die_height": 7,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "config_10x10",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 10,
          "die_height": 10,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "config_12x12",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 12,
          "die_height": 12,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "config_15x15",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 15,
          "die_height": 15,
          "algorithm": "hexagonal"
        }
      }
    ],
    "output_format": "json"
  }
}
```

### Expected Response Summary
```json
{
  "results": [
    {
      "id": "config_5x5",
      "total_dies": 2520,
      "utilization_percentage": 89.21,
      "die_area": 25,
      "total_area_utilized": 63000
    },
    {
      "id": "config_7x7",
      "total_dies": 1435,
      "utilization_percentage": 99.48,
      "die_area": 49,
      "total_area_utilized": 70315
    },
    {
      "id": "config_10x10",
      "total_dies": 706,
      "utilization_percentage": 99.88,
      "die_area": 100,
      "total_area_utilized": 70600
    },
    {
      "id": "config_12x12",
      "total_dies": 472,
      "utilization_percentage": 96.14,
      "die_area": 144,
      "total_area_utilized": 67968
    },
    {
      "id": "config_15x15",
      "total_dies": 302,
      "utilization_percentage": 96.18,
      "die_area": 225,
      "total_area_utilized": 67950
    }
  ],
  "optimal_configuration": "config_10x10",
  "analysis": "10x10mm dies provide the best utilization at 99.88%"
}
```

## Example 2: Wafer Size Comparison

Compare die yield across different wafer sizes:

### Request
```json
{
  "tool": "batch_calculate",
  "parameters": {
    "configurations": [
      {
        "id": "150mm_wafer",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 150,
          "die_width": 10,
          "die_height": 10,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "200mm_wafer",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 200,
          "die_width": 10,
          "die_height": 10,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "300mm_wafer",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 10,
          "die_height": 10,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "450mm_wafer",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 450,
          "die_width": 10,
          "die_height": 10,
          "algorithm": "hexagonal"
        }
      }
    ],
    "output_format": "table"
  }
}
```

### Expected Response (Table Format)
```
| Wafer Size | Total Dies | Wafer Area (mm²) | Utilization % | Dies/cm² |
|------------|------------|------------------|---------------|----------|
| 150mm      | 156        | 17,671          | 88.24%        | 0.883    |
| 200mm      | 282        | 31,416          | 89.74%        | 0.897    |
| 300mm      | 706        | 70,686          | 99.88%        | 0.999    |
| 450mm      | 1590       | 159,043         | 99.95%        | 1.000    |
```

## Example 3: Yield Analysis Batch

Calculate yield for different defect densities:

### Request
```json
{
  "tool": "batch_calculate",
  "parameters": {
    "configurations": [
      {
        "id": "low_defect",
        "calculation_type": "yield",
        "parameters": {
          "total_dies": 706,
          "defect_density": 0.01,
          "die_area": 100,
          "alpha": 3
        },
        "metadata": {
          "process": "Mature 28nm"
        }
      },
      {
        "id": "medium_defect",
        "calculation_type": "yield",
        "parameters": {
          "total_dies": 706,
          "defect_density": 0.05,
          "die_area": 100,
          "alpha": 3
        },
        "metadata": {
          "process": "New 7nm"
        }
      },
      {
        "id": "high_defect",
        "calculation_type": "yield",
        "parameters": {
          "total_dies": 706,
          "defect_density": 0.1,
          "die_area": 100,
          "alpha": 3
        },
        "metadata": {
          "process": "Early 5nm"
        }
      }
    ]
  }
}
```

### Expected Response
```json
{
  "results": [
    {
      "id": "low_defect",
      "yield_percentage": 99.01,
      "good_dies": 699,
      "defective_dies": 7,
      "metadata": {
        "process": "Mature 28nm"
      }
    },
    {
      "id": "medium_defect",
      "yield_percentage": 95.12,
      "good_dies": 671,
      "defective_dies": 35,
      "metadata": {
        "process": "New 7nm"
      }
    },
    {
      "id": "high_defect",
      "yield_percentage": 90.37,
      "good_dies": 638,
      "defective_dies": 68,
      "metadata": {
        "process": "Early 5nm"
      }
    }
  ],
  "summary": {
    "yield_trend": "Yield decreases from 99.01% to 90.37% as defect density increases",
    "recommendation": "Consider mature process for higher yields"
  }
}
```

## Example 4: Cost Optimization Batch

Calculate cost per die for different scenarios:

### Request
```json
{
  "tool": "batch_calculate",
  "parameters": {
    "configurations": [
      {
        "id": "scenario_1",
        "calculation_type": "cost",
        "parameters": {
          "wafer_cost": 5000,
          "total_dies": 706,
          "yield_percentage": 95,
          "additional_costs": {
            "processing": 500,
            "testing": 300,
            "packaging": 200
          }
        }
      },
      {
        "id": "scenario_2",
        "calculation_type": "cost",
        "parameters": {
          "wafer_cost": 3000,
          "total_dies": 282,
          "yield_percentage": 90,
          "additional_costs": {
            "processing": 300,
            "testing": 200,
            "packaging": 150
          }
        }
      },
      {
        "id": "scenario_3",
        "calculation_type": "cost",
        "parameters": {
          "wafer_cost": 8000,
          "total_dies": 1590,
          "yield_percentage": 85,
          "additional_costs": {
            "processing": 800,
            "testing": 500,
            "packaging": 300
          }
        }
      }
    ]
  }
}
```

### Expected Response
```json
{
  "results": [
    {
      "id": "scenario_1",
      "cost_per_die": 8.50,
      "cost_per_good_die": 8.95,
      "cost_breakdown": {
        "wafer": 7.08,
        "processing": 0.71,
        "testing": 0.42,
        "packaging": 0.28,
        "total": 8.50
      }
    },
    {
      "id": "scenario_2",
      "cost_per_die": 13.95,
      "cost_per_good_die": 15.50,
      "cost_breakdown": {
        "wafer": 10.64,
        "processing": 1.06,
        "testing": 0.71,
        "packaging": 0.53,
        "total": 13.95
      }
    },
    {
      "id": "scenario_3",
      "cost_per_die": 6.04,
      "cost_per_good_die": 7.10,
      "cost_breakdown": {
        "wafer": 5.03,
        "processing": 0.50,
        "testing": 0.31,
        "packaging": 0.19,
        "total": 6.04
      }
    }
  ],
  "analysis": {
    "lowest_cost_per_good_die": "scenario_3",
    "recommendation": "450mm wafers provide lowest cost despite higher initial investment"
  }
}
```

## Example 5: Multi-Parameter Sweep

Comprehensive parameter sweep for optimization:

### Request
```json
{
  "tool": "batch_calculate",
  "parameters": {
    "configurations": [
      {
        "id": "config_1",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 8,
          "die_height": 8,
          "scribe_lane": 0.08,
          "edge_exclusion": 2.5,
          "algorithm": "rectangular"
        }
      },
      {
        "id": "config_2",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 8,
          "die_height": 8,
          "scribe_lane": 0.08,
          "edge_exclusion": 2.5,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "config_3",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 8,
          "die_height": 8,
          "scribe_lane": 0.10,
          "edge_exclusion": 3.0,
          "algorithm": "hexagonal"
        }
      },
      {
        "id": "config_4",
        "calculation_type": "die_per_wafer",
        "parameters": {
          "wafer_diameter": 300,
          "die_width": 8,
          "die_height": 8,
          "scribe_lane": 0.12,
          "edge_exclusion": 3.5,
          "algorithm": "hexagonal"
        }
      }
    ],
    "output_format": "csv"
  }
}
```

### Expected Response (CSV Format)
```csv
id,wafer_diameter,die_width,die_height,scribe_lane,edge_exclusion,algorithm,total_dies,utilization_percentage
config_1,300,8,8,0.08,2.5,rectangular,982,87.36
config_2,300,8,8,0.08,2.5,hexagonal,1103,98.16
config_3,300,8,8,0.10,3.0,hexagonal,1062,94.51
config_4,300,8,8,0.12,3.5,hexagonal,1022,90.95
```

## Batch Processing Best Practices

1. **Parameter Sweeps**: Use batch processing to find optimal parameters
2. **Scenario Comparison**: Compare multiple scenarios side-by-side
3. **Format Selection**: Choose appropriate output format for your analysis needs
4. **Metadata Usage**: Add metadata to track additional context
5. **Result Analysis**: Include summary statistics and recommendations