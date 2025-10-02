const request = require('supertest');
const app = require('../src/app');

describe('Trips API', () => {
  let authToken;
  let operatorToken;
  let commuterToken;
  let createdTripId;

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
  });

  describe('GET /v1/trips', () => {
    it('should return all trips with pagination', async () => {
      const response = await request(app.app)
        .get('/v1/trips')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.app)
        .get('/v1/trips?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter trips by route ID', async () => {
      const response = await request(app.app)
        .get('/v1/trips?routeId=1')
        .expect(200);

      expect(response.body.data.every((trip) => trip.routeId === 1)).toBe(true);
    });

    it('should filter trips by bus ID', async () => {
      const response = await request(app.app)
        .get('/v1/trips?busId=1')
        .expect(200);

      expect(response.body.data.every((trip) => trip.busId === 1)).toBe(true);
    });

    it('should filter trips by status', async () => {
      const response = await request(app.app)
        .get('/v1/trips?status=scheduled')
        .expect(200);

      expect(response.body.data.every((trip) => trip.status === 'scheduled')).toBe(true);
    });

    it('should filter trips by running status', async () => {
      const response = await request(app.app)
        .get('/v1/trips?status=running')
        .expect(200);

      expect(response.body.data.every((trip) => trip.status === 'running')).toBe(true);
    });

    it('should filter trips by completed status', async () => {
      const response = await request(app.app)
        .get('/v1/trips?status=completed')
        .expect(200);

      expect(response.body.data.every((trip) => trip.status === 'completed')).toBe(true);
    });

    it('should filter trips by cancelled status', async () => {
      const response = await request(app.app)
        .get('/v1/trips?status=cancelled')
        .expect(200);

      expect(response.body.data.every((trip) => trip.status === 'cancelled')).toBe(true);
    });

    it('should filter trips by date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app.app)
        .get(`/v1/trips?date=${today}`)
        .expect(200);

      expect(response.body.data.every((trip) => {
        const tripDate = new Date(trip.startTime).toISOString().split('T')[0];
        return tripDate === today;
      })).toBe(true);
    });

    it('should sort trips by start time ascending', async () => {
      const response = await request(app.app)
        .get('/v1/trips?sort=startTime:asc')
        .expect(200);

      const startTimes = response.body.data.map((trip) => new Date(trip.startTime));
      const sortedStartTimes = [...startTimes].sort((a, b) => a - b);
      expect(startTimes).toEqual(sortedStartTimes);
    });

    it('should sort trips by start time descending', async () => {
      const response = await request(app.app)
        .get('/v1/trips?sort=startTime:desc')
        .expect(200);

      const startTimes = response.body.data.map((trip) => new Date(trip.startTime));
      const sortedStartTimes = [...startTimes].sort((a, b) => b - a);
      expect(startTimes).toEqual(sortedStartTimes);
    });

    it('should sort trips by end time ascending', async () => {
      const response = await request(app.app)
        .get('/v1/trips?sort=endTime:asc')
        .expect(200);

      const endTimes = response.body.data.map((trip) => new Date(trip.endTime));
      const sortedEndTimes = [...endTimes].sort((a, b) => a - b);
      expect(endTimes).toEqual(sortedEndTimes);
    });

    it('should sort trips by creation date ascending', async () => {
      const response = await request(app.app)
        .get('/v1/trips?sort=createdAt:asc')
        .expect(200);

      const dates = response.body.data.map((trip) => new Date(trip.createdAt));
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });

    it('should return 400 with invalid sort field', async () => {
      await request(app.app)
        .get('/v1/trips?sort=invalidField:asc')
        .expect(400);
    });

    it('should return 400 with invalid sort direction', async () => {
      await request(app.app)
        .get('/v1/trips?sort=startTime:invalid')
        .expect(400);
    });

    it('should return 400 with invalid page number', async () => {
      await request(app.app)
        .get('/v1/trips?page=0')
        .expect(400);
    });

    it('should return 400 with invalid limit', async () => {
      await request(app.app)
        .get('/v1/trips?limit=0')
        .expect(400);
    });

    it('should return 400 with invalid route ID', async () => {
      await request(app.app)
        .get('/v1/trips?routeId=invalid')
        .expect(400);
    });

    it('should return 400 with invalid bus ID', async () => {
      await request(app.app)
        .get('/v1/trips?busId=invalid')
        .expect(400);
    });

    it('should return 400 with invalid status', async () => {
      await request(app.app)
        .get('/v1/trips?status=invalid_status')
        .expect(400);
    });

    it('should return 400 with invalid date format', async () => {
      await request(app.app)
        .get('/v1/trips?date=invalid_date')
        .expect(400);
    });
  });

  describe('GET /v1/trips/running', () => {
    it('should return only running trips', async () => {
      const response = await request(app.app)
        .get('/v1/trips/running')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every((trip) => trip.status === 'running')).toBe(true);
    });

    it('should return empty array when no running trips', async () => {
      // This test assumes there might be no running trips
      const response = await request(app.app)
        .get('/v1/trips/running')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /v1/trips/:id', () => {
    it('should return a specific trip', async () => {
      const response = await request(app.app)
        .get('/v1/trips/1')
        .expect(200);

      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('routeId');
      expect(response.body.data).toHaveProperty('busId');
      expect(response.body.data).toHaveProperty('startTime');
      expect(response.body.data).toHaveProperty('endTime');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('passengerCount');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent trip', async () => {
      await request(app.app)
        .get('/v1/trips/999')
        .expect(404);
    });

    it('should return 400 with invalid trip ID', async () => {
      await request(app.app)
        .get('/v1/trips/invalid_id')
        .expect(400);
    });

    it('should return 400 with negative trip ID', async () => {
      await request(app.app)
        .get('/v1/trips/-1')
        .expect(400);
    });

    it('should return 400 with zero trip ID', async () => {
      await request(app.app)
        .get('/v1/trips/0')
        .expect(400);
    });

    it('should support conditional GET with If-None-Match header', async () => {
      // First request to get ETag
      const firstResponse = await request(app.app)
        .get('/v1/trips/1')
        .expect(200);

      const etag = firstResponse.headers.etag;

      // Second request with If-None-Match should return 304
      await request(app.app)
        .get('/v1/trips/1')
        .set('If-None-Match', etag)
        .expect(304);
    });

    it('should support conditional GET with If-Modified-Since header', async () => {
      const futureDate = new Date(Date.now() + 86400000).toUTCString(); // Tomorrow

      await request(app.app)
        .get('/v1/trips/1')
        .set('If-Modified-Since', futureDate)
        .expect(304);
    });
  });

  describe('POST /v1/trips', () => {
    it('should create a new trip with valid data (NTC admin)', async () => {
      const startTime = new Date(Date.now() + 3600000); // 1 hour from now
      const endTime = new Date(Date.now() + 7200000); // 2 hours from now

      const newTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      const response = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTrip)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.routeId).toBe(newTrip.routeId);
      expect(response.body.data.busId).toBe(newTrip.busId);
      expect(response.body.data.status).toBe(newTrip.status);
      expect(response.body.data.passengerCount).toBe(newTrip.passengerCount);

      createdTripId = response.body.data.id;
    });

    it('should create a trip with running status', async () => {
      const startTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const endTime = new Date(Date.now() + 1800000); // 30 minutes from now

      const newTrip = {
        routeId: 1,
        busId: 2,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'running',
        passengerCount: 25,
        currentLat: 6.9271,
        currentLng: 79.8612,
      };

      const response = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTrip)
        .expect(201);

      expect(response.body.data.status).toBe('running');
      expect(response.body.data.currentLat).toBe(newTrip.currentLat);
      expect(response.body.data.currentLng).toBe(newTrip.currentLng);
    });

    it('should return 401 without authentication', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .send(newTrip)
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(newTrip)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(newTrip)
        .expect(403);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteTrip = {
        routeId: 1,
        // Missing busId, startTime, endTime, status
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteTrip)
        .expect(400);
    });

    it('should return 400 with invalid route ID', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const invalidTrip = {
        routeId: 999,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 400 with invalid bus ID', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const invalidTrip = {
        routeId: 1,
        busId: 999,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 400 with invalid start time (past)', async () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const endTime = new Date(Date.now() + 3600000); // 1 hour from now

      const invalidTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 400 with invalid end time (before start time)', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 1800000); // Before start time

      const invalidTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 400 with invalid status', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const invalidTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'invalid_status',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 400 with invalid passenger count (negative)', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const invalidTrip = {
        routeId: 1,
        busId: 1,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: -5,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const invalidTrip = {
        routeId: 'not_a_number',
        busId: 'not_a_number',
        startTime: 'invalid_date',
        endTime: 'invalid_date',
        status: 'scheduled',
        passengerCount: 'not_a_number',
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTrip)
        .expect(400);
    });

    it('should return 409 if bus not available during specified time', async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      // Try to create a trip with a bus that might already be scheduled
      const conflictingTrip = {
        routeId: 1,
        busId: 1, // Same bus as above
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictingTrip)
        .expect(409);
    });
  });

  describe('PUT /v1/trips/:id', () => {
    it('should update an existing trip (NTC admin)', async () => {
      const updateData = {
        passengerCount: 30,
        status: 'running',
        currentLat: 6.9271,
        currentLng: 79.8612,
      };

      const response = await request(app.app)
        .put('/v1/trips/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.passengerCount).toBe(updateData.passengerCount);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.currentLat).toBe(updateData.currentLat);
      expect(response.body.data.currentLng).toBe(updateData.currentLng);
    });

    it('should update trip with partial data (Operator)', async () => {
      const updateData = {
        passengerCount: 25,
      };

      const response = await request(app.app)
        .put('/v1/trips/2')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.passengerCount).toBe(updateData.passengerCount);
    });

    it('should return 401 without authentication', async () => {
      const updateData = {
        passengerCount: 30,
      };

      await request(app.app)
        .put('/v1/trips/1')
        .send(updateData)
        .expect(401);
    });

    it('should return 403 for commuter role', async () => {
      const updateData = {
        passengerCount: 30,
      };

      await request(app.app)
        .put('/v1/trips/1')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent trip', async () => {
      const updateData = {
        passengerCount: 30,
      };

      await request(app.app)
        .put('/v1/trips/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 with invalid trip ID', async () => {
      const updateData = {
        passengerCount: 30,
      };

      await request(app.app)
        .put('/v1/trips/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should return 400 with invalid update data', async () => {
      const invalidUpdateData = {
        passengerCount: -10,
        status: 'invalid_status',
      };

      await request(app.app)
        .put('/v1/trips/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const invalidUpdateData = {
        passengerCount: 'not_a_number',
        currentLat: 'not_a_number',
        currentLng: 'not_a_number',
      };

      await request(app.app)
        .put('/v1/trips/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe('DELETE /v1/trips/:id', () => {
    let tripToDeleteId;

    beforeAll(async () => {
      // Create a trip to delete
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 3,
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

      tripToDeleteId = createResponse.body.data.id;
    });

    it('should delete a trip (NTC admin)', async () => {
      await request(app.app)
        .delete(`/v1/trips/${tripToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      await request(app.app)
        .get(`/v1/trips/${tripToDeleteId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.app)
        .delete('/v1/trips/999')
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      await request(app.app)
        .delete('/v1/trips/999')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .delete('/v1/trips/999')
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent trip', async () => {
      await request(app.app)
        .delete('/v1/trips/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 with invalid trip ID', async () => {
      await request(app.app)
        .delete('/v1/trips/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 409 if trip is not scheduled', async () => {
      // Try to delete a running trip (assuming trip 1 is running)
      await request(app.app)
        .delete('/v1/trips/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });
  });

  describe('POST /v1/trips/:id/start', () => {
    let scheduledTripId;

    beforeAll(async () => {
      // Create a scheduled trip to start
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 4,
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

      scheduledTripId = createResponse.body.data.id;
    });

    it('should start a scheduled trip (NTC admin)', async () => {
      const response = await request(app.app)
        .post(`/v1/trips/${scheduledTripId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('running');
      expect(response.body.data).toHaveProperty('currentLat');
      expect(response.body.data).toHaveProperty('currentLng');
    });

    it('should start a scheduled trip (Operator)', async () => {
      // Create another scheduled trip
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newTrip = {
        routeId: 1,
        busId: 5,
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

      const tripId = createResponse.body.data.id;

      const response = await request(app.app)
        .post(`/v1/trips/${tripId}/start`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('running');
    });

    it('should return 401 without authentication', async () => {
      await request(app.app)
        .post(`/v1/trips/${scheduledTripId}/start`)
        .expect(401);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .post(`/v1/trips/${scheduledTripId}/start`)
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent trip', async () => {
      await request(app.app)
        .post('/v1/trips/999/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 if trip is not scheduled', async () => {
      // Try to start a running trip
      await request(app.app)
        .post('/v1/trips/1/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with invalid trip ID', async () => {
      await request(app.app)
        .post('/v1/trips/invalid_id/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /v1/trips/:id/complete', () => {
    let runningTripId;

    beforeAll(async () => {
      // Create a running trip to complete
      const startTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const endTime = new Date(Date.now() + 1800000); // 30 minutes from now

      const newTrip = {
        routeId: 1,
        busId: 6,
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

    it('should complete a running trip (NTC admin)', async () => {
      const response = await request(app.app)
        .post(`/v1/trips/${runningTripId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('completed');
    });

    it('should complete a running trip (Operator)', async () => {
      // Create another running trip
      const startTime = new Date(Date.now() - 1800000);
      const endTime = new Date(Date.now() + 1800000);

      const newTrip = {
        routeId: 1,
        busId: 7,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'running',
        passengerCount: 20,
        currentLat: 6.9271,
        currentLng: 79.8612,
      };

      const createResponse = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTrip)
        .expect(201);

      const tripId = createResponse.body.data.id;

      const response = await request(app.app)
        .post(`/v1/trips/${tripId}/complete`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('completed');
    });

    it('should return 401 without authentication', async () => {
      await request(app.app)
        .post(`/v1/trips/${runningTripId}/complete`)
        .expect(401);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .post(`/v1/trips/${runningTripId}/complete`)
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent trip', async () => {
      await request(app.app)
        .post('/v1/trips/999/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 if trip is not running', async () => {
      // Try to complete a scheduled trip
      await request(app.app)
        .post('/v1/trips/2/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with invalid trip ID', async () => {
      await request(app.app)
        .post('/v1/trips/invalid_id/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
