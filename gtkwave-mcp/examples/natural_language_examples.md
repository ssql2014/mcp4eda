# GTKWave MCP Natural Language Examples

The GTKWave MCP server includes a natural language interface that understands waveform analysis commands in plain English. Here are examples of how to use it:

## Waveform Viewing Examples

### Opening Waveforms
```
"Open simulation.vcd waveform"
"Show me the waveform file test.fst"
"Display counter_tb.vcd with signals.gtkw"
"Load the VCD file and apply my saved view"
```

### With Specific Options
```
"Open waveform.vcd starting at 1000ns"
"Show simulation.fst from 0 to 5000ns"
"Display test.vcd with 10ns time scale"
"Open waveform and zoom to 100-500ns"
```

## Format Conversion Examples

### Basic Conversion
```
"Convert simulation.vcd to FST format"
"Change test.vcd to compressed format"
"Convert my VCD file to LXT2"
"Save waveform.fst as VCD"
```

### With Compression Options
```
"Convert large.vcd to FST with maximum compression"
"Change simulation.vcd to LXT2 compressed format"
"Convert and compress my waveform file"
"Create space-efficient version of test.vcd"
```

## Signal Analysis Examples

### Signal Extraction
```
"Show all clock signals in design.vcd"
"Extract reset signals from waveform"
"Find all signals matching *data*"
"List bus signals in the design"
```

### Hierarchical Analysis
```
"Show signals in cpu module"
"Extract all signals from testbench.dut"
"List hierarchical signal structure"
"Find signals in memory controller"
```

## Timing Analysis Examples

### Basic Measurements
```
"Measure clock period in waveform"
"Calculate setup time for data signal"
"Find propagation delay between clk and output"
"Measure pulse width of reset signal"
```

### Advanced Analysis
```
"Analyze timing between req and ack signals"
"Find all timing violations"
"Measure skew between multiple clocks"
"Calculate average frequency of clock"
```

## Screenshot Generation Examples

```
"Take screenshot of waveform display"
"Capture current view as PNG"
"Generate waveform image for documentation"
"Create high-resolution screenshot at 1920x1080"
"Save waveform view as report.png"
```

## Script Generation Examples

```
"Generate TCL script for current analysis"
"Create script to automate these measurements"
"Generate reusable waveform setup script"
"Create TCL for signal group configuration"
```

## Combined Operations

```
"Convert VCD to FST and extract clock signals"
"Open waveform and measure all timing"
"Load file, zoom to error, and take screenshot"
"Convert format and generate analysis script"
```

## How It Works

The natural language tool:
1. Interprets your waveform analysis intent
2. Identifies the appropriate GTKWave operation
3. Extracts parameters like time ranges, signal patterns
4. Suggests the correct tool and arguments
5. Provides helpful hints and options

Example response:
```json
{
  "interpretation": "You want to convert a VCD file to FST format",
  "suggestedTool": "gtkwave_convert",
  "suggestedArguments": {
    "inputFile": "simulation.vcd",
    "outputFile": "simulation.fst",
    "format": "fst",
    "compress": true
  },
  "explanation": "I'll convert simulation.vcd to FST format with compression",
  "hints": [
    "FST format provides better compression than VCD",
    "The conversion preserves all signal data",
    "FST files load faster in GTKWave",
    "Original VCD file will not be modified"
  ]
}
```

## Tips for Natural Language Commands

1. **File Types**: Mention the format (VCD, FST, LXT2)
2. **Time Ranges**: Use units like ns, us, ms, s
3. **Signal Patterns**: Use wildcards (* for multiple characters)
4. **Operations**: Use verbs like "open", "convert", "extract", "measure"
5. **Output**: Specify desired format or file names

## Common Patterns

### Quick viewing
- "Open [file]"
- "Show [file] from [start] to [end]"
- "Display [file] with [savefile]"

### Format operations
- "Convert [file] to [format]"
- "Compress [file]"
- "Change [file] format to [format]"

### Analysis tasks
- "Extract [pattern] signals"
- "Measure [signal] timing"
- "Analyze [signal1] to [signal2] delay"

### Output generation
- "Screenshot at [resolution]"
- "Generate script for [operation]"
- "Create report for [analysis]"

The natural language interface makes GTKWave automation accessible without memorizing command syntax!