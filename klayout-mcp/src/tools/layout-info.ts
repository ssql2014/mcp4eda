import { z } from 'zod';
import { AbstractTool } from './base.js';
import { LayoutInfo } from '../types/index.js';
import { FileNotFoundError, ExecutionError } from '../utils/error-handler.js';
import { existsSync, statSync } from 'fs';

export class LayoutInfoTool extends AbstractTool {
  getName(): string {
    return 'klayout_layout_info';
  }

  getDescription(): string {
    return 'Get detailed information about a layout file including cells, layers, and statistics';
  }

  getInputSchema() {
    return z.object({
      layoutFile: z.string().describe('Path to the layout file (GDS, OASIS, etc.)'),
      topCell: z.string().optional().describe('Specific top cell to analyze'),
      includeHierarchy: z.boolean().default(false).describe('Include cell hierarchy information'),
    });
  }

  async execute(args: any): Promise<LayoutInfo> {
    const { layoutFile, topCell, includeHierarchy } = args;

    // Validate file exists
    if (!existsSync(layoutFile)) {
      throw new FileNotFoundError(layoutFile);
    }

    // Check file size
    const stats = statSync(layoutFile);
    if (stats.size > this.config.getMaxFileSize()) {
      throw new ExecutionError(`File size (${this.formatFileSize(stats.size)}) exceeds maximum allowed size (${this.formatFileSize(this.config.getMaxFileSize())})`);
    }

    // Generate cache key
    const cacheKey = this.cache.generateKey('layout-info', { layoutFile, topCell, includeHierarchy });

    return this.getCachedResult(cacheKey, async () => {
      const script = this.generateInfoScript(layoutFile, topCell, includeHierarchy);
      const result = await this.executor.executePythonScript(script);

      if (result.exitCode !== 0) {
        throw new ExecutionError(`Failed to get layout info: ${result.stderr}`);
      }

      try {
        return JSON.parse(result.stdout) as LayoutInfo;
      } catch (error) {
        throw new ExecutionError(`Failed to parse layout info: ${error}`);
      }
    });
  }

  private generateInfoScript(layoutFile: string, topCell?: string, includeHierarchy?: boolean): string {
    return `
import pya
import json
import sys

try:
    # Load the layout
    layout = pya.Layout()
    layout.read("${this.sanitizePath(layoutFile)}")
    
    # Get format
    format_name = "${layoutFile}".split('.')[-1].lower()
    
    # Get top cells
    top_cells = []
    for cell in layout.top_cells():
        top_cells.append(cell.name)
    
    # Select specific top cell if requested
    if "${topCell || ''}":
        cell = layout.cell("${topCell}")
        if not cell:
            raise ValueError(f"Top cell '${topCell}' not found")
    else:
        # Use first top cell
        cell = layout.top_cell() if layout.top_cells() else None
    
    # Collect layer information
    layers = []
    layer_infos = layout.layer_infos()
    for layer_info in layer_infos:
        layer_data = {
            "layer": layer_info.layer,
            "datatype": layer_info.datatype,
            "name": layer_info.name if layer_info.name else None,
            "shapeCount": 0
        }
        
        # Count shapes on this layer
        if cell:
            layer_index = layout.layer(layer_info.layer, layer_info.datatype)
            layer_data["shapeCount"] = cell.shapes(layer_index).size()
        
        layers.append(layer_data)
    
    # Get bounding box
    bbox = {"left": 0, "bottom": 0, "right": 0, "top": 0}
    if cell and not cell.bbox().empty():
        bbox = {
            "left": cell.bbox().left / 1000.0,  # Convert to microns
            "bottom": cell.bbox().bottom / 1000.0,
            "right": cell.bbox().right / 1000.0,
            "top": cell.bbox().top / 1000.0
        }
    
    # Collect statistics
    statistics = {
        "polygons": 0,
        "paths": 0,
        "boxes": 0,
        "texts": 0,
        "instances": 0
    }
    
    if cell:
        for layer_info in layer_infos:
            layer_index = layout.layer(layer_info.layer, layer_info.datatype)
            shapes = cell.shapes(layer_index)
            
            for shape in shapes.each():
                if shape.is_polygon():
                    statistics["polygons"] += 1
                elif shape.is_path():
                    statistics["paths"] += 1
                elif shape.is_box():
                    statistics["boxes"] += 1
                elif shape.is_text():
                    statistics["texts"] += 1
        
        # Count instances
        statistics["instances"] = cell.child_instances()
    
    # Build result
    result = {
        "format": format_name,
        "topCells": top_cells,
        "layers": layers,
        "boundingBox": bbox,
        "cellCount": layout.cells(),
        "statistics": statistics
    }
    
    print(json.dumps(result, indent=2))
    
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
  }
}