import { KLayoutConfig } from '../types/index.js';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

export class ConfigManager {
  private config: KLayoutConfig;
  private klayoutAvailable: boolean = false;

  constructor() {
    this.config = {
      executable: process.env.KLAYOUT_PATH || 'klayout',
      pythonPath: process.env.KLAYOUT_PYTHON_PATH,
      maxFileSize: parseInt(process.env.KLAYOUT_MAX_FILE_SIZE || '1073741824'), // 1GB
      supportedFormats: ['gds', 'gds2', 'oasis', 'oas', 'dxf', 'cif', 'mag', 'def', 'lef'],
      cacheEnabled: process.env.KLAYOUT_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.KLAYOUT_CACHE_TTL || '3600'),
    };
  }

  async initialize(): Promise<void> {
    await this.checkKLayoutAvailability();
  }

  private async checkKLayoutAvailability(): Promise<void> {
    try {
      const { stdout } = await execAsync(`${this.config.executable} -v`);
      this.klayoutAvailable = true;
      logger.info(`KLayout found: ${stdout.trim()}`);
    } catch (error) {
      this.klayoutAvailable = false;
      logger.error('KLayout not found. Please install KLayout and ensure it is in PATH.');
      logger.error('You can also set KLAYOUT_PATH environment variable to point to the KLayout executable.');
    }
  }

  isKLayoutAvailable(): boolean {
    return this.klayoutAvailable;
  }

  getConfig(): KLayoutConfig {
    return this.config;
  }

  isSupportedFormat(format: string): boolean {
    return this.config.supportedFormats.includes(format.toLowerCase());
  }

  getExecutable(): string {
    return this.config.executable;
  }

  getPythonPath(): string | undefined {
    return this.config.pythonPath;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  isCacheEnabled(): boolean {
    return this.config.cacheEnabled;
  }

  getCacheTTL(): number {
    return this.config.cacheTTL;
  }
}