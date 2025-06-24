# Verilator MCP Demo

## Quick Test Commands

### 1. Generate Testbench for Counter
```json
{
  "tool": "verilator_testbenchgenerator",
  "arguments": {
    "targetFile": "examples/counter.v",
    "targetModule": "counter",
    "outputFile": "examples/tb_counter.sv",
    "template": "basic",
    "stimulusType": "directed",
    "generateAssertions": true,
    "generateCoverage": true
  }
}
```

### 2. Run Simulation with Auto-Generated Testbench
```json
{
  "tool": "verilator_simulate", 
  "arguments": {
    "design": "examples/counter.v",
    "autoGenerateTestbench": true,
    "enableWaveform": true,
    "outputDir": "sim_output",
    "simulationTime": 10000
  }
}
```

### 3. Natural Language Query Examples
```json
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Generate a testbench for the counter module"
  }
}
```

```json
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Why is the overflow signal not asserting?"
  }
}
```

## Claude Desktop Configuration

Add to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "verilator": {
      "command": "node",
      "args": ["/Users/qlss/Documents/mcp4eda/verilator-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Testing Without Claude Desktop

You can test the tools using the MCP inspector or by creating a simple client script.