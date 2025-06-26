import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ConversionOptions } from '../types/index.js';
import { FileNotFoundError, UnsupportedFormatError, ExecutionError } from '../utils/error-handler.js';
import { existsSync } from 'fs';
import { extname } from 'path';

export class ConvertLayoutTool extends AbstractTool {
  getName(): string {
    return 'klayout_convert_layout';
  }

  getDescription(): string {
    return 'Convert layout files between different formats (GDS, OASIS, DXF, CIF, etc.)';
  }

  getInputSchema() {
    return z.object({
      inputFile: z.string().describe('Path to the input layout file'),
      outputFile: z.string().describe('Path to the output layout file'),
      scale: z.number().optional().default(1.0).describe('Scaling factor for the layout'),
      mergeReferences: z.boolean().optional().default(false).describe('Merge referenced cells into a flat layout'),
      layerMap: z.record(z.string()).optional().describe('Layer mapping in format "source_layer/datatype:target_layer/datatype"'),
      dbuScale: z.number().optional().describe('Database unit scaling factor'),
    });
  }

  async execute(args: any): Promise<{ success: boolean; outputFile: string; message: string }> {
    const { inputFile, outputFile, scale, mergeReferences, layerMap, dbuScale } = args;

    // Validate input file exists
    if (!existsSync(inputFile)) {
      throw new FileNotFoundError(inputFile);
    }

    // Validate formats
    const inputFormat = this.getFormat(inputFile);
    const outputFormat = this.getFormat(outputFile);

    if (!this.config.isSupportedFormat(inputFormat)) {
      throw new UnsupportedFormatError(inputFormat);
    }

    if (!this.config.isSupportedFormat(outputFormat)) {
      throw new UnsupportedFormatError(outputFormat);
    }

    const script = this.generateConversionScript(
      inputFile,
      outputFile,
      scale,
      mergeReferences,
      layerMap,
      dbuScale
    );

    const result = await this.executor.executePythonScript(script);

    if (result.exitCode !== 0) {
      throw new ExecutionError(`Conversion failed: ${result.stderr}`);
    }

    return {
      success: true,
      outputFile: outputFile,
      message: `Successfully converted ${inputFile} to ${outputFile}`,
    };
  }

  private getFormat(filePath: string): string {
    const ext = extname(filePath).toLowerCase().substring(1);
    return ext === 'gds2' ? 'gds' : ext;
  }

  private generateConversionScript(
    inputFile: string,
    outputFile: string,
    scale: number,
    mergeReferences: boolean,
    layerMap?: Record<string, string>,
    dbuScale?: number
  ): string {
    return `
import pya
import sys

try:
    # Create layout
    layout = pya.Layout()
    
    # Read input file
    layout.read("${this.sanitizePath(inputFile)}")
    
    # Apply scaling if needed
    if ${scale} != 1.0:
        # Create transformation
        trans = pya.DCplxTrans(${scale})
        
        # Apply to all cells
        for cell in layout.each_cell():
            cell.transform(trans)
    
    # Apply database unit scaling if specified
    if ${dbuScale || 0} > 0:
        layout.dbu = layout.dbu * ${dbuScale}
    
    # Apply layer mapping if specified
    layer_map_dict = ${JSON.stringify(layerMap || {})}
    if layer_map_dict:
        # Parse layer mapping
        layer_mapping = {}
        for src, tgt in layer_map_dict.items():
            src_parts = src.split('/')
            tgt_parts = tgt.split('/')
            src_layer = int(src_parts[0])
            src_datatype = int(src_parts[1]) if len(src_parts) > 1 else 0
            tgt_layer = int(tgt_parts[0])
            tgt_datatype = int(tgt_parts[1]) if len(tgt_parts) > 1 else 0
            
            src_index = layout.layer(src_layer, src_datatype)
            tgt_index = layout.layer(tgt_layer, tgt_datatype)
            layer_mapping[src_index] = tgt_index
        
        # Apply mapping to all cells
        for cell in layout.each_cell():
            for src_index, tgt_index in layer_mapping.items():
                if src_index != tgt_index:
                    cell.move_shapes(src_index, tgt_index)
    
    # Merge references if requested
    if ${mergeReferences}:
        # Flatten all cells into top cell
        if layout.top_cell():
            layout.top_cell().flatten(True)
    
    # Write output file
    layout.write("${this.sanitizePath(outputFile)}")
    
    print("Conversion completed successfully")
    
except Exception as e:
    print(f"Error during conversion: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
  }
}