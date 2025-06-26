import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from '../utils/config.js';
import { CacheManager } from '../utils/cache.js';
import { Executor } from '../utils/executor.js';
import { logger, logToolCall, logToolResult } from '../utils/logger.js';
import { ValidationError } from '../utils/error-handler.js';

export abstract class AbstractTool {
  protected config: ConfigManager;
  protected cache: CacheManager;
  protected executor: Executor;

  constructor(config: ConfigManager, cache: CacheManager) {
    this.config = config;
    this.cache = cache;
    this.executor = new Executor(config.getExecutable());
  }

  abstract getName(): string;
  abstract getDescription(): string;
  abstract getInputSchema(): z.ZodObject<any>;
  abstract execute(args: any): Promise<any>;

  getTool(): Tool {
    return {
      name: this.getName(),
      description: this.getDescription(),
      inputSchema: {
        type: 'object',
        properties: this.getInputSchema().shape,
      },
    };
  }

  async run(args: any): Promise<any> {
    const startTime = Date.now();
    const toolName = this.getName();
    
    try {
      logToolCall(toolName, args);
      
      // Validate input
      const validatedArgs = this.validateInput(args);
      
      // Check if KLayout is available
      if (!this.config.isKLayoutAvailable()) {
        throw new ValidationError('KLayout is not available. Please install KLayout and ensure it is in PATH.');
      }
      
      // Execute tool logic
      const result = await this.execute(validatedArgs);
      
      const duration = Date.now() - startTime;
      logToolResult(toolName, true, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logToolResult(toolName, false, duration);
      throw error;
    }
  }

  protected validateInput(args: any): any {
    try {
      return this.getInputSchema().parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ValidationError(`Invalid input: ${errors}`);
      }
      throw error;
    }
  }

  protected async getCachedResult<T>(cacheKey: string, compute: () => Promise<T>): Promise<T> {
    if (!this.cache.isEnabled()) {
      return compute();
    }

    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== undefined) {
      logger.debug(`Using cached result for key: ${cacheKey}`);
      return cached;
    }

    const result = await compute();
    await this.cache.set(cacheKey, result);
    return result;
  }

  protected formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  protected sanitizePath(path: string): string {
    // Remove any potentially dangerous characters
    return path.replace(/[<>"|?*]/g, '');
  }
}