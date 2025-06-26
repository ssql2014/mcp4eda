import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'],
    }),
  ],
});

export function logToolCall(toolName: string, args: any): void {
  logger.debug(`Tool called: ${toolName}`, { args });
}

export function logToolResult(toolName: string, success: boolean, duration: number): void {
  logger.debug(`Tool completed: ${toolName}`, { success, duration });
}