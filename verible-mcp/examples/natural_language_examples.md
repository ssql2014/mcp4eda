# Natural Language Query Examples

The `natural_language_query` tool allows you to interact with Verible tools using natural language instead of specific tool parameters.

## How it Works

The tool analyzes your query to:
1. Identify the intended operation (lint, format, analyze, etc.)
2. Extract relevant parameters (file paths, options)
3. Select and execute the appropriate tool
4. Return structured results

## Example Queries

### Linting

```javascript
// Basic lint check
await useTool('natural_language_query', {
  query: 'Check style violations in cpu_core.v'
});

// Auto-fix issues
await useTool('natural_language_query', {
  query: 'Lint and fix issues in design.v'
});

// Specific rules
await useTool('natural_language_query', {
  query: 'Check for trailing spaces rule in my file',
  context: { current_file: 'module.v' }
});
```

### Formatting

```javascript
// Format with specific indentation
await useTool('natural_language_query', {
  query: 'Format cpu.v with 4 spaces'
});

// In-place formatting
await useTool('natural_language_query', {
  query: 'Format and modify test.v in-place'
});

// Current file formatting
await useTool('natural_language_query', {
  query: 'Format this file with 2 spaces',
  context: { current_file: 'current.v' }
});
```

### Register Analysis

```javascript
// Count registers
await useTool('natural_language_query', {
  query: 'How many registers are in cpu_core.v?'
});

// Analyze entire project
await useTool('natural_language_query', {
  query: 'Count all registers in the project',
  context: { project_root: './src' }
});

// Find flip-flops
await useTool('natural_language_query', {
  query: 'Find all flip-flops in the design'
});
```

### Project Analysis

```javascript
// Project structure
await useTool('natural_language_query', {
  query: 'Analyze project structure',
  context: { project_root: '.' }
});

// Dependencies
await useTool('natural_language_query', {
  query: 'Show project dependencies'
});

// Symbol table
await useTool('natural_language_query', {
  query: 'Generate symbol table for the project'
});
```

### File Comparison

```javascript
// Compare two files
await useTool('natural_language_query', {
  query: 'Compare "old.v" and "new.v"'
});

// Diff specific files
await useTool('natural_language_query', {
  query: 'What are the differences between cpu_v1.v and cpu_v2.v?'
});
```

### Code Obfuscation

```javascript
// Basic obfuscation
await useTool('natural_language_query', {
  query: 'Obfuscate design.v'
});

// Preserve interface
await useTool('natural_language_query', {
  query: 'Obfuscate module.v but preserve the interface'
});

// Preserve specific identifiers
await useTool('natural_language_query', {
  query: 'Obfuscate cpu.v but preserve "clk" and "rst_n"'
});
```

## Query Patterns

The tool recognizes various patterns:

### File References
- Quoted paths: `"path/to/file.v"`
- Unquoted paths: `file.v`
- Contextual: `this file`, `current file`

### Keywords
- **Lint**: lint, check, style, violation, rule, quality
- **Format**: format, indent, align, beautify, clean
- **Analyze**: register, flip-flop, count, analyze
- **Project**: project, symbol, dependency, hierarchy
- **Diff**: diff, compare, difference, changes
- **Obfuscate**: obfuscate, protect, hide, scramble

### Options
- Numbers: `4 spaces`, `2 space indent`
- Flags: `fix`, `in-place`, `preserve interface`
- Lists: `preserve "clk" and "rst_n"`

## Response Format

```json
{
  "success": true,
  "data": {
    "query": "How many registers in cpu.v?",
    "intent": "analyze",
    "parameters": {
      "filepath": "cpu.v",
      "analysis_type": "registers"
    },
    "confidence": 0.85,
    "result": {
      "success": true,
      "data": {
        "totalRegisters": 15,
        "byType": {
          "flip_flop": 15
        },
        "totalBits": 512
      }
    }
  }
}
```

## Tips for Better Results

1. **Be Specific**: Include file names and specific options
2. **Use Context**: Provide current_file or project_root when applicable
3. **Clear Intent**: Use action verbs (check, format, analyze, compare)
4. **Quotes for Paths**: Use quotes for file paths with spaces

## Error Handling

If the query isn't understood:
```json
{
  "success": true,
  "data": {
    "query": "do something with verilog",
    "intent": "unknown",
    "confidence": 0.3,
    "result": {
      "error": "Could not understand the query. Please be more specific.",
      "suggestions": [
        "Try: \"lint file.v\"",
        "Try: \"format this file with 4 spaces\"",
        "Try: \"how many registers in cpu.v\"",
        // ...
      ]
    }
  }
}
```