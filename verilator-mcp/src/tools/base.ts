import { z } from 'zod';
import { CommandExecutor, CommandResult } from '../utils/executor.js';
import { ConfigManager, VerilatorConfig } from '../utils/config.js';
import { CacheManager } from '../utils/cache.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';
import { ToolResult } from '../types/index.js';

export abstract class AbstractTool<TParams = any, TResult = any> {
  protected executor: CommandExecutor;
  protected toolName: string;
  protected binaryName: keyof VerilatorConfig['toolPaths'];
  protected schema: z.ZodType<any>;

  constructor(
    toolName: string,
    binaryName: keyof VerilatorConfig['toolPaths'],
    protected configManager: ConfigManager,
    protected cacheManager: CacheManager,
    schema: z.ZodType<any>
  ) {
    this.toolName = toolName;
    this.binaryName = binaryName;
    this.executor = new CommandExecutor();
    this.schema = schema;
  }

  async execute(params: unknown): Promise<ToolResult<TResult>> {
    const startTime = Date.now();

    try {
      // Validate parameters
      const validatedParams = this.schema.parse(params);

      // Check if tool is available
      const config = await this.configManager.getConfig();
      if (!config.isAvailable) {
        throw new Error('Verilator is not installed or not found in PATH');
      }

      const toolPath = config.toolPaths[this.binaryName];
      const available = await this.configManager.isToolAvailable(this.binaryName);
      if (!available) {
        throw new Error(`Verilator tool '${this.binaryName}' is not available`);
      }

      // Cache disabled temporarily to fix execution issues

      // Build command arguments
      const args = await this.buildArguments(validatedParams);
      logger.info(`Executing ${this.toolName} with args:`, args);

      // Execute command
      logger.debug(`Executing command: ${toolPath} ${args.join(' ')}`);
      const result = await this.executor.execute(toolPath, args, {
        timeout: this.getTimeout(validatedParams),
        cwd: this.getCwd(validatedParams),
      });

      if (!result) {
        throw new Error(`Command execution returned null/undefined result`);
      }

      logger.debug(`Command result: exitCode=${result.exitCode}, stdout=${result.stdout.length} chars, stderr=${result.stderr.length} chars`);

      // Process result
      const processedResult = await this.processResult(result, validatedParams);

      // Cache disabled temporarily

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

  protected abstract buildArguments(params: TParams): Promise<string[]> | string[];

  protected abstract processResult(
    result: CommandResult,
    params: TParams
  ): Promise<ToolResult<TResult>>;

  protected getCacheKey(params: TParams): string | null {
    return null;
  }

  protected shouldUseCache(params: TParams): boolean {
    return true;
  }

  protected getFilePath(params: TParams): string | undefined {
    return undefined;
  }

  protected getDependencies(params: TParams): string[] | undefined {
    return undefined;
  }

  protected getTimeout(params: TParams): number {
    return 300000; // 5 minutes default
  }

  protected getCwd(params: TParams): string | undefined {
    return undefined;
  }

  abstract getDescription(): string;

  getInputSchema(): any {
    // Convert Zod schema to JSON Schema
    // This is a simplified version - in production, use a proper converter
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  protected async checkVerilatorVersion(requiredVersion?: string): Promise<boolean> {
    if (!requiredVersion) return true;

    const config = await this.configManager.getConfig();
    if (!config.version) return false;

    const current = config.version.split('.').map(Number);
    const required = requiredVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(current.length, required.length); i++) {
      const c = current[i] || 0;
      const r = required[i] || 0;
      if (c > r) return true;
      if (c < r) return false;
    }

    return true;
  }
}