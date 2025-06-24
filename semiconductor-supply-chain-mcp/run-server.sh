#!/bin/bash

echo "🚀 Starting Semiconductor Supply Chain MCP Server"
echo "================================================"
echo ""
echo "Server will run on stdio. You can test it with:"
echo "1. The test script: npm run test:nlp"
echo "2. Claude Desktop by adding to config"
echo "3. Direct stdio communication"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"
echo ""

# Build the project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful"
echo ""
echo "🏃 Starting server..."
echo ""

# Run the server
node dist/index.js