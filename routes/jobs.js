// routes/jobs.js - Complete job routes with debug logging and country filtering
const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  getCompanyJobs,
  deleteJob,
  getJobFilters,
  generateReferralLink,
  getJobStats
} = require('../controllers/jobController');

const { auth, requireUser, requireCompany } = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Job routes are working!',
    endpoints: {
      'GET /': 'Get all jobs (with filters)',
      'GET /filters': 'Get available filters',
      'GET /:id': 'Get job by ID',
      'POST /': 'Create new job (companies only)',
      'PUT /:id': 'Update job (companies only)',
      'PUT /:id/status': 'Update job status (companies only)',
      'DELETE /:id': 'Delete job (companies only)',
      'GET /company/mine': 'Get company jobs (companies only)',
      'GET /:id/referral-link': 'Generate referral link (users only)',
      'GET /:id/stats': 'Get job statistics (companies only)'
    }
  });
});

// Public routes (no authentication required)

// @desc    Get all jobs with filtering and search
// @route   GET /api/jobs
// @access  Public
router.get('/', getJobs);

// @desc    Get job filters (categories, locations, etc.)
// @route   GET /api/jobs/filters
// @access  Public
router.get('/filters', getJobFilters);

// Company-only routes (must come before /:id to avoid conflicts)

// @desc    Get company's jobs
// @route   GET /api/jobs/company/mine
// @access  Private (Company)
router.get('/company/mine', auth, requireCompany, getCompanyJobs);

// Protected routes with ID parameter

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public
router.get('/:id', getJobById);

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (Company)
router.post('/', 
  // Debug logging middleware
  (req, res, next) => {
    console.log('\n🛣️ POST /api/jobs - Route Hit');
    console.log('   Headers:', {
      authorization: req.headers.authorization ? 'Present (Bearer token)' : 'Missing',
      contentType: req.headers['content-type']
    });
    console.log('   Body preview:', {
      title: req.body.title || 'Missing',
      category: req.body.category || 'Missing',
      jobType: req.body.jobType || 'Missing',
      hasLocation: !!req.body.location,
      locationDetails: req.body.location
    });
    next();
  },
  
  // Authentication middleware
  auth, 
  
  // Debug after auth
  (req, res, next) => {
    console.log('🔐 After AUTH middleware:');
    console.log('   req.user exists:', !!req.user);
    console.log('   req.userType:', req.userType);
    console.log('   User ID:', req.user?._id);
    console.log('   Company Name:', req.user?.companyName || 'N/A');
    next();
  },
  
  // Company authorization middleware
  requireCompany, 
  
  // Debug after requireCompany
  (req, res, next) => {
    console.log('🏢 After REQUIRE_COMPANY middleware:');
    console.log('   Company access granted, proceeding to validation...');
    next();
  },
  
  // Validation middleware for job creation
  (req, res, next) => {
    console.log('📋 Starting validation middleware...');
    
    const {
      title,
      description,
      jobType,
      workType,
      experienceLevel,
      location,
      category
    } = req.body;
    
    // Required fields validation
    const requiredFields = ['title', 'description', 'jobType', 'workType', 'experienceLevel', 'category'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `The following fields are required: ${missingFields.join(', ')}`
      });
    }
    
    // Location validation
    if (!location || !location.city || !location.country) {
      console.log('❌ Invalid location:', location);
      return res.status(400).json({
        success: false,
        error: 'Invalid location',
        message: 'Location must include city and country'
      });
    }
    
    // Salary validation
    if (req.body.salary) {
      const { salary } = req.body;
      if (salary.min && salary.max && salary.min > salary.max) {
        console.log('❌ Invalid salary range');
        return res.status(400).json({
          success: false,
          error: 'Invalid salary range',
          message: 'Minimum salary cannot be greater than maximum salary'
        });
      }
    }
    
    console.log('✅ Validation passed, proceeding to createJob controller...');
    next();
  }, 
  
  createJob
);

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Company)
router.put('/:id', auth, requireCompany, updateJob);

// @desc    Update job status
// @route   PUT /api/jobs/:id/status
// @access  Private (Company)
router.put('/:id/status', auth, requireCompany, (req, res, next) => {
  // Validation middleware for status updates
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Missing status',
      message: 'Status is required'
    });
  }
  
  const validStatuses = ['draft', 'active', 'paused', 'closed', 'filled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
      message: `Status must be one of: ${validStatuses.join(', ')}`
    });
  }
  
  next();
}, updateJobStatus);

// @desc    Get job statistics
// @route   GET /api/jobs/:id/stats
// @access  Private (Company)
router.get('/:id/stats', auth, requireCompany, getJobStats);

// @desc    Generate referral link for job
// @route   GET /api/jobs/:id/referral-link
// @access  Private (User)
router.get('/:id/referral-link', auth, requireUser, generateReferralLink);

router.get('/:id/referral-link', auth, requireUser, async (req, res) => {
  try {
      const { id: jobId } = req.params;
      const user = req.user;
      
      // Generate referral link
      const baseUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5500';
      const referralLink = `${baseUrl}/job-details.html?id=${jobId}&ref=${user.referralCode}`;
      
      res.json({
          success: true,
          data: {
              referralLink,
              referralCode: user.referralCode,
              jobId
          }
      });
  } catch (error) {
      console.error('Generate referral link error:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to generate referral link'
      });
  }
});

// Add route for tracking job views
router.post('/:id/view', async (req, res) => {
  try {
      const { id: jobId } = req.params;
      const { referralCode } = req.body;
      
      const Job = require('../models/Job');
      const job = await Job.findById(jobId);
      
      if (job) {
          await job.incrementViews(!!referralCode);
      }
      
      res.json({ success: true });
  } catch (error) {
      console.error('Track view error:', error);
      res.status(200).json({ success: false }); // Silent fail
  }
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Company)
router.delete('/:id', auth, requireCompany, deleteJob);

module.exports = router;