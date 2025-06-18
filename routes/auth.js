// routes/auth.js - Simplified working version
const express = require('express');
const router = express.Router();

// Import controllers
const {
  registerUser,
  registerCompany,
  login,
  getMe,
  logout
} = require('../controllers/authController');

// Test route
router.get('/test', (req, res) => {
  console.log('✅ Auth test route accessed');
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /register': 'Register new user',
      'POST /register-company': 'Register new company',
      'POST /login': 'User/Company login',
      'GET /me': 'Get current user',
      'POST /logout': 'User logout'
    }
  });
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerUser);

// @desc    Register company  
// @route   POST /api/auth/register-company
// @access  Public
router.post('/register-company', registerCompany);

// @desc    Login user/company
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', getMe);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', logout);

module.exports = router;