# RTL Parser MCP Test Usage

This document demonstrates how to use the RTL Parser MCP with the example CPU design.

## 1. Parse the Example File

```json
{
  "tool": "parse_file",
  "arguments": {
    "filepath": "/path/to/rtl-parser-mcp/examples/simple_cpu.v"
  }
}
```

Expected output:
```
Parsed 2 modules from /path/to/rtl-parser-mcp/examples/simple_cpu.v
```

## 2. Query Registers

```json
{
  "tool": "query_registers",
  "arguments": {
    "type": "flip_flop"
  }
}
```

Expected output:
```json
{
  "registers": [
    {
      "name": "pc",
      "module": "cpu_core",
      "type": "flip_flop",
      "width": 16,
      "clock": "clk",
      "reset": "rst_n",
      "file": "simple_cpu.v",
      "line": 20
    },
    {
      "name": "ir",
      "module": "cpu_core",
      "type": "flip_flop",
      "width": 32,
      "clock": "clk",
      "reset": "rst_n",
      "file": "simple_cpu.v",
      "line": 24
    },
    {
      "name": "reg_file",
      "module": "cpu_core",
      "type": "flip_flop",
      "width": 512,
      "clock": "clk",
      "file": "simple_cpu.v",
      "line": 27
    },
    {
      "name": "state",
      "module": "cpu_core",
      "type": "flip_flop",
      "width": 3,
      "clock": "clk",
      "reset": "rst_n",
      "file": "simple_cpu.v",
      "line": 35
    }
  ],
  "stats": {
    "total": 4,
    "by_type": {
      "flip_flop": 4,
      "latch": 0
    },
    "by_module": {
      "cpu_core": 4
    }
  }
}
```

## 3. Analyze cpu_core Module

```json
{
  "tool": "analyze_module",
  "arguments": {
    "module_name": "cpu_core",
    "analysis_type": "all"
  }
}
```

Expected output shows:
- Module parameters (DATA_WIDTH, ADDR_WIDTH)
- Port list with directions and widths
- Instantiated modules (alu)
- Port connections

## 4. Trace Signal Usage

```json
{
  "tool": "trace_signal",
  "arguments": {
    "signal_name": "clk"
  }
}
```

Shows all occurrences of the clock signal across modules.

## 5. Parse Entire Project

```json
{
  "tool": "parse_project",
  "arguments": {
    "root_path": "/path/to/rtl/project",
    "file_patterns": ["*.v", "*.sv"],
    "exclude_patterns": ["*_tb.v", "test/*"]
  }
}
```

## 6. Get Project Statistics

After parsing, access the resource:
```
rtl://project/stats
```

Returns overall project statistics including total modules, registers, and files parsed.