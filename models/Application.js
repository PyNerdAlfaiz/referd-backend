// models/Application.js - Job application model with referral tracking
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Core relationships
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
    index: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant ID is required'],
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true
  },
  
  // Referral tracking
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  referralCode: {
    type: String,
    default: null,
    index: true
  },
  isReferral: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Application content
  coverLetter: {
    type: String,
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  resume: {
    filename: String,
    originalName: String,
    fileSize: Number,
    uploadDate: Date,
    url: String
  },
  
  // Custom question responses
  customResponses: [{
    questionId: String,
    question: String,
    answer: String,
    type: {
      type: String,
      enum: ['text', 'textarea', 'select', 'multiselect']
    }
  }],
  
  // Application status tracking
  status: {
    type: String,
    enum: {
      values: [
        'pending',      // Just submitted
        'reviewing',    // Company is reviewing
        'shortlisted',  // Moved to next stage
        'interviewing', // In interview process
        'offered',      // Job offer made
        'hired',        // Successfully hired
        'rejected',     // Application rejected
        'withdrawn'     // Applicant withdrew
      ],
      message: 'Invalid application status'
    },
    default: 'pending',
    index: true
  },
  
  // Detailed status history
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['User', 'Company']
    }
  }],
  
  // Interview scheduling
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'in-person', 'technical', 'final'],
      required: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // in minutes
      default: 60
    },
    location: {
      address: String,
      meetingLink: String,
      phone: String,
      instructions: String
    },
    interviewer: {
      name: String,
      position: String,
      email: String
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      notes: String,
      recommendation: {
        type: String,
        enum: ['hire', 'no-hire', 'maybe', 'next-round']
      },
      strengths: [String],
      concerns: [String]
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Company assessment
  companyFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    strengths: [String],
    concerns: [String],
    recommendation: {
      type: String,
      enum: ['hire', 'no-hire', 'maybe', 'interview']
    },
    reviewedBy: {
      name: String,
      position: String
    },
    reviewedAt: Date
  },
  
  // Salary and offer details
  offer: {
    salary: {
      amount: Number,
      currency: {
        type: String,
        default: 'GBP',
        enum: ['GBP', 'USD', 'EUR']
      },
      period: {
        type: String,
        default: 'yearly',
        enum: ['hourly', 'daily', 'monthly', 'yearly']
      }
    },
    benefits: [String],
    startDate: Date,
    offerDate: Date,
    expiryDate: Date,
    isAccepted: {
      type: Boolean,
      default: null
    },
    acceptedAt: Date,
    declinedAt: Date,
    declineReason: String
  },
  
  // Referral payment tracking
  referralPayment: {
    isEligible: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'GBP'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    paymentReference: String,
    notes: String
  },
  
  // Application metadata
  applicationSource: {
    type: String,
    enum: ['direct', 'referral', 'job-board', 'social-media', 'company-website'],
    default: 'direct'
  },
  
  // Tracking and analytics
  tracking: {
    viewedAt: Date,
    appliedAt: {
      type: Date,
      default: Date.now
    },
    firstViewedAt: Date,
    timeToApply: Number, // minutes from first view to application
    deviceType: String,
    browserInfo: String,
    ipAddress: String
  },
  
  // Communication log
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'message', 'interview-scheduled', 'offer-sent'],
      required: true
    },
    subject: String,
    content: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'communications.sentByModel'
    },
    sentByModel: {
      type: String,
      enum: ['User', 'Company']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date
  }],
  
  // Privacy and consent
  consent: {
    dataProcessing: {
      type: Boolean,
      required: true,
      default: true
    },
    marketing: {
      type: Boolean,
      default: false
    },
    backgroundCheck: {
      type: Boolean,
      default: false
    },
    consentDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Internal notes (not visible to applicant)
  internalNotes: {
    type: String,
    maxlength: [2000, 'Internal notes cannot exceed 2000 characters'],
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true }); // Prevent duplicate applications
applicationSchema.index({ companyId: 1, status: 1 });
applicationSchema.index({ referredBy: 1, status: 1 });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ 'tracking.appliedAt': -1 });
applicationSchema.index({ referralCode: 1, status: 1 });

// Virtual for days since application
applicationSchema.virtual('daysSinceApplied').get(function() {
  const diffTime = Math.abs(new Date() - this.tracking.appliedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for current interview
applicationSchema.virtual('currentInterview').get(function() {
  if (!this.interviews || this.interviews.length === 0) return null;
  
  return this.interviews
    .filter(interview => interview.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0] || null;
});

// Virtual for latest status update
applicationSchema.virtual('latestStatusUpdate').get(function() {
  if (!this.statusHistory || this.statusHistory.length === 0) return null;
  
  return this.statusHistory
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
});

// Pre-save middleware to update status history
applicationSchema.pre('save', function(next) {
  // If status is modified, add to status history
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`
    });
  }
  
  // Set referral payment eligibility when hired
  if (this.isModified('status') && this.status === 'hired' && this.isReferral) {
    this.referralPayment.isEligible = true;
    this.referralPayment.status = 'pending';
    
    // Set amount from job (we'll populate this from job data)
    if (this.populated('jobId') && this.jobId.referralFee) {
      this.referralPayment.amount = this.jobId.referralFee;
      this.referralPayment.currency = this.jobId.referralFeeCurrency || 'GBP';
    }
  }
  
  next();
});

// Pre-save middleware to set application source
applicationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.applicationSource = this.isReferral ? 'referral' : 'direct';
  }
  next();
});

// Static method to find applications by company
applicationSchema.statics.findByCompany = function(companyId, filters = {}) {
  return this.find({ companyId, ...filters })
    .populate('applicantId', 'firstName lastName email profile')
    .populate('jobId', 'title')
    .populate('referredBy', 'firstName lastName referralCode')
    .sort({ createdAt: -1 });
};

// Static method to find applications by user
applicationSchema.statics.findByUser = function(userId, filters = {}) {
  return this.find({ applicantId: userId, ...filters })
    .populate('jobId', 'title companyId')
    .populate('companyId', 'companyName profile.logo')
    .sort({ createdAt: -1 });
};

// Static method to find referrals by user
applicationSchema.statics.findReferralsByUser = function(userId, filters = {}) {
  return this.find({ referredBy: userId, ...filters })
    .populate('applicantId', 'firstName lastName')
    .populate('jobId', 'title')
    .populate('companyId', 'companyName')
    .sort({ createdAt: -1 });
};

// Method to check if application can be withdrawn
applicationSchema.methods.canBeWithdrawn = function() {
  return ['pending', 'reviewing', 'shortlisted'].includes(this.status);
};

// Method to check if application can be updated by company
applicationSchema.methods.canBeUpdatedByCompany = function() {
  return !['hired', 'rejected', 'withdrawn'].includes(this.status);
};

// Method to calculate time to hire
applicationSchema.methods.getTimeToHire = function() {
  if (this.status !== 'hired') return null;
  
  const hiredStatus = this.statusHistory.find(h => h.status === 'hired');
  if (!hiredStatus) return null;
  
  const diffTime = Math.abs(new Date(hiredStatus.timestamp) - this.tracking.appliedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
};

// Method to get application summary for listings
applicationSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    jobId: this.jobId,
    applicantId: this.applicantId,
    status: this.status,
    isReferral: this.isReferral,
    referredBy: this.referredBy,
    appliedAt: this.tracking.appliedAt,
    daysSinceApplied: this.daysSinceApplied,
    latestStatusUpdate: this.latestStatusUpdate,
    currentInterview: this.currentInterview
  };
};

// Method to update status with history
applicationSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null, updatedByModel = 'Company') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy,
    updatedByModel
  });
  
  return this.save();
};

// Method to schedule interview
applicationSchema.methods.scheduleInterview = function(interviewData) {
  this.interviews.push({
    ...interviewData,
    status: 'scheduled',
    createdAt: new Date()
  });
  
  // Update application status if not already interviewing
  if (!['interviewing', 'offered', 'hired'].includes(this.status)) {
    this.status = 'interviewing';
  }
  
  return this.save();
};

module.exports = mongoose.model('Application', applicationSchema);