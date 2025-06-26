# mcp4eda - MCP Servers for Electronic Design Automation

A comprehensive collection of Model Context Protocol (MCP) servers designed to enhance EDA workflows in Claude Desktop and other MCP-compatible clients.

## 🚀 Available MCP Servers (8 Total)

### 1. Yosys MCP Server
**Purpose:** Synthesis and design optimization for digital circuits  
**Location:** `yosys-mcp/`

**Features:**
- Synthesize Verilog/SystemVerilog to gate-level netlists
- Support for multiple FPGA targets (Xilinx, Intel/Altera, Lattice)
- Design analysis (hierarchy, resources, statistics)
- Circuit visualization generation
- Intelligent caching for performance

**Tools:**
- `yosys_synth` - Synthesis with multiple output formats
- `yosys_analyze` - Design analysis and statistics
- `yosys_show` - Generate visual circuit diagrams

[Full Documentation →](./yosys-mcp/README.md)

### 2. Verilator MCP Server
**Purpose:** High-performance RTL simulation and verification  
**Location:** `verilator-mcp/`

**Features:**
- Fast Verilog/SystemVerilog simulation
- Automatic testbench generation
- Natural language debugging interface
- Coverage collection and analysis
- Waveform generation support

**Tools:**
- `verilator_compile` - Compile designs to C++
- `verilator_simulate` - Run simulations with auto-testbench
- `verilator_testbenchgenerator` - Intelligent testbench creation
- `verilator_naturallanguage` - Natural language queries

[Full Documentation →](./verilator-mcp/README.md)

### 3. Verible MCP Server
**Purpose:** SystemVerilog/Verilog linting, formatting, and analysis  
**Location:** `verible-mcp/`

**Features:**
- Comprehensive style linting with auto-fix
- Code formatting with customizable rules
- Syntax tree analysis and visualization
- Register and module analysis
- Project-level dependency analysis
- Natural language interface

**Tools:**
- `verible_lint` - Style checking and fixes
- `verible_format` - Code formatting
- `verible_syntax` - AST analysis
- `verible_analyze` - Design analysis
- `verible_natural_language` - Natural language queries

[Full Documentation →](./verible-mcp/README.md)

### 4. GTKWave MCP Server
**Purpose:** Waveform viewing and analysis automation  
**Location:** `gtkwave-mcp/`

**Features:**
- Programmatic waveform viewing
- Format conversion (VCD, FST, LXT2)
- Signal hierarchy extraction
- Timing analysis and measurements
- Screenshot generation
- TCL script generation

**Tools:**
- `gtkwave_open` - Open waveforms with configurations
- `gtkwave_convert` - Convert between formats
- `gtkwave_extract_signals` - Extract signal hierarchies
- `gtkwave_analyze_timing` - Timing measurements
- `gtkwave_capture_screenshot` - Generate waveform images

[Full Documentation →](./gtkwave-mcp/README.md)

### 5. KLayout MCP Server
**Purpose:** IC layout viewing, editing, and analysis  
**Location:** `klayout-mcp/`

**Features:**
- Multi-format support (GDS, OASIS, DXF, CIF, MAG, DEF/LEF)
- Design Rule Checking (DRC) with powerful engine
- Layer extraction and manipulation
- Format conversion with scaling
- Custom Python/Ruby scripting
- Natural language interface
- Rich resource library

**Tools:**
- `klayout_layout_info` - Analyze layout files
- `klayout_convert_layout` - Format conversion
- `klayout_run_drc` - Design rule checking
- `klayout_extract_layers` - Layer extraction
- `klayout_execute_script` - Custom scripting
- `klayout_natural_language` - Natural language queries

[Full Documentation →](./klayout-mcp/README.md)

### 6. AnySilicon MCP Server
**Purpose:** Semiconductor manufacturing calculations  
**Location:** `anysilicon/`

**Features:**
- Die per wafer calculations
- Support for multiple wafer sizes (150mm-450mm)
- Edge exclusion and scribe lane parameters
- Integration with AnySilicon's web calculator
- Yield estimation support

**Tools:**
- `calculate_die_per_wafer` - Calculate die yield
- `validate_parameters` - Validate input parameters
- `get_standard_wafer_sizes` - Get wafer standards

[Full Documentation →](./anysilicon/README.md)

### 7. Semiconductor Supply Chain MCP
**Purpose:** IP core and ASIC service procurement intelligence  
**Location:** `semiconductor-supply-chain-mcp/`

**Features:**
- Find IP vendors by category and technology
- Locate ASIC design and manufacturing services
- Price estimation for semiconductor services
- Multi-vendor comparison
- Natural language queries for complex searches

**Tools:**
- `find_ip_vendors` - Search IP core vendors
- `find_asic_services` - Find ASIC services
- `get_price_estimation` - Estimate costs
- `compare_vendors` - Compare multiple vendors
- `natural_language_query` - Natural language interface

[Full Documentation →](./semiconductor-supply-chain-mcp/README.md)

### 8. OpenLane MCP Server
**Purpose:** Complete RTL to GDSII flow automation  
**Location:** `openlane-mcp/`

**Features:**
- Complete RTL to GDSII flow using OpenLane
- Container-based execution (Docker/Podman)
- Individual stage control (synthesis, placement, routing)
- PDK management and configuration
- Natural language interface for complex flows

**Tools:**
- `openlane_run_flow` - Complete RTL to GDSII flow
- `openlane_run_synthesis` - Logic synthesis
- `openlane_run_floorplan` - Floorplanning and I/O placement
- `openlane_run_placement` - Standard cell placement
- `openlane_run_cts` - Clock tree synthesis
- `openlane_run_routing` - Global and detailed routing
- `openlane_natural_language` - Natural language interface

[Full Documentation →](./openlane-mcp/README.md)

## 🌟 Natural Language Support

All 8 MCP servers now include comprehensive **natural language interfaces**, allowing you to interact with EDA tools using plain English commands:

```
"Synthesize my design for Xilinx FPGA"
"Run simulation for 1 microsecond" 
"Check my Verilog for errors"
"Generate testbench for my CPU module"
"Show waveform of clock signals"
"Convert layout to OASIS format"
"Calculate dies per wafer for 10x10mm chip"
"Find DDR5 IP vendors"
"Run complete RTL to GDSII flow"
```

See [Natural Language Support Guide](./NATURAL_LANGUAGE_SUPPORT.md) for comprehensive examples and patterns.

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Claude Desktop** application
- **EDA Tools** (as needed):
  - Yosys (for synthesis)
  - Verilator (for simulation)
  - Verible (for linting)
  - GTKWave (for waveforms)
  - KLayout (for layout viewing)

## 🔧 Quick Installation

### 1. Clone the Repository
```bash
git clone https://github.com/ssql2014/mcp4eda.git
cd mcp4eda
```

### 2. Install All Servers
```bash
# Install script for all servers
for dir in yosys-mcp verilator-mcp verible-mcp gtkwave-mcp klayout-mcp anysilicon semiconductor-supply-chain-mcp openlane-mcp; do
  echo "Installing $dir..."
  cd $dir && npm install && npm run build && cd ..
done
```

### 3. Configure Claude Desktop

Add to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

Example configuration for all servers:
```json
{
  "mcpServers": {
    "yosys": {
      "command": "node",
      "args": ["/path/to/mcp4eda/yosys-mcp/dist/index.js"],
      "env": {
        "YOSYS_PATH": "/opt/homebrew/bin/yosys",
        "LOG_LEVEL": "info"
      }
    },
    "verilator": {
      "command": "node",
      "args": ["/path/to/mcp4eda/verilator-mcp/dist/index.js"],
      "env": {
        "VERILATOR_PATH": "/opt/homebrew/bin/verilator",
        "LOG_LEVEL": "info"
      }
    },
    "verible": {
      "command": "node",
      "args": ["/path/to/mcp4eda/verible-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    },
    "gtkwave": {
      "command": "node",
      "args": ["/path/to/mcp4eda/gtkwave-mcp/dist/index.js"],
      "env": {
        "GTKWAVE_PATH": "/opt/homebrew/bin/gtkwave",
        "LOG_LEVEL": "info"
      }
    },
    "klayout": {
      "command": "node",
      "args": ["/path/to/mcp4eda/klayout-mcp/dist/index.js"],
      "env": {
        "KLAYOUT_PATH": "/opt/homebrew/bin/klayout",
        "LOG_LEVEL": "info"
      }
    },
    "anysilicon": {
      "command": "node",
      "args": ["/path/to/mcp4eda/anysilicon/dist/index.js"]
    },
    "semiconductor-supply-chain": {
      "command": "node",
      "args": ["/path/to/mcp4eda/semiconductor-supply-chain-mcp/dist/index.js"]
    },
    "openlane": {
      "command": "node",
      "args": ["/path/to/mcp4eda/openlane-mcp/dist/index.js"],
      "env": {
        "CONTAINER_EXECUTABLE": "docker",
        "OPENLANE_IMAGE": "efabless/openlane:latest",
        "WORK_DIR": "/path/to/openlane-workspace",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🎯 Usage Examples

### Complete RTL-to-Layout Flow
```
User: "Analyze my Verilog design in /project/rtl"
Claude: [Uses Verible to lint and format code]

User: "Synthesize the design for Xilinx FPGA"
Claude: [Uses Yosys to synthesize and optimize]

User: "Simulate the synthesized design"
Claude: [Uses Verilator to run simulation]

User: "Show me the waveform"
Claude: [Uses GTKWave to display results]
```

### IC Design Flow
```
User: "Check DRC on my layout.gds"
Claude: [Uses KLayout to run design rules]

User: "Calculate die yield for 10x10mm chip on 300mm wafer"
Claude: [Uses AnySilicon for yield calculation]

User: "Find DDR5 PHY IP vendors"
Claude: [Uses Supply Chain MCP to search vendors]
```

## 🔍 Troubleshooting

### View Logs (macOS)
```bash
tail -f ~/Library/Logs/Claude/mcp-server-*.log
```

### Common Issues
1. **Server disconnected**: Check tool installation and paths
2. **Tool not found**: Restart Claude Desktop after config changes
3. **Permission errors**: Ensure tools have execute permissions
4. **Build failures**: Check Node.js version (requires 18+)

### Verify Installation
```bash
# Check all tools
which yosys verilator verible gtkwave klayout

# Test MCP servers
for server in */dist/index.js; do
  echo "Testing $server"
  timeout 2 node "$server" 2>&1 | head -n 5
done
```

## 🚧 Roadmap

### Coming Soon
- **Magic MCP**: Layout editor integration
- **OpenROAD MCP**: Complete RTL-to-GDS flow
- **ngspice MCP**: Circuit simulation
- **Icarus MCP**: Alternative Verilog simulator

### Future Features
- Cross-tool workflow automation
- Cloud synthesis and simulation
- Project templates and wizards
- CI/CD integration for hardware

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewMCP`)
3. Implement your MCP server following the existing patterns
4. Add comprehensive documentation
5. Submit a pull request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License - see individual project directories for specific licenses.

## 🔗 Links

- [MCP4EDA Website](https://www.mcp4eda.cn)
- [Model Context Protocol Docs](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/download)
- [GitHub Repository](https://github.com/ssql2014/mcp4eda)

## 🌟 Star History

If you find these tools useful, please star the repository to help others discover it!

---
*Built with ❤️ for the EDA community*