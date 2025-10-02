const tripService = require('../services/tripService');
const logger = require('../utils/logger');

/**
 * Trips Controller - HTTP request handling for trip endpoints
 */
class TripsController {
  constructor() {
    this.tripService = tripService;
  }

  init(db) {
    this.tripService.init(db);
  }

  async getAllTrips(req, res) {
    try {
      const { query } = req;
      const result = await this.tripService.getAllTrips(query);

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'X-Total-Count': result.pagination.total,
        'X-Page': result.pagination.page,
        'X-Limit': result.pagination.limit,
        'X-Total-Pages': result.pagination.pages,
      });

      const links = {
        self: { href: `/v1/trips?page=${query.page}&limit=${query.limit}`, method: 'GET' },
      };

      if (result.pagination.page > 1) {
        links.prev = { href: `/v1/trips?page=${result.pagination.page - 1}&limit=${query.limit}`, method: 'GET' };
      }
      if (result.pagination.page < result.pagination.pages) {
        links.next = { href: `/v1/trips?page=${result.pagination.page + 1}&limit=${query.limit}`, method: 'GET' };
      }

      res.status(200).json({
        message: 'Trips retrieved successfully',
        data: result.data,
        pagination: result.pagination,
        links,
      });
    } catch (error) {
      logger.error('Get all trips controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trips Error',
        message: error.message || 'Failed to retrieve trips',
      });
    }
  }

  async getTripById(req, res) {
    try {
      const { id } = req.params;
      const trip = await this.tripService.getTripById(parseInt(id, 10));

      if (!trip) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Trip not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
        ETag: `"${trip.id}-${trip.updatedAt}"`,
      });

      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === `"${trip.id}-${trip.updatedAt}"`) {
        return res.status(304).end();
      }

      res.status(200).json({
        message: 'Trip retrieved successfully',
        data: trip,
        links: {
          self: { href: `/v1/trips/${trip.id}`, method: 'GET' },
          update: { href: `/v1/trips/${trip.id}`, method: 'PUT' },
          delete: { href: `/v1/trips/${trip.id}`, method: 'DELETE' },
          start: { href: `/v1/trips/${trip.id}/start`, method: 'POST' },
          complete: { href: `/v1/trips/${trip.id}/complete`, method: 'POST' },
        },
      });
    } catch (error) {
      logger.error('Get trip by ID controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trip Error',
        message: error.message || 'Failed to retrieve trip',
      });
    }
  }

  async createTrip(req, res) {
    try {
      const tripData = req.body;
      const newTrip = await this.tripService.createTrip(tripData);

      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/trips/${newTrip.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });

      res.status(201).json({
        message: 'Trip created successfully',
        data: newTrip,
        links: {
          self: { href: `/v1/trips/${newTrip.id}`, method: 'GET' },
          update: { href: `/v1/trips/${newTrip.id}`, method: 'PUT' },
          delete: { href: `/v1/trips/${newTrip.id}`, method: 'DELETE' },
          start: { href: `/v1/trips/${newTrip.id}/start`, method: 'POST' },
        },
      });
    } catch (error) {
      logger.error('Create trip controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trip Creation Error',
        message: error.message || 'Failed to create trip',
      });
    }
  }

  async updateTrip(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedTrip = await this.tripService.updateTrip(parseInt(id, 10), updateData);

      if (!updatedTrip) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Trip not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        Location: `/v1/trips/${updatedTrip.id}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedTrip.updatedAt,
      });

      res.status(200).json({
        message: 'Trip updated successfully',
        data: updatedTrip,
        links: {
          self: { href: `/v1/trips/${updatedTrip.id}`, method: 'GET' },
          update: { href: `/v1/trips/${updatedTrip.id}`, method: 'PUT' },
          delete: { href: `/v1/trips/${updatedTrip.id}`, method: 'DELETE' },
        },
      });
    } catch (error) {
      logger.error('Update trip controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trip Update Error',
        message: error.message || 'Failed to update trip',
      });
    }
  }

  async deleteTrip(req, res) {
    try {
      const { id } = req.params;
      const deleted = await this.tripService.deleteTrip(parseInt(id, 10));

      if (!deleted) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Trip not found',
        });
      }

      res.status(204).end();
    } catch (error) {
      logger.error('Delete trip controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trip Deletion Error',
        message: error.message || 'Failed to delete trip',
      });
    }
  }

  async startTrip(req, res) {
    try {
      const { id } = req.params;
      const updatedTrip = await this.tripService.startTrip(parseInt(id, 10));

      if (!updatedTrip) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Trip not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedTrip.updatedAt,
      });

      res.status(200).json({
        message: 'Trip started successfully',
        data: updatedTrip,
        links: {
          self: { href: `/v1/trips/${updatedTrip.id}`, method: 'GET' },
          complete: { href: `/v1/trips/${updatedTrip.id}/complete`, method: 'POST' },
        },
      });
    } catch (error) {
      logger.error('Start trip controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trip Start Error',
        message: error.message || 'Failed to start trip',
      });
    }
  }

  async completeTrip(req, res) {
    try {
      const { id } = req.params;
      const updatedTrip = await this.tripService.completeTrip(parseInt(id, 10));

      if (!updatedTrip) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Trip not found',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedTrip.updatedAt,
      });

      res.status(200).json({
        message: 'Trip completed successfully',
        data: updatedTrip,
        links: {
          self: { href: `/v1/trips/${updatedTrip.id}`, method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Complete trip controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Trip Complete Error',
        message: error.message || 'Failed to complete trip',
      });
    }
  }

  async getRunningTrips(req, res) {
    try {
      const trips = await this.tripService.getRunningTrips();

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
        'X-Total-Count': trips.length,
      });

      res.status(200).json({
        message: 'Running trips retrieved successfully',
        data: trips,
        links: {
          self: { href: '/v1/trips/running', method: 'GET' },
          all: { href: '/v1/trips', method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Get running trips controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Running Trips Error',
        message: error.message || 'Failed to retrieve running trips',
      });
    }
  }
}

const tripsController = new TripsController();
module.exports = tripsController;
