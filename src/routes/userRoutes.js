const express = require('express');
const { protect } = require('../middleware/authMiddleware'); // Authentication middleware
const { getUserProfile, updateUserProfile,createUserProfile, login} = require('../controllers/userController'); // Import controller functions
const limiter = require('../middleware/rateLimit');

const router = express.Router();
//Route to create a user profile
router.post('/register', limiter, createUserProfile);

// Route to get user profile
router.get('/get-users',  limiter,protect,getUserProfile);

//Route to login user
router.post('/login', limiter,login);

// Route to update user profile
router.put('/me',  updateUserProfile);


module.exports = router;
