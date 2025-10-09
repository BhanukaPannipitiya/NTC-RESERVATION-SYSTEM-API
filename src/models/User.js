const Joi = require('joi');
const bcrypt = require('bcrypt');

/**
 * User model with Joi validation schemas
 * Represents system users (NTC, Operators, Commuters)
 */
class User {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection
   * @param {Object} database - lowdb instance
   */
  init(database) {
    this.db = database;
  }

  /**
   * Joi schema for user creation/update validation
   */
  static get schema() {
    return Joi.object({
      username: Joi.string().alphanum().min(3).max(30)
        .required(),
      password: Joi.string().min(6).max(100).required(),
      role: Joi.string().valid('NTC', 'Operator', 'Commuter').required(),
      email: Joi.string().email().required(),
    });
  }

  /**
   * Joi schema for user login validation
   */
  static get loginSchema() {
    return Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    });
  }

  /**
   * Joi schema for user ID validation
   */
  static get idSchema() {
    return Joi.number().integer().positive().required();
  }

  /**
   * Joi schema for user query parameters
   */
  static get querySchema() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100)
        .default(10),
      sort: Joi.string().pattern(/^(username|role|createdAt):(asc|desc)$/).default('username:asc'),
      role: Joi.string().valid('NTC', 'Operator', 'Commuter'),
      email: Joi.string().email(),
    });
  }


  /**
   * Get all users with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated users data
   */
  async findAll(query = {}) {
    try {
      let users = this.db.get('users').value();

      // Apply filters
      if (query.role) {
        users = users.filter((user) => user.role === query.role);
      }
      if (query.email) {
        users = users.filter((user) => user.email.toLowerCase().includes(query.email.toLowerCase()));
      }

      // Apply sorting
      if (query.sort) {
        const [sortField, sortOrder] = query.sort.split(':');
        users.sort((a, b) => {
          let aVal = a[sortField];
          let bVal = b[sortField];

          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }

          if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          }
          return aVal < bVal ? 1 : -1;
        });
      }

      // Apply pagination
      const total = users.length;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const offset = (page - 1) * limit;

      const paginatedUsers = users.slice(offset, offset + limit);

      // Remove password from response
      const sanitizedUsers = paginatedUsers.map((user) => {
        const { password: _password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        data: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Object|null} User data or null if not found
   */
  async findById(id) {
    try {
      const user = this.db.get('users').find({ id }).value();
      if (!user) return null;

      // Remove password from response
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Object|null} User data or null if not found
   */
  async findByUsername(username) {
    try {
      const user = this.db.get('users').find({ username }).value();
      return user || null;
    } catch (error) {
      throw new Error(`Failed to fetch user by username: ${error.message}`);
    }
  }

  /**
   * Get user by email
   * @param {string} email - Email address
   * @returns {Object|null} User data or null if not found
   */
  async findByEmail(email) {
    try {
      const user = this.db.get('users').find({ email }).value();
      if (!user) return null;

      // Remove password from response
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} Created user (without password)
   */
  async create(userData) {
    try {
      const id = Date.now(); // Simple ID generation for simulation
      const now = new Date().toISOString();

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = {
        id,
        ...userData,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      };

      this.db.get('users').push(newUser).write();

      // Return user without password
      const { password: _password, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update user by ID
   * @param {number} id - User ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated user or null if not found
   */
  async update(id, updateData) {
    try {
      const user = this.db.get('users').find({ id });

      if (!user.value()) {
        return null;
      }

      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const updatedUser = {
        ...user.value(),
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      user.assign(updatedUser).write();

      // Return user without password
      const { password: _password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete user by ID
   * @param {number} id - User ID
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const user = this.db.get('users').find({ id });

      if (!user.value()) {
        return false;
      }

      user.remove().write();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Check if user exists
   * @param {number} id - User ID
   * @returns {boolean} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const user = this.db.get('users').find({ id }).value();
      return !!user;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error.message}`);
    }
  }

  /**
   * Check if username is unique
   * @param {string} username - Username
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {boolean} True if unique, false otherwise
   */
  async isUsernameUnique(username, excludeId = null) {
    try {
      const existingUser = this.db.get('users').find({ username }).value();
      return !existingUser || (excludeId && existingUser.id === excludeId);
    } catch (error) {
      throw new Error(`Failed to check username uniqueness: ${error.message}`);
    }
  }

  /**
   * Check if email is unique
   * @param {string} email - Email address
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {boolean} True if unique, false otherwise
   */
  async isEmailUnique(email, excludeId = null) {
    try {
      const existingUser = this.db.get('users').find({ email }).value();
      return !existingUser || (excludeId && existingUser.id === excludeId);
    } catch (error) {
      throw new Error(`Failed to check email uniqueness: ${error.message}`);
    }
  }

  /**
   * Verify user password
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Object|null} User data if valid, null otherwise
   */
  async verifyPassword(username, password) {
    try {
      const user = await this.findByUsername(username);
      if (!user) return null;

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;

      // Return user without password
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }
}

module.exports = User;
