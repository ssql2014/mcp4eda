import winston from 'winston';

// MCP servers must not output colored text to stdout
// Only use colors if explicitly running in dev mode
const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: isDev 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json() // No colors for MCP
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'error.log',
    level: 'error'
  }));
  
  logger.add(new winston.transports.File({
    filename: 'combined.log'
  }));
}