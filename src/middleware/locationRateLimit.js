const rateLimit = require('express-rate-limit');

// Rate limiter for location updates (more restrictive for operators)
const locationUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 updates per minute per IP (1 per second)
  message: 'Too many location updates, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for location queries (less restrictive for commuters)
const locationQueryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 queries per minute per IP
  message: 'Too many location queries, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  locationUpdateLimiter,
  locationQueryLimiter,
};
