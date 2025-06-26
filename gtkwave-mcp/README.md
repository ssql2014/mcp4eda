# GTKWave MCP Server

A Model Context Protocol (MCP) server for GTKWave, providing programmatic access to waveform viewing and analysis capabilities.

## Features

- **Waveform Viewing**: Open and display waveform files (VCD, FST, LXT2, etc.)
- **Format Conversion**: Convert between different waveform formats
- **Signal Extraction**: Extract and analyze signal hierarchies
- **Timing Analysis**: Perform timing measurements and analysis
- **Scripting**: Generate TCL scripts for automated analysis
- **Screenshot Capture**: Capture waveform displays programmatically
- **Natural Language Support**: Process natural language queries for common tasks
- **MCP Resources**: Access documentation and reference materials

## Installation

```bash
# Clone the repository
git clone https://github.com/mcp4eda/mcp4eda.git
cd mcp4eda/gtkwave-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

### Prerequisites

- GTKWave 3.3.0 or higher
- Node.js 18.0.0 or higher
- GTKWave utilities (vcd2fst, fst2vcd, etc.) in PATH

## Configuration

Configure the server by setting environment variables or using a configuration file:

```json
{
  "gtkwaveExecutable": "/usr/local/bin/gtkwave",
  "defaultOptions": ["-O"],
  "enableBatchMode": true,
  "tempDir": "/tmp/gtkwave-mcp"
}
```

## Usage

### As MCP Server

Add to your MCP settings:

```json
{
  "mcpServers": {
    "gtkwave": {
      "command": "node",
      "args": ["/path/to/gtkwave-mcp/dist/index.js"]
    }
  }
}
```

### Available Tools

#### gtkwave_open
Open a waveform file in GTKWave viewer.

```typescript
{
  "waveformFile": "/path/to/design.vcd",
  "saveFile": "/path/to/signals.gtkw",  // optional
  "startTime": "0",                      // optional
  "endTime": "1000ns",                   // optional
  "background": false                    // optional
}
```

#### gtkwave_convert
Convert waveform files between different formats.

```typescript
{
  "inputFile": "/path/to/input.vcd",
  "outputFile": "/path/to/output.fst",
  "format": "fst",  // "vcd", "fst", or "lxt2"
  "compress": true  // for FST format
}
```

#### gtkwave_extract_signals
Extract signal list from waveform file.

```typescript
{
  "waveformFile": "/path/to/design.vcd",
  "hierarchical": true,     // return hierarchical structure
  "pattern": "clk.*"        // optional regex filter
}
```

#### gtkwave_analyze_timing
Analyze timing relationships between signals.

```typescript
{
  "waveformFile": "/path/to/design.vcd",
  "signals": ["clk", "data", "valid"],
  "startTime": "0",         // optional
  "endTime": "1000ns",      // optional
  "measurements": ["setup", "hold", "frequency"]  // optional
}
```

#### gtkwave_generate_script
Generate GTKWave TCL script for automated analysis.

```typescript
{
  "waveformFile": "/path/to/design.vcd",
  "operations": [
    {
      "type": "add_signal",
      "parameters": { "signal": "top.clk" }
    },
    {
      "type": "zoom",
      "parameters": { "startTime": "0", "endTime": "1000ns" }
    }
  ],
  "outputFile": "/path/to/script.tcl"
}
```

#### gtkwave_capture_screenshot
Capture screenshot of waveform display.

```typescript
{
  "waveformFile": "/path/to/design.vcd",
  "saveFile": "/path/to/signals.gtkw",  // optional
  "outputFile": "/path/to/screenshot.png",
  "format": "png",  // "png", "pdf", or "ps"
  "width": 1200,
  "height": 800
}
```

#### gtkwave_natural_language
Process natural language queries about waveform analysis.

```typescript
{
  "query": "Convert simulation.vcd to fst with compression",
  "context": {  // optional
    "waveformFile": "/current/file.vcd",
    "signals": ["clk", "data", "valid"]
  }
}
```

### Available Resources

The server provides the following MCP resources:

#### gtkwave://formats
Information about supported waveform formats (VCD, FST, LXT2).

#### gtkwave://tcl-commands
Reference guide for GTKWave TCL commands used in automation.

#### gtkwave://timing-measurements
Available timing measurement types and their requirements.

## Examples

### Basic Waveform Viewing
```javascript
// Open a VCD file
await callTool('gtkwave_open', {
  waveformFile: 'simulation.vcd'
});
```

### Convert VCD to FST
```javascript
await callTool('gtkwave_convert', {
  inputFile: 'large_sim.vcd',
  outputFile: 'compressed.fst',
  format: 'fst',
  compress: true
});
```

### Extract Clock Signals
```javascript
const result = await callTool('gtkwave_extract_signals', {
  waveformFile: 'design.vcd',
  pattern: '.*clk.*',
  hierarchical: true
});
```

### Generate Analysis Script
```javascript
await callTool('gtkwave_generate_script', {
  waveformFile: 'test.vcd',
  operations: [
    { type: 'add_signal', parameters: { signal: 'top.cpu.clk' } },
    { type: 'add_signal', parameters: { signal: 'top.cpu.data' } },
    { type: 'set_cursor', parameters: { time: '100ns' } },
    { type: 'zoom', parameters: { startTime: '0', endTime: '500ns' } }
  ],
  outputFile: 'analysis.tcl'
});
```

### Natural Language Queries
```javascript
// Convert formats
await callTool('gtkwave_natural_language', {
  query: 'Convert design.vcd to fst with compression'
});

// Extract signals
await callTool('gtkwave_natural_language', {
  query: 'List all clock signals from simulation.vcd'
});

// Analyze timing
await callTool('gtkwave_natural_language', {
  query: 'Measure setup and hold times',
  context: {
    waveformFile: 'test.vcd',
    signals: ['clk', 'data']
  }
});
```

### Access Resources
```javascript
// Get format information
const formats = await readResource('gtkwave://formats');

// Get TCL command reference
const tclCommands = await readResource('gtkwave://tcl-commands');

// Get timing measurement info
const timingInfo = await readResource('gtkwave://timing-measurements');
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Integration with CI/CD

Use GTKWave MCP in your CI/CD pipeline for automated waveform analysis:

```yaml
steps:
  - name: Run Simulation
    run: make sim
  
  - name: Analyze Waveforms
    run: |
      node gtkwave-mcp analyze \
        --waveform output.vcd \
        --signals clk,data,valid \
        --measurements setup,hold
```

## Troubleshooting

### GTKWave not found
Ensure GTKWave is installed and in your PATH:
```bash
which gtkwave
```

### Conversion tools missing
Install GTKWave with all utilities:
```bash
# Ubuntu/Debian
sudo apt-get install gtkwave

# macOS
brew install gtkwave

# Build from source with all tools
./configure --enable-all
make && sudo make install
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## Support

- GitHub Issues: [https://github.com/mcp4eda/mcp4eda/issues](https://github.com/mcp4eda/mcp4eda/issues)
- Documentation: [https://www.mcp4eda.cn](https://www.mcp4eda.cn)