#!/bin/bash
# create-auth-files.sh - Create all authentication files

echo "🚀 Creating Phase 1 Authentication Files..."

# Create directories
mkdir -p models
mkdir -p controllers  
mkdir -p middleware

echo "📁 Directories created"

# Create User model
cat > models/User.js << 'EOF'
// models/User.js - User model with referral system
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  userType: {
    type: String,
    default: 'user',
    enum: ['user'],
    immutable: true
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    index: true
  },
  profile: {
    bio: String,
    skills: [String],
    experience: String,
    location: {
      city: String,
      country: String,
      postcode: String
    },
    resume: {
      filename: String,
      url: String,
      uploadDate: Date
    }
  },
  referralStats: {
    totalReferrals: { type: Number, default: 0 },
    successfulReferrals: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    paidEarnings: { type: Number, default: 0 }
  },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    const firstName = this.firstName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.referralCode = `REF-${firstName}-${randomNum}`;
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

userSchema.methods.updateLoginInfo = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save({ validateBeforeSave: false });
};

userSchema.statics.emailExists = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.methods.getSafeData = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.resetPasswordToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
EOF

echo "✅ Created models/User.js"

# Create Company model
cat > models/Company.js << 'EOF'
// models/Company.js - Company model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Company email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  userType: {
    type: String,
    default: 'company',
    enum: ['company'],
    immutable: true
  },
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    enum: ['Technology', 'Finance', 'Healthcare', 'Education', 'Other']
  },
  companySize: {
    type: String,
    required: [true, 'Company size is required'],
    enum: ['1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees']
  },
  profile: {
    description: String,
    website: String,
    address: {
      city: { type: String, required: true },
      postcode: { type: String, required: true },
      country: { type: String, required: true, default: 'United Kingdom' }
    },
    contactPerson: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      position: { type: String, required: true }
    }
  },
  stats: {
    totalJobsPosted: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
    totalHires: { type: Number, default: 0 }
  },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

companySchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

companySchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

companySchema.methods.updateLoginInfo = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save({ validateBeforeSave: false });
};

companySchema.statics.emailExists = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

companySchema.methods.getSafeData = function() {
  const companyObject = this.toObject();
  delete companyObject.password;
  delete companyObject.emailVerificationToken;
  return companyObject;
};

module.exports = mongoose.model('Company', companySchema);
EOF

echo "✅ Created models/Company.js"

echo ""
echo "🎉 All authentication files created!"
echo "📋 Created:"
echo "   ✅ models/User.js"
echo "   ✅ models/Company.js"
echo ""
echo "🚀 Next steps:"
echo "1. Install dependencies: npm install bcryptjs jsonwebtoken"
echo "2. Create middleware/auth.js and controllers/authController.js manually"
echo "3. Update routes/auth.js with real endpoints"
echo "4. Restart server: npm run dev"