import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export interface VeribleError {
  code: string;
  message: string;
  details?: any;
  suggestion?: string;
}

export class ErrorHandler {
  /**
   * Convert Verible tool errors to MCP errors
   */
  static toMcpError(error: any, toolName: string): McpError {
    logger.error(`Error in ${toolName}:`, error);

    // Handle specific error types
    if (error instanceof McpError) {
      return error;
    }

    if (error.code === 'ENOENT') {
      return new McpError(
        ErrorCode.MethodNotFound,
        `Verible tool '${toolName}' not found. Please ensure Verible is installed.`
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return new McpError(
        ErrorCode.RequestTimeout,
        `Operation timed out while running ${toolName}`
      );
    }

    if (error.code === 'EACCES') {
      return new McpError(
        ErrorCode.InvalidRequest,
        `Permission denied accessing ${toolName}`
      );
    }

    // Parse Verible-specific errors from stderr
    const veribleError = this.parseVeribleError(error.stderr || error.message, toolName);
    if (veribleError) {
      return new McpError(
        ErrorCode.InvalidRequest,
        veribleError.message,
        veribleError.details
      );
    }

    // Default error
    return new McpError(
      ErrorCode.InternalError,
      error.message || `Unknown error in ${toolName}`,
      { originalError: error.toString() }
    );
  }

  /**
   * Parse Verible-specific error messages
   */
  private static parseVeribleError(stderr: string, toolName: string): VeribleError | null {
    if (!stderr) return null;

    // Common Verible error patterns
    const patterns = [
      {
        regex: /Error: (.+) at (.+):(\d+):(\d+)/,
        handler: (match: RegExpMatchArray) => ({
          code: 'SYNTAX_ERROR',
          message: match[1],
          details: {
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
          },
        }),
      },
      {
        regex: /Unknown flag: (.+)/,
        handler: (match: RegExpMatchArray) => ({
          code: 'INVALID_FLAG',
          message: `Unknown flag: ${match[1]}`,
          suggestion: `Check available flags with '${toolName} --help'`,
        }),
      },
      {
        regex: /File not found: (.+)/,
        handler: (match: RegExpMatchArray) => ({
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${match[1]}`,
        }),
      },
      {
        regex: /Invalid argument: (.+)/,
        handler: (match: RegExpMatchArray) => ({
          code: 'INVALID_ARGUMENT',
          message: `Invalid argument: ${match[1]}`,
        }),
      },
    ];

    for (const { regex, handler } of patterns) {
      const match = stderr.match(regex);
      if (match) {
        return handler(match);
      }
    }

    // Generic parse error
    if (stderr.includes('Parse error') || stderr.includes('Syntax error')) {
      return {
        code: 'PARSE_ERROR',
        message: 'Failed to parse input file',
        details: { stderr },
      };
    }

    return null;
  }

  /**
   * Create a user-friendly error response
   */
  static createErrorResponse(error: McpError): any {
    const response = {
      error: true,
      message: error.message,
      code: error.code,
    };

    if (error.data) {
      Object.assign(response, error.data);
    }

    return response;
  }

  /**
   * Handle and log errors consistently
   */
  static async handleError<T>(
    operation: () => Promise<T>,
    toolName: string,
    fallback?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const mcpError = this.toMcpError(error, toolName);
      
      if (fallback !== undefined) {
        logger.warn(`Error in ${toolName}, using fallback:`, mcpError.message);
        return fallback;
      }
      
      throw mcpError;
    }
  }

  /**
   * Extract useful information from Verible output
   */
  static extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Warning:') || line.includes('warning:')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}