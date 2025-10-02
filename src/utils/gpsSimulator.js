/**
 * GPS Location Simulator for Bus Tracking
 * Simulates real-time GPS updates for running trips
 */
class GPSSimulator {
  constructor() {
    this.runningTrips = new Map();
    this.updateInterval = null;
    this.isRunning = false;
  }

  /**
   * Start GPS simulation for running trips
   * @param {Object} db - lowdb database instance
   */
  start(db) {
    if (this.isRunning) {
      return;
    }

    this.db = db;
    this.isRunning = true;

    // Update locations every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateRunningTrips();
    }, 30000);

    console.log('GPS Simulator started - updating locations every 30 seconds');
  }

  /**
   * Stop GPS simulation
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('GPS Simulator stopped');
  }

  /**
   * Update locations for all running trips
   */
  async updateRunningTrips() {
    try {
      const runningTrips = this.db.get('trips').filter({ status: 'running' }).value();

      for (const trip of runningTrips) {
        await this.updateTripLocation(trip);
      }
    } catch (error) {
      console.error('Error updating running trips:', error);
    }
  }

  /**
   * Update location for a specific trip
   * @param {Object} trip - Trip object
   */
  async updateTripLocation(trip) {
    try {
      const route = this.db.get('routes').find({ id: trip.routeId }).value();
      if (!route) return;

      // Get current progress based on start time
      const now = new Date();
      const startTime = new Date(trip.startTime);
      const endTime = new Date(trip.endTime);

      // Calculate progress percentage (0 to 1)
      const totalDuration = endTime.getTime() - startTime.getTime();
      const elapsed = now.getTime() - startTime.getTime();
      const progress = Math.min(Math.max(elapsed / totalDuration, 0), 1);

      // Simulate movement along route
      const newLocation = this.calculateLocationAlongRoute(route, progress);

      // Add some random variation to simulate real GPS
      const variation = 0.001; // ~100m variation
      const latVariation = (Math.random() - 0.5) * variation;
      const lngVariation = (Math.random() - 0.5) * variation;

      const updatedLocation = {
        currentLat: newLocation.lat + latVariation,
        currentLng: newLocation.lng + lngVariation,
        updatedAt: now.toISOString(),
      };

      // Update trip in database
      this.db.get('trips')
        .find({ id: trip.id })
        .assign(updatedLocation)
        .write();

      // Update passenger count randomly (simulate boarding/alighting)
      const passengerChange = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      const newPassengerCount = Math.max(0, Math.min(
        trip.passengerCount + passengerChange,
        this.getBusCapacity(trip.busId),
      ));

      if (newPassengerCount !== trip.passengerCount) {
        this.db.get('trips')
          .find({ id: trip.id })
          .assign({ passengerCount: newPassengerCount })
          .write();
      }
    } catch (error) {
      console.error(`Error updating trip ${trip.id} location:`, error);
    }
  }

  /**
   * Calculate location along route based on progress
   * @param {Object} route - Route object
   * @param {number} progress - Progress percentage (0 to 1)
   * @returns {Object} Location coordinates
   */
  calculateLocationAlongRoute(route, progress) {
    // Route-specific coordinates (simplified linear interpolation)
    const routeCoordinates = this.getRouteCoordinates(route.id);

    if (!routeCoordinates) {
      return { lat: 6.9271, lng: 79.8612 }; // Default Colombo coordinates
    }

    const { start, end } = routeCoordinates;

    // Linear interpolation between start and end points
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;

    return { lat, lng };
  }

  /**
   * Get route-specific coordinates
   * @param {number} routeId - Route ID
   * @returns {Object|null} Route coordinates
   */
  getRouteCoordinates(routeId) {
    const routeCoords = {
      1: { // Colombo to Kandy
        start: { lat: 6.9271, lng: 79.8612 }, // Colombo
        end: { lat: 7.2906, lng: 80.6337 }, // Kandy
      },
      2: { // Colombo to Galle
        start: { lat: 6.9271, lng: 79.8612 }, // Colombo
        end: { lat: 6.0329, lng: 80.2169 }, // Galle
      },
      3: { // Colombo to Matara
        start: { lat: 6.9271, lng: 79.8612 }, // Colombo
        end: { lat: 5.9485, lng: 80.5493 }, // Matara
      },
      4: { // Colombo to Anuradhapura
        start: { lat: 6.9271, lng: 79.8612 }, // Colombo
        end: { lat: 8.3114, lng: 80.4037 }, // Anuradhapura
      },
      5: { // Colombo to Ampara
        start: { lat: 6.9271, lng: 79.8612 }, // Colombo
        end: { lat: 7.2975, lng: 81.6820 }, // Ampara
      },
    };

    return routeCoords[routeId] || null;
  }

  /**
   * Get bus capacity
   * @param {number} busId - Bus ID
   * @returns {number} Bus capacity
   */
  getBusCapacity(busId) {
    try {
      const bus = this.db.get('buses').find({ id: busId }).value();
      return bus ? bus.capacity : 50; // Default capacity
    } catch (error) {
      return 50; // Default capacity
    }
  }

  /**
   * Start a trip (change status to 'running')
   * @param {number} tripId - Trip ID
   */
  startTrip(tripId) {
    try {
      this.db.get('trips')
        .find({ id: tripId })
        .assign({
          status: 'running',
          updatedAt: new Date().toISOString(),
        })
        .write();

      console.log(`Trip ${tripId} started - GPS tracking enabled`);
    } catch (error) {
      console.error(`Error starting trip ${tripId}:`, error);
    }
  }

  /**
   * Complete a trip (change status to 'completed')
   * @param {number} tripId - Trip ID
   */
  completeTrip(tripId) {
    try {
      this.db.get('trips')
        .find({ id: tripId })
        .assign({
          status: 'completed',
          updatedAt: new Date().toISOString(),
        })
        .write();

      console.log(`Trip ${tripId} completed - GPS tracking disabled`);
    } catch (error) {
      console.error(`Error completing trip ${tripId}:`, error);
    }
  }

  /**
   * Get current status of GPS simulator
   * @returns {Object} Simulator status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      runningTripsCount: this.runningTrips.size,
      updateInterval: this.updateInterval ? '30 seconds' : 'stopped',
    };
  }
}

// Create singleton instance
const gpsSimulator = new GPSSimulator();

module.exports = gpsSimulator;
