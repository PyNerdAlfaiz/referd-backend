// controllers/jobController.js - Job management logic
const Job = require('../models/Job');
const Company = require('../models/Company');

// @desc    Get all jobs (public browsing)
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      location,
      country,           // ADD THIS for country filtering
      jobType,
      workType,
      experienceLevel,
      salaryMin,
      salaryMax,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ref // Referral code for tracking
    } = req.query;
    
    // Build filter object
    const filters = {
      status: 'active',
      visibility: 'public'
    };
    
    // Apply filters
    if (category) filters.category = category;
    if (location) filters['location.city'] = new RegExp(location, 'i');
    
    // ADD COUNTRY FILTERING - This is the key addition
    if (country) {
      filters['location.country'] = country;
    }
    
    if (jobType) filters.jobType = jobType;
    if (workType) filters.workType = workType;
    if (experienceLevel) filters.experienceLevel = experienceLevel;
    
    // Salary filter
    if (salaryMin || salaryMax) {
      filters['$and'] = [];
      if (salaryMin) {
        filters['$and'].push({
          '$or': [
            { 'salary.max': { $gte: parseInt(salaryMin) } },
            { 'salary.min': { $gte: parseInt(salaryMin) } }
          ]
        });
      }
      if (salaryMax) {
        filters['$and'].push({
          'salary.min': { $lte: parseInt(salaryMax) }
        });
      }
    }
    
    // Build sort object
    const sortObj = {};
    if (search) {
      sortObj.score = { $meta: 'textScore' };
    }
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let query;
    
    // Text search or regular filter
    if (search) {
      query = Job.searchJobs(search, filters);
    } else {
      query = Job.find(filters)
        .populate('companyId', 'companyName profile.logo profile.description profile.website');
    }
    
    // Apply pagination and sorting
    const jobs = await query
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Job.countDocuments(filters);
    
    // Track referral views if referral code provided
    if (ref && jobs.length > 0) {
      console.log(`Referral view tracked: ${ref} viewed ${jobs.length} jobs`);
    }
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    // LOG the country filter for debugging
    if (country) {
      console.log(`🌍 Filtering jobs by country: ${country} - Found ${jobs.length} jobs`);
    }
    
    res.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          ...job,
          summary: true // Indicate this is summary data
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalJobs: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        },
        filters: {
          search,
          category,
          location,
          country,        // ADD THIS to response
          jobType,
          workType,
          experienceLevel,
          salaryMin,
          salaryMax
        }
      }
    });
    
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve jobs'
    });
  }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const { ref } = req.query; // Referral code
    
    const job = await Job.findById(id)
      .populate('companyId', 'companyName profile industry companySize stats')
      .lean();
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The requested job could not be found'
      });
    }
    
    // Check if job is viewable
    if (job.status !== 'active' && job.visibility === 'private') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The requested job could not be found'
      });
    }
    
    // Increment view count (we'll do this async to not slow down response)
    Job.findByIdAndUpdate(id, {
      $inc: { 
        'stats.views': 1,
        ...(ref && { 'stats.referralViews': 1 })
      }
    }, { validateBeforeSave: false }).exec();
    
    // Track referral view if referral code provided
    if (ref) {
      console.log(`Referral view: ${ref} viewed job ${id}`);
      // We'll implement proper referral tracking in the next phase
    }
    
    res.json({
      success: true,
      data: {
        job,
        referralLink: ref ? job.referralBaseLink + `?ref=${ref}` : null
      }
    });
    
  } catch (error) {
    console.error('Get job by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Invalid job ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve job'
    });
  }
};

// @desc    Create new job (Company only)
// @route   POST /api/jobs
// @access  Private (Company)
const createJob = async (req, res) => {
  try {
    console.log('🎯 CREATE JOB CONTROLLER STARTED');
    
    const {
      title,
      description,
      requirements,
      responsibilities,
      jobType,
      workType,
      experienceLevel,
      location,
      salary,
      benefits,
      referralFee,
      skills,
      category,
      department,
      applicationSettings,
      status  // ADD THIS - get status from request
    } = req.body;
    
    // Verify user is a company
    if (req.userType !== 'company') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only companies can create jobs'
      });
    }
    
    // Create job with status from frontend (not hardcoded as 'draft')
    const job = await Job.create({
      companyId: req.user._id,
      title,
      description,
      requirements,
      responsibilities,
      jobType,
      workType,
      experienceLevel,
      location,
      salary,
      benefits,
      referralFee: referralFee || 1000,
      skills,
      category,
      department,
      applicationSettings,
      status: status || 'active',  // CHANGE: Use status from request, default to 'active'
      postedDate: status === 'active' ? new Date() : undefined  // Set posted date if active
    });
    
    // Update company stats
    await Company.findByIdAndUpdate(req.user._id, {
      $inc: { 
        'stats.totalJobsPosted': 1,
        ...(status === 'active' && { 'stats.activeJobs': 1 })  // Only increment active jobs if status is active
      }
    });
    
    // Populate company info for response
    await job.populate('companyId', 'companyName profile.logo');
    
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job }
    });
    
    console.log(`✅ Job created: ${title} with status: ${job.status}`);
    
  } catch (error) {
    console.error('Create job error:', error);
    
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
      message: 'Could not create job'
    });
  }
};

// @desc    Update job (Company only)
// @route   PUT /api/jobs/:id
// @access  Private (Company)
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find job and verify ownership
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The requested job could not be found'
      });
    }
    
    // Check if user owns this job
    if (job.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update your own jobs'
      });
    }
    
    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      { ...req.body, updatedDate: new Date() },
      { new: true, runValidators: true }
    ).populate('companyId', 'companyName profile.logo');
    
    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job: updatedJob }
    });
    
    console.log(`✅ Job updated: ${updatedJob.title} by ${req.user.companyName}`);
    
  } catch (error) {
    console.error('Update job error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: messages[0],
        details: messages
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'Invalid job ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not update job'
    });
  }
};

// @desc    Change job status (Company only)
// @route   PUT /api/jobs/:id/status
// @access  Private (Company)
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['draft', 'active', 'paused', 'closed', 'filled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be one of: draft, active, paused, closed, filled'
      });
    }
    
    // Find job and verify ownership
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    if (job.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update your own jobs'
      });
    }
    
    const oldStatus = job.status;
    
    // Update status
    job.status = status;
    if (status === 'active' && oldStatus === 'draft') {
      job.postedDate = new Date();
    }
    if (['closed', 'filled'].includes(status)) {
      job.closedDate = new Date();
    }
    
    await job.save();
    
    // Update company stats
    if (status === 'active' && oldStatus !== 'active') {
      await Company.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.activeJobs': 1 }
      });
    } else if (status !== 'active' && oldStatus === 'active') {
      await Company.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.activeJobs': -1 }
      });
    }
    
    res.json({
      success: true,
      message: `Job status changed to ${status}`,
      data: {
        jobId: id,
        oldStatus,
        newStatus: status
      }
    });
    
    console.log(`✅ Job status changed: ${job.title} from ${oldStatus} to ${status}`);
    
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not update job status'
    });
  }
};

// @desc    Get company's jobs
// @route   GET /api/jobs/company/mine
// @access  Private (Company)
const getCompanyJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,  // Optional status filter
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter - always include companyId
    const filters = { companyId: req.user._id };
    
    // Only filter by status if specifically requested
    if (status) filters.status = status;
    
    // Build sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get jobs with pagination
    const jobs = await Job.find(filters)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Job.countDocuments(filters);
    
    console.log(`📋 Found ${jobs.length} jobs for company ${req.user.companyName}`);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalJobs: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve jobs'
    });
  }
};

// @desc    Delete job (Company only)
// @route   DELETE /api/jobs/:id
// @access  Private (Company)
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find job and verify ownership
    const job = await Job.findById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    if (job.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only delete your own jobs'
      });
    }
    
    // Check if job has applications (prevent deletion if it does)
    if (job.stats.applications > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete job',
        message: 'Cannot delete a job that has received applications. Please close it instead.'
      });
    }
    
    // Delete job
    await Job.findByIdAndDelete(id);
    
    // Update company stats
    await Company.findByIdAndUpdate(req.user._id, {
      $inc: { 
        'stats.totalJobsPosted': -1,
        ...(job.status === 'active' && { 'stats.activeJobs': -1 })
      }
    });
    
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
    
    console.log(`✅ Job deleted: ${job.title} by ${req.user.companyName}`);
    
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not delete job'
    });
  }
};

// @desc    Get job categories and filters
// @route   GET /api/jobs/filters
// @access  Public
const getJobFilters = async (req, res) => {
  try {
    // Get unique values for filters from active jobs
    const [categories, locations, jobTypes, workTypes, experiencelevels] = await Promise.all([
      Job.distinct('category', { status: 'active', visibility: 'public' }),
      Job.distinct('location.city', { status: 'active', visibility: 'public' }),
      Job.distinct('jobType', { status: 'active', visibility: 'public' }),
      Job.distinct('workType', { status: 'active', visibility: 'public' }),
      Job.distinct('experienceLevel', { status: 'active', visibility: 'public' })
    ]);
    
    // Get salary ranges
    const salaryStats = await Job.aggregate([
      { $match: { status: 'active', visibility: 'public', 'salary.min': { $exists: true } } },
      {
        $group: {
          _id: null,
          minSalary: { $min: '$salary.min' },
          maxSalary: { $max: '$salary.max' },
          avgMinSalary: { $avg: '$salary.min' },
          avgMaxSalary: { $avg: '$salary.max' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        categories: categories.sort(),
        locations: locations.filter(Boolean).sort(),
        jobTypes: jobTypes.sort(),
        workTypes: workTypes.sort(),
        experienceLevels: experiencelevels.sort(),
        salaryRange: salaryStats[0] || {
          minSalary: 0,
          maxSalary: 100000,
          avgMinSalary: 30000,
          avgMaxSalary: 60000
        }
      }
    });
    
  } catch (error) {
    console.error('Get job filters error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve filters'
    });
  }
};

// @desc    Generate referral link for job
// @route   GET /api/jobs/:id/referral-link
// @access  Private (User)
const generateReferralLink = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify user is a regular user (not company)
    if (req.userType !== 'user') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only users can generate referral links'
      });
    }
    
    // Find job
    const job = await Job.findById(id).select('title companyId referralFee status');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Job not active',
        message: 'Cannot create referral links for inactive jobs'
      });
    }
    
    // Generate referral link using user's referral code
    const referralLink = job.generateReferralLink(req.user.referralCode);
    
    res.json({
      success: true,
      data: {
        referralLink,
        referralCode: req.user.referralCode,
        jobTitle: job.title,
        referralFee: job.referralFee,
        jobId: job._id
      }
    });
    
    console.log(`✅ Referral link generated: ${req.user.referralCode} for job ${id}`);
    
  } catch (error) {
    console.error('Generate referral link error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not generate referral link'
    });
  }
};

// @desc    Get job statistics (Company only)
// @route   GET /api/jobs/:id/stats
// @access  Private (Company)
const getJobStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find job and verify ownership
    const job = await Job.findById(id).select('companyId stats title');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    if (job.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view stats for your own jobs'
      });
    }
    
    // Calculate additional stats
    const referralRate = job.stats.views > 0 
      ? Math.round((job.stats.referralViews / job.stats.views) * 100) 
      : 0;
    
    const applicationRate = job.stats.views > 0 
      ? Math.round((job.stats.applications / job.stats.views) * 100) 
      : 0;
    
    const referralApplicationRate = job.stats.referralViews > 0 
      ? Math.round((job.stats.referralApplications / job.stats.referralViews) * 100) 
      : 0;
    
    res.json({
      success: true,
      data: {
        jobId: id,
        jobTitle: job.title,
        stats: {
          ...job.stats,
          referralRate,
          applicationRate,
          referralApplicationRate
        }
      }
    });
    
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve job statistics'
    });
  }
};


const cleanupExpiredJobs = async () => {
  try {
    console.log('🧹 Running job cleanup...');
    
    const now = new Date();
    
    // Find jobs that have passed their application deadline
    const expiredJobs = await Job.find({
      status: 'active',
      'applicationSettings.applicationDeadline': { $lt: now }
    });
    
    if (expiredJobs.length > 0) {
      console.log(`Found ${expiredJobs.length} expired jobs`);
      
      // Update expired jobs to 'closed' status
      const result = await Job.updateMany(
        {
          status: 'active',
          'applicationSettings.applicationDeadline': { $lt: now }
        },
        {
          $set: {
            status: 'closed',
            closedDate: now
          }
        }
      );
      
      console.log(`✅ Closed ${result.modifiedCount} expired jobs`);
      
      // Update company stats (decrease active jobs count)
      for (const job of expiredJobs) {
        await Company.findByIdAndUpdate(job.companyId, {
          $inc: { 'stats.activeJobs': -1 }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Job cleanup error:', error);
  }
};

module.exports = {
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
};