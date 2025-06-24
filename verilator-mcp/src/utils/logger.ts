import winston from 'winston';
import { join } from 'path';
import { homedir } from 'os';

const logDir = join(homedir(), '.verilator-mcp', 'logs');

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'verilator-mcp' },
  transports: [
    // Always use file transport for MCP servers
    // Console output must be reserved for JSON-RPC only
    new winston.transports.File({
      filename: join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: join(logDir, 'combined.log'),
    }),
  ],
});

// Ensure log directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(logDir, { recursive: true });
} catch (error) {
  // Ignore error if directory already exists
}