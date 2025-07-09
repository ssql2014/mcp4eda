# CBMC MCP Server

MCP (Model Context Protocol) server for CBMC (C Bounded Model Checker), providing tools for C/C++ program verification and equivalence checking.

## Features

- **Program Verification**: Check assertions, bounds, pointers, and arithmetic overflows
- **Equivalence Checking**: Compare two C functions for behavioral equivalence
- **Property Inspection**: List all properties and assertions in C code
- **Test Generation**: Generate test cases with coverage criteria
- **Natural Language Interface**: Process verification queries in natural language

## Tools

### cbmc_verify
Verify C/C++ code for various properties:
- Assertion violations
- Array bounds violations
- Pointer safety
- Arithmetic overflows
- Division by zero

### cbmc_equivalence
Check if two C functions are functionally equivalent by:
- Creating a verification harness
- Making inputs non-deterministic
- Comparing outputs for all possible inputs

### cbmc_show_properties
Display all properties and assertions in a C file.

### cbmc_generate_tests
Generate test cases based on coverage criteria:
- Branch coverage
- Condition coverage
- Path coverage

### cbmc_natural_language
Process natural language queries about verification tasks and automatically invoke appropriate tools.

Examples:
- "verify test.c for array bounds violations"
- "check if abs_v1.c and abs_v2.c are equivalent"
- "show all assertions in my_code.c"
- "generate branch coverage tests for sort.c"

The tool interprets your query and automatically calls the appropriate CBMC tool.

## Installation

1. Install CBMC:
```bash
# macOS
brew install cbmc

# Ubuntu/Debian
sudo apt-get install cbmc

# From source
git clone https://github.com/diffblue/cbmc.git
cd cbmc
make -C src
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Start the server:
```bash
python server.py
```

### Example: Verify a C file
```python
{
  "tool": "cbmc_verify",
  "arguments": {
    "file": "example.c",
    "property": "bounds",
    "unwind": 5
  }
}
```

### Example: Check equivalence
```python
{
  "tool": "cbmc_equivalence", 
  "arguments": {
    "file1": "implementation1.c",
    "file2": "implementation2.c",
    "function": "sort",
    "inputs": ["array", "size"]
  }
}
```

## Integration with Claude Code

Add to your MCP settings:
```json
{
  "mcpServers": {
    "cbmc": {
      "command": "python",
      "args": ["/path/to/cbmc-mcp/server.py"]
    }
  }
}
```

### Natural Language Usage

You can use natural language to invoke CBMC tools:

```python
# Example 1: Verification
{
  "tool": "cbmc_natural_language",
  "arguments": {
    "query": "verify the array access in my code",
    "context": {
      "files": ["array_code.c"]
    }
  }
}

# Example 2: Equivalence checking
{
  "tool": "cbmc_natural_language",
  "arguments": {
    "query": "check if these two sort functions are equivalent",
    "context": {
      "files": ["bubble_sort.c", "quick_sort.c"]
    }
  }
}

# Example 3: Test generation
{
  "tool": "cbmc_natural_language",
  "arguments": {
    "query": "generate tests with condition coverage for my parser",
    "context": {
      "files": ["parser.c"]
    }
  }
}
```