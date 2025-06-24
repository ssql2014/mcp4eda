import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { logger } from './logger.js';

export interface VerilatorConfig {
  isAvailable: boolean;
  version?: string;
  toolPaths: {
    verilator: string;
    verilator_coverage: string;
    verilator_gantt: string;
    verilator_profcfunc: string;
  };
  features: {
    systemc: boolean;
    coverage: boolean;
    trace: boolean;
    threads: boolean;
  };
  defaultOptions: {
    optimizationLevel: number;
    warnings: string[];
    language: 'verilog' | 'systemverilog';
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: VerilatorConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = join(homedir(), '.verilator-mcp', 'config.json');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async getConfig(): Promise<VerilatorConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      return this.config!;
    } catch (error) {
      logger.info('Config file not found, detecting Verilator installation...');
      this.config = await this.detectVerilator();
      await this.saveConfig();
      return this.config;
    }
  }

  private async detectVerilator(): Promise<VerilatorConfig> {
    const config: VerilatorConfig = {
      isAvailable: false,
      toolPaths: {
        verilator: '',
        verilator_coverage: '',
        verilator_gantt: '',
        verilator_profcfunc: '',
      },
      features: {
        systemc: false,
        coverage: false,
        trace: false,
        threads: false,
      },
      defaultOptions: {
        optimizationLevel: 2,
        warnings: ['lint'],
        language: 'systemverilog',
      },
    };

    try {
      // Find Verilator in PATH
      const verilatorPath = execSync('which verilator', { encoding: 'utf-8' }).trim();
      if (!verilatorPath) {
        throw new Error('Verilator not found in PATH');
      }

      config.toolPaths.verilator = verilatorPath;
      config.isAvailable = true;

      // Get version
      const versionOutput = execSync('verilator --version', { encoding: 'utf-8' });
      const versionMatch = versionOutput.match(/Verilator\s+([\d.]+)/);
      if (versionMatch) {
        config.version = versionMatch[1];
      }

      // Find other tools
      const toolDir = join(verilatorPath, '..');
      try {
        config.toolPaths.verilator_coverage = execSync('which verilator_coverage', { encoding: 'utf-8' }).trim();
      } catch {
        config.toolPaths.verilator_coverage = join(toolDir, 'verilator_coverage');
      }

      try {
        config.toolPaths.verilator_gantt = execSync('which verilator_gantt', { encoding: 'utf-8' }).trim();
      } catch {
        config.toolPaths.verilator_gantt = join(toolDir, 'verilator_gantt');
      }

      try {
        config.toolPaths.verilator_profcfunc = execSync('which verilator_profcfunc', { encoding: 'utf-8' }).trim();
      } catch {
        config.toolPaths.verilator_profcfunc = join(toolDir, 'verilator_profcfunc');
      }

      // Detect features
      const helpOutput = execSync('verilator --help', { encoding: 'utf-8' });
      config.features.systemc = helpOutput.includes('--sc');
      config.features.coverage = helpOutput.includes('--coverage');
      config.features.trace = helpOutput.includes('--trace');
      config.features.threads = helpOutput.includes('--threads');

      logger.info(`Detected Verilator ${config.version} at ${verilatorPath}`);
    } catch (error) {
      logger.error('Failed to detect Verilator:', error);
      config.isAvailable = false;
    }

    return config;
  }

  private async saveConfig(): Promise<void> {
    try {
      const configDir = join(homedir(), '.verilator-mcp');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      logger.error('Failed to save configuration:', error);
    }
  }

  async isToolAvailable(tool: keyof VerilatorConfig['toolPaths']): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.isAvailable) return false;

    const toolPath = config.toolPaths[tool];
    if (!toolPath) return false;

    try {
      await fs.access(toolPath);
      return true;
    } catch {
      return false;
    }
  }

  async updateConfig(updates: Partial<VerilatorConfig>): Promise<void> {
    const config = await this.getConfig();
    this.config = { ...config, ...updates };
    await this.saveConfig();
  }

  async resetConfig(): Promise<void> {
    this.config = null;
    try {
      await fs.unlink(this.configPath);
    } catch {
      // Config file might not exist
    }
    await this.getConfig(); // Re-detect
  }
}