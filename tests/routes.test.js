const request = require('supertest');
const app = require('../src/app');

describe('Routes API', () => {
  let authToken;
  let operatorToken;
  let commuterToken;
  let createdRouteId;

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

  describe('GET /v1/routes', () => {
    it('should return all routes with pagination', async () => {
      const response = await request(app.app)
        .get('/v1/routes')
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
        .get('/v1/routes?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter routes by status', async () => {
      const response = await request(app.app)
        .get('/v1/routes?status=active')
        .expect(200);

      expect(response.body.data.every((route) => route.status === 'active')).toBe(true);
    });

    it('should filter routes by inactive status', async () => {
      const response = await request(app.app)
        .get('/v1/routes?status=inactive')
        .expect(200);

      expect(response.body.data.every((route) => route.status === 'inactive')).toBe(true);
    });

    it('should sort routes by name ascending', async () => {
      const response = await request(app.app)
        .get('/v1/routes?sort=name:asc')
        .expect(200);

      const names = response.body.data.map((route) => route.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort routes by name descending', async () => {
      const response = await request(app.app)
        .get('/v1/routes?sort=name:desc')
        .expect(200);

      const names = response.body.data.map((route) => route.name);
      const sortedNames = [...names].sort().reverse();
      expect(names).toEqual(sortedNames);
    });

    it('should sort routes by distance ascending', async () => {
      const response = await request(app.app)
        .get('/v1/routes?sort=distance:asc')
        .expect(200);

      const distances = response.body.data.map((route) => route.distance);
      const sortedDistances = [...distances].sort((a, b) => a - b);
      expect(distances).toEqual(sortedDistances);
    });

    it('should sort routes by distance descending', async () => {
      const response = await request(app.app)
        .get('/v1/routes?sort=distance:desc')
        .expect(200);

      const distances = response.body.data.map((route) => route.distance);
      const sortedDistances = [...distances].sort((a, b) => b - a);
      expect(distances).toEqual(sortedDistances);
    });

    it('should sort routes by creation date ascending', async () => {
      const response = await request(app.app)
        .get('/v1/routes?sort=createdAt:asc')
        .expect(200);

      const dates = response.body.data.map((route) => new Date(route.createdAt));
      const sortedDates = [...dates].sort((a, b) => a - b);
      expect(dates).toEqual(sortedDates);
    });

    it('should return 400 with invalid sort field', async () => {
      await request(app.app)
        .get('/v1/routes?sort=invalidField:asc')
        .expect(400);
    });

    it('should return 400 with invalid sort direction', async () => {
      await request(app.app)
        .get('/v1/routes?sort=name:invalid')
        .expect(400);
    });

    it('should return 400 with invalid page number', async () => {
      await request(app.app)
        .get('/v1/routes?page=0')
        .expect(400);
    });

    it('should return 400 with invalid limit', async () => {
      await request(app.app)
        .get('/v1/routes?limit=0')
        .expect(400);
    });

    it('should return 400 with negative page', async () => {
      await request(app.app)
        .get('/v1/routes?page=-1')
        .expect(400);
    });

    it('should return 400 with negative limit', async () => {
      await request(app.app)
        .get('/v1/routes?limit=-1')
        .expect(400);
    });

    it('should return 400 with non-numeric page', async () => {
      await request(app.app)
        .get('/v1/routes?page=abc')
        .expect(400);
    });

    it('should return 400 with non-numeric limit', async () => {
      await request(app.app)
        .get('/v1/routes?limit=abc')
        .expect(400);
    });
  });

  describe('GET /v1/routes/:id', () => {
    it('should return a specific route', async () => {
      const response = await request(app.app)
        .get('/v1/routes/1')
        .expect(200);

      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('startLocation');
      expect(response.body.data).toHaveProperty('endLocation');
      expect(response.body.data).toHaveProperty('distance');
      expect(response.body.data).toHaveProperty('province');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent route', async () => {
      await request(app.app)
        .get('/v1/routes/999')
        .expect(404);
    });

    it('should return 400 with invalid route ID', async () => {
      await request(app.app)
        .get('/v1/routes/invalid_id')
        .expect(400);
    });

    it('should return 400 with negative route ID', async () => {
      await request(app.app)
        .get('/v1/routes/-1')
        .expect(400);
    });

    it('should return 400 with zero route ID', async () => {
      await request(app.app)
        .get('/v1/routes/0')
        .expect(400);
    });

    it('should support conditional GET with If-None-Match header', async () => {
      // First request to get ETag
      const firstResponse = await request(app.app)
        .get('/v1/routes/1')
        .expect(200);

      const etag = firstResponse.headers.etag;

      // Second request with If-None-Match should return 304
      await request(app.app)
        .get('/v1/routes/1')
        .set('If-None-Match', etag)
        .expect(304);
    });

    it('should support conditional GET with If-Modified-Since header', async () => {
      const futureDate = new Date(Date.now() + 86400000).toUTCString(); // Tomorrow

      await request(app.app)
        .get('/v1/routes/1')
        .set('If-Modified-Since', futureDate)
        .expect(304);
    });
  });

  describe('POST /v1/routes', () => {
    it('should create a new route with valid data (NTC admin)', async () => {
      const newRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRoute)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newRoute.name);
      expect(response.body.data.startLocation).toBe(newRoute.startLocation);
      expect(response.body.data.endLocation).toBe(newRoute.endLocation);
      expect(response.body.data.distance).toBe(newRoute.distance);
      expect(response.body.data.province).toBe(newRoute.province);
      expect(response.body.data.status).toBe(newRoute.status);

      createdRouteId = response.body.data.id;
    });

    it('should create a route with inactive status', async () => {
      const newRoute = {
        name: 'Inactive Test Route',
        startLocation: 'Inactive Start',
        endLocation: 'Inactive End',
        distance: 150,
        province: 'Inactive Province',
        status: 'inactive',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRoute)
        .expect(201);

      expect(response.body.data.status).toBe('inactive');
    });

    it('should return 401 without authentication', async () => {
      const newRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .send(newRoute)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      const newRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', 'Bearer invalid_token')
        .send(newRoute)
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      const newRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(newRoute)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      const newRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(newRoute)
        .expect(403);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteRoute = {
        name: 'Test Route',
        // Missing startLocation, endLocation, distance, province
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteRoute)
        .expect(400);
    });

    it('should return 400 with invalid name (empty)', async () => {
      const invalidRoute = {
        name: '',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoute)
        .expect(400);
    });

    it('should return 400 with invalid distance (negative)', async () => {
      const invalidRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: -10,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoute)
        .expect(400);
    });

    it('should return 400 with invalid distance (zero)', async () => {
      const invalidRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 0,
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoute)
        .expect(400);
    });

    it('should return 400 with invalid status', async () => {
      const invalidRoute = {
        name: 'Test Route',
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 100,
        province: 'Test Province',
        status: 'invalid_status',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoute)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const invalidRoute = {
        name: 123,
        startLocation: 'Test Start',
        endLocation: 'Test End',
        distance: 'not_a_number',
        province: 'Test Province',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoute)
        .expect(400);
    });
  });

  describe('PUT /v1/routes/:id', () => {
    it('should update an existing route (NTC admin)', async () => {
      const updateData = {
        name: 'Updated Route Name',
        distance: 150,
        status: 'inactive',
      };

      const response = await request(app.app)
        .put('/v1/routes/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.distance).toBe(updateData.distance);
      expect(response.body.data.status).toBe(updateData.status);
    });

    it('should update route with partial data', async () => {
      const updateData = {
        name: 'Partially Updated Route',
      };

      const response = await request(app.app)
        .put('/v1/routes/2')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should return 401 without authentication', async () => {
      const updateData = {
        name: 'Updated Route Name',
      };

      await request(app.app)
        .put('/v1/routes/1')
        .send(updateData)
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      const updateData = {
        name: 'Updated Route Name',
      };

      await request(app.app)
        .put('/v1/routes/1')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      const updateData = {
        name: 'Updated Route Name',
      };

      await request(app.app)
        .put('/v1/routes/1')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should return 404 for non-existent route', async () => {
      const updateData = {
        name: 'Updated Route Name',
      };

      await request(app.app)
        .put('/v1/routes/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 with invalid route ID', async () => {
      const updateData = {
        name: 'Updated Route Name',
      };

      await request(app.app)
        .put('/v1/routes/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should return 400 with invalid update data', async () => {
      const invalidUpdateData = {
        name: '',
        distance: -10,
        status: 'invalid_status',
      };

      await request(app.app)
        .put('/v1/routes/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      const invalidUpdateData = {
        name: 123,
        distance: 'not_a_number',
      };

      await request(app.app)
        .put('/v1/routes/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe('DELETE /v1/routes/:id', () => {
    let routeToDeleteId;

    beforeAll(async () => {
      // Create a route to delete
      const newRoute = {
        name: 'Route to Delete',
        startLocation: 'Delete Start',
        endLocation: 'Delete End',
        distance: 50,
        province: 'Delete Province',
        status: 'active',
      };

      const createResponse = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRoute)
        .expect(201);

      routeToDeleteId = createResponse.body.data.id;
    });

    it('should delete a route (NTC admin)', async () => {
      await request(app.app)
        .delete(`/v1/routes/${routeToDeleteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      await request(app.app)
        .get(`/v1/routes/${routeToDeleteId}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.app)
        .delete('/v1/routes/999')
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      await request(app.app)
        .delete('/v1/routes/999')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .delete('/v1/routes/999')
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent route', async () => {
      await request(app.app)
        .delete('/v1/routes/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 with invalid route ID', async () => {
      await request(app.app)
        .delete('/v1/routes/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with negative route ID', async () => {
      await request(app.app)
        .delete('/v1/routes/-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 with zero route ID', async () => {
      await request(app.app)
        .delete('/v1/routes/0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});