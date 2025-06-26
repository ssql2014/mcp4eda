# Yosys MCP Natural Language Examples

The Yosys MCP server includes a natural language interface that understands synthesis commands in plain English. Here are examples of how to use it:

## Synthesis Examples

### Basic Synthesis
```
"Synthesize my counter.v design"
"Compile the design.v file"
"Generate a netlist from my Verilog file"
```

### Target-Specific Synthesis
```
"Synthesize my design for Xilinx FPGA"
"Compile counter.v targeting Intel Altera"
"Generate netlist for ice40 FPGA"
"Synthesize for ECP5 with aggressive optimization"
```

### Output Format Control
```
"Convert my design to BLIF format"
"Synthesize and output as JSON"
"Generate EDIF netlist from my Verilog"
"Save the synthesized design as Verilog"
```

### Optimization Control
```
"Synthesize with no optimization for debugging"
"Use aggressive optimization for area reduction"
"Compile with minimal optimization for fast synthesis"
"Synthesize with maximum optimization"
```

## Analysis Examples

### Design Statistics
```
"Analyze my design"
"Show design statistics"
"Get resource usage for counter.v"
"Display synthesis stats"
```

### Design Checking
```
"Check my design for errors"
"Verify the Verilog syntax"
"Run design rule checks"
```

### Hierarchy Analysis
```
"Show design hierarchy"
"Analyze module hierarchy"
"Display the design structure"
```

### Resource Estimation
```
"Estimate resources for my design"
"Show resource utilization"
"Analyze area usage"
```

## Visualization Examples

### Circuit Diagrams
```
"Show me the circuit diagram"
"Visualize my design"
"Display the synthesized circuit"
"Generate a graph of the design"
```

### Output Formats
```
"Show as PDF diagram"
"Generate PNG visualization"
"Create SVG circuit diagram"
"Export as DOT graph"
```

### Detail Control
```
"Show detailed circuit diagram"
"Generate full design visualization"
"Create simplified circuit view"
```

## Combined Operations

### Complete Flows
```
"Synthesize my CPU design for Xilinx and show statistics"
"Compile counter.v with aggressive optimization and visualize"
"Synthesize for ice40, optimize for area, and export as BLIF"
```

## How It Works

The natural language tool:
1. Interprets your intent from the query
2. Suggests the appropriate Yosys tool to use
3. Provides the correct arguments based on your request
4. Explains what it will do
5. Offers helpful hints for available options

Example response:
```json
{
  "interpretation": "You want to synthesize for a specific FPGA target",
  "suggestedTool": "yosys_synth",
  "suggestedArguments": {
    "filepath": "counter.v",
    "target": "xilinx",
    "outputFormat": "verilog",
    "optimizationLevel": 2
  },
  "explanation": "I'll synthesize counter.v targeting xilinx with optimization level 2",
  "hints": [
    "The output will be in verilog format",
    "You can specify different targets: xilinx, altera, ice40, ecp5, or generic",
    "Available output formats: verilog, json, blif, edif"
  ]
}
```

## Tips

1. Be specific about file names when possible
2. Mention target FPGA families by name (Xilinx, Intel, ice40, etc.)
3. Specify optimization goals (area, speed, power)
4. Request specific output formats when needed
5. Combine multiple operations in one request

The natural language interface makes it easy to use Yosys without memorizing command syntax!