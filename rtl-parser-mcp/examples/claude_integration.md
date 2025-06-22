# Claude Integration Examples for RTL Parser MCP

This guide shows how to use RTL Parser MCP with Claude for RTL design analysis.

## Setup

1. Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "rtl-parser": {
      "command": "node",
      "args": ["/path/to/rtl-parser-mcp/dist/index.js"]
    }
  }
}
```

2. Restart Claude Desktop

## Example Conversations

### Example 1: Basic Design Analysis

**Human**: "I have a Verilog project in /home/user/cpu_design. Can you analyze it and tell me about the design?"

**Claude will**:
1. Use `parse_project` to parse all Verilog files
2. Access `rtl://project/stats` for overall statistics
3. Use `natural_language_query` to answer specific questions
4. Provide a comprehensive analysis

### Example 2: Using Prompts

**Human**: "Please analyze my RTL design focusing on potential issues"

**Claude can use**:
```
prompt: find_issues
```

This will guide Claude to:
- Check for modules with high register counts
- Identify deep hierarchies
- Find potential clock domain crossings
- Report naming convention issues

### Example 3: Interactive Module Exploration

**Human**: "Tell me about the cpu_core module"

**Claude can use**:
```
prompt: summarize_module
arguments: { module_name: "cpu_core" }
```

Or directly:
```
tool: analyze_module
arguments: { module_name: "cpu_core", analysis_type: "all" }
```

### Example 4: Natural Language Queries

**Human**: "How many flip-flops are in the ALU?"

**Claude uses**:
```
tool: natural_language_query
arguments: { query: "How many flip-flops are in the alu module?" }
```

**Human**: "Where is the clock signal used?"

**Claude uses**:
```
tool: natural_language_query
arguments: { query: "Where is signal 'clk' used?" }
```

### Example 5: Design Review Workflow

**Human**: "I need a complete design review of my RTL project"

**Claude's workflow**:
1. Parse the project
2. Get overall statistics
3. Analyze each major module
4. Check for design issues
5. Provide recommendations

Using:
```
1. tool: parse_project
2. resource: rtl://project/stats
3. resource: rtl://modules
4. prompt: analyze_design
5. prompt: find_issues
```

## Advanced Usage

### Contextual Conversations

**Human**: "Parse my project at /project/rtl"
**Claude**: [Parses project]

**Human**: "Which module has the most registers?"
**Claude uses**:
```
tool: natural_language_query
arguments: { query: "Which module has the most registers?" }
```

**Human**: "Show me its ports"
**Claude** understands context and uses:
```
tool: analyze_module
arguments: { module_name: "identified_module", analysis_type: "ports" }
```

### Combining Multiple Queries

**Human**: "Compare the register usage between the CPU and memory controller modules"

**Claude** will:
1. Query registers for CPU module
2. Query registers for memory controller
3. Present a comparison

### Design Verification Support

**Human**: "Help me verify that all clock domains are properly handled"

**Claude** can:
1. Trace clock signals
2. Identify modules with multiple clocks
3. Check for potential CDC issues
4. Suggest verification strategies

## Best Practices

1. **Start with parsing**: Always parse the project first
2. **Use prompts for complex tasks**: Prompts provide structured analysis
3. **Natural language for quick queries**: Great for ad-hoc questions
4. **Combine tools**: Use multiple tools for comprehensive analysis
5. **Iterative exploration**: Start broad, then dive into specifics

## Common Workflows

### New Project Analysis
1. Parse project
2. Get statistics
3. List modules
4. Use `analyze_design` prompt
5. Deep dive into specific modules

### Debug Register Issues
1. Query all registers
2. Find modules with high counts
3. Analyze specific modules
4. Trace clock and reset signals

### Module Understanding
1. Analyze module structure
2. Trace key signals
3. Check instantiation hierarchy
4. Review parameters and ports

### Signal Tracing
1. Use natural language to find signal
2. Get detailed trace results
3. Analyze connections
4. Check for issues