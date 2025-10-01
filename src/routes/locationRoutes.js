const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { pushLocation, currentPositions, getLocationHistory } = require('../controllers/locationController');
const { validatePushLocation, validateCurrentPositions } = require('../validators/locationValidators');
const { locationUpdateLimiter, locationQueryLimiter } = require('../middleware/locationRateLimit');

const router = express.Router();

// Public endpoints for commuters (with query rate limiting)
router.get('/current', locationQueryLimiter, validateCurrentPositions, currentPositions);
router.get('/history', locationQueryLimiter, getLocationHistory);

// Protected endpoints for operators (with update rate limiting)
router.post('/', locationUpdateLimiter, protect, authorize('operator', 'admin'), validatePushLocation, pushLocation);

module.exports = router;


