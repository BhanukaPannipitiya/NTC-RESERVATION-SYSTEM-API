const express = require('express');
const busesController = require('../../controllers/busesController');
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
 *     Bus:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         number:
 *           type: string
 *         routeId:
 *           type: integer
 *         capacity:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         operator:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /v1/buses:
 *   get:
 *     summary: Get all buses
 *     tags: [Buses]
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
 *           default: number:asc
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *     responses:
 *       200:
 *         description: Buses retrieved successfully
 */
router.get(
  '/',
  rateLimitMiddleware.readOnly(),
  validationMiddleware.validatePagination(),
  validationMiddleware.validateSort(['number', 'capacity', 'createdAt']),
  error.asyncHandler(busesController.getAllBuses.bind(busesController)),
);

/**
 * @swagger
 * /v1/buses/{id}:
 *   get:
 *     summary: Get bus by ID
 *     tags: [Buses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bus retrieved successfully
 *       304:
 *         description: Not modified
 *       404:
 *         description: Bus not found
 */
router.get(
  '/:id',
  rateLimitMiddleware.readOnly(),
  validationMiddleware.validateId('id'),
  validationMiddleware.validateConditionalGet,
  error.asyncHandler(busesController.getBusById.bind(busesController)),
);

/**
 * @swagger
 * /v1/buses:
 *   post:
 *     summary: Create new bus (NTC only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Bus'
 *     responses:
 *       201:
 *         description: Bus created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Bus number already exists
 */
router.post(
  '/',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateBody(require('../../models/Bus').schema),
  error.asyncHandler(busesController.createBus.bind(busesController)),
);

/**
 * @swagger
 * /v1/buses/{id}:
 *   put:
 *     summary: Update bus (NTC only)
 *     tags: [Buses]
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
 *             $ref: '#/components/schemas/Bus'
 *     responses:
 *       200:
 *         description: Bus updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Bus not found
 */
router.put(
  '/:id',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  validationMiddleware.validateBody(require('../../models/Bus').schema),
  error.asyncHandler(busesController.updateBus.bind(busesController)),
);

/**
 * @swagger
 * /v1/buses/{id}:
 *   delete:
 *     summary: Delete bus (NTC only)
 *     tags: [Buses]
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
 *         description: Bus deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Bus not found
 *       409:
 *         description: Bus has associated trips
 */
router.delete(
  '/:id',
  auth.authenticate,
  auth.requireNTC,
  rateLimitMiddleware.write(),
  validationMiddleware.validateId('id'),
  error.asyncHandler(busesController.deleteBus.bind(busesController)),
);

module.exports = router;
