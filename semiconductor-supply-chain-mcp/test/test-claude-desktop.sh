#!/bin/bash

# Test script for Claude Desktop integration

echo "=== Semiconductor Supply Chain MCP Test Script ==="
echo

# Check if server is built
if [ ! -f "dist/index.js" ]; then
    echo "Building server first..."
    npm run build
fi

# Create test configuration for Claude Desktop
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo "1. Checking Claude Desktop configuration..."
if [ -f "$CONFIG_PATH" ]; then
    echo "✓ Claude Desktop config found"
    
    # Check if our server is already configured
    if grep -q "semiconductor-supply-chain" "$CONFIG_PATH"; then
        echo "✓ Semiconductor Supply Chain MCP already configured"
    else
        echo "✗ Server not configured in Claude Desktop"
        echo ""
        echo "Add this to your Claude Desktop config:"
        echo ""
        cat << EOF
{
  "mcpServers": {
    "semiconductor-supply-chain": {
      "command": "node",
      "args": ["$(pwd)/dist/index.js"]
    }
  }
}
EOF
    fi
else
    echo "✗ Claude Desktop config not found"
    echo "Please ensure Claude Desktop is installed"
fi

echo ""
echo "2. Starting test server..."
node dist/index.js &
SERVER_PID=$!

# Give server time to start
sleep 2

echo ""
echo "3. Testing MCP protocol..."
echo ""

# Test cases to paste into Claude Desktop
cat << 'EOF' > test-prompts.txt
=== Test Prompts for Claude Desktop ===

1. Basic tool discovery:
"What tools are available in the semiconductor supply chain MCP?"

2. Find IP vendors:
"Find me DDR5 PHY IP vendors that support 7nm process technology"

3. Find ASIC services:
"I need ASIC design services for a 7nm chip. What providers are available?"

4. Price estimation:
"What would be the estimated NRE cost for a high-complexity ASIC in 7nm technology?"

5. Vendor comparison:
"Compare Synopsys, Cadence, and Siemens for PHY IP offerings"

6. Natural language query:
"Help me find three vendors that can provide low-power DDR5 PHY IP for TSMC 28nm process"

7. Complex request:
"I'm designing a networking chip and need:
- 100G Ethernet PHY IP
- PCIe Gen5 controller
- DDR5 memory interface
Find suitable vendors and estimate the total IP licensing cost"
EOF

echo "Test prompts saved to test-prompts.txt"
echo ""
echo "4. Manual testing in Claude Desktop:"
echo "   - Open Claude Desktop"
echo "   - Try the prompts from test-prompts.txt"
echo "   - Verify responses use the MCP tools"
echo ""
echo "Press Ctrl+C to stop the test server"

# Wait for user to stop
wait $SERVER_PID