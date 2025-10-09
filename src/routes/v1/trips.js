const express = require('express');
const tripsController = require('../../controllers/tripsController');
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
 *     Trip:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         routeId:
 *           type: integer
 *         busId:
 *           type: integer
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [scheduled, running, completed, cancelled]
 *         currentLat:
 *           type: number
 *         currentLng:
 *           type: number
 *         passengerCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /v1/trips:
 *   get:
 *     summary: Get all trips
 *     tags: [Trips]
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
 *           default: startTime:asc
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: busId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, running, completed, cancelled]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Trips retrieved successfully
 */
router.get(
  '/',
  rateLimitMiddleware.readOnly(),
  validationMiddleware.validatePagination(),
  validationMiddleware.validateSort(['startTime', 'endTime', 'createdAt']),
  validationMiddleware.validateDateRange(),
  error.asyncHandler(tripsController.getAllTrips.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips/running:
 *   get:
 *     summary: Get running trips
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: Running trips retrieved successfully
 */
router.get(
  '/running',
  rateLimitMiddleware.readOnly(),
  error.asyncHandler(tripsController.getRunningTrips.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips/{id}:
 *   get:
 *     summary: Get trip by ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trip retrieved successfully
 *       304:
 *         description: Not modified
 *       404:
 *         description: Trip not found
 */
router.get(
  '/:id',
  rateLimitMiddleware.readOnly(),
  validationMiddleware.validateId('id'),
  validationMiddleware.validateConditionalGet,
  error.asyncHandler(tripsController.getTripById.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips:
 *   post:
 *     summary: Create new trip (NTC only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Bus not available during specified time
 */
router.post(
  '/',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateBody(require('../../models/Trip').schema),
  error.asyncHandler(tripsController.createTrip.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips/{id}:
 *   put:
 *     summary: Update trip (NTC/Operator)
 *     tags: [Trips]
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
 *             $ref: '#/components/schemas/Trip'
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 */
router.put(
  '/:id',
  auth.authenticate,
  auth.requireOperator,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  validationMiddleware.validateBody(require('../../models/Trip').schema),
  error.asyncHandler(tripsController.updateTrip.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips/{id}:
 *   delete:
 *     summary: Delete trip (NTC only)
 *     tags: [Trips]
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
 *         description: Trip deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 *       409:
 *         description: Trip is not scheduled
 */
router.delete(
  '/:id',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  error.asyncHandler(tripsController.deleteTrip.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips/{id}/start:
 *   post:
 *     summary: Start trip (NTC/Operator)
 *     tags: [Trips]
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
 *         description: Trip started successfully
 *       400:
 *         description: Trip is not scheduled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 */
router.post(
  '/:id/start',
  auth.authenticate,
  auth.requireOperator,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  error.asyncHandler(tripsController.startTrip.bind(tripsController)),
);

/**
 * @swagger
 * /v1/trips/{id}/complete:
 *   post:
 *     summary: Complete trip (NTC/Operator)
 *     tags: [Trips]
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
 *         description: Trip completed successfully
 *       400:
 *         description: Trip is not running
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 */
router.post(
  '/:id/complete',
  auth.authenticate,
  auth.requireOperator,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  error.asyncHandler(tripsController.completeTrip.bind(tripsController)),
);

module.exports = router;
