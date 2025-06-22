# Natural Language Query Examples for RTL Parser MCP

This document demonstrates how to use natural language queries with the RTL Parser MCP.

## Prerequisites

First, parse your RTL files:
```json
{
  "tool": "parse_project",
  "arguments": {
    "root_path": "/path/to/rtl/project"
  }
}
```

## Natural Language Query Examples

### 1. Register Queries

**Query**: "How many registers are in the design?"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "How many registers are in the design?"
  }
}
```

**Query**: "Show me all flip-flops in cpu_core module"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Show me all flip-flops in cpu_core module"
  }
}
```

**Query**: "Count latches in the system"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Count latches in the system"
  }
}
```

### 2. Module Queries

**Query**: "What modules are in this design?"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "What modules are in this design?"
  }
}
```

**Query**: "Show me the ports of module alu"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Show me the ports of module alu"
  }
}
```

**Query**: "What is the hierarchy of cpu_core?"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "What is the hierarchy of cpu_core?"
  }
}
```

**Query**: "List parameters of module cpu_core"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "List parameters of module cpu_core"
  }
}
```

### 3. Signal Tracing

**Query**: "Where is signal 'clk' used?"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Where is signal 'clk' used?"
  }
}
```

**Query**: "Trace signal rst_n"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Trace signal rst_n"
  }
}
```

**Query**: "Find all occurrences of 'enable' signal"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Find all occurrences of 'enable' signal"
  }
}
```

### 4. Statistics and Summary

**Query**: "Give me project statistics"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Give me project statistics"
  }
}
```

**Query**: "Summary of the RTL design"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Summary of the RTL design"
  }
}
```

## Using Prompts

The RTL Parser MCP also provides pre-defined prompts for common analysis tasks:

### 1. Comprehensive Design Analysis
```json
{
  "prompt": "analyze_design",
  "arguments": {}
}
```

Or with a specific focus:
```json
{
  "prompt": "analyze_design",
  "arguments": {
    "focus_area": "clock domains"
  }
}
```

### 2. Find Design Issues
```json
{
  "prompt": "find_issues",
  "arguments": {}
}
```

### 3. Module Summary
```json
{
  "prompt": "summarize_module",
  "arguments": {
    "module_name": "cpu_core"
  }
}
```

## Context-Aware Queries

You can provide context to improve query understanding:

```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "How many registers does it have?",
    "context": {
      "current_module": "cpu_core",
      "recent_queries": [
        "Show me the ports of module cpu_core"
      ]
    }
  }
}
```

## Complex Natural Language Examples

**Query**: "Which module has the most registers?"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Which module has the most registers?"
  }
}
```

**Query**: "Find all clock signals in the design"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "Find all clock signals in the design"
  }
}
```

**Query**: "What is the total number of flip-flops and latches?"
```json
{
  "tool": "natural_language_query",
  "arguments": {
    "query": "What is the total number of flip-flops and latches?"
  }
}
```

## Tips for Natural Language Queries

1. **Be specific about module names**: Include the exact module name when querying about a specific module
2. **Use quotes for signal names**: When asking about signals, put the signal name in quotes
3. **Keywords that help**:
   - For registers: "register", "flip-flop", "flop", "latch"
   - For modules: "module", "hierarchy", "port", "parameter"
   - For signals: "signal", "trace", "where"
   - For statistics: "statistics", "summary", "how many"

4. **If the query isn't understood**: The system will provide suggestions for valid queries