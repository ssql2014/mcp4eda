import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AbstractTool } from './base.js';
import { VisualizationResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Schema for show tool parameters
const ShowParamsSchema = z.object({
  filepath: z.string().describe('Path to the Verilog/SystemVerilog file to visualize'),
  moduleName: z.string().optional().describe('Specific module to visualize (shows all if not specified)'),
  topModule: z.string().optional().describe('Top module name (auto-detected if not specified)'),
  format: z.enum(['dot', 'svg', 'pdf', 'png'])
    .default('svg')
    .describe('Output format for visualization'),
  outputFile: z.string().optional().describe('Output file path (auto-generated if not specified)'),
  simplify: z.boolean().default(true).describe('Simplify the design before visualization'),
  colorScheme: z.enum(['default', 'dark', 'colorblind'])
    .default('default')
    .describe('Color scheme for visualization'),
  includeConstants: z.boolean().default(false).describe('Include constant values in visualization'),
  returnBase64: z.boolean().default(false).describe('Return image as base64 encoded string'),
});

type ShowParams = z.infer<typeof ShowParamsSchema>;

export class ShowTool extends AbstractTool<ShowParams, VisualizationResult> {
  constructor(configManager: any, cacheManager: any) {
    super('yosys_show', 'visualization', configManager, cacheManager, ShowParamsSchema as z.ZodType<ShowParams>);
  }

  getDescription(): string {
    return 'Generate visual representations of Verilog/SystemVerilog designs using Graphviz';
  }

  protected async executeInternal(params: ShowParams): Promise<VisualizationResult> {
    // Resolve and validate input file
    const inputPath = this.resolvePath(params.filepath);
    await this.validateFile(inputPath);

    logger.info(`Generating ${params.format} visualization for ${inputPath}`);

    // Create temporary directory
    const tempDir = await this.runner.createTempDir();

    try {
      // Determine output file path
      let outputFile: string;
      if (params.outputFile) {
        outputFile = this.resolvePath(params.outputFile);
      } else {
        const suffix = params.moduleName ? `_${params.moduleName}` : '';
        outputFile = this.generateOutputPath(inputPath, `${suffix}_diagram`, params.format);
      }

      // Build visualization script
      const script = this.buildVisualizationScript(params, inputPath, tempDir);

      // Run Yosys to generate visualization
      await this.runner.runScript(script);

      // Check if visualization was generated
      const tempOutputBase = path.join(tempDir, 'show');
      let generatedFile: string;

      // Yosys show command generates files with specific naming
      if (params.format === 'dot') {
        generatedFile = `${tempOutputBase}.dot`;
      } else {
        // For other formats, Yosys might generate through external tools
        generatedFile = `${tempOutputBase}.${params.format}`;
      }

      // Check if file was generated
      try {
        await fs.access(generatedFile);
      } catch {
        // If specific format not found, check for .dot file
        generatedFile = `${tempOutputBase}.dot`;
        await fs.access(generatedFile);
        
        // Convert dot to requested format if needed
        if (params.format !== 'dot') {
          await this.convertDotToFormat(generatedFile, outputFile, params.format);
          generatedFile = outputFile;
        }
      }

      // Handle output based on parameters
      let responseData: VisualizationResult;

      if (params.format === 'dot') {
        // For DOT format, always return the content as text
        const dotContent = await fs.readFile(generatedFile, 'utf-8');
        
        responseData = {
          success: true,
          format: params.format,
          data: {
            visualization: dotContent,
          },
          filePath: outputFile,
          metadata: {},
        };
      } else if (params.returnBase64) {
        // Read file and convert to base64
        const fileData = await fs.readFile(generatedFile);
        const base64Data = fileData.toString('base64');
        
        responseData = {
          success: true,
          format: params.format,
          data: base64Data,
          metadata: {},
        };
      } else {
        // Copy to final location if needed
        if (generatedFile !== outputFile) {
          await fs.copyFile(generatedFile, outputFile);
        }
        
        responseData = {
          success: true,
          format: params.format,
          filePath: outputFile,
          metadata: {},
        };
      }

      // Clean up temporary directory
      await this.runner.cleanupTempDir(tempDir);

      return responseData;
    } catch (error) {
      // Clean up on error
      await this.runner.cleanupTempDir(tempDir);
      
      return this.createBaseResult(false, error instanceof Error ? error.message : 'Visualization failed');
    }
  }

  private buildVisualizationScript(
    params: ShowParams,
    inputPath: string,
    tempDir: string
  ): string[] {
    const commands: string[] = [];

    // Read input file
    commands.push(`read_verilog "${inputPath}"`);

    // Set hierarchy
    if (params.topModule) {
      commands.push(`hierarchy -check -top ${params.topModule}`);
    } else {
      commands.push('hierarchy -check -auto-top');
    }

    // Process design
    commands.push('proc');

    // Simplify if requested
    if (params.simplify) {
      commands.push('opt_clean');
      commands.push('opt_expr');
    }

    // Build show command
    let showCmd = 'show';
    
    // Add format (Yosys primarily outputs dot, conversion happens externally)
    showCmd += ' -format dot';
    
    // Set output prefix
    const outputPrefix = path.join(tempDir, 'show');
    showCmd += ` -prefix ${outputPrefix}`;

    // Add color scheme options
    // Note: Yosys show command has limited color options
    // Color customization would need to be done in post-processing

    // Include constants if requested
    // Note: Constant inclusion is always enabled in basic show command

    // Add module name if specified
    if (params.moduleName) {
      showCmd += ` ${params.moduleName}`;
    }

    commands.push(showCmd);

    return commands;
  }

  private async convertDotToFormat(
    dotFile: string,
    outputFile: string,
    format: string
  ): Promise<void> {
    // Try to convert using graphviz if available
    try {
      const { CommandExecutor } = await import('../utils/executor.js');
      
      // Check if dot command is available
      await CommandExecutor.execute('which', ['dot']);
      
      // Convert using graphviz
      await CommandExecutor.execute('dot', [
        `-T${format}`,
        '-o', outputFile,
        dotFile
      ]);
      
      logger.info(`Converted ${dotFile} to ${format} format`);
    } catch (error) {
      // If graphviz not available, keep as dot file
      logger.warn(`Graphviz not available, keeping output as .dot file`);
      await fs.copyFile(dotFile, outputFile.replace(/\.[^.]+$/, '.dot'));
    }
  }
}