# C2RTL Natural Language Quick Reference

## Equivalence Checking
```
✓ "Check if adder.c and adder.v are equivalent"
✓ "Verify function add matches module adder"
✓ "Are these the same?"
✓ "Compare my C and RTL"
✓ "Check using SymbiYosys with depth 30"
```

## Property Mining
```
✓ "Find properties"
✓ "Mine invariants"
✓ "Discover temporal properties"
✓ "Extract relationships"
✓ "What properties exist?"
```

## Coverage Analysis
```
✓ "What's the coverage?"
✓ "Show branch coverage"
✓ "Check line coverage"
✓ "Analyze FSM coverage"
✓ "Toggle coverage stats"
```

## Debugging
```
✓ "Debug the failure"
✓ "Why did it fail?"
✓ "Explain the error"
✓ "Show the trace"
✓ "Minimize counterexample"
```

## BMC & K-Induction
```
✓ "Run BMC with depth 100"
✓ "Bounded model checking"
✓ "Prove using k-induction"
✓ "K-induction with k=5"
✓ "Check up to bound 50"
```

## Reports
```
✓ "Generate a report"
✓ "Create PDF summary"
✓ "HTML report please"
✓ "Markdown results"
✓ "Export verification data"
```

## Advanced Patterns

### With Function/Module Names
```
✓ "Check if function 'encrypt' in crypto.c matches module 'aes' in aes.v"
✓ "Verify add_saturate against sat_adder"
✓ "Compare the fir_filter implementations"
```

### With Method Selection
```
✓ "Use SymbiYosys for verification"
✓ "Check with Verilator and CBMC"
✓ "Verify using formal methods"
```

### With Parameters
```
✓ "Check with depth 50"
✓ "BMC bound 100"
✓ "K-induction where k=10"
✓ "Unwind loops 20 times"
```

### Combined Queries
```
✓ "Check equivalence and show coverage"
✓ "Verify and generate report"
✓ "Find properties then verify"
✓ "Debug and minimize the failure"
```

## Context Examples

### Basic Context
```json
{
  "query": "Are these equivalent?",
  "context": {
    "c_files": ["math.c"],
    "rtl_files": ["alu.v"]
  }
}
```

### With Previous Results
```json
{
  "query": "Debug the failure",
  "context": {
    "verification_ids": ["verify_20250109_150000"]
  }
}
```

### Multiple Files
```json
{
  "query": "Verify all modules",
  "context": {
    "c_files": ["mod1.c", "mod2.c"],
    "rtl_files": ["mod1.v", "mod2.v"]
  }
}
```

## Keywords Recognized

### Actions
- **Verify**: check, verify, compare, match, equivalent
- **Mine**: find, discover, extract, mine, search
- **Debug**: debug, why, explain, trace, minimize
- **Report**: report, summary, export, generate

### Targets
- **Function**: function, func, method, routine
- **Module**: module, mod, block, component
- **Property**: property, prop, assertion, invariant
- **Coverage**: coverage, cov, covered, test

### Modifiers
- **Depth**: depth, bound, unwind, limit
- **Method**: using, with, via, through
- **Format**: as, format, in, export to

## Tips
1. Be natural - the parser understands variations
2. Include file context when available
3. Specify names for better accuracy
4. Chain operations with "and" or "then"
5. Ask for help with "?" or "help"