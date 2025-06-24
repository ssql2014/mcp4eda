#!/bin/bash

# Test basic MCP communication
echo "Testing tools/list..."
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | \
  node /Users/qlss/Documents/mcp4eda/yosys-mcp/dist/index.js 2>&1 | \
  grep -E "(jsonrpc|error)" | \
  jq . 2>/dev/null || echo "Failed to parse response"

echo -e "\nTesting initialize..."
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":0}' | \
  node /Users/qlss/Documents/mcp4eda/yosys-mcp/dist/index.js 2>&1 | \
  grep -E "(jsonrpc|error)" | \
  jq . 2>/dev/null || echo "Failed to parse response"