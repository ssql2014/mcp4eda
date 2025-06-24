# Semiconductor Supply Chain MCP Server

An MCP (Model Context Protocol) server that provides structured access to semiconductor industry B2B platforms like AnySilicon and DesignReuse. This intelligent agent acts as a professional IP core and ASIC service procurement expert.

## Features

- **Find IP Vendors**: Search for IP core suppliers by category, technology, and requirements
- **Find ASIC Services**: Locate ASIC design, verification, and manufacturing services  
- **Price Estimation**: Get cost estimates for various semiconductor services
- **Vendor Comparison**: Compare multiple vendors based on various criteria
- **Natural Language Support**: Process natural language queries about semiconductor supply chain
- **Industry Resources**: Access semiconductor glossary, vendor directory, and process node information

## Installation

```bash
npm install
npm run build
```

### Prerequisites

- Node.js 16+ required
- TypeScript will be installed locally with dependencies
- No global TypeScript installation needed

### Quick Verification

Test the server after building:

```bash
# Test server starts correctly
node dist/index.js

# Run comprehensive tests
npm run test:mcp

# Test Claude Desktop integration
npm run test:desktop
```

## Usage

### As MCP Server

Add to your Claude Desktop configuration:

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

> **Note**: Replace `/path/to/semiconductor-supply-chain-mcp` with your actual installation directory. The server must be built (`npm run build`) before use.

### Troubleshooting

If the server shows as disabled in Claude Desktop:

1. **Verify the build**: Ensure `dist/index.js` exists
2. **Check the path**: Use absolute paths in the configuration  
3. **Restart Claude Desktop**: Quit and restart after configuration changes
4. **Check logs**: Use Developer Tools to see connection errors

For detailed troubleshooting, see [debug-claude-desktop.md](debug-claude-desktop.md).

### Available Tools

1. **find_ip_vendors**
   - Search for IP core vendors
   - Filter by category, subcategory, process node, power requirements
   - Example: Find DDR5 PHY IP vendors for 7nm process

2. **find_asic_services**
   - Find ASIC design and manufacturing services
   - Filter by service type, technology, capabilities
   - Example: Find verification services for 5nm designs

3. **get_price_estimation**
   - Estimate costs for ASIC NRE, IP licensing, mask sets
   - Provides cost breakdown and notes
   - Example: Estimate ASIC NRE for 7nm high-complexity design

4. **compare_vendors**
   - Compare multiple vendors side-by-side
   - Customizable comparison criteria
   - Provides recommendations based on analysis

5. **natural_language_query**
   - Process natural language queries about semiconductor supply chain
   - Automatically extracts intent and parameters
   - Examples: "Find DDR5 IP vendors for 7nm", "What's the NRE cost for 5nm ASIC?"

### Available Resources

1. **semiconductor://glossary** - Comprehensive glossary of industry terms
2. **semiconductor://industry-knowledge** - Vendor info and key considerations
3. **semiconductor://process-nodes** - Detailed process node information
4. **semiconductor://vendors** - Complete vendor directory by category

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run MCP-specific tests
npm run test:mcp

# Run NLP server tests  
npm run test:nlp

# Test Claude Desktop integration
npm run test:desktop

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Recent Fixes (June 2024)

- ✅ **Fixed ES Module Import Issues**: Resolved `require()` errors in test files
- ✅ **Build Process**: Ensured TypeScript compilation works correctly
- ✅ **Test Suite**: All 4 automated tests now pass successfully
- ✅ **Claude Desktop Integration**: Server properly starts and connects

## Architecture

- **MCP Server**: Handles protocol communication
- **Tools**: Individual tool implementations
- **Scrapers**: Web scraping modules for different platforms
- **NLP**: Natural language processing (future)
- **Cache**: Response caching system

## Roadmap

- [x] Natural language query processing with intent recognition
- [x] Industry knowledge resources and glossary
- [ ] Implement actual web scraping for AnySilicon
- [ ] Add DesignReuse platform support
- [ ] Expand to individual IP vendor websites
- [ ] Add real-time pricing calculator integration
- [ ] Implement advanced caching for better performance
- [ ] Multi-language support for global users

## License

MIT