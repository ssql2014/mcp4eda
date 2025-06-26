# OpenLane MCP Server

A Model Context Protocol (MCP) server for OpenLane - providing RTL to GDSII flow automation with Container Desktop support.

## Features

- **Complete RTL to GDSII Flow**: Run synthesis, floorplanning, placement, CTS, routing, and GDSII generation
- **Container-Based Execution**: Works with Docker, Podman, and Container Desktop
- **Individual Stage Control**: Run specific flow stages independently
- **Natural Language Interface**: Use plain English commands for complex operations
- **PDK Management**: Support for multiple Process Design Kits
- **Configuration Templates**: Pre-configured flows for different design types
- **Resource Access**: Documentation, examples, and best practices

## Installation

### Prerequisites

1. **Container Runtime** (one of):
   - Docker Desktop
   - Podman Desktop
   - Container Desktop
   - Docker Engine

2. **Node.js 18+**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ssql2014/mcp4eda.git
cd mcp4eda/openlane-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

### Configure Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
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
  }
}
```

## Usage Examples

### Natural Language Commands

```text
"Run the complete flow for my counter design"
"Synthesize my RISC-V core with area optimization"
"Generate routing for the design with 8 metal layers"
"Show me the floorplan configuration options"
"What's the best practice for clock tree synthesis?"
```

### Tool Examples

#### Complete Flow
```javascript
{
  "tool": "openlane_run_flow",
  "arguments": {
    "designName": "counter",
    "designPath": "/path/to/counter",
    "tag": "final_run",
    "threads": 8
  }
}
```

#### Synthesis Only
```javascript
{
  "tool": "openlane_run_synthesis",
  "arguments": {
    "designName": "cpu_core",
    "designPath": "/path/to/cpu",
    "targetClock": 500,
    "strategy": "AREA 0"
  }
}
```

#### Floorplanning
```javascript
{
  "tool": "openlane_run_floorplan",
  "arguments": {
    "designName": "soc",
    "designPath": "/path/to/soc",
    "dieArea": "0 0 3000 3000",
    "coreUtilization": 0.65
  }
}
```

## Available Tools

1. **openlane_run_flow** - Complete RTL to GDSII flow
2. **openlane_run_synthesis** - Logic synthesis with Yosys
3. **openlane_run_floorplan** - Floorplanning and I/O placement
4. **openlane_run_placement** - Standard cell placement
5. **openlane_run_cts** - Clock tree synthesis
6. **openlane_run_routing** - Global and detailed routing
7. **openlane_generate_reports** - Generate flow reports and statistics
8. **openlane_check_design** - Validate design configuration
9. **openlane_natural_language** - Natural language interface

## Resources

- Flow stages documentation
- Configuration parameters
- PDK information
- Best practices guide
- Example designs

Access resources with:
```javascript
// List all resources
await mcp.list_resources()

// Read specific resource
await mcp.read_resource("openlane://docs/flow-stages")
```

## Configuration

### Environment Variables

- `CONTAINER_EXECUTABLE`: Container runtime (docker/podman)
- `OPENLANE_IMAGE`: OpenLane container image
- `WORK_DIR`: Working directory for designs
- `ENABLE_GPU`: Enable GPU acceleration
- `MAX_RUN_TIME`: Maximum runtime in milliseconds

### Design Configuration

Create a `config.json` in your design directory:

```json
{
  "DESIGN_NAME": "my_design",
  "VERILOG_FILES": ["src/design.v"],
  "CLOCK_PORT": "clk",
  "CLOCK_PERIOD": 10.0,
  "FP_PDN_VPITCH": 180,
  "FP_PDN_HPITCH": 180,
  "FP_SIZING": "absolute",
  "DIE_AREA": "0 0 1000 1000"
}
```

## Troubleshooting

### Container Issues

```bash
# Check container runtime
docker --version
# or
podman --version

# Pull OpenLane image
docker pull efabless/openlane:latest

# Test container
docker run --rm efabless/openlane:latest flow.tcl -help
```

### Common Errors

| Error | Solution |
|-------|----------|
| "Container runtime not found" | Install Docker/Podman |
| "Design not found" | Check design path and config.json |
| "PDK not found" | Set PDK_ROOT environment variable |
| "Out of memory" | Increase container memory limits |

## License

MIT

## Support

- GitHub Issues: https://github.com/ssql2014/mcp4eda/issues
- Community: https://www.mcp4eda.cn