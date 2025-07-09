# C2RTL Verification MCP Server (Enhanced)

Advanced formal verification tools for checking equivalence between C code and RTL implementations with natural language support and comprehensive resources.

## Features

- **Natural Language Interface**: Use plain English to run verifications
- **C-to-RTL Equivalence Checking**: Multiple verification methods (Verilator+CBMC, SymbiYosys)
- **Advanced Verification**: BMC, k-induction, property mining
- **Comprehensive Resources**: Best practices guides, assertion patterns, HLS guides
- **Verification Management**: Track results, debug failures, generate reports
- **Coverage Analysis**: Line, branch, condition, toggle, and FSM coverage
- **Debug Support**: Counterexample analysis with trace minimization

## Tools

### Core Verification Tools

#### c2rtl_equivalence
Check equivalence between C functions and RTL modules:
- **verilator-cbmc**: Convert RTL to C++ using Verilator, then use CBMC
- **symbiyosys**: Use SymbiYosys for formal verification
- Automatic wrapper generation
- Support for various data types

#### c2rtl_bmc
Bounded Model Checking for systematic verification:
- Configurable verification depth
- Property specification support
- Integration with multiple BMC engines

#### c2rtl_k_induction
Prove unbounded correctness using k-induction:
- Configurable induction depth
- Automatic base case and step verification
- Complete correctness proofs

### Analysis Tools

#### c2rtl_property_mining
Automatically discover properties from code:
- **Invariants**: State-based properties
- **Relationships**: Input/output correlations
- **Temporal**: Timing and sequence properties

#### c2rtl_coverage
Comprehensive coverage analysis:
- **Code Coverage**: Line, branch, condition
- **Hardware Coverage**: Toggle, FSM state/transition
- Coverage reports and gaps analysis

#### c2rtl_debug
Advanced debugging for failed verifications:
- **Trace Analysis**: Step-by-step execution trace
- **Minimization**: Find minimal failing case
- **Visualization**: Waveform generation
- **Explanation**: Root cause analysis

### Reporting and Management

#### c2rtl_report
Generate verification reports:
- Multiple formats: HTML, PDF, Markdown
- Comprehensive verification summaries
- Historical tracking

#### c2rtl_natural_language
Natural language interface for all tools:
- Plain English queries
- Automatic tool selection
- Context-aware processing

## Prerequisites

Install required tools:

```bash
# Verilator (for RTL to C++ conversion)
brew install verilator

# Yosys and SymbiYosys (for formal verification)
brew install yosys
pip3 install git+https://github.com/YosysHQ/SymbiYosys.git

# CBMC (for C verification)
brew install cbmc

# Optional: Commercial tools
# - Cadence SLEC
# - Synopsys Hector
# - Mentor Graphics Catapult
```

## Installation

```bash
cd /Users/qlss/Documents/mcp4eda/c2rtl-verify-mcp
pip3 install --user -r requirements.txt
```

Add to Claude Code:
```bash
claude mcp add --scope user c2rtl-verify python3 /Users/qlss/Documents/mcp4eda/c2rtl-verify-mcp/server.py
```

## Natural Language Usage Examples

### Basic Queries
- "Check if adder.c and adder.v are equivalent"
- "Find properties in my filter implementation"
- "What's the branch coverage of my verification?"
- "Debug why the last verification failed"
- "Generate an HTML report of all verifications"

### Advanced Queries
- "Run bounded model checking with depth 50 on my design"
- "Prove correctness using k-induction with k=5"
- "Find all temporal properties in the RTL"
- "Minimize the counterexample from the failed verification"

### Example with Context
```json
{
  "tool": "c2rtl_natural_language",
  "arguments": {
    "query": "verify that the add function in math.c matches the adder module in alu.v",
    "context": {
      "c_files": ["math.c"],
      "rtl_files": ["alu.v"]
    }
  }
}
```

## Resources

The server provides comprehensive guides accessible as resources:

### Available Guides
- **`guide://c2rtl/best-practices`**: C2RTL Verification Best Practices
- **`guide://c2rtl/hls-verification`**: Complete HLS Verification Guide
- **`guide://c2rtl/assertion-patterns`**: Common Assertion Pattern Library

### Verification Results
All verification results are stored and accessible as resources:
- **`verification://result/{id}`**: Access specific verification results
- Results include status, counterexamples, coverage data

## Direct Tool Usage Examples

### 1. Equivalence Checking with Depth Control
```json
{
  "tool": "c2rtl_equivalence",
  "arguments": {
    "c_file": "crypto.c",
    "rtl_file": "aes_core.v",
    "c_function": "aes_encrypt",
    "rtl_module": "aes_core",
    "method": "symbiyosys",
    "depth": 50
  }
}
```

### 2. Property Mining
```json
{
  "tool": "c2rtl_property_mining",
  "arguments": {
    "c_file": "controller.c",
    "rtl_file": "fsm.v",
    "mining_strategy": "temporal"
  }
}
```

### 3. Coverage Analysis
```json
{
  "tool": "c2rtl_coverage",
  "arguments": {
    "c_file": "dsp.c",
    "rtl_file": "fir.v",
    "coverage_type": "all"
  }
}
```

### 4. Debug Failed Verification
```json
{
  "tool": "c2rtl_debug",
  "arguments": {
    "verification_id": "verify_20250109_143022",
    "analysis_type": "explain"
  }
}
```

## Example Files

See the `examples/` directory for sample C and RTL files that can be used for verification.

## Verification Flow

1. **Parse C code**: Extract function signatures and behavior
2. **Parse RTL**: Extract module interfaces and behavior
3. **Generate wrapper**: Create verification harness
4. **Run formal tools**: Execute equivalence checking
5. **Report results**: Show equivalence or counterexamples

## Limitations

- Currently supports simple data types (integers, arrays)
- RTL must have clear input/output interfaces
- Complex pointer operations in C may require manual annotation
- Timing verification requires additional constraints

## Future Enhancements

- Support for floating-point verification
- Integration with more HLS tools
- Automated testbench generation
- Support for SystemC models
- Incremental verification for large designs