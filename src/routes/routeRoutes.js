const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createRoute, listRoutes, getRoute, updateRoute, deleteRoute } = require('../controllers/routeController');
const { validateCreateRoute, validateUpdateRoute, validateListRoutes } = require('../validators/routeValidators');
const limiter = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', limiter, validateListRoutes, listRoutes);
router.post('/', limiter, protect, authorize('admin'), validateCreateRoute, createRoute);
router.get('/:id', limiter, getRoute);
router.put('/:id', limiter, protect, authorize('admin'), validateUpdateRoute, updateRoute);
router.delete('/:id', limiter, protect, authorize('admin'), deleteRoute);

module.exports = router;


