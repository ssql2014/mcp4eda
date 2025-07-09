#!/usr/bin/env python3
"""
Demo script showing natural language usage of C2RTL verification
"""

# Example natural language queries for C2RTL verification

queries = [
    # Basic equivalence checking
    {
        "query": "Check if adder.c and adder.v are equivalent",
        "context": {
            "c_files": ["adder.c"],
            "rtl_files": ["adder.v"]
        }
    },
    
    # With specific function/module names
    {
        "query": "Verify that function add_sat in adder.c matches module adder_sat in adder.v",
        "context": {
            "c_files": ["adder.c"],
            "rtl_files": ["adder.v"]
        }
    },
    
    # Property mining
    {
        "query": "Find all properties in the FIR filter implementation",
        "context": {
            "c_files": ["fir_filter.c"],
            "rtl_files": ["fir_filter.v"]
        }
    },
    
    # Coverage analysis
    {
        "query": "What's the branch coverage of my verification?",
        "context": {
            "c_files": ["fir_filter.c"],
            "rtl_files": ["fir_filter.v"]
        }
    },
    
    # Debugging with previous result
    {
        "query": "Debug why the last verification failed",
        "context": {
            "verification_ids": ["verify_20250109_143022"]
        }
    },
    
    # Advanced verification
    {
        "query": "Run bounded model checking with depth 100 on the adder",
        "context": {
            "c_files": ["adder.c"],
            "rtl_files": ["adder.v"]
        }
    },
    
    # K-induction proof
    {
        "query": "Prove correctness using k-induction with k=5",
        "context": {
            "c_files": ["adder.c"],
            "rtl_files": ["adder.v"]
        }
    },
    
    # Report generation
    {
        "query": "Generate an HTML report of all verifications",
        "context": {
            "verification_ids": []  # Will use all available
        }
    },
    
    # Method selection
    {
        "query": "Check equivalence using SymbiYosys",
        "context": {
            "c_files": ["fir_filter.c"],
            "rtl_files": ["fir_filter.v"]
        }
    },
    
    # Complex workflow
    {
        "query": "Verify the filter, check coverage, and generate a report",
        "context": {
            "c_files": ["fir_filter.c"],
            "rtl_files": ["fir_filter.v"]
        }
    }
]

# Print examples
print("C2RTL Natural Language Query Examples")
print("=" * 50)

for i, example in enumerate(queries, 1):
    print(f"\nExample {i}:")
    print(f"Query: {example['query']}")
    print(f"Context: {example['context']}")
    print("-" * 30)

# Advanced examples with explanations
print("\n\nAdvanced Usage Patterns")
print("=" * 50)

advanced_examples = [
    {
        "pattern": "Specific depth/bound",
        "examples": [
            "Check with depth 50",
            "Run BMC up to bound 200",
            "Verify with unwind 30"
        ]
    },
    {
        "pattern": "Mining specific properties",
        "examples": [
            "Find temporal properties",
            "Mine invariants only",
            "Discover input/output relationships"
        ]
    },
    {
        "pattern": "Debugging modes",
        "examples": [
            "Explain why it failed",
            "Show the execution trace",
            "Minimize the counterexample",
            "Visualize the failure"
        ]
    },
    {
        "pattern": "Coverage types",
        "examples": [
            "Show line coverage",
            "Check toggle coverage",
            "Analyze FSM state coverage",
            "What's the condition coverage?"
        ]
    }
]

for category in advanced_examples:
    print(f"\n{category['pattern']}:")
    for example in category['examples']:
        print(f"  • {example}")

# Interactive example
print("\n\nInteractive Workflow Example")
print("=" * 50)
print("""
User: "Check if my adder works correctly"
Assistant: Uses c2rtl_natural_language → c2rtl_equivalence

User: "Why did it fail?"
Assistant: Uses c2rtl_natural_language → c2rtl_debug

User: "Show me the minimal failing case"
Assistant: Uses c2rtl_debug with analysis_type="minimize"

User: "Generate a report of what we found"
Assistant: Uses c2rtl_natural_language → c2rtl_report
""")

# Tips
print("\nTips for Natural Language Queries")
print("=" * 50)
print("""
1. Be conversational - the system understands context
2. Reference previous results naturally
3. Combine multiple operations in one query
4. Ask for clarification if needed
5. Use specific names when you know them
6. The system learns from context
""")

if __name__ == "__main__":
    print("\nThis demo shows example queries. In real usage,")
    print("these would be sent to the C2RTL MCP server.")