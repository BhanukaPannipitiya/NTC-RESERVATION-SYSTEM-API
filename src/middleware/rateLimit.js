const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate limiting middleware for the NTC Bus Tracking API
 * Provides different rate limits for different endpoints and user types
 */
class RateLimitMiddleware {
  constructor() {
    this.defaultWindowMs = 15 * 60 * 1000; // 15 minutes
    this.defaultMax = 100; // 100 requests per window
  }

  /**
   * Create rate limiter with custom configuration
   * @param {Object} options - Rate limit options
   * @returns {Function} Express middleware function
   */
  createLimiter(options = {}) {
    const config = {
      windowMs: options.windowMs || this.defaultWindowMs,
      max: options.max || this.defaultMax,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((options.windowMs || this.defaultWindowMs) / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          userId: req.user ? req.user.id : null,
        });

        res.status(429).json(config.message);
      },
      skip: (req) => {
        // Skip rate limiting for NTC admins in development
        if (process.env.NODE_ENV === 'development' && req.user && req.user.role === 'NTC') {
          return true;
        }
        return false;
      },
      ...options,
    };

    return rateLimit(config);
  }

  /**
   * General API rate limiter (100 requests per 15 minutes)
   * @returns {Function} Express middleware function
   */
  general() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 900, // 15 minutes in seconds
      },
    });
  }

  /**
   * Strict rate limiter for authentication endpoints (5 requests per 15 minutes)
   * @returns {Function} Express middleware function
   */
  auth() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: {
        error: 'Too many authentication attempts',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: 900, // 15 minutes in seconds
      },
    });
  }

  /**
   * Moderate rate limiter for location updates (50 requests per 5 minutes)
   * @returns {Function} Express middleware function
   */
  locationUpdate() {
    return this.createLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50,
      message: {
        error: 'Too many location updates',
        message: 'Too many location updates. Please slow down.',
        retryAfter: 300, // 5 minutes in seconds
      },
    });
  }

  /**
   * Lenient rate limiter for read operations (200 requests per 10 minutes)
   * @returns {Function} Express middleware function
   */
  readOnly() {
    return this.createLimiter({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 200,
      message: {
        error: 'Too many read requests',
        message: 'Too many read requests. Please try again later.',
        retryAfter: 600, // 10 minutes in seconds
      },
    });
  }

  /**
   * Strict rate limiter for write operations (20 requests per 10 minutes)
   * @returns {Function} Express middleware function
   */
  write() {
    return this.createLimiter({
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 20,
      message: {
        error: 'Too many write requests',
        message: 'Too many write requests. Please try again later.',
        retryAfter: 600, // 10 minutes in seconds
      },
    });
  }

  /**
   * Very strict rate limiter for admin operations (10 requests per 5 minutes)
   * @returns {Function} Express middleware function
   */
  admin() {
    return this.createLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10,
      message: {
        error: 'Too many admin requests',
        message: 'Too many admin requests. Please try again later.',
        retryAfter: 300, // 5 minutes in seconds
      },
    });
  }

  /**
   * Custom rate limiter based on user role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  roleBased(req, res, next) {
    let limiter;

    if (req.user) {
      switch (req.user.role) {
        case 'NTC':
          limiter = this.admin();
          break;
        case 'Operator':
          limiter = this.write();
          break;
        case 'Commuter':
          limiter = this.readOnly();
          break;
        default:
          limiter = this.general();
      }
    } else {
      limiter = this.general();
    }

    return limiter(req, res, next);
  }

  /**
   * Rate limiter for specific IP addresses
   * @param {string} ip - IP address
   * @param {number} max - Maximum requests
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Function} Express middleware function
   */
  ipBased(ip, max = 50, windowMs = 15 * 60 * 1000) {
    return this.createLimiter({
      windowMs,
      max,
      keyGenerator: (req) => (req.ip === ip ? ip : req.ip),
      message: {
        error: 'IP rate limit exceeded',
        message: `Rate limit exceeded for IP ${ip}`,
        retryAfter: Math.ceil(windowMs / 1000),
      },
    });
  }

  /**
   * Rate limiter for specific endpoints
   * @param {string} endpoint - Endpoint pattern
   * @param {Object} options - Rate limit options
   * @returns {Function} Express middleware function
   */
  endpointBased(endpoint, options = {}) {
    return this.createLimiter({
      ...options,
      keyGenerator: (req) => `${req.ip}:${endpoint}`,
    });
  }

  /**
   * Rate limiter for user-based requests
   * @param {Object} options - Rate limit options
   * @returns {Function} Express middleware function
   */
  userBased(options = {}) {
    return this.createLimiter({
      ...options,
      keyGenerator: (req) => (req.user ? `user:${req.user.id}` : `ip:${req.ip}`),
    });
  }

  /**
   * Get rate limit status for a request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  getStatus(req, res, _next) {
    const status = {
      ip: req.ip,
      user: req.user ? {
        id: req.user.id,
        role: req.user.role,
      } : null,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    res.json({
      message: 'Rate limit status',
      data: status,
    });
  }

  /**
   * Reset rate limit for a specific key
   * @param {string} key - Rate limit key
   * @returns {boolean} True if reset successful
   */
  resetLimit(key) {
    try {
      // This would require access to the rate limit store
      // Implementation depends on the rate limiting library used
      logger.info('Rate limit reset requested', { key });
      return true;
    } catch (error) {
      logger.error('Failed to reset rate limit', { key, error: error.message });
      return false;
    }
  }
}

// Create singleton instance
const rateLimitMiddleware = new RateLimitMiddleware();

module.exports = rateLimitMiddleware;
