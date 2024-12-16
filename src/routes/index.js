const express = require('express');
const userRoutes = require('./userRoutes');
const reservationRoutes = require('./reservationRoutes');

const router = express.Router();

// Mount route modules
router.use('/users', userRoutes);
// router.use('/reservations', reservationRoutes);

module.exports = router;
