import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
import { ExecutionError } from './error-handler.js';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class Executor {
  private klayoutPath: string;
  private timeout: number;

  constructor(klayoutPath: string, timeout: number = 300000) { // 5 minutes default
    this.klayoutPath = klayoutPath;
    this.timeout = timeout;
  }

  async executeCommand(args: string[]): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.klayoutPath, args);
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new ExecutionError(`Command timed out after ${this.timeout}ms`));
      }, this.timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(new ExecutionError(`Failed to execute command: ${error.message}`));
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (!timedOut) {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
          });
        }
      });
    });
  }

  async executePythonScript(script: string, args: string[] = []): Promise<ExecutionResult> {
    const scriptFile = join(tmpdir(), `klayout_script_${randomUUID()}.py`);
    
    try {
      await writeFile(scriptFile, script, 'utf8');
      const result = await this.executeCommand(['-b', '-r', scriptFile, ...args]);
      return result;
    } finally {
      try {
        await unlink(scriptFile);
      } catch (error) {
        logger.warn(`Failed to clean up temporary script file: ${scriptFile}`);
      }
    }
  }

  async executeRubyScript(script: string, args: string[] = []): Promise<ExecutionResult> {
    const scriptFile = join(tmpdir(), `klayout_script_${randomUUID()}.rb`);
    
    try {
      await writeFile(scriptFile, script, 'utf8');
      const result = await this.executeCommand(['-b', '-r', scriptFile, ...args]);
      return result;
    } finally {
      try {
        await unlink(scriptFile);
      } catch (error) {
        logger.warn(`Failed to clean up temporary script file: ${scriptFile}`);
      }
    }
  }

  async executeBatchMode(inputFile: string, outputFile: string, script: string): Promise<ExecutionResult> {
    const scriptFile = join(tmpdir(), `klayout_batch_${randomUUID()}.py`);
    
    try {
      await writeFile(scriptFile, script, 'utf8');
      const result = await this.executeCommand([
        '-b',
        '-r', scriptFile,
        '-rd', `input_file=${inputFile}`,
        '-rd', `output_file=${outputFile}`
      ]);
      return result;
    } finally {
      try {
        await unlink(scriptFile);
      } catch (error) {
        logger.warn(`Failed to clean up temporary script file: ${scriptFile}`);
      }
    }
  }

  async executeWithTimeout(command: string, timeoutMs?: number): Promise<ExecutionResult> {
    const actualTimeout = timeoutMs || this.timeout;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: actualTimeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      
      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new ExecutionError(`Command timed out after ${actualTimeout}ms`);
      }
      
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
      };
    }
  }
}