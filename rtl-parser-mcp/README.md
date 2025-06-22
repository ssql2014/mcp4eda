# RTL Parser MCP

MCP (Model Context Protocol) server for parsing and analyzing RTL (Register Transfer Level) code using Google's Verible parser.

## Features

- Parse Verilog/SystemVerilog files
- Query register information (flip-flops, latches)
- Analyze module hierarchy, ports, and parameters
- Trace signal usage across modules
- Cached parsing results for performance

## Prerequisites

1. Install Verible:
```bash
# macOS
brew install verible

# Linux (download from releases)
wget https://github.com/chipsalliance/verible/releases/download/v0.0-3428-gcfcbb82b/verible-v0.0-3428-gcfcbb82b-Ubuntu-20.04-focal-x86_64.tar.gz
tar -xf verible-*.tar.gz
export PATH=$PATH:$(pwd)/verible-v0.0-3428-gcfcbb82b/bin
```

2. Install Node.js dependencies:
```bash
cd rtl-parser-mcp
npm install
```

## Building

```bash
npm run build
```

## Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "rtl-parser": {
      "command": "node",
      "args": ["/path/to/rtl-parser-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

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

## Usage Examples

### Basic Usage

```javascript
// Parse a project
await mcp.parse_project({
  root_path: "/path/to/rtl/project",
  file_patterns: ["*.v", "*.sv"]
});

// Query registers
const registers = await mcp.query_registers({
  type: "flip_flop"
});

// Analyze module
const moduleInfo = await mcp.analyze_module({
  module_name: "cpu_core",
  analysis_type: "all"
});
```

### Natural Language Queries

```javascript
// Ask questions in natural language
await mcp.natural_language_query({
  query: "How many registers are in the cpu_core module?"
});

await mcp.natural_language_query({
  query: "Where is signal 'clk' used?"
});

await mcp.natural_language_query({
  query: "Show me the ports of module alu"
});
```

### Using Prompts

```javascript
// Get comprehensive design analysis
await mcp.get_prompt("analyze_design", {
  focus_area: "clock domains"
});

// Find potential issues
await mcp.get_prompt("find_issues");

// Summarize a module
await mcp.get_prompt("summarize_module", {
  module_name: "cpu_core"
});
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```