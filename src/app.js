require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const validationMiddleware = require('./middleware/validate');
const logger = require('./utils/logger');
const gpsSimulator = require('./utils/gpsSimulator');

// Import controllers and services
const authController = require('./controllers/authController');
const routesController = require('./controllers/routesController');
const busesController = require('./controllers/busesController');
const tripsController = require('./controllers/tripsController');
const locationsController = require('./controllers/locationsController');

// Import routes
const v1Routes = require('./routes/v1');

/**
 * NTC Bus Tracking API - Main Application
 * Production-ready RESTful API for bus tracking system
 */
class BusTrackingAPI {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || (process.env.NODE_ENV === 'test' ? 0 : 3000);
    this.db = null;
    this.server = null;
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    try {
      // Ensure data directory exists
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize lowdb with simulation data
      const adapter = new FileSync(path.join(dataDir, 'simulation.json'));
      this.db = lowdb(adapter);

      // Set default values if database is empty
      this.db.defaults({
        routes: [],
        buses: [],
        trips: [],
        users: [],
      }).write();

      logger.info('Database initialized successfully', {
        routes: this.db.get('routes').value().length,
        buses: this.db.get('buses').value().length,
        trips: this.db.get('trips').value().length,
        users: this.db.get('users').value().length,
      });

      return this.db;
    } catch (error) {
      logger.error('Database initialization failed', error);
      throw error;
    }
  }

  /**
   * Initialize controllers with database
   */
  initializeControllers() {
    try {
      // Make database accessible to routes
      this.app.locals.db = this.db;
      
      authController.init(this.db);
      routesController.init(this.db);
      busesController.init(this.db);
      tripsController.init(this.db);
      locationsController.init(this.db);

      logger.info('Controllers initialized successfully');
    } catch (error) {
      logger.error('Controller initialization failed', error);
      throw error;
    }
  }

  /**
   * Configure middleware
   */
  configureMiddleware() {
    try {
      // Security middleware
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      }));

      // CORS configuration
      this.app.use(cors({
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
      }));

      // Body parsing middleware
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // Request sanitization
      this.app.use(validationMiddleware.sanitizeRequest);

      // Trust proxy for accurate IP addresses
      this.app.set('trust proxy', 1);

      // Request logging middleware
      this.app.use((req, res, next) => {
        const start = Date.now();

        res.on('finish', () => {
          const duration = Date.now() - start;
          logger.logRequest(req, res, duration);
        });

        next();
      });

      logger.info('Middleware configured successfully');
    } catch (error) {
      logger.error('Middleware configuration failed', error);
      throw error;
    }
  }

  /**
   * Configure routes
   */
  configureRoutes() {
    try {
      // API documentation route
      if (process.env.NODE_ENV !== 'production') {
        const swaggerUi = require('swagger-ui-express');
        const swaggerJsdoc = require('swagger-jsdoc');

        const swaggerOptions = {
          definition: {
            openapi: '3.0.0',
            info: {
              title: 'NTC Bus Tracking API',
              version: '1.0.0',
              description: 'RESTful API for National Transport Commission bus tracking system',
              contact: {
                name: 'Student ID: 12345',
                email: 'student@coventry.ac.uk',
              },
            },
            servers: [
              {
                url: process.env.API_URL || `http://localhost:${this.port}`,
                description: 'API Server',
              },
            ],
          },
          apis: ['./src/routes/v1/*.js'],
        };

        const swaggerSpec = swaggerJsdoc(swaggerOptions);

        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
          explorer: true,
          customCss: '.swagger-ui .topbar { display: none }',
          customSiteTitle: 'NTC Bus Tracking API Documentation',
        }));

        logger.info('Swagger documentation available at /api-docs');
      }

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          service: 'NTC Bus Tracking API',
        });
      });

      // API routes
      this.app.use('/v1', v1Routes);

      // Root endpoint
      this.app.get('/', (req, res) => {
        res.status(200).json({
          message: 'Welcome to NTC Bus Tracking API',
          service: 'NTC Bus Tracking API',
          version: '1.0.0',
          documentation: '/api-docs',
          endpoints: {
            health: '/health',
            status: '/v1/status',
            auth: '/v1/auth',
            routes: '/v1/routes',
            buses: '/v1/buses',
            trips: '/v1/trips',
            locations: '/v1/locations',
          },
          links: {
            self: { href: '/', method: 'GET' },
            health: { href: '/health', method: 'GET' },
            docs: { href: '/api-docs', method: 'GET' },
            auth: { href: '/v1/auth/login', method: 'POST' },
          },
        });
      });

      // Get bound middleware functions
      const errorMiddleware = errorHandler.getMiddleware();

      // 404 handler for undefined routes
      this.app.use(errorMiddleware.handleNotFound);

      // Global error handler
      this.app.use(errorMiddleware.handleError);

      logger.info('Routes configured successfully');
    } catch (error) {
      logger.error('Route configuration failed', error);
      throw error;
    }
  }

  /**
   * Start GPS simulation
   */
  startGPSSimulation() {
    try {
      gpsSimulator.start(this.db);
      logger.info('GPS simulation started');
    } catch (error) {
      logger.error('GPS simulation failed to start', error);
    }
  }

  /**
   * Graceful shutdown handler
   */
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop GPS simulation
      gpsSimulator.stop();

      // Close server
      if (this.server) {
        this.server.close(() => {
          logger.info('Server closed successfully');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      shutdown('unhandledRejection');
    });
  }

  /**
   * Start the application
   */
  async start() {
    try {
      logger.info('Starting NTC Bus Tracking API...');

      // Initialize database
      await this.initializeDatabase();

      // Initialize controllers
      this.initializeControllers();

      // Configure middleware
      this.configureMiddleware();

      // Configure routes
      this.configureRoutes();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start GPS simulation
      this.startGPSSimulation();

      // Start server
      this.server = this.app.listen(this.port, () => {
        // Get actual port (important for dynamic ports in testing)
        const actualPort = this.server.address().port;
        this.port = actualPort;
        
        logger.info('NTC Bus Tracking API started successfully', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          documentation: process.env.NODE_ENV !== 'production'
            ? `http://localhost:${this.port}/api-docs`
            : 'Not available in production',
        });

        if (process.env.NODE_ENV !== 'test') {
          console.log(`
🚌 NTC Bus Tracking API v1.0.0
📡 Server running on port ${this.port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📚 API Documentation: http://localhost:${this.port}/api-docs
🔍 Health Check: http://localhost:${this.port}/health
🚀 Ready to track buses!
          `);
        }
      });
    } catch (error) {
      logger.error('Failed to start application', error);
      process.exit(1);
    }
  }
}

// Create and start the application
const app = new BusTrackingAPI();
app.start();

module.exports = app;
