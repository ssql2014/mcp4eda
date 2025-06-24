import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';
import { YosysConfig } from '../types/index.js';

const execFileAsync = promisify(execFile);

export class ConfigManager {
  private config: YosysConfig = {};
  private initialized = false;
  private yosysPath?: string;
  private yosysVersion?: string;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load configuration from environment variables
    this.config = {
      binaryPath: process.env.YOSYS_PATH,
      defaultTarget: (process.env.YOSYS_DEFAULT_TARGET as any) || 'generic',
      techLibPath: process.env.YOSYS_TECH_LIB_PATH,
      optimizationLevel: parseInt(process.env.YOSYS_OPT_LEVEL || '2') as any,
      timeout: parseInt(process.env.YOSYS_TIMEOUT || '300000'), // 5 minutes default
      workDir: process.env.YOSYS_WORK_DIR || process.cwd(),
    };

    // Find Yosys binary
    this.yosysPath = await this.findYosys();
    if (this.yosysPath) {
      this.yosysVersion = await this.getYosysVersion();
      logger.debug(`Found Yosys ${this.yosysVersion} at ${this.yosysPath}`);
    }

    this.initialized = true;
  }

  /**
   * Find Yosys binary in PATH or specified location
   */
  private async findYosys(): Promise<string | undefined> {
    if (this.config.binaryPath) {
      try {
        await fs.access(this.config.binaryPath, fs.constants.X_OK);
        return this.config.binaryPath;
      } catch {
        logger.warn(`Specified Yosys path not accessible: ${this.config.binaryPath}`);
      }
    }

    // Try to find in PATH
    try {
      const { stdout } = await execFileAsync('which', ['yosys']);
      return stdout.trim();
    } catch {
      // Try common locations
      const commonPaths = [
        '/usr/local/bin/yosys',
        '/usr/bin/yosys',
        '/opt/yosys/bin/yosys',
        path.join(process.env.HOME || '', '.local/bin/yosys'),
      ];

      for (const p of commonPaths) {
        try {
          await fs.access(p, fs.constants.X_OK);
          return p;
        } catch {
          // Continue searching
        }
      }
    }

    logger.error('Yosys binary not found');
    return undefined;
  }

  /**
   * Get Yosys version
   */
  private async getYosysVersion(): Promise<string | undefined> {
    if (!this.yosysPath) {
      return undefined;
    }

    try {
      const { stdout } = await execFileAsync(this.yosysPath, ['-V']);
      const match = stdout.match(/Yosys ([\d.]+)/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      logger.error('Failed to get Yosys version:', error);
      return undefined;
    }
  }

  /**
   * Get Yosys binary path
   */
  getYosysPath(): string | undefined {
    return this.yosysPath;
  }

  /**
   * Get configuration value
   */
  get<K extends keyof YosysConfig>(key: K): YosysConfig[K] {
    return this.config[key];
  }

  /**
   * Set configuration value
   */
  set<K extends keyof YosysConfig>(key: K, value: YosysConfig[K]): void {
    this.config[key] = value;
  }

  /**
   * Get all configuration
   */
  getAll(): YosysConfig {
    return { ...this.config };
  }

  /**
   * Check if tool is available
   */
  async isToolAvailable(_toolName: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // For Yosys, we just check if the binary exists
    return !!this.yosysPath;
  }

  /**
   * Get technology library path for a specific target
   */
  getTechLibPath(target: string): string | undefined {
    if (this.config.techLibPath) {
      return path.join(this.config.techLibPath, `${target}.lib`);
    }

    // Common technology library locations
    const commonPaths = [
      `/usr/share/yosys/${target}.lib`,
      `/usr/local/share/yosys/${target}.lib`,
      path.join(process.env.HOME || '', `.yosys/${target}.lib`),
    ];

    // Note: This is synchronous check, could be made async if needed
    for (const p of commonPaths) {
      try {
        // Using sync version for now
        fsSync.accessSync(p, fsSync.constants.R_OK);
        return p;
      } catch {
        // Continue searching
      }
    }

    return undefined;
  }

  /**
   * Get work directory for temporary files
   */
  async getWorkDir(): Promise<string> {
    const workDir = this.config.workDir || process.cwd();
    const tempDir = path.join(workDir, '.yosys-mcp-temp');

    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create work directory:', error);
    }

    return tempDir;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    const tempDir = await this.getWorkDir();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.error('Failed to cleanup temp directory:', error);
    }
  }
}