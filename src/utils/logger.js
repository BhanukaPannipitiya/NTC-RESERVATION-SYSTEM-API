const winston = require('winston');
const path = require('path');

/**
 * Winston logger configuration for the NTC Bus Tracking API
 * Provides structured logging with different levels and formats
 */
class Logger {
  constructor() {
    this.logger = null;
    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with custom configuration
   */
  initializeLogger() {
    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint(),
    );

    // Define console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.printf(({
        timestamp, level, message, ...meta
      }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      }),
    );

    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'ntc-bus-tracking-api' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: consoleFormat,
        }),

        // File transport for errors
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),

        // File transport for all logs
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: path.join('logs', 'exceptions.log') }),
    );

    this.logger.rejections.handle(
      new winston.transports.File({ filename: path.join('logs', 'rejections.log') }),
    );
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|Object} error - Error object or metadata
   */
  error(message, error = {}) {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...error,
      });
    } else {
      this.logger.error(message, error);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   */
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user ? req.user.id : null,
    };

    if (res.statusCode >= 400) {
      this.error('HTTP Request Error', logData);
    } else {
      this.info('HTTP Request', logData);
    }
  }

  /**
   * Log authentication events
   * @param {string} event - Authentication event type
   * @param {Object} user - User data
   * @param {string} ip - Client IP address
   */
  logAuth(event, user, ip) {
    this.info(`Authentication: ${event}`, {
      userId: user.id,
      username: user.username,
      role: user.role,
      ip,
    });
  }

  /**
   * Log business logic events
   * @param {string} event - Business event type
   * @param {Object} data - Event data
   */
  logBusinessEvent(event, data) {
    this.info(`Business Event: ${event}`, data);
  }

  /**
   * Log system events
   * @param {string} event - System event type
   * @param {Object} data - Event data
   */
  logSystemEvent(event, data) {
    this.info(`System Event: ${event}`, data);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
