# Project Analysis Examples

This document demonstrates the advanced Verible MCP tools for project-level analysis.

## Project Structure Analysis

### verible_project - Analyze entire project

```javascript
const result = await useTool('verible_project', {
  root_path: './src',
  symbol_table: true,
  print_deps: true,
  include_dirs: ['./include', './lib']
});
```

Expected output:
```json
{
  "success": true,
  "data": {
    "symbols": [
      {
        "name": "cpu_core",
        "kind": "module",
        "file": "/path/to/src/cpu_core.v",
        "line": 1,
        "column": 8
      },
      {
        "name": "clk",
        "kind": "port",
        "file": "/path/to/src/cpu_core.v",
        "line": 5,
        "column": 9,
        "parent": "cpu_core"
      }
    ],
    "dependencies": [
      {
        "from": "top.v",
        "to": "cpu_core",
        "type": "instance"
      },
      {
        "from": "cpu_core.v",
        "to": "defines.vh",
        "type": "include"
      }
    ],
    "fileCount": 25,
    "moduleCount": 15,
    "stats": {
      "totalLines": 5000,
      "totalSymbols": 350,
      "byKind": {
        "module": 15,
        "port": 120,
        "parameter": 45,
        "variable": 170
      }
    }
  }
}
```

## Code Comparison

### verible_diff - Compare two versions

```javascript
const result = await useTool('verible_diff', {
  file1: 'cpu_v1.v',
  file2: 'cpu_v2.v',
  mode: 'format',
  context_lines: 5
});
```

Expected output:
```json
{
  "success": true,
  "data": {
    "hasChanges": true,
    "additions": 15,
    "deletions": 8,
    "modifications": 12,
    "changes": [
      {
        "type": "modify",
        "startLine": 45,
        "endLine": 48,
        "content": "- reg [31:0] old_counter;\n+ reg [63:0] new_counter;  // Extended to 64-bit",
        "description": "Modified lines"
      },
      {
        "type": "add",
        "file": "cpu_v2.v",
        "startLine": 120,
        "endLine": 125,
        "content": "// New feature: Cache controller\nalways @(posedge clk) begin\n  if (cache_enable) begin\n    cache_data <= mem_data;\n  end\nend",
        "description": "Added lines"
      }
    ]
  }
}
```

## Code Obfuscation

### verible_obfuscate - Protect IP

```javascript
const result = await useTool('verible_obfuscate', {
  filepath: 'proprietary_design.v',
  output_file: 'design_protected.v',
  preserve_interface: true,
  preserve: ['clk', 'rst_n', 'data_in', 'data_out'],
  save_map: true,
  map_file: 'design.map'
});
```

Expected output:
```json
{
  "success": true,
  "data": {
    "obfuscated": true,
    "content": "module m_a1b2c3 (\n  input wire clk,\n  input wire rst_n,\n  input wire [31:0] data_in,\n  output reg [31:0] data_out\n);\n  reg [31:0] v_d4e5f6;\n  reg [3:0] v_g7h8i9;\n  // ... obfuscated content ...",
    "mappingFile": "design.map",
    "preservedIdentifiers": [
      "clk", "rst_n", "data_in", "data_out", "module", "input", "output"
    ],
    "obfuscatedCount": 47
  }
}
```

Mapping file content (design.map):
```
cpu_core -> m_a1b2c3
internal_counter -> v_d4e5f6
state_machine -> v_g7h8i9
calculate_crc -> f_j0k1l2
IDLE -> c_m3n4o5
ACTIVE -> c_p6q7r8
```

## Use Cases

### 1. Project Documentation Generation
Use `verible_project` to extract all symbols and generate documentation:
- Module hierarchy diagrams
- Port interface documentation
- Parameter listings
- Dependency graphs

### 2. Code Review and Versioning
Use `verible_diff` for:
- Pre-commit checks
- Code review automation
- Version comparison reports
- Change impact analysis

### 3. IP Protection
Use `verible_obfuscate` to:
- Protect proprietary algorithms
- Share code with third parties
- Create evaluation versions
- Maintain readable interfaces

### 4. Project Refactoring
Combine tools for safe refactoring:
1. Use `verible_project` to understand dependencies
2. Use `verible_analyze` to identify affected registers
3. Use `verible_diff` to verify changes
4. Use `verible_lint` to ensure code quality