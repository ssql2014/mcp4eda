#!/usr/bin/env python3
"""
CBMC MCP Server - Model Context Protocol server for C Bounded Model Checker
Provides tools for program verification and equivalence checking
"""

import asyncio
import json
import logging
import subprocess
import tempfile
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
from mcp.server.stdio import stdio_server

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cbmc-mcp")

# Initialize MCP server
app = Server("cbmc-mcp")

def run_cbmc_command(args: List[str], cwd: Optional[str] = None) -> Dict[str, Any]:
    """Execute CBMC command and return results"""
    try:
        cmd = ["cbmc"] + args
        logger.info(f"Running command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=300  # 5 minute timeout
        )
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "command": ' '.join(cmd)
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Command timed out after 5 minutes",
            "command": ' '.join(cmd)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "command": ' '.join(cmd)
        }

@app.list_tools()
async def list_tools() -> List[Tool]:
    """List available CBMC tools"""
    return [
        Tool(
            name="cbmc_verify",
            description="Verify C/C++ code for assertions, bounds checking, and other properties",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to C/C++ file to verify"
                    },
                    "function": {
                        "type": "string",
                        "description": "Entry point function (default: main)"
                    },
                    "unwind": {
                        "type": "integer",
                        "description": "Loop unwinding bound",
                        "default": 10
                    },
                    "property": {
                        "type": "string",
                        "description": "Property to check",
                        "enum": ["assertions", "bounds", "pointer", "overflow", "div-by-zero", "all"],
                        "default": "all"
                    },
                    "trace": {
                        "type": "boolean",
                        "description": "Show counterexample trace",
                        "default": True
                    }
                },
                "required": ["file"]
            }
        ),
        Tool(
            name="cbmc_equivalence",
            description="Check equivalence between two C functions",
            inputSchema={
                "type": "object",
                "properties": {
                    "file1": {
                        "type": "string",
                        "description": "Path to first C file"
                    },
                    "file2": {
                        "type": "string",
                        "description": "Path to second C file"
                    },
                    "function": {
                        "type": "string",
                        "description": "Function name to compare (must exist in both files)"
                    },
                    "unwind": {
                        "type": "integer",
                        "description": "Loop unwinding bound",
                        "default": 10
                    },
                    "inputs": {
                        "type": "array",
                        "description": "List of input variable names to make non-deterministic",
                        "items": {"type": "string"}
                    }
                },
                "required": ["file1", "file2", "function"]
            }
        ),
        Tool(
            name="cbmc_show_properties",
            description="Show all properties and assertions in a C file",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to C/C++ file"
                    }
                },
                "required": ["file"]
            }
        ),
        Tool(
            name="cbmc_generate_tests",
            description="Generate test cases using CBMC",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to C/C++ file"
                    },
                    "function": {
                        "type": "string",
                        "description": "Function to generate tests for",
                        "default": "main"
                    },
                    "coverage": {
                        "type": "string",
                        "description": "Coverage criterion",
                        "enum": ["branch", "condition", "path"],
                        "default": "branch"
                    }
                },
                "required": ["file"]
            }
        ),
        Tool(
            name="cbmc_natural_language",
            description="Process natural language queries about CBMC verification",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language query about verification"
                    },
                    "context": {
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Relevant C files"
                            }
                        }
                    }
                },
                "required": ["query"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> List[TextContent | ImageContent | EmbeddedResource]:
    """Execute CBMC tools"""
    
    if name == "cbmc_verify":
        file_path = arguments["file"]
        function = arguments.get("function", "main")
        unwind = arguments.get("unwind", 10)
        property = arguments.get("property", "all")
        trace = arguments.get("trace", True)
        
        args = [file_path, f"--function={function}", f"--unwind={unwind}"]
        
        # Add property checks
        if property == "all":
            args.extend(["--bounds-check", "--pointer-check", "--div-by-zero-check", 
                        "--signed-overflow-check", "--unsigned-overflow-check"])
        elif property == "bounds":
            args.append("--bounds-check")
        elif property == "pointer":
            args.append("--pointer-check")
        elif property == "overflow":
            args.extend(["--signed-overflow-check", "--unsigned-overflow-check"])
        elif property == "div-by-zero":
            args.append("--div-by-zero-check")
        
        if trace:
            args.append("--trace")
        
        result = run_cbmc_command(args)
        
        return [TextContent(
            type="text",
            text=f"CBMC Verification Results:\n\n"
                 f"Command: {result.get('command', 'N/A')}\n\n"
                 f"{'SUCCESS' if result['success'] else 'FAILED'}\n\n"
                 f"{result.get('stdout', '')}\n"
                 f"{result.get('stderr', '')}\n"
                 f"{result.get('error', '')}"
        )]
    
    elif name == "cbmc_equivalence":
        file1 = arguments["file1"]
        file2 = arguments["file2"]
        function = arguments["function"]
        unwind = arguments.get("unwind", 10)
        inputs = arguments.get("inputs", [])
        
        # Create equivalence checking harness
        with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as f:
            harness_code = f"""
#include <assert.h>

// Include both implementations
#include "{os.path.abspath(file1)}"
#include "{os.path.abspath(file2)}"

// Rename functions to avoid conflicts
#define {function} {function}_v1
#include "{os.path.abspath(file1)}"
#undef {function}

#define {function} {function}_v2
#include "{os.path.abspath(file2)}"
#undef {function}

int main() {{
"""
            
            # Add non-deterministic inputs
            for inp in inputs:
                harness_code += f"    int {inp};\n"
            
            # Call both functions and compare
            harness_code += f"""
    // Call both versions with same inputs
    int result1 = {function}_v1({', '.join(inputs)});
    int result2 = {function}_v2({', '.join(inputs)});
    
    // Assert equivalence
    assert(result1 == result2);
    
    return 0;
}}
"""
            f.write(harness_code)
            harness_path = f.name
        
        try:
            args = [harness_path, "--unwind", str(unwind), "--trace"]
            result = run_cbmc_command(args)
            
            equivalence = "EQUIVALENT" if result['success'] else "NOT EQUIVALENT"
            
            return [TextContent(
                type="text",
                text=f"Equivalence Checking Results:\n\n"
                     f"Files: {file1} vs {file2}\n"
                     f"Function: {function}\n"
                     f"Result: {equivalence}\n\n"
                     f"{result.get('stdout', '')}\n"
                     f"{result.get('stderr', '')}\n"
                     f"{result.get('error', '')}"
            )]
        finally:
            os.unlink(harness_path)
    
    elif name == "cbmc_show_properties":
        file_path = arguments["file"]
        args = [file_path, "--show-properties"]
        
        result = run_cbmc_command(args)
        
        return [TextContent(
            type="text",
            text=f"Properties in {file_path}:\n\n"
                 f"{result.get('stdout', '')}\n"
                 f"{result.get('stderr', '')}\n"
                 f"{result.get('error', '')}"
        )]
    
    elif name == "cbmc_generate_tests":
        file_path = arguments["file"]
        function = arguments.get("function", "main")
        coverage = arguments.get("coverage", "branch")
        
        args = [file_path, f"--function={function}", "--cover", coverage,
                "--trace", "--xml-ui"]
        
        result = run_cbmc_command(args)
        
        return [TextContent(
            type="text",
            text=f"Test Generation Results:\n\n"
                 f"File: {file_path}\n"
                 f"Function: {function}\n"
                 f"Coverage: {coverage}\n\n"
                 f"{result.get('stdout', '')}\n"
                 f"{result.get('stderr', '')}\n"
                 f"{result.get('error', '')}"
        )]
    
    elif name == "cbmc_natural_language":
        query = arguments["query"]
        context = arguments.get("context", {})
        
        # Process natural language queries
        response = f"Processing query: {query}\n\n"
        
        if "equivalence" in query.lower() or "compare" in query.lower():
            response += "For equivalence checking, use the cbmc_equivalence tool with:\n"
            response += "- file1: path to first C file\n"
            response += "- file2: path to second C file\n"
            response += "- function: name of function to compare\n"
            response += "- inputs: list of input variables to make non-deterministic\n"
        elif "verify" in query.lower() or "check" in query.lower():
            response += "For verification, use the cbmc_verify tool with:\n"
            response += "- file: path to C file\n"
            response += "- property: type of property to check (assertions, bounds, etc.)\n"
        elif "test" in query.lower() or "generate" in query.lower():
            response += "For test generation, use the cbmc_generate_tests tool\n"
        
        return [TextContent(type="text", text=response)]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Run the CBMC MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())