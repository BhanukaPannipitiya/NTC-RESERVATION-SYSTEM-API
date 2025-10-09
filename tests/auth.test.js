const request = require('supertest');
const app = require('../src/app');

describe('Authentication API', () => {
  let authToken;
  let userId;
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
    userId = loginResponse.body.data.user.id;

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

  describe('POST /v1/auth/login', () => {
    it('should login with valid NTC admin credentials', async () => {
      const response = await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'ntc_admin',
          password: 'pass',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('username', 'ntc_admin');
      expect(response.body.data.user).toHaveProperty('role', 'NTC');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should login with valid operator credentials', async () => {
      const response = await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'operator1',
          password: 'pass',
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('Operator');
    });

    it('should login with valid commuter credentials', async () => {
      const response = await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'commuter1',
          password: 'pass',
        })
        .expect(200);

      expect(response.body.data.user.role).toBe('Commuter');
    });

    it('should return 401 with invalid credentials', async () => {
      await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'invalid_user',
          password: 'wrong_password',
        })
        .expect(401);
    });

    it('should return 400 with missing username', async () => {
      await request(app.app)
        .post('/v1/auth/login')
        .send({
          password: 'pass',
        })
        .expect(400);
    });

    it('should return 400 with missing password', async () => {
      await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 'ntc_admin',
        })
        .expect(400);
    });

    it('should return 400 with empty credentials', async () => {
      await request(app.app)
        .post('/v1/auth/login')
        .send({})
        .expect(400);
    });

    it('should return 400 with invalid data types', async () => {
      await request(app.app)
        .post('/v1/auth/login')
        .send({
          username: 123,
          password: 456,
        })
        .expect(400);
    });
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new commuter user', async () => {
      const newUser = {
        username: 'test_commuter',
        password: 'test_password123',
        email: 'test@example.com',
        role: 'Commuter',
      };

      const response = await request(app.app)
        .post('/v1/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.username).toBe(newUser.username);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.role).toBe(newUser.role);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should register a new operator user', async () => {
      const newUser = {
        username: 'test_operator',
        password: 'test_password123',
        email: 'operator@example.com',
        role: 'Operator',
      };

      const response = await request(app.app)
        .post('/v1/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body.data.role).toBe('Operator');
    });

    it('should return 409 with duplicate username', async () => {
      const duplicateUser = {
        username: 'ntc_admin', // Already exists
        password: 'test_password',
        email: 'test2@example.com',
        role: 'Commuter',
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(duplicateUser)
        .expect(409);
    });

    it('should return 409 with duplicate email', async () => {
      const duplicateUser = {
        username: 'new_user',
        password: 'test_password',
        email: 'admin@ntc.gov.lk', // Already exists
        role: 'Commuter',
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(duplicateUser)
        .expect(409);
    });

    it('should return 400 with invalid username (too short)', async () => {
      const invalidUser = {
        username: 'ab',
        password: 'test_password123',
        email: 'test@example.com',
        role: 'Commuter',
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return 400 with invalid password (too short)', async () => {
      const invalidUser = {
        username: 'test_user',
        password: '123',
        email: 'test@example.com',
        role: 'Commuter',
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return 400 with invalid email format', async () => {
      const invalidUser = {
        username: 'test_user',
        password: 'test_password123',
        email: 'invalid-email',
        role: 'Commuter',
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return 400 with invalid role', async () => {
      const invalidUser = {
        username: 'test_user',
        password: 'test_password123',
        email: 'test@example.com',
        role: 'InvalidRole',
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(invalidUser)
        .expect(400);
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteUser = {
        username: 'test_user',
        // Missing password, email, role
      };

      await request(app.app)
        .post('/v1/auth/register')
        .send(incompleteUser)
        .expect(400);
    });
  });

  describe('GET /v1/auth/profile/:id', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app.app)
        .get(`/v1/auth/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', userId);
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      await request(app.app)
        .get(`/v1/auth/profile/${userId}`)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.app)
        .get(`/v1/auth/profile/${userId}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should return 401 with malformed token', async () => {
      await request(app.app)
        .get(`/v1/auth/profile/${userId}`)
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.app)
        .get('/v1/auth/profile/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 with invalid user ID', async () => {
      await request(app.app)
        .get('/v1/auth/profile/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /v1/auth/profile/:id', () => {
    it('should update user profile with valid data', async () => {
      const updateData = {
        username: 'updated_admin',
        email: 'updated@ntc.gov.lk',
      };

      const response = await request(app.app)
        .put(`/v1/auth/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.username).toBe(updateData.username);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should return 401 without token', async () => {
      const updateData = {
        username: 'updated_admin',
      };

      await request(app.app)
        .put(`/v1/auth/profile/${userId}`)
        .send(updateData)
        .expect(401);
    });

    it('should return 400 with invalid email format', async () => {
      const updateData = {
        email: 'invalid-email',
      };

      await request(app.app)
        .put(`/v1/auth/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should return 400 with invalid username (too short)', async () => {
      const updateData = {
        username: 'ab',
      };

      await request(app.app)
        .put(`/v1/auth/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      const updateData = {
        username: 'updated_admin',
      };

      await request(app.app)
        .put('/v1/auth/profile/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('PUT /v1/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'pass',
        newPassword: 'new_password123',
      };

      const response = await request(app.app)
        .put('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.message).toContain('Password changed successfully');
    });

    it('should return 401 without token', async () => {
      const passwordData = {
        currentPassword: 'pass',
        newPassword: 'new_password123',
      };

      await request(app.app)
        .put('/v1/auth/change-password')
        .send(passwordData)
        .expect(401);
    });

    it('should return 400 with invalid current password', async () => {
      const passwordData = {
        currentPassword: 'wrong_password',
        newPassword: 'new_password123',
      };

      await request(app.app)
        .put('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);
    });

    it('should return 400 with missing current password', async () => {
      const passwordData = {
        newPassword: 'new_password123',
      };

      await request(app.app)
        .put('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);
    });

    it('should return 400 with missing new password', async () => {
      const passwordData = {
        currentPassword: 'pass',
      };

      await request(app.app)
        .put('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);
    });

    it('should return 400 with new password too short', async () => {
      const passwordData = {
        currentPassword: 'pass',
        newPassword: '123',
      };

      await request(app.app)
        .put('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400);
    });
  });

  describe('GET /v1/auth/users', () => {
    it('should return all users for NTC admin', async () => {
      const response = await request(app.app)
        .get('/v1/auth/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should return 401 without token', async () => {
      await request(app.app)
        .get('/v1/auth/users')
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      await request(app.app)
        .get('/v1/auth/users')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .get('/v1/auth/users')
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should support pagination', async () => {
      const response = await request(app.app)
        .get('/v1/auth/users?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('DELETE /v1/auth/users/:id', () => {
    let testUserId;

    beforeAll(async () => {
      // Create a test user to delete
      const newUser = {
        username: 'user_to_delete',
        password: 'test_password123',
        email: 'delete@example.com',
        role: 'Commuter',
      };

      const response = await request(app.app)
        .post('/v1/auth/register')
        .send(newUser);

      testUserId = response.body.data.id;
    });

    it('should delete user for NTC admin', async () => {
      await request(app.app)
        .delete(`/v1/auth/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should return 401 without token', async () => {
      await request(app.app)
        .delete(`/v1/auth/users/${testUserId}`)
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      await request(app.app)
        .delete(`/v1/auth/users/${testUserId}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .delete(`/v1/auth/users/${testUserId}`)
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.app)
        .delete('/v1/auth/users/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 with invalid user ID', async () => {
      await request(app.app)
        .delete('/v1/auth/users/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /v1/auth/statistics', () => {
    it('should return user statistics for NTC admin', async () => {
      const response = await request(app.app)
        .get('/v1/auth/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('usersByRole');
      expect(response.body.data.usersByRole).toHaveProperty('NTC');
      expect(response.body.data.usersByRole).toHaveProperty('Operator');
      expect(response.body.data.usersByRole).toHaveProperty('Commuter');
    });

    it('should return 401 without token', async () => {
      await request(app.app)
        .get('/v1/auth/statistics')
        .expect(401);
    });

    it('should return 403 for operator role', async () => {
      await request(app.app)
        .get('/v1/auth/statistics')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(403);
    });

    it('should return 403 for commuter role', async () => {
      await request(app.app)
        .get('/v1/auth/statistics')
        .set('Authorization', `Bearer ${commuterToken}`)
        .expect(403);
    });
  });

  describe('GET /v1/auth/validate', () => {
    it('should validate a valid token', async () => {
      const response = await request(app.app)
        .get('/v1/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('role');
    });

    it('should return 401 with invalid token', async () => {
      await request(app.app)
        .get('/v1/auth/validate')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should return 401 without token', async () => {
      await request(app.app)
        .get('/v1/auth/validate')
        .expect(401);
    });

    it('should return 401 with malformed token', async () => {
      await request(app.app)
        .get('/v1/auth/validate')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });
});