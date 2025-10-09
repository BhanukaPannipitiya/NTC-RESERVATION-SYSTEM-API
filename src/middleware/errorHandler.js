const logger = require('../utils/logger');

/**
 * Global error handling middleware for the NTC Bus Tracking API
 * Provides centralized error handling with proper HTTP status codes and logging
 */
class ErrorHandler {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Handle validation errors
   * @param {Error} error - Validation error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleValidationError(error, req, res, next) {
    if (error.name === 'ValidationError') {
      logger.warn('Validation error', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        body: req.body,
      });

      return res.status(400).json({
        error: 'Validation error',
        message: error.message,
        details: this.isDevelopment ? error.stack : undefined,
      });
    }

    next(error);
  }

  /**
   * Handle JWT authentication errors
   * @param {Error} error - JWT error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleJWTError(error, req, res, next) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('JWT error', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
      });

      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication token is invalid',
      });
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn('JWT expired', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
      });

      return res.status(401).json({
        error: 'Token expired',
        message: 'Authentication token has expired',
      });
    }

    next(error);
  }

  /**
   * Handle database errors
   * @param {Error} error - Database error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleDatabaseError(error, req, res, next) {
    if (error.name === 'DatabaseError' || error.message.includes('database')) {
      logger.error('Database error', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        stack: error.stack,
      });

      return res.status(500).json({
        error: 'Database error',
        message: 'An error occurred while accessing the database',
        details: this.isDevelopment ? error.message : undefined,
      });
    }

    next(error);
  }

  /**
   * Handle rate limiting errors
   * @param {Error} error - Rate limit error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleRateLimitError(error, req, res, next) {
    if (error.status === 429) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });

      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: error.retryAfter || 60,
      });
    }

    next(error);
  }

  /**
   * Handle not found errors
   * @param {Error} error - Not found error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleNotFoundError(error, req, res, next) {
    if (error.status === 404 || error.name === 'NotFoundError') {
      logger.info('Resource not found', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
      });

      return res.status(404).json({
        error: 'Not found',
        message: error.message || 'The requested resource was not found',
      });
    }

    next(error);
  }

  /**
   * Handle unauthorized access errors
   * @param {Error} error - Unauthorized error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleUnauthorizedError(error, req, res, next) {
    if (error.status === 401 || error.name === 'UnauthorizedError') {
      logger.warn('Unauthorized access', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message || 'Authentication required',
      });
    }

    next(error);
  }

  /**
   * Handle forbidden access errors
   * @param {Error} error - Forbidden error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleForbiddenError(error, req, res, next) {
    if (error.status === 403 || error.name === 'ForbiddenError') {
      logger.warn('Forbidden access', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        userId: req.user ? req.user.id : null,
        ip: req.ip,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: error.message || 'Access denied',
      });
    }

    next(error);
  }

  /**
   * Handle bad request errors
   * @param {Error} error - Bad request error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleBadRequestError(error, req, res, next) {
    if (error.status === 400 || error.name === 'BadRequestError') {
      logger.warn('Bad request', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        body: req.body,
      });

      return res.status(400).json({
        error: 'Bad request',
        message: error.message || 'Invalid request data',
        details: this.isDevelopment ? error.stack : undefined,
      });
    }

    next(error);
  }

  /**
   * Handle conflict errors (e.g., duplicate resources)
   * @param {Error} error - Conflict error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleConflictError(error, req, res, next) {
    if (error.status === 409 || error.name === 'ConflictError') {
      logger.warn('Conflict error', {
        error: error.message,
        endpoint: req.path,
        method: req.method,
        body: req.body,
      });

      return res.status(409).json({
        error: 'Conflict',
        message: error.message || 'Resource conflict',
      });
    }

    next(error);
  }

  /**
   * Handle internal server errors
   * @param {Error} error - Internal server error
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleInternalServerError(error, req, res, _next) {
    logger.error('Internal server error', {
      error: error.message,
      stack: error.stack,
      endpoint: req.path,
      method: req.method,
      body: req.body,
      userId: req.user ? req.user.id : null,
      ip: req.ip,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      details: this.isDevelopment ? error.message : undefined,
      requestId: req.id || 'unknown',
    });
  }

  /**
   * Handle async errors in route handlers
   * @param {Function} fn - Async route handler function
   * @returns {Function} Express middleware function
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create custom error with status code
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string} name - Error name
   * @returns {Error} Custom error object
   */
  createError(message, status = 500, name = 'CustomError') {
    const error = new Error(message);
    error.status = status;
    error.name = name;
    return error;
  }

  /**
   * Main error handling middleware
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleError(error, req, res, next) {
    // Handle different types of errors in sequence
    this.handleValidationError(error, req, res, (err) => {
      this.handleJWTError(err, req, res, (err2) => {
        this.handleDatabaseError(err2, req, res, (err3) => {
          this.handleRateLimitError(err3, req, res, (err4) => {
            this.handleNotFoundError(err4, req, res, (err5) => {
              this.handleUnauthorizedError(err5, req, res, (err6) => {
                this.handleForbiddenError(err6, req, res, (err7) => {
                  this.handleBadRequestError(err7, req, res, (err8) => {
                    this.handleConflictError(err8, req, res, (err9) => {
                      this.handleInternalServerError(err9, req, res, next);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  /**
   * Get bound middleware functions for Express
   * @returns {Object} Object containing bound middleware functions
   */
  getMiddleware() {
    return {
      handleError: this.handleError.bind(this),
      handleNotFound: this.handleNotFound.bind(this),
      asyncHandler: this.asyncHandler.bind(this),
    };
  }

  /**
   * Handle 404 errors for undefined routes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  handleNotFound(req, res, next) {
    const error = this.createError(
      `Route ${req.method} ${req.path} not found`,
      404,
      'NotFoundError',
    );
    next(error);
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = errorHandler;
