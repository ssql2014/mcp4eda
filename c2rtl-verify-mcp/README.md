# C2RTL Verification MCP Server

Formal verification tools for checking equivalence between C code and RTL (Verilog/VHDL) implementations.

## Features

- **C-to-RTL Equivalence Checking**: Verify functional equivalence between C functions and RTL modules
- **HLS Verification**: Verify High-Level Synthesis generated RTL against original C code
- **Assertion Generation**: Generate SVA, PSL, or CBMC assertions for verification
- **Co-simulation**: Run co-simulation between C and RTL implementations

## Tools

### c2rtl_equivalence
Check equivalence between a C function and RTL module using various methods:
- **verilator-cbmc**: Convert RTL to C++ using Verilator, then use CBMC
- **yosys-sby**: Use Yosys + SymbiYosys for formal verification
- **cbmc-hw**: Direct hardware verification with CBMC (requires CBMC-HW)

### c2rtl_hls_verify
Verify HLS-generated RTL against original C code:
- Support for Vivado HLS, Intel HLS, LegUp, Bambu
- Functional, timing, and resource verification

### c2rtl_generate_assertions
Generate verification assertions in various formats:
- **SVA**: SystemVerilog Assertions
- **PSL**: Property Specification Language
- **CBMC**: C assertions for CBMC

### c2rtl_cosim
Co-simulation between C and RTL:
- Random test generation
- Support for Verilator, Icarus Verilog, ModelSim
- Automatic comparison of outputs

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

## Usage Examples

### 1. Basic Equivalence Checking
```json
{
  "tool": "c2rtl_equivalence",
  "arguments": {
    "c_file": "adder.c",
    "rtl_file": "adder.v",
    "c_function": "add",
    "rtl_module": "adder",
    "method": "verilator-cbmc"
  }
}
```

### 2. HLS Verification
```json
{
  "tool": "c2rtl_hls_verify",
  "arguments": {
    "c_file": "fir_filter.c",
    "hls_rtl": "fir_filter_hls.v",
    "hls_tool": "vivado_hls",
    "properties": ["functional", "timing"]
  }
}
```

### 3. Generate Assertions
```json
{
  "tool": "c2rtl_generate_assertions",
  "arguments": {
    "c_file": "controller.c",
    "rtl_file": "controller.v",
    "output_format": "sva"
  }
}
```

### 4. Co-simulation
```json
{
  "tool": "c2rtl_cosim",
  "arguments": {
    "c_file": "dsp_algo.c",
    "rtl_file": "dsp_module.v",
    "num_tests": 10000,
    "simulator": "verilator"
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