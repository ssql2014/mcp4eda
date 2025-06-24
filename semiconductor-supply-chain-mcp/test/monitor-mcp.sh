#!/bin/bash

echo "=== 监控 MCP 服务器日志 ==="
echo "等待 Claude Desktop 调用..."
echo

# 查找 Claude 相关进程
echo "Claude Desktop 进程："
ps aux | grep -i claude | grep -v grep

echo
echo "MCP 服务器日志位置："
echo "~/Library/Logs/Claude/"

# 监控 Claude 日志
LOG_DIR="$HOME/Library/Logs/Claude"
if [ -d "$LOG_DIR" ]; then
    echo
    echo "实时监控日志 (Ctrl+C 退出)："
    echo "================================"
    
    # 监控最新的日志文件
    tail -f "$LOG_DIR"/*.log | grep -E "(semiconductor|MCP|tool)" &
    TAIL_PID=$!
    
    echo
    echo "现在请在 Claude Desktop 中测试以下命令："
    echo
    echo "1. '半导体供应链 MCP 中有哪些可用工具？'"
    echo "2. '帮我找支持 7nm 工艺的 DDR5 PHY IP 供应商'"
    echo
    echo "如果看到相关日志输出，说明 MCP 服务器正在工作"
    echo
    
    # 等待用户中断
    wait $TAIL_PID
else
    echo "未找到 Claude 日志目录"
    echo
    echo "直接测试方法："
    echo "1. 打开 Claude Desktop"
    echo "2. 输入: '半导体供应链 MCP 中有哪些可用工具？'"
    echo "3. 如果 Claude 能列出 4 个工具，说明 MCP 工作正常"
fi