const request = require('supertest');
const app = require('../src/app');

describe('Buses API', () => {
  let authToken;
  let operatorToken;
  let commuterToken;
  let createdBusId;

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

  describe('GET /v1/buses', () => {
    it('should return all buses with pagination', async () => {
      const response = await request(app.app)
        .get('/v1/buses')
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
        .get('/v1/buses?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter buses by route ID', async () => {
      const response = await request(app.app)
        .get('/v1/buses?routeId=1')
        .expect(200);

      expect(response.body.data.every((bus) => bus.routeId === 1)).toBe(true);
    });

    it('should filter buses by status', async () => {
      const response = await request(app.app)
        .get('/v1/buses?status=active')
        .expect(200);

      expect(response.body.data.every((bus) => bus.status === 'active')).toBe(true);
    });

    it('should filter buses by inactive status', async () => {
      const response = await request(app.app)
        .get('/v1/buses?status=inactive')
        .expect(200);

      expect(response.body.data.every((bus) => bus.status === 'inactive')).toBe(true);
    });

    it('should filter buses by maintenance status', async () => {
      const response = await request(app.app)
        .get('/v1/buses?status=maintenance')
        .expect(200);

      expect(response.body.data.every((bus) => bus.status === 'maintenance')).toBe(true);
    });

    it('should sort buses by number ascending', async () => {
      const response = await request(app.app)
        .get('/v1/buses?sort=number:asc')
        .expect(200);

      const numbers = response.body.data.map((bus) => bus.number);
      const sortedNumbers = [...numbers].sort();
      expect(numbers).toEqual(sortedNumbers);
    });

    it('should sort buses by number descending', async () => {
      const response = await request(app.app)
        .get('/v1/buses?sort=number:desc')
        .expect(200);

      const numbers = response.body.data.map((bus) => bus.number);
      const sortedNumbers = [...numbers].sort().reverse();
      expect(numbers).toEqual(sortedNumbers);
    });

    it('should sort buses by capacity ascending', async () => {
      const response = await request(app.app)
        .get('/v1/buses?sort=capacity:asc')
        .expect(200);

      const capacities = response.body.data.map((bus) => bus.capacity);
      const sortedCapacities = [...capacities].sort((a, b) => a - b);
      expect(capacities).toEqual(sortedCapacities);
    });

    it('should sort buses by capacity descending', async () => {
      const response = await request(app.app)
        .get('/v1/buses?sort=capacity:desc')
        .expect(200);

      const capacities = response.body.data.map((bus) => bus.capacity);
      const sortedCapacities = [...capacities].sort((a, b) => b - a);
      expect(capacities).toEqual(sortedCapacities);
    });

    it('should sort buses by creation date ascending', async () => {
      const response = await request(app.app)
        .get('/v1/buses?sort=createdAt:asc')
        .expect(200);

      const dates = response.body.data.map((bus) => new Date(bus.createdAt));
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });

    it('should return 400 with invalid sort field', async () => {
      await request(app.app)
        .get('/v1/buses?sort=invalidField:asc')
        .expect(400);
    });

    it('should return 400 with invalid sort direction', async () => {
      await request(app.app)
        .get('/v1/buses?sort=number:invalid')
        .expect(400);
    });

    it('should return 400 with invalid page number', async () => {
      await request(app.app)
        .get('/v1/buses?page=0')
        .expect(400);
    });

    it('should return 400 with invalid limit', async () => {
      await request(app.app)
        .get('/v1/buses?limit=0')
        .expect(400);
    });

    it('should return 400 with invalid route ID', async () => {
      await request(app.app)
        .get('/v1/buses?routeId=invalid')
        .expect(400);
    });

    it('should return 400 with invalid status', async () => {
      await request(app.app)
        .get('/v1/buses?status=invalid_status')
        .expect(400);
    });
  });

  describe('GET /v1/buses/:id', () => {
    it('should return a specific bus', async () => {
      const response = await request(app.app)
        .get('/v1/buses/1')
        .expect(200);

      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('number');
      expect(response.body.data).toHaveProperty('routeId');
      expect(response.body.data).toHaveProperty('capacity');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('operator');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent bus', async () => {
      await request(app.app)
        .get('/v1/buses/999')
        .expect(404);
    });

    it('should return 400 with invalid bus ID', async () => {
      await request(app.app)
        .get('/v1/buses/invalid_id')
        .expect(400);
    });

    it('should return 400 with negative bus ID', async () => {
      await request(app.app)
        .get('/v1/buses/-1')
        .expect(400);
    });

    it('should return 400 with zero bus ID', async () => {
      await request(app.app)
        .get('/v1/buses/0')
        .expect(400);
    });

    it('should support conditional GET with If-None-Match header', async () => {
      // First request to get ETag
      const firstResponse = await request(app.app)
        .get('/v1/buses/1')
        .expect(200);

      const etag = firstResponse.headers.etag;

      // Second request with If-None-Match should return 304
      await request(app.app)
        .get('/v1/buses/1')
        .set('If-None-Match', etag)
        .expect(304);
    });

    it('should support conditional GET with If-Modified-Since header', async () => {
      const futureDate = new Date(Date.now() + 86400000).toUTCString(); // Tomorrow

      await request(app.app)
        .get('/v1/buses/1')
        .set('If-Modified-Since', futureDate)
        .expect(304);
    });
  });

  describe('POST /v1/buses', () => {
    it('should create a new bus with valid data (NTC admin)', async () => {
      const newBus = {
        number: 'TEST-001',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      const response = await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newBus)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.number).toBe(newBus.number);
      expect(response.body.data.routeId).toBe(newBus.routeId);
      expect(response.body.data.capacity).toBe(newBus.capacity);
      expect(response.body.data.status).toBe(newBus.status);
      expect(response.body.data.operator).toBe(newBus.operator);

      createdBusId = response.body.data.id;
    });

    it('should create a bus with inactive status', async () => {
      const newBus = {
        number: 'TEST-002',
        routeId: 1,
        capacity: 40,
        status: 'inactive',
        operator: 'Test Operator',
      };

      const response = await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newBus)
        .expect(201);

      expect(response.body.data.status).toBe('inactive');
    });

    it('should create a bus with maintenance status', async () => {
      const newBus = {
        number: 'TEST-003',
        routeId: 1,
        capacity: 45,
        status: 'maintenance',
        operator: 'Test Operator',
      };

      const response = await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newBus)
        .expect(201);

      expect(response.body.data.status).toBe('maintenance');
    });

    it('should return 401 without authentication', async () => {
      const newBus = {
        number: 'TEST-004',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .send(newBus)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      const newBus = {
        number: 'TEST-005',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', 'Bearer invalid_token')
        .send(newBus)
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      const newBus = {
        number: 'TEST-006',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(newBus)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      const newBus = {
        number: 'TEST-007',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(newBus)
        .expect(403);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteBus = {
        number: 'TEST-008',
        // Missing routeId, capacity, status, operator
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteBus)
        .expect(400);
    });

    it('should return 400 with invalid number (empty)', async () => {
      const invalidBus = {
        number: '',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBus)
        .expect(400);
    });

    it('should return 400 with invalid route ID (non-existent)', async () => {
      const invalidBus = {
        number: 'TEST-009',
        routeId: 999,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBus)
        .expect(400);
    });

    it('should return 400 with invalid capacity (negative)', async () => {
      const invalidBus = {
        number: 'TEST-010',
        routeId: 1,
        capacity: -10,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBus)
        .expect(400);
    });

    it('should return 400 with invalid capacity (zero)', async () => {
      const invalidBus = {
        number: 'TEST-011',
        routeId: 1,
        capacity: 0,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBus)
        .expect(400);
    });

    it('should return 400 with invalid status', async () => {
      const invalidBus = {
        number: 'TEST-012',
        routeId: 1,
        capacity: 50,
        status: 'invalid_status',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBus)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const invalidBus = {
        number: 123,
        routeId: 'not_a_number',
        capacity: 'not_a_number',
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBus)
        .expect(400);
    });

    it('should return 409 with duplicate bus number', async () => {
      const duplicateBus = {
        number: 'TEST-001', // Already created above
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Test Operator',
      };

      await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateBus)
        .expect(409);
    });
  });

  describe('PUT /v1/buses/:id', () => {
    it('should update an existing bus (NTC admin)', async () => {
      const updateData = {
        number: 'UPDATED-001',
        capacity: 60,
        status: 'inactive',
        operator: 'Updated Operator',
      };

      const response = await request(app.app)
        .put('/v1/buses/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.number).toBe(updateData.number);
      expect(response.body.data.capacity).toBe(updateData.capacity);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.operator).toBe(updateData.operator);
    });

    it('should update bus with partial data', async () => {
      const updateData = {
        capacity: 55,
      };

      const response = await request(app.app)
        .put('/v1/buses/2')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.capacity).toBe(updateData.capacity);
    });

    it('should return 401 without authentication', async () => {
      const updateData = {
        capacity: 60,
      };

      await request(app.app)
        .put('/v1/buses/1')
        .send(updateData)
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      const updateData = {
        capacity: 60,
      };

      await request(app.app)
        .put('/v1/buses/1')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      const updateData = {
        capacity: 60,
      };

      await request(app.app)
        .put('/v1/buses/1')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent bus', async () => {
      const updateData = {
        capacity: 60,
      };

      await request(app.app)
        .put('/v1/buses/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 with invalid bus ID', async () => {
      const updateData = {
        capacity: 60,
      };

      await request(app.app)
        .put('/v1/buses/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should return 400 with invalid update data', async () => {
      const invalidUpdateData = {
        number: '',
        capacity: -10,
        status: 'invalid_status',
      };

      await request(app.app)
        .put('/v1/buses/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const invalidUpdateData = {
        number: 123,
        capacity: 'not_a_number',
      };

      await request(app.app)
        .put('/v1/buses/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should return 409 with duplicate bus number', async () => {
      const updateData = {
        number: 'TEST-001', // Already exists
      };

      await request(app.app)
        .put('/v1/buses/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);
    });
  });

  describe('DELETE /v1/buses/:id', () => {
    let busToDeleteId;

    beforeAll(async () => {
      // Create a bus to delete
      const newBus = {
        number: 'DELETE-001',
        routeId: 1,
        capacity: 50,
        status: 'active',
        operator: 'Delete Operator',
      };

      const createResponse = await request(app.app)
        .post('/v1/buses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newBus)
        .expect(201);

      busToDeleteId = createResponse.body.data.id;
    });

    it('should delete a bus (NTC admin)', async () => {
      await request(app.app)
        .delete(`/v1/buses/${busToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      await request(app.app)
        .get(`/v1/buses/${busToDeleteId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.app)
        .delete('/v1/buses/999')
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      await request(app.app)
        .delete('/v1/buses/999')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .delete('/v1/buses/999')
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent bus', async () => {
      await request(app.app)
        .delete('/v1/buses/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 with invalid bus ID', async () => {
      await request(app.app)
        .delete('/v1/buses/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with negative bus ID', async () => {
      await request(app.app)
        .delete('/v1/buses/-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with zero bus ID', async () => {
      await request(app.app)
        .delete('/v1/buses/0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 409 if bus has associated trips', async () => {
      // Try to delete a bus that has trips (assuming bus 1 has trips)
      await request(app.app)
        .delete('/v1/buses/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });
  });
});
