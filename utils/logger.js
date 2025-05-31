const winston = require('winston');
require('winston-daily-rotate-file'); // Required for daily rotation

// Define log levels and colors (optional, default levels are fine)
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Custom format for console output (human-readable)
const consoleLogFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
    // If an error object was passed, its stack trace will be in 'stack'
    return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
});

// Create the logger instance
const logger = winston.createLogger({
    // Set default level based on NODE_ENV.
    // 'debug' for development, 'info' for production to reduce verbosity.
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    
    // Default metadata for all logs (useful for filtering in log aggregators)
    defaultMeta: { service: 'event-indexer' },

    // Combined format for all transports. 'errors({ stack: true })' captures stack traces.
    // In production, use JSON format for machine readability.
    format: winston.format.combine(
        winston.format.errors({ stack: true }), // Captures stack trace from Error objects
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        // For production: JSON format
        process.env.NODE_ENV === 'production' ? winston.format.json() : consoleLogFormat
    ),
    transports: [
        // 1. Console Transport (for development visibility)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }), // Add colors to console output
                consoleLogFormat // Use the human-readable format
            ),
            silent: process.env.NODE_ENV === 'test' // Don't log to console during tests
        }),
        
        // 2. Daily Rotate File Transport (for persistent logs)
        new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log', // e.g., logs/application-2023-10-27.log
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true, // Compress old logs
            maxSize: '20m', // Rotate when file size reaches 20MB
            maxFiles: '14d', // Keep logs for 14 days
            level: 'info', // This file will contain info, warn, error logs
        }),

        // 3. Dedicated Error File Transport (only error logs for easier debugging)
        new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log', // e.g., logs/error-2023-10-27.log
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d',
            level: 'error', // This file will only contain error logs
        }),
    ],
    // Exit on error by default in production. In development, you might want to keep the process alive.
    exitOnError: process.env.NODE_ENV === 'production' ? true : false,
});

// --- Centralized Uncaught Exception and Unhandled Rejection Handling ---
// This is crucial for long-running processes like indexers.
// It logs critical errors before the process potentially crashes.

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally: Exit the process after logging. For an indexer, you might want to restart the process.
    // process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // CRITICAL: Exit the process. An uncaught exception means your application is in an unstable state.
    process.exit(1);
});

module.exports = logger;