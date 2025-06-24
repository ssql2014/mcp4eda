# 半导体供应链 MCP 测试指南

## 快速测试步骤

### 1. 验证配置
Claude Desktop 已配置并重启，MCP 服务器应该已自动加载。

### 2. 基础测试
在 Claude Desktop 中输入以下命令测试：

#### 测试 1：工具发现
```
半导体供应链 MCP 中有哪些可用工具？
```

预期结果：Claude 应该列出 4 个工具：
- find_ip_vendors
- find_asic_services  
- get_price_estimation
- compare_vendors

#### 测试 2：查找 IP 供应商
```
帮我找支持 7nm 工艺的 DDR5 PHY IP 供应商
```

预期结果：返回 Synopsys 和 Cadence 的 DDR5 PHY IP 信息

#### 测试 3：ASIC 服务查询
```
我需要 7nm 芯片的 ASIC 设计服务，有哪些供应商？
```

预期结果：返回提供 7nm ASIC 设计服务的公司列表

#### 测试 4：价格估算
```
7nm 工艺高复杂度 ASIC 的 NRE 成本估算是多少？
```

预期结果：返回详细的成本估算和费用明细

#### 测试 5：供应商对比
```
比较 Synopsys、Cadence 和 Siemens 的 PHY IP 产品
```

预期结果：返回详细的对比表格和建议

## 高级测试

### 复杂查询测试
```
我正在设计一个网络芯片，需要：
- 100G 以太网 PHY IP
- PCIe Gen5 控制器
- DDR5 内存接口
找合适的供应商并估算总的 IP 授权成本
```

### 自然语言测试
```
帮我寻找三家能够为 TSMC 28nm 工艺提供低功耗 DDR5 PHY IP 的供应商
```

## 故障排查

### 如果 MCP 不工作：

1. **检查服务器是否运行**
   ```bash
   ps aux | grep semiconductor-supply-chain-mcp
   ```

2. **查看 Claude 配置**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

3. **手动测试服务器**
   ```bash
   cd /path/to/semiconductor-supply-chain-mcp
   npm run dev
   ```

4. **查看日志**
   - Claude 日志：`~/Library/Logs/Claude/`
   - 控制台日志：打开 Console.app，搜索 "Claude"

### 常见问题

1. **"未找到 MCP 服务器"**
   - 重启 Claude Desktop
   - 确保配置文件正确

2. **"工具调用失败"**
   - 检查服务器是否正常运行
   - 查看服务器日志

3. **"返回空结果"**
   - 当前使用模拟数据
   - 确保查询参数正确

## 注意事项

- 当前版本使用模拟数据进行测试
- 真实的网页抓取功能需要后续开发
- DesignReuse 等网站需要配置认证信息