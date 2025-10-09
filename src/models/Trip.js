const Joi = require('joi');

/**
 * Trip model with Joi validation schemas
 * Represents scheduled bus trips with real-time tracking
 */
class Trip {
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
   * Joi schema for trip creation/update validation
   */
  static get schema() {
    return Joi.object({
      routeId: Joi.number().integer().positive().required(),
      busId: Joi.number().integer().positive().required(),
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().min(Joi.ref('startTime')).required(),
      status: Joi.string().valid('scheduled', 'running', 'completed', 'cancelled').default('scheduled'),
      currentLat: Joi.number().min(-90).max(90).default(6.9271), // Default Colombo coordinates
      currentLng: Joi.number().min(-180).max(180).default(79.8612),
      passengerCount: Joi.number().integer().min(0).default(0),
    });
  }

  /**
   * Joi schema for trip ID validation
   */
  static get idSchema() {
    return Joi.number().integer().positive().required();
  }

  /**
   * Joi schema for trip query parameters
   */
  static get querySchema() {
    return Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100)
        .default(10),
      sort: Joi.string().pattern(/^(startTime|endTime|createdAt):(asc|desc)$/).default('startTime:asc'),
      routeId: Joi.number().integer().positive(),
      busId: Joi.number().integer().positive(),
      status: Joi.string().valid('scheduled', 'running', 'completed', 'cancelled'),
      date: Joi.date().iso(),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
    });
  }

  /**
   * Joi schema for location update validation
   */
  static get locationUpdateSchema() {
    return Joi.object({
      tripId: Joi.number().integer().positive().required(),
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    });
  }

  /**
   * Get all trips with pagination and filtering
   * @param {Object} query - Query parameters
   * @returns {Object} Paginated trips data
   */
  async findAll(query = {}) {
    try {
      let trips = this.db.get('trips').value();

      // Apply filters
      if (query.routeId) {
        trips = trips.filter((trip) => trip.routeId === parseInt(query.routeId, 10));
      }
      if (query.busId) {
        trips = trips.filter((trip) => trip.busId === parseInt(query.busId, 10));
      }
      if (query.status) {
        trips = trips.filter((trip) => trip.status === query.status);
      }
      if (query.date) {
        const targetDate = new Date(query.date).toISOString().split('T')[0];
        trips = trips.filter((trip) => {
          const tripDate = new Date(trip.startTime).toISOString().split('T')[0];
          return tripDate === targetDate;
        });
      }
      if (query.startDate) {
        const startDate = new Date(query.startDate);
        trips = trips.filter((trip) => new Date(trip.startTime) >= startDate);
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        trips = trips.filter((trip) => new Date(trip.startTime) <= endDate);
      }

      // Apply sorting
      if (query.sort) {
        const [sortField, sortOrder] = query.sort.split(':');
        trips.sort((a, b) => {
          let aVal = a[sortField];
          let bVal = b[sortField];

          if (aVal instanceof Date) {
            aVal = aVal.getTime();
            bVal = bVal.getTime();
          }

          if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          }
          return aVal < bVal ? 1 : -1;
        });
      }

      // Apply pagination
      const total = trips.length;
      const page = query.page ? parseInt(query.page, 10) : 1;
      const limit = query.limit ? parseInt(query.limit, 10) : 10;
      const offset = (page - 1) * limit;

      const paginatedTrips = trips.slice(offset, offset + limit);

      return {
        data: paginatedTrips,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }
  }

  /**
   * Get trip by ID
   * @param {number} id - Trip ID
   * @returns {Object|null} Trip data or null if not found
   */
  async findById(id) {
    try {
      const trip = this.db.get('trips').find({ id }).value();
      return trip || null;
    } catch (error) {
      throw new Error(`Failed to fetch trip: ${error.message}`);
    }
  }

  /**
   * Get trips by route ID
   * @param {number} routeId - Route ID
   * @returns {Array} Array of trips for the route
   */
  async findByRouteId(routeId) {
    try {
      const trips = this.db.get('trips').filter({ routeId }).value();
      return trips;
    } catch (error) {
      throw new Error(`Failed to fetch trips by route: ${error.message}`);
    }
  }

  /**
   * Get running trips (status: 'running')
   * @returns {Array} Array of running trips
   */
  async findRunningTrips() {
    try {
      const trips = this.db.get('trips').filter({ status: 'running' }).value();
      return trips;
    } catch (error) {
      throw new Error(`Failed to fetch running trips: ${error.message}`);
    }
  }

  /**
   * Create new trip
   * @param {Object} tripData - Trip data
   * @returns {Object} Created trip
   */
  async create(tripData) {
    try {
      const id = Date.now(); // Simple ID generation for simulation
      const now = new Date().toISOString();

      const newTrip = {
        id,
        ...tripData,
        createdAt: now,
        updatedAt: now,
      };

      this.db.get('trips').push(newTrip).write();
      return newTrip;
    } catch (error) {
      throw new Error(`Failed to create trip: ${error.message}`);
    }
  }

  /**
   * Update trip by ID
   * @param {number} id - Trip ID
   * @param {Object} updateData - Update data
   * @returns {Object|null} Updated trip or null if not found
   */
  async update(id, updateData) {
    try {
      const trip = this.db.get('trips').find({ id });

      if (!trip.value()) {
        return null;
      }

      const updatedTrip = {
        ...trip.value(),
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      trip.assign(updatedTrip).write();
      return updatedTrip;
    } catch (error) {
      throw new Error(`Failed to update trip: ${error.message}`);
    }
  }

  /**
   * Update trip location
   * @param {number} tripId - Trip ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object|null} Updated trip or null if not found
   */
  async updateLocation(tripId, lat, lng) {
    try {
      const trip = this.db.get('trips').find({ id: tripId });

      if (!trip.value()) {
        return null;
      }

      const updatedTrip = {
        ...trip.value(),
        currentLat: lat,
        currentLng: lng,
        updatedAt: new Date().toISOString(),
      };

      trip.assign(updatedTrip).write();
      return updatedTrip;
    } catch (error) {
      throw new Error(`Failed to update trip location: ${error.message}`);
    }
  }

  /**
   * Delete trip by ID
   * @param {number} id - Trip ID
   * @returns {boolean} True if deleted, false if not found
   */
  async delete(id) {
    try {
      const trip = this.db.get('trips').find({ id });

      if (!trip.value()) {
        return false;
      }

      trip.remove().write();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete trip: ${error.message}`);
    }
  }

  /**
   * Check if trip exists
   * @param {number} id - Trip ID
   * @returns {boolean} True if exists, false otherwise
   */
  async exists(id) {
    try {
      const trip = this.db.get('trips').find({ id }).value();
      return !!trip;
    } catch (error) {
      throw new Error(`Failed to check trip existence: ${error.message}`);
    }
  }

  /**
   * Check for bus availability during trip time
   * @param {number} busId - Bus ID
   * @param {Date} startTime - Trip start time
   * @param {Date} endTime - Trip end time
   * @param {number} excludeTripId - Trip ID to exclude (for updates)
   * @returns {boolean} True if bus is available, false otherwise
   */
  async isBusAvailable(busId, startTime, endTime, excludeTripId = null) {
    try {
      const conflictingTrips = this.db.get('trips')
        .filter((trip) => {
          if (trip.busId !== busId) return false;
          if (excludeTripId && trip.id === excludeTripId) return false;
          if (trip.status === 'cancelled') return false;

          const tripStart = new Date(trip.startTime);
          const tripEnd = new Date(trip.endTime);
          const newStart = new Date(startTime);
          const newEnd = new Date(endTime);

          // Check for time overlap
          return (newStart < tripEnd && newEnd > tripStart);
        })
        .value();

      return conflictingTrips.length === 0;
    } catch (error) {
      throw new Error(`Failed to check bus availability: ${error.message}`);
    }
  }
}

module.exports = Trip;
