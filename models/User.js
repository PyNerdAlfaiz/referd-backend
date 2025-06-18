// models/User.js - User model with referral system
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic user information
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
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  
  // User type - always 'user' for this model
  userType: {
    type: String,
    default: 'user',
    enum: ['user'],
    immutable: true
  },
  
  // Unique referral code for each user
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    index: true
  },
  
  // Profile information
  profile: {
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    skills: [{
      type: String,
      trim: true,
      maxlength: [30, 'Skill name cannot exceed 30 characters']
    }],
    experience: {
      type: String,
      enum: ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'],
      default: '0-1 years'
    },
    location: {
      city: String,
      country: String,
      postcode: String
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL']
    },
    linkedin: {
      type: String,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/, 'Please enter a valid LinkedIn URL']
    },
    resume: {
      filename: String,
      originalName: String,
      fileSize: Number,
      uploadDate: Date,
      url: String
    },
    profileImage: {
      filename: String,
      url: String,
      uploadDate: Date
    }
  },
  
  // Referral statistics
  referralStats: {
    totalReferrals: {
      type: Number,
      default: 0,
      min: 0
    },
    successfulReferrals: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    paidEarnings: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Payment details for referral payments
  paymentDetails: {
    bankAccount: {
      type: String,
      select: false // Keep private
    },
    sortCode: {
      type: String,
      select: false
    },
    accountHolderName: String,
    paypalEmail: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    preferredMethod: {
      type: String,
      enum: ['bank_transfer', 'paypal'],
      default: 'bank_transfer'
    }
  },
  
  // Account verification and security
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpire: {
    type: Date,
    select: false
  },
  
  // Password reset
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  
  // Login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    marketingEmails: {
      type: Boolean,
      default: true
    },
    jobAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'profile.location.city': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for success rate
userSchema.virtual('successRate').get(function() {
  if (this.referralStats.totalReferrals === 0) return 0;
  return Math.round((this.referralStats.successfulReferrals / this.referralStats.totalReferrals) * 100);
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate referral code
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referralCode) {
    // Generate unique referral code: REF-FIRSTNAME-6DIGITS
    const firstName = this.firstName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.referralCode = `REF-${firstName}-${randomNum}`;
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return token;
};

// Method to update login info
userSchema.methods.updateLoginInfo = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Static method to find by referral code
userSchema.statics.findByReferralCode = function(referralCode) {
  return this.findOne({ 
    referralCode: referralCode.toUpperCase(),
    isActive: true 
  });
};

// Static method to check if email exists
userSchema.statics.emailExists = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Method to get safe user data (without sensitive fields)
userSchema.methods.getSafeData = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpire;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.paymentDetails.bankAccount;
  delete userObject.paymentDetails.sortCode;
  
  return userObject;
};

// Method to update referral stats
userSchema.methods.updateReferralStats = function(type, amount = 0) {
  switch (type) {
    case 'add_referral':
      this.referralStats.totalReferrals += 1;
      break;
    case 'successful_referral':
      this.referralStats.successfulReferrals += 1;
      this.referralStats.pendingEarnings += amount;
      this.referralStats.totalEarnings += amount;
      break;
    case 'payment_processed':
      this.referralStats.pendingEarnings -= amount;
      this.referralStats.paidEarnings += amount;
      break;
  }
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);