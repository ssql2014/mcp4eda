import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export class YosysError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'YosysError';
  }
}

export class ErrorHandler {
  /**
   * Convert internal errors to MCP errors
   */
  static toMcpError(error: unknown): McpError {
    if (error instanceof McpError) {
      return error;
    }

    if (error instanceof YosysError) {
      return new McpError(
        ErrorCode.InternalError,
        error.message,
        error.details
      );
    }

    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('not found')) {
        return new McpError(
          ErrorCode.InvalidRequest,
          'Yosys binary not found. Please ensure Yosys is installed and in PATH.',
          { originalError: error.message }
        );
      }

      if (error.message.includes('timeout')) {
        return new McpError(
          ErrorCode.InternalError,
          'Yosys operation timed out',
          { originalError: error.message }
        );
      }

      if (error.message.includes('permission')) {
        return new McpError(
          ErrorCode.InvalidRequest,
          'Permission denied accessing file or executing Yosys',
          { originalError: error.message }
        );
      }

      return new McpError(
        ErrorCode.InternalError,
        error.message,
        { stack: error.stack }
      );
    }

    return new McpError(
      ErrorCode.InternalError,
      'An unknown error occurred',
      { error: String(error) }
    );
  }

  /**
   * Handle and log errors
   */
  static handle(error: unknown, context?: string): McpError {
    const mcpError = this.toMcpError(error);
    
    logger.error(`Error in ${context || 'unknown context'}:`, {
      message: mcpError.message,
      code: mcpError.code,
      data: mcpError.data,
    });

    return mcpError;
  }

  /**
   * Parse Yosys error output
   */
  static parseYosysError(stderr: string, exitCode: number): YosysError | null {
    if (exitCode === 0 && !stderr.includes('ERROR')) {
      return null;
    }

    // Common Yosys error patterns
    const patterns = [
      {
        regex: /ERROR: (.+?) in (.+?) \((.+?)\)/,
        handler: (match: RegExpMatchArray) => new YosysError(
          match[1],
          'YOSYS_SYNTAX_ERROR',
          { file: match[2], details: match[3] }
        ),
      },
      {
        regex: /ERROR: Can't open file `(.+?)' for reading/,
        handler: (match: RegExpMatchArray) => new YosysError(
          `Cannot open file: ${match[1]}`,
          'FILE_NOT_FOUND',
          { file: match[1] }
        ),
      },
      {
        regex: /ERROR: Module `(.+?)' not found/,
        handler: (match: RegExpMatchArray) => new YosysError(
          `Module not found: ${match[1]}`,
          'MODULE_NOT_FOUND',
          { module: match[1] }
        ),
      },
      {
        regex: /ERROR: Technology library '(.+?)' not found/,
        handler: (match: RegExpMatchArray) => new YosysError(
          `Technology library not found: ${match[1]}`,
          'TECH_LIB_NOT_FOUND',
          { library: match[1] }
        ),
      },
    ];

    for (const { regex, handler } of patterns) {
      const match = stderr.match(regex);
      if (match) {
        return handler(match);
      }
    }

    // Generic error
    if (stderr.includes('ERROR:')) {
      const errorLine = stderr.split('\n').find(line => line.includes('ERROR:'));
      return new YosysError(
        errorLine || 'Yosys encountered an error',
        'YOSYS_ERROR',
        { stderr, exitCode }
      );
    }

    if (exitCode !== 0) {
      return new YosysError(
        `Yosys exited with code ${exitCode}`,
        'YOSYS_EXIT_ERROR',
        { stderr, exitCode }
      );
    }

    return null;
  }

  /**
   * Extract warnings from Yosys output
   */
  static extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Warning:') || line.includes('WARNING:')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }
}