#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Yosys MCP Tools${NC}"
echo "=========================="

# Test 1: Initialize protocol
echo -e "\n${YELLOW}1. Testing Initialize...${NC}"
INIT_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":0}' | node dist/index.js 2>/dev/null | grep "^{.*}$" | tail -1)
echo "$INIT_RESPONSE" | jq . || echo -e "${RED}Failed to parse initialize response${NC}"

# Test 2: List tools
echo -e "\n${YELLOW}2. Testing List Tools...${NC}"
TOOLS_RESPONSE=$(echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | node dist/index.js 2>/dev/null | grep "^{.*}$" | tail -1)
echo "$TOOLS_RESPONSE" | jq . || echo -e "${RED}Failed to parse tools list${NC}"

# Test 3: Analyze simple design
echo -e "\n${YELLOW}3. Testing yosys_analyze...${NC}"
ANALYZE_REQUEST='{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "yosys_analyze",
    "arguments": {
      "filepath": "'$(pwd)'/test_yosys_mcp.v",
      "mode": "summary"
    }
  },
  "id": 2
}'
ANALYZE_RESPONSE=$(echo "$ANALYZE_REQUEST" | node dist/index.js 2>/dev/null | grep "^{.*}$" | tail -1)
echo "$ANALYZE_RESPONSE" | jq . || echo -e "${RED}Failed to parse analyze response${NC}"

# Test 4: Synthesize design
echo -e "\n${YELLOW}4. Testing yosys_synth...${NC}"
SYNTH_REQUEST='{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "yosys_synth",
    "arguments": {
      "filepath": "'$(pwd)'/test_yosys_mcp.v",
      "target": "generic",
      "output_format": "blif"
    }
  },
  "id": 3
}'
SYNTH_RESPONSE=$(echo "$SYNTH_REQUEST" | node dist/index.js 2>/dev/null | grep "^{.*}$" | tail -1)
echo "$SYNTH_RESPONSE" | jq . || echo -e "${RED}Failed to parse synth response${NC}"

# Test 5: Show design (generate DOT)
echo -e "\n${YELLOW}5. Testing yosys_show...${NC}"
SHOW_REQUEST='{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "yosys_show",
    "arguments": {
      "filepath": "'$(pwd)'/test_yosys_mcp.v",
      "format": "dot",
      "module": "simple_adder"
    }
  },
  "id": 4
}'
SHOW_RESPONSE=$(echo "$SHOW_REQUEST" | node dist/index.js 2>/dev/null | grep "^{.*}$" | tail -1)
echo "$SHOW_RESPONSE" | jq . || echo -e "${RED}Failed to parse show response${NC}"

echo -e "\n${GREEN}Testing complete!${NC}"