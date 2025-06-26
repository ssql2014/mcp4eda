# AnySilicon MCP Natural Language Examples

The AnySilicon MCP server includes a natural language interface that understands die calculation queries in plain English. Here are examples of how to use it:

## Die Calculation Examples

### Basic Calculations
```
"Calculate dies for 10x10mm chip on 300mm wafer"
"How many 5x5 chips fit on a 200mm wafer?"
"Calculate yield for 15x20mm die on 300mm wafer"
"What's the die count for a 7.5x7.5 chip on a 450mm wafer?"
```

### With Specific Parameters
```
"Calculate dies for 8x12mm chip on 300mm wafer with 2.5mm edge exclusion"
"How many dies with 0.15mm scribe lane for 10x10 chip on 200mm wafer?"
"Calculate 5x5mm dies on 300mm wafer with 4mm edge exclusion and 0.08mm scribe"
```

### Using Previous Context
If you've done a calculation before, the tool remembers and can reuse parameters:
```
"Now try with a 200mm wafer instead"
"What if the die was 12x12?"
"Recalculate with 2mm edge exclusion"
```

## Parameter Validation Examples

```
"Validate parameters for 300mm wafer with 3mm edge exclusion"
"Check if 0.05mm scribe lane is valid"
"Verify calculation parameters"
```

## Wafer Information Examples

```
"What are the standard wafer sizes?"
"Show available wafer diameters"
"List standard wafer specifications"
```

## How It Works

The natural language tool:
1. Interprets your query to understand what you want to calculate
2. Extracts parameters like dimensions and wafer size
3. Suggests the appropriate tool with correct arguments
4. Provides helpful explanations and hints

Example response:
```json
{
  "interpretation": "You want to calculate dies per wafer",
  "suggestedTool": "calculate_die_per_wafer",
  "suggestedArguments": {
    "wafer_diameter": 300,
    "die_width": 10,
    "die_height": 10,
    "edge_exclusion": 3,
    "scribe_lane": 0.1
  },
  "explanation": "I'll calculate how many 10x10mm dies fit on a 300mm wafer",
  "hints": [
    "Using edge exclusion of 3mm",
    "Using scribe lane width of 0.1mm",
    "You can specify different wafer sizes: 150mm, 200mm, 300mm, or 450mm",
    "You can adjust edge exclusion and scribe lane parameters"
  ]
}
```

## Tips

1. **Dimensions**: Use "x" or "×" to specify die dimensions (e.g., "10x10", "5×7")
2. **Units**: Always assumed to be in millimeters (mm)
3. **Wafer sizes**: Mention the diameter (150, 200, 300, or 450mm)
4. **Edge exclusion**: Default is 3mm, specify if different
5. **Scribe lane**: Default is 0.1mm, specify if different

## Common Patterns

### Quick calculations
- "Dies for [width]x[height] on [wafer]mm wafer"
- "How many [width]x[height] chips on [wafer]mm?"

### Detailed specifications
- "Calculate [width]x[height]mm dies on [wafer]mm wafer with [edge]mm edge exclusion and [scribe]mm scribe lane"

### Comparisons
- First: "Calculate 10x10 on 300mm wafer"
- Then: "What about on a 200mm wafer?"
- Or: "Now try 8x8 dies"

The natural language interface makes it easy to perform die calculations without memorizing parameter names!