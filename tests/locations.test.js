const request = require('supertest');
const app = require('../src/app');

describe('Locations API', () => {
  let authToken;
  let operatorToken;
  let commuterToken;
  let runningTripId;

  beforeAll(async () => {
    // Login as NTC admin
    const loginResponse = await request(app.app)
      .post('/v1/auth/login')
      .send({
        username: 'ntc_admin',
        password: 'pass',
      });

    authToken = loginResponse.body.data.token;

    // Login as operator
    const operatorResponse = await request(app.app)
      .post('/v1/auth/login')
      .send({
        username: 'operator1',
        password: 'pass',
      });

    operatorToken = operatorResponse.body.data.token;

    // Login as commuter
    const commuterResponse = await request(app.app)
      .post('/v1/auth/login')
      .send({
        username: 'commuter1',
        password: 'pass',
      });

    commuterToken = commuterResponse.body.data.token;

    // Create a running trip for location updates
    const startTime = new Date(Date.now() - 1800000); // 30 minutes ago
    const endTime = new Date(Date.now() + 1800000); // 30 minutes from now

    const newTrip = {
      routeId: 1,
      busId: 1,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: 'running',
      passengerCount: 25,
      currentLat: 6.9271,
      currentLng: 79.8612,
    };

    const createResponse = await request(app.app)
      .post('/v1/trips')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newTrip)
      .expect(201);

    runningTripId = createResponse.body.data.id;
  });

  describe('POST /v1/locations', () => {
    it('should update trip location with valid data (Operator)', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9281,
        lng: 79.8622,
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data).toHaveProperty('tripId', runningTripId);
      expect(response.body.data).toHaveProperty('lat', locationUpdate.lat);
      expect(response.body.data).toHaveProperty('lng', locationUpdate.lng);
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should update trip location with valid data (NTC admin)', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9291,
        lng: 79.8632,
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data).toHaveProperty('tripId', runningTripId);
      expect(response.body.data).toHaveProperty('lat', locationUpdate.lat);
      expect(response.body.data).toHaveProperty('lng', locationUpdate.lng);
    });

    it('should return 401 without authentication', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .send(locationUpdate)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', 'Bearer invalid_token')
        .send(locationUpdate)
        .expect(401);
    });

    it('should return 403 for commuter role', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(locationUpdate)
        .expect(403);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteLocationUpdate = {
        tripId: runningTripId,
        // Missing lat, lng
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(incompleteLocationUpdate)
        .expect(400);
    });

    it('should return 400 with missing trip ID', async () => {
      const incompleteLocationUpdate = {
        lat: 6.9301,
        lng: 79.8642,
        // Missing tripId
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(incompleteLocationUpdate)
        .expect(400);
    });

    it('should return 400 with missing latitude', async () => {
      const incompleteLocationUpdate = {
        tripId: runningTripId,
        lng: 79.8642,
        // Missing lat
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(incompleteLocationUpdate)
        .expect(400);
    });

    it('should return 400 with missing longitude', async () => {
      const incompleteLocationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        // Missing lng
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(incompleteLocationUpdate)
        .expect(400);
    });

    it('should return 400 with invalid trip ID', async () => {
      const locationUpdate = {
        tripId: 'invalid_id',
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with negative trip ID', async () => {
      const locationUpdate = {
        tripId: -1,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with zero trip ID', async () => {
      const locationUpdate = {
        tripId: 0,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with invalid latitude (too high)', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 91, // Invalid: > 90
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with invalid latitude (too low)', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: -91, // Invalid: < -90
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with invalid longitude (too high)', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: 181, // Invalid: > 180
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with invalid longitude (too low)', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: -181, // Invalid: < -180
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const locationUpdate = {
        tripId: 'not_a_number',
        lat: 'not_a_number',
        lng: 'not_a_number',
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 404 for non-existent trip', async () => {
      const locationUpdate = {
        tripId: 999,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(404);
    });

    it('should return 400 if trip is not running', async () => {
      // Create a scheduled trip
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 2,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      const createResponse = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTrip)
        .expect(201);

      const scheduledTripId = createResponse.body.data.id;

      const locationUpdate = {
        tripId: scheduledTripId,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 if trip is completed', async () => {
      // Create a completed trip
      const startTime = new Date(Date.now() - 7200000); // 2 hours ago
      const endTime = new Date(Date.now() - 3600000); // 1 hour ago

      const newTrip = {
        routeId: 1,
        busId: 3,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'completed',
        passengerCount: 30,
      };

      const createResponse = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTrip)
        .expect(201);

      const completedTripId = createResponse.body.data.id;

      const locationUpdate = {
        tripId: completedTripId,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should return 400 if trip is cancelled', async () => {
      // Create a cancelled trip
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 4,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'cancelled',
        passengerCount: 0,
      };

      const createResponse = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTrip)
        .expect(201);

      const cancelledTripId = createResponse.body.data.id;

      const locationUpdate = {
        tripId: cancelledTripId,
        lat: 6.9301,
        lng: 79.8642,
      };

      await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(400);
    });

    it('should accept valid latitude at boundary values', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 90, // Valid: exactly 90
        lng: 79.8642,
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data.lat).toBe(90);
    });

    it('should accept valid latitude at negative boundary values', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: -90, // Valid: exactly -90
        lng: 79.8642,
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data.lat).toBe(-90);
    });

    it('should accept valid longitude at boundary values', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: 180, // Valid: exactly 180
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data.lng).toBe(180);
    });

    it('should accept valid longitude at negative boundary values', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9301,
        lng: -180, // Valid: exactly -180
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data.lng).toBe(-180);
    });

    it('should handle decimal precision correctly', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9270796, // High precision
        lng: 79.8612430, // High precision
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      expect(response.body.data.lat).toBeCloseTo(6.9270796, 6);
      expect(response.body.data.lng).toBeCloseTo(79.8612430, 6);
    });

    it('should update trip with new location coordinates', async () => {
      const locationUpdate = {
        tripId: runningTripId,
        lat: 6.9401,
        lng: 79.8702,
      };

      const response = await request(app.app)
        .post('/v1/locations')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(locationUpdate)
        .expect(200);

      // Verify the trip was updated with new coordinates
      const tripResponse = await request(app.app)
        .get(`/v1/trips/${runningTripId}`)
        .expect(200);

      expect(tripResponse.body.data.currentLat).toBe(locationUpdate.lat);
      expect(tripResponse.body.data.currentLng).toBe(locationUpdate.lng);
    });
  });
});
