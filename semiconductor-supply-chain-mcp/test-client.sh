#!/bin/bash

echo "🧪 Semiconductor Supply Chain MCP Test Client"
echo "============================================="
echo ""
echo "This script will test the MCP server with natural language queries"
echo ""

# Check if server is built
if [ ! -d "dist" ]; then
    echo "📦 Building project first..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please fix errors and try again."
        exit 1
    fi
fi

echo "🏃 Running natural language query tests..."
echo ""

# Compile and run the test
npx tsx test/test-nlp-server.ts