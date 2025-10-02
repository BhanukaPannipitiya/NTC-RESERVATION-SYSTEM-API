const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Authentication Controller - HTTP request handling for authentication endpoints
 * Provides RESTful endpoints for user authentication and management
 */
class AuthController {
  constructor() {
    this.authService = authService;
  }

  /**
   * Initialize controller with database connection
   * @param {Object} db - lowdb database instance
   */
  init(db) {
    this.authService.init(db);
  }

  /**
   * User login endpoint
   * POST /v1/auth/login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Authenticate user
      const result = await this.authService.login(username, password);

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Auth-Token': result.token,
        'X-Token-Type': 'Bearer',
        'X-Token-Expires': result.expiresIn,
      });

      // Log successful login
      logger.logAuth('Login successful', result.user, req.ip);

      res.status(200).json({
        message: 'Login successful',
        data: result,
        links: {
          self: { href: '/v1/auth/login', method: 'POST' },
          profile: { href: `/v1/auth/profile/${result.user.id}`, method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Login controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Authentication Error',
        message: error.message || 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * User registration endpoint
   * POST /v1/auth/register
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const userData = req.body;

      // Register new user
      const newUser = await this.authService.register(userData);

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/auth/profile/${newUser.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      // Log successful registration
      logger.logAuth('Registration successful', newUser, req.ip);

      res.status(201).json({
        message: 'User registered successfully',
        data: newUser,
        links: {
          self: { href: '/v1/auth/register', method: 'POST' },
          profile: { href: `/v1/auth/profile/${newUser.id}`, method: 'GET' },
          login: { href: '/v1/auth/login', method: 'POST' },
        },
      });
    } catch (error) {
      logger.error('Registration controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Registration Error',
        message: error.message || 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Get user profile endpoint
   * GET /v1/auth/profile/:id
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      // Check if user is accessing their own profile or is admin
      if (req.user.id !== userId && req.user.role !== 'NTC') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied. You can only access your own profile.',
        });
      }

      // Get user profile
      const user = await this.authService.getUserProfile(userId);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User profile not found',
        });
      }

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
        ETag: `"${user.id}-${user.updatedAt}"`,
      });

      // Check conditional GET
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === `"${user.id}-${user.updatedAt}"`) {
        return res.status(304).end();
      }

      res.status(200).json({
        message: 'User profile retrieved successfully',
        data: user,
        links: {
          self: { href: `/v1/auth/profile/${user.id}`, method: 'GET' },
          update: { href: `/v1/auth/profile/${user.id}`, method: 'PUT' },
        },
      });
    } catch (error) {
      logger.error('Get profile controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Profile Error',
        message: error.message || 'Failed to retrieve profile',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Update user profile endpoint
   * PUT /v1/auth/profile/:id
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);
      const updateData = req.body;

      // Check if user is updating their own profile or is admin
      if (req.user.id !== userId && req.user.role !== 'NTC') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied. You can only update your own profile.',
        });
      }

      // Update user profile
      const updatedUser = await this.authService.updateUserProfile(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User profile not found',
        });
      }

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/auth/profile/${updatedUser.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedUser.updatedAt,
      });

      // Log profile update
      logger.logAuth('Profile updated', updatedUser, req.ip);

      res.status(200).json({
        message: 'User profile updated successfully',
        data: updatedUser,
        links: {
          self: { href: `/v1/auth/profile/${updatedUser.id}`, method: 'GET' },
          update: { href: `/v1/auth/profile/${updatedUser.id}`, method: 'PUT' },
        },
      });
    } catch (error) {
      logger.error('Update profile controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Profile Update Error',
        message: error.message || 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Change password endpoint
   * PUT /v1/auth/change-password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Change password
      await this.authService.changePassword(userId, currentPassword, newPassword);

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      // Log password change
      logger.logAuth('Password changed', { id: userId }, req.ip);

      res.status(200).json({
        message: 'Password changed successfully',
        links: {
          self: { href: '/v1/auth/change-password', method: 'PUT' },
          profile: { href: `/v1/auth/profile/${userId}`, method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Change password controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Password Change Error',
        message: error.message || 'Failed to change password',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Get all users endpoint (admin only)
   * GET /v1/auth/users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllUsers(req, res) {
    try {
      const { query } = req;

      // Get all users
      const result = await this.authService.getAllUsers(query);

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
        'X-Total-Count': result.pagination.total,
        'X-Page': result.pagination.page,
        'X-Limit': result.pagination.limit,
        'X-Total-Pages': result.pagination.pages,
      });

      // Add pagination links
      const links = {
        self: { href: `/v1/auth/users?page=${query.page}&limit=${query.limit}`, method: 'GET' },
      };

      if (result.pagination.page > 1) {
        links.prev = {
          href: `/v1/auth/users?page=${result.pagination.page - 1}&limit=${query.limit}`,
          method: 'GET',
        };
      }

      if (result.pagination.page < result.pagination.pages) {
        links.next = {
          href: `/v1/auth/users?page=${result.pagination.page + 1}&limit=${query.limit}`,
          method: 'GET',
        };
      }

      res.status(200).json({
        message: 'Users retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        links,
      });
    } catch (error) {
      logger.error('Get all users controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Users Error',
        message: error.message || 'Failed to retrieve users',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Delete user endpoint (admin only)
   * DELETE /v1/auth/users/:id
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      // Prevent self-deletion
      if (req.user.id === userId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot delete your own account',
        });
      }

      // Delete user
      const deleted = await this.authService.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      // Log user deletion
      logger.logAuth('User deleted', { id: userId }, req.ip);

      res.status(204).end();
    } catch (error) {
      logger.error('Delete user controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'User Deletion Error',
        message: error.message || 'Failed to delete user',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Get user statistics endpoint (admin only)
   * GET /v1/auth/statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserStatistics(req, res) {
    try {
      // Get user statistics
      const stats = await this.authService.getUserStatistics();

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
      });

      res.status(200).json({
        message: 'User statistics retrieved successfully',
        data: stats,
        links: {
          self: { href: '/v1/auth/statistics', method: 'GET' },
          users: { href: '/v1/auth/users', method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Get user statistics controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Statistics Error',
        message: error.message || 'Failed to retrieve user statistics',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Validate token endpoint
   * GET /v1/auth/validate
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateToken(req, res) {
    try {
      // Token is already validated by middleware
      const { user } = req;

      // Set response headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      res.status(200).json({
        message: 'Token is valid',
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
          },
          valid: true,
        },
        links: {
          self: { href: '/v1/auth/validate', method: 'GET' },
          profile: { href: `/v1/auth/profile/${user.id}`, method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Validate token controller error', error);

      res.status(error.status || 500).json({
        error: error.name || 'Token Validation Error',
        message: error.message || 'Failed to validate token',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
}

// Create singleton instance
const authController = new AuthController();

module.exports = authController;
