#!/bin/bash

echo "Verilator MCP Diagnostic Tool"
echo "============================"
echo ""

# Check Verilator installation
echo "1. Checking Verilator installation..."
if command -v verilator &> /dev/null; then
    echo "✓ Verilator found: $(verilator --version)"
else
    echo "✗ Verilator not found! Please install it."
    echo "  macOS: brew install verilator"
    echo "  Ubuntu: sudo apt-get install verilator"
    exit 1
fi
echo ""

# Check Node.js
echo "2. Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "✓ Node.js found: $(node --version)"
else
    echo "✗ Node.js not found!"
    exit 1
fi
echo ""

# Check build
echo "3. Checking build..."
if [ -f "dist/index.js" ]; then
    echo "✓ Build exists"
else
    echo "✗ Build not found! Running build..."
    npm install && npm run build
fi
echo ""

# Test server
echo "4. Testing server..."
if command -v gtimeout &> /dev/null; then
    gtimeout 5 node test-server.js
    result=$?
elif command -v timeout &> /dev/null; then
    timeout 5 node test-server.js
    result=$?
else
    # macOS fallback - just run the test without timeout
    node test-server.js
    result=$?
fi

if [ $result -eq 0 ]; then
    echo "✓ Server test passed"
else
    echo "✗ Server test failed"
fi
echo ""

# Check Claude Desktop config
echo "5. Checking Claude Desktop configuration..."
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "✓ Config file found"
    if grep -q "verilator" "$CONFIG_FILE"; then
        echo "✓ Verilator MCP configured"
        echo ""
        echo "Verilator configuration:"
        grep -A 6 '"verilator"' "$CONFIG_FILE"
    else
        echo "✗ Verilator MCP not found in config"
    fi
else
    echo "✗ Config file not found at: $CONFIG_FILE"
fi
echo ""

echo "Diagnosis complete!"
echo ""
echo "If all checks pass but MCP still doesn't work:"
echo "1. Restart Claude Desktop"
echo "2. Check Claude Desktop developer console for errors"
echo "3. Try running: LOG_LEVEL=debug node dist/index.js"