# C2RTL Natural Language Examples

This guide provides comprehensive examples of using natural language queries with the C2RTL verification MCP server.

## Basic Verification Queries

### Equivalence Checking
```
"Check if adder.c and adder.v are equivalent"
"Verify that the sort function in sort.c matches the sort module in sort.v"
"Are these two implementations the same?"
"Compare the behavior of my C and Verilog code"
"Check equivalence between function 'encrypt' and module 'aes_core'"
```

### With Specific Functions/Modules
```
"Check if function add_sat in math.c is equivalent to module saturating_adder in alu.v"
"Verify the fir_filter function against the fir_filter_rtl module"
"Compare aes_encrypt in crypto.c with aes_engine in crypto.v"
```

## Property Discovery

### Mining Properties
```
"Find properties in my code"
"Discover invariants in controller.c and fsm.v"
"What properties can you extract from my design?"
"Mine temporal properties from the state machine"
"Find all relationships between inputs and outputs"
```

### Specific Property Types
```
"Find all invariants in my implementation"
"Extract temporal properties from the RTL"
"Discover input/output relationships"
"What safety properties exist in my code?"
```

## Coverage Analysis

### General Coverage
```
"What's the coverage of my verification?"
"Show me the verification coverage"
"How much of my code is covered?"
"Analyze coverage for my design"
```

### Specific Coverage Types
```
"What's the branch coverage?"
"Show me line coverage statistics"
"Check condition coverage for my verification"
"Analyze toggle coverage in the RTL"
"What's the FSM state coverage?"
```

## Debugging Failed Verifications

### Basic Debug
```
"Debug why the verification failed"
"Why did my equivalence check fail?"
"Show me the counterexample"
"What went wrong with the verification?"
```

### Advanced Debug
```
"Explain why the verification failed"
"Show me the execution trace"
"Minimize the failing test case"
"Visualize the counterexample"
"Find the root cause of the failure"
```

## Report Generation

### Basic Reports
```
"Generate a verification report"
"Create a summary of all verifications"
"Show me the results"
"Generate a report of today's verifications"
```

### Specific Formats
```
"Create a PDF report"
"Generate an HTML report with all results"
"Give me a markdown summary"
"Export results to JSON"
```

## Advanced Verification Techniques

### Bounded Model Checking
```
"Run bounded model checking"
"Run BMC with depth 100"
"Check my design with bounded model checking up to depth 50"
"Verify properties using BMC with bound 200"
```

### K-Induction
```
"Prove correctness using induction"
"Run k-induction with k=10"
"Use inductive proof to verify my design"
"Prove unbounded correctness with k-induction"
```

## Complex Queries with Context

### Multiple Operations
```
"Check equivalence and then generate a coverage report"
"Verify my design and if it fails, debug the counterexample"
"Find properties and then use them for verification"
```

### Specific Configurations
```
"Check equivalence using SymbiYosys with depth 30"
"Verify with Verilator and CBMC method"
"Run BMC with custom properties from properties.sv"
```

## Natural Language with File Context

### When Files are in Context
```json
{
  "query": "Are these equivalent?",
  "context": {
    "c_files": ["implementation.c"],
    "rtl_files": ["implementation.v"]
  }
}
```

### Referencing Previous Results
```json
{
  "query": "Debug the last failure",
  "context": {
    "verification_ids": ["verify_20250109_143022"]
  }
}
```

### Multiple Files
```json
{
  "query": "Check all C files against their RTL counterparts",
  "context": {
    "c_files": ["alu.c", "cpu.c", "cache.c"],
    "rtl_files": ["alu.v", "cpu.v", "cache.v"]
  }
}
```

## Workflow Examples

### Complete Verification Flow
```
1. "Check if my_algorithm.c and my_module.v are equivalent"
2. "What's the coverage of this verification?"
3. "Find any missing properties"
4. "Generate a comprehensive report"
```

### Debug Flow
```
1. "Run equivalence check on dsp.c and dsp.v"
2. "Why did it fail?"
3. "Minimize the counterexample"
4. "Explain the root cause"
```

### Property-Driven Verification
```
1. "Mine properties from controller.c"
2. "Use these properties to verify against controller.v"
3. "Check which properties hold"
4. "Generate assertions for the verified properties"
```

## HLS-Specific Queries

### HLS Verification
```
"Verify my Vivado HLS generated RTL"
"Check if the HLS output matches the C code"
"Verify Intel HLS results against original C"
"Compare HLS-generated Verilog with source"
```

### Performance Verification
```
"Check if the HLS RTL meets timing requirements"
"Verify resource usage matches constraints"
"Check pipeline behavior against C model"
```

## Tips for Natural Language Queries

### Be Specific When Needed
- Include function/module names when known
- Specify verification methods if you have a preference
- Mention depth/bound for BMC or k-induction

### Use Context
- Provide file paths in the context object
- Reference previous verification IDs for debugging
- Include multiple files for batch operations

### Combine Operations
- Chain multiple operations in one query
- Ask for reports after verification
- Request debugging if verification fails

## Error Handling

### When Files are Missing
Query: "Check equivalence"
Response: "Please provide both C and RTL files for equivalence checking."

### When Context is Needed
Query: "Debug the failure"
Response: "No verification results found to debug. Run a verification first."

### Clarification Requests
Query: "Verify my code"
Response: "Please specify which C and RTL files to verify."

## Advanced Natural Language Features

### Partial Matching
The system understands variations:
- "equiv", "equivalent", "same", "match" → Equivalence checking
- "prop", "property", "mine", "find" → Property mining
- "cov", "coverage", "covered" → Coverage analysis
- "debug", "why", "fail", "trace" → Debugging

### Intent Recognition
The system recognizes intent from context:
- Questions starting with "why" trigger explanation mode
- Mentions of "report" or "summary" generate reports
- Numbers after "depth" or "bound" set verification limits

### Smart Defaults
When not specified:
- Equivalence checking uses verilator-cbmc method
- BMC uses depth 100
- K-induction uses k=10
- Reports generate in HTML format

## Examples by Use Case

### For Beginners
```
"Help me verify my C and RTL code"
"What can you do?"
"Show me how to check equivalence"
```

### For Debugging
```
"My verification failed, help me understand why"
"Show me where C and RTL differ"
"Find the minimal failing case"
```

### For Coverage Improvement
```
"How can I improve my verification coverage?"
"What parts of my code aren't covered?"
"Show me coverage gaps"
```

### For Formal Proofs
```
"Prove my implementation is correct"
"Use formal methods to verify equivalence"
"Generate a mathematical proof of correctness"
```