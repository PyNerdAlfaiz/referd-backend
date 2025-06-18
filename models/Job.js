// models/Job.js - Job posting model with referral tracking
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Company that posted the job
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true
  },
  
  // Basic job information
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  requirements: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each requirement cannot exceed 200 characters']
  }],
  responsibilities: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each responsibility cannot exceed 200 characters']
  }],
  
  // Job classification
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: {
      values: ['full-time', 'part-time', 'contract', 'temporary', 'internship'],
      message: 'Job type must be full-time, part-time, contract, temporary, or internship'
    },
    index: true
  },
  workType: {
    type: String,
    required: [true, 'Work type is required'],
    enum: {
      values: ['remote', 'hybrid', 'on-site'],
      message: 'Work type must be remote, hybrid, or on-site'
    },
    index: true
  },
  experienceLevel: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: {
      values: ['entry', 'mid', 'senior', 'lead', 'executive'],
      message: 'Experience level must be entry, mid, senior, lead, or executive'
    },
    index: true
  },
  
  // Location details
  location: {
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'United Kingdom'
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    postcode: {
      type: String,
      trim: true
    },
    isRemote: {
      type: Boolean,
      default: false
    },
    remotePolicy: {
      type: String,
      enum: ['fully-remote', 'hybrid', 'occasional-remote', 'no-remote'],
      default: 'no-remote'
    }
  },
  
  // Salary and compensation
  salary: {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative'],
      validate: {
        validator: function(value) {
          return !this.salary.min || value >= this.salary.min;
        },
        message: 'Maximum salary must be greater than or equal to minimum salary'
      }
    },
    currency: {
      type: String,
      default: 'GBP',
      enum: ['GBP', 'USD', 'EUR']
    },
    period: {
      type: String,
      default: 'yearly',
      enum: ['hourly', 'daily', 'monthly', 'yearly']
    },
    isNegotiable: {
      type: Boolean,
      default: false
    }
  },
  
  // Benefits and perks
  benefits: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each benefit cannot exceed 100 characters']
  }],
  
  // Referral system
  referralFee: {
    type: Number,
    required: [true, 'Referral fee is required'],
    min: [0, 'Referral fee cannot be negative'],
    default: 1000 // £1000 default referral fee
  },
  referralFeeCurrency: {
    type: String,
    default: 'GBP',
    enum: ['GBP', 'USD', 'EUR']
  },
  
  // Skills and tags
  skills: [{
    name: {
      type: String,
      trim: true,
      maxlength: [30, 'Skill name cannot exceed 30 characters']
    },
    level: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [20, 'Each tag cannot exceed 20 characters']
  }],
  
  // Job category and department
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: {
      values: [
        'Engineering',
        'Design',
        'Product',
        'Marketing',
        'Sales',
        'Customer Success',
        'Operations',
        'Finance',
        'HR',
        'Legal',
        'Data Science',
        'Security',
        'Other'
      ],
      message: 'Invalid job category'
    },
    index: true
  },
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Department name cannot exceed 50 characters']
  },
  
  // Application settings
  applicationSettings: {
    applicationDeadline: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > new Date();
        },
        message: 'Application deadline must be in the future'
      }
    },
    maxApplications: {
      type: Number,
      min: [1, 'Maximum applications must be at least 1'],
      default: 100
    },
    requireResume: {
      type: Boolean,
      default: true
    },
    requireCoverLetter: {
      type: Boolean,
      default: false
    },
    customQuestions: [{
      question: {
        type: String,
        trim: true,
        maxlength: [200, 'Question cannot exceed 200 characters']
      },
      type: {
        type: String,
        enum: ['text', 'textarea', 'select', 'multiselect'],
        default: 'text'
      },
      options: [String], // For select/multiselect questions
      required: {
        type: Boolean,
        default: false
      }
    }]
  },
  
  // Job status and tracking
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'paused', 'closed', 'filled'],
      message: 'Invalid job status'
    },
    default: 'draft',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public'
  },
  
  // Application and referral statistics
  stats: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    applications: {
      type: Number,
      default: 0,
      min: 0
    },
    referrals: {
      type: Number,
      default: 0,
      min: 0
    },
    referralViews: {
      type: Number,
      default: 0,
      min: 0
    },
    referralApplications: {
      type: Number,
      default: 0,
      min: 0
    },
    successfulReferrals: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // SEO and search optimization
  seo: {
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    searchKeywords: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  },
  
  // Important dates
  postedDate: {
    type: Date,
    default: Date.now
  },
  updatedDate: {
    type: Date,
    default: Date.now
  },
  closedDate: {
    type: Date
  },
  
  // Internal notes (not visible to applicants)
  internalNotes: {
    type: String,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters'],
    select: false // Don't include in normal queries
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ status: 1, category: 1 });
jobSchema.index({ status: 1, 'location.city': 1 });
jobSchema.index({ status: 1, jobType: 1, workType: 1 });
jobSchema.index({ createdAt: -1, status: 1 });
jobSchema.index({ 'salary.min': 1, 'salary.max': 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ 'skills.name': 1 });

// Text search index for title and description
jobSchema.index({ 
  title: 'text', 
  description: 'text', 
  'skills.name': 'text',
  tags: 'text'
});

// Virtual for formatted salary range
jobSchema.virtual('salaryRange').get(function() {
  if (!this.salary.min && !this.salary.max) return null;
  
  const formatMoney = (amount) => {
    if (this.salary.currency === 'GBP') return `£${amount.toLocaleString()}`;
    if (this.salary.currency === 'USD') return `$${amount.toLocaleString()}`;
    if (this.salary.currency === 'EUR') return `€${amount.toLocaleString()}`;
    return `${amount.toLocaleString()} ${this.salary.currency}`;
  };
  
  if (this.salary.min && this.salary.max) {
    return `${formatMoney(this.salary.min)} - ${formatMoney(this.salary.max)}`;
  } else if (this.salary.min) {
    return `From ${formatMoney(this.salary.min)}`;
  } else {
    return `Up to ${formatMoney(this.salary.max)}`;
  }
});

// Virtual for days since posted
jobSchema.virtual('daysPosted').get(function() {
  const diffTime = Math.abs(new Date() - this.postedDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for referral link
jobSchema.virtual('referralBaseLink').get(function() {
  const baseUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5500';
  return `${baseUrl}/job-details.html?id=${this._id}`;
});

// Pre-save middleware to generate slug
jobSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isNew) {
    const slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    this.seo.slug = `${slug}-${this._id.toString().slice(-6)}`;
  }
  
  // Update the updatedDate
  if (this.isModified() && !this.isNew) {
    this.updatedDate = new Date();
  }
  
  next();
});

// Pre-save middleware to update search keywords
jobSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isModified('description') || this.isModified('skills')) {
    const keywords = [];
    
    // Add title words
    keywords.push(...this.title.toLowerCase().split(/\s+/));
    
    // Add skills
    if (this.skills && this.skills.length > 0) {
      keywords.push(...this.skills.map(skill => skill.name.toLowerCase()));
    }
    
    // Add category and job type
    keywords.push(this.category.toLowerCase());
    keywords.push(this.jobType.toLowerCase());
    keywords.push(this.workType.toLowerCase());
    
    // Remove duplicates and empty strings
    this.seo.searchKeywords = [...new Set(keywords.filter(k => k && k.length > 2))];
  }
  
  next();
});

// Static method to find active jobs
jobSchema.statics.findActive = function(filters = {}) {
  return this.find({ 
    status: 'active', 
    visibility: { $in: ['public', 'unlisted'] },
    ...filters 
  });
};

// Static method to search jobs
jobSchema.statics.searchJobs = function(searchTerm, filters = {}) {
  const searchQuery = {
    status: 'active',
    visibility: 'public',
    ...filters
  };
  
  if (searchTerm) {
    searchQuery.$text = { $search: searchTerm };
  }
  
  return this.find(searchQuery)
    .populate('companyId', 'companyName profile.logo')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

// Method to increment view count
jobSchema.methods.incrementViews = function(isReferral = false) {
  this.stats.views += 1;
  if (isReferral) {
    this.stats.referralViews += 1;
  }
  return this.save({ validateBeforeSave: false });
};

// Method to increment application count
jobSchema.methods.incrementApplications = function(isReferral = false) {
  this.stats.applications += 1;
  if (isReferral) {
    this.stats.referralApplications += 1;
  }
  return this.save({ validateBeforeSave: false });
};

// Method to check if job is still accepting applications
jobSchema.methods.isAcceptingApplications = function() {
  if (this.status !== 'active') return false;
  if (this.applicationSettings.applicationDeadline && this.applicationSettings.applicationDeadline < new Date()) return false;
  if (this.stats.applications >= this.applicationSettings.maxApplications) return false;
  return true;
};

// Method to generate referral link for a specific user
jobSchema.methods.generateReferralLink = function(referralCode) {
  return `${this.referralBaseLink}?ref=${referralCode}`;
};

// Method to get job summary for listings
jobSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    title: this.title,
    companyId: this.companyId,
    location: this.location,
    salary: this.salary,
    salaryRange: this.salaryRange,
    jobType: this.jobType,
    workType: this.workType,
    experienceLevel: this.experienceLevel,
    category: this.category,
    referralFee: this.referralFee,
    daysPosted: this.daysPosted,
    postedDate: this.postedDate,
    slug: this.seo.slug
  };
};

module.exports = mongoose.model('Job', jobSchema);