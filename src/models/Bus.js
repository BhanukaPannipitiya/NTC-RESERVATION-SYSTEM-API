const Joi = require('joi');

/**
 * Bus model with Joi validation schemas
 * Represents buses operating on routes
 */
class Bus {
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
   * Joi schema for bus creation/update validation
   */
  static get schema() {
    return Joi.object({
      number: Joi.string().pattern(/^[A-Z]{2}-[A-Z]{2}[0-9]{3}$/).required(),
      routeId: Joi.number().integer().positive().required(),
      capacity: Joi.number().integer().min(20).max(100)
        .required(),
      status: Joi.string().valid('active', 'inactive', 'maintenance').default('active'),
      operator: Joi.string().min(3).max(100).required(),
    });
  }

  /**
   * Joi schema for bus ID validation
   */
  static get idSchema() {
    return Joi.number().integer().positive().required();
  }

  /**
   * Joi schema for bus query parameters
   */
  static get querySchema() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100)
        .default(10),
      sort: Joi.string().pattern(/^(number|capacity|createdAt):(asc|desc)$/).default('number:asc'),
      routeId: Joi.number().integer().positive(),
      status: Joi.string().valid('active', 'inactive', 'maintenance'),
      operator: Joi.string(),
    });
  }

  /**
   * Get all buses with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated buses data
   */
  async findAll(query = {}) {
    try {
      let buses = this.db.get('buses').value();

      // Apply filters
      if (query.routeId) {
        buses = buses.filter((bus) => bus.routeId === parseInt(query.routeId, 10));
      }
      if (query.status) {
        buses = buses.filter((bus) => bus.status === query.status);
      }
      if (query.operator) {
        buses = buses.filter((bus) => bus.operator.toLowerCase().includes(query.operator.toLowerCase()));
      }

      // Apply sorting
      if (query.sort) {
        const [sortField, sortOrder] = query.sort.split(':');
        buses.sort((a, b) => {
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
      const total = buses.length;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const offset = (page - 1) * limit;

      const paginatedBuses = buses.slice(offset, offset + limit);

      return {
        data: paginatedBuses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch buses: ${error.message}`);
    }
  }

  /**
   * Get bus by ID
   * @param {number} id - Bus ID
   * @returns {Object|null} Bus data or null if not found
   */
  async findById(id) {
    try {
      const bus = this.db.get('buses').find({ id }).value();
      return bus || null;
    } catch (error) {
      throw new Error(`Failed to fetch bus: ${error.message}`);
    }
  }

  /**
   * Get buses by route ID
   * @param {number} routeId - Route ID
   * @returns {Array} Array of buses for the route
   */
  async findByRouteId(routeId) {
    try {
      const buses = this.db.get('buses').filter({ routeId }).value();
      return buses;
    } catch (error) {
      throw new Error(`Failed to fetch buses by route: ${error.message}`);
    }
  }

  /**
   * Create new bus
   * @param {Object} busData - Bus data
   * @returns {Object} Created bus
   */
  async create(busData) {
    try {
      const id = Date.now(); // Simple ID generation for simulation
      const now = new Date().toISOString();

      const newBus = {
        id,
        ...busData,
        createdAt: now,
        updatedAt: now,
      };

      this.db.get('buses').push(newBus).write();
      return newBus;
    } catch (error) {
      throw new Error(`Failed to create bus: ${error.message}`);
    }
  }

  /**
   * Update bus by ID
   * @param {number} id - Bus ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated bus or null if not found
   */
  async update(id, updateData) {
    try {
      const bus = this.db.get('buses').find({ id });

      if (!bus.value()) {
        return null;
      }

      const updatedBus = {
        ...bus.value(),
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      bus.assign(updatedBus).write();
      return updatedBus;
    } catch (error) {
      throw new Error(`Failed to update bus: ${error.message}`);
    }
  }

  /**
   * Delete bus by ID
   * @param {number} id - Bus ID
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const bus = this.db.get('buses').find({ id });

      if (!bus.value()) {
        return false;
      }

      bus.remove().write();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete bus: ${error.message}`);
    }
  }

  /**
   * Check if bus exists
   * @param {number} id - Bus ID
   * @returns {boolean} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const bus = this.db.get('buses').find({ id }).value();
      return !!bus;
    } catch (error) {
      throw new Error(`Failed to check bus existence: ${error.message}`);
    }
  }

  /**
   * Check if bus number is unique
   * @param {string} number - Bus number
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {boolean} True if unique, false otherwise
   */
  async isNumberUnique(number, excludeId = null) {
    try {
      const existingBus = this.db.get('buses').find({ number }).value();
      return !existingBus || (excludeId && existingBus.id === excludeId);
    } catch (error) {
      throw new Error(`Failed to check bus number uniqueness: ${error.message}`);
    }
  }
}

module.exports = Bus;
