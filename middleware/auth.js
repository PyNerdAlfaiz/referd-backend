// middleware/auth.js - ADD DEBUG LOGGING TO YOUR EXISTING AUTH MIDDLEWARE

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

// @desc  Protect routes
const auth = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  console.log('🔐 AUTH MIDDLEWARE DEBUG:');
  console.log('   Token exists:', !!token);
  console.log('   Token preview:', token ? token.substring(0, 20) + '...' : 'No token');

  // Make sure token exists
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    console.log('   Decoded token user ID:', decoded.id);

    // Try to find user first, then company
    let currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      currentUser = await Company.findById(decoded.id);
    }

    if (!currentUser) {
      console.log('❌ No user found with token ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }

    console.log('✅ User found:', {
      id: currentUser._id,
      userType: currentUser.userType,
      email: currentUser.email,
      companyName: currentUser.companyName || 'N/A'
    });

    req.user = currentUser;
    req.userType = currentUser.userType;
    
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// @desc  Grant access to specific user types
const requireUser = (req, res, next) => {
  console.log('👤 REQUIRE USER MIDDLEWARE:');
  console.log('   User type:', req.userType);
  
  if (req.userType !== 'user') {
    console.log('❌ Access denied - not a user');
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Only users can access this resource'
    });
  }
  
  console.log('✅ User access granted');
  next();
};

// @desc  Grant access to companies only
const requireCompany = (req, res, next) => {
  console.log('🏢 REQUIRE COMPANY MIDDLEWARE:');
  console.log('   User type:', req.userType);
  console.log('   User ID:', req.user?._id);
  console.log('   Company Name:', req.user?.companyName || 'N/A');
  
  if (req.userType !== 'company') {
    console.log('❌ Access denied - not a company');
    console.log('   Expected: company, Got:', req.userType);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Only companies can access this resource'
    });
  }
  
  console.log('✅ Company access granted');
  next();
};

module.exports = {
  auth,
  requireUser,
  requireCompany
};