import { z } from 'zod';
import { AbstractTool } from './base.js';
import { DRCResult } from '../types/index.js';
import { FileNotFoundError, ExecutionError } from '../utils/error-handler.js';
import { existsSync, readFileSync } from 'fs';

export class RunDRCTool extends AbstractTool {
  getName(): string {
    return 'klayout_run_drc';
  }

  getDescription(): string {
    return 'Run Design Rule Check (DRC) on a layout file using KLayout DRC engine';
  }

  getInputSchema() {
    return z.object({
      layoutFile: z.string().describe('Path to the layout file to check'),
      drcFile: z.string().describe('Path to the DRC rule file (.lydrc, .drc, or Ruby script)'),
      outputFile: z.string().optional().describe('Path to save DRC results (optional)'),
      topCell: z.string().optional().describe('Specific top cell to check'),
      reportLimit: z.number().optional().default(1000).describe('Maximum number of violations to report'),
      verbose: z.boolean().optional().default(false).describe('Enable verbose output'),
    });
  }

  async execute(args: any): Promise<{ results: DRCResult[]; summary: string }> {
    const { layoutFile, drcFile, outputFile, topCell, reportLimit, verbose } = args;

    // Validate files exist
    if (!existsSync(layoutFile)) {
      throw new FileNotFoundError(layoutFile);
    }

    if (!existsSync(drcFile)) {
      throw new FileNotFoundError(drcFile);
    }

    // Check if DRC file is a script or XML format
    const isDrcScript = drcFile.endsWith('.rb') || drcFile.endsWith('.drc');
    const drcContent = isDrcScript ? readFileSync(drcFile, 'utf8') : '';

    const script = this.generateDRCScript(
      layoutFile,
      drcFile,
      isDrcScript,
      drcContent,
      outputFile,
      topCell,
      reportLimit,
      verbose
    );

    const result = await this.executor.executePythonScript(script);

    if (result.exitCode !== 0) {
      throw new ExecutionError(`DRC check failed: ${result.stderr}`);
    }

    try {
      const output = JSON.parse(result.stdout);
      return {
        results: output.results as DRCResult[],
        summary: output.summary,
      };
    } catch (error) {
      throw new ExecutionError(`Failed to parse DRC results: ${error}`);
    }
  }

  private generateDRCScript(
    layoutFile: string,
    drcFile: string,
    isDrcScript: boolean,
    drcContent: string,
    outputFile?: string,
    topCell?: string,
    reportLimit?: number,
    verbose?: boolean
  ): string {
    return `
import pya
import json
import sys
import os

try:
    # Create DRC engine
    engine = pya.DRC()
    
    # Configure verbosity
    if ${verbose}:
        engine.verbose = True
    
    # Load layout
    layout = pya.Layout()
    layout.read("${this.sanitizePath(layoutFile)}")
    
    # Select top cell
    if "${topCell || ''}":
        cell = layout.cell("${topCell}")
        if not cell:
            raise ValueError(f"Top cell '${topCell}' not found")
    else:
        cell = layout.top_cell()
    
    if not cell:
        raise ValueError("No top cell found in layout")
    
    # Configure DRC engine
    engine.source(layout, cell)
    
    # Load and run DRC rules
    if ${isDrcScript}:
        # Execute DRC script
        engine._dss._engine.instance_eval('''${drcContent.replace(/'/g, "\\'")}''')
    else:
        # Load DRC file (XML format)
        engine.load("${this.sanitizePath(drcFile)}")
    
    # Run the DRC
    engine.run()
    
    # Collect results
    results = []
    rule_violations = {}
    total_violations = 0
    
    for category in engine.each_category():
        rule_name = category.name
        violations = []
        count = 0
        
        for item in category.each_item():
            if count >= ${reportLimit}:
                break
                
            violation = {
                "location": {
                    "left": item.bbox.left / 1000.0,
                    "bottom": item.bbox.bottom / 1000.0,
                    "right": item.bbox.right / 1000.0,
                    "top": item.bbox.top / 1000.0
                },
                "cell": item.cell_name,
                "description": item.message or rule_name
            }
            violations.append(violation)
            count += 1
        
        total_count = category.num_items()
        total_violations += total_count
        
        result = {
            "ruleName": rule_name,
            "severity": "error",  # Could be enhanced with rule metadata
            "count": total_count,
            "violations": violations
        }
        results.append(result)
    
    # Generate summary
    summary = f"DRC check completed. Total violations: {total_violations}"
    if total_violations == 0:
        summary = "DRC check passed. No violations found."
    
    # Save results if output file specified
    if "${outputFile || ''}":
        # Save as RDB (KLayout's result database format)
        rdb = pya.ReportDatabase("DRC Results")
        for category in engine.each_category():
            rdb_cat = rdb.category(category.name)
            for item in category.each_item():
                rdb_cat.item(item.polygon, item.cell_name, item.message)
        rdb.save("${this.sanitizePath(outputFile || '')}")
    
    # Output JSON results
    output = {
        "results": results,
        "summary": summary
    }
    
    print(json.dumps(output, indent=2))
    
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
  }
}