import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export class KLayoutError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'KLayoutError';
  }
}

export class ValidationError extends KLayoutError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class ExecutionError extends KLayoutError {
  constructor(message: string) {
    super(message, 'EXECUTION_ERROR');
  }
}

export class FileNotFoundError extends KLayoutError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND');
  }
}

export class UnsupportedFormatError extends KLayoutError {
  constructor(format: string) {
    super(`Unsupported format: ${format}`, 'UNSUPPORTED_FORMAT');
  }
}

export function handleError(error: unknown): McpError {
  logger.error('Error occurred:', error);

  if (error instanceof ValidationError) {
    return new McpError(ErrorCode.InvalidParams, error.message);
  }

  if (error instanceof FileNotFoundError) {
    return new McpError(ErrorCode.InvalidParams, error.message);
  }

  if (error instanceof UnsupportedFormatError) {
    return new McpError(ErrorCode.InvalidParams, error.message);
  }

  if (error instanceof ExecutionError) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  if (error instanceof Error) {
    return new McpError(ErrorCode.InternalError, error.message);
  }

  return new McpError(ErrorCode.InternalError, 'An unknown error occurred');
}

export function wrapError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new ExecutionError(`${context}: ${message}`);
}