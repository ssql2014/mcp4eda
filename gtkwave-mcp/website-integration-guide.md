# GTKWave MCP Website Integration Guide

## Website Structure Analysis
Based on the analysis of www.mcp4eda.cn:
- The site displays MCP servers as cards in a grid layout
- Each card shows: Title, Author, Category
- Current servers include: AnySilicon, Verible, Semiconductor Supply Chain, etc.
- The site supports Chinese/English language switching
- Categories are used for filtering (e.g., "Design Entry", "Manufacturing", "IP Management")

## Integration Steps

### Step 1: Add GTKWave to the Server Database

The website needs to add GTKWave MCP server data. Based on the structure, here's the data format:

```json
{
  "id": "gtkwave-mcp",
  "title": {
    "en": "GTKWave MCP Server",
    "zh": "GTKWave MCP 服务器"
  },
  "author": "mcp4eda",
  "category": {
    "en": "Simulation Visualization",
    "zh": "仿真可视化"
  },
  "description": {
    "en": "Waveform viewing and analysis for simulation results",
    "zh": "用于仿真结果的波形查看和分析"
  },
  "repository": "https://github.com/mcp4eda/mcp4eda/tree/main/gtkwave-mcp",
  "documentation": "https://github.com/mcp4eda/mcp4eda/blob/main/gtkwave-mcp/README.md"
}
```

### Step 2: Add Category (if needed)

If "Simulation Visualization" is not an existing category, add it:

```json
{
  "categories": {
    "simulation_visualization": {
      "en": "Simulation Visualization",
      "zh": "仿真可视化"
    }
  }
}
```

### Step 3: Create Detailed Server Page

Create a dedicated page for GTKWave MCP with the full content from `website-content.md`:

**URL Structure:**
- English: `/servers/gtkwave-mcp`
- Chinese: `/zh/servers/gtkwave-mcp`

### Step 4: Add to Homepage Grid

The server card should appear in the grid with:
- Class: `server-card fade-in-up`
- Title: GTKWave MCP Server / GTKWave MCP 服务器
- Author: mcp4eda
- Category: Simulation Visualization / 仿真可视化

### Step 5: Update Navigation/Categories

Ensure the category filter includes "Simulation Visualization" in both languages.

## Website Implementation Code Examples

### Server Card Component (React/Vue example)
```jsx
<div className="server-card fade-in-up">
  <h3>{language === 'en' ? 'GTKWave MCP Server' : 'GTKWave MCP 服务器'}</h3>
  <p className="author">作者 mcp4eda</p>
  <span className="category">
    {language === 'en' ? 'Simulation Visualization' : '仿真可视化'}
  </span>
  <a href={`/${language}/servers/gtkwave-mcp`}>
    {language === 'en' ? 'Learn More' : '了解更多'}
  </a>
</div>
```

### API Response Format
```json
{
  "servers": [
    {
      "id": "gtkwave-mcp",
      "name": {
        "en": "GTKWave MCP Server",
        "zh": "GTKWave MCP 服务器"
      },
      "author": "mcp4eda",
      "category": "simulation_visualization",
      "description": {
        "en": "Waveform viewing and analysis for simulation results",
        "zh": "用于仿真结果的波形查看和分析"
      },
      "tools": [
        "gtkwave_open",
        "gtkwave_convert",
        "gtkwave_extract_signals",
        "gtkwave_analyze_timing",
        "gtkwave_generate_script",
        "gtkwave_capture_screenshot"
      ],
      "tags": ["waveform", "vcd", "fst", "simulation", "visualization"],
      "repository": "https://github.com/mcp4eda/mcp4eda/tree/main/gtkwave-mcp"
    }
  ]
}
```

## SEO Metadata

### English Page
```html
<title>GTKWave MCP Server - Waveform Analysis for EDA | MCP4EDA</title>
<meta name="description" content="GTKWave MCP Server provides programmatic access to waveform viewing and analysis. Convert formats, analyze timing, and automate visualization workflows.">
<meta name="keywords" content="GTKWave, MCP, waveform viewer, VCD, FST, simulation visualization, EDA tools">
```

### Chinese Page
```html
<title>GTKWave MCP 服务器 - EDA波形分析 | MCP4EDA</title>
<meta name="description" content="GTKWave MCP 服务器提供波形查看和分析的程序化访问。支持格式转换、时序分析和自动化可视化工作流程。">
<meta name="keywords" content="GTKWave, MCP, 波形查看器, VCD, FST, 仿真可视化, EDA工具">
```

## Integration Checklist

- [ ] Add GTKWave server data to database/API
- [ ] Create "Simulation Visualization" category if needed
- [ ] Add server card to homepage grid
- [ ] Create detailed server page with bilingual content
- [ ] Update category filters
- [ ] Test language switching
- [ ] Verify all links work correctly
- [ ] Add to sitemap
- [ ] Update any server count statistics

## Testing

1. Verify the card appears on homepage
2. Test category filtering
3. Check language switching on all content
4. Validate all tool examples display correctly
5. Test responsive design on mobile devices

## Contact for Website Updates

The website administrator should:
1. Use the data from `server-info.json`
2. Copy content from `website-content.md` for the detailed page
3. Ensure consistent styling with existing servers
4. Test the integration in both languages