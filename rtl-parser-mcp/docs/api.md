# RTL Parser MCP API Documentation

## Overview

The RTL Parser MCP provides tools for parsing and analyzing Verilog/SystemVerilog code. It uses Google's Verible parser under the hood and provides a caching layer for improved performance.

## Tools

### parse_file

Parse a single Verilog/SystemVerilog file.

**Parameters:**
- `filepath` (string, required): Path to the RTL file
- `options` (object, optional):
  - `include_paths` (string[]): Additional include directories
  - `defines` (Record<string, string>): Preprocessor defines

**Returns:** Success message with number of modules parsed

---

### parse_project

Parse all RTL files in a project directory.

**Parameters:**
- `root_path` (string, required): Root directory of the project
- `file_patterns` (string[], optional): Glob patterns for files to parse (default: ["*.v", "*.sv"])
- `exclude_patterns` (string[], optional): Glob patterns for files to exclude

**Returns:** Summary of parsed modules and any errors

---

### query_registers

Query register information across parsed modules.

**Parameters:**
- `scope` (string, optional): Module name to limit the search
- `type` (enum, optional): "flip_flop" | "latch" | "all" (default: "all")

**Returns:**
```json
{
  "registers": [...],
  "stats": {
    "total": number,
    "by_type": {
      "flip_flop": number,
      "latch": number
    },
    "by_module": {
      "module_name": number
    }
  }
}
```

---

### analyze_module

Analyze a specific module's structure.

**Parameters:**
- `module_name` (string, required): Name of the module to analyze
- `analysis_type` (enum, optional): "hierarchy" | "ports" | "parameters" | "all" (default: "all")

**Returns:** Detailed module information based on analysis type

---

### trace_signal

Trace signal usage across modules.

**Parameters:**
- `signal_name` (string, required): Name of the signal to trace
- `scope` (string, optional): Module name to limit the search

**Returns:**
```json
{
  "signal": "signal_name",
  "occurrences": [...],
  "summary": {
    "total": number,
    "by_type": {
      "port": number,
      "signal": number,
      "connection": number
    }
  }
}
```

## Resources

### rtl://project/stats

Get overall project statistics.

**Returns:**
```json
{
  "total_modules": number,
  "total_registers": number,
  "total_flip_flops": number,
  "total_latches": number,
  "total_lines": number,
  "files_parsed": number
}
```

## Error Handling

All tools return errors in the standard MCP error format:
- `InvalidRequest`: Invalid parameters or no modules parsed
- `InternalError`: Parsing or processing errors
- `MethodNotFound`: Unknown tool name

## Caching

The parser caches results based on file modification time. Cached data includes:
- Parsed module structures
- Register information
- Module relationships

Cache is stored in SQLite database (`rtl_cache.db`) in the working directory.