import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CommandExecutor } from './executor.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VeribleToolPaths {
  lint: string;
  format: string;
  syntax: string;
  diff: string;
  project: string;
  obfuscate: string;
  preprocessor: string;
  kytheExtractor: string;
  ls: string;
  patchTool: string;
}

export interface VeribleConfig {
  toolPaths: VeribleToolPaths;
  version: string;
  isAvailable: boolean;
  searchPaths: string[];
}

export class ConfigManager {
  private config: VeribleConfig | null = null;
  private executor: CommandExecutor;
  private initPromise: Promise<void> | null = null;

  // Default search paths for Verible binaries
  private defaultSearchPaths = [
    // Project-specific installation
    path.join(__dirname, '../../../verible-v0.0-4007-g98bdb38a-macOS/bin'),
    // User installations
    '/Users/qlss/.local/bin',
    '/usr/local/bin',
    '/opt/homebrew/bin',
    // System installations
    '/usr/bin',
  ];

  constructor() {
    this.executor = new CommandExecutor();
  }

  /**
   * Initialize configuration asynchronously
   */
  async initialize(): Promise<void> {
    if (this.config?.isAvailable) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.detectVerible();
    await this.initPromise;
  }

  /**
   * Get the configuration (initialize if needed)
   */
  async getConfig(): Promise<VeribleConfig> {
    await this.initialize();
    if (!this.config) {
      throw new Error('Failed to initialize Verible configuration');
    }
    return this.config;
  }

  /**
   * Detect Verible installation and configure paths
   */
  private async detectVerible(): Promise<void> {
    logger.info('Detecting Verible installation...');

    // Initialize with defaults
    this.config = {
      toolPaths: {
        lint: 'verible-verilog-lint',
        format: 'verible-verilog-format',
        syntax: 'verible-verilog-syntax',
        diff: 'verible-verilog-diff',
        project: 'verible-verilog-project',
        obfuscate: 'verible-verilog-obfuscate',
        preprocessor: 'verible-verilog-preprocessor',
        kytheExtractor: 'verible-verilog-kythe-extractor',
        ls: 'verible-verilog-ls',
        patchTool: 'verible-patch-tool',
      },
      version: 'unknown',
      isAvailable: false,
      searchPaths: this.defaultSearchPaths,
    };

    // Find the base Verible binary (use syntax as the reference)
    const syntaxPath = await this.executor.findCommand(
      'verible-verilog-syntax',
      this.defaultSearchPaths.map(p => path.join(p, 'verible-verilog-syntax'))
    );

    if (!syntaxPath) {
      logger.warn('Verible not found in any search paths');
      logger.warn('Please install Verible for full functionality');
      return;
    }

    // Get the base directory
    const baseDir = path.dirname(syntaxPath);
    logger.info(`Found Verible installation at: ${baseDir}`);

    // Update all tool paths
    this.config.toolPaths = {
      lint: path.join(baseDir, 'verible-verilog-lint'),
      format: path.join(baseDir, 'verible-verilog-format'),
      syntax: path.join(baseDir, 'verible-verilog-syntax'),
      diff: path.join(baseDir, 'verible-verilog-diff'),
      project: path.join(baseDir, 'verible-verilog-project'),
      obfuscate: path.join(baseDir, 'verible-verilog-obfuscate'),
      preprocessor: path.join(baseDir, 'verible-verilog-preprocessor'),
      kytheExtractor: path.join(baseDir, 'verible-verilog-kythe-extractor'),
      ls: path.join(baseDir, 'verible-verilog-ls'),
      patchTool: path.join(baseDir, 'verible-patch-tool'),
    };

    // Get version
    try {
      const { stdout } = await this.executor.execute(syntaxPath, ['--version']);
      const versionMatch = stdout.match(/v[\d.]+-[\d]+-g[a-f0-9]+/);
      if (versionMatch) {
        this.config.version = versionMatch[0];
      }
    } catch (error) {
      logger.warn('Failed to get Verible version:', error);
    }

    this.config.isAvailable = true;
    logger.info(`Verible ${this.config.version} configured successfully`);
  }

  /**
   * Check if a specific tool is available
   */
  async isToolAvailable(toolName: keyof VeribleToolPaths): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.isAvailable) {
      return false;
    }

    const toolPath = config.toolPaths[toolName];
    try {
      await fs.access(toolPath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<string[]> {
    const config = await this.getConfig();
    if (!config.isAvailable) {
      return [];
    }

    const availableTools: string[] = [];
    for (const [toolName, toolPath] of Object.entries(config.toolPaths)) {
      try {
        await fs.access(toolPath, fs.constants.X_OK);
        availableTools.push(toolName);
      } catch {
        // Tool not available
      }
    }

    return availableTools;
  }

  /**
   * Load user configuration if exists
   */
  async loadUserConfig(configPath?: string): Promise<void> {
    const paths = configPath ? [configPath] : [
      path.join(process.cwd(), '.verible-mcp.json'),
      path.join(process.env.HOME || '', '.verible-mcp.json'),
    ];

    for (const p of paths) {
      try {
        const content = await fs.readFile(p, 'utf-8');
        const userConfig = JSON.parse(content);
        
        // Merge with existing config
        if (userConfig.searchPaths) {
          this.defaultSearchPaths.unshift(...userConfig.searchPaths);
        }
        
        logger.info(`Loaded user configuration from: ${p}`);
        return;
      } catch {
        // Continue to next path
      }
    }
  }
}