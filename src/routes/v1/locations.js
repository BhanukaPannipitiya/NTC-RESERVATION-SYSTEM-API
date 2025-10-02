const express = require('express');
const locationsController = require('../../controllers/locationsController');
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
 *     LocationUpdate:
 *       type: object
 *       required:
 *         - tripId
 *         - lat
 *         - lng
 *       properties:
 *         tripId:
 *           type: integer
 *         lat:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         lng:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 */

/**
 * @swagger
 * /v1/locations:
 *   post:
 *     summary: Update trip location (Operator only)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationUpdate'
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Trip is not running
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Trip not found
 *       429:
 *         description: Too many location updates
 */
router.post(
  '/',
  auth.authenticate,
  auth.requireOperator,
  rateLimitMiddleware.locationUpdate(),
  validationMiddleware.validateLocationUpdate(),
  error.asyncHandler(locationsController.updateLocation.bind(locationsController)),
);

module.exports = router;
