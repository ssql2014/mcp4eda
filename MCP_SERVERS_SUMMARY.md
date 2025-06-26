# MCP4EDA Servers - Installation Summary

## 🎯 Successfully Installed MCP Servers

### 1. Yosys MCP Server
**Purpose:** Synthesis and design optimization  
**Repository:** https://github.com/ssql2014/mcp4eda (yosys-mcp/)  
**Status:** ✅ Installed and Working

**Available Tools:**
- `yosys_analyze` - Analyze Verilog designs (stats, check, hierarchy, resources)
- `yosys_synth` - Synthesize to gate-level netlists (multiple targets: generic, xilinx, altera, ice40, ecp5)
- `yosys_show` - Generate circuit visualizations (DOT, SVG, PDF, PNG)

**Configuration:**
```json
"yosys": {
  "command": "node",
  "args": ["/Users/qlss/Documents/mcp4eda/yosys-mcp/dist/index.js"],
  "env": {
    "YOSYS_PATH": "/opt/homebrew/bin/yosys",
    "YOSYS_DEFAULT_TARGET": "generic",
    "YOSYS_OPT_LEVEL": "2",
    "LOG_LEVEL": "info"
  }
}
```

### 2. Verilator MCP Server
**Purpose:** RTL simulation and verification  
**Repository:** https://github.com/ssql2014/verilator-mcp  
**Status:** ✅ Installed and Working

**Available Tools:**
- `verilator_compile` - Compile Verilog/SystemVerilog to C++
- `verilator_simulate` - Run simulations with auto-testbench generation
- `verilator_testbenchgenerator` - Generate intelligent testbenches
- `verilator_naturallanguage` - Process natural language queries about simulation

**Configuration:**
```json
"verilator": {
  "command": "node",
  "args": ["/Users/qlss/Documents/mcp4eda/verilator-mcp/dist/index.js"],
  "env": {
    "VERILATOR_PATH": "/opt/homebrew/bin/verilator",
    "LOG_LEVEL": "info"
  }
}
```

### 3. Verible MCP Server
**Purpose:** Verilog linting, formatting, and analysis  
**Repository:** https://github.com/ssql2014/mcp4eda (verible-mcp/)  
**Status:** ✅ Installed and Working

**Available Tools:**
- `verible_lint` - Code style and quality checking
- `verible_format` - Code formatting
- `verible_syntax` - Syntax analysis
- `verible_analyze` - Code analysis for registers, modules, signals

### 4. GTKWave MCP Server
**Purpose:** Waveform viewing and analysis  
**Repository:** https://github.com/mcp4eda/mcp4eda (gtkwave-mcp/)  
**Status:** ✅ Installed and Working

**Available Tools:**
- `gtkwave_open` - Open waveform files in GTKWave viewer
- `gtkwave_convert` - Convert between waveform formats (VCD, FST, LXT2)
- `gtkwave_extract_signals` - Extract signal hierarchies from waveforms
- `gtkwave_analyze_timing` - Perform timing measurements and analysis
- `gtkwave_generate_script` - Generate TCL scripts for automated analysis
- `gtkwave_capture_screenshot` - Capture waveform display screenshots

**Configuration:**
```json
"gtkwave": {
  "command": "node",
  "args": ["/Users/qlss/Documents/mcp4eda/gtkwave-mcp/dist/index.js"],
  "env": {
    "GTKWAVE_PATH": "/usr/local/bin/gtkwave",
    "LOG_LEVEL": "info"
  }
}
```

### 5. Other Installed Servers
- **anysilicon** - Semiconductor calculations
- **semiconductor-supply-chain** - Supply chain information
- **zen** - AI reasoning and analysis
- **puppeteer** - Web automation

## 🚀 Usage Examples

### Yosys Synthesis Flow
```javascript
// 1. Analyze design
{
  "tool": "yosys_analyze",
  "arguments": {
    "filepath": "counter.v",
    "analysisType": "stats"
  }
}

// 2. Synthesize to gates
{
  "tool": "yosys_synth", 
  "arguments": {
    "filepath": "counter.v",
    "target": "generic",
    "outputFormat": "verilog"
  }
}

// 3. Generate visualization
{
  "tool": "yosys_show",
  "arguments": {
    "filepath": "counter.v",
    "format": "dot"
  }
}
```

### Verilator Simulation Flow
```javascript
// 1. Natural language simulation
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Run simulation on my counter.v with waveform generation"
  }
}

// 2. Generate testbench
{
  "tool": "verilator_testbenchgenerator",
  "arguments": {
    "targetFile": "fifo.v",
    "targetModule": "fifo",
    "template": "basic",
    "stimulusType": "random"
  }
}

// 3. Debug simulation
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Why is my output signal X at time 1000ns?"
  }
}
```

### GTKWave Waveform Analysis
```javascript
// 1. Open waveform with save file
{
  "tool": "gtkwave_open",
  "arguments": {
    "waveformFile": "simulation.vcd",
    "saveFile": "signals.gtkw"
  }
}

// 2. Convert VCD to compressed FST
{
  "tool": "gtkwave_convert",
  "arguments": {
    "inputFile": "large_sim.vcd",
    "outputFile": "compressed.fst",
    "format": "fst",
    "compress": true
  }
}

// 3. Extract and analyze signals
{
  "tool": "gtkwave_extract_signals",
  "arguments": {
    "waveformFile": "design.vcd",
    "pattern": ".*clk.*",
    "hierarchical": true
  }
}

// 4. Capture waveform screenshot
{
  "tool": "gtkwave_capture_screenshot",
  "arguments": {
    "waveformFile": "test.vcd",
    "outputFile": "waveform.png",
    "format": "png",
    "width": 1200,
    "height": 800
  }
}
```

## 🔧 Requirements Met
- ✅ Yosys 0.54+ installed at `/opt/homebrew/bin/yosys`
- ✅ Verilator 5.036+ installed at `/opt/homebrew/bin/verilator`
- ✅ GTKWave 3.3+ installed (with vcd2fst, fst2vcd utilities)
- ✅ Node.js 16+ available
- ✅ All dependencies installed
- ✅ All servers built and tested
- ✅ Clean JSON-RPC communication (no stdout interference)
- ✅ Proper error handling and logging

## 📍 Installation Location
**Global Claude Desktop Config:** `~/Library/Application Support/Claude/claude_desktop_config.json`

All MCP servers are now available in Claude Desktop for RTL design, synthesis, simulation, and verification workflows!