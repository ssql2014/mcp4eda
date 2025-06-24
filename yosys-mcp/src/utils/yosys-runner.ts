import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigManager } from './config.js';
import { CommandExecutor, ExecutorOptions } from './executor.js';
import { ErrorHandler } from './error-handler.js';
import { logger } from './logger.js';
import { CommandResult } from '../types/index.js';

export interface YosysCommand {
  command: string;
  expectOutput?: boolean;
}

export class YosysRunner {
  constructor(
    private configManager: ConfigManager
  ) {}

  /**
   * Execute a single Yosys command
   */
  async runCommand(
    command: string,
    options?: ExecutorOptions
  ): Promise<CommandResult> {
    const yosysPath = this.configManager.getYosysPath();
    if (!yosysPath) {
      throw new Error('Yosys binary not found');
    }

    const result = await CommandExecutor.execute(
      yosysPath,
      ['-q', '-p', command],
      {
        timeout: this.configManager.get('timeout'),
        ...options,
      }
    );

    // Check for errors
    const error = ErrorHandler.parseYosysError(result.stderr, result.exitCode);
    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Execute multiple Yosys commands as a script
   */
  async runScript(
    commands: string[],
    options?: ExecutorOptions
  ): Promise<CommandResult> {
    const yosysPath = this.configManager.getYosysPath();
    if (!yosysPath) {
      throw new Error('Yosys binary not found');
    }

    const script = CommandExecutor.buildScript(commands);
    logger.debug('Executing Yosys script:', { script });

    const result = await CommandExecutor.executeScript(
      yosysPath,
      script,
      {
        timeout: this.configManager.get('timeout'),
        ...options,
      }
    );

    // Check for errors
    const error = ErrorHandler.parseYosysError(result.stderr, result.exitCode);
    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Execute Yosys with a script file
   */
  async runScriptFile(
    scriptPath: string,
    options?: ExecutorOptions
  ): Promise<CommandResult> {
    const yosysPath = this.configManager.getYosysPath();
    if (!yosysPath) {
      throw new Error('Yosys binary not found');
    }

    const result = await CommandExecutor.executeScriptFile(
      yosysPath,
      scriptPath,
      {
        timeout: this.configManager.get('timeout'),
        ...options,
      }
    );

    // Check for errors
    const error = ErrorHandler.parseYosysError(result.stderr, result.exitCode);
    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Build synthesis script for a target
   */
  buildSynthesisScript(
    inputFile: string,
    target: string = 'generic',
    options: {
      topModule?: string;
      outputFile?: string;
      optimizationLevel?: number;
      defines?: Record<string, string>;
      includeDirs?: string[];
    } = {}
  ): string[] {
    const commands: string[] = [];
    const {
      topModule,
      outputFile,
      optimizationLevel = this.configManager.get('optimizationLevel') || 2,
      defines = {},
      includeDirs = [],
    } = options;

    // Read input file with defines and include directories
    let readCmd = `read_verilog`;
    
    // Add defines
    for (const [name, value] of Object.entries(defines)) {
      readCmd += ` -D${name}=${value}`;
    }
    
    // Add include directories
    for (const dir of includeDirs) {
      readCmd += ` -I${CommandExecutor.escapeArg(dir)}`;
    }
    
    readCmd += ` ${CommandExecutor.escapeArg(inputFile)}`;
    commands.push(readCmd);

    // Set top module if specified
    if (topModule) {
      commands.push(`hierarchy -check -top ${topModule}`);
    } else {
      commands.push('hierarchy -check -auto-top');
    }

    // Run synthesis based on target
    switch (target) {
      case 'xilinx':
        commands.push(`synth_xilinx -run :fine`);
        if (optimizationLevel >= 2) {
          commands.push('opt -full');
        }
        break;
        
      case 'altera':
      case 'intel':
        commands.push(`synth_intel -run :fine`);
        if (optimizationLevel >= 2) {
          commands.push('opt -full');
        }
        break;
        
      case 'ice40':
        commands.push(`synth_ice40 -run :fine`);
        if (optimizationLevel >= 2) {
          commands.push('opt -full');
        }
        break;
        
      case 'ecp5':
        commands.push(`synth_ecp5 -run :fine`);
        if (optimizationLevel >= 2) {
          commands.push('opt -full');
        }
        break;
        
      case 'generic':
      default:
        // Generic synthesis flow
        commands.push('proc');
        commands.push('flatten');
        commands.push('opt_expr');
        commands.push('opt_clean');
        
        if (optimizationLevel >= 1) {
          commands.push('opt');
        }
        
        commands.push('techmap');
        
        if (optimizationLevel >= 2) {
          commands.push('opt -fast');
        }
        
        if (optimizationLevel >= 3) {
          commands.push('opt -full');
        }
        
        commands.push('clean');
        break;
    }

    // Write output if specified
    if (outputFile) {
      const ext = path.extname(outputFile).toLowerCase();
      switch (ext) {
        case '.v':
          commands.push(`write_verilog ${CommandExecutor.escapeArg(outputFile)}`);
          break;
        case '.json':
          commands.push(`write_json ${CommandExecutor.escapeArg(outputFile)}`);
          break;
        case '.blif':
          commands.push(`write_blif ${CommandExecutor.escapeArg(outputFile)}`);
          break;
        case '.edif':
          commands.push(`write_edif ${CommandExecutor.escapeArg(outputFile)}`);
          break;
        default:
          commands.push(`write_verilog ${CommandExecutor.escapeArg(outputFile)}`);
      }
    }

    return commands;
  }

  /**
   * Generate statistics commands
   */
  buildStatsScript(inputFile: string, options: {
    topModule?: string;
    detailed?: boolean;
  } = {}): string[] {
    const commands: string[] = [];
    const { topModule, detailed = false } = options;

    // Read file
    commands.push(`read_verilog ${CommandExecutor.escapeArg(inputFile)}`);

    // Set hierarchy
    if (topModule) {
      commands.push(`hierarchy -check -top ${topModule}`);
    } else {
      commands.push('hierarchy -check -auto-top');
    }

    // Basic processing
    commands.push('proc');

    // Get statistics
    if (detailed) {
      commands.push('stat -width -liberty');
    } else {
      commands.push('stat');
    }

    return commands;
  }

  /**
   * Generate visualization commands
   */
  buildShowScript(
    inputFile: string,
    outputFile: string,
    options: {
      topModule?: string;
      moduleName?: string;
      format?: 'dot' | 'svg' | 'pdf' | 'png';
      simplify?: boolean;
    } = {}
  ): string[] {
    const commands: string[] = [];
    const {
      topModule,
      moduleName,
      format = 'dot',
      simplify = true,
    } = options;

    // Read file
    commands.push(`read_verilog ${CommandExecutor.escapeArg(inputFile)}`);

    // Set hierarchy
    if (topModule) {
      commands.push(`hierarchy -check -top ${topModule}`);
    } else {
      commands.push('hierarchy -check -auto-top');
    }

    // Basic processing
    commands.push('proc');
    
    if (simplify) {
      commands.push('opt_clean');
    }

    // Generate visualization
    const showCmd = moduleName 
      ? `show -format ${format} -prefix ${CommandExecutor.escapeArg(outputFile.replace(/\.[^.]+$/, ''))} ${moduleName}`
      : `show -format ${format} -prefix ${CommandExecutor.escapeArg(outputFile.replace(/\.[^.]+$/, ''))}`;
    
    commands.push(showCmd);

    return commands;
  }

  /**
   * Create a temporary working directory
   */
  async createTempDir(): Promise<string> {
    const workDir = await this.configManager.getWorkDir();
    const tempDir = path.join(workDir, `yosys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary directory
   */
  async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
    }
  }
}