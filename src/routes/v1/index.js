const express = require('express');
const authRoutes = require('./auth');
const routesRoutes = require('./routes');
const busesRoutes = require('./buses');
const tripsRoutes = require('./trips');
const locationsRoutes = require('./locations');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and management
 *   - name: Routes
 *     description: Bus route management
 *   - name: Buses
 *     description: Bus fleet management
 *   - name: Trips
 *     description: Trip scheduling and tracking
 *   - name: Locations
 *     description: Real-time location updates
 */

/**
 * @swagger
 * /v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'NTC Bus Tracking API',
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * @swagger
 * /v1/status:
 *   get:
 *     summary: System status endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 *                 database:
 *                   type: object
 */
router.get('/status', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  res.status(200).json({
    status: 'operational',
    uptime: Math.floor(uptime),
    memory: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      free: Math.round((memory.heapTotal - memory.heapUsed) / 1024 / 1024),
      rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memory.external / 1024 / 1024)}MB`,
    },
    database: {
      status: 'connected',
      connected: true,
      records: {
        routes: req.app.locals.db ? req.app.locals.db.get('routes').size().value() : 0,
        buses: req.app.locals.db ? req.app.locals.db.get('buses').size().value() : 0,
        trips: req.app.locals.db ? req.app.locals.db.get('trips').size().value() : 0,
        users: req.app.locals.db ? req.app.locals.db.get('users').size().value() : 0,
      },
    },
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/routes', routesRoutes);
router.use('/buses', busesRoutes);
router.use('/trips', tripsRoutes);
router.use('/locations', locationsRoutes);

module.exports = router;
