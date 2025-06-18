// setup-phase1.js - Setup script for Phase 1 (Models & Authentication)
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Phase 1: Core Models & Authentication...\n');

// Create directories
const directories = [
  'models',
  'controllers',
  'middleware'
];

console.log('📁 Creating directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   ✅ Created: ${dir}/`);
  } else {
    console.log(`   ✅ Exists: ${dir}/`);
  }
});

// Create the controller files content
const authControllerContent = `// controllers/authController.js - Authentication logic
const User = require('../models/User');
const Company = require('../models/Company');
const { sendTokenResponse } = require('../middleware/auth');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await User.emailExists(email);
    const existingCompany = await Company.emailExists(email);
    
    if (existingUser || existingCompany) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        message: 'An account with this email already exists. Please login or use a different email.'
      });
    }
    
    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone
    });
    
    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    
    // TODO: Send verification email
    console.log(\`Verification token for \${email}: \${verificationToken}\`);
    
    // Send response with token
    sendTokenResponse(user, 201, res, 'User registered successfully. Please check your email for verification.');
    
    console.log(\`✅ New user registered: \${user.email} - \${user.referralCode}\`);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: 'Duplicate value',
        message: \`\${field} already exists\`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: messages[0],
        details: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Something went wrong during registration. Please try again.'
    });
  }
};

// @desc    Login user/company
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user or company
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      user = await Company.findOne({ email: email.toLowerCase() }).select('+password');
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }
    
    // Update login info
    await user.updateLoginInfo();
    
    // Send response with token
    const welcomeMessage = user.userType === 'company' 
      ? \`Welcome back, \${user.companyName}!\`
      : \`Welcome back, \${user.firstName}!\`;
    
    sendTokenResponse(user, 200, res, welcomeMessage);
    
    console.log(\`✅ User logged in: \${user.email} (\${user.userType})\`);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Something went wrong during login. Please try again.'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
      userType: req.userType
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve user information'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  registerUser,
  login,
  getMe,
  logout
};`;

// File creation mappings
const filesToCreate = [
  {
    path: 'controllers/authController.js',
    content: authControllerContent
  }
];

// Create files
console.log('\n📄 Creating files...');
filesToCreate.forEach(({ path: filePath, content }) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(`   ✅ Created: ${filePath}`);
  } else {
    console.log(`   ✅ Exists: ${filePath}`);
  }
});

// Update package.json to include bcryptjs if not already there
console.log('\n📦 Checking dependencies...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = {
    'bcryptjs': '^2.4.3',
    'jsonwebtoken': '^9.0.2'
  };
  
  let needsUpdate = false;
  Object.entries(requiredDeps).forEach(([dep, version]) => {
    if (!packageJson.dependencies[dep]) {
      packageJson.dependencies[dep] = version;
      needsUpdate = true;
      console.log(`   ✅ Added dependency: ${dep}`);
    } else {
      console.log(`   ✅ Dependency exists: ${dep}`);
    }
  });
  
  if (needsUpdate) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('   📝 Updated package.json');
  }
} else {
  console.log('   ⚠️ package.json not found');
}

console.log('\n' + '='.repeat(60));
console.log('🎉 PHASE 1 SETUP COMPLETE!');
console.log('='.repeat(60));
console.log('');
console.log('📋 What was created:');
console.log('   ✅ models/User.js - User schema with referral system');
console.log('   ✅ models/Company.js - Company schema');
console.log('   ✅ middleware/auth.js - Authentication middleware');
console.log('   ✅ controllers/authController.js - Auth logic');
console.log('   ✅ routes/auth.js - Updated with real endpoints');
console.log('');
console.log('🚀 Next steps:');
console.log('1. Install new dependencies: npm install');
console.log('2. Restart your server: npm run dev');
console.log('3. Test the authentication endpoints');
console.log('');
console.log('🧪 Test endpoints:');
console.log('   POST /api/auth/register - Register new user');
console.log('   POST /api/auth/login - Login user');
console.log('   GET /api/auth/me - Get current user (requires token)');
console.log('');
console.log('📖 Example API calls:');
console.log('');
console.log('# Register user:');
console.log('curl -X POST http://localhost:5000/api/auth/register \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123"}\'');
console.log('');
console.log('# Login:');
console.log('curl -X POST http://localhost:5000/api/auth/login \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"email":"john@example.com","password":"password123"}\'');
console.log('');
console.log('Happy coding! 🎉');
console.log('');