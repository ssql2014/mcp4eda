// EDA MCP Servers Data
const mcpServers = [
    {
        id: "anysilicon-die-calculator",
        name: "AnySilicon Die Calculator",
        author: "AnySilicon",
        category: "Manufacturing",
        description: "Calculate dies per wafer using the official AnySilicon formula. Supports standard wafer sizes and includes edge exclusion and scribe lane parameters.",
        tags: ["die-per-wafer", "yield", "manufacturing", "wafer"],
        githubUrl: "https://github.com/ssql2014/mcp4eda",
        installCommand: "git clone https://github.com/ssql2014/mcp4eda.git && cd mcp4eda/anysilicon && npm install && npm run build",
        config: {
            "anysilicon": {
                "command": "node",
                "args": ["/path/to/anysilicon/dist/index.js"]
            }
        },
        features: [
            "Die per wafer calculation using AnySilicon formula",
            "Standard wafer size support (150mm, 200mm, 300mm, 450mm)",
            "Edge exclusion and scribe lane parameters",
            "Parameter validation with helpful suggestions"
        ],
        dateAdded: "2024-01-15"
    },
    {
        id: "spice-netlist-parser",
        name: "SPICE Netlist Parser",
        author: "EDA Community",
        category: "Simulation",
        description: "Parse and analyze SPICE netlists, extract components, and generate circuit summaries. Supports HSPICE, Spectre, and standard SPICE formats.",
        tags: ["spice", "simulation", "analog", "circuit"],
        githubUrl: "https://github.com/example/spice-mcp",
        installCommand: "npm install spice-mcp-server",
        config: {
            "spice-parser": {
                "command": "node",
                "args": ["/path/to/spice-mcp/index.js"]
            }
        },
        features: [
            "Parse SPICE netlists",
            "Component extraction",
            "Hierarchy analysis",
            "Parameter sweep detection"
        ],
        dateAdded: "2024-01-10"
    },
    {
        id: "verilog-formatter",
        name: "Verilog Code Formatter",
        author: "HDL Tools",
        category: "Design Entry",
        description: "Format and lint Verilog/SystemVerilog code. Provides consistent code styling and identifies common coding issues.",
        tags: ["verilog", "systemverilog", "rtl", "formatter"],
        githubUrl: "https://github.com/example/verilog-formatter-mcp",
        installCommand: "npm install verilog-formatter-mcp",
        config: {
            "verilog-formatter": {
                "command": "node",
                "args": ["/path/to/verilog-formatter/server.js"]
            }
        },
        features: [
            "Code formatting",
            "Linting and style checking",
            "Module hierarchy visualization",
            "Port list generation"
        ],
        dateAdded: "2024-01-08"
    },
    {
        id: "liberty-file-reader",
        name: "Liberty File Analyzer",
        author: "Timing Tools Inc",
        category: "Timing Analysis",
        description: "Read and analyze Liberty (.lib) files. Extract timing, power, and area information from standard cell libraries.",
        tags: ["liberty", "timing", "standard-cells", "characterization"],
        githubUrl: "https://github.com/example/liberty-mcp",
        installCommand: "docker pull edatools/liberty-mcp",
        config: {
            "liberty-reader": {
                "command": "docker",
                "args": ["run", "-i", "edatools/liberty-mcp"]
            }
        },
        features: [
            "Parse Liberty format files",
            "Extract timing arcs",
            "Power analysis",
            "Cell comparison"
        ],
        dateAdded: "2024-01-05"
    },
    {
        id: "lef-def-parser",
        name: "LEF/DEF Parser",
        author: "Physical Design Co",
        category: "Physical Design",
        description: "Parse LEF (Library Exchange Format) and DEF (Design Exchange Format) files for physical design analysis.",
        tags: ["lef", "def", "physical-design", "layout"],
        githubUrl: "https://github.com/example/lef-def-mcp",
        installCommand: "pip install lef-def-mcp",
        config: {
            "lef-def-parser": {
                "command": "python",
                "args": ["-m", "lef_def_mcp.server"]
            }
        },
        features: [
            "LEF/DEF parsing",
            "Cell placement analysis",
            "Routing congestion maps",
            "Design rule checking"
        ],
        dateAdded: "2024-01-03"
    },
    {
        id: "timing-report-analyzer",
        name: "STA Report Analyzer",
        author: "Timing Solutions",
        category: "Timing Analysis",
        description: "Analyze static timing analysis reports from major EDA tools. Extract critical paths, slack histograms, and violation summaries.",
        tags: ["sta", "timing", "primetime", "tempus"],
        githubUrl: "https://github.com/example/sta-report-mcp",
        installCommand: "npm install sta-report-analyzer",
        config: {
            "sta-analyzer": {
                "command": "node",
                "args": ["/path/to/sta-analyzer/index.js"]
            }
        },
        features: [
            "Parse STA reports",
            "Critical path extraction",
            "Slack distribution analysis",
            "Cross-reference with SDC"
        ],
        dateAdded: "2023-12-28"
    },
    {
        id: "pdk-doc-browser",
        name: "PDK Documentation Browser",
        author: "Foundry Tools",
        category: "PDK/Technology",
        description: "Browse and search Process Design Kit (PDK) documentation. Quick access to design rules, device parameters, and technology specifications.",
        tags: ["pdk", "technology", "design-rules", "documentation"],
        githubUrl: "https://github.com/example/pdk-browser-mcp",
        installCommand: "cargo install pdk-browser-mcp",
        config: {
            "pdk-browser": {
                "command": "pdk-browser-mcp",
                "args": ["--serve"]
            }
        },
        features: [
            "PDK documentation search",
            "Design rule lookup",
            "Layer stack viewer",
            "Device parameter tables"
        ],
        dateAdded: "2023-12-25"
    },
    {
        id: "drc-lvs-viewer",
        name: "DRC/LVS Results Viewer",
        author: "Verification Systems",
        category: "Verification",
        description: "Visualize and analyze DRC (Design Rule Check) and LVS (Layout vs Schematic) results. Supports Calibre, ICV, and PVS formats.",
        tags: ["drc", "lvs", "verification", "layout"],
        githubUrl: "https://github.com/example/drc-lvs-viewer-mcp",
        installCommand: "git clone https://github.com/example/drc-lvs-viewer-mcp && cd drc-lvs-viewer-mcp && make install",
        config: {
            "drc-lvs-viewer": {
                "command": "./drc-lvs-viewer",
                "args": ["--mcp-mode"]
            }
        },
        features: [
            "DRC violation categorization",
            "LVS mismatch analysis",
            "Layout coordinate mapping",
            "Batch processing support"
        ],
        dateAdded: "2023-12-20"
    },
    {
        id: "power-grid-analyzer",
        name: "Power Grid Analyzer",
        author: "Power Integrity Inc",
        category: "Power Analysis",
        description: "Analyze power grid networks, calculate IR drop, and identify electromigration hotspots in chip designs.",
        tags: ["power", "ir-drop", "em", "power-grid"],
        githubUrl: "https://github.com/example/power-grid-mcp",
        installCommand: "docker-compose up -d power-grid-mcp",
        config: {
            "power-grid": {
                "command": "docker",
                "args": ["exec", "-i", "power-grid-mcp", "server"]
            }
        },
        features: [
            "IR drop calculation",
            "Current density maps",
            "EM violation detection",
            "Power grid optimization"
        ],
        dateAdded: "2023-12-15"
    },
    {
        id: "gds-stream-reader",
        name: "GDS Stream Reader",
        author: "Layout Tools Co",
        category: "Physical Design",
        description: "Read and analyze GDSII/OASIS layout files. Extract layer information, cell hierarchy, and geometric data.",
        tags: ["gds", "gdsii", "oasis", "layout", "mask"],
        githubUrl: "https://github.com/example/gds-reader-mcp",
        installCommand: "pip install gds-reader-mcp",
        config: {
            "gds-reader": {
                "command": "gds-reader-mcp",
                "args": ["--server"]
            }
        },
        features: [
            "GDS/OASIS file parsing",
            "Layer extraction",
            "Cell hierarchy analysis",
            "Geometry statistics"
        ],
        dateAdded: "2023-12-10"
    }
];

// Categories definition
const categories = [
    { id: "design-entry", name: "Design Entry", count: 0 },
    { id: "simulation", name: "Simulation", count: 0 },
    { id: "synthesis", name: "Synthesis", count: 0 },
    { id: "physical-design", name: "Physical Design", count: 0 },
    { id: "timing-analysis", name: "Timing Analysis", count: 0 },
    { id: "power-analysis", name: "Power Analysis", count: 0 },
    { id: "verification", name: "Verification", count: 0 },
    { id: "manufacturing", name: "Manufacturing", count: 0 },
    { id: "pdk-technology", name: "PDK/Technology", count: 0 },
    { id: "test", name: "Test", count: 0 },
    { id: "ip-management", name: "IP Management", count: 0 },
    { id: "utilities", name: "Utilities", count: 0 }
];

// Calculate category counts
mcpServers.forEach(server => {
    const category = categories.find(c => 
        c.name.toLowerCase() === server.category.toLowerCase() ||
        c.id === server.category.toLowerCase().replace(/[\s\/]/g, '-')
    );
    if (category) {
        category.count++;
    }
});

// Export for use in main.js
window.mcpServersData = {
    servers: mcpServers,
    categories: categories.filter(c => c.count > 0)
};