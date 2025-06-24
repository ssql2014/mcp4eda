# Yosys MCP Server

A Model Context Protocol (MCP) server that provides Yosys synthesis and analysis capabilities for Verilog/SystemVerilog designs.

## Features

- **Synthesis**: Convert RTL to gate-level netlists for various targets (FPGA/ASIC)
- **Analysis**: Design statistics, hierarchy analysis, and resource estimation  
- **Visualization**: Generate circuit diagrams using Graphviz
- **Caching**: Intelligent result caching for improved performance
- **Multi-target**: Support for Xilinx, Intel/Altera, Lattice iCE40, ECP5, and generic synthesis

## Installation

### Prerequisites

1. **Yosys**: Install Yosys (0.10 or later)
   ```bash
   # macOS
   brew install yosys
   
   # Ubuntu/Debian
   sudo apt-get install yosys
   
   # From source
   git clone https://github.com/YosysHQ/yosys.git
   cd yosys
   make
   sudo make install
   ```

2. **Node.js**: Version 16 or later

3. **Graphviz** (optional, for visualization):
   ```bash
   # macOS
   brew install graphviz
   
   # Ubuntu/Debian
   sudo apt-get install graphviz
   ```

### Setup

1. Clone and install:
   ```bash
   cd yosys-mcp
   npm install
   npm run build
   ```

2. Configure in Claude Desktop:

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "yosys": {
         "command": "node",
         "args": ["/path/to/yosys-mcp/dist/index.js"],
         "env": {
           "YOSYS_PATH": "/usr/local/bin/yosys",
           "YOSYS_DEFAULT_TARGET": "generic",
           "YOSYS_OPT_LEVEL": "2"
         }
       }
     }
   }
   ```

## Available Tools

### yosys_synth
Synthesize Verilog/SystemVerilog designs to gate-level netlists.

**Parameters:**
- `filepath` (string, required): Path to input Verilog file
- `target` (string): Target technology - `generic`, `xilinx`, `altera`, `ice40`, `ecp5`
- `topModule` (string): Top module name (auto-detected if not specified)
- `optimizationLevel` (number): 0-3 (0=none, 3=aggressive)
- `outputFile` (string): Output file path
- `outputFormat` (string): `verilog`, `json`, `blif`, `edif`
- `defines` (object): Verilog defines as key-value pairs
- `includeDirs` (array): Include directories for `include directives
- `keepHierarchy` (boolean): Preserve module hierarchy

**Example:**
```javascript
{
  "filepath": "counter.v",
  "target": "xilinx",
  "optimizationLevel": 2,
  "outputFormat": "verilog"
}
```

### yosys_analyze
Analyze designs for statistics, hierarchy, and resource usage.

**Parameters:**
- `filepath` (string, required): Path to input Verilog file
- `analysisType` (string, required): `stats`, `check`, `hierarchy`, `resources`
- `topModule` (string): Top module name
- `detailed` (boolean): Include detailed information
- `target` (string): Target for resource estimation

**Example:**
```javascript
{
  "filepath": "cpu.v",
  "analysisType": "stats",
  "detailed": true
}
```

### yosys_show
Generate visual representations of designs using Graphviz.

**Parameters:**
- `filepath` (string, required): Path to input Verilog file
- `moduleName` (string): Specific module to visualize
- `topModule` (string): Top module name
- `format` (string): `dot`, `svg`, `pdf`, `png`
- `outputFile` (string): Output file path
- `simplify` (boolean): Simplify design before visualization
- `colorScheme` (string): `default`, `dark`, `colorblind`
- `returnBase64` (boolean): Return image as base64 string

**Example:**
```javascript
{
  "filepath": "alu.v",
  "format": "svg",
  "moduleName": "alu",
  "simplify": true
}
```

## Usage Examples

### Basic Synthesis
```
Synthesize counter.v for Xilinx FPGA
```

### Design Analysis
```
Analyze the hierarchy of cpu.v
```

### Visualization
```
Show me a diagram of the alu module in processor.v
```

### Resource Estimation
```
What are the resource requirements for design.v on ice40?
```

## Environment Variables

- `YOSYS_PATH`: Path to Yosys binary (if not in PATH)
- `YOSYS_DEFAULT_TARGET`: Default synthesis target
- `YOSYS_TECH_LIB_PATH`: Path to technology libraries
- `YOSYS_OPT_LEVEL`: Default optimization level (0-3)
- `YOSYS_TIMEOUT`: Command timeout in milliseconds
- `YOSYS_WORK_DIR`: Working directory for temporary files
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Output Formats

### Synthesis Results
```json
{
  "success": true,
  "gateCount": 1234,
  "registerCount": 56,
  "lutCount": 89,
  "warnings": ["Warning: Wire 'unused' is never used"],
  "outputFile": "/path/to/output.v"
}
```

### Analysis Results
```json
{
  "success": true,
  "type": "stats",
  "data": {
    "modules": [...],
    "summary": {
      "totalModules": 5,
      "totalCells": 123,
      "totalWires": 456,
      "totalPorts": 78
    }
  }
}
```

## Troubleshooting

### Yosys Not Found
- Ensure Yosys is installed and in PATH
- Set `YOSYS_PATH` environment variable
- Check with: `which yosys`

### Synthesis Errors
- Check input file syntax with `yosys_analyze` using `check` type
- Verify module names are correct
- Ensure all included files are accessible

### Visualization Issues
- Install Graphviz for non-DOT formats
- Use `returnBase64: true` for embedded images
- Try `simplify: true` for complex designs

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please submit issues and pull requests on GitHub.

## Acknowledgments

- [Yosys](http://www.clifford.at/yosys/) - Open synthesis suite
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [MCP4EDA](https://github.com/siliconwitch/mcp4eda) - EDA tools for MCP