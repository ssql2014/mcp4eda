# AnySilicon MCP Server

An MCP (Model Context Protocol) server for semiconductor die calculations, providing tools for die per wafer calculations, yield analysis, and cost optimization.

## Features

- **Die Per Wafer Calculation**: Calculate how many dies fit on a wafer using rectangular or hexagonal placement algorithms
- **Yield Analysis**: Estimate die yield based on defect density using Murphy and Poisson models
- **Parameter Validation**: Pre-validate parameters with helpful warnings and suggestions
- **Standard Wafer Information**: Access standard wafer sizes and their typical applications
- **Algorithm Comparison**: Compare different placement algorithms to maximize utilization

## Installation

```bash
cd anysilicon
npm install
npm run build
```

## Usage

### As an MCP Server

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "anysilicon": {
      "command": "node",
      "args": ["/path/to/anysilicon/dist/index.js"]
    }
  }
}
```

### Available Resources

#### 1. wafer://standards/sizes
Standard wafer sizes with typical applications and defect density ranges.

#### 2. wafer://standards/defect-density  
Typical defect density ranges for different semiconductor process nodes.

#### 3. wafer://formulas/die-per-wafer
Mathematical formulas and algorithms used for die per wafer calculations.

### Available Prompts

#### 1. quick-calculation
Quick die per wafer calculation for common scenarios.
- Parameters: `wafer_size`, `die_size` (e.g., "10x10")

#### 2. yield-analysis
Analyze yield for a specific die and process node.
- Parameters: `process_node` (e.g., "7nm"), `die_area`

#### 3. optimization-study
Find optimal die size for maximizing wafer utilization.
- Parameters: `wafer_size`, `target_dies` (optional)

### Available Tools

#### 1. calculate_die_per_wafer
Calculate the number of dies that fit on a wafer.

```typescript
// Example request
{
  "wafer_diameter": 300,    // 150, 200, 300, or 450 mm
  "die_width": 10,          // mm
  "die_height": 10,         // mm
  "scribe_lane": 0.1,       // mm (optional, default: 0.1)
  "edge_exclusion": 3,      // mm (optional, default: 3)
  "algorithm": "hexagonal", // "rectangular" or "hexagonal"
  "include_visualization": false
}

// Response
{
  "total_dies": 706,
  "wafer_area": 70685.83,
  "utilized_area": 70600,
  "utilization_percentage": 99.88,
  "algorithm_used": "hexagonal",
  "calculation_details": {
    "effective_diameter": 294,
    "die_area": 100,
    "dies_per_row": [27, 28, 29, ...],
    "placement_efficiency": 103.2
  }
}
```

#### 2. validate_parameters
Validate calculation parameters before processing.

```typescript
// Example request
{
  "operation": "die_per_wafer",
  "parameters": {
    "wafer_diameter": 300,
    "die_width": 10,
    "die_height": 10
  }
}

// Response
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "suggestions": ["Try hexagonal placement algorithm for potentially better utilization"]
}
```

#### 3. get_standard_wafer_sizes
Get information about standard wafer sizes.

```typescript
// Response
{
  "sizes": [
    {
      "diameter": 300,
      "area": 70685.83,
      "typical_edge_exclusion": 3,
      "common_applications": ["Logic", "Memory", "Processors", "GPUs"],
      "typical_defect_density_range": {
        "min": 0.01,
        "max": 0.1,
        "unit": "defects/cm²"
      }
    }
    // ... other sizes
  ]
}
```

#### 4. calculate_yield
Calculate die yield considering defect density.

```typescript
// Example request
{
  "total_dies": 706,
  "defect_density": 0.05,  // defects per cm²
  "die_area": 100,         // mm²
  "alpha": 3               // clustering factor (optional)
}

// Response
{
  "yield_percentage": 95.12,
  "good_dies": 671,
  "defective_dies": 35,
  "model_used": "Murphy"
}
```

#### 5. compare_algorithms
Compare rectangular vs hexagonal placement algorithms.

```typescript
// Example request
{
  "wafer_diameter": 300,
  "die_width": 10,
  "die_height": 10
}

// Response
{
  "rectangular": { /* full calculation result */ },
  "hexagonal": { /* full calculation result */ },
  "recommendation": "Hexagonal placement recommended: 12.3% more dies"
}
```

## Development

### Project Structure
```
anysilicon/
├── src/
│   ├── calculations/       # Core calculation logic
│   ├── tools/             # MCP tool implementations
│   ├── utils/             # Validation and utilities
│   ├── config/            # Configuration and defaults
│   └── errors/            # Custom error types
├── tests/                 # Test suites
└── docs/                  # Documentation
```

### Running Tests
```bash
npm test                   # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
```

### Code Quality
```bash
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run validate          # Run lint and tests
```

## Algorithms

### Rectangular Placement
- Places dies in a grid pattern
- Simple and predictable
- Good for rectangular dies

### Hexagonal Placement
- Offset row placement for better packing
- Up to 15% better utilization
- Ideal for square or near-square dies

### Yield Models

#### Murphy Model
```
Yield = [(1 - e^(-DA/α))/(DA/α)]^α
```
- Accounts for defect clustering
- More accurate for real-world scenarios
- Uses clustering factor (α)

#### Poisson Model
```
Yield = e^(-DA)
```
- Simpler calculation
- Assumes random defect distribution
- Good for low defect densities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT