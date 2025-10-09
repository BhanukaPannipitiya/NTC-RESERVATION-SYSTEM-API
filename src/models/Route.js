const Joi = require('joi');

/**
 * Route model with Joi validation schemas
 * Represents inter-provincial bus routes in Sri Lanka
 */
class Route {
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
   * Joi schema for route creation/update validation
   */
  static get schema() {
    return Joi.object({
      name: Joi.string().min(3).max(100).required(),
      startLocation: Joi.string().min(2).max(50).required(),
      endLocation: Joi.string().min(2).max(50).required(),
      distance: Joi.number().positive().max(1000).required(),
      province: Joi.string().min(5).max(100).required(),
      status: Joi.string().valid('active', 'inactive').default('active'),
    });
  }

  /**
   * Joi schema for route ID validation
   */
  static get idSchema() {
    return Joi.number().integer().positive().required();
  }

  /**
   * Joi schema for route query parameters
   */
  static get querySchema() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100)
        .default(10),
      sort: Joi.string().pattern(/^(name|distance|createdAt):(asc|desc)$/).default('name:asc'),
      status: Joi.string().valid('active', 'inactive'),
      province: Joi.string(),
    });
  }

  /**
   * Get all routes with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated routes data
   */
  async findAll(query = {}) {
    try {
      let routes = this.db.get('routes').value();

      // Apply filters
      if (query.status) {
        routes = routes.filter((route) => route.status === query.status);
      }
      if (query.province) {
        routes = routes.filter((route) => route.province.toLowerCase().includes(query.province.toLowerCase()));
      }

      // Apply sorting
      if (query.sort) {
        const [sortField, sortOrder] = query.sort.split(':');
        routes.sort((a, b) => {
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
      const total = routes.length;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const offset = (page - 1) * limit;

      const paginatedRoutes = routes.slice(offset, offset + limit);

      return {
        data: paginatedRoutes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch routes: ${error.message}`);
    }
  }

  /**
   * Get route by ID
   * @param {number} id - Route ID
   * @returns {Object|null} Route data or null if not found
   */
  async findById(id) {
    try {
      const route = this.db.get('routes').find({ id }).value();
      return route || null;
    } catch (error) {
      throw new Error(`Failed to fetch route: ${error.message}`);
    }
  }

  /**
   * Create new route
   * @param {Object} routeData - Route data
   * @returns {Object} Created route
   */
  async create(routeData) {
    try {
      const id = Date.now(); // Simple ID generation for simulation
      const now = new Date().toISOString();

      const newRoute = {
        id,
        ...routeData,
        createdAt: now,
        updatedAt: now,
      };

      this.db.get('routes').push(newRoute).write();
      return newRoute;
    } catch (error) {
      throw new Error(`Failed to create route: ${error.message}`);
    }
  }

  /**
   * Update route by ID
   * @param {number} id - Route ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated route or null if not found
   */
  async update(id, updateData) {
    try {
      const route = this.db.get('routes').find({ id });

      if (!route.value()) {
        return null;
      }

      const updatedRoute = {
        ...route.value(),
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      route.assign(updatedRoute).write();
      return updatedRoute;
    } catch (error) {
      throw new Error(`Failed to update route: ${error.message}`);
    }
  }

  /**
   * Delete route by ID
   * @param {number} id - Route ID
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const route = this.db.get('routes').find({ id });

      if (!route.value()) {
        return false;
      }

      route.remove().write();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete route: ${error.message}`);
    }
  }

  /**
   * Check if route exists
   * @param {number} id - Route ID
   * @returns {boolean} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const route = this.db.get('routes').find({ id }).value();
      return !!route;
    } catch (error) {
      throw new Error(`Failed to check route existence: ${error.message}`);
    }
  }
}

module.exports = Route;
