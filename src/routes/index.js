const express = require('express');
const userRoutes = require('./userRoutes');
const routeRoutes = require('./routeRoutes');
const busRoutes = require('./busRoutes');
const tripRoutes = require('./tripRoutes');
const locationRoutes = require('./locationRoutes');

const router = express.Router();

// Mount route modules
router.use('/users', userRoutes);
router.use('/routes', routeRoutes);
router.use('/buses', busRoutes);
router.use('/trips', tripRoutes);
router.use('/locations', locationRoutes);

module.exports = router;
