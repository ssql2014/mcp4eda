# Natural Language Support in MCP4EDA Servers

## Overview

This document summarizes the natural language support across all MCP servers in the mcp4eda ecosystem. Natural language interfaces allow users to interact with EDA tools using plain English commands instead of complex syntax.

## Support Status

| MCP Server | Natural Language | Resources | Examples Documentation |
|------------|------------------|-----------|------------------------|
| ✅ yosys-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](yosys-mcp/examples/natural_language_examples.md) |
| ✅ verilator-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](verilator-mcp/examples/natural_language_examples.md) |
| ✅ verible-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](verible-mcp/examples/natural_language_examples.md) |
| ✅ gtkwave-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](gtkwave-mcp/examples/natural_language_examples.md) |
| ✅ klayout-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](klayout-mcp/examples/natural_language_examples.md) |
| ✅ anysilicon | ✅ Supported | ✅ Supported | ✅ [Examples](anysilicon/examples/natural_language_examples.md) |
| ✅ semiconductor-supply-chain-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](semiconductor-supply-chain-mcp/examples/natural-language-queries.md) |
| ✅ openlane-mcp | ✅ Supported | ✅ Supported | ✅ [Examples](openlane-mcp/examples/natural_language_examples.md) |

## Natural Language Tool Names

Each server implements a natural language tool with the following naming convention:

- **yosys-mcp**: `yosys_natural_language`
- **verilator-mcp**: `verilator_naturallanguage`
- **verible-mcp**: `natural_language_query`
- **gtkwave-mcp**: `gtkwave_natural_language`
- **klayout-mcp**: `klayout_natural_language`
- **anysilicon**: `anysilicon_natural_language`
- **semiconductor-supply-chain-mcp**: `natural_language_query`
- **openlane-mcp**: `openlane_natural_language`

## Common Natural Language Patterns

### 1. Synthesis & Compilation
```
"Synthesize my design for Xilinx FPGA"
"Compile counter.v with optimization"
"Generate netlist for ice40"
```

### 2. Analysis & Verification
```
"Analyze design statistics"
"Check for errors in my code"
"Run linting on all Verilog files"
```

### 3. Visualization
```
"Show circuit diagram"
"Display waveform from 0 to 1000ns"
"Generate layout view"
```

### 4. Format Conversion
```
"Convert VCD to FST format"
"Change GDS to OASIS"
"Export as JSON"
```

### 5. Calculations
```
"Calculate dies per wafer for 10x10mm chip"
"Estimate resources for my design"
"Measure timing between signals"
```

## Implementation Guidelines

For developers adding natural language support to new MCP servers:

### 1. Tool Structure
```typescript
class NaturalLanguageTool {
  name = 'server_natural_language';
  description = 'Process natural language queries about [domain]';
  
  execute(input: { query: string, context?: any }) {
    // 1. Parse intent from query
    // 2. Extract parameters
    // 3. Generate tool suggestion
    // 4. Return structured response
  }
}
```

### 2. Response Format
```json
{
  "interpretation": "What the user wants to do",
  "suggestedTool": "tool_name",
  "suggestedArguments": {
    // Tool-specific arguments
  },
  "explanation": "What will be done",
  "hints": [
    "Additional options available",
    "Tips for better results"
  ]
}
```

### 3. Best Practices
- Support common variations of commands
- Extract numeric values and units
- Handle context from previous operations
- Provide helpful hints and alternatives
- Map domain-specific terminology

## Benefits

1. **Accessibility**: Users don't need to memorize tool syntax
2. **Discoverability**: Natural queries help users find features
3. **Efficiency**: Quick commands for common operations
4. **Learning**: Hints teach proper tool usage
5. **Context**: Maintains conversation context

## Examples Across Domains

### RTL Design
- "Synthesize and optimize for area"
- "Check my Verilog for errors"
- "Format this SystemVerilog code"

### Simulation
- "Run simulation for 1 microsecond"
- "Generate testbench for my module"
- "Show waveform of clock signals"

### Physical Design
- "Convert layout to OASIS format"
- "Run DRC with 45nm rules"
- "Extract metal layers"

### Manufacturing
- "Calculate yield for 300mm wafer"
- "Find DDR5 IP vendors"
- "Estimate ASIC NRE costs"

## Future Enhancements

1. **Multi-tool Workflows**: Chain operations across tools
2. **Learning**: Adapt to user preferences
3. **Suggestions**: Proactive recommendations
4. **Validation**: Check feasibility before execution
5. **Explanations**: Detailed reasoning for suggestions

## Conclusion

All 8 MCP servers in the mcp4eda ecosystem now support natural language interfaces, making EDA tools more accessible and user-friendly. Users can perform complex operations using simple English commands, with the system providing intelligent interpretation and helpful guidance.