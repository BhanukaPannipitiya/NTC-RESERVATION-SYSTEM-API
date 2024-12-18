const express = require('express');
const { protect } = require('../middleware/authMiddleware'); 
const { getUserProfile, updateUserProfile,createUserProfile,login, logout} = require('../controllers/userController'); 
const limiter = require('../middleware/rateLimit');

const router = express.Router();
//Route to create a user profile
router.post('/register', limiter, createUserProfile);

// Route to get user profile
router.get('/get-users',  limiter,protect,getUserProfile);

//Route to login user
router.get('/user-login',limiter,login);

// Route to logout user
router.get('/user-logout', limiter,protect,logout);


module.exports = router;
