const express = require('express');
const authController = require('../../controllers/authController');
const authMiddleware = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validate');
const rateLimitMiddleware = require('../../middleware/rateLimit');
const errorHandler = require('../../middleware/errorHandler');

// Get bound middleware functions
const auth = authMiddleware.getMiddleware();
const error = errorHandler.getMiddleware();

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         role:
 *           type: string
 *           enum: [NTC, Operator, Commuter]
 *         email:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - email
 *         - role
 *       properties:
 *         username:
 *           type: string
 *         password:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [NTC, Operator, Commuter]
 */

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many requests
 */
router.post(
  '/login',
  rateLimitMiddleware.auth(),
  validationMiddleware.validateLogin(),
  error.asyncHandler(authController.login.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Username or email already exists
 */
router.post(
  '/register',
  rateLimitMiddleware.general(),
  validationMiddleware.validateUserRegistration(),
  error.asyncHandler(authController.register.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/profile/{id}:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       304:
 *         description: Not modified
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.get(
  '/profile/:id',
  auth.authenticate,
  validationMiddleware.validateId('id'),
  error.asyncHandler(authController.getProfile.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/profile/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.put(
  '/profile/:id',
  auth.authenticate,
  validationMiddleware.validateId('id'),
  error.asyncHandler(authController.updateProfile.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/change-password',
  auth.authenticate,
  rateLimitMiddleware.general(),
  error.asyncHandler(authController.changePassword.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/users',
  auth.authenticate,
  auth.requireNTC,
  validationMiddleware.validatePagination(),
  error.asyncHandler(authController.getAllUsers.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete(
  '/users/:id',
  auth.authenticate,
  auth.requireNTC,
  validationMiddleware.validateId('id'),
  error.asyncHandler(authController.deleteUser.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/statistics:
 *   get:
 *     summary: Get user statistics (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/statistics',
  auth.authenticate,
  auth.requireNTC,
  error.asyncHandler(authController.getUserStatistics.bind(authController)),
);

/**
 * @swagger
 * /v1/auth/validate:
 *   get:
 *     summary: Validate JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 */
router.get(
  '/validate',
  auth.authenticate,
  error.asyncHandler(authController.validateToken.bind(authController)),
);

module.exports = router;
