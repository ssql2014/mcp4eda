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
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add debug output
print("Starting CBMC MCP Server...", file=sys.stderr)

try:
    from mcp.server import Server
    from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
    from mcp.server.stdio import stdio_server
except ImportError as e:
    print(f"Error importing MCP modules: {e}", file=sys.stderr)
    sys.exit(1)

# Configure logging to stderr for debugging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger("cbmc-mcp")

# Initialize MCP server
logger.info("Initializing CBMC MCP server")
server = Server("cbmc-mcp")

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
        logger.error(f"Error running CBMC: {e}")
        return {
            "success": False,
            "error": str(e),
            "command": ' '.join(cmd)
        }

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available CBMC tools"""
    logger.info("Listing tools")
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
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> List[TextContent | ImageContent | EmbeddedResource]:
    """Execute CBMC tools"""
    logger.info(f"Calling tool: {name} with arguments: {arguments}")
    
    if name == "cbmc_verify":
        file_path = arguments.get("file")
        if not file_path:
            return [TextContent(type="text", text="Error: 'file' parameter is required")]
            
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
        file1 = arguments.get("file1")
        file2 = arguments.get("file2")
        function = arguments.get("function")
        
        if not all([file1, file2, function]):
            return [TextContent(type="text", text="Error: 'file1', 'file2', and 'function' parameters are required")]
            
        unwind = arguments.get("unwind", 10)
        inputs = arguments.get("inputs", [])
        
        # Create equivalence checking harness
        with tempfile.NamedTemporaryFile(mode='w', suffix='.c', delete=False) as f:
            harness_code = f"""#include <assert.h>

// Forward declarations
int {function}(int);

// Implementation 1
#define IMPL1
#include "{os.path.abspath(file1)}"
#undef IMPL1
int {function}_v1(int x) {{ return {function}(x); }}

// Implementation 2  
#define IMPL2
#include "{os.path.abspath(file2)}"
#undef IMPL2
int {function}_v2(int x) {{ return {function}(x); }}

int main() {{
    int x;  // Non-deterministic input
    
    int result1 = {function}_v1(x);
    int result2 = {function}_v2(x);
    
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
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Run the CBMC MCP server"""
    logger.info("Starting main server loop")
    
    # Create transport
    async with stdio_server() as (read_stream, write_stream):
        logger.info("Created stdio transport")
        try:
            # Run server with empty initialization options
            await server.run(
                read_stream=read_stream,
                write_stream=write_stream,
                initialization_options={}
            )
        except Exception as e:
            logger.error(f"Server error: {e}", exc_info=True)
            raise

if __name__ == "__main__":
    try:
        logger.info("Starting CBMC MCP server")
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server interrupted")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)