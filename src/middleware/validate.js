const logger = require('../utils/logger');

/**
 * Validation middleware for request data validation using Joi schemas
 * Provides centralized validation for all API endpoints
 */
class ValidationMiddleware {
  constructor() {
    this.validationCache = new Map();
  }

  /**
   * Validate request body against Joi schema
   * @param {Object} schema - Joi validation schema
   * @param {string} source - Source of data ('body', 'query', 'params')
   * @returns {Function} Express middleware function
   */
  validate(schema, source = 'body') {
    return (req, res, next) => {
      try {
        const data = req[source];

        if (!data) {
          return res.status(400).json({
            error: 'Validation error',
            message: `Missing ${source} data`,
          });
        }

        const { error, value } = schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          const errorDetails = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context.value,
          }));

          logger.warn('Validation failed', {
            source,
            errors: errorDetails,
            endpoint: req.path,
            method: req.method,
          });

          return res.status(400).json({
            error: 'Validation error',
            message: 'Request data validation failed',
            details: errorDetails,
          });
        }

        // Replace request data with validated and sanitized data
        req[source] = value;

        logger.debug('Validation successful', {
          source,
          endpoint: req.path,
          method: req.method,
        });

        next();
      } catch (validationError) {
        logger.error('Validation middleware error', validationError);
        res.status(500).json({
          error: 'Validation error',
          message: 'Internal server error during validation',
        });
      }
    };
  }

  /**
   * Validate request body
   * @param {Object} schema - Joi validation schema
   * @returns {Function} Express middleware function
   */
  validateBody(schema) {
    return this.validate(schema, 'body');
  }

  /**
   * Validate query parameters
   * @param {Object} schema - Joi validation schema
   * @returns {Function} Express middleware function
   */
  validateQuery(schema) {
    return this.validate(schema, 'query');
  }

  /**
   * Validate route parameters
   * @param {Object} schema - Joi validation schema
   * @returns {Function} Express middleware function
   */
  validateParams(schema) {
    return this.validate(schema, 'params');
  }

  /**
   * Validate ID parameter (common validation)
   * @param {string} paramName - Parameter name (default: 'id')
   * @returns {Function} Express middleware function
   */
  validateId(paramName = 'id') {
    const Joi = require('joi');
    const schema = Joi.object({
      [paramName]: Joi.number().integer().positive().required(),
    });

    return this.validateParams(schema);
  }

  /**
   * Validate pagination parameters
   * @returns {Function} Express middleware function
   */
  validatePagination() {
    const Joi = require('joi');
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100)
        .default(10),
    });

    return this.validateQuery(schema);
  }

  /**
   * Validate sorting parameters
   * @param {Array} allowedFields - Allowed fields for sorting
   * @returns {Function} Express middleware function
   */
  validateSort(allowedFields = []) {
    const Joi = require('joi');
    const sortPattern = allowedFields.length > 0
      ? new RegExp(`^(${allowedFields.join('|')}):(asc|desc)$`)
      : /^[a-zA-Z]+:(asc|desc)$/;

    const schema = Joi.object({
      sort: Joi.string().pattern(sortPattern).default('id:asc'),
    });

    return this.validateQuery(schema);
  }

  /**
   * Validate date range parameters
   * @returns {Function} Express middleware function
   */
  validateDateRange() {
    const Joi = require('joi');
    const schema = Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')),
      date: Joi.date().iso(),
    });

    return this.validateQuery(schema);
  }

  /**
   * Validate location coordinates
   * @returns {Function} Express middleware function
   */
  validateLocation() {
    const Joi = require('joi');
    const schema = Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    });

    return this.validateBody(schema);
  }

  /**
   * Validate location update for trips
   * @returns {Function} Express middleware function
   */
  validateLocationUpdate() {
    const Joi = require('joi');
    const schema = Joi.object({
      tripId: Joi.number().integer().positive().required(),
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    });

    return this.validateBody(schema);
  }

  /**
   * Validate user login credentials
   * @returns {Function} Express middleware function
   */
  validateLogin() {
    const Joi = require('joi');
    const schema = Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    });

    return this.validateBody(schema);
  }

  /**
   * Validate user registration data
   * @returns {Function} Express middleware function
   */
  validateUserRegistration() {
    const Joi = require('joi');
    const schema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30)
        .required(),
      password: Joi.string().min(6).max(100).required(),
      email: Joi.string().email().required(),
      role: Joi.string().valid('NTC', 'Operator', 'Commuter').required(),
    });

    return this.validateBody(schema);
  }

  /**
   * Validate conditional GET parameters (ETag, If-None-Match)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  validateConditionalGet(req, res, next) {
    try {
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];

      // Store conditional headers for later use
      req.conditionalHeaders = {
        ifNoneMatch,
        ifModifiedSince,
      };

      next();
    } catch (error) {
      logger.error('Conditional GET validation error', error);
      next(); // Continue even if there's an error
    }
  }

  /**
   * Sanitize input data (remove potentially dangerous content)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeInput(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove potential XSS content
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Middleware to sanitize request data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  sanitizeRequest(req, res, next) {
    try {
      if (req.body) {
        req.body = validationMiddleware.sanitizeInput(req.body);
      }
      if (req.query) {
        req.query = validationMiddleware.sanitizeInput(req.query);
      }

      next();
    } catch (error) {
      logger.error('Request sanitization error', error);
      next(); // Continue even if there's an error
    }
  }
}

// Create singleton instance
const validationMiddleware = new ValidationMiddleware();

module.exports = validationMiddleware;
