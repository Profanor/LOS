"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console(),
        // Daily rotate file transport for logging to separate files each day
        new winston_daily_rotate_file_1.default({
            level: 'error', // Log only error level messages
            dirname: 'logs', // Directory for log files
            filename: 'application-%DATE%.log', // File name pattern
            datePattern: 'YYYY-MM-DD', // Date pattern for log file rotation
            zippedArchive: true, // Compress rotated log files
            maxFiles: '10d' // Keep log files for 10 days before removing
        })
    ]
});
exports.default = logger;
