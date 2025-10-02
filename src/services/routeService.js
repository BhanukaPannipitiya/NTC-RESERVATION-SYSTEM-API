const Route = require('../models/Route');
const logger = require('../utils/logger');

/**
 * Route Service - Business logic for route management
 * Handles CRUD operations, validation, and business rules for routes
 */
class RouteService {
  constructor() {
    this.routeModel = new Route();
  }

  /**
   * Initialize service with database connection
   * @param {Object} db - lowdb database instance
   */
  init(db) {
    this.routeModel.init(db);
    this.db = db;
  }

  /**
   * Get all routes with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated routes data
   */
  async getAllRoutes(query = {}) {
    try {
      logger.info('Fetching all routes', { query });

      const result = await this.routeModel.findAll(query);

      logger.info('Routes fetched successfully', {
        count: result.data.length,
        total: result.pagination.total,
        page: result.pagination.page,
      });

      return result;
    } catch (error) {
      logger.error('Failed to fetch routes', error);
      throw error;
    }
  }

  /**
   * Get route by ID
   * @param {number} id - Route ID
   * @returns {Object|null} Route data or null if not found
   */
  async getRouteById(id) {
    try {
      logger.info('Fetching route by ID', { id });

      const route = await this.routeModel.findById(id);

      if (route) {
        logger.info('Route found', { id, name: route.name });
      } else {
        logger.warn('Route not found', { id });
      }

      return route;
    } catch (error) {
      logger.error('Failed to fetch route by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Create new route
   * @param {Object} routeData - Route data
   * @returns {Object} Created route
   */
  async createRoute(routeData) {
    try {
      logger.info('Creating new route', { name: routeData.name });

      // Check if route name already exists
      const existingRoutes = await this.routeModel.findAll({});
      const nameExists = existingRoutes.data.some(
        (route) => route.name.toLowerCase() === routeData.name.toLowerCase(),
      );

      if (nameExists) {
        const error = new Error('Route name already exists');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      const newRoute = await this.routeModel.create(routeData);

      logger.info('Route created successfully', {
        id: newRoute.id,
        name: newRoute.name,
      });

      return newRoute;
    } catch (error) {
      logger.error('Failed to create route', {
        routeData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update route by ID
   * @param {number} id - Route ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated route or null if not found
   */
  async updateRoute(id, updateData) {
    try {
      logger.info('Updating route', { id, updateData });

      // Check if route exists
      const existingRoute = await this.routeModel.findById(id);
      if (!existingRoute) {
        const error = new Error('Route not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Check if new name conflicts with existing routes
      if (updateData.name && updateData.name !== existingRoute.name) {
        const allRoutes = await this.routeModel.findAll({});
        const nameExists = allRoutes.data.some(
          (route) => route.id !== id
          && route.name.toLowerCase() === updateData.name.toLowerCase(),
        );

        if (nameExists) {
          const error = new Error('Route name already exists');
          error.status = 409;
          error.name = 'ConflictError';
          throw error;
        }
      }

      const updatedRoute = await this.routeModel.update(id, updateData);

      logger.info('Route updated successfully', {
        id: updatedRoute.id,
        name: updatedRoute.name,
      });

      return updatedRoute;
    } catch (error) {
      logger.error('Failed to update route', {
        id,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete route by ID
   * @param {number} id - Route ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteRoute(id) {
    try {
      logger.info('Deleting route', { id });

      // Check if route exists
      const existingRoute = await this.routeModel.findById(id);
      if (!existingRoute) {
        const error = new Error('Route not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Check if route has associated buses
      const buses = this.db.get('buses').filter({ routeId: id }).value();
      if (buses.length > 0) {
        const error = new Error('Cannot delete route with associated buses');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      // Check if route has associated trips
      const trips = this.db.get('trips').filter({ routeId: id }).value();
      if (trips.length > 0) {
        const error = new Error('Cannot delete route with associated trips');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      const deleted = await this.routeModel.delete(id);

      if (deleted) {
        logger.info('Route deleted successfully', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete route', {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get routes by province
   * @param {string} province - Province name
   * @returns {Array} Array of routes in the province
   */
  async getRoutesByProvince(province) {
    try {
      logger.info('Fetching routes by province', { province });

      const result = await this.routeModel.findAll({ province });

      logger.info('Routes by province fetched', {
        province,
        count: result.data.length,
      });

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch routes by province', {
        province,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active routes only
   * @returns {Array} Array of active routes
   */
  async getActiveRoutes() {
    try {
      logger.info('Fetching active routes');

      const result = await this.routeModel.findAll({ status: 'active' });

      logger.info('Active routes fetched', {
        count: result.data.length,
      });

      return result.data;
    } catch (error) {
      logger.error('Failed to fetch active routes', { error: error.message });
      throw error;
    }
  }

  /**
   * Search routes by name or location
   * @param {string} searchTerm - Search term
   * @returns {Array} Array of matching routes
   */
  async searchRoutes(searchTerm) {
    try {
      logger.info('Searching routes', { searchTerm });

      const allRoutes = await this.routeModel.findAll({});
      const searchLower = searchTerm.toLowerCase();

      const matchingRoutes = allRoutes.data.filter((route) => route.name.toLowerCase().includes(searchLower)
        || route.startLocation.toLowerCase().includes(searchLower)
        || route.endLocation.toLowerCase().includes(searchLower)
        || route.province.toLowerCase().includes(searchLower));

      logger.info('Route search completed', {
        searchTerm,
        results: matchingRoutes.length,
      });

      return matchingRoutes;
    } catch (error) {
      logger.error('Failed to search routes', {
        searchTerm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get route statistics
   * @returns {Object} Route statistics
   */
  async getRouteStatistics() {
    try {
      logger.info('Fetching route statistics');

      const allRoutes = await this.routeModel.findAll({});
      const activeRoutes = await this.routeModel.findAll({ status: 'active' });

      const stats = {
        total: allRoutes.data.length,
        active: activeRoutes.data.length,
        inactive: allRoutes.data.length - activeRoutes.data.length,
        provinces: [...new Set(allRoutes.data.map((route) => route.province))],
        averageDistance: allRoutes.data.reduce((sum, route) => sum + route.distance, 0) / allRoutes.data.length,
      };

      logger.info('Route statistics fetched', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to fetch route statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate route data
   * @param {Object} routeData - Route data to validate
   * @returns {Object} Validation result
   */
  validateRouteData(routeData) {
    try {
      const { error, value } = Route.schema.validate(routeData, {
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
      logger.error('Route validation error', {
        routeData,
        error: validationError.message,
      });
      throw validationError;
    }
  }

  /**
   * Check if route exists
   * @param {number} id - Route ID
   * @returns {boolean} True if exists, false otherwise
   */
  async routeExists(id) {
    try {
      return await this.routeModel.exists(id);
    } catch (error) {
      logger.error('Failed to check route existence', { id, error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const routeService = new RouteService();

module.exports = routeService;
