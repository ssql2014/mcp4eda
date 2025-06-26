# GTKWave MCP Server Website Content

## English Version

### GTKWave MCP Server

**Category:** Waveform Analysis, Simulation Visualization

**Description:**
GTKWave MCP Server provides programmatic access to GTKWave's powerful waveform viewing and analysis capabilities. It enables automated waveform analysis, format conversion, and visualization generation for EDA workflows.

**Key Features:**
- **Waveform Viewing**: Open and display VCD, FST, LXT2, and other waveform formats
- **Format Conversion**: Convert between different waveform formats with compression support
- **Signal Analysis**: Extract and analyze signal hierarchies with pattern matching
- **Timing Analysis**: Perform setup/hold time, propagation delay, and frequency measurements
- **Automation**: Generate TCL scripts for batch processing and automated analysis
- **Visualization**: Capture high-quality screenshots of waveform displays

**Available Tools:**
1. `gtkwave_open` - Open waveform files with customizable display settings
2. `gtkwave_convert` - Convert between VCD, FST, and LXT2 formats
3. `gtkwave_extract_signals` - Extract signal lists with hierarchical structure
4. `gtkwave_analyze_timing` - Measure timing relationships between signals
5. `gtkwave_generate_script` - Create TCL scripts for automated workflows
6. `gtkwave_capture_screenshot` - Generate waveform display images

**Installation:**
```bash
git clone https://github.com/mcp4eda/mcp4eda.git
cd mcp4eda/gtkwave-mcp
npm install
npm run build
```

**Configuration Example:**
```json
{
  "gtkwave": {
    "command": "node",
    "args": ["path/to/gtkwave-mcp/dist/index.js"],
    "env": {
      "GTKWAVE_PATH": "/usr/local/bin/gtkwave"
    }
  }
}
```

**Use Cases:**
- Automated waveform analysis in CI/CD pipelines
- Batch conversion of simulation outputs
- Signal integrity verification
- Timing constraint validation
- Documentation generation with waveform screenshots
- Cross-format waveform compatibility

---

## Chinese Version (中文版)

### GTKWave MCP 服务器

**类别:** 波形分析，仿真可视化

**描述:**
GTKWave MCP 服务器提供对 GTKWave 强大的波形查看和分析功能的程序化访问。它支持自动化波形分析、格式转换和 EDA 工作流程的可视化生成。

**主要功能:**
- **波形查看**: 打开并显示 VCD、FST、LXT2 等波形格式
- **格式转换**: 在不同波形格式之间转换，支持压缩
- **信号分析**: 使用模式匹配提取和分析信号层次结构
- **时序分析**: 执行建立/保持时间、传播延迟和频率测量
- **自动化**: 生成用于批处理和自动分析的 TCL 脚本
- **可视化**: 捕获高质量的波形显示截图

**可用工具:**
1. `gtkwave_open` - 使用可自定义的显示设置打开波形文件
2. `gtkwave_convert` - 在 VCD、FST 和 LXT2 格式之间转换
3. `gtkwave_extract_signals` - 提取具有层次结构的信号列表
4. `gtkwave_analyze_timing` - 测量信号之间的时序关系
5. `gtkwave_generate_script` - 创建用于自动化工作流的 TCL 脚本
6. `gtkwave_capture_screenshot` - 生成波形显示图像

**安装方法:**
```bash
git clone https://github.com/mcp4eda/mcp4eda.git
cd mcp4eda/gtkwave-mcp
npm install
npm run build
```

**配置示例:**
```json
{
  "gtkwave": {
    "command": "node",
    "args": ["path/to/gtkwave-mcp/dist/index.js"],
    "env": {
      "GTKWAVE_PATH": "/usr/local/bin/gtkwave"
    }
  }
}
```

**使用场景:**
- CI/CD 流水线中的自动化波形分析
- 仿真输出的批量转换
- 信号完整性验证
- 时序约束验证
- 带有波形截图的文档生成
- 跨格式波形兼容性

---

## API Examples / API 示例

### Open Waveform / 打开波形
```javascript
{
  "tool": "gtkwave_open",
  "arguments": {
    "waveformFile": "simulation.vcd",
    "saveFile": "signals.gtkw",
    "startTime": "0",
    "endTime": "1000ns"
  }
}
```

### Convert Format / 格式转换
```javascript
{
  "tool": "gtkwave_convert",
  "arguments": {
    "inputFile": "large_sim.vcd",
    "outputFile": "compressed.fst",
    "format": "fst",
    "compress": true
  }
}
```

### Extract Signals / 提取信号
```javascript
{
  "tool": "gtkwave_extract_signals",
  "arguments": {
    "waveformFile": "design.vcd",
    "pattern": ".*clk.*",
    "hierarchical": true
  }
}
```

### Timing Analysis / 时序分析
```javascript
{
  "tool": "gtkwave_analyze_timing",
  "arguments": {
    "waveformFile": "test.vcd",
    "signals": ["clk", "data", "valid"],
    "measurements": ["setup", "hold", "frequency"]
  }
}
```

### Capture Screenshot / 捕获截图
```javascript
{
  "tool": "gtkwave_capture_screenshot",
  "arguments": {
    "waveformFile": "simulation.vcd",
    "outputFile": "waveform.png",
    "format": "png",
    "width": 1200,
    "height": 800
  }
}
```

**GitHub Repository:** https://github.com/mcp4eda/mcp4eda/tree/main/gtkwave-mcp
**Documentation:** https://github.com/mcp4eda/mcp4eda/blob/main/gtkwave-mcp/README.md