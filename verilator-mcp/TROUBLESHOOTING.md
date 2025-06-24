# Troubleshooting Verilator MCP

## Common Issues and Solutions

### 1. Server Not Starting in Claude Desktop

**Symptom**: Verilator MCP doesn't appear in Claude Desktop or shows as disconnected.

**Solutions**:
1. **Check Verilator Installation**:
   ```bash
   verilator --version
   ```
   If not found, install it:
   ```bash
   # macOS
   brew install verilator
   
   # Ubuntu/Debian
   sudo apt-get install verilator
   
   # From source
   git clone https://github.com/verilator/verilator
   cd verilator
   autoconf
   ./configure
   make
   sudo make install
   ```

2. **Verify Build**:
   ```bash
   cd verilator-mcp
   npm install
   npm run build
   node test-server.js
   ```

3. **Check Claude Desktop Config**:
   - Ensure paths are absolute
   - Verify the path exists: `/Users/qlss/Documents/mcp4eda/verilator-mcp/dist/index.js`
   - Restart Claude Desktop after config changes

### 2. "Verilator not found" Error

**Solution**: Add Verilator to PATH:
```bash
# macOS with Homebrew
export PATH="/opt/homebrew/bin:$PATH"

# Add to ~/.zshrc or ~/.bashrc
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
```

### 3. Compilation Errors

**Symptom**: TypeScript compilation fails

**Solution**:
```bash
# Clean and rebuild
rm -rf dist/
npm install
npm run build
```

### 4. Permission Errors

**Symptom**: Cannot execute setup.sh or access files

**Solution**:
```bash
chmod +x setup.sh
chmod -R 755 dist/
```

### 5. Tool Not Responding

**Symptom**: Commands timeout or don't return results

**Solutions**:
1. Check Verilator version compatibility:
   ```bash
   verilator --version  # Should be 5.0+
   ```

2. Increase timeout in natural language queries:
   ```json
   {
     "tool": "verilator_simulate",
     "arguments": {
       "design": "large_design.v",
       "timeout": 300000  // 5 minutes
     }
   }
   ```

3. Check system resources:
   - Ensure sufficient RAM for large designs
   - Close other memory-intensive applications

### 6. Testbench Generation Issues

**Symptom**: Generated testbench has errors

**Solutions**:
1. Ensure module has standard port declarations
2. Check for unsupported SystemVerilog constructs
3. Try simpler template:
   ```json
   {
     "template": "basic",
     "stimulusType": "directed"
   }
   ```

### 7. Natural Language Not Working

**Symptom**: Natural language queries return generic responses

**Solution**: Provide more context:
```json
{
  "tool": "verilator_naturallanguage",
  "arguments": {
    "query": "Why is data_valid low at 1000ns?",
    "context": {
      "currentSimulation": {
        "design": "fifo.v",
        "waveformFile": "sim_output/simulation.vcd"
      }
    }
  }
}
```

### 8. Coverage Not Generated

**Symptom**: No coverage data after simulation

**Solution**: Enable coverage in compilation:
```json
{
  "tool": "verilator_compile",
  "arguments": {
    "files": ["design.v"],
    "coverage": true
  }
}
```

### 9. Waveform File Missing

**Symptom**: No VCD/FST file generated

**Solution**: Enable tracing:
```json
{
  "tool": "verilator_simulate",
  "arguments": {
    "design": "counter.v",
    "enableWaveform": true,
    "trace": true
  }
}
```

### 10. Memory/Performance Issues

**Symptom**: Simulation runs slowly or crashes

**Solutions**:
1. Reduce optimization level:
   ```json
   {
     "optimizationLevel": 1
   }
   ```

2. Disable waveform for large designs:
   ```json
   {
     "enableWaveform": false
   }
   ```

3. Use FST format instead of VCD:
   ```json
   {
     "waveformFormat": "fst"
   }
   ```

## Debug Mode

Enable debug logging:
```bash
# Set in Claude Desktop config
{
  "env": {
    "LOG_LEVEL": "debug"
  }
}
```

Check logs:
```bash
tail -f ~/.verilator-mcp/logs/combined.log
```

## Getting Help

1. Check the [Natural Language Guide](NATURAL_LANGUAGE_GUIDE.md)
2. Review [example files](examples/)
3. Open an issue on [GitHub](https://github.com/ssql2014/verilator-mcp/issues)
4. Check Verilator documentation: https://verilator.org/guide/latest/

## Testing Without Claude Desktop

Test individual tools:
```bash
# Direct test
node dist/index.js

# With test client
node test-server.js

# Manual JSON-RPC
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```