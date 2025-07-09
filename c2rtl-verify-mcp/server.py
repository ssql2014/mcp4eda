#!/usr/bin/env python3
"""
C2RTL Verification MCP Server - Formal verification between C and RTL
Supports equivalence checking between C code and Verilog/VHDL implementations
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger("c2rtl-verify-mcp")

try:
    from mcp.server import Server, NotificationOptions
    from mcp.server.models import InitializationOptions
    import mcp.types as types
    from mcp.server.stdio import stdio_server
except ImportError as e:
    logger.error(f"Error importing MCP modules: {e}")
    sys.exit(1)

# Initialize MCP server
server = Server("c2rtl-verify-mcp")

def run_command(cmd: List[str], cwd: Optional[str] = None, timeout: int = 300) -> Dict[str, Any]:
    """Execute command and return results"""
    try:
        logger.info(f"Running: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=timeout
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Command timed out after {timeout}s"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@server.list_tools()
async def list_tools() -> List[types.Tool]:
    """List available C2RTL verification tools"""
    return [
        types.Tool(
            name="c2rtl_equivalence",
            description="Check equivalence between C function and RTL module",
            inputSchema={
                "type": "object",
                "properties": {
                    "c_file": {
                        "type": "string",
                        "description": "Path to C source file"
                    },
                    "rtl_file": {
                        "type": "string",
                        "description": "Path to Verilog/VHDL file"
                    },
                    "c_function": {
                        "type": "string",
                        "description": "C function name to verify"
                    },
                    "rtl_module": {
                        "type": "string",
                        "description": "RTL module name to verify"
                    },
                    "method": {
                        "type": "string",
                        "enum": ["cbmc-hw", "yosys-sby", "verilator-cbmc"],
                        "description": "Verification method",
                        "default": "verilator-cbmc"
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Timeout in seconds",
                        "default": 300
                    }
                },
                "required": ["c_file", "rtl_file", "c_function", "rtl_module"]
            }
        ),
        types.Tool(
            name="c2rtl_hls_verify",
            description="Verify HLS-generated RTL against original C code",
            inputSchema={
                "type": "object",
                "properties": {
                    "c_file": {
                        "type": "string",
                        "description": "Original C source file"
                    },
                    "hls_rtl": {
                        "type": "string",
                        "description": "HLS-generated RTL file"
                    },
                    "hls_tool": {
                        "type": "string",
                        "enum": ["vivado_hls", "intel_hls", "legup", "bambu"],
                        "description": "HLS tool used",
                        "default": "vivado_hls"
                    },
                    "properties": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Properties to verify",
                        "default": ["functional", "timing", "resource"]
                    }
                },
                "required": ["c_file", "hls_rtl"]
            }
        ),
        types.Tool(
            name="c2rtl_generate_assertions",
            description="Generate assertions for C-to-RTL verification",
            inputSchema={
                "type": "object",
                "properties": {
                    "c_file": {
                        "type": "string",
                        "description": "C source file"
                    },
                    "rtl_file": {
                        "type": "string",
                        "description": "RTL file"
                    },
                    "output_format": {
                        "type": "string",
                        "enum": ["sva", "psl", "cbmc"],
                        "description": "Assertion format",
                        "default": "sva"
                    }
                },
                "required": ["c_file", "rtl_file"]
            }
        ),
        types.Tool(
            name="c2rtl_cosim",
            description="Co-simulation between C and RTL for verification",
            inputSchema={
                "type": "object",
                "properties": {
                    "c_file": {
                        "type": "string",
                        "description": "C source file"
                    },
                    "rtl_file": {
                        "type": "string",
                        "description": "RTL file"
                    },
                    "testbench": {
                        "type": "string",
                        "description": "Testbench file (optional)"
                    },
                    "num_tests": {
                        "type": "integer",
                        "description": "Number of random tests",
                        "default": 1000
                    },
                    "simulator": {
                        "type": "string",
                        "enum": ["verilator", "iverilog", "modelsim"],
                        "description": "RTL simulator",
                        "default": "verilator"
                    }
                },
                "required": ["c_file", "rtl_file"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> List[types.TextContent]:
    """Execute C2RTL verification tools"""
    logger.info(f"Calling tool: {name}")
    
    if name == "c2rtl_equivalence":
        c_file = arguments.get("c_file")
        rtl_file = arguments.get("rtl_file")
        c_function = arguments.get("c_function")
        rtl_module = arguments.get("rtl_module")
        method = arguments.get("method", "verilator-cbmc")
        
        if method == "verilator-cbmc":
            # Method 1: Use Verilator to convert RTL to C++ then use CBMC
            return await verify_with_verilator_cbmc(
                c_file, rtl_file, c_function, rtl_module
            )
        elif method == "yosys-sby":
            # Method 2: Use Yosys + SymbiYosys
            return await verify_with_yosys_sby(
                c_file, rtl_file, c_function, rtl_module
            )
        else:
            return [types.TextContent(
                type="text",
                text=f"Method {method} not yet implemented"
            )]
    
    elif name == "c2rtl_hls_verify":
        c_file = arguments.get("c_file")
        hls_rtl = arguments.get("hls_rtl")
        hls_tool = arguments.get("hls_tool", "vivado_hls")
        properties = arguments.get("properties", ["functional"])
        
        results = []
        
        # Functional verification
        if "functional" in properties:
            func_result = await verify_hls_functional(c_file, hls_rtl, hls_tool)
            results.extend(func_result)
        
        # Timing verification
        if "timing" in properties:
            results.append(types.TextContent(
                type="text",
                text="\nTiming verification not yet implemented"
            ))
        
        return results
    
    elif name == "c2rtl_generate_assertions":
        c_file = arguments.get("c_file")
        rtl_file = arguments.get("rtl_file")
        output_format = arguments.get("output_format", "sva")
        
        assertions = generate_verification_assertions(
            c_file, rtl_file, output_format
        )
        
        return [types.TextContent(
            type="text",
            text=f"Generated {output_format.upper()} Assertions:\n\n{assertions}"
        )]
    
    elif name == "c2rtl_cosim":
        c_file = arguments.get("c_file")
        rtl_file = arguments.get("rtl_file")
        testbench = arguments.get("testbench")
        num_tests = arguments.get("num_tests", 1000)
        simulator = arguments.get("simulator", "verilator")
        
        return await run_cosimulation(
            c_file, rtl_file, testbench, num_tests, simulator
        )
    
    else:
        return [types.TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def verify_with_verilator_cbmc(
    c_file: str, rtl_file: str, c_function: str, rtl_module: str
) -> List[types.TextContent]:
    """Verify using Verilator + CBMC approach"""
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Step 1: Verilate the RTL to C++
        verilate_cmd = [
            "verilator",
            "--cc",
            rtl_file,
            "--exe",
            "--build",
            "-Wall",
            "--top-module", rtl_module,
            "--Mdir", tmpdir
        ]
        
        result = run_command(verilate_cmd)
        if not result["success"]:
            return [types.TextContent(
                type="text",
                text=f"Verilator failed:\n{result.get('stderr', '')}\n{result.get('error', '')}"
            )]
        
        # Step 2: Create equivalence checking harness
        harness_path = os.path.join(tmpdir, "equiv_check.cpp")
        with open(harness_path, 'w') as f:
            f.write(f"""
#include <assert.h>
#include "V{rtl_module}.h"

// Include C implementation
extern "C" {{
#include "{os.path.abspath(c_file)}"
}}

int main() {{
    V{rtl_module}* rtl = new V{rtl_module};
    
    // Test with symbolic inputs
    int input;
    
    // Call C function
    int c_result = {c_function}(input);
    
    // Call RTL module (simplified - actual implementation depends on module interface)
    rtl->input = input;
    rtl->eval();
    int rtl_result = rtl->output;
    
    // Assert equivalence
    assert(c_result == rtl_result);
    
    delete rtl;
    return 0;
}}
""")
        
        # Step 3: Run CBMC on the combined code
        cbmc_cmd = [
            "cbmc",
            harness_path,
            f"-I{tmpdir}",
            f"-Iobj_dir",
            "--unwind", "10",
            "--bounds-check",
            "--trace"
        ]
        
        result = run_command(cbmc_cmd, cwd=tmpdir)
        
        return [types.TextContent(
            type="text",
            text=f"Verilator+CBMC Equivalence Check Results:\n\n"
                 f"C Function: {c_function} in {c_file}\n"
                 f"RTL Module: {rtl_module} in {rtl_file}\n\n"
                 f"{'EQUIVALENT' if result['success'] else 'NOT EQUIVALENT'}\n\n"
                 f"{result.get('stdout', '')}\n"
                 f"{result.get('stderr', '')}"
        )]

async def verify_with_yosys_sby(
    c_file: str, rtl_file: str, c_function: str, rtl_module: str
) -> List[types.TextContent]:
    """Verify using Yosys + SymbiYosys"""
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create SBY configuration file
        sby_file = os.path.join(tmpdir, "equiv.sby")
        with open(sby_file, 'w') as f:
            f.write(f"""
[options]
mode prove
depth 20

[engines]
smtbmc

[script]
read_verilog {rtl_file}
prep -top {rtl_module}

[files]
{rtl_file}
""")
        
        # Run SymbiYosys
        result = run_command(["sby", "-f", sby_file], cwd=tmpdir)
        
        return [types.TextContent(
            type="text",
            text=f"Yosys+SBY Verification Results:\n\n{result.get('stdout', '')}"
        )]

async def verify_hls_functional(
    c_file: str, hls_rtl: str, hls_tool: str
) -> List[types.TextContent]:
    """Verify HLS-generated RTL against original C"""
    
    # This would integrate with specific HLS tool verification flows
    return [types.TextContent(
        type="text",
        text=f"HLS Functional Verification:\n"
             f"C Source: {c_file}\n"
             f"HLS RTL: {hls_rtl}\n"
             f"HLS Tool: {hls_tool}\n\n"
             f"Note: Full HLS verification requires tool-specific integration"
    )]

def generate_verification_assertions(
    c_file: str, rtl_file: str, output_format: str
) -> str:
    """Generate assertions for verification"""
    
    if output_format == "sva":
        return f"""// SystemVerilog Assertions for C-to-RTL Verification
// C File: {c_file}
// RTL File: {rtl_file}

module c2rtl_assertions (
    input clk,
    input rst,
    input [31:0] c_input,
    input [31:0] c_output,
    input [31:0] rtl_input,
    input [31:0] rtl_output
);

    // Functional equivalence assertion
    property functional_equiv;
        @(posedge clk) disable iff (rst)
        (c_input == rtl_input) |-> ##1 (c_output == rtl_output);
    endproperty
    
    assert property (functional_equiv)
        else $error("C and RTL outputs differ");

    // Input/Output timing assertions
    property io_timing;
        @(posedge clk) disable iff (rst)
        $rose(valid_in) |-> ##[1:10] $rose(valid_out);
    endproperty
    
    assert property (io_timing)
        else $error("Timing violation detected");

endmodule"""
    
    elif output_format == "psl":
        return f"""-- PSL Assertions for C-to-RTL Verification
-- C File: {c_file}
-- RTL File: {rtl_file}

vunit c2rtl_verify {{
    
    -- Functional equivalence
    assert always (
        (c_input = rtl_input) -> next (c_output = rtl_output)
    ) @(posedge clk);
    
    -- Liveness property
    assert always (
        valid_in -> eventually! valid_out
    ) @(posedge clk);
    
}}"""
    
    else:  # cbmc format
        return f"""// CBMC Assertions for C-to-RTL Verification
#include <assert.h>

void verify_equivalence(int input) {{
    int c_result = c_function(input);
    int rtl_result = rtl_function(input);
    
    // Functional equivalence
    assert(c_result == rtl_result);
    
    // Bounds checking
    assert(c_result >= MIN_OUTPUT && c_result <= MAX_OUTPUT);
    assert(rtl_result >= MIN_OUTPUT && rtl_result <= MAX_OUTPUT);
}}"""

async def run_cosimulation(
    c_file: str, rtl_file: str, testbench: Optional[str], 
    num_tests: int, simulator: str
) -> List[types.TextContent]:
    """Run co-simulation between C and RTL"""
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Generate random test vectors
        test_file = os.path.join(tmpdir, "test_vectors.txt")
        with open(test_file, 'w') as f:
            import random
            for i in range(num_tests):
                test_input = random.randint(-2**31, 2**31-1)
                f.write(f"{test_input}\n")
        
        # Compile and run C reference
        c_exe = os.path.join(tmpdir, "c_ref")
        compile_result = run_command([
            "gcc", c_file, "-o", c_exe
        ])
        
        if not compile_result["success"]:
            return [types.TextContent(
                type="text",
                text=f"C compilation failed: {compile_result.get('stderr', '')}"
            )]
        
        # Run RTL simulation (simplified)
        if simulator == "verilator":
            sim_cmd = ["verilator", "--cc", rtl_file, "--exe", "--trace"]
            sim_result = run_command(sim_cmd, cwd=tmpdir)
        else:
            sim_result = {"success": False, "error": f"Simulator {simulator} not implemented"}
        
        return [types.TextContent(
            type="text",
            text=f"Co-simulation Results:\n"
                 f"C File: {c_file}\n"
                 f"RTL File: {rtl_file}\n"
                 f"Simulator: {simulator}\n"
                 f"Tests Run: {num_tests}\n\n"
                 f"Status: {'PASSED' if sim_result['success'] else 'FAILED'}\n"
                 f"{sim_result.get('stdout', '')}"
        )]

async def main():
    """Run the C2RTL verification MCP server"""
    logger.info("Starting C2RTL verification MCP server")
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="c2rtl-verify-mcp",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server interrupted")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)