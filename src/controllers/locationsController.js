const tripService = require('../services/tripService');
const logger = require('../utils/logger');

/**
 * Locations Controller - HTTP request handling for location update endpoints
 */
class LocationsController {
  constructor() {
    this.tripService = tripService;
  }

  init(db) {
    this.tripService.init(db);
  }

  async updateLocation(req, res) {
    try {
      const { tripId, lat, lng } = req.body;
      const updatedTrip = await this.tripService.updateTripLocation(tripId, lat, lng);

      if (!updatedTrip) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Trip not found or not running',
        });
      }

      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Updated-At': updatedTrip.updatedAt,
        'X-Location-Updated': 'true',
      });

      res.status(200).json({
        message: 'Location updated successfully',
        data: {
          tripId: updatedTrip.id,
          location: {
            lat: updatedTrip.currentLat,
            lng: updatedTrip.currentLng,
          },
          updatedAt: updatedTrip.updatedAt,
        },
        links: {
          self: { href: '/v1/locations', method: 'POST' },
          trip: { href: `/v1/trips/${updatedTrip.id}`, method: 'GET' },
        },
      });
    } catch (error) {
      logger.error('Update location controller error', error);
      res.status(error.status || 500).json({
        error: error.name || 'Location Update Error',
        message: error.message || 'Failed to update location',
      });
    }
  }
}

const locationsController = new LocationsController();
module.exports = locationsController;
