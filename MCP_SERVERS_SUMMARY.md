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

### 5. KLayout MCP Server
**Purpose:** IC layout viewing, editing, and analysis  
**Repository:** https://github.com/mcp4eda/mcp4eda (klayout-mcp/)  
**Status:** ✅ Installed and Working

**Available Tools:**
- `klayout_layout_info` - Get detailed information about layout files (cells, layers, bounding boxes)
- `klayout_convert_layout` - Convert between layout formats (GDS, OASIS, DXF, CIF, MAG, DEF/LEF)
- `klayout_run_drc` - Execute design rule checks with KLayout's DRC engine
- `klayout_extract_layers` - Extract specific layers from layouts
- `klayout_execute_script` - Run custom Python/Ruby scripts within KLayout environment

**Configuration:**
```json
"klayout": {
  "command": "node",
  "args": ["/Users/qlss/Documents/mcp4eda/klayout-mcp/dist/index.js"],
  "env": {
    "KLAYOUT_PATH": "/usr/local/bin/klayout",
    "LOG_LEVEL": "info"
  }
}
```

### 6. AnySilicon MCP Server
**Purpose:** Semiconductor manufacturing calculations  
**Repository:** https://github.com/ssql2014/mcp4eda (anysilicon/)  
**Status:** ✅ Installed and Working

**Available Tools:**
- `calculate_die_per_wafer` - Calculate die yield with edge exclusion
- `validate_parameters` - Validate calculation parameters
- `get_standard_wafer_sizes` - Get standard wafer dimensions

**Configuration:**
```json
"anysilicon": {
  "command": "node",
  "args": ["/path/to/mcp4eda/anysilicon/dist/index.js"]
}
```

### 7. Semiconductor Supply Chain MCP
**Purpose:** IP core and ASIC service procurement  
**Repository:** https://github.com/ssql2014/mcp4eda (semiconductor-supply-chain-mcp/)  
**Status:** ✅ Installed and Working

**Available Tools:**
- `find_ip_vendors` - Search for IP core vendors by category
- `find_asic_services` - Locate ASIC design and manufacturing services
- `get_price_estimation` - Estimate semiconductor service costs
- `compare_vendors` - Compare multiple vendors
- `natural_language_query` - Natural language search interface

**Configuration:**
```json
"semiconductor-supply-chain": {
  "command": "node",
  "args": ["/path/to/mcp4eda/semiconductor-supply-chain-mcp/dist/index.js"]
}
```

### 8. OpenLane MCP Server
**Purpose:** Complete RTL to GDSII flow automation  
**Repository:** https://github.com/ssql2014/mcp4eda (openlane-mcp/)  
**Status:** ✅ Built and Ready

**Available Tools:**
- `openlane_run_flow` - Complete RTL to GDSII flow
- `openlane_run_synthesis` - Logic synthesis with Yosys
- `openlane_run_floorplan` - Floorplanning and I/O placement
- `openlane_run_placement` - Standard cell placement
- `openlane_run_cts` - Clock tree synthesis
- `openlane_run_routing` - Global and detailed routing
- `openlane_generate_reports` - Generate flow reports and statistics
- `openlane_check_design` - Validate design configuration
- `openlane_natural_language` - Natural language interface

**Configuration:**
```json
"openlane": {
  "command": "node",
  "args": ["/path/to/mcp4eda/openlane-mcp/dist/index.js"],
  "env": {
    "CONTAINER_EXECUTABLE": "docker",
    "OPENLANE_IMAGE": "efabless/openlane:latest",
    "WORK_DIR": "/home/user/openlane-workspace",
    "LOG_LEVEL": "info"
  }
}
```

### Other Available Servers (Not EDA-specific)
- **zen** - AI reasoning and analysis (installed separately)
- **puppeteer** - Web automation (installed separately)

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

### KLayout Layout Analysis
```javascript
// 1. Get layout information
{
  "tool": "klayout_layout_info",
  "arguments": {
    "layoutFile": "design.gds",
    "topCell": "TOP",
    "includeHierarchy": true
  }
}

// 2. Convert GDS to OASIS
{
  "tool": "klayout_convert_layout",
  "arguments": {
    "inputFile": "design.gds",
    "outputFile": "design.oas",
    "scale": 0.001,
    "mergeReferences": false
  }
}

// 3. Run DRC checks
{
  "tool": "klayout_run_drc",
  "arguments": {
    "layoutFile": "design.gds",
    "drcFile": "rules.drc",
    "outputFile": "violations.rdb",
    "topCell": "TOP",
    "verbose": true
  }
}

// 4. Extract specific layers
{
  "tool": "klayout_extract_layers",
  "arguments": {
    "inputFile": "full_design.gds",
    "outputFile": "metal_layers.gds",
    "layers": ["31/0", "32/0", "33/0"],
    "mergeShapes": true
  }
}
```

### OpenLane RTL to GDSII Flow
```javascript
// 1. Run complete flow
{
  "tool": "openlane_run_flow",
  "arguments": {
    "designName": "counter",
    "designPath": "/path/to/counter",
    "threads": 8
  }
}

// 2. Run synthesis only
{
  "tool": "openlane_run_synthesis",
  "arguments": {
    "designName": "cpu_core",
    "designPath": "/path/to/cpu",
    "targetClock": 500,
    "strategy": "AREA 0"
  }
}

// 3. Natural language flow control
{
  "tool": "openlane_natural_language",
  "arguments": {
    "query": "Run floorplanning for my design with 65% utilization"
  }
}

// 4. Check design configuration
{
  "tool": "openlane_check_design",
  "arguments": {
    "designName": "soc",
    "designPath": "/path/to/soc"
  }
}
```

## 🔧 Requirements Met
- ✅ Yosys 0.54+ installed at `/opt/homebrew/bin/yosys`
- ✅ Verilator 5.036+ installed at `/opt/homebrew/bin/verilator`
- ✅ GTKWave 3.3+ installed (with vcd2fst, fst2vcd utilities)
- ✅ KLayout 0.28+ installed at `/usr/local/bin/klayout`
- ✅ Docker/Podman installed for OpenLane container support
- ✅ Node.js 16+ available
- ✅ All dependencies installed
- ✅ All servers built and tested
- ✅ Clean JSON-RPC communication (no stdout interference)
- ✅ Proper error handling and logging

## 📍 Installation Location
**Global Claude Desktop Config:** `~/Library/Application Support/Claude/claude_desktop_config.json`

All MCP servers are now available in Claude Desktop for RTL design, synthesis, simulation, and verification workflows!