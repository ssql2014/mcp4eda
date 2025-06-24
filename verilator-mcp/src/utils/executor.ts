import { spawn } from 'child_process';
import { logger } from './logger.js';

export interface CommandOptions {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class CommandExecutor {
  async execute(
    command: string,
    args: string[],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const {
      timeout = 300000, // 5 minutes default
      cwd = process.cwd(),
      env = process.env,
      maxBuffer = 10 * 1024 * 1024, // 10MB default
    } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env,
        shell: false,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (stdout.length > maxBuffer) {
          child.kill('SIGTERM');
          reject(new Error(`stdout exceeded buffer limit of ${maxBuffer} bytes`));
        }
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        if (stderr.length > maxBuffer) {
          child.kill('SIGTERM');
          reject(new Error(`stderr exceeded buffer limit of ${maxBuffer} bytes`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        if (timedOut) {
          reject(new Error(`Command timed out after ${timeout}ms`));
          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0,
          duration,
        });
      });
    });
  }

  async executeWithRetry(
    command: string,
    args: string[],
    options: CommandOptions = {},
    maxRetries: number = 3
  ): Promise<CommandResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(command, args, options);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Command failed on attempt ${attempt}/${maxRetries}:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Command failed after retries');
  }

  async executeShell(
    command: string,
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const {
      timeout = 300000,
      cwd = process.cwd(),
      env = process.env,
      maxBuffer = 10 * 1024 * 1024,
    } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        cwd,
        env,
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxBuffer) {
          child.kill('SIGTERM');
          reject(new Error(`stdout exceeded buffer limit`));
        }
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > maxBuffer) {
          child.kill('SIGTERM');
          reject(new Error(`stderr exceeded buffer limit`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        if (timedOut) {
          reject(new Error(`Command timed out after ${timeout}ms`));
          return;
        }

        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0,
          duration,
        });
      });
    });
  }
}