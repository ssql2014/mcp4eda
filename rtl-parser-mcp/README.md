# RTL Parser MCP

MCP (Model Context Protocol) server for parsing and analyzing RTL (Register Transfer Level) code using Google's Verible parser.

## Features

- 🔍 Parse Verilog/SystemVerilog files with full syntax analysis
- 📊 Query register information (flip-flops, latches) with detailed statistics
- 🏗️ Analyze module hierarchy, ports, and parameters
- 🔗 Trace signal usage across modules
- 💬 Natural language queries for RTL analysis
- 💾 Cached parsing results for performance
- 🎯 Pre-defined prompts for common analysis tasks

## Prerequisites

### 1. Install Verible

#### Option A: Using Homebrew (Recommended for macOS)
```bash
# Add Verible tap
brew tap chipsalliance/verible

# Install Verible
brew install verible
```

#### Option B: Download Pre-built Binaries

**macOS:**
```bash
# Download latest release
curl -L https://github.com/chipsalliance/verible/releases/latest/download/verible-v0.0-latest-macOS.tar.gz -o verible-macos.tar.gz

# Extract
tar -xzf verible-macos.tar.gz

# Copy to local bin
mkdir -p ~/.local/bin
cp verible-*/bin/* ~/.local/bin/

# Add to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"
```

**Linux:**
```bash
# Download latest release (adjust URL for your distribution)
wget https://github.com/chipsalliance/verible/releases/latest/download/verible-v0.0-latest-Ubuntu-20.04-focal-x86_64.tar.gz

# Extract and install
tar -xzf verible-*.tar.gz
sudo cp verible-*/bin/* /usr/local/bin/
```

### 2. Install Node.js dependencies
```bash
cd rtl-parser-mcp
npm install
```

## Building

```bash
npm run build
```

## Configuration

Add to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "rtl-parser": {
      "command": "node",
      "args": ["/absolute/path/to/rtl-parser-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with your actual path.

## Available Tools

### parse_file
Parse a single Verilog/SystemVerilog file.
```typescript
{
  filepath: string,
  options?: {
    include_paths?: string[],
    defines?: Record<string, string>
  }
}
```

### parse_project
Parse all RTL files in a project directory.
```typescript
{
  root_path: string,
  file_patterns?: string[],  // default: ["*.v", "*.sv"]
  exclude_patterns?: string[]
}
```

### query_registers
Query register information.
```typescript
{
  scope?: string,  // module name
  type?: "flip_flop" | "latch" | "all"
}
```

### analyze_module
Analyze a specific module.
```typescript
{
  module_name: string,
  analysis_type: "hierarchy" | "ports" | "parameters" | "all"
}
```

### trace_signal
Trace signal usage.
```typescript
{
  signal_name: string,
  scope?: string  // module name
}
```

### natural_language_query
Query RTL design using natural language.
```typescript
{
  query: string,
  context?: {
    current_module?: string,
    recent_queries?: string[]
  }
}
```

## Available Resources

- `rtl://project/stats` - Overall project statistics
- `rtl://modules` - List of all parsed modules
- `rtl://registers` - Summary of all registers

## Available Prompts

- `analyze_design` - Comprehensive RTL design analysis
- `find_issues` - Find potential issues in RTL design
- `summarize_module` - Summarize a specific module

## Usage in Claude Desktop

### Quick Start Guide

1. **Start a conversation** with Claude Desktop
2. **Tell Claude about your RTL files** using full paths:
   - "Parse my Verilog file at `/path/to/design.v`"
   - "Analyze the RTL project in `/path/to/project/`"
   - "I have Verilog files in `/Users/username/fpga-project`"

### Example Conversations

#### Basic File Analysis
```
User: "Please analyze /Users/john/projects/cpu_design/alu.v"
Claude: [Uses parse_file tool to analyze the file and provides summary]
```

#### Project-wide Analysis
```
User: "Analyze all Verilog files in /Users/john/projects/riscv-core"
Claude: [Uses parse_project to scan directory and analyze all .v/.sv files]
```

#### Natural Language Queries
```
User: "How many flip-flops are in my design?"
Claude: [Uses natural_language_query to count registers]

User: "Where is the clock signal used?"
Claude: [Traces 'clk' signal usage across modules]

User: "Show me the hierarchy of the cpu_core module"
Claude: [Analyzes module structure and instantiations]
```

#### Using Prompts for Analysis
```
User: "Give me a comprehensive analysis of my RTL design"
Claude: [Uses analyze_design prompt to provide detailed analysis]

User: "Find potential issues in my Verilog code"
Claude: [Uses find_issues prompt to identify problems]
```

### Finding Your Verilog Files

If you're not sure where your files are:
```
User: "Help me find Verilog files on my system"
Claude: [Can help locate .v and .sv files]
```

## Troubleshooting

### Common Issues

1. **"Server disconnected" error**
   - Check if Verible is installed: `verible-verilog-syntax --version`
   - Verify the path in claude_desktop_config.json is correct
   - Check logs at `~/Library/Logs/Claude/mcp-server-rtl-parser.log`

2. **"SQLITE_CANTOPEN" error**
   - Fixed in latest version - database now uses home directory
   - Clear old cache: `rm -f ./rtl_cache.db`

3. **"Command not found: verible-verilog-syntax"**
   - Ensure Verible is in PATH
   - Restart terminal after adding to PATH
   - Try full path: `/Users/username/.local/bin/verible-verilog-syntax`

### Viewing Logs

**macOS:**
```bash
# View RTL Parser logs
tail -f ~/Library/Logs/Claude/mcp-server-rtl-parser.log

# View general MCP logs
tail -f ~/Library/Logs/Claude/mcp.log
```

### Debug Mode

Enable debug logging by setting in claude_desktop_config.json:
```json
"env": {
  "LOG_LEVEL": "debug"
}
```

## Examples

### Example 1: Analyzing a CPU Design
```verilog
// cpu_core.v
module cpu_core (
    input clk,
    input rst_n,
    output [31:0] pc
);
    reg [31:0] pc_reg;
    reg [31:0] instruction;
    // ... more code
endmodule
```

Commands in Claude:
- "Parse /path/to/cpu_core.v"
- "How many registers does cpu_core have?"
- "Show me all the ports of cpu_core"

### Example 2: Project Statistics
- "Parse all files in /my/rtl/project"
- "Give me overall statistics"
- "Which module has the most flip-flops?"

## API Reference

For detailed API documentation, see [docs/api.md](docs/api.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details