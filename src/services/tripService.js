const Trip = require('../models/Trip');
const logger = require('../utils/logger');

/**
 * Trip Service - Business logic for trip management
 * Handles CRUD operations, validation, and business rules for trips
 */
class TripService {
  constructor() {
    this.tripModel = new Trip();
  }

  /**
   * Initialize service with database connection
   * @param {Object} db - lowdb database instance
   */
  init(db) {
    this.tripModel.init(db);
    this.db = db;
  }

  /**
   * Get all trips with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated trips data
   */
  async getAllTrips(query = {}) {
    try {
      logger.info('Fetching all trips', { query });

      const result = await this.tripModel.findAll(query);

      // Enrich trip data with route and bus information
      const enrichedTrips = result.data.map((trip) => this.enrichTripData(trip));

      logger.info('Trips fetched successfully', {
        count: enrichedTrips.length,
        total: result.pagination.total,
        page: result.pagination.page,
      });

      return {
        data: enrichedTrips,
        pagination: result.pagination,
      };
    } catch (error) {
      logger.error('Failed to fetch trips', error);
      throw error;
    }
  }

  /**
   * Get trip by ID
   * @param {number} id - Trip ID
   * @returns {Object|null} Trip data or null if not found
   */
  async getTripById(id) {
    try {
      logger.info('Fetching trip by ID', { id });

      const trip = await this.tripModel.findById(id);

      if (trip) {
        const enrichedTrip = this.enrichTripData(trip);
        logger.info('Trip found', { id, routeId: trip.routeId, status: trip.status });
        return enrichedTrip;
      }
      logger.warn('Trip not found', { id });
      return null;
    } catch (error) {
      logger.error('Failed to fetch trip by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get trips by route ID
   * @param {number} routeId - Route ID
   * @returns {Array} Array of trips for the route
   */
  async getTripsByRoute(routeId) {
    try {
      logger.info('Fetching trips by route', { routeId });

      const trips = await this.tripModel.findByRouteId(routeId);
      const enrichedTrips = trips.map((trip) => this.enrichTripData(trip));

      logger.info('Trips by route fetched', {
        routeId,
        count: enrichedTrips.length,
      });

      return enrichedTrips;
    } catch (error) {
      logger.error('Failed to fetch trips by route', {
        routeId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get running trips
   * @returns {Array} Array of running trips
   */
  async getRunningTrips() {
    try {
      logger.info('Fetching running trips');

      const trips = await this.tripModel.findRunningTrips();
      const enrichedTrips = trips.map((trip) => this.enrichTripData(trip));

      logger.info('Running trips fetched', {
        count: enrichedTrips.length,
      });

      return enrichedTrips;
    } catch (error) {
      logger.error('Failed to fetch running trips', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new trip
   * @param {Object} tripData - Trip data
   * @returns {Object} Created trip
   */
  async createTrip(tripData) {
    try {
      logger.info('Creating new trip', {
        routeId: tripData.routeId,
        busId: tripData.busId,
      });

      // Validate route exists
      const route = this.db.get('routes').find({ id: tripData.routeId }).value();
      if (!route) {
        const error = new Error('Route not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Validate bus exists
      const bus = this.db.get('buses').find({ id: tripData.busId }).value();
      if (!bus) {
        const error = new Error('Bus not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Check if bus is available during trip time
      const isAvailable = await this.tripModel.isBusAvailable(
        tripData.busId,
        tripData.startTime,
        tripData.endTime,
      );

      if (!isAvailable) {
        const error = new Error('Bus is not available during the specified time');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      const newTrip = await this.tripModel.create(tripData);
      const enrichedTrip = this.enrichTripData(newTrip);

      logger.info('Trip created successfully', {
        id: newTrip.id,
        routeId: newTrip.routeId,
        busId: newTrip.busId,
      });

      return enrichedTrip;
    } catch (error) {
      logger.error('Failed to create trip', {
        tripData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update trip by ID
   * @param {number} id - Trip ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated trip or null if not found
   */
  async updateTrip(id, updateData) {
    try {
      logger.info('Updating trip', { id, updateData });

      // Check if trip exists
      const existingTrip = await this.tripModel.findById(id);
      if (!existingTrip) {
        const error = new Error('Trip not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Validate route exists if routeId is being updated
      if (updateData.routeId && updateData.routeId !== existingTrip.routeId) {
        const route = this.db.get('routes').find({ id: updateData.routeId }).value();
        if (!route) {
          const error = new Error('Route not found');
          error.status = 404;
          error.name = 'NotFoundError';
          throw error;
        }
      }

      // Validate bus exists if busId is being updated
      if (updateData.busId && updateData.busId !== existingTrip.busId) {
        const bus = this.db.get('buses').find({ id: updateData.busId }).value();
        if (!bus) {
          const error = new Error('Bus not found');
          error.status = 404;
          error.name = 'NotFoundError';
          throw error;
        }
      }

      // Check bus availability if time or bus is being updated
      if ((updateData.startTime || updateData.endTime || updateData.busId)
          && existingTrip.status !== 'completed') {
        const startTime = updateData.startTime || existingTrip.startTime;
        const endTime = updateData.endTime || existingTrip.endTime;
        const busId = updateData.busId || existingTrip.busId;

        const isAvailable = await this.tripModel.isBusAvailable(
          busId,
          startTime,
          endTime,
          id,
        );

        if (!isAvailable) {
          const error = new Error('Bus is not available during the specified time');
          error.status = 409;
          error.name = 'ConflictError';
          throw error;
        }
      }

      const updatedTrip = await this.tripModel.update(id, updateData);
      const enrichedTrip = this.enrichTripData(updatedTrip);

      logger.info('Trip updated successfully', {
        id: updatedTrip.id,
        status: updatedTrip.status,
      });

      return enrichedTrip;
    } catch (error) {
      logger.error('Failed to update trip', {
        id,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update trip location
   * @param {number} tripId - Trip ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object|null} Updated trip or null if not found
   */
  async updateTripLocation(tripId, lat, lng) {
    try {
      logger.info('Updating trip location', { tripId, lat, lng });

      // Check if trip exists and is running
      const trip = await this.tripModel.findById(tripId);
      if (!trip) {
        const error = new Error('Trip not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      if (trip.status !== 'running') {
        const error = new Error('Trip is not running');
        error.status = 400;
        error.name = 'BadRequestError';
        throw error;
      }

      const updatedTrip = await this.tripModel.updateLocation(tripId, lat, lng);
      const enrichedTrip = this.enrichTripData(updatedTrip);

      logger.info('Trip location updated successfully', {
        tripId,
        lat,
        lng,
      });

      return enrichedTrip;
    } catch (error) {
      logger.error('Failed to update trip location', {
        tripId,
        lat,
        lng,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start trip (change status to 'running')
   * @param {number} id - Trip ID
   * @returns {Object|null} Updated trip or null if not found
   */
  async startTrip(id) {
    try {
      logger.info('Starting trip', { id });

      const trip = await this.tripModel.findById(id);
      if (!trip) {
        const error = new Error('Trip not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      if (trip.status !== 'scheduled') {
        const error = new Error('Trip is not scheduled');
        error.status = 400;
        error.name = 'BadRequestError';
        throw error;
      }

      const updatedTrip = await this.tripModel.update(id, { status: 'running' });
      const enrichedTrip = this.enrichTripData(updatedTrip);

      logger.info('Trip started successfully', { id });

      return enrichedTrip;
    } catch (error) {
      logger.error('Failed to start trip', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Complete trip (change status to 'completed')
   * @param {number} id - Trip ID
   * @returns {Object|null} Updated trip or null if not found
   */
  async completeTrip(id) {
    try {
      logger.info('Completing trip', { id });

      const trip = await this.tripModel.findById(id);
      if (!trip) {
        const error = new Error('Trip not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      if (trip.status !== 'running') {
        const error = new Error('Trip is not running');
        error.status = 400;
        error.name = 'BadRequestError';
        throw error;
      }

      const updatedTrip = await this.tripModel.update(id, { status: 'completed' });
      const enrichedTrip = this.enrichTripData(updatedTrip);

      logger.info('Trip completed successfully', { id });

      return enrichedTrip;
    } catch (error) {
      logger.error('Failed to complete trip', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete trip by ID
   * @param {number} id - Trip ID
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteTrip(id) {
    try {
      logger.info('Deleting trip', { id });

      // Check if trip exists
      const existingTrip = await this.tripModel.findById(id);
      if (!existingTrip) {
        const error = new Error('Trip not found');
        error.status = 404;
        error.name = 'NotFoundError';
        throw error;
      }

      // Only allow deletion of scheduled trips
      if (existingTrip.status !== 'scheduled') {
        const error = new Error('Cannot delete trip that is not scheduled');
        error.status = 409;
        error.name = 'ConflictError';
        throw error;
      }

      const deleted = await this.tripModel.delete(id);

      if (deleted) {
        logger.info('Trip deleted successfully', { id });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to delete trip', {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get trips by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Array of trips in date range
   */
  async getTripsByDateRange(startDate, endDate) {
    try {
      logger.info('Fetching trips by date range', { startDate, endDate });

      const result = await this.tripModel.findAll({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const enrichedTrips = result.data.map((trip) => this.enrichTripData(trip));

      logger.info('Trips by date range fetched', {
        startDate,
        endDate,
        count: enrichedTrips.length,
      });

      return enrichedTrips;
    } catch (error) {
      logger.error('Failed to fetch trips by date range', {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get trip statistics
   * @returns {Object} Trip statistics
   */
  async getTripStatistics() {
    try {
      logger.info('Fetching trip statistics');

      const allTrips = await this.tripModel.findAll({});
      const scheduledTrips = await this.tripModel.findAll({ status: 'scheduled' });
      const runningTrips = await this.tripModel.findAll({ status: 'running' });
      const completedTrips = await this.tripModel.findAll({ status: 'completed' });

      const stats = {
        total: allTrips.data.length,
        scheduled: scheduledTrips.data.length,
        running: runningTrips.data.length,
        completed: completedTrips.data.length,
        cancelled: allTrips.data.filter((trip) => trip.status === 'cancelled').length,
        averagePassengers: allTrips.data.reduce((sum, trip) => sum + trip.passengerCount, 0) / allTrips.data.length,
        totalPassengers: allTrips.data.reduce((sum, trip) => sum + trip.passengerCount, 0),
      };

      logger.info('Trip statistics fetched', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to fetch trip statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Enrich trip data with route and bus information
   * @param {Object} trip - Trip object
   * @returns {Object} Enriched trip object
   */
  enrichTripData(trip) {
    try {
      const route = this.db.get('routes').find({ id: trip.routeId }).value();
      const bus = this.db.get('buses').find({ id: trip.busId }).value();

      return {
        ...trip,
        route: route ? {
          id: route.id,
          name: route.name,
          startLocation: route.startLocation,
          endLocation: route.endLocation,
          distance: route.distance,
          province: route.province,
        } : null,
        bus: bus ? {
          id: bus.id,
          number: bus.number,
          capacity: bus.capacity,
          operator: bus.operator,
        } : null,
      };
    } catch (error) {
      logger.error('Failed to enrich trip data', { tripId: trip.id, error: error.message });
      return trip; // Return original trip if enrichment fails
    }
  }

  /**
   * Validate trip data
   * @param {Object} tripData - Trip data to validate
   * @returns {Object} Validation result
   */
  validateTripData(tripData) {
    try {
      const { error, value } = Trip.schema.validate(tripData, {
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
      logger.error('Trip validation error', {
        tripData,
        error: validationError.message,
      });
      throw validationError;
    }
  }

  /**
   * Check if trip exists
   * @param {number} id - Trip ID
   * @returns {boolean} True if exists, false otherwise
   */
  async tripExists(id) {
    try {
      return await this.tripModel.exists(id);
    } catch (error) {
      logger.error('Failed to check trip existence', { id, error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const tripService = new TripService();

module.exports = tripService;
