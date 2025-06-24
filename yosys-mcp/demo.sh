#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Yosys MCP Demo${NC}"
echo "==============="

# Create a simple test file
echo -e "\n${YELLOW}Creating test Verilog file...${NC}"
cat > demo_counter.v << 'EOF'
module counter (
    input  clk,
    input  rst,
    output reg [7:0] count
);
    always @(posedge clk or posedge rst) begin
        if (rst)
            count <= 8'b0;
        else
            count <= count + 1;
    end
endmodule
EOF
echo "Created demo_counter.v"

# Function to call MCP tool
call_tool() {
    local tool_name=$1
    local args=$2
    local id=$3
    
    echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"'$tool_name'","arguments":'$args'},"id":'$id'}' | \
        node dist/index.js 2>/dev/null | \
        grep "^{.*}$" | \
        jq -r '.result.content[0].text' | \
        jq .
}

# Test 1: Analyze design statistics
echo -e "\n${YELLOW}1. Analyzing Design Statistics${NC}"
call_tool "yosys_analyze" '{"filepath":"'$(pwd)'/demo_counter.v","analysisType":"stats"}' 1

# Test 2: Check design for issues
echo -e "\n${YELLOW}2. Checking Design for Issues${NC}"
call_tool "yosys_analyze" '{"filepath":"'$(pwd)'/demo_counter.v","analysisType":"check"}' 2

# Test 3: Synthesize to generic gates
echo -e "\n${YELLOW}3. Synthesizing to Generic Gates${NC}"
SYNTH_RESULT=$(call_tool "yosys_synth" '{"filepath":"'$(pwd)'/demo_counter.v","target":"generic","outputFormat":"verilog"}' 3)
echo "$SYNTH_RESULT" | jq -r '.data.netlist' | head -20
echo "... (truncated)"

# Test 4: Generate visualization
echo -e "\n${YELLOW}4. Generating Design Visualization${NC}"
call_tool "yosys_show" '{"filepath":"'$(pwd)'/demo_counter.v","format":"dot","simplify":true}' 4 | jq -r '.data.visualization' | head -10
echo "... (truncated)"

# Test 5: Resource estimation for Xilinx
echo -e "\n${YELLOW}5. Resource Estimation for Xilinx${NC}"
call_tool "yosys_analyze" '{"filepath":"'$(pwd)'/demo_counter.v","analysisType":"resources","target":"xilinx"}' 5

echo -e "\n${GREEN}Demo complete!${NC}"