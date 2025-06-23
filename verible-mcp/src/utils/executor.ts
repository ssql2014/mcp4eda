import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

export interface CommandOptions {
  timeout?: number;
  maxBuffer?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stream?: boolean;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class CommandExecutor {
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultMaxBuffer: number = 10 * 1024 * 1024; // 10MB

  /**
   * Execute a command and return the result
   */
  async execute(command: string, args: string[] = [], options: CommandOptions = {}): Promise<CommandResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.defaultTimeout;
    const maxBuffer = options.maxBuffer || this.defaultMaxBuffer;

    logger.debug(`Executing command: ${command} ${args.join(' ')}`);

    try {
      if (options.stream) {
        return await this.executeStreaming(command, args, options);
      }

      // Join command and args for exec
      const fullCommand = `${command} ${args.map(arg => this.escapeArg(arg)).join(' ')}`;
      
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout,
        maxBuffer,
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
      });

      const duration = Date.now() - startTime;
      logger.debug(`Command completed in ${duration}ms`);

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Handle timeout specifically
      if (error.code === 'ETIMEDOUT') {
        logger.error(`Command timed out after ${timeout}ms: ${command}`);
        throw new Error(`Command timed out after ${timeout}ms`);
      }

      // For exec errors, we might still have stdout/stderr
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        duration,
      };
    }
  }

  /**
   * Execute a command with streaming output
   */
  private async executeStreaming(
    command: string,
    args: string[],
    options: CommandOptions
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = options.timeout || this.defaultTimeout;
      
      const proc = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        shell: false,
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set up timeout
      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (killed) return;

        const duration = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          duration,
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        if (killed) return;
        
        reject(error);
      });
    });
  }

  /**
   * Check if a command exists in PATH
   */
  async commandExists(command: string): Promise<boolean> {
    try {
      const { exitCode } = await this.execute('which', [command]);
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Find command in common locations
   */
  async findCommand(command: string, searchPaths: string[]): Promise<string | null> {
    // First check if command is available in PATH
    if (await this.commandExists(command)) {
      const { stdout } = await this.execute('which', [command]);
      return stdout.trim();
    }

    // Check specific paths
    for (const searchPath of searchPaths) {
      try {
        const { exitCode } = await this.execute('test', ['-x', searchPath]);
        if (exitCode === 0) {
          logger.info(`Found ${command} at: ${searchPath}`);
          return searchPath;
        }
      } catch {
        // Continue searching
      }
    }

    return null;
  }

  /**
   * Escape shell arguments
   */
  private escapeArg(arg: string): string {
    if (!/[^A-Za-z0-9_\-.:=\/]/.test(arg)) {
      return arg;
    }
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  }
}