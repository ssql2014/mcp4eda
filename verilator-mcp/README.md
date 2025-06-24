# Verilator MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![Verilator](https://img.shields.io/badge/Verilator-5.0+-green)](https://verilator.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An intelligent Model Context Protocol (MCP) server for Verilator that provides RTL simulation, automatic testbench generation, and natural language query capabilities. This tool bridges the gap between AI assistants and hardware verification, making RTL simulation more accessible and intelligent.

## Features

### 🚀 Core Capabilities
- **Automatic Testbench Generation**: Intelligently generates testbenches when none exist
- **Smart Simulation**: Compile and run simulations with automatic dependency management
- **Natural Language Queries**: Ask questions about your simulation in plain English
- **Waveform Analysis**: Generate and analyze simulation waveforms
- **Coverage Collection**: Track code coverage metrics
- **Protocol-Aware**: Built-in support for standard protocols (AXI, APB, etc.)

### 🤖 Natural Language Examples

#### Simulation Control
- "Run simulation on counter.v"
- "Simulate my design with waveform capture"
- "Execute the CPU testbench with coverage enabled"
- "Compile and run my ALU module"

#### Testbench Generation
- "Generate a testbench for my FIFO module"
- "Create an AXI testbench for the memory controller"
- "Make a testbench with random stimulus for my ALU"
- "Generate a protocol-aware testbench for my APB slave"

#### Debugging & Analysis
- "Why is data_valid low at 1000ns?"
- "What caused the assertion failure at time 5000?"
- "Show me when the reset signal changes"
- "Why is my output signal X?"
- "Debug the state machine transitions"

#### Coverage & Verification
- "Show me the coverage report"
- "Which code blocks are not tested?"
- "How can I improve coverage for the controller?"
- "Generate tests for uncovered scenarios"

#### Design Understanding
- "Explain how the CPU module works"
- "What are the inputs and outputs of the ALU?"
- "Analyze timing performance"
- "Show the module hierarchy"
- "What's the maximum operating frequency?"

## Installation

### Prerequisites
- Node.js 16+
- Verilator 5.0+ installed and in PATH
- Git

### Step 1: Install Verilator
Verilator must be installed before using this MCP server.

#### macOS (Homebrew)
```bash
brew install verilator
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install verilator
```

#### From Source
```bash
git clone https://github.com/verilator/verilator
cd verilator
autoconf
./configure
make -j `nproc`
sudo make install
```

#### Verify Installation
```bash
verilator --version
# Should output: Verilator 5.0 or higher
```

### Step 2: Install Verilator MCP
```bash
# Clone the repository
git clone https://github.com/ssql2014/verilator-mcp.git
cd verilator-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test the server
npm test
# Or run diagnostic
./diagnose.sh
```

### Step 3: Configure Claude Desktop
Add to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "verilator": {
      "command": "node",
      "args": ["/path/to/verilator-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 4: Restart Claude Desktop
After updating the configuration, restart Claude Desktop to load the MCP server.

### Environment Variables
- `LOG_LEVEL`: Set logging level (debug, info, warn, error)
- `VERILATOR_PATH`: Override Verilator installation path

## Available Tools

### 1. verilator_compile
Compile Verilog/SystemVerilog designs to C++.

**Parameters:**
- `files` (required): Array of design files
- `topModule`: Top module name
- `optimization`: Optimization level (0-3)
- `trace`: Enable waveform generation
- `coverage`: Enable coverage collection

**Example:**
```json
{
  "files": ["cpu.v", "alu.v"],
  "topModule": "cpu",
  "optimization": 2,
  "trace": true
}
```

### 2. verilator_simulate
Run RTL simulation with automatic testbench generation.

**Parameters:**
- `design` (required): Design file or directory
- `testbench`: Testbench file (auto-generated if missing)
- `autoGenerateTestbench`: Enable auto-generation (default: true)
- `enableWaveform`: Generate waveforms (default: true)
- `simulationTime`: Override simulation duration

**Example:**
```json
{
  "design": "counter.v",
  "autoGenerateTestbench": true,
  "enableWaveform": true,
  "simulationTime": 10000
}
```

### 3. verilator_testbenchgenerator
Generate intelligent testbenches for modules.

**Parameters:**
- `targetFile` (required): Verilog file containing module
- `targetModule` (required): Module name
- `template`: Template style (basic, uvm, cocotb, protocol)
- `protocol`: Protocol type (axi, apb, wishbone, avalon)
- `stimulusType`: Stimulus generation (directed, random, constrained_random)

**Example:**
```json
{
  "targetFile": "fifo.v",
  "targetModule": "fifo",
  "template": "basic",
  "stimulusType": "constrained_random",
  "generateAssertions": true
}
```

### 4. verilator_naturallanguage
Process natural language queries about simulation.

**Parameters:**
- `query` (required): Natural language question
- `context`: Current simulation context
- `history`: Previous query history

**Example:**
```json
{
  "query": "Why did the assertion fail at time 5000?",
  "context": {
    "currentSimulation": {
      "design": "cpu.v",
      "waveformFile": "simulation.vcd"
    }
  }
}
```

## Resources

The server provides access to simulation artifacts through MCP resources:

- `simulation://[project]/logs/[sim_id]` - Simulation output logs
- `simulation://[project]/waves/[sim_id]` - Waveform data
- `simulation://[project]/coverage/[sim_id]` - Coverage reports
- `design://[project]/hierarchy` - Module hierarchy
- `design://[project]/interfaces` - Interface definitions

## Testbench Generation Features

### Automatic Detection
- Clock and reset signal identification
- Port direction and width analysis
- Protocol recognition
- Parameter extraction

### Generated Components
- Clock generation with configurable frequency
- Reset sequences with proper polarity
- Directed and random stimulus
- Basic assertions and checkers
- Coverage points
- Waveform dumping

### Protocol Support
Built-in templates for:
- AXI (AXI4, AXI4-Lite, AXI-Stream)
- APB (APB3, APB4)
- Wishbone
- Avalon
- Custom protocols

## Natural Language Query Categories

### Debug Queries
- Signal value analysis
- Assertion failure investigation
- X/Z propagation tracking
- Timing relationship analysis

### Analysis Queries
- Performance metrics
- Resource utilization
- Critical path analysis
- Power estimation

### Coverage Queries
- Coverage statistics
- Uncovered code identification
- Test scenario suggestions

### Generation Queries
- Testbench creation
- Stimulus pattern generation
- Assertion generation
- Coverage point creation

## Examples

### Basic Simulation Flow
```javascript
// 1. Compile design
{
  "tool": "verilator_compile",
  "arguments": {
    "files": ["alu.v"],
    "topModule": "alu",
    "trace": true
  }
}

// 2. Run simulation (auto-generates testbench)
{
  "tool": "verilator_simulate",
  "arguments": {
    "design": "alu.v",
    "autoGenerateTestbench": true,
    "enableWaveform": true
  }
}

// 3. Query results
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Show me any errors in the simulation"
  }
}
```

### Natural Language Workflow Examples

#### Example 1: Complete Design Verification
```javascript
// Natural language: "Generate a testbench and run simulation for counter.v"
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Generate a testbench and run simulation for counter.v with coverage"
  }
}

// Response will trigger testbench generation and simulation automatically
```

#### Example 2: Debug Simulation Failure
```javascript
// After simulation fails, ask why
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Why did my simulation fail?",
    "context": {
      "currentSimulation": {
        "design": "fifo.v",
        "testbench": "tb_fifo.sv",
        "waveformFile": "sim_output/simulation.vcd"
      }
    }
  }
}

// Follow up with specific signal investigation
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Why is the full signal high when count is only 5?",
    "context": {
      "currentSimulation": {
        "design": "fifo.v",
        "waveformFile": "sim_output/simulation.vcd"
      }
    }
  }
}
```

#### Example 3: Coverage Improvement
```javascript
// Ask for coverage analysis
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "What's my current code coverage and how can I improve it?"
  }
}

// Generate specific tests for uncovered code
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Generate test cases for the error handling paths"
  }
}
```

#### Example 4: Design Understanding
```javascript
// Ask about module functionality
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Explain how the AXI arbiter module works and what are its key signals"
  }
}

// Analyze performance
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "What's the critical path in my design and how can I optimize it?"
  }
}
```

### Protocol-Based Testing
```javascript
// Generate AXI testbench
{
  "tool": "verilator_testbenchgenerator",
  "arguments": {
    "targetFile": "axi_slave.v",
    "targetModule": "axi_slave",
    "template": "protocol",
    "protocol": "axi",
    "generateAssertions": true
  }
}

// Or use natural language
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Create an AXI testbench with burst transactions for my memory controller"
  }
}
```

### Multi-Step Conversation Example
```javascript
// Step 1: Initial query
User: "I have a new UART module, help me verify it"
Assistant: "I'll help you verify your UART module. Let me first generate a testbench..."

// Step 2: Run simulation  
User: "Run the simulation with baud rate 115200"
Assistant: "Running simulation with 115200 baud rate..."

// Step 3: Debug issue
User: "The parity bit seems wrong"
Assistant: "Looking at the waveform, I can see the parity calculation is using even parity..."

// Step 4: Fix and verify
User: "Generate a test specifically for odd parity mode"
Assistant: "I'll create a directed test case for odd parity verification..."
```

## Development

### Building from Source
```bash
npm install
npm run build
```

### Running Tests
```bash
npm test
```

### Debug Mode
```bash
LOG_LEVEL=debug npm start
```

## Troubleshooting

### Quick Diagnostics
Run the diagnostic script to check your setup:
```bash
./diagnose.sh
```

### Common Issues

1. **Verilator not found**
   ```bash
   # Install Verilator first!
   brew install verilator  # macOS
   sudo apt-get install verilator  # Ubuntu/Debian
   
   # Verify installation
   verilator --version
   ```

2. **Server not starting in Claude Desktop**
   - Ensure Verilator is installed (see above)
   - Check paths in Claude Desktop config are absolute
   - Restart Claude Desktop after configuration changes
   - Run `./diagnose.sh` to check setup

3. **Compilation errors**
   - Check file paths are correct
   - Verify SystemVerilog syntax
   - Review error messages in logs

4. **Testbench generation fails**
   - Ensure module has standard port declarations
   - Check for unsupported constructs
   - Try simpler template options

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built on the Model Context Protocol by Anthropic
- Powered by Verilator open-source simulator
- Natural language processing using Natural library