#!/bin/bash

# Verilator MCP Setup Script

echo "Setting up Verilator MCP Server..."

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Verilator installation
if ! command -v verilator &> /dev/null; then
    echo "Error: Verilator is not installed!"
    echo ""
    echo "Please install Verilator first:"
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew install verilator"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt-get install verilator"
    echo ""
    echo "From source:"
    echo "  https://verilator.org/guide/latest/install.html"
    echo ""
    exit 1
else
    echo "Found Verilator: $(verilator --version)"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Create necessary directories
mkdir -p ~/.verilator-mcp/{logs,cache,resources}

# Test the build
echo "Testing the build..."
node dist/index.js --version

echo ""
echo "Setup complete! 🎉"
echo ""
echo "To use with Claude Desktop, add the following to your configuration:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "verilator": {'
echo '      "command": "node",'
echo "      \"args\": [\"$(pwd)/dist/index.js\"],"
echo '      "env": {'
echo '        "LOG_LEVEL": "info"'
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "For more information, see the README.md file."