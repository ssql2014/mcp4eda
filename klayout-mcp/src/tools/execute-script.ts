import { z } from 'zod';
import { AbstractTool } from './base.js';
import { ScriptExecutionResult } from '../types/index.js';
import { ExecutionError, ValidationError } from '../utils/error-handler.js';
import { readFileSync, existsSync } from 'fs';

export class ExecuteScriptTool extends AbstractTool {
  getName(): string {
    return 'klayout_execute_script';
  }

  getDescription(): string {
    return 'Execute custom Python or Ruby scripts in KLayout environment with access to layout manipulation APIs';
  }

  getInputSchema() {
    return z.object({
      script: z.string().optional().describe('Script content to execute'),
      scriptFile: z.string().optional().describe('Path to script file to execute'),
      language: z.enum(['python', 'ruby']).default('python').describe('Script language'),
      inputFiles: z.array(z.string()).optional().describe('Input files to pass to the script'),
      outputFile: z.string().optional().describe('Output file path for script results'),
      parameters: z.record(z.any()).optional().describe('Additional parameters to pass to the script'),
    });
  }

  async execute(args: any): Promise<ScriptExecutionResult> {
    const { script, scriptFile, language, inputFiles, outputFile, parameters } = args;

    // Validate that either script or scriptFile is provided
    if (!script && !scriptFile) {
      throw new ValidationError('Either script content or script file must be provided');
    }

    if (script && scriptFile) {
      throw new ValidationError('Cannot provide both script content and script file');
    }

    let scriptContent = script;
    if (scriptFile) {
      if (!existsSync(scriptFile)) {
        throw new ValidationError(`Script file not found: ${scriptFile}`);
      }
      scriptContent = readFileSync(scriptFile, 'utf8');
    }

    // Validate input files exist
    if (inputFiles) {
      for (const file of inputFiles) {
        if (!existsSync(file)) {
          throw new ValidationError(`Input file not found: ${file}`);
        }
      }
    }

    const startTime = Date.now();
    
    // Prepare script with parameter injection
    const fullScript = this.prepareScript(scriptContent!, language, inputFiles, outputFile, parameters);

    // Execute script
    const result = language === 'python' 
      ? await this.executor.executePythonScript(fullScript)
      : await this.executor.executeRubyScript(fullScript);

    const executionTime = Date.now() - startTime;

    if (result.exitCode !== 0) {
      return {
        output: result.stdout,
        error: result.stderr,
        executionTime,
      };
    }

    return {
      output: result.stdout,
      executionTime,
    };
  }

  private prepareScript(
    script: string,
    language: string,
    inputFiles?: string[],
    outputFile?: string,
    parameters?: Record<string, any>
  ): string {
    if (language === 'python') {
      return this.preparePythonScript(script, inputFiles, outputFile, parameters);
    } else {
      return this.prepareRubyScript(script, inputFiles, outputFile, parameters);
    }
  }

  private preparePythonScript(
    script: string,
    inputFiles?: string[],
    outputFile?: string,
    parameters?: Record<string, any>
  ): string {
    const header = `
import pya
import sys
import json

# Injected parameters
input_files = ${JSON.stringify(inputFiles || [])}
output_file = "${outputFile || ''}"
parameters = ${JSON.stringify(parameters || {})}

# Make parameters available as individual variables
for key, value in parameters.items():
    globals()[key] = value

# User script starts here
`;

    return header + '\n' + script;
  }

  private prepareRubyScript(
    script: string,
    inputFiles?: string[],
    outputFile?: string,
    parameters?: Record<string, any>
  ): string {
    const header = `
# Injected parameters
$input_files = ${JSON.stringify(inputFiles || [])}
$output_file = "${outputFile || ''}"
$parameters = ${JSON.stringify(parameters || {})}

# Make parameters available as instance variables
$parameters.each do |key, value|
  instance_variable_set("@#{key}", value)
end

# User script starts here
`;

    return header + '\n' + script;
  }
}