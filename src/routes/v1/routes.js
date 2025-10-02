const express = require('express');
const routesController = require('../../controllers/routesController');
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
 *     Route:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         startLocation:
 *           type: string
 *         endLocation:
 *           type: string
 *         distance:
 *           type: number
 *         province:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /v1/routes:
 *   get:
 *     summary: Get all routes
 *     tags: [Routes]
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
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: name:asc
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Routes retrieved successfully
 */
router.get(
  '/',
  rateLimitMiddleware.readOnly(),
  validationMiddleware.validatePagination(),
  validationMiddleware.validateSort(['name', 'distance', 'createdAt']),
  error.asyncHandler(routesController.getAllRoutes.bind(routesController)),
);

/**
 * @swagger
 * /v1/routes/{id}:
 *   get:
 *     summary: Get route by ID
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Route retrieved successfully
 *       304:
 *         description: Not modified
 *       404:
 *         description: Route not found
 */
router.get(
  '/:id',
  rateLimitMiddleware.readOnly(),
  validationMiddleware.validateId('id'),
  validationMiddleware.validateConditionalGet,
  error.asyncHandler(routesController.getRouteById.bind(routesController)),
);

/**
 * @swagger
 * /v1/routes:
 *   post:
 *     summary: Create new route (NTC only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Route'
 *     responses:
 *       201:
 *         description: Route created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Route name already exists
 */
router.post(
  '/',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateBody(require('../../models/Route').schema),
  error.asyncHandler(routesController.createRoute.bind(routesController)),
);

/**
 * @swagger
 * /v1/routes/{id}:
 *   put:
 *     summary: Update route (NTC only)
 *     tags: [Routes]
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
 *             $ref: '#/components/schemas/Route'
 *     responses:
 *       200:
 *         description: Route updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Route not found
 */
router.put(
  '/:id',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  validationMiddleware.validateBody(require('../../models/Route').schema),
  error.asyncHandler(routesController.updateRoute.bind(routesController)),
);

/**
 * @swagger
 * /v1/routes/{id}:
 *   delete:
 *     summary: Delete route (NTC only)
 *     tags: [Routes]
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
 *         description: Route deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Route not found
 *       409:
 *         description: Route has associated buses or trips
 */
router.delete(
  '/:id',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  error.asyncHandler(routesController.deleteRoute.bind(routesController)),
);

module.exports = router;
