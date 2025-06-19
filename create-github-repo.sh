#!/bin/bash

echo "Creating GitHub repository using GitHub CLI..."

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed."
    echo "Install it with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Create the repository
echo "Creating repository 'mcp-eda-hub'..."
gh repo create mcp-eda-hub --public --description "MCP-EDA Hub - A curated directory of MCP servers for EDA tools and workflows"

if [ $? -eq 0 ]; then
    echo "Repository created successfully!"
    
    # Push the code
    echo "Pushing code to GitHub..."
    cd /Users/qlss/Documents/mcp-eda-hub-new
    git push -u origin main
    
    # Enable GitHub Pages
    echo "Enabling GitHub Pages..."
    gh api repos/ssql2014/mcp-eda-hub/pages -X POST -f source='{"branch":"main","path":"/"}'
    
    echo ""
    echo "✅ All done! Your site will be available at:"
    echo "https://ssql2014.github.io/mcp-eda-hub/"
    echo ""
    echo "Note: GitHub Pages may take a few minutes to deploy."
else
    echo "Failed to create repository. Please create it manually on GitHub."
fi