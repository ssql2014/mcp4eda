# KLayout MCP Server Installation Guide

## Prerequisites

### 1. Install KLayout

KLayout is required for the MCP server to function. Choose one of these installation methods:

#### macOS (Homebrew)
```bash
brew install --cask klayout
```

#### macOS (Direct Download)
1. Download from https://www.klayout.de/build.html
2. Install the .dmg file
3. The klayout binary will be at: `/Applications/klayout.app/Contents/MacOS/klayout`

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install klayout
```

#### Linux (Other distributions)
Visit https://www.klayout.de/build.html for distribution-specific packages

### 2. Find KLayout Path

After installation, find the KLayout executable:

```bash
# Try these commands:
which klayout
ls /Applications/klayout.app/Contents/MacOS/klayout
ls /usr/local/bin/klayout
ls /opt/homebrew/bin/klayout
```

### 3. Update Configuration

Update the KLAYOUT_PATH in your Claude Desktop configuration:

```json
"klayout": {
  "command": "node",
  "args": [
    "/Users/qlss/Documents/mcp4eda/klayout-mcp/dist/index.js"
  ],
  "env": {
    "KLAYOUT_PATH": "/path/to/your/klayout",
    "LOG_LEVEL": "info"
  }
}
```

Common paths:
- macOS (Homebrew): `/opt/homebrew/bin/klayout`
- macOS (App): `/Applications/klayout.app/Contents/MacOS/klayout`
- Linux: `/usr/bin/klayout` or `/usr/local/bin/klayout`

## Verification

After installation and configuration:

1. Restart Claude Desktop
2. Test with: "List available KLayout tools"
3. Try natural language: "Convert my design.gds to OASIS format"

## Troubleshooting

### KLayout Not Found
- Ensure KLayout is installed
- Check the KLAYOUT_PATH environment variable
- Try running `klayout -v` in terminal

### Permission Errors
- Ensure the klayout executable has execute permissions
- Check file permissions on layout files

### Build Errors
If you need to rebuild:
```bash
cd /Users/qlss/Documents/mcp4eda/klayout-mcp
npm install
npm run build
```