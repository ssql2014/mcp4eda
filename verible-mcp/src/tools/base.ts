import { z } from 'zod';
import { CommandExecutor, CommandResult } from '../utils/executor.js';
import { ConfigManager, VeribleConfig } from '../utils/config.js';
import { CacheManager } from '../utils/cache.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';
import { ToolResult } from '../types/index.js';

export abstract class AbstractTool<TParams = any, TResult = any> {
  protected executor: CommandExecutor;
  protected toolName: string;
  protected binaryName: keyof VeribleConfig['toolPaths'];
  protected schema: z.ZodType<any>;

  constructor(
    toolName: string,
    binaryName: keyof VeribleConfig['toolPaths'],
    protected configManager: ConfigManager,
    protected cacheManager: CacheManager,
    schema: z.ZodType<any>
  ) {
    this.toolName = toolName;
    this.binaryName = binaryName;
    this.executor = new CommandExecutor();
    this.schema = schema;
  }

  /**
   * Execute the tool with parameters
   */
  async execute(params: unknown): Promise<ToolResult<TResult>> {
    const startTime = Date.now();

    try {
      // Validate parameters
      const validatedParams = this.schema.parse(params);

      // Check if tool is available
      const config = await this.configManager.getConfig();
      if (!config.isAvailable) {
        throw new Error('Verible is not installed or not found in PATH');
      }

      const toolPath = config.toolPaths[this.binaryName];
      const available = await this.configManager.isToolAvailable(this.binaryName);
      if (!available) {
        throw new Error(`Verible tool '${this.binaryName}' is not available`);
      }

      // Check cache if applicable
      const cacheKey = this.getCacheKey(validatedParams);
      if (cacheKey && this.shouldUseCache(validatedParams)) {
        const cached = await this.cacheManager.get<TResult>(
          cacheKey,
          this.getFilePath(validatedParams)
        );
        if (cached !== null) {
          logger.debug(`Cache hit for ${this.toolName}`);
          return {
            success: true,
            data: cached,
            cached: true,
            executionTime: Date.now() - startTime,
          };
        }
      }

      // Build command arguments
      const args = this.buildArguments(validatedParams);
      logger.info(`Executing ${this.toolName} with args:`, args);

      // Execute command
      const result = await this.executor.execute(toolPath, args, {
        timeout: this.getTimeout(validatedParams),
        cwd: this.getCwd(validatedParams),
      });

      // Process result
      const processedResult = await this.processResult(result, validatedParams);

      // Cache if applicable
      if (cacheKey && this.shouldUseCache(validatedParams) && processedResult.success) {
        await this.cacheManager.set(
          cacheKey,
          processedResult.data,
          this.getFilePath(validatedParams),
          this.getDependencies(validatedParams)
        );
      }

      // Extract warnings
      const warnings = ErrorHandler.extractWarnings(result.stderr);
      if (warnings.length > 0) {
        processedResult.warnings = warnings;
      }

      processedResult.executionTime = Date.now() - startTime;
      return processedResult;

    } catch (error) {
      logger.error(`Error in ${this.toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Build command line arguments from parameters
   */
  protected abstract buildArguments(params: TParams): string[];

  /**
   * Process the command result into structured data
   */
  protected abstract processResult(
    result: CommandResult,
    params: TParams
  ): Promise<ToolResult<TResult>>;

  /**
   * Get cache key for the operation
   */
  protected getCacheKey(params: TParams): string | null {
    // Default implementation - override if caching is desired
    return null;
  }

  /**
   * Whether to use cache for this operation
   */
  protected shouldUseCache(params: TParams): boolean {
    // Default implementation - override if needed
    return true;
  }

  /**
   * Get file path from parameters (for cache invalidation)
   */
  protected getFilePath(params: TParams): string | undefined {
    // Default implementation - override if needed
    return undefined;
  }

  /**
   * Get file dependencies (for cache invalidation)
   */
  protected getDependencies(params: TParams): string[] | undefined {
    // Default implementation - override if needed
    return undefined;
  }

  /**
   * Get timeout for the operation
   */
  protected getTimeout(params: TParams): number {
    // Default 30 seconds - override if needed
    return 30000;
  }

  /**
   * Get working directory for the command
   */
  protected getCwd(params: TParams): string | undefined {
    // Default to current directory - override if needed
    return undefined;
  }

  /**
   * Get tool description for MCP
   */
  abstract getDescription(): string;

  /**
   * Get input schema for MCP
   */
  getInputSchema(): any {
    // Convert Zod schema to JSON Schema
    // This is a simplified version - in production, use a proper converter
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }
}