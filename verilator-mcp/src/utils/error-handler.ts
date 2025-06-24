import { logger } from './logger.js';

export interface ParsedError {
  file?: string;
  line?: number;
  column?: number;
  type: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
}

export class ErrorHandler {
  static parseVerilatorOutput(output: string): ParsedError[] {
    const errors: ParsedError[] = [];
    const lines = output.split('\n');

    // Verilator error format:
    // %Error: filename.v:line:column: message
    // %Warning: filename.v:line: message
    const errorRegex = /^%(\w+):\s*(.+?):(\d+)(?::(\d+))?\s*:\s*(.+)$/;
    const simpleErrorRegex = /^%(\w+):\s*(.+)$/;

    for (const line of lines) {
      let match = errorRegex.exec(line);
      if (match) {
        const [, type, file, lineNum, column, message] = match;
        errors.push({
          type: type.toLowerCase() as 'error' | 'warning' | 'info',
          file,
          line: parseInt(lineNum, 10),
          column: column ? parseInt(column, 10) : undefined,
          message,
        });
        continue;
      }

      match = simpleErrorRegex.exec(line);
      if (match) {
        const [, type, message] = match;
        errors.push({
          type: type.toLowerCase() as 'error' | 'warning' | 'info',
          message,
        });
      }
    }

    return errors;
  }

  static extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const parsed = this.parseVerilatorOutput(output);

    for (const error of parsed) {
      if (error.type === 'warning') {
        const location = error.file
          ? `${error.file}:${error.line}${error.column ? `:${error.column}` : ''}`
          : '';
        warnings.push(location ? `${location}: ${error.message}` : error.message);
      }
    }

    return warnings;
  }

  static formatError(error: ParsedError): string {
    const location = error.file
      ? `${error.file}:${error.line}${error.column ? `:${error.column}` : ''}`
      : '';
    const prefix = error.type.charAt(0).toUpperCase() + error.type.slice(1);
    return location ? `${prefix}: ${location}: ${error.message}` : `${prefix}: ${error.message}`;
  }

  static handleCommandError(error: Error, command: string): never {
    logger.error(`Command failed: ${command}`, error);

    if (error.message.includes('ENOENT')) {
      throw new Error(`Command not found: ${command}. Please ensure Verilator is installed and in PATH.`);
    }

    if (error.message.includes('timed out')) {
      throw new Error(`Command timed out: ${command}. Consider increasing the timeout or optimizing the design.`);
    }

    if (error.message.includes('SIGTERM') || error.message.includes('SIGKILL')) {
      throw new Error(`Command was terminated: ${command}. This may indicate a memory or resource issue.`);
    }

    throw error;
  }

  static isRecoverableError(error: ParsedError): boolean {
    // Some warnings can be treated as recoverable
    const recoverablePatterns = [
      /UNUSED/i,
      /WIDTH/i,
      /IMPLICIT/i,
      /PINMISSING/i,
    ];

    return error.type === 'warning' && 
           recoverablePatterns.some(pattern => pattern.test(error.message));
  }

  static categorizeErrors(errors: ParsedError[]): {
    syntax: ParsedError[];
    lint: ParsedError[];
    elaboration: ParsedError[];
    other: ParsedError[];
  } {
    const categorized = {
      syntax: [] as ParsedError[],
      lint: [] as ParsedError[],
      elaboration: [] as ParsedError[],
      other: [] as ParsedError[],
    };

    for (const error of errors) {
      if (error.message.match(/syntax|parse|unexpected/i)) {
        categorized.syntax.push(error);
      } else if (error.message.match(/lint|style|unused|width/i)) {
        categorized.lint.push(error);
      } else if (error.message.match(/module|instance|parameter|port/i)) {
        categorized.elaboration.push(error);
      } else {
        categorized.other.push(error);
      }
    }

    return categorized;
  }
}