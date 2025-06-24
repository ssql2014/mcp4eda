#!/bin/bash

echo "=== 验证半导体供应链 MCP 服务器 ==="
echo

# 检查服务器是否正在运行
echo "1. 检查 MCP 服务器进程..."
if pgrep -f "semiconductor-supply-chain-mcp/dist/index.js" > /dev/null; then
    echo "✓ MCP 服务器正在运行"
else
    echo "✗ MCP 服务器未运行"
    echo "启动服务器..."
    cd /Users/qlss/Documents/mcp4eda/semiconductor-supply-chain-mcp
    node dist/index.js &
    SERVER_PID=$!
    sleep 2
fi

echo
echo "2. 检查 Claude Desktop 配置..."
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if grep -q "semiconductor-supply-chain" "$CONFIG_FILE"; then
    echo "✓ 服务器已在 Claude Desktop 中配置"
else
    echo "✗ 服务器未在 Claude Desktop 中配置"
fi

echo
echo "3. 验证服务器响应..."
cd /Users/qlss/Documents/mcp4eda/semiconductor-supply-chain-mcp

# 创建测试脚本
cat > test/verify-response.js << 'EOF'
const { spawn } = require('child_process');

const proc = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 发送列出工具请求
const request = {
  jsonrpc: '2.0',
  id: '1',
  method: 'tools/list'
};

proc.stdin.write(JSON.stringify(request) + '\n');

let responseReceived = false;

proc.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.result && response.result.tools) {
      console.log('✓ 服务器响应正常');
      console.log('  可用工具:');
      response.result.tools.forEach(tool => {
        console.log(`    - ${tool.name}`);
      });
      responseReceived = true;
      proc.kill();
      process.exit(0);
    }
  } catch (e) {
    // 忽略非 JSON 输出
  }
});

setTimeout(() => {
  if (!responseReceived) {
    console.log('✗ 服务器响应超时');
    proc.kill();
    process.exit(1);
  }
}, 5000);
EOF

node test/verify-response.js

echo
echo "4. Claude Desktop 测试步骤："
echo "   a) Claude Desktop 应该已经重启"
echo "   b) 在 Claude 中输入以下测试命令："
echo
echo "      '半导体供应链 MCP 中有哪些可用工具？'"
echo
echo "   c) 如果 MCP 正常工作，Claude 应该列出 4 个工具："
echo "      - find_ip_vendors"
echo "      - find_asic_services"
echo "      - get_price_estimation"
echo "      - compare_vendors"
echo
echo "5. 更多测试提示已保存在: test-prompts.txt"
echo

# 清理
rm -f test/verify-response.js