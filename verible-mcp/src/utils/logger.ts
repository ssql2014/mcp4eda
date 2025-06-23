import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      return stack ? `${baseMessage}\n${stack}` : baseMessage;
    })
  ),
  transports: [
    // Write all logs to console (stderr for MCP compatibility)
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'],
    }),
    // Also write to files for debugging
    new winston.transports.File({
      filename: path.join(__dirname, '../../error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../combined.log'),
    }),
  ],
});

// Create a child logger for MCP-specific logging
export const mcpLogger = logger.child({ service: 'verible-mcp' });