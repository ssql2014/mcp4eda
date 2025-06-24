# Natural Language Query Guide for Verilator MCP

This guide provides comprehensive examples of natural language queries supported by the Verilator MCP.

## Quick Reference

### 🚀 Getting Started Queries
- "Help me get started with verifying my design"
- "What can you do?"
- "Show me how to test my module"

### 🏃 Running Simulations
- "Run simulation on [module].v"
- "Simulate my design with waveforms"
- "Execute the testbench with coverage"
- "Run a quick test without waveforms"
- "Compile and simulate my CPU core"

### 🧪 Testbench Generation
- "Generate a testbench for [module]"
- "Create a random testbench for my ALU"
- "Make an AXI testbench for the memory controller"
- "Generate a testbench with assertions for my FIFO"
- "Create a protocol-aware testbench for my APB slave"

### 🐛 Debugging
- "Why is [signal] [high/low/X] at [time]?"
- "What caused the assertion failure?"
- "Debug the reset sequence"
- "Why is my output undefined?"
- "Show me signal transitions between 1000-2000ns"
- "Find the source of X propagation"

### 📊 Coverage Analysis
- "What's my code coverage?"
- "Show uncovered code blocks"
- "How can I improve coverage?"
- "Generate tests for missing scenarios"
- "Which branches are not tested?"

### 🔍 Design Analysis
- "Explain how [module] works"
- "What does [signal] do?"
- "Show the module hierarchy"
- "Analyze timing performance"
- "What's the critical path?"
- "Estimate power consumption"

## Detailed Examples by Category

### Simulation Control

#### Basic Simulation
```
Query: "Run simulation on counter.v"
Action: Compiles and simulates with auto-generated testbench
```

#### With Specific Options
```
Query: "Simulate my FIFO with 100MHz clock and coverage enabled"
Action: Generates testbench with 10ns clock period and enables coverage
```

#### Quick Testing
```
Query: "Do a quick simulation without waveforms"
Action: Runs faster simulation without VCD generation
```

### Testbench Generation

#### Simple Testbench
```
Query: "Generate a basic testbench for my adder module"
Result: Creates testbench with:
- Clock generation
- Reset sequence
- Directed test cases
- Basic assertions
```

#### Protocol-Specific
```
Query: "Create an AXI4 testbench with read and write transactions"
Result: Generates testbench with:
- AXI protocol signals
- Read/write transaction tasks
- Protocol compliance checks
- Burst transfer support
```

#### Advanced Features
```
Query: "Generate a UVM testbench with constrained random stimulus"
Result: Creates UVM-compliant testbench with:
- Randomized transactions
- Functional coverage
- Scoreboard
- Monitor components
```

### Debugging Workflows

#### Signal Analysis
```
Query: "Why is data_valid low when ready is high at 1500ns?"
Analysis:
1. Examines waveform at specified time
2. Traces signal dependencies
3. Identifies root cause
4. Suggests potential fixes
```

#### Assertion Failures
```
Query: "Debug the FIFO overflow assertion failure"
Analysis:
1. Locates assertion in code
2. Examines signals at failure time
3. Traces back to find cause
4. Recommends test modifications
```

#### X-Propagation
```
Query: "Find why my output bus has X values"
Analysis:
1. Identifies X sources
2. Traces propagation path
3. Checks reset behavior
4. Suggests initialization fixes
```

### Coverage Improvement

#### Coverage Summary
```
Query: "Show me detailed coverage metrics"
Response:
- Line coverage: 87%
- Toggle coverage: 92%
- Functional coverage: 78%
- Uncovered files listed
```

#### Targeted Testing
```
Query: "Generate tests for the state machine error states"
Action: Creates specific test cases for uncovered states
```

### Design Understanding

#### Module Explanation
```
Query: "Explain the arbitration logic in my bus controller"
Response:
- Module purpose and architecture
- Input/output descriptions
- Key algorithmic details
- Timing requirements
```

#### Performance Analysis
```
Query: "Analyze the critical path and suggest optimizations"
Response:
- Critical path identification
- Timing bottlenecks
- Optimization suggestions
- Pipeline recommendations
```

## Conversation Flows

### Complete Verification Flow
```
1. User: "I have a new SPI controller to verify"
   Bot: "I'll help verify your SPI controller. Let me analyze the module..."

2. User: "Generate a comprehensive testbench"
   Bot: "Creating SPI protocol testbench with master/slave modes..."

3. User: "Run simulation with all SPI modes"
   Bot: "Running simulation with modes 0-3, various clock speeds..."

4. User: "Why is MISO undefined in mode 2?"
   Bot: "Analyzing waveform... The issue appears to be with clock phase..."

5. User: "Fix the testbench and rerun"
   Bot: "Updated testbench with correct CPOL/CPHA settings..."
```

### Debug Session
```
1. User: "My simulation is failing"
   Bot: "Let me check the simulation log for errors..."

2. User: "The error mentions setup time violation"
   Bot: "Found timing violation on data_in at 2340ns..."

3. User: "How do I fix this?"
   Bot: "You can either: 1) Adjust clock frequency, 2) Add pipeline stage..."

4. User: "Show me where to add the pipeline"
   Bot: "Add a register stage between modules A and B at line 145..."
```

## Tips for Best Results

### Be Specific
- ❌ "Fix my design"
- ✅ "Debug why the FIFO full flag doesn't assert"

### Include Context
- ❌ "Why doesn't it work?"
- ✅ "Why does the state machine stay in IDLE when start is asserted?"

### Use Technical Terms
- ❌ "The output is wrong"
- ✅ "The parity bit doesn't match expected odd parity"

### Provide Details
- ❌ "Generate a test"
- ✅ "Generate a test for back-to-back write transactions with random addresses"

## Advanced Queries

### Complex Debugging
- "Trace the data path from input port A to output port Y"
- "Find all assignments to signal X and show their conditions"
- "Why does the design work in simulation but fail on hardware?"

### Optimization
- "Profile the simulation and identify bottlenecks"
- "Suggest ways to reduce simulation time"
- "How can I optimize this design for FPGA implementation?"

### Verification Strategy
- "Create a verification plan for my Ethernet MAC"
- "What corner cases should I test for my arbiter?"
- "Generate assertions for all interface protocols"

## Error Messages and Solutions

### Common Issues
```
Query: "Error: Verilator not found"
Solution: "Install Verilator or add to PATH: brew install verilator"

Query: "Simulation timeout"
Solution: "Increase timeout or check for infinite loops in design"

Query: "Coverage data missing"
Solution: "Enable coverage in compilation: add coverage: true"
```

## Integration Examples

### With CI/CD
```
Query: "Generate a regression test suite for my CPU"
Result: Creates multiple test scenarios for automated testing
```

### With Documentation
```
Query: "Document the interface protocol for my module"
Result: Generates markdown with timing diagrams and protocol description
```

## Remember
- The more context you provide, the better the assistance
- You can have multi-turn conversations for complex debugging
- The tool maintains context between queries in a session
- Natural language queries can trigger multiple tools automatically