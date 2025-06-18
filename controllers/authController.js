// controllers/authController.js - Complete implementation for your existing routes

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: user.getSafeData()
    });
};

// @desc    Register a new user (job seeker)
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  try {
    console.log('📝 User registration attempt:', req.body.email);
    
    const { firstName, lastName, email, password, phone, referredBy } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide firstName, lastName, email, and password'
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Email format validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if user already exists (check both User and Company collections)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    const existingCompany = await Company.findOne({ email: email.toLowerCase() });

    if (existingUser || existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user data
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : undefined
    };

    // Handle referral if provided
    if (referredBy) {
      const referrer = await User.findByReferralCode(referredBy);
      if (referrer) {
        userData.referredByUser = referrer._id;
        userData.referralSource = referredBy;
        console.log('✅ Valid referral code used:', referredBy);
      } else {
        console.log('⚠️ Invalid referral code provided:', referredBy);
      }
    }

    // Create user
    const user = await User.create(userData);

    // Update referrer stats if applicable
    if (userData.referredByUser) {
      await User.findByIdAndUpdate(userData.referredByUser, {
        $inc: { 'referralStats.totalReferrals': 1 }
      });
      console.log('📈 Updated referrer stats');
    }

    console.log('✅ User registered successfully:', user.email, 'Referral Code:', user.referralCode);

    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    console.error('❌ User registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Register a new company
// @route   POST /api/auth/register-company
// @access  Public
exports.registerCompany = async (req, res, next) => {
  try {
    console.log('🏢 Company registration attempt:', req.body.email);
    
    const {
      email,
      password,
      companyName,
      industry,
      companySize,
      contactPerson,
      address,
      foundedYear,
      registrationNumber,
      vatNumber
    } = req.body;

    // Basic validation
    if (!email || !password || !companyName || !industry || !companySize) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, companyName, industry, companySize'
      });
    }

    if (!contactPerson || !contactPerson.firstName || !contactPerson.lastName || !contactPerson.position) {
      return res.status(400).json({
        success: false,
        message: 'Please provide contact person details: firstName, lastName, position'
      });
    }

    if (!address || !address.city || !address.postcode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide address details: city, postcode'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    const existingCompany = await Company.findOne({ email: email.toLowerCase() });

    if (existingUser || existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create company data
    const companyData = {
      email: email.toLowerCase().trim(),
      password,
      companyName: companyName.trim(),
      industry,
      companySize,
      profile: {
        contactPerson: {
          firstName: contactPerson.firstName.trim(),
          lastName: contactPerson.lastName.trim(),
          position: contactPerson.position.trim(),
          phone: contactPerson.phone ? contactPerson.phone.trim() : undefined,
          email: contactPerson.email ? contactPerson.email.toLowerCase().trim() : undefined
        },
        address: {
          street: address.street ? address.street.trim() : undefined,
          city: address.city.trim(),
          county: address.county ? address.county.trim() : undefined,
          postcode: address.postcode.trim(),
          country: address.country ? address.country.trim() : 'United Kingdom'
        }
      }
    };

    // Add optional fields
    if (foundedYear) {
      companyData.foundedYear = foundedYear;
    }
    if (registrationNumber) {
      companyData.registrationNumber = registrationNumber.trim();
    }
    if (vatNumber) {
      companyData.vatNumber = vatNumber.trim();
    }

    // Create company
    const company = await Company.create(companyData);

    console.log('✅ Company registered successfully:', company.email);

    sendTokenResponse(company, 201, res, 'Company registered successfully');
  } catch (error) {
    console.error('❌ Company registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during company registration'
    });
  }
};

// @desc    Login user or company
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password, userType } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    let user;
    const emailLower = email.toLowerCase().trim();

    // Find user based on userType or search both collections
    if (userType === 'user') {
      user = await User.findOne({ email: emailLower }).select('+password');
    } else if (userType === 'company') {
      user = await Company.findOne({ email: emailLower }).select('+password');
    } else {
      // Search both collections if userType not specified
      user = await User.findOne({ email: emailLower }).select('+password');
      if (!user) {
        user = await Company.findOne({ email: emailLower }).select('+password');
      }
    }

    // Check if user exists
    if (!user) {
      console.log('❌ User not found:', emailLower);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive || user.isBlocked) {
      console.log('❌ Account deactivated:', emailLower);
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      console.log('❌ Incorrect password:', emailLower);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update login info
    await user.updateLoginInfo();

    console.log(`✅ ${user.userType} logged in successfully:`, user.email);

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

      // Try to find user first, then company
      let currentUser = await User.findById(decoded.id);
      
      if (!currentUser) {
        currentUser = await Company.findById(decoded.id);
      }

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      res.status(200).json({
        success: true,
        user: currentUser.getSafeData()
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};