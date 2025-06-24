# Testing the Semiconductor Supply Chain MCP Server

## Quick Start (Single Terminal)

```bash
# Run comprehensive MCP server tests (Recommended)
npm run test:mcp

# Run natural language processing tests
npm run test:nlp

# Test Claude Desktop integration
npm run test:desktop

# Quick shell script test
./test-client.sh
```

## Current Test Results (June 2024)

### ✅ All Tests Passing

Running `npm run test:mcp` shows:
```
📊 Test Summary:
  Passed: 4
  Failed: 0
  Total: 4

✅ All tests passed!
```

**Tests include:**
- ✓ Find DDR5 PHY IP vendors
- ✓ Find ASIC design services  
- ✓ Get ASIC NRE price estimation
- ✓ Compare IP vendors

## Manual Testing (If Needed)

If you want to run the server and test client separately:

### Option 1: Run Server Manually
```bash
# Terminal 1: Start server
npm run build
node dist/index.js

# Terminal 2: Run tests
npx tsx test/test-nlp-server.ts
```

### Option 2: Automatic Testing (Recommended)
```bash
# Single terminal - automatically handles everything
npm run test:nlp
```

This will test:
- Natural language queries
- Intent recognition
- Parameter extraction
- Resource access
- All tool functions

### 3. Test with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "semiconductor-supply-chain": {
      "command": "node",
      "args": ["/full/path/to/semiconductor-supply-chain-mcp/dist/index.js"]
    }
  }
}
```

Then in Claude Desktop, you can ask:
- "Find DDR5 PHY IP vendors for 7nm process"
- "What's the NRE cost for a 5nm ASIC?"
- "Compare TSMC vs Samsung foundry services"
- "Show me the semiconductor glossary"

## Example Natural Language Queries

### IP Core Searches
```
"Find DDR5 PHY IP vendors for 7nm process"
"Show me USB 3.0 IP cores"
"I need PCIe 5.0 controller IP"
```

### ASIC Services
```
"Find ASIC design services"
"Show verification services for 7nm designs"
"I need backend design services"
```

### Price Estimates
```
"Estimate ASIC NRE cost for 7nm"
"What's the mask cost for 5nm?"
"Calculate IP licensing cost for DDR5 PHY"
```

### Vendor Comparisons
```
"Compare TSMC vs Samsung foundry services"
"Which is better: Synopsys or Cadence for IP?"
```

## Testing Individual Tools

You can also test individual tools directly:

```typescript
// Test find_ip_vendors
await client.callTool('find_ip_vendors', {
  category: 'Interface',
  subcategory: 'DDR5 PHY',
  processNode: '7nm'
});

// Test natural language
await client.callTool('natural_language_query', {
  query: 'Find DDR5 IP vendors for 7nm'
});
```

## Debugging

If you encounter issues:

1. **Check the build**: `npm run build` (ensure `dist/index.js` exists)
2. **Test server startup**: `node dist/index.js` (should show "Semiconductor Supply Chain MCP server running on stdio")
3. **Run type check**: `npm run typecheck`
4. **Run linting**: `npm run lint`
5. **Check logs**: Server logs appear in Terminal 1

### Common Issues Fixed

**ES Module Errors**: If you see `ReferenceError: require is not defined`:
- This was fixed in June 2024 by updating test files to use ES module imports
- Run `npm install && npm run build` to get the latest fixes

**Missing TypeScript**: If `tsc: command not found`:
- TypeScript is installed locally with `npm install`
- Build script uses `npx tsc` automatically

## Expected Output

The test client will show:
- ✅ Successful connections
- 🔍 Each query being tested
- 📊 Confidence scores for intent recognition
- 🔧 Extracted parameters
- 📋 Number of results found
- 💡 Suggestions for ambiguous queries

## Resources Testing

The server provides these resources:
- `semiconductor://glossary` - Industry terms
- `semiconductor://industry-knowledge` - Vendor knowledge base
- `semiconductor://process-nodes` - Process node details
- `semiconductor://vendors` - Vendor directory