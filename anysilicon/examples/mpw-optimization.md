# Multi-Project Wafer (MPW) Optimization Examples

This example demonstrates how to optimize multi-project wafer layouts for maximum efficiency and cost-effectiveness.

## Example 1: Basic MPW Layout

Optimize placement for multiple projects on a single wafer:

### Request
```json
{
  "tool": "optimize_mpw",
  "parameters": {
    "projects": [
      {
        "id": "proj_analog_1",
        "die_width": 5,
        "die_height": 5,
        "quantity": 20
      },
      {
        "id": "proj_digital_1",
        "die_width": 8,
        "die_height": 8,
        "quantity": 15
      },
      {
        "id": "proj_rf_1",
        "die_width": 6,
        "die_height": 4,
        "quantity": 25
      },
      {
        "id": "proj_mems_1",
        "die_width": 10,
        "die_height": 10,
        "quantity": 10
      }
    ],
    "wafer_diameter": 300,
    "optimization_strategy": "maximize_dies"
  }
}
```

### Expected Response
```json
{
  "total_dies_placed": 70,
  "projects_placement": [
    {
      "project_id": "proj_analog_1",
      "quantity_placed": 20,
      "coordinates": [
        {"x": -140, "y": 0}, {"x": -135, "y": 0}, {"x": -130, "y": 0},
        // ... more coordinates
      ]
    },
    {
      "project_id": "proj_digital_1",
      "quantity_placed": 15,
      "coordinates": [
        {"x": 0, "y": 120}, {"x": 8, "y": 120}, {"x": 16, "y": 120},
        // ... more coordinates
      ]
    },
    {
      "project_id": "proj_rf_1",
      "quantity_placed": 25,
      "coordinates": [
        {"x": -60, "y": -80}, {"x": -54, "y": -80}, {"x": -48, "y": -80},
        // ... more coordinates
      ]
    },
    {
      "project_id": "proj_mems_1",
      "quantity_placed": 10,
      "coordinates": [
        {"x": 50, "y": 50}, {"x": 60, "y": 50}, {"x": 70, "y": 50},
        // ... more coordinates
      ]
    }
  ],
  "utilization_percentage": 82.4,
  "optimization_score": 0.95,
  "placement_map_url": "visualization-not-implemented"
}
```

## Example 2: Cost-Optimized MPW

Optimize for minimum cost per project:

### Request
```json
{
  "tool": "optimize_mpw",
  "parameters": {
    "projects": [
      {
        "id": "startup_1",
        "die_width": 3,
        "die_height": 3,
        "quantity": 50,
        "priority": 1,
        "cost_weight": 0.8
      },
      {
        "id": "university_1",
        "die_width": 5,
        "die_height": 5,
        "quantity": 30,
        "priority": 2,
        "cost_weight": 1.0
      },
      {
        "id": "research_1",
        "die_width": 7,
        "die_height": 7,
        "quantity": 20,
        "priority": 3,
        "cost_weight": 0.5
      }
    ],
    "wafer_diameter": 200,
    "optimization_strategy": "minimize_cost",
    "wafer_cost": 3000
  }
}
```

### Expected Response
```json
{
  "total_dies_placed": 100,
  "cost_analysis": {
    "total_wafer_cost": 3000,
    "cost_per_project": {
      "startup_1": {
        "dies_placed": 50,
        "total_cost": 1200,
        "cost_per_die": 24
      },
      "university_1": {
        "dies_placed": 30,
        "total_cost": 900,
        "cost_per_die": 30
      },
      "research_1": {
        "dies_placed": 20,
        "total_cost": 900,
        "cost_per_die": 45
      }
    },
    "cost_efficiency": 0.92
  },
  "utilization_percentage": 71.5,
  "optimization_score": 0.88
}
```

## Example 3: Mixed Technology MPW

Optimize placement considering technology constraints:

### Request
```json
{
  "tool": "optimize_mpw_advanced",
  "parameters": {
    "projects": [
      {
        "id": "cmos_28nm",
        "die_width": 4,
        "die_height": 4,
        "quantity": 40,
        "technology": "CMOS",
        "constraints": {
          "min_spacing": 0.2,
          "placement_zone": "center"
        }
      },
      {
        "id": "bipolar_analog",
        "die_width": 6,
        "die_height": 8,
        "quantity": 15,
        "technology": "BiCMOS",
        "constraints": {
          "min_spacing": 0.3,
          "placement_zone": "edge"
        }
      },
      {
        "id": "gan_power",
        "die_width": 10,
        "die_height": 10,
        "quantity": 8,
        "technology": "GaN",
        "constraints": {
          "min_spacing": 0.5,
          "thermal_isolation": true
        }
      }
    ],
    "wafer_diameter": 300,
    "optimization_strategy": "technology_aware"
  }
}
```

### Expected Response
```json
{
  "total_dies_placed": 63,
  "technology_zones": {
    "CMOS": {
      "zone": "center",
      "area_allocated": 640,
      "dies_placed": 40
    },
    "BiCMOS": {
      "zone": "edge",
      "area_allocated": 720,
      "dies_placed": 15
    },
    "GaN": {
      "zone": "isolated",
      "area_allocated": 800,
      "dies_placed": 8,
      "thermal_spacing_applied": true
    }
  },
  "constraint_violations": [],
  "utilization_percentage": 68.9,
  "optimization_score": 0.91
}
```

## Example 4: Iterative MPW Optimization

Find the best combination of projects for a wafer:

### Request
```json
{
  "tool": "mpw_portfolio_optimization",
  "parameters": {
    "available_projects": [
      {"id": "A", "die_width": 3, "die_height": 3, "min_quantity": 20, "max_quantity": 100, "revenue_per_die": 50},
      {"id": "B", "die_width": 5, "die_height": 5, "min_quantity": 10, "max_quantity": 50, "revenue_per_die": 120},
      {"id": "C", "die_width": 7, "die_height": 7, "min_quantity": 5, "max_quantity": 30, "revenue_per_die": 200},
      {"id": "D", "die_width": 4, "die_height": 6, "min_quantity": 15, "max_quantity": 60, "revenue_per_die": 100},
      {"id": "E", "die_width": 8, "die_height": 8, "min_quantity": 8, "max_quantity": 25, "revenue_per_die": 250}
    ],
    "wafer_diameter": 300,
    "wafer_cost": 5000,
    "optimization_goal": "maximize_profit"
  }
}
```

### Expected Response
```json
{
  "optimal_portfolio": {
    "selected_projects": [
      {"id": "A", "quantity": 85, "area": 765, "revenue": 4250},
      {"id": "B", "quantity": 42, "area": 1050, "revenue": 5040},
      {"id": "C", "quantity": 28, "area": 1372, "revenue": 5600},
      {"id": "D", "quantity": 55, "area": 1320, "revenue": 5500}
    ],
    "total_dies": 210,
    "total_area_used": 4507,
    "utilization_percentage": 85.7
  },
  "financial_analysis": {
    "total_revenue": 20390,
    "wafer_cost": 5000,
    "gross_profit": 15390,
    "profit_margin": 75.5,
    "roi": 307.8
  },
  "alternative_portfolios": [
    {
      "portfolio_id": "alt_1",
      "profit": 14850,
      "utilization": 82.3,
      "projects": ["A", "B", "E"]
    },
    {
      "portfolio_id": "alt_2",
      "profit": 14200,
      "utilization": 79.8,
      "projects": ["B", "C", "D"]
    }
  ]
}
```

## Example 5: MPW with Yield Considerations

Optimize MPW considering different yield expectations:

### Request
```json
{
  "tool": "mpw_yield_aware_optimization",
  "parameters": {
    "projects": [
      {
        "id": "mature_design",
        "die_width": 5,
        "die_height": 5,
        "quantity": 40,
        "expected_yield": 95,
        "defect_density": 0.02
      },
      {
        "id": "new_design",
        "die_width": 6,
        "die_height": 6,
        "quantity": 30,
        "expected_yield": 85,
        "defect_density": 0.08
      },
      {
        "id": "experimental",
        "die_width": 8,
        "die_height": 8,
        "quantity": 20,
        "expected_yield": 70,
        "defect_density": 0.15
      }
    ],
    "wafer_diameter": 300,
    "global_defect_density": 0.05,
    "optimization_strategy": "yield_aware"
  }
}
```

### Expected Response
```json
{
  "placement_strategy": {
    "high_yield_zone": {
      "projects": ["mature_design"],
      "location": "wafer_center",
      "expected_good_dies": 38
    },
    "medium_yield_zone": {
      "projects": ["new_design"],
      "location": "mid_radius",
      "expected_good_dies": 26
    },
    "low_yield_zone": {
      "projects": ["experimental"],
      "location": "wafer_edge",
      "expected_good_dies": 14
    }
  },
  "yield_analysis": {
    "total_dies_placed": 90,
    "expected_good_dies": 78,
    "overall_yield": 86.7,
    "yield_by_project": {
      "mature_design": {
        "placed": 40,
        "expected_good": 38,
        "yield": 95
      },
      "new_design": {
        "placed": 30,
        "expected_good": 26,
        "yield": 86.7
      },
      "experimental": {
        "placed": 20,
        "expected_good": 14,
        "yield": 70
      }
    }
  },
  "recommendations": [
    "Place mature designs in center for highest yield",
    "Consider redundancy for experimental designs",
    "Monitor edge die performance for yield improvement"
  ]
}
```

## MPW Optimization Best Practices

1. **Project Grouping**: Group similar die sizes for better packing efficiency
2. **Technology Matching**: Keep similar technologies together to simplify processing
3. **Yield Zones**: Place high-value or high-yield projects in wafer center
4. **Thermal Management**: Separate high-power dies to avoid thermal issues
5. **Cost Allocation**: Use fair cost allocation based on area and quantity
6. **Redundancy Planning**: Add extra dies for critical or low-yield projects
7. **Edge Utilization**: Use edge areas for test structures or non-critical dies

## Advanced Strategies

### Reticle Sharing
- Group dies that fit within a single reticle field
- Reduces mask costs for small quantities

### Process Compatibility
- Ensure all projects use compatible process steps
- Consider separate runs for incompatible technologies

### Timeline Optimization
- Balance urgent vs. flexible delivery requirements
- Optimize for shortest overall cycle time

### Risk Management
- Distribute critical projects across multiple locations
- Plan for potential yield variations