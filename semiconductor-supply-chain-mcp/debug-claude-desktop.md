# Debugging Claude Desktop MCP Server

## Common Issues and Solutions

### 1. Server Shows as Disabled

If the semiconductor-supply-chain MCP server shows as disabled in Claude Desktop:

#### Check 1: Verify Server Path and Build
```bash
# Verify the server file exists (replace with your path)
ls -la /path/to/semiconductor-supply-chain-mcp/dist/index.js

# If missing, ensure build completed successfully
cd /path/to/semiconductor-supply-chain-mcp
npm install
npm run build
```

#### Check 2: Test Server Manually
```bash
cd /path/to/semiconductor-supply-chain-mcp
node dist/index.js
```
You should see: `Semiconductor Supply Chain MCP server running on stdio`

#### Check 3: Run Full Test Suite
```bash
cd /path/to/semiconductor-supply-chain-mcp
npm run test:mcp
```
All 4 tests should pass:
- ✓ Find DDR5 PHY IP vendors
- ✓ Find ASIC design services  
- ✓ Get ASIC NRE price estimation
- ✓ Compare IP vendors

### 2. Fix Permission Issues
```bash
chmod +x /path/to/semiconductor-supply-chain-mcp/dist/index.js
```

### 3. Check Claude Desktop Logs

1. Open Claude Desktop
2. Go to View → Developer → Developer Tools
3. Check Console for error messages related to MCP servers

### 4. Restart Claude Desktop

After making changes:
1. Quit Claude Desktop completely (Cmd+Q)
2. Start Claude Desktop again
3. Check if the server is now enabled

### 5. Verify Configuration

Your configuration in `~/Library/Application Support/Claude/claude_desktop_config.json` should be:

```json
{
  "mcpServers": {
    "semiconductor-supply-chain": {
      "command": "node",
      "args": [
        "/path/to/semiconductor-supply-chain-mcp/dist/index.js"
      ]
    }
  }
}
```

### 6. Test with Simple Echo

Create a test file `test-stdio.js`:
```javascript
process.stdin.on('data', (data) => {
  console.error('Received:', data.toString());
});
console.error('Test server started');
```

Then update config to test:
```json
{
  "mcpServers": {
    "test": {
      "command": "node",
      "args": ["/path/to/test-stdio.js"]
    }
  }
}
```

### 7. Check Node.js Version
```bash
node --version
```
Ensure you have Node.js 16+ installed.

### 8. Enable Debug Logging

Add environment variable to see more details:
```json
{
  "mcpServers": {
    "semiconductor-supply-chain": {
      "command": "node",
      "args": [
        "/path/to/semiconductor-supply-chain-mcp/dist/index.js"
      ],
      "env": {
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

## Recent Fixes Applied (June 2024)

### ES Module Import Issues Fixed
Previously, the test files had CommonJS `require()` statements that caused errors:
```
ReferenceError: require is not defined
```

**Solution**: Updated `test/automated-test.ts` to use ES module imports:
```typescript
// OLD (caused errors):
const os = require('os');
const fs = require('fs').promises;

// NEW (working):
const { readFile } = await import('fs/promises');
const { homedir } = await import('os');
```

### TypeScript Build Issues
Ensured proper TypeScript compilation with local installation:
```bash
npm install  # Installs TypeScript locally
npm run build  # Uses local tsc via npx
```

## If Still Not Working

1. **Check if other MCP servers work** (like puppeteer or verible)
2. **Try removing and re-adding** the server configuration
3. **Check for syntax errors** in the JSON config
4. **Ensure no duplicate server names** in config
5. **Look for crash logs** in Console.app (search for "Claude")
6. **Verify Node.js version**: `node --version` (needs 16+)
7. **Check server logs**: Add `"DEBUG": "mcp:*"` to env config