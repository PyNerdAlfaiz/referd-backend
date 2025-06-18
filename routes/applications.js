// routes/applications.js - Application routes with real functionality
const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
  submitApplication,
  getUserApplications,
  getUserReferrals,
  getCompanyApplications,
  updateApplicationStatus,
  getApplicationById,
  withdrawApplication,
  scheduleInterview
} = require('../controllers/applicationController');

const { auth, requireUser, requireCompany } = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Application routes are working!',
    endpoints: {
      'POST /': 'Submit job application (users only)',
      'GET /my-applications': 'Get user applications (users only)',
      'GET /my-referrals': 'Get user referrals (users only)',
      'GET /company-applications': 'Get company applications (companies only)',
      'GET /:id': 'Get application by ID',
      'PUT /:id/status': 'Update application status (companies only)',
      'PUT /:id/withdraw': 'Withdraw application (users only)',
      'POST /:id/interview': 'Schedule interview (companies only)'
    }
  });
});

// Public/General routes

// @desc    Submit job application
// @route   POST /api/applications
// @access  Private (User)
router.post('/', auth, requireUser, (req, res, next) => {
  // Validation middleware for application submission
  const { jobId, consent } = req.body;
  
  if (!jobId) {
    return res.status(400).json({
      success: false,
      error: 'Missing job ID',
      message: 'Job ID is required to submit an application'
    });
  }
  
  // Check consent requirements
  if (!consent || consent.dataProcessing === false) {
    return res.status(400).json({
      success: false,
      error: 'Consent required',
      message: 'You must consent to data processing to submit an application'
    });
  }
  
  next();
}, submitApplication);

// @desc    Get application by ID
// @route   GET /api/applications/:id
// @access  Private (Applicant, Company, or Referrer)
router.get('/:id', auth, getApplicationById);

// User-specific routes

// @desc    Get user's applications
// @route   GET /api/applications/my-applications
// @access  Private (User)
router.get('/my-applications', auth, requireUser, getUserApplications);

// @desc    Get user's referrals
// @route   GET /api/applications/my-referrals
// @access  Private (User)
router.get('/my-referrals', auth, requireUser, getUserReferrals);

// @desc    Withdraw application
// @route   PUT /api/applications/:id/withdraw
// @access  Private (User - Applicant only)
router.put('/:id/withdraw', auth, requireUser, withdrawApplication);

// Company-specific routes

// @desc    Get company applications
// @route   GET /api/applications/company-applications
// @access  Private (Company)
router.get('/company-applications', auth, requireCompany, getCompanyApplications);

// @desc    Update application status
// @route   PUT /api/applications/:id/status
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
  
  const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
      message: `Status must be one of: ${validStatuses.join(', ')}`
    });
  }
  
  next();
}, updateApplicationStatus);

router.post('/', auth, requireUser, async (req, res) => {
  try {
      const { jobId, referralCode, coverLetter } = req.body;
      const userId = req.user._id;
      
      const Job = require('../models/Job');
      const User = require('../models/User');
      const Application = require('../models/Application');
      
      // Get job and check if it exists and is active
      const job = await Job.findById(jobId);
      if (!job || job.status !== 'active') {
          return res.status(400).json({
              success: false,
              message: 'Job not found or not accepting applications'
          });
      }
      
      // Check if user already applied
      const existingApplication = await Application.findOne({
          jobId,
          applicantId: userId
      });
      
      if (existingApplication) {
          return res.status(400).json({
              success: false,
              message: 'You have already applied for this job'
          });
      }
      
      // Find referrer if referral code provided
      let referredBy = null;
      if (referralCode) {
          const referrer = await User.findOne({ referralCode });
          if (referrer) {
              referredBy = referrer._id;
          }
      }
      
      // Create application
      const application = new Application({
          jobId,
          applicantId: userId,
          companyId: job.companyId,
          referredBy,
          referralCode,
          isReferral: !!referredBy,
          coverLetter,
          status: 'pending'
      });
      
      await application.save();
      
      // Update job stats
      await job.incrementApplications(!!referredBy);
      
      res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          data: {
              application: application._id,
              isReferral: !!referredBy
          }
      });
      
  } catch (error) {
      console.error('Application submission error:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to submit application'
      });
  }
});

// @desc    Schedule interview
// @route   POST /api/applications/:id/interview
// @access  Private (Company)
router.post('/:id/interview', auth, requireCompany, (req, res, next) => {
  // Validation middleware for interview scheduling
  const { type, scheduledAt } = req.body;
  
  if (!type || !scheduledAt) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Interview type and scheduled time are required'
    });
  }
  
  const validTypes = ['phone', 'video', 'in-person', 'technical', 'final'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid interview type',
      message: `Interview type must be one of: ${validTypes.join(', ')}`
    });
  }
  
  // Validate scheduled time is in the future
  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    return res.status(400).json({
      success: false,
      error: 'Invalid scheduled time',
      message: 'Interview must be scheduled for a future date and time'
    });
  }
  
  next();
}, scheduleInterview);

module.exports = router;