#!/bin/bash

echo "Setting up mcp-eda-hub repository..."

# Navigate to the new directory
cd /Users/qlss/Documents/mcp-eda-hub-new

# Initialize git repository
echo "Initializing git repository..."
git init

# Add all files
echo "Adding files..."
git add .

# Create initial commit
echo "Creating initial commit..."
git commit -m "Initial commit: MCP-EDA Hub - EDA-focused MCP aggregator website"

# Add GitHub remote
echo "Adding GitHub remote..."
git remote add origin https://github.com/ssql2014/mcp-eda-hub.git

# Create main branch (if needed)
git branch -M main

echo ""
echo "Repository setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Name it 'mcp-eda-hub'"
echo "   - Make it public"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo ""
echo "2. After creating the GitHub repo, run:"
echo "   cd /Users/qlss/Documents/mcp-eda-hub-new"
echo "   git push -u origin main"
echo ""
echo "3. Enable GitHub Pages:"
echo "   - Go to https://github.com/ssql2014/mcp-eda-hub/settings/pages"
echo "   - Under 'Source', select 'Deploy from a branch'"
echo "   - Choose 'main' branch and '/ (root)' folder"
echo "   - Click 'Save'"
echo ""
echo "Your site will be live at: https://ssql2014.github.io/mcp-eda-hub/"