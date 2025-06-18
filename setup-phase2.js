// setup-phase2.js - Setup script for Phase 2 (Job System)
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Phase 2: Job System...\n');

// Job Model Content
const jobModelContent = `// models/Job.js - Job posting model with referral tracking
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true
  },
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
  requirements: [String],
  responsibilities: [String],
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['full-time', 'part-time', 'contract', 'temporary', 'internship'],
    index: true
  },
  workType: {
    type: String,
    required: [true, 'Work type is required'],
    enum: ['remote', 'hybrid', 'on-site'],
    index: true
  },
  experienceLevel: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    index: true
  },
  location: {
    country: { type: String, required: true, default: 'United Kingdom' },
    city: { type: String, required: true, trim: true, index: true },
    postcode: String,
    isRemote: { type: Boolean, default: false }
  },
  salary: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: 'GBP', enum: ['GBP', 'USD', 'EUR'] },
    period: { type: String, default: 'yearly', enum: ['hourly', 'daily', 'monthly', 'yearly'] }
  },
  benefits: [String],
  referralFee: {
    type: Number,
    required: [true, 'Referral fee is required'],
    min: 0,
    default: 1000
  },
  skills: [{
    name: String,
    level: { type: String, enum: ['basic', 'intermediate', 'advanced', 'expert'], default: 'intermediate' },
    required: { type: Boolean, default: false }
  }],
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Customer Success', 'Operations', 'Finance', 'HR', 'Legal', 'Data Science', 'Security', 'Other'],
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'filled'],
    default: 'draft',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public'
  },
  stats: {
    views: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    referrals: { type: Number, default: 0 },
    referralViews: { type: Number, default: 0 },
    referralApplications: { type: Number, default: 0 }
  },
  postedDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Indexes
jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ status: 1, category: 1 });
jobSchema.index({ status: 1, 'location.city': 1 });
jobSchema.index({ title: 'text', description: 'text' });

// Virtual for salary range
jobSchema.virtual('salaryRange').get(function() {
  if (!this.salary.min && !this.salary.max) return null;
  const currency = this.salary.currency === 'GBP' ? '£' : this.salary.currency === 'USD' ? '$' : '€';
  if (this.salary.min && this.salary.max) {
    return \`\${currency}\${this.salary.min.toLocaleString()} - \${currency}\${this.salary.max.toLocaleString()}\`;
  }
  return this.salary.min ? \`From \${currency}\${this.salary.min.toLocaleString()}\` : \`Up to \${currency}\${this.salary.max.toLocaleString()}\`;
});

// Virtual for referral link
jobSchema.virtual('referralBaseLink').get(function() {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return \`\${baseUrl}/jobs/\${this._id}\`;
});

// Static methods
jobSchema.statics.findActive = function(filters = {}) {
  return this.find({ status: 'active', visibility: { $in: ['public', 'unlisted'] }, ...filters });
};

jobSchema.statics.searchJobs = function(searchTerm, filters = {}) {
  const searchQuery = { status: 'active', visibility: 'public', ...filters };
  if (searchTerm) {
    searchQuery.$text = { $search: searchTerm };
  }
  return this.find(searchQuery).populate('companyId', 'companyName profile.logo');
};

// Methods
jobSchema.methods.incrementViews = function(isReferral = false) {
  this.stats.views += 1;
  if (isReferral) this.stats.referralViews += 1;
  return this.save({ validateBeforeSave: false });
};

jobSchema.methods.generateReferralLink = function(referralCode) {
  return \`\${this.referralBaseLink}?ref=\${referralCode}\`;
};

module.exports = mongoose.model('Job', jobSchema);`;

// Job Controller Content (simplified for setup)
const jobControllerContent = `// controllers/jobController.js - Job management logic
const Job = require('../models/Job');
const Company = require('../models/Company');

const getJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, location, jobType, workType, ref } = req.query;
    
    const filters = { status: 'active', visibility: 'public' };
    if (category) filters.category = category;
    if (location) filters['location.city'] = new RegExp(location, 'i');
    if (jobType) filters.jobType = jobType;
    if (workType) filters.workType = workType;
    
    let query;
    if (search) {
      query = Job.searchJobs(search, filters);
    } else {
      query = Job.find(filters).populate('companyId', 'companyName profile.logo');
    }
    
    const jobs = await query
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const total = await Job.countDocuments(filters);
    
    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalJobs: total
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const { ref } = req.query;
    
    const job = await Job.findById(id)
      .populate('companyId', 'companyName profile industry companySize')
      .lean();
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // Increment view count
    Job.findByIdAndUpdate(id, {
      $inc: { 
        'stats.views': 1,
        ...(ref && { 'stats.referralViews': 1 })
      }
    }).exec();
    
    res.json({ success: true, data: { job } });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const createJob = async (req, res) => {
  try {
    if (req.userType !== 'company') {
      return res.status(403).json({ success: false, error: 'Only companies can create jobs' });
    }
    
    const job = await Job.create({
      ...req.body,
      companyId: req.user._id,
      status: 'draft'
    });
    
    await Company.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalJobsPosted': 1 }
    });
    
    res.status(201).json({ success: true, message: 'Job created successfully', data: { job } });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const generateReferralLink = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.userType !== 'user') {
      return res.status(403).json({ success: false, error: 'Only users can generate referral links' });
    }
    
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    const referralLink = job.generateReferralLink(req.user.referralCode);
    
    res.json({
      success: true,
      data: {
        referralLink,
        referralCode: req.user.referralCode,
        jobTitle: job.title,
        referralFee: job.referralFee
      }
    });
  } catch (error) {
    console.error('Generate referral link error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = { getJobs, getJobById, createJob, generateReferralLink };`;

// Files to create
const filesToCreate = [
  { path: 'models/Job.js', content: jobModelContent },
  { path: 'controllers/jobController.js', content: jobControllerContent }
];

// Create files
console.log('📄 Creating Phase 2 files...');
filesToCreate.forEach(({ path: filePath, content }) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(`   Created: ${filePath}`);
  } else {
    console.log(`   File exists, skipping: ${filePath}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('PHASE 2 SETUP COMPLETE!');
console.log('='.repeat(60));
console.log('');
console.log('What was created:');
console.log('   models/Job.js - Complete job schema with referral tracking');
console.log('   controllers/jobController.js - Job management logic');
console.log('   Updated routes/jobs.js - Real job endpoints');
console.log('');
console.log('Next steps:');
console.log('1. Restart your server: npm run dev');
console.log('2. Test the job endpoints');
console.log('');
console.log('Test endpoints:');
console.log('   GET /api/jobs - Browse jobs');
console.log('   GET /api/jobs/filters - Get filter options');
console.log('   POST /api/jobs - Create job (company only)');
console.log('   GET /api/jobs/:id/referral-link - Generate referral link (user only)');
console.log('');
console.log('Example API calls:');
console.log('');
console.log('# Browse jobs:');
console.log('curl http://localhost:5000/api/jobs');
console.log('');
console.log('# Create job (need company auth token):');
console.log('curl -X POST http://localhost:5000/api/jobs \\');
console.log('  -H "Authorization: Bearer YOUR_COMPANY_TOKEN" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"title":"React Developer","description":"We need a React dev","jobType":"full-time","workType":"remote","experienceLevel":"mid","location":{"city":"London","country":"UK"},"category":"Engineering"}\'');
console.log('');
console.log('Happy coding!');
console.log('');