const Bus = require('../models/Bus');
const logger = require('../utils/logger');

/**
 * Bus Service - Business logic for bus management
 * Handles CRUD operations, validation, and business rules for buses
 */
class BusService {
  constructor() {
    this.busModel = new Bus();
  }

  /**
   * Initialize service with database connection
   * @param {Object} db - lowdb database instance
   */
  init(db) {
    this.busModel.init(db);
    this.db = db;
  }

  /**
   * Get all buses with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated buses data
   */
  async getAllBuses(query = {}) {
    try {
      logger.info('Fetching all buses', { query });

      const result = await this.busModel.findAll(query);

      logger.info('Buses fetched successfully', {
        count: result.data.length,
        total: result.pagination.total,
        page: result.pagination.page,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch buses', error);
      throw error;
    }
  }

  /**
   * Get bus by ID
   * @param {number} id - Bus ID
   * @returns {Object|null} Bus data or null if not found
   */
  async getBusById(id) {
    try {
      logger.info('Fetching bus by ID', { id });

      const bus = await this.busModel.findById(id);

      if (bus) {
        logger.info('Bus found', { id, number: bus.number });
      } else {
        logger.warn('Bus not found', { id });
      }

      return bus;
    } catch (error) {
      logger.error('Failed to fetch bus by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get buses by route ID
   * @param {number} routeId - Route ID
   * @returns {Array} Array of buses for the route
   */
  async getBusesByRoute(routeId) {
    try {
      logger.info('Fetching buses by route', { routeId });

      const buses = await this.busModel.findByRouteId(routeId);

      logger.info('Buses by route fetched', {
        routeId,
        count: buses.length,
      });

      return buses;
    } catch (error) {
      logger.error('Failed to fetch buses by route', {
        routeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create new bus
   * @param {Object} busData - Bus data
   * @returns {Object} Created bus
   */
  async createBus(busData) {
    try {
      logger.info('Creating new bus', { number: busData.number });

      // Validate route exists
      const route = this.db.get('routes').find({ id: busData.routeId }).value();
      if (!route) {
        const error = new Error('Route not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Check if bus number already exists
      const isUnique = await this.busModel.isNumberUnique(busData.number);
      if (!isUnique) {
        const error = new Error('Bus number already exists');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      const newBus = await this.busModel.create(busData);

      logger.info('Bus created successfully', {
        id: newBus.id,
        number: newBus.number,
        routeId: newBus.routeId,
      });

      return newBus;
    } catch (error) {
      logger.error('Failed to create bus', {
        busData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update bus by ID
   * @param {number} id - Bus ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated bus or null if not found
   */
  async updateBus(id, updateData) {
    try {
      logger.info('Updating bus', { id, updateData });

      // Check if bus exists
      const existingBus = await this.busModel.findById(id);
      if (!existingBus) {
        const error = new Error('Bus not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Validate route exists if routeId is being updated
      if (updateData.routeId && updateData.routeId !== existingBus.routeId) {
        const route = this.db.get('routes').find({ id: updateData.routeId }).value();
        if (!route) {
          const error = new Error('Route not found');
          error.status = 404;
          error.name = 'NotFoundError';
          throw error;
        }
      }

      // Check if new bus number conflicts with existing buses
      if (updateData.number && updateData.number !== existingBus.number) {
        const isUnique = await this.busModel.isNumberUnique(updateData.number, id);
        if (!isUnique) {
          const error = new Error('Bus number already exists');
          error.status = 409;
          error.name = 'ConflictError';
          throw error;
        }
      }

      const updatedBus = await this.busModel.update(id, updateData);

      logger.info('Bus updated successfully', {
        id: updatedBus.id,
        number: updatedBus.number,
      });

      return updatedBus;
    } catch (error) {
      logger.error('Failed to update bus', {
        id,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete bus by ID
   * @param {number} id - Bus ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteBus(id) {
    try {
      logger.info('Deleting bus', { id });

      // Check if bus exists
      const existingBus = await this.busModel.findById(id);
      if (!existingBus) {
        const error = new Error('Bus not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Check if bus has associated trips
      const trips = this.db.get('trips').filter({ busId: id }).value();
      if (trips.length > 0) {
        const error = new Error('Cannot delete bus with associated trips');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      const deleted = await this.busModel.delete(id);

      if (deleted) {
        logger.info('Bus deleted successfully', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete bus', {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active buses only
   * @returns {Array} Array of active buses
   */
  async getActiveBuses() {
    try {
      logger.info('Fetching active buses');

      const result = await this.busModel.findAll({ status: 'active' });

      logger.info('Active buses fetched', {
        count: result.data.length,
      });

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch active buses', { error: error.message });
      throw error;
    }
  }

  /**
   * Get buses by operator
   * @param {string} operator - Operator name
   * @returns {Array} Array of buses for the operator
   */
  async getBusesByOperator(operator) {
    try {
      logger.info('Fetching buses by operator', { operator });

      const result = await this.busModel.findAll({ operator });

      logger.info('Buses by operator fetched', {
        operator,
        count: result.data.length,
      });

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch buses by operator', {
        operator,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search buses by number or operator
   * @param {string} searchTerm - Search term
   * @returns {Array} Array of matching buses
   */
  async searchBuses(searchTerm) {
    try {
      logger.info('Searching buses', { searchTerm });

      const allBuses = await this.busModel.findAll({});
      const searchLower = searchTerm.toLowerCase();

      const matchingBuses = allBuses.data.filter((bus) => bus.number.toLowerCase().includes(searchLower)
        || bus.operator.toLowerCase().includes(searchLower));

      logger.info('Bus search completed', {
        searchTerm,
        results: matchingBuses.length,
      });

      return matchingBuses;
    } catch (error) {
      logger.error('Failed to search buses', {
        searchTerm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get bus statistics
   * @returns {Object} Bus statistics
   */
  async getBusStatistics() {
    try {
      logger.info('Fetching bus statistics');

      const allBuses = await this.busModel.findAll({});
      const activeBuses = await this.busModel.findAll({ status: 'active' });

      const stats = {
        total: allBuses.data.length,
        active: activeBuses.data.length,
        inactive: allBuses.data.filter((bus) => bus.status === 'inactive').length,
        maintenance: allBuses.data.filter((bus) => bus.status === 'maintenance').length,
        operators: [...new Set(allBuses.data.map((bus) => bus.operator))],
        averageCapacity: allBuses.data.reduce((sum, bus) => sum + bus.capacity, 0) / allBuses.data.length,
        totalCapacity: allBuses.data.reduce((sum, bus) => sum + bus.capacity, 0),
      };

      logger.info('Bus statistics fetched', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to fetch bus statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get buses with capacity information
   * @param {number} minCapacity - Minimum capacity filter
   * @param {number} maxCapacity - Maximum capacity filter
   * @returns {Array} Array of buses within capacity range
   */
  async getBusesByCapacity(minCapacity, maxCapacity) {
    try {
      logger.info('Fetching buses by capacity', { minCapacity, maxCapacity });

      const allBuses = await this.busModel.findAll({});

      const filteredBuses = allBuses.data.filter((bus) => bus.capacity >= minCapacity && bus.capacity <= maxCapacity);

      logger.info('Buses by capacity fetched', {
        minCapacity,
        maxCapacity,
        count: filteredBuses.length,
      });

      return filteredBuses;
    } catch (error) {
      logger.error('Failed to fetch buses by capacity', {
        minCapacity,
        maxCapacity,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate bus data
   * @param {Object} busData - Bus data to validate
   * @returns {Object} Validation result
   */
  validateBusData(busData) {
    try {
      const { error, value } = Bus.schema.validate(busData, {
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
      logger.error('Bus validation error', {
        busData,
        error: validationError.message,
      });
      throw validationError;
    }
  }

  /**
   * Check if bus exists
   * @param {number} id - Bus ID
   * @returns {boolean} True if exists, false otherwise
   */
  async busExists(id) {
    try {
      return await this.busModel.exists(id);
    } catch (error) {
      logger.error('Failed to check bus existence', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get bus capacity
   * @param {number} busId - Bus ID
   * @returns {number} Bus capacity
   */
  async getBusCapacity(busId) {
    try {
      const bus = await this.busModel.findById(busId);
      return bus ? bus.capacity : 0;
    } catch (error) {
      logger.error('Failed to get bus capacity', { busId, error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const busService = new BusService();

module.exports = busService;
