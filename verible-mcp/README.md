# Verible MCP Server

An MCP (Model Context Protocol) server that provides access to Verible SystemVerilog/Verilog tools.

## Features

### Currently Implemented Tools

1. **verible_lint** - Style linting and code quality checks
   - Configurable rules and rulesets
   - Waiver file support
   - Automatic fixing for certain violations
   - Detailed violation reporting with line/column information

2. **verible_format** - Code formatting
   - Configurable indentation and line length
   - In-place formatting or preview mode
   - Format specific line ranges
   - Verify formatting without changes

3. **verible_syntax** - Syntax parsing and analysis
   - Parse tree visualization
   - JSON export of AST
   - Token stream analysis
   - Syntax verification

4. **verible_analyze** - Code analysis for registers and modules
   - Detect and count all registers (flip-flops, latches)
   - Calculate total register bits
   - Group registers by type and module
   - Identify clock and reset signals
   - Support for recursive directory analysis

5. **verible_project** - Project-level analysis
   - Symbol table generation
   - File dependency analysis
   - Module hierarchy extraction
   - Cross-reference information
   - Project statistics

6. **verible_diff** - Syntax-aware file comparison
   - Structural diff comparison
   - Format-aware differences
   - Configurable context lines
   - Change type classification

7. **verible_obfuscate** - Code obfuscation
   - Identifier renaming
   - Preserve module interfaces
   - Mapping file generation
   - Selective preservation

8. **natural_language_query** - Natural language interface
   - Understand natural language queries
   - Automatically select appropriate tools
   - Extract parameters from context
   - Provide helpful suggestions

### Resources

- `verible://project/stats` - Project statistics
- `verible://lint/summary` - Lint violations summary
- `verible://cache/stats` - Cache performance statistics

### Prompts

- `code_review` - Comprehensive code quality review
- `style_compliance` - Check code against style guides
- `refactor_suggestions` - Suggest refactoring opportunities
- `natural_language` - Process natural language queries

## Installation

1. Install Verible tools (required):
   ```bash
   # Download from https://github.com/chipsalliance/verible/releases
   # Or use the included binary in verible-v0.0-4007-g98bdb38a-macOS/bin/
   ```

2. Install the MCP server:
   ```bash
   npm install
   npm run build
   ```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "verible": {
      "command": "node",
      "args": ["/path/to/verible-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Example Usage

```javascript
// Lint a file
await useTool('verible_lint', {
  filepath: 'design.v',
  rules: ['no-trailing-spaces', 'module-filename'],
  fix: true
});

// Format a file
await useTool('verible_format', {
  filepath: 'design.v',
  indent_spaces: 4,
  line_length: 80,
  inplace: false
});

// Parse syntax
await useTool('verible_syntax', {
  filepath: 'design.v',
  output_format: 'json'
});

// Analyze registers
await useTool('verible_analyze', {
  filepath: 'cpu_core.v',
  analysis_type: 'registers'
});

// Analyze entire directory
await useTool('verible_analyze', {
  filepath: './src',
  recursive: true,
  analysis_type: 'all'
});

// Project analysis
await useTool('verible_project', {
  root_path: './src',
  symbol_table: true,
  print_deps: true
});

// Compare files
await useTool('verible_diff', {
  file1: 'old_version.v',
  file2: 'new_version.v',
  mode: 'format'
});

// Obfuscate code
await useTool('verible_obfuscate', {
  filepath: 'design.v',
  output_file: 'design_obfuscated.v',
  preserve: ['clk', 'rst_n'],
  save_map: true
});

// Natural language queries
await useTool('natural_language_query', {
  query: 'How many registers are in cpu_core.v?',
  context: { current_file: 'cpu_core.v' }
});

await useTool('natural_language_query', {
  query: 'Format this file with 4 spaces',
  context: { current_file: 'design.v' }
});
```

## Configuration

Create a `.verible-mcp.json` file in your project or home directory:

```json
{
  "searchPaths": [
    "/usr/local/bin",
    "/opt/verible/bin"
  ]
}
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## TODO

- [x] Implement remaining Verible tools (project, diff, obfuscate, etc.)
- [x] Add natural language query support
- [ ] Implement streaming for large files
- [ ] Add more sophisticated caching strategies
- [ ] Create comprehensive test suite
- [ ] Add support for batch operations
- [ ] Implement preprocessor tool wrapper
- [ ] Add language server integration

## License

MIT