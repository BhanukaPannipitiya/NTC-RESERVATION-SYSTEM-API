const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { pushLocation, currentPositions } = require('../controllers/locationController');
const limiter = require('../middleware/rateLimit');

const router = express.Router();

router.get('/current', limiter, currentPositions);
router.post('/', limiter, protect, authorize('operator', 'admin'), pushLocation);

module.exports = router;


