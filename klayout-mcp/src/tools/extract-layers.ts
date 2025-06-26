import { z } from 'zod';
import { AbstractTool } from './base.js';
import { FileNotFoundError, ExecutionError } from '../utils/error-handler.js';
import { existsSync } from 'fs';

export class ExtractLayersTool extends AbstractTool {
  getName(): string {
    return 'klayout_extract_layers';
  }

  getDescription(): string {
    return 'Extract specific layers from a layout file to create a new layout with only selected layers';
  }

  getInputSchema() {
    return z.object({
      inputFile: z.string().describe('Path to the input layout file'),
      outputFile: z.string().describe('Path to the output layout file'),
      layers: z.array(z.string()).describe('List of layers to extract in format "layer/datatype" (e.g., ["1/0", "2/0", "10/5"])'),
      includeLabels: z.boolean().optional().default(true).describe('Include text labels on specified layers'),
      flattenHierarchy: z.boolean().optional().default(false).describe('Flatten cell hierarchy in output'),
      mergeShapes: z.boolean().optional().default(false).describe('Merge touching shapes on same layer'),
    });
  }

  async execute(args: any): Promise<{ success: boolean; message: string; layerCount: number }> {
    const { inputFile, outputFile, layers, includeLabels, flattenHierarchy, mergeShapes } = args;

    // Validate input file exists
    if (!existsSync(inputFile)) {
      throw new FileNotFoundError(inputFile);
    }

    // Validate layer format
    const layerPattern = /^\d+\/\d+$/;
    for (const layer of layers) {
      if (!layerPattern.test(layer)) {
        throw new ExecutionError(`Invalid layer format: ${layer}. Use "layer/datatype" format (e.g., "1/0")`);
      }
    }

    const script = this.generateExtractScript(
      inputFile,
      outputFile,
      layers,
      includeLabels,
      flattenHierarchy,
      mergeShapes
    );

    const result = await this.executor.executePythonScript(script);

    if (result.exitCode !== 0) {
      throw new ExecutionError(`Layer extraction failed: ${result.stderr}`);
    }

    try {
      const output = JSON.parse(result.stdout);
      return {
        success: true,
        message: output.message,
        layerCount: output.layerCount,
      };
    } catch (error) {
      throw new ExecutionError(`Failed to parse extraction results: ${error}`);
    }
  }

  private generateExtractScript(
    inputFile: string,
    outputFile: string,
    layers: string[],
    includeLabels: boolean,
    flattenHierarchy: boolean,
    mergeShapes: boolean
  ): string {
    return `
import pya
import json
import sys

try:
    # Load the input layout
    input_layout = pya.Layout()
    input_layout.read("${this.sanitizePath(inputFile)}")
    
    # Create output layout with same database unit
    output_layout = pya.Layout()
    output_layout.dbu = input_layout.dbu
    
    # Parse layer specifications
    layer_specs = ${JSON.stringify(layers)}
    layer_indices = []
    
    for spec in layer_specs:
        parts = spec.split('/')
        layer_num = int(parts[0])
        datatype = int(parts[1])
        
        # Create layer in both layouts
        input_layer_index = input_layout.layer(layer_num, datatype)
        output_layer_index = output_layout.layer(layer_num, datatype)
        
        # Copy layer properties if they exist
        layer_info = input_layout.get_info(input_layer_index)
        if layer_info:
            output_layout.set_info(output_layer_index, layer_info)
        
        layer_indices.append((input_layer_index, output_layer_index))
    
    # Function to copy shapes from one cell to another
    def copy_cell_shapes(input_cell, output_cell, layer_mapping):
        for input_idx, output_idx in layer_mapping:
            # Copy shapes
            for shape in input_cell.shapes(input_idx).each():
                output_cell.shapes(output_idx).insert(shape)
    
    # Handle hierarchy
    if ${flattenHierarchy}:
        # Create single output cell
        output_cell = output_layout.create_cell("FLATTENED")
        
        # Get top cell
        top_cell = input_layout.top_cell()
        if not top_cell:
            raise ValueError("No top cell found in input layout")
        
        # Flatten and copy
        temp_cell = input_layout.create_cell("TEMP_FLAT")
        temp_cell.insert(pya.CellInstArray(top_cell.cell_index(), pya.Trans()))
        temp_cell.flatten(True)
        
        copy_cell_shapes(temp_cell, output_cell, layer_indices)
        
    else:
        # Copy hierarchy
        cell_mapping = {}
        
        # Create all cells in output
        for input_cell in input_layout.each_cell():
            output_cell = output_layout.create_cell(input_cell.name)
            cell_mapping[input_cell.cell_index()] = output_cell
            
            # Copy shapes on selected layers
            copy_cell_shapes(input_cell, output_cell, layer_indices)
        
        # Recreate hierarchy
        for input_cell in input_layout.each_cell():
            output_cell = cell_mapping[input_cell.cell_index()]
            
            for inst in input_cell.each_inst():
                child_input_cell = input_layout.cell(inst.cell_index)
                child_output_cell = cell_mapping[inst.cell_index]
                output_cell.insert(pya.CellInstArray(child_output_cell.cell_index(), inst.trans))
    
    # Merge shapes if requested
    if ${mergeShapes}:
        for cell in output_layout.each_cell():
            for _, output_idx in layer_indices:
                # Create region from shapes
                region = pya.Region()
                for shape in cell.shapes(output_idx).each():
                    if shape.is_polygon():
                        region.insert(shape.polygon)
                    elif shape.is_box():
                        region.insert(shape.box)
                    elif shape.is_path():
                        region.insert(shape.path.polygon())
                
                # Merge the region
                region.merge()
                
                # Clear original shapes and insert merged
                cell.shapes(output_idx).clear()
                for polygon in region.each():
                    cell.shapes(output_idx).insert(polygon)
    
    # Write output
    output_layout.write("${this.sanitizePath(outputFile)}")
    
    # Count shapes in output
    total_shapes = 0
    for cell in output_layout.each_cell():
        for _, output_idx in layer_indices:
            total_shapes += cell.shapes(output_idx).size()
    
    # Return results
    result = {
        "message": f"Successfully extracted {len(layers)} layers with {total_shapes} shapes",
        "layerCount": len(layers)
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
  }
}