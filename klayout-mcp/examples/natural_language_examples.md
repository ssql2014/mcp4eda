# KLayout MCP Natural Language Examples

The KLayout MCP server includes a natural language interface that understands layout manipulation commands in plain English. Here are examples of how to use it:

## Layout Analysis Examples

### Basic Information
```
"Analyze my design.gds file"
"Show me information about chip.oas"
"What layers are in layout.gds?"
"Display cell hierarchy for processor.gds"
```

### Detailed Analysis
```
"Analyze top cell CHIP_TOP in design.gds"
"Show detailed statistics for layout.oas"
"List all cells and instances in my design"
"What's the bounding box of my layout?"
```

## Format Conversion Examples

### Basic Conversion
```
"Convert design.gds to OASIS format"
"Change layout.oas to GDS"
"Convert my DXF file to GDS"
"Save design.gds as CIF format"
```

### With Scaling and Options
```
"Convert design.gds to OASIS with 0.001 scaling"
"Change to GDS format and scale from nm to um"
"Convert and flatten hierarchy"
"Save as OASIS with maximum compression"
```

### Layer Mapping
```
"Convert GDS and remap layer 1 to layer 10"
"Change format and map layers 1,2,3 to 10,20,30"
"Convert with custom layer mapping"
```

## DRC (Design Rule Check) Examples

### Running DRC
```
"Run DRC on my layout.gds"
"Check design rules for 45nm technology"
"Execute DRC with my custom rules file"
"Run design rule checks on CHIP_TOP cell"
```

### With Specific Options
```
"Run DRC and report only critical errors"
"Check design rules with 1000 violation limit"
"Execute DRC on metal layers only"
"Run verbose DRC analysis"
```

## Layer Extraction Examples

### Basic Extraction
```
"Extract metal layers from design.gds"
"Get only layer 31 from my layout"
"Extract layers 1, 2, and 3"
"Pull out all metal layers (31-34)"
```

### Advanced Extraction
```
"Extract layers and merge overlapping shapes"
"Get metal layers and flatten hierarchy"
"Extract with labels included"
"Pull layers 31,32,33 and save as metal_only.gds"
```

## Script Execution Examples

### Density Calculation
```
"Calculate density for each layer"
"What's the metal density of my design?"
"Compute fill density for all layers"
"Analyze layer utilization"
```

### Custom Analysis
```
"Run my custom analysis script.py"
"Execute layer_density.py on design.gds"
"Run measurement script with parameters"
"Execute custom DRC script"
```

## Combined Operations

```
"Convert GDS to OASIS and extract only metal layers"
"Run DRC on design.gds using 45nm rules"
"Convert format, scale to um, and flatten"
"Extract layers 31-34 and calculate density"
```

## Resource Access Examples

```
"Show me the simple DRC example"
"Get the layer density calculator script"
"Display format conversion examples"
"Show available DRC templates"
```

## How It Works

The natural language tool:
1. Interprets your layout operation intent
2. Identifies files, formats, and parameters
3. Suggests the appropriate KLayout tool
4. Provides correct arguments and options
5. Offers helpful hints and alternatives

Example response:
```json
{
  "interpretation": "You want to convert a GDS file to OASIS with scaling",
  "suggestedTool": "klayout_convert_layout",
  "suggestedArguments": {
    "inputFile": "design.gds",
    "outputFile": "design.oas",
    "scale": 0.001,
    "mergeReferences": false
  },
  "explanation": "I'll convert design.gds to OASIS format with 0.001 scaling (nm to um)",
  "hints": [
    "OASIS provides better compression than GDS",
    "Scaling 0.001 converts nanometers to micrometers",
    "Original hierarchy will be preserved",
    "You can add layer mapping if needed"
  ]
}
```

## Tips for Natural Language Commands

1. **File Formats**: Specify GDS, OASIS, DXF, CIF, MAG, or DEF/LEF
2. **Layer Specification**: Use "layer X" or "layers X,Y,Z" or "layers X-Y"
3. **Scaling**: Mention scale factors or unit conversion (nm to um)
4. **Operations**: Use clear verbs like "convert", "extract", "run", "check"
5. **Options**: Mention specific needs like "flatten", "merge", "compress"

## Common Patterns

### Quick operations
- "Convert [input] to [format]"
- "Extract layer [N] from [file]"
- "Run DRC on [file]"
- "Analyze [file]"

### Detailed specifications
- "Convert [file] to [format] with [scale] scaling"
- "Extract layers [list] and merge shapes"
- "Run DRC using [rules] with [limit] violations"

### Multi-step operations
- "Convert format and extract specific layers"
- "Run analysis and generate report"
- "Check rules and fix violations"

## Layer Number Reference

Common layer numbers in IC design:
- **1-10**: Active layers, poly, diffusion
- **11-20**: Implant layers
- **31-40**: Metal layers (M1-M10)
- **41-50**: Via layers
- **51-60**: Passivation, bump layers

Always specify layers clearly:
- Single: "layer 31"
- Multiple: "layers 31, 32, 33"
- Range: "layers 31-34"
- Named: "metal layers" (31-40)

The natural language interface makes KLayout operations intuitive without memorizing command syntax!