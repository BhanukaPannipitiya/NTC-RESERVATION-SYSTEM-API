const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createBus, listBuses, getBus, updateBus, deleteBus } = require('../controllers/busController');
const { validateCreateBus, validateUpdateBus, validateListBuses } = require('../validators/busValidators');
const limiter = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', limiter, validateListBuses, listBuses);
router.post('/', limiter, protect, authorize('admin', 'operator'), validateCreateBus, createBus);
router.get('/:id', limiter, getBus);
router.put('/:id', limiter, protect, authorize('admin', 'operator'), validateUpdateBus, updateBus);
router.delete('/:id', limiter, protect, authorize('admin'), deleteBus);

module.exports = router;


