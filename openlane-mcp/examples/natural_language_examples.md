# OpenLane MCP Natural Language Examples

The OpenLane MCP server includes a natural language interface that understands RTL-to-GDSII flow commands in plain English. Here are examples of how to use it:

## Complete Flow Examples

### Running Full Flow
```
"Run complete RTL to GDSII flow for my counter design"
"Execute OpenLane flow on cpu_core with 8 threads"
"Generate GDSII from my Verilog design"
"Run the full ASIC flow for my RISC-V processor"
```

### With Specific Parameters
```
"Run OpenLane flow for counter with 65% utilization"
"Execute flow with 500MHz target frequency"
"Generate GDSII with AREA optimization strategy"
"Run flow using 16 threads for faster execution"
```

## Individual Stage Examples

### Synthesis
```
"Run synthesis on my design"
"Synthesize cpu_core targeting 1GHz"
"Execute synthesis with AREA optimization"
"Run logic synthesis for my counter"
```

### Floorplanning
```
"Run floorplanning with 70% utilization"
"Execute floorplan stage with 50um core spacing"
"Create floorplan for my design"
"Run floorplanning with custom die area"
```

### Placement
```
"Run placement for my design"
"Execute global placement"
"Run detailed placement with high effort"
"Place standard cells for cpu_core"
```

### Clock Tree Synthesis
```
"Run clock tree synthesis"
"Execute CTS with target skew of 100ps"
"Build clock tree for my design"
"Run CTS with buffer sizing"
```

### Routing
```
"Run routing for my design"
"Execute global and detailed routing"
"Route with 8 metal layers"
"Run routing with via optimization"
```

## Design Checking and Validation

```
"Check my design configuration"
"Validate OpenLane setup for counter"
"Verify design is ready for flow"
"Check if my design meets requirements"
```

## Report Generation

```
"Generate reports for the completed flow"
"Show me synthesis statistics"
"Generate timing reports"
"Create area and power reports"
```

## Multi-Stage Commands

```
"Run synthesis and floorplanning for my design"
"Execute placement and routing stages"
"Run everything from synthesis to routing"
"Complete physical design after synthesis"
```

## Configuration Queries

```
"What PDK am I using?"
"Show current design configuration"
"What's the target frequency?"
"Display flow configuration"
```

## How It Works

The natural language tool:
1. Interprets your flow command intent
2. Identifies which stages to run
3. Extracts parameters like frequency, utilization, threads
4. Suggests the appropriate OpenLane tool
5. Provides helpful context and options

Example response:
```json
{
  "interpretation": "You want to run the complete RTL to GDSII flow",
  "suggestedTool": "openlane_run_flow",
  "suggestedArguments": {
    "designName": "counter",
    "designPath": "/path/to/counter",
    "threads": 8
  },
  "explanation": "I'll run the complete OpenLane flow for counter using 8 threads",
  "hints": [
    "The flow includes: synthesis, floorplan, placement, CTS, routing, and GDSII generation",
    "Using default PDK: sky130A",
    "Results will be in runs/RUN_[timestamp]",
    "You can monitor progress in the log files"
  ]
}
```

## Tips for Natural Language Commands

1. **Design Names**: Always mention your design name clearly
2. **Stages**: Use common names like "synthesis", "placement", "routing"
3. **Parameters**: Specify values with units (MHz, %, um)
4. **Optimization**: Mention goals like "area", "timing", "power"
5. **Resources**: Specify thread count for parallel execution

## Common Patterns

### Quick commands
- "Run OpenLane on [design]"
- "Synthesize [design] for [frequency]MHz"
- "Route my [design]"

### Detailed specifications
- "Run flow for [design] with [utilization]% utilization and [frequency]MHz target"
- "Execute [stage] with [optimization] strategy using [threads] threads"

### Stage-specific
- "Run synthesis → Run floorplan → Run placement → Run CTS → Run routing"
- Each stage can be controlled individually with specific parameters

The natural language interface makes it easy to control OpenLane without memorizing complex command syntax!