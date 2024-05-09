import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.combine( 
          winston.format.timestamp(),
          winston.format.json()
 ),
  transports: [
    new winston.transports.Console(), 
    // Daily rotate file transport for logging to separate files each day
    new DailyRotateFile({
        level: 'error', // Log only error level messages
        dirname: 'logs', // Directory for log files
        filename: 'application-%DATE%.log', // File name pattern
        datePattern: 'YYYY-MM-DD', // Date pattern for log file rotation
        zippedArchive: true, // Compress rotated log files
        maxFiles: '10d' // Keep log files for 10 days before removing
      })
  ]
});

export default logger;