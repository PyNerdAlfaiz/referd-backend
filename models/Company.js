// models/Company.js - Improved Company model with better error handling
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const companySchema = new mongoose.Schema({
  // Company authentication
  email: {
    type: String,
    required: [true, 'Company email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function(password) {
        // Password must contain at least one uppercase, one lowercase, one number
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    },
    select: false
  },
  
  // User type - always 'company' for this model
  userType: {
    type: String,
    default: 'company',
    enum: ['company'],
    immutable: true
  },
  
  // Basic company information
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters'],
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    index: true
  },
  registrationNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^[A-Z0-9]+$/, 'Registration number must contain only letters and numbers']
  },
  vatNumber: {
    type: String,
    trim: true,
    match: [/^[A-Z0-9]+$/, 'VAT number must contain only letters and numbers']
  },
  
  // Company details
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    enum: [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Retail',
      'Manufacturing',
      'Construction',
      'Marketing',
      'Legal',
      'Consulting',
      'Real Estate',
      'Transportation',
      'Energy',
      'Entertainment',
      'Non-profit',
      'Government',
      'Other'
    ]
  },
  companySize: {
    type: String,
    required: [true, 'Company size is required'],
    enum: [
      '1-10 employees',
      '11-50 employees',
      '51-200 employees',
      '201-500 employees',
      '501-1000 employees',
      '1000+ employees'
    ]
  },
  foundedYear: {
    type: Number,
    min: [1800, 'Founded year cannot be before 1800'],
    max: [new Date().getFullYear(), 'Founded year cannot be in the future'],
    validate: {
      validator: function(year) {
        return !year || (year >= 1800 && year <= new Date().getFullYear());
      },
      message: 'Please enter a valid founded year'
    }
  },
  
  // Company profile
  profile: {
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL starting with http:// or https://']
    },
    linkedin: {
      type: String,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/company\/.+/, 'Please enter a valid LinkedIn company URL']
    },
    twitter: {
      type: String,
      match: [/^https?:\/\/(www\.)?twitter\.com\/.+/, 'Please enter a valid Twitter URL']
    },
    logo: {
      filename: String,
      url: String,
      uploadDate: Date
    },
    coverImage: {
      filename: String,
      url: String,
      uploadDate: Date
    },
    
    // Company address
    address: {
      street: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        minlength: [2, 'City must be at least 2 characters']
      },
      county: {
        type: String,
        trim: true
      },
      postcode: {
        type: String,
        required: [true, 'Postcode is required'],
        trim: true,
        match: [/^[A-Z0-9\s]+$/i, 'Please enter a valid postcode']
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        default: 'United Kingdom',
        trim: true
      }
    },
    
    // Contact person details
    contactPerson: {
      firstName: {
        type: String,
        required: [true, 'Contact person first name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters'],
        match: [/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces']
      },
      lastName: {
        type: String,
        required: [true, 'Contact person last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters'],
        match: [/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces']
      },
      position: {
        type: String,
        required: [true, 'Contact person position is required'],
        trim: true,
        minlength: [2, 'Position must be at least 2 characters']
      },
      phone: {
        type: String,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
      },
      email: {
        type: String,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
      }
    },
    
    // Company culture and values
    culture: {
      values: [{
        type: String,
        trim: true,
        maxlength: [100, 'Each value cannot exceed 100 characters']
      }],
      benefits: [{
        type: String,
        trim: true,
        maxlength: [100, 'Each benefit cannot exceed 100 characters']
      }],
      workEnvironment: {
        type: String,
        enum: ['Remote', 'On-site', 'Hybrid', 'Flexible']
      }
    }
  },
  
  // Billing and subscription information
  billing: {
    stripeCustomerId: String,
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'trial', 'cancelled'],
      default: 'trial'
    },
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      default: 'basic'
    },
    trialEnds: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    billingAddress: {
      street: String,
      city: String,
      postcode: String,
      country: String
    },
    paymentMethods: [{
      id: String,
      type: String,
      last4: String,
      brand: String,
      expMonth: Number,
      expYear: Number,
      isDefault: Boolean
    }]
  },
  
  // Company statistics
  stats: {
    totalJobsPosted: {
      type: Number,
      default: 0,
      min: 0
    },
    activeJobs: {
      type: Number,
      default: 0,
      min: 0
    },
    totalApplications: {
      type: Number,
      default: 0,
      min: 0
    },
    totalHires: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReferralsPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    averageTimeToHire: Number, // in days
    successfulReferralRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
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
  isVerified: {
    type: Boolean,
    default: false
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
  
  // Company preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    applicationNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: true
    },
    weeklyReports: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
companySchema.index({ email: 1 });
companySchema.index({ companyName: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ 'profile.address.city': 1 });
companySchema.index({ createdAt: -1 });

// Virtual for company display name
companySchema.virtual('displayName').get(function() {
  return this.companyName;
});

// Virtual for contact person full name
companySchema.virtual('contactPersonName').get(function() {
  if (this.profile && this.profile.contactPerson) {
    return `${this.profile.contactPerson.firstName} ${this.profile.contactPerson.lastName}`;
  }
  return '';
});

// Virtual for subscription status
companySchema.virtual('isSubscriptionActive').get(function() {
  return this.billing.subscriptionStatus === 'active' || 
         (this.billing.subscriptionStatus === 'trial' && this.billing.trialEnds > new Date());
});

// Pre-save middleware to hash password
companySchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
companySchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Method to generate email verification token
companySchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

// Method to generate password reset token
companySchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return token;
};

// Method to update login info
companySchema.methods.updateLoginInfo = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Static method to check if email exists (check both User and Company)
companySchema.statics.emailExists = async function(email) {
  const companyExists = await this.findOne({ email: email.toLowerCase() });
  if (companyExists) return { exists: true, type: 'company', user: companyExists };
  
  // Check if email exists in User model
  const User = mongoose.model('User');
  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) return { exists: true, type: 'user', user: userExists };
  
  return { exists: false };
};

// Method to get safe company data
companySchema.methods.getSafeData = function() {
  const companyObject = this.toObject();
  
  // Remove sensitive fields
  delete companyObject.password;
  delete companyObject.emailVerificationToken;
  delete companyObject.emailVerificationExpire;
  delete companyObject.resetPasswordToken;
  delete companyObject.resetPasswordExpire;
  if (companyObject.billing) {
    delete companyObject.billing.stripeCustomerId;
    delete companyObject.billing.paymentMethods;
  }
  
  return companyObject;
};

// Method to update company stats
companySchema.methods.updateStats = function(type, value = 1) {
  switch (type) {
    case 'job_posted':
      this.stats.totalJobsPosted += value;
      this.stats.activeJobs += value;
      break;
    case 'job_closed':
      this.stats.activeJobs -= value;
      break;
    case 'application_received':
      this.stats.totalApplications += value;
      break;
    case 'hire_made':
      this.stats.totalHires += value;
      break;
    case 'referral_paid':
      this.stats.totalReferralsPaid += value;
      break;
  }
  return this.save({ validateBeforeSave: false });
};

// Method to check if company can post jobs
companySchema.methods.canPostJobs = function() {
  return this.isActive && 
         this.emailVerified && 
         this.isSubscriptionActive && 
         !this.isBlocked;
};

// Method to validate company registration data
companySchema.statics.validateRegistrationData = function(data) {
  const errors = [];
  
  // Check required fields
  if (!data.email) errors.push('Email is required');
  if (!data.password) errors.push('Password is required');
  if (!data.companyName) errors.push('Company name is required');
  if (!data.industry) errors.push('Industry is required');
  if (!data.companySize) errors.push('Company size is required');
  
  // Check contact person details
  if (!data.contactPerson) {
    errors.push('Contact person details are required');
  } else {
    if (!data.contactPerson.firstName) errors.push('Contact person first name is required');
    if (!data.contactPerson.lastName) errors.push('Contact person last name is required');
    if (!data.contactPerson.position) errors.push('Contact person position is required');
  }
  
  // Check address details
  if (!data.address) {
    errors.push('Company address is required');
  } else {
    if (!data.address.city) errors.push('City is required');
    if (!data.address.postcode) errors.push('Postcode is required');
    if (!data.address.country) errors.push('Country is required');
  }
  
  // Validate email format
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (data.password && !passwordRegex.test(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = mongoose.model('Company', companySchema);