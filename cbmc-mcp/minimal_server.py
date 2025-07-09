#!/usr/bin/env python3
"""Minimal CBMC MCP Server"""

import asyncio
import logging
from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("cbmc-mcp")

server = Server("cbmc-mcp")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="cbmc_test",
            description="Test CBMC tool",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {"type": "string"}
                },
                "required": ["message"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool calls."""
    if name == "cbmc_test":
        message = arguments.get("message", "No message") if arguments else "No message"
        return [types.TextContent(type="text", text=f"CBMC Test Response: {message}")]
    else:
        raise ValueError(f"Unknown tool: {name}")

async def run():
    """Run the server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="cbmc-mcp",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(run())