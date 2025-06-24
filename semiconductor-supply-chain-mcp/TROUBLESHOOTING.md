# Troubleshooting Guide

## Common Build Issues

### 1. TypeScript Not Found
**Error**: `sh: tsc: command not found`

**Solution**:
```bash
# Install dependencies (includes TypeScript locally)
npm install

# Build using local TypeScript
npm run build
```

### 2. Missing dist/ Directory
**Error**: Server file not found

**Solution**:
```bash
# Check if dist exists
ls -la dist/

# If missing, rebuild
npm run build

# Verify build
ls -la dist/index.js
```

### 3. ES Module Import Errors
**Error**: `ReferenceError: require is not defined`

**Fix Applied** (June 2024): Updated test files to use ES module imports instead of CommonJS `require()`.

If you still see this error:
```bash
# Get latest fixes
git pull
npm install
npm run build
```

## Runtime Issues

### 1. Server Won't Start
**Error**: Server crashes on startup

**Debug Steps**:
```bash
# Test manual startup
node dist/index.js

# Check for syntax errors
npm run typecheck

# Check for code issues
npm run lint
```

### 2. Claude Desktop Shows Server as Disabled

**Checklist**:
1. ✅ Server builds successfully: `npm run build`
2. ✅ File exists: `ls -la dist/index.js`
3. ✅ Correct path in config: Use absolute path
4. ✅ Claude Desktop restarted after config change
5. ✅ No JSON syntax errors in config

**Test Configuration**:
```json
{
  "mcpServers": {
    "semiconductor-supply-chain": {
      "command": "node",
      "args": ["/path/to/semiconductor-supply-chain-mcp/dist/index.js"]
    }
  }
}
```

### 3. Tools Not Responding

**Debug with Test Suite**:
```bash
# Run comprehensive tests
npm run test:mcp

# Should show:
# ✓ Find DDR5 PHY IP vendors
# ✓ Find ASIC design services  
# ✓ Get ASIC NRE price estimation
# ✓ Compare IP vendors
```

## Development Issues

### 1. Watch Mode Not Working
**Error**: Changes not reflected during development

**Solution**:
```bash
# Use development mode with auto-reload
npm run dev

# Or manually rebuild on changes
npm run build
```

### 2. Test Failures

**Common Causes**:
- Server not built: `npm run build`
- Dependencies missing: `npm install`
- Port conflicts: Kill existing processes

**Comprehensive Test**:
```bash
# Test everything
npm run test:mcp      # MCP protocol tests
npm run test:nlp      # Natural language tests  
npm run test:desktop  # Claude Desktop integration
```

## System Requirements

### Prerequisites
- **Node.js**: Version 16 or higher
- **npm**: Comes with Node.js
- **TypeScript**: Installed automatically with dependencies

**Check Versions**:
```bash
node --version    # Should be 16+
npm --version     # Should be 7+
```

### Memory Requirements
- **Development**: 1GB RAM minimum
- **Production**: 512MB RAM sufficient

## Logging and Debugging

### Enable Debug Logging
Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "semiconductor-supply-chain": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "DEBUG": "mcp:*",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Check System Logs
**macOS**:
1. Open Console.app
2. Search for "Claude"
3. Look for error messages

**Manual Testing**:
```bash
# Start server manually and monitor output
node dist/index.js
# Server should print: "Semiconductor Supply Chain MCP server running on stdio"
```

## Performance Issues

### 1. Slow Response Times
**Possible Causes**:
- Network timeouts (web scraping)
- Large data processing
- Memory constraints

**Solutions**:
- Enable caching (built-in)
- Reduce query complexity
- Monitor memory usage

### 2. Memory Leaks
**Monitor**:
```bash
# Check memory usage
ps aux | grep node

# Monitor during testing
npm run test:mcp
```

## Contact and Support

### Getting Help
1. **GitHub Issues**: Report bugs and request features
2. **Documentation**: Check README.md and debug-claude-desktop.md
3. **Test Suite**: Use `npm run test:mcp` to verify functionality

### Reporting Issues
Include:
- **Environment**: Node.js version, OS version
- **Error messages**: Full error text
- **Steps to reproduce**: Exact commands run
- **Test results**: Output from `npm run test:mcp`

### Quick Health Check
```bash
# Verify everything is working
cd /path/to/semiconductor-supply-chain-mcp
npm install
npm run build
npm run test:mcp
node dist/index.js  # Should show server running message
```

Expected output: All tests pass and server starts successfully.