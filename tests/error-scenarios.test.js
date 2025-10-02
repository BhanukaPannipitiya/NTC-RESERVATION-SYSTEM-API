const request = require('supertest');
const app = require('../src/app');

describe('Error Scenarios and Edge Cases', () => {
  let authToken;
  let operatorToken;
  let commuterToken;

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

  describe('Authentication Error Scenarios', () => {
    it('should return 401 for malformed Authorization header', async () => {
      await request(app.app)
        .get('/v1/routes')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 401 for empty Authorization header', async () => {
      await request(app.app)
        .get('/v1/routes')
        .set('Authorization', '')
        .expect(401);
    });

    it('should return 401 for Bearer without token', async () => {
      await request(app.app)
        .get('/v1/routes')
        .set('Authorization', 'Bearer')
        .expect(401);
    });

    it('should return 401 for Bearer with empty token', async () => {
      await request(app.app)
        .get('/v1/routes')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });

    it('should return 401 for expired token', async () => {
      // This test assumes we have a way to create expired tokens
      // For now, we'll test with a clearly invalid token
      await request(app.app)
        .get('/v1/routes')
        .set('Authorization', 'Bearer expired_token_12345')
        .expect(401);
    });

    it('should return 401 for tampered token', async () => {
      // Tamper with a valid token
      const tamperedToken = authToken.slice(0, -5) + 'XXXXX';
      await request(app.app)
        .get('/v1/routes')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe('Authorization Error Scenarios', () => {
    it('should return 403 for commuter trying to create routes', async () => {
      const newRoute = {
        name: 'Unauthorized Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${commuterToken}`)
        .send(newRoute)
        .expect(403);
    });

    it('should return 403 for operator trying to delete buses', async () => {
      await request(app.app)
        .delete('/v1/buses/1')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter trying to access admin endpoints', async () => {
      await request(app.app)
        .get('/v1/auth/users')
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 403 for operator trying to access admin endpoints', async () => {
      await request(app.app)
        .get('/v1/auth/statistics')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });
  });

  describe('Validation Error Scenarios', () => {
    it('should return 400 for invalid JSON in request body', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should return 400 for empty request body', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send()
        .expect(400);
    });

    it('should return 400 for null request body', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(null)
        .expect(400);
    });

    it('should return 400 for undefined request body', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(undefined)
        .expect(400);
    });

    it('should return 400 for array instead of object', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send([])
        .expect(400);
    });

    it('should return 400 for string instead of object', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid string')
        .expect(400);
    });

    it('should return 400 for number instead of object', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(123)
        .expect(400);
    });

    it('should return 400 for boolean instead of object', async () => {
      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(true)
        .expect(400);
    });
  });

  describe('Input Sanitization and XSS Prevention', () => {
    it('should sanitize malicious input in route names', async () => {
      const maliciousRoute = {
        name: '<script>alert("XSS")</script>',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousRoute)
        .expect(201);

      // The response should not contain the script tags
      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.name).not.toContain('alert');
    });

    it('should sanitize SQL injection attempts', async () => {
      const sqlInjectionRoute = {
        name: "'; DROP TABLE routes; --",
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sqlInjectionRoute)
        .expect(201);

      // The response should not contain the SQL injection
      expect(response.body.data.name).not.toContain('DROP TABLE');
    });

    it('should sanitize HTML entities', async () => {
      const htmlEntityRoute = {
        name: 'Route &amp; Test',
        startLocation: 'Start &lt;test&gt;',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(htmlEntityRoute)
        .expect(201);

      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.startLocation).toBeDefined();
    });
  });

  describe('Edge Cases for Numeric Values', () => {
    it('should handle very large numbers', async () => {
      const largeNumberRoute = {
        name: 'Large Number Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: Number.MAX_SAFE_INTEGER,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeNumberRoute)
        .expect(201);

      expect(response.body.data.distance).toBe(largeNumberRoute.distance);
    });

    it('should handle very small positive numbers', async () => {
      const smallNumberRoute = {
        name: 'Small Number Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 0.000001,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smallNumberRoute)
        .expect(201);

      expect(response.body.data.distance).toBeCloseTo(smallNumberRoute.distance, 6);
    });

    it('should handle floating point precision', async () => {
      const precisionRoute = {
        name: 'Precision Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 123.456789,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(precisionRoute)
        .expect(201);

      expect(response.body.data.distance).toBeCloseTo(precisionRoute.distance, 6);
    });
  });

  describe('Edge Cases for String Values', () => {
    it('should handle very long strings', async () => {
      const longString = 'A'.repeat(1000);
      const longStringRoute = {
        name: longString,
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(longStringRoute)
        .expect(201);

      expect(response.body.data.name).toBe(longString);
    });

    it('should handle unicode characters', async () => {
      const unicodeRoute = {
        name: 'Route with Unicode: 你好世界 🌍',
        startLocation: 'Start with émojis 🚌',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(unicodeRoute)
        .expect(201);

      expect(response.body.data.name).toBe(unicodeRoute.name);
      expect(response.body.data.startLocation).toBe(unicodeRoute.startLocation);
    });

    it('should handle special characters', async () => {
      const specialCharRoute = {
        name: 'Route with Special Chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(specialCharRoute)
        .expect(201);

      expect(response.body.data.name).toBe(specialCharRoute.name);
    });

    it('should handle empty strings', async () => {
      const emptyStringRoute = {
        name: '',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emptyStringRoute)
        .expect(400);
    });

    it('should handle whitespace-only strings', async () => {
      const whitespaceRoute = {
        name: '   ',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(whitespaceRoute)
        .expect(400);
    });
  });

  describe('Edge Cases for Date Values', () => {
    it('should handle future dates far in the future', async () => {
      const futureDate = new Date('2099-12-31T23:59:59.999Z');
      const endDate = new Date('2100-01-01T01:00:00.000Z');

      const futureTrip = {
        routeId: 1,
        busId: 1,
        startTime: futureDate.toISOString(),
        endTime: endDate.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      const response = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(futureTrip)
        .expect(201);

      expect(response.body.data.startTime).toBe(futureDate.toISOString());
    });

    it('should handle dates with different timezones', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-01T02:00:00.000Z');

      const timezoneTrip = {
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
        .send(timezoneTrip)
        .expect(201);

      expect(response.body.data.startTime).toBe(startTime.toISOString());
    });

    it('should handle leap year dates', async () => {
      const leapYearDate = new Date('2024-02-29T12:00:00.000Z');
      const endDate = new Date('2024-02-29T14:00:00.000Z');

      const leapYearTrip = {
        routeId: 1,
        busId: 1,
        startTime: leapYearDate.toISOString(),
        endTime: endDate.toISOString(),
        status: 'scheduled',
        passengerCount: 0,
      };

      const response = await request(app.app)
        .post('/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leapYearTrip)
        .expect(201);

      expect(response.body.data.startTime).toBe(leapYearDate.toISOString());
    });
  });

  describe('Edge Cases for Pagination', () => {
    it('should handle very large page numbers', async () => {
      const response = await request(app.app)
        .get('/v1/routes?page=999999')
        .expect(200);

      expect(response.body.pagination.page).toBe(999999);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should handle very large limit values', async () => {
      const response = await request(app.app)
        .get('/v1/routes?limit=1000')
        .expect(200);

      expect(response.body.pagination.limit).toBe(1000);
      expect(response.body.data.length).toBeLessThanOrEqual(1000);
    });

    it('should handle limit exceeding total records', async () => {
      const response = await request(app.app)
        .get('/v1/routes?limit=999999')
        .expect(200);

      expect(response.body.pagination.limit).toBe(999999);
      expect(response.body.data.length).toBeLessThanOrEqual(response.body.pagination.total);
    });
  });

  describe('Edge Cases for Filtering', () => {
    it('should handle filtering with non-existent values', async () => {
      const response = await request(app.app)
        .get('/v1/routes?status=non_existent_status')
        .expect(400);
    });

    it('should handle filtering with empty values', async () => {
      const response = await request(app.app)
        .get('/v1/routes?status=')
        .expect(400);
    });

    it('should handle multiple filters', async () => {
      const response = await request(app.app)
        .get('/v1/trips?status=running&routeId=1&busId=1')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should handle conflicting filters', async () => {
      const response = await request(app.app)
        .get('/v1/trips?status=running&status=completed')
        .expect(200);

      // Should return empty results or handle gracefully
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Edge Cases for Sorting', () => {
    it('should handle sorting with non-existent fields', async () => {
      await request(app.app)
        .get('/v1/routes?sort=non_existent_field:asc')
        .expect(400);
    });

    it('should handle sorting with invalid directions', async () => {
      await request(app.app)
        .get('/v1/routes?sort=name:invalid_direction')
        .expect(400);
    });

    it('should handle multiple sort parameters', async () => {
      const response = await request(app.app)
        .get('/v1/routes?sort=name:asc&sort=distance:desc')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should handle sorting with empty values', async () => {
      await request(app.app)
        .get('/v1/routes?sort=')
        .expect(400);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent GET requests', async () => {
      const promises = Array(10).fill().map(() =>
        request(app.app)
          .get('/v1/routes')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.pagination).toBeDefined();
      });
    });

    it('should handle multiple concurrent POST requests', async () => {
      const promises = Array(5).fill().map((_, index) => {
        const newRoute = {
          name: `Concurrent Route ${index}`,
          startLocation: 'Start',
          endLocation: 'End',
          distance: 100 + index,
          province: 'Province',
          status: 'active',
        };

        return request(app.app)
          .post('/v1/routes')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newRoute)
          .expect(201);
      });

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('name');
      });
    });

    it('should handle mixed concurrent requests', async () => {
      const promises = [
        request(app.app).get('/v1/routes').expect(200),
        request(app.app).get('/v1/buses').expect(200),
        request(app.app).get('/v1/trips').expect(200),
        request(app.app).get('/v1/health').expect(200),
        request(app.app).get('/v1/status').expect(200),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle requests with large payloads', async () => {
      const largePayload = {
        name: 'Large Payload Route',
        startLocation: 'A'.repeat(10000),
        endLocation: 'B'.repeat(10000),
        distance: 100,
        province: 'C'.repeat(10000),
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload)
        .expect(201);

      expect(response.body.data.name).toBe(largePayload.name);
    });

    it('should handle requests with deeply nested objects', async () => {
      const nestedPayload = {
        name: 'Nested Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
        metadata: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'deep value'
                }
              }
            }
          }
        }
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nestedPayload)
        .expect(201);

      expect(response.body.data.name).toBe(nestedPayload.name);
    });
  });

  describe('Network and Connection Edge Cases', () => {
    it('should handle requests with unusual headers', async () => {
      const response = await request(app.app)
        .get('/v1/routes')
        .set('X-Custom-Header', 'unusual-value')
        .set('User-Agent', 'Custom-Agent/1.0')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should handle requests with missing Content-Type', async () => {
      const newRoute = {
        name: 'No Content Type Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newRoute)
        .expect(201);

      expect(response.body.data.name).toBe(newRoute.name);
    });

    it('should handle requests with wrong Content-Type', async () => {
      const newRoute = {
        name: 'Wrong Content Type Route',
        startLocation: 'Start',
        endLocation: 'End',
        distance: 100,
        province: 'Province',
        status: 'active',
      };

      const response = await request(app.app)
        .post('/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(newRoute))
        .expect(201);

      expect(response.body.data.name).toBe(newRoute.name);
    });
  });
});
