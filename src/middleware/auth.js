const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication middleware for JWT token validation
 * Provides role-based access control for the NTC Bus Tracking API
 */
class AuthMiddleware {
  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'ntc-bus-tracking-secret-key';
    this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
  }

  /**
   * Generate JWT token for authenticated user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };

    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpiry,
      issuer: 'ntc-bus-tracking-api',
      audience: 'ntc-bus-tracking-client',
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secretKey, {
        issuer: 'ntc-bus-tracking-api',
        audience: 'ntc-bus-tracking-client',
      });
    } catch (error) {
      logger.debug('Token verification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Middleware to authenticate requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Authorization header is missing',
        });
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Token is missing',
        });
      }

      const decoded = authMiddleware.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token is invalid or expired',
        });
      }

      // Add user info to request object
      req.user = decoded;

      logger.logAuth('Token validated', decoded, req.ip);
      next();
    } catch (error) {
      logger.error('Authentication middleware error', error);
      res.status(500).json({
        error: 'Authentication error',
        message: 'Internal server error during authentication',
      });
    }
  }

  /**
   * Middleware to authorize specific roles
   * @param {string|Array} allowedRoles - Role(s) allowed to access
   * @returns {Function} Express middleware function
   */
  authorize(allowedRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'User not authenticated',
          });
        }

        const userRole = req.user.role;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        if (!roles.includes(userRole)) {
          logger.warn('Authorization failed', {
            userId: req.user.id,
            userRole,
            requiredRoles: roles,
            endpoint: req.path,
            method: req.method,
          });

          return res.status(403).json({
            error: 'Access denied',
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
          });
        }

        logger.debug('Authorization successful', {
          userId: req.user.id,
          userRole,
          endpoint: req.path,
        });

        next();
      } catch (error) {
        logger.error('Authorization middleware error', error);
        res.status(500).json({
          error: 'Authorization error',
          message: 'Internal server error during authorization',
        });
      }
    };
  }

  /**
   * Middleware for NTC admin access only
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  requireNTC(req, res, next) {
    return this.authorize('NTC')(req, res, next);
  }

  /**
   * Middleware for Operator access (NTC or Operator)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  requireOperator(req, res, next) {
    return this.authorize(['NTC', 'Operator'])(req, res, next);
  }

  /**
   * Middleware for authenticated users (any role)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  requireAuth(req, res, next) {
    return this.authorize(['NTC', 'Operator', 'Commuter'])(req, res, next);
  }

  /**
   * Optional authentication middleware (doesn't fail if no token)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader) {
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : authHeader;

        if (token) {
          const decoded = this.verifyToken(token);
          if (decoded) {
            req.user = decoded;
          }
        }
      }

      next();
    } catch (error) {
      logger.error('Optional authentication middleware error', error);
      next(); // Continue even if there's an error
    }
  }

  /**
   * Get user from request (helper method)
   * @param {Object} req - Express request object
   * @returns {Object|null} User object or null
   */
  getUser(req) {
    return req.user || null;
  }

  /**
   * Check if user has specific role
   * @param {Object} req - Express request object
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  hasRole(req, role) {
    return req.user && req.user.role === role;
  }

  /**
   * Check if user is NTC admin
   * @param {Object} req - Express request object
   * @returns {boolean} True if user is NTC admin
   */
  isNTC(req) {
    return this.hasRole(req, 'NTC');
  }

  /**
   * Check if user is Operator
   * @param {Object} req - Express request object
   * @returns {boolean} True if user is Operator
   */
  isOperator(req) {
    return this.hasRole(req, 'Operator');
  }

  /**
   * Check if user is Commuter
   * @param {Object} req - Express request object
   * @returns {boolean} True if user is Commuter
   */
  isCommuter(req) {
    return this.hasRole(req, 'Commuter');
  }

  /**
   * Get bound middleware functions for Express
   * @returns {Object} Object containing bound middleware functions
   */
  getMiddleware() {
    return {
      authenticate: this.authenticate.bind(this),
      authorize: this.authorize.bind(this),
      requireNTC: this.requireNTC.bind(this),
      requireOperator: this.requireOperator.bind(this),
      requireAuth: this.requireAuth.bind(this),
      optionalAuth: this.optionalAuth.bind(this),
    };
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

module.exports = authMiddleware;
