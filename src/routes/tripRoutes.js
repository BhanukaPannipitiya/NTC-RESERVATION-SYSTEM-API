const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createTrip, listTrips, getTrip, updateTrip, deleteTrip } = require('../controllers/tripController');
const limiter = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', limiter, listTrips);
router.post('/', limiter, protect, authorize('admin', 'operator'), createTrip);
router.get('/:id', limiter, getTrip);
router.put('/:id', limiter, protect, authorize('admin', 'operator'), updateTrip);
router.delete('/:id', limiter, protect, authorize('admin'), deleteTrip);

module.exports = router;


