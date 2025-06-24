import { spawn } from 'child_process';
import { logger } from './logger.js';
import { CommandResult } from '../types/index.js';

export interface ExecutorOptions {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  maxBuffer?: number;
}

export class CommandExecutor {
  /**
   * Execute a command with options
   */
  static async execute(
    command: string,
    args: string[],
    options: ExecutorOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const {
      timeout = 300000, // 5 minutes default
      cwd = process.cwd(),
      env = process.env,
      input,
      maxBuffer = 10 * 1024 * 1024, // 10MB default
    } = options;

    return new Promise((resolve, reject) => {
      logger.debug(`Executing: ${command} ${args.join(' ')}`);

      const child = spawn(command, args, {
        cwd,
        env,
        shell: false,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set timeout
      const timer = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      // Collect stdout
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxBuffer) {
          killed = true;
          child.kill('SIGTERM');
          reject(new Error('stdout exceeded buffer limit'));
        }
      });

      // Collect stderr
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxBuffer) {
          killed = true;
          child.kill('SIGTERM');
          reject(new Error('stderr exceeded buffer limit'));
        }
      });

      // Send input if provided
      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      // Handle exit
      child.on('close', (code) => {
        clearTimeout(timer);
        
        if (killed) {
          return;
        }

        const duration = Date.now() - startTime;
        const result: CommandResult = {
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
        };

        logger.debug(`Command completed in ${duration}ms with exit code ${code}`);
        resolve(result);
      });
    });
  }

  /**
   * Execute command and return only stdout if successful
   */
  static async executeSimple(
    command: string,
    args: string[],
    options?: ExecutorOptions
  ): Promise<string> {
    const result = await this.execute(command, args, options);
    
    if (result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
    }

    return result.stdout;
  }

  /**
   * Execute Yosys script
   */
  static async executeScript(
    yosysPath: string,
    script: string,
    options?: ExecutorOptions
  ): Promise<CommandResult> {
    // Write script to stdin
    return this.execute(yosysPath, ['-q', '-'], {
      ...options,
      input: script,
    });
  }

  /**
   * Execute Yosys with script file
   */
  static async executeScriptFile(
    yosysPath: string,
    scriptPath: string,
    options?: ExecutorOptions
  ): Promise<CommandResult> {
    return this.execute(yosysPath, ['-q', '-s', scriptPath], options);
  }

  /**
   * Build Yosys script from commands
   */
  static buildScript(commands: string[]): string {
    return commands.join('\n') + '\n';
  }

  /**
   * Escape shell arguments
   */
  static escapeArg(arg: string): string {
    // Simple escaping for Yosys commands
    if (!/^[a-zA-Z0-9_\-./]+$/.test(arg)) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  }
}