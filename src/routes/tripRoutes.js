const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createTrip, listTrips, getTrip, updateTrip, deleteTrip, generateSchedule } = require('../controllers/tripController');
const { validateCreateTrip, validateUpdateTrip, validateListTrips, validateGenerateSchedule } = require('../validators/tripValidators');
const limiter = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', limiter, validateListTrips, listTrips);
router.post('/', limiter, protect, authorize('admin', 'operator'), validateCreateTrip, createTrip);
router.post('/generate-schedule', limiter, protect, authorize('admin', 'operator'), validateGenerateSchedule, generateSchedule);
router.get('/:id', limiter, getTrip);
router.put('/:id', limiter, protect, authorize('admin', 'operator'), validateUpdateTrip, updateTrip);
router.delete('/:id', limiter, protect, authorize('admin'), deleteTrip);

module.exports = router;


