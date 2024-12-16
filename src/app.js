const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimiter = require('./middleware/rateLimit');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(rateLimiter); // Rate limiting

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
