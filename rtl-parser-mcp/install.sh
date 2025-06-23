#!/bin/bash

# RTL Parser MCP Installation Script
# This script installs Verible and sets up RTL Parser MCP

set -e

echo "🚀 RTL Parser MCP Installation Script"
echo "===================================="

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "📍 Detected: $OS $ARCH"

# Function to install Verible
install_verible() {
    echo "📦 Installing Verible..."
    
    if [[ "$OS" == "Darwin" ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "   Using Homebrew..."
            brew tap chipsalliance/verible
            brew install verible
        else
            echo "   Downloading pre-built binary..."
            # Get latest release URL
            VERIBLE_URL=$(curl -s https://api.github.com/repos/chipsalliance/verible/releases/latest | grep "browser_download_url.*macOS" | cut -d '"' -f 4)
            
            if [[ -z "$VERIBLE_URL" ]]; then
                echo "❌ Could not find macOS release. Please install manually."
                exit 1
            fi
            
            curl -L "$VERIBLE_URL" -o verible-macos.tar.gz
            tar -xzf verible-macos.tar.gz
            
            # Install to ~/.local/bin
            mkdir -p ~/.local/bin
            cp verible-*/bin/* ~/.local/bin/
            rm -rf verible-macos.tar.gz verible-*/
            
            echo "   ✅ Installed to ~/.local/bin"
            echo "   ⚠️  Please add ~/.local/bin to your PATH if not already done"
        fi
    elif [[ "$OS" == "Linux" ]]; then
        # Linux
        echo "   Downloading pre-built binary..."
        
        # Detect distribution
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            DISTRO=$ID
            VERSION=$VERSION_ID
        else
            DISTRO="unknown"
        fi
        
        # Try to find appropriate release
        if [[ "$DISTRO" == "ubuntu" && "$VERSION" == "20.04" ]]; then
            VERIBLE_URL=$(curl -s https://api.github.com/repos/chipsalliance/verible/releases/latest | grep "browser_download_url.*Ubuntu-20.04" | cut -d '"' -f 4)
        else
            # Fallback to generic Linux
            VERIBLE_URL=$(curl -s https://api.github.com/repos/chipsalliance/verible/releases/latest | grep "browser_download_url.*Linux" | head -1 | cut -d '"' -f 4)
        fi
        
        if [[ -z "$VERIBLE_URL" ]]; then
            echo "❌ Could not find Linux release. Please install manually."
            exit 1
        fi
        
        wget "$VERIBLE_URL" -O verible-linux.tar.gz
        tar -xzf verible-linux.tar.gz
        
        # Install to /usr/local/bin (requires sudo)
        echo "   Installing to /usr/local/bin (requires sudo)..."
        sudo cp verible-*/bin/* /usr/local/bin/
        rm -rf verible-linux.tar.gz verible-*/
        
        echo "   ✅ Installed to /usr/local/bin"
    else
        echo "❌ Unsupported OS: $OS"
        exit 1
    fi
}

# Function to build RTL Parser MCP
build_rtl_parser() {
    echo "🔨 Building RTL Parser MCP..."
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Install dependencies
    echo "   Installing dependencies..."
    npm install
    
    # Build
    echo "   Building project..."
    npm run build
    
    echo "   ✅ Build complete"
}

# Function to update Claude Desktop config
update_claude_config() {
    echo "⚙️  Updating Claude Desktop configuration..."
    
    # Get absolute path
    RTL_PARSER_PATH="$(pwd)/dist/index.js"
    
    # Determine config file location
    if [[ "$OS" == "Darwin" ]]; then
        CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    elif [[ "$OS" == "Linux" ]]; then
        CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
    else
        echo "   ⚠️  Please manually update your Claude Desktop config"
        return
    fi
    
    # Check if config exists
    if [[ ! -f "$CONFIG_PATH" ]]; then
        echo "   Creating new config file..."
        mkdir -p "$(dirname "$CONFIG_PATH")"
        echo '{"mcpServers":{}}' > "$CONFIG_PATH"
    fi
    
    # Backup existing config
    cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
    
    # Update config using Node.js
    node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CONFIG_PATH', 'utf8'));
    config.mcpServers = config.mcpServers || {};
    config.mcpServers['rtl-parser'] = {
        command: 'node',
        args: ['$RTL_PARSER_PATH'],
        env: { LOG_LEVEL: 'info' }
    };
    fs.writeFileSync('$CONFIG_PATH', JSON.stringify(config, null, 2));
    console.log('   ✅ Configuration updated');
    console.log('   📁 Backup saved to: $CONFIG_PATH.backup');
    "
}

# Main installation flow
main() {
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
        echo "❌ Please run this script from the rtl-parser-mcp directory"
        exit 1
    fi
    
    # Check if Verible is already installed
    if command -v verible-verilog-syntax &> /dev/null; then
        echo "✅ Verible is already installed"
        verible-verilog-syntax --version
    else
        install_verible
    fi
    
    # Build RTL Parser MCP
    build_rtl_parser
    
    # Update Claude Desktop config
    update_claude_config
    
    echo ""
    echo "🎉 Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. Restart Claude Desktop"
    echo "2. Start a new conversation"
    echo "3. Try: 'Analyze my Verilog file at /path/to/file.v'"
    echo ""
    echo "For troubleshooting, check:"
    echo "- Logs: ~/Library/Logs/Claude/mcp-server-rtl-parser.log"
    echo "- Docs: https://github.com/ssql2014/mcp4eda/tree/main/rtl-parser-mcp"
}

# Run main function
main