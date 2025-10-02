const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Authentication Service - Business logic for user authentication
 * Handles login, token generation, and user management
 */
class AuthService {
  constructor() {
    this.userModel = new User();
  }

  /**
   * Initialize service with database connection
   * @param {Object} db - lowdb database instance
   */
  init(db) {
    this.userModel.init(db);
    this.db = db;
  }

  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Object|null} User data with token or null if invalid
   */
  async login(username, password) {
    try {
      logger.info('User login attempt', { username });

      // Verify user credentials
      const user = await this.userModel.verifyPassword(username, password);

      if (!user) {
        logger.warn('Login failed - invalid credentials', { username });
        const error = new Error('Invalid username or password');
        error.status = 401;
        error.name = 'UnauthorizedError';
        throw error;
      }

      // Generate JWT token
      const token = authMiddleware.generateToken(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
        },
        token,
        expiresIn: process.env.JWT_EXPIRY || '24h',
      };
    } catch (error) {
      logger.error('Login failed', { username, error: error.message });
      throw error;
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user data
   */
  async register(userData) {
    try {
      logger.info('User registration attempt', { username: userData.username });

      // Check if username already exists
      const usernameExists = await this.userModel.isUsernameUnique(userData.username);
      if (!usernameExists) {
        const error = new Error('Username already exists');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      // Check if email already exists
      const emailExists = await this.userModel.isEmailUnique(userData.email);
      if (!emailExists) {
        const error = new Error('Email already exists');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      // Create new user
      const newUser = await this.userModel.create(userData);

      logger.info('User registered successfully', {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
      });

      return newUser;
    } catch (error) {
      logger.error('Registration failed', {
        userData: { ...userData, password: '[REDACTED]' },
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user profile by ID
   * @param {number} userId - User ID
   * @returns {Object|null} User profile or null if not found
   */
  async getUserProfile(userId) {
    try {
      logger.info('Fetching user profile', { userId });

      const user = await this.userModel.findById(userId);

      if (user) {
        logger.info('User profile fetched', { userId, username: user.username });
      } else {
        logger.warn('User profile not found', { userId });
      }

      return user;
    } catch (error) {
      logger.error('Failed to fetch user profile', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated user or null if not found
   */
  async updateUserProfile(userId, updateData) {
    try {
      logger.info('Updating user profile', { userId, updateData });

      // Check if user exists
      const existingUser = await this.userModel.findById(userId);
      if (!existingUser) {
        const error = new Error('User not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Check username uniqueness if username is being updated
      if (updateData.username && updateData.username !== existingUser.username) {
        const usernameExists = await this.userModel.isUsernameUnique(updateData.username, userId);
        if (!usernameExists) {
          const error = new Error('Username already exists');
          error.status = 409;
          error.name = 'ConflictError';
          throw error;
        }
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.userModel.isEmailUnique(updateData.email, userId);
        if (!emailExists) {
          const error = new Error('Email already exists');
          error.status = 409;
          error.name = 'ConflictError';
          throw error;
        }
      }

      const updatedUser = await this.userModel.update(userId, updateData);

      logger.info('User profile updated successfully', {
        userId: updatedUser.id,
        username: updatedUser.username,
      });

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user profile', {
        userId,
        updateData: { ...updateData, password: updateData.password ? '[REDACTED]' : undefined },
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} True if password changed successfully
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('Password change attempt', { userId });

      // Get user with password
      const user = await this.userModel.findByUsername(
        (await this.userModel.findById(userId)).username,
      );

      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        const error = new Error('Current password is incorrect');
        error.status = 400;
        error.name = 'BadRequestError';
        throw error;
      }

      // Update password
      await this.userModel.update(userId, { password: newPassword });

      logger.info('Password changed successfully', { userId });

      return true;
    } catch (error) {
      logger.error('Failed to change password', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated users data
   */
  async getAllUsers(query = {}) {
    try {
      logger.info('Fetching all users', { query });

      const result = await this.userModel.findAll(query);

      logger.info('Users fetched successfully', {
        count: result.data.length,
        total: result.pagination.total,
        page: result.pagination.page,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch users', error);
      throw error;
    }
  }

  /**
   * Delete user by ID (admin only)
   * @param {number} userId - User ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteUser(userId) {
    try {
      logger.info('Deleting user', { userId });

      // Check if user exists
      const existingUser = await this.userModel.findById(userId);
      if (!existingUser) {
        const error = new Error('User not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Prevent deletion of NTC admin users
      if (existingUser.role === 'NTC') {
        const error = new Error('Cannot delete NTC admin user');
        error.status = 403;
        error.name = 'ForbiddenError';
        throw error;
      }

      const deleted = await this.userModel.delete(userId);

      if (deleted) {
        logger.info('User deleted successfully', { userId });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete user', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      return authMiddleware.verifyToken(token);
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Generate new token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    try {
      return authMiddleware.generateToken(user);
    } catch (error) {
      logger.error('Token generation failed', { userId: user.id, error: error.message });
      throw error;
    }
  }

  /**
   * Get user statistics
   * @returns {Object} User statistics
   */
  async getUserStatistics() {
    try {
      logger.info('Fetching user statistics');

      const allUsers = await this.userModel.findAll({});
      const ntcUsers = await this.userModel.findAll({ role: 'NTC' });
      const operatorUsers = await this.userModel.findAll({ role: 'Operator' });
      const commuterUsers = await this.userModel.findAll({ role: 'Commuter' });

      const stats = {
        total: allUsers.data.length,
        ntc: ntcUsers.data.length,
        operators: operatorUsers.data.length,
        commuters: commuterUsers.data.length,
      };

      logger.info('User statistics fetched', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to fetch user statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate user data
   * @param {Object} userData - User data to validate
   * @returns {Object} Validation result
   */
  validateUserData(userData) {
    try {
      const { error, value } = User.schema.validate(userData, {
        abortEarly: false,
        stripUnknown: true,
      });

      return {
        isValid: !error,
        data: value,
        errors: error ? error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })) : [],
      };
    } catch (validationError) {
      logger.error('User validation error', {
        userData: { ...userData, password: '[REDACTED]' },
        error: validationError.message,
      });
      throw validationError;
    }
  }

  /**
   * Check if user exists
   * @param {number} userId - User ID
   * @returns {boolean} True if exists, false otherwise
   */
  async userExists(userId) {
    try {
      return await this.userModel.exists(userId);
    } catch (error) {
      logger.error('Failed to check user existence', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Object|null} User data or null if not found
   */
  async getUserByUsername(username) {
    try {
      const user = await this.userModel.findByUsername(username);
      return user;
    } catch (error) {
      logger.error('Failed to get user by username', { username, error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const authService = new AuthService();

module.exports = authService;
