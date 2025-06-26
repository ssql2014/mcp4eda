# AnySilicon MCP Server

An MCP (Model Context Protocol) server for semiconductor die per wafer calculations. This server wraps the AnySilicon die-per-wafer calculator webpage (https://anysilicon.com/die-per-wafer-formula-free-calculators/) to provide calculations through an MCP interface.

## Features

- **Die Per Wafer Calculation**: Calculate how many dies fit on a wafer using the AnySilicon online calculator
- **Natural Language Interface**: Use plain English to perform die calculations
- **Web Scraping Integration**: Uses Puppeteer to interact with the AnySilicon webpage automatically
- **Parameter Validation**: Pre-validate parameters with helpful warnings and suggestions  
- **Standard Wafer Information**: Access standard wafer sizes and their typical applications
- **Built-in Resources**: Access wafer standards, defect density data, and calculation formulas

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

### 2. Configure Your Claude Application

#### For Claude Desktop

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

#### For Claude Code (Cursor)

Find your Cursor MCP configuration file:
- **macOS/Linux**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

If the file doesn't exist, create it. Add the AnySilicon server:

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

### 3. Restart Your Application

Restart Claude Desktop or Claude Code (Cursor) to load the new MCP server.

## Usage Examples

Once configured and restarted, you can use natural language to interact with the calculator:

### Basic Calculation
- "Calculate how many 10x10mm dies fit on a 300mm wafer"
- "How many 5x5mm dies can I get from a 200mm wafer?"
- "What's the die count for 15x15mm dies on a 12 inch wafer with 0.15mm scribe lanes?"

### Parameter Validation  
- "Is it possible to fit 50x50mm dies on a 200mm wafer?"
- "Validate these parameters: 300mm wafer, 7x7mm die, 0.05mm scribe"

### Standard Wafer Info
- "Show me standard wafer sizes and their applications"
- "What are the typical wafer sizes used in semiconductor manufacturing?"

### Real-world Scenarios
- "Calculate dies per wafer for a 300mm wafer with 10x12mm dies, 0.1mm scribe lanes, and 3mm edge exclusion"
- "I need to manufacture chips that are 8mm x 6mm. How many can I get from a standard 12-inch wafer?"

### Note on Wafer Sizes
The AnySilicon calculator supports:
- **200mm wafers** (8 inch) - automatically selected when you specify 200mm
- **300mm wafers** (12 inch) - automatically selected when you specify 300mm

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

### 4. anysilicon_natural_language
Process natural language queries about die calculations.

```typescript
// Example request
{
  "query": "Calculate dies for 10x10mm chip on 300mm wafer",
  "context": {
    "previousCalculation": {
      "waferDiameter": 200,
      "dieWidth": 5,
      "dieHeight": 5
    }
  }
}

// Response
{
  "interpretation": "You want to calculate dies per wafer",
  "suggestedTool": "calculate_die_per_wafer",
  "suggestedArguments": {
    "wafer_diameter": 300,
    "die_width": 10,
    "die_height": 10,
    "edge_exclusion": 3,
    "scribe_lane": 0.1
  },
  "explanation": "I'll calculate how many 10x10mm dies fit on a 300mm wafer",
  "hints": [
    "Using edge exclusion of 3mm",
    "Using scribe lane width of 0.1mm",
    "You can specify different wafer sizes: 150mm, 200mm, 300mm, or 450mm",
    "You can adjust edge exclusion and scribe lane parameters"
  ]
}
```

See [Natural Language Examples](examples/natural_language_examples.md) for more usage patterns.

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