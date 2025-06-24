import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigManager } from '../utils/config.js';
import { CacheManager } from '../utils/cache.js';
import { YosysRunner } from '../utils/yosys-runner.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';
import { ToolResult } from '../types/index.js';

export abstract class AbstractTool<TParams = any, TResult extends ToolResult = ToolResult> {
  protected runner: YosysRunner;

  constructor(
    protected name: string,
    protected toolType: string,
    protected configManager: ConfigManager,
    protected cacheManager: CacheManager,
    protected schema: z.ZodType<TParams>
  ) {
    this.runner = new YosysRunner(configManager);
  }

  /**
   * Get tool description
   */
  abstract getDescription(): string;

  /**
   * Execute the tool
   */
  async execute(params: unknown): Promise<TResult> {
    try {
      // Initialize config if needed
      if (!this.configManager.getYosysPath()) {
        await this.configManager.initialize();
      }

      // Validate parameters
      const validatedParams = this.schema.parse(params);

      // Check cache
      const cacheKey = this.cacheManager.generateKey(this.name, validatedParams);
      const cachedResult = this.cacheManager.get<TResult>(cacheKey);
      if (cachedResult) {
        logger.info(`Cache hit for ${this.name}`);
        return cachedResult;
      }

      // Execute tool
      const startTime = Date.now();
      const result = await this.executeInternal(validatedParams);
      const executionTime = Date.now() - startTime;

      // Add metadata
      result.metadata = {
        ...result.metadata,
        executionTime,
      };

      // Cache successful results
      if (result.success) {
        this.cacheManager.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      logger.error(`Error in ${this.name}:`, error);
      throw ErrorHandler.handle(error, this.name);
    }
  }

  /**
   * Internal execution logic to be implemented by subclasses
   */
  protected abstract executeInternal(params: TParams): Promise<TResult>;

  /**
   * Get input schema for the tool
   */
  getInputSchema(): any {
    const jsonSchema = zodToJsonSchema(this.schema);
    // Remove the $schema property as it's not needed for MCP
    const { $schema, ...schema } = jsonSchema as any;
    return schema;
  }

  /**
   * Check if file exists and is readable
   */
  protected async validateFile(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not accessible: ${filePath}`);
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.v', '.sv', '.vh', '.svh', '.verilog', '.systemverilog', '.ys'];
    if (!validExtensions.includes(ext)) {
      throw new Error(`Invalid file type: ${ext}. Expected Verilog/SystemVerilog file.`);
    }
  }

  /**
   * Resolve relative paths to absolute
   */
  protected resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(process.cwd(), filePath);
  }

  /**
   * Create base result object
   */
  protected createBaseResult(success: boolean, error?: string): TResult {
    return {
      success,
      error,
      metadata: {
        tool: this.name,
        timestamp: new Date().toISOString(),
      },
    } as unknown as TResult;
  }

  /**
   * Read file content with size limit
   */
  protected async readFile(filePath: string, maxSize = 10 * 1024 * 1024): Promise<string> {
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`);
    }
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write output file
   */
  protected async writeOutput(filePath: string, content: string | Buffer): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
  }

  /**
   * Generate output filename
   */
  protected generateOutputPath(
    inputPath: string,
    suffix: string,
    extension: string
  ): string {
    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${base}${suffix}.${extension}`);
  }

  /**
   * Extract base name from file path
   */
  protected getBaseName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }
}