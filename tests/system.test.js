const request = require('supertest');
const app = require('../src/app');

describe('System API', () => {
  describe('GET /v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app.app)
        .get('/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('service', 'NTC Bus Tracking API');
      expect(response.body).toHaveProperty('environment');

      // Verify timestamp is a valid ISO string
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should return health status without authentication', async () => {
      const response = await request(app.app)
        .get('/v1/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should return health status with authentication', async () => {
      // Login first
      const loginResponse = await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'ntc_admin',
          password: 'pass',
        });

      const authToken = loginResponse.body.data.token;

      const response = await request(app.app)
        .get('/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should return consistent response format', async () => {
      const response = await request(app.app)
        .get('/v1/health')
        .expect(200);

      // Check all required fields are present
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('environment');

      // Check field types
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.service).toBe('string');
      expect(typeof response.body.environment).toBe('string');
    });

    it('should return environment information', async () => {
      const response = await request(app.app)
        .get('/v1/health')
        .expect(200);

      expect(response.body.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(response.body.environment);
    });

    it('should handle multiple concurrent health checks', async () => {
      const promises = Array(5).fill().map(() =>
        request(app.app)
          .get('/v1/health')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body.status).toBe('healthy');
        expect(response.body.version).toBe('1.0.0');
      });
    });
  });

  describe('GET /v1/status', () => {
    it('should return system status', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database');

      // Check field types
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.memory).toBe('object');
      expect(typeof response.body.database).toBe('object');
    });

    it('should return system status without authentication', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response.body.status).toBeDefined();
    });

    it('should return system status with authentication', async () => {
      // Login first
      const loginResponse = await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'ntc_admin',
          password: 'pass',
        });

      const authToken = loginResponse.body.data.token;

      const response = await request(app.app)
        .get('/v1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBeDefined();
    });

    it('should return valid uptime', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return memory information', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('free');

      expect(typeof response.body.memory.used).toBe('number');
      expect(typeof response.body.memory.total).toBe('number');
      expect(typeof response.body.memory.free).toBe('number');

      // Memory values should be positive
      expect(response.body.memory.used).toBeGreaterThanOrEqual(0);
      expect(response.body.memory.total).toBeGreaterThan(0);
      expect(response.body.memory.free).toBeGreaterThanOrEqual(0);
    });

    it('should return database information', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response.body.database).toHaveProperty('status');
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('records');

      expect(typeof response.body.database.status).toBe('string');
      expect(typeof response.body.database.connected).toBe('boolean');
      expect(typeof response.body.database.records).toBe('object');
    });

    it('should return database records count', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response.body.database.records).toHaveProperty('routes');
      expect(response.body.database.records).toHaveProperty('buses');
      expect(response.body.database.records).toHaveProperty('trips');
      expect(response.body.database.records).toHaveProperty('users');

      expect(typeof response.body.database.records.routes).toBe('number');
      expect(typeof response.body.database.records.buses).toBe('number');
      expect(typeof response.body.database.records.trips).toBe('number');
      expect(typeof response.body.database.records.users).toBe('number');

      // Record counts should be non-negative
      expect(response.body.database.records.routes).toBeGreaterThanOrEqual(0);
      expect(response.body.database.records.buses).toBeGreaterThanOrEqual(0);
      expect(response.body.database.records.trips).toBeGreaterThanOrEqual(0);
      expect(response.body.database.records.users).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent response format', async () => {
      const response = await request(app.app)
        .get('/v1/status')
        .expect(200);

      // Check all required fields are present
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database');

      // Check nested objects
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('free');
      expect(response.body.database).toHaveProperty('status');
      expect(response.body.database).toHaveProperty('connected');
      expect(response.body.database).toHaveProperty('records');
      expect(response.body.database.records).toHaveProperty('routes');
      expect(response.body.database.records).toHaveProperty('buses');
      expect(response.body.database.records).toHaveProperty('trips');
      expect(response.body.database.records).toHaveProperty('users');
    });

    it('should handle multiple concurrent status checks', async () => {
      const promises = Array(3).fill().map(() =>
        request(app.app)
          .get('/v1/status')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body.status).toBeDefined();
        expect(response.body.uptime).toBeGreaterThanOrEqual(0);
        expect(response.body.memory).toBeDefined();
        expect(response.body.database).toBeDefined();
      });
    });

    it('should return different uptime values over time', async () => {
      const response1 = await request(app.app)
        .get('/v1/status')
        .expect(200);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const response2 = await request(app.app)
        .get('/v1/status')
        .expect(200);

      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
    });
  });

  describe('GET / (Root endpoint)', () => {
    it('should return API information', async () => {
      const response = await request(app.app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('documentation');

      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.service).toBe('string');
      expect(typeof response.body.endpoints).toBe('object');
      expect(typeof response.body.documentation).toBe('string');
    });

    it('should return API information without authentication', async () => {
      const response = await request(app.app)
        .get('/')
        .expect(200);

      expect(response.body.service).toBe('NTC Bus Tracking API');
    });

    it('should return API information with authentication', async () => {
      // Login first
      const loginResponse = await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'ntc_admin',
          password: 'pass',
        });

      const authToken = loginResponse.body.data.token;

      const response = await request(app.app)
        .get('/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.service).toBe('NTC Bus Tracking API');
    });

    it('should return available endpoints', async () => {
      const response = await request(app.app)
        .get('/')
        .expect(200);

      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('status');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('routes');
      expect(response.body.endpoints).toHaveProperty('buses');
      expect(response.body.endpoints).toHaveProperty('trips');
      expect(response.body.endpoints).toHaveProperty('locations');

      expect(typeof response.body.endpoints.health).toBe('string');
      expect(typeof response.body.endpoints.status).toBe('string');
      expect(typeof response.body.endpoints.auth).toBe('string');
      expect(typeof response.body.endpoints.routes).toBe('string');
      expect(typeof response.body.endpoints.buses).toBe('string');
      expect(typeof response.body.endpoints.trips).toBe('string');
      expect(typeof response.body.endpoints.locations).toBe('string');
    });

    it('should return documentation URL', async () => {
      const response = await request(app.app)
        .get('/')
        .expect(200);

      expect(response.body.documentation).toBeDefined();
      expect(typeof response.body.documentation).toBe('string');
    });

    it('should handle multiple concurrent root requests', async () => {
      const promises = Array(5).fill().map(() =>
        request(app.app)
          .get('/')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body.service).toBe('NTC Bus Tracking API');
        expect(response.body.version).toBeDefined();
        expect(response.body.endpoints).toBeDefined();
      });
    });
  });

  describe('Error handling for system endpoints', () => {
    it('should handle invalid HTTP methods on health endpoint', async () => {
      await request(app.app)
        .post('/v1/health')
        .expect(404);

      await request(app.app)
        .put('/v1/health')
        .expect(404);

      await request(app.app)
        .delete('/v1/health')
        .expect(404);
    });

    it('should handle invalid HTTP methods on status endpoint', async () => {
      await request(app.app)
        .post('/v1/status')
        .expect(404);

      await request(app.app)
        .put('/v1/status')
        .expect(404);

      await request(app.app)
        .delete('/v1/status')
        .expect(404);
    });

    it('should handle invalid HTTP methods on root endpoint', async () => {
      await request(app.app)
        .post('/')
        .expect(404);

      await request(app.app)
        .put('/')
        .expect(404);

      await request(app.app)
        .delete('/')
        .expect(404);
    });

    it('should handle non-existent system endpoints', async () => {
      await request(app.app)
        .get('/v1/non-existent')
        .expect(404);

      await request(app.app)
        .get('/v1/health/invalid')
        .expect(404);

      await request(app.app)
        .get('/v1/status/invalid')
        .expect(404);
    });
  });
});
