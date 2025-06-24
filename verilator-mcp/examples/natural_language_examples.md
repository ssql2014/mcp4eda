# Natural Language Query Examples for Verilator MCP

This document provides examples of natural language queries you can use with the Verilator MCP.

## Simulation Control

### Running Simulations
- "Run simulation on counter.v"
- "Simulate my design with waveform capture"
- "Execute the CPU testbench with coverage enabled"
- "Run a quick simulation without waveforms"

### Compilation
- "Compile the ALU module with optimization level 3"
- "Build my design for debugging"
- "Compile all Verilog files in the src directory"

## Testbench Generation

### Basic Generation
- "Generate a testbench for the FIFO module"
- "Create a simple testbench for counter.v"
- "Make a testbench with random stimulus for my ALU"

### Protocol-Specific
- "Generate an AXI testbench for my memory controller"
- "Create an APB testbench with write and read transactions"
- "Build a Wishbone master testbench"

### Advanced Options
- "Generate a testbench with constrained random testing"
- "Create a UVM testbench for the CPU core"
- "Make a testbench with functional coverage points"

## Debugging Queries

### Signal Analysis
- "Why is data_valid low at time 1000ns?"
- "What's the value of address bus at 500ns?"
- "Show me when the reset signal changes"
- "Why is my output signal X?"

### Assertion Analysis
- "Why did the assertion fail at time 5000?"
- "Show me all assertion failures"
- "Which assertions passed in the last simulation?"
- "Explain the FIFO overflow assertion failure"

### Waveform Analysis
- "Show the clock frequency in the waveform"
- "Find glitches in the data signal"
- "When does the state machine enter IDLE?"
- "Display all signal transitions between 1000-2000ns"

## Coverage Analysis

### Coverage Metrics
- "What's the overall code coverage?"
- "Show me the line coverage for ALU.v"
- "Which code blocks are not covered?"
- "Display toggle coverage statistics"

### Coverage Improvement
- "How can I improve coverage for the controller?"
- "Generate tests for uncovered code"
- "What scenarios am I missing in my testbench?"
- "Show functional coverage holes"

## Design Analysis

### Performance
- "What's the maximum operating frequency?"
- "Analyze the critical path"
- "Show timing violations"
- "Estimate power consumption"

### Structure
- "Explain how the CPU module works"
- "What are the inputs and outputs of the ALU?"
- "Show the module hierarchy"
- "Describe the state machine implementation"

### Quality
- "Check for common design issues"
- "Find potential race conditions"
- "Analyze clock domain crossings"
- "Look for combinational loops"

## Code Generation

### Stimulus Generation
- "Generate a test case for FIFO overflow"
- "Create stimulus to test all ALU operations"
- "Make a sequence to verify the protocol"
- "Generate corner case tests"

### Assertion Generation
- "Create assertions for the AXI interface"
- "Generate property checks for the FIFO"
- "Add timing assertions"
- "Create data integrity checks"

## Complex Queries

### Multi-Step Operations
- "Run simulation and tell me why it failed"
- "Generate a testbench and run it with coverage"
- "Debug the assertion failure in the last simulation"
- "Compile, simulate, and show coverage report"

### Comparative Analysis
- "Compare waveforms from two simulations"
- "What changed between the last two runs?"
- "Show performance differences after optimization"

### Root Cause Analysis
- "Why is my simulation hanging?"
- "Find the source of the X propagation"
- "What's causing the timing violation?"
- "Debug the reset sequence issue"

## Tips for Effective Queries

1. **Be Specific**: Include signal names, time values, and module names when relevant
2. **Provide Context**: Mention the design or testbench you're working with
3. **Use Technical Terms**: The system understands RTL terminology
4. **Ask Follow-ups**: Build on previous queries for deeper analysis

## Example Conversation Flow

```
User: "Generate a testbench for counter.v"
Assistant: "I'll generate a testbench for the counter module..."

User: "Run simulation with the generated testbench"
Assistant: "Running simulation with waveform capture..."

User: "Why is the overflow signal not asserting?"
Assistant: "Looking at the waveform, the overflow signal requires both..."

User: "Generate a test case to verify overflow"
Assistant: "I'll create a directed test that sets count to MAX_COUNT..."
```