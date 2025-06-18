# MCP-EDA Hub

A curated directory of Model Context Protocol (MCP) servers specifically designed for Electronic Design Automation (EDA) tools and workflows.

## 🌐 Live Website

Visit [MCP-EDA Hub](https://ssql2014.github.io/mcp4eda/mcp-eda-hub/) to explore available MCP servers for EDA.

## 📋 Features

- **Curated EDA MCP Servers**: Discover servers for simulation, synthesis, physical design, verification, and more
- **Easy Search & Filter**: Find servers by category, tags, or keywords
- **Quick Installation**: Copy-paste installation commands and Claude Desktop configurations
- **Modern UI**: Clean, responsive design that works on all devices
- **Open Source**: Community-driven directory for the EDA ecosystem

## 🚀 Quick Start

The website is a static site that can be hosted on GitHub Pages or any web server.

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/ssql2014/mcp4eda.git
cd mcp4eda/mcp-eda-hub
```

2. Open `index.html` in your browser or use a local server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

3. Visit `http://localhost:8000`

## 📝 Adding a New MCP Server

To add your EDA MCP server to the directory:

1. Edit `js/data.js`
2. Add your server to the `mcpServers` array:

```javascript
{
    id: "your-server-id",
    name: "Your Server Name",
    author: "Your Name",
    category: "Category Name", // e.g., "Simulation", "Verification", etc.
    description: "Brief description of what your server does",
    tags: ["tag1", "tag2", "tag3"],
    githubUrl: "https://github.com/yourusername/your-repo",
    installCommand: "npm install your-server",
    config: {
        "your-server": {
            "command": "node",
            "args": ["/path/to/your-server/index.js"]
        }
    },
    features: [
        "Feature 1",
        "Feature 2",
        "Feature 3"
    ],
    dateAdded: "2024-01-15"
}
```

3. Submit a pull request

## 📁 Project Structure

```
mcp-eda-hub/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Styles
├── js/
│   ├── data.js        # MCP servers data
│   └── main.js        # Application logic
├── _config.yml        # GitHub Pages config
└── README.md          # This file
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Add your MCP server to `js/data.js`
3. Test locally to ensure everything works
4. Submit a pull request

### Guidelines

- Ensure your MCP server is EDA-related
- Provide accurate installation instructions
- Include a working Claude Desktop configuration
- Add relevant tags and choose the appropriate category

## 📜 License

MIT License - see the parent repository for details.

## 🔗 Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/desktop)
- [MCP-EDA Hub Live Site](https://ssql2014.github.io/mcp4eda/mcp-eda-hub/)

## 💡 Future Plans

- User authentication for submissions
- Server ratings and reviews
- API for programmatic access
- Automated MCP server validation
- Integration examples and tutorials

---

Built with ❤️ for the EDA community