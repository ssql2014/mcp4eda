# AnySilicon MCP Server

An MCP (Model Context Protocol) server for semiconductor die per wafer calculations. This server wraps the AnySilicon die-per-wafer calculator webpage (https://anysilicon.com/die-per-wafer-formula-free-calculators/) to provide calculations through an MCP interface.

## Features

- **Die Per Wafer Calculation**: Calculate how many dies fit on a wafer using the AnySilicon online calculator
- **Web Scraping Integration**: Uses Puppeteer to interact with the AnySilicon webpage automatically
- **Parameter Validation**: Pre-validate parameters with helpful warnings and suggestions  
- **Standard Wafer Information**: Access standard wafer sizes and their typical applications

## Implementation Note

This MCP server uses web scraping to interact with the AnySilicon calculator webpage instead of implementing the formula locally. This ensures:
- Always uses the latest calculation logic from AnySilicon
- No need to reverse-engineer or maintain calculation formulas
- Leverages a trusted, industry-standard calculator

### How It Works

The server automates the AnySilicon web calculator by:
1. Navigating to https://anysilicon.com/die-per-wafer-formula-free-calculators/
2. Selecting the appropriate wafer size (8" for 200mm, 12" for 300mm)
3. Filling in die dimensions and other parameters
4. Clicking the calculate button
5. Extracting the results

### Supported Parameters

- **Wafer Diameter**: 200mm (8") or 300mm (12") - automatically mapped to dropdown
- **Die Width/Height**: In millimeters
- **Scribe Width**: In millimeters (converted to micrometers for the form)
- **Edge Exclusion**: In millimeters
- **Results**: Returns total dies per wafer with utilization calculations

## Quick Start

### 1. Install from GitHub

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/mcp4eda.git
cd mcp4eda/anysilicon

# Install dependencies and build
npm install
npm run build
```

### 2. Configure Claude Desktop

Find your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the AnySilicon server:

```json
{
  "mcpServers": {
    "anysilicon": {
      "command": "node",
      "args": ["/absolute/path/to/anysilicon/dist/index.js"]
    }
  }
}
```

**Note**: Replace `/absolute/path/to/anysilicon` with the actual path where you cloned the repository.

### 3. Restart Claude Desktop

Restart Claude Desktop to load the new MCP server.

## Usage Examples

### Basic Calculation
Ask Claude: "Calculate how many 10x10mm dies fit on a 300mm wafer"

### Parameter Validation  
Ask Claude: "Is it possible to fit 50x50mm dies on a 200mm wafer?"

### Standard Wafer Info
Ask Claude: "Show me standard wafer sizes and their applications"

### Optimization Study
Ask Claude: "Find the best die size to get around 500 dies on a 300mm wafer"

## Available Tools

### 1. calculate_die_per_wafer
Calculate the number of dies that fit on a wafer.

```typescript
// Example request
{
  "wafer_diameter": 300,    // 150, 200, 300, or 450 mm
  "die_width": 10,          // mm
  "die_height": 10,         // mm
  "scribe_lane": 0.1,       // mm (optional, default: 0.1)
  "edge_exclusion": 3       // mm (optional, default: 3)
}

// Response
{
  "total_dies": 653,
  "wafer_area": 70685.83,
  "utilized_area": 65300,
  "utilization_percentage": 92.38,
  "calculation_details": {
    "effective_diameter": 294,
    "die_area": 100,
    "dies_per_row": [28, 28, 28, ...],
    "placement_efficiency": 95.56
  }
}
```

### 2. validate_parameters
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
  "suggestions": ["Consider rotating the die 90° to see if it improves utilization"]
}
```

### 3. get_standard_wafer_sizes
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

## Available Resources

### wafer://standards/sizes
Standard wafer dimensions and applications.

### wafer://standards/defect-density  
Typical defect densities by process node.

### wafer://formulas/die-per-wafer
Mathematical formula for die per wafer calculations.

## Available Prompts

### quick-calculation
```
/anysilicon:quick-calculation wafer_size=300 die_size=10x10
```

### optimization-study
```
/anysilicon:optimization-study wafer_size=300 target_dies=500
```

## Algorithm

The server uses the AnySilicon die per wafer formula:

```
Die Per Wafer = d × π × (d/(4×S) - 1/√(2×S))
```

Where:
- **d** = effective wafer diameter (mm) after edge exclusion
- **S** = die area (mm²) including scribe lanes
- **π** = Pi (3.14159...)

This formula provides a quick and accurate estimate of dies per wafer, matching the calculation method used by AnySilicon's online calculator.

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

## Troubleshooting

### MCP Server Not Found
If Claude says "I don't have access to AnySilicon tools":
1. Check the configuration file path is correct
2. Ensure the compiled JavaScript exists at `anysilicon/dist/index.js`
3. Restart Claude Desktop again
4. Check Claude Desktop logs for errors

### Build Issues
If the server won't start:
```bash
cd anysilicon
npm install
npm run build
```

### Permission Issues
Ensure the dist/index.js file is executable:
```bash
chmod +x anysilicon/dist/index.js
```

### Test the Server Manually
```bash
cd anysilicon
npm start
```

This should output "AnySilicon MCP Server started" if everything is working.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT