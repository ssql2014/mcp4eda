# mcp4eda - MCP Servers for Electronic Design Automation

A collection of Model Context Protocol (MCP) servers designed to enhance EDA workflows in Claude Desktop and other MCP-compatible clients.

## 🚀 Available MCP Servers

### 1. AnySilicon MCP
Calculate die yields and wafer utilization for semiconductor manufacturing.

**Features:**
- Die per wafer calculations
- Support for various wafer sizes (150mm, 200mm, 300mm, 450mm)
- Edge exclusion and scribe lane parameters
- Integration with AnySilicon's web calculator
- Offline calculation capabilities

**Installation:**
```bash
cd anysilicon
npm install
npm run build
```

[Full Documentation →](./anysilicon/README.md)

### 2. RTL Parser MCP
Parse and analyze Verilog/SystemVerilog designs using Google's Verible parser.

**Features:**
- 🔍 Full syntax analysis of RTL files
- 📊 Register counting (flip-flops, latches)
- 🏗️ Module hierarchy analysis
- 🔗 Signal tracing across modules
- 💬 Natural language queries
- 🎯 Pre-defined analysis prompts

**Quick Install:**
```bash
cd rtl-parser-mcp
./install.sh
```

[Full Documentation →](./rtl-parser-mcp/README.md)

## 📋 Prerequisites

- Node.js 18+ and npm
- Claude Desktop application
- For RTL Parser: Verible (installed automatically by install script)

## 🔧 Configuration

Add MCP servers to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

Example configuration:
```json
{
  "mcpServers": {
    "anysilicon": {
      "command": "node",
      "args": ["/path/to/mcp4eda/anysilicon/dist/index.js"]
    },
    "rtl-parser": {
      "command": "node",
      "args": ["/path/to/mcp4eda/rtl-parser-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🎯 Usage Examples

### AnySilicon MCP
```
User: "Calculate how many 5x5mm dies fit on a 300mm wafer"
Claude: [Uses calculate_die_per_wafer tool to compute yield]
```

### RTL Parser MCP
```
User: "Analyze the Verilog files in /path/to/my/project"
Claude: [Parses all RTL files and provides design summary]

User: "How many registers are in the cpu_core module?"
Claude: [Uses natural language query to count flip-flops]
```

## 🔍 Troubleshooting

### View Logs (macOS)
```bash
# AnySilicon logs
tail -f ~/Library/Logs/Claude/mcp-server-anysilicon.log

# RTL Parser logs
tail -f ~/Library/Logs/Claude/mcp-server-rtl-parser.log
```

### Common Issues
1. **Server disconnected**: Check installation and paths in config
2. **Tool not found**: Restart Claude Desktop after configuration
3. **Parse errors**: Ensure Verible is installed for RTL Parser

## 🚧 Roadmap

### Planned MCP Servers
- **Synthesis MCP**: Integration with Yosys for synthesis
- **Simulation MCP**: Verilator/Icarus integration
- **Waveform MCP**: VCD/FST file analysis
- **Timing MCP**: Static timing analysis tools
- **Layout MCP**: KLayout integration

### Future Features
- Cross-tool workflows
- Project templates
- CI/CD integration
- Cloud synthesis support

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see individual project directories for details.

## 🔗 Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/download)
- [GitHub Repository](https://github.com/ssql2014/mcp4eda)