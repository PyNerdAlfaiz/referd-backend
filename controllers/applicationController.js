// controllers/applicationController.js - Complete application management logic
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Company = require('../models/Company');

// @desc    Submit job application
// @route   POST /api/applications
// @access  Private (User)
const submitApplication = async (req, res) => {
  try {
    const {
      jobId,
      coverLetter,
      customResponses,
      referralCode,
      consent
    } = req.body;
    
    // Verify user is not a company
    if (req.userType !== 'user') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only users can submit job applications'
      });
    }
    
    // Find the job
    const job = await Job.findById(jobId).populate('companyId', 'companyName');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: 'The job you are trying to apply for could not be found'
      });
    }
    
    // Check if job is still accepting applications
    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Job not accepting applications',
        message: 'This job is no longer accepting applications'
      });
    }
    
    // Check if user already applied
    const existingApplication = await Application.findOne({
      jobId,
      applicantId: req.user._id
    });
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'Already applied',
        message: 'You have already applied for this job'
      });
    }
    
    // Handle referral tracking
    let referredBy = null;
    let isReferral = false;
    
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer && referrer._id.toString() !== req.user._id.toString()) {
        referredBy = referrer._id;
        isReferral = true;
        
        console.log(`📧 Referral application: ${req.user.email} referred by ${referrer.referralCode}`);
      }
    }
    
    // Create application
    const application = await Application.create({
      jobId,
      applicantId: req.user._id,
      companyId: job.companyId._id,
      referredBy,
      referralCode: isReferral ? referralCode.toUpperCase() : null,
      isReferral,
      coverLetter,
      customResponses,
      resume: {
        filename: req.user.profile?.resume?.filename,
        url: req.user.profile?.resume?.url,
        uploadDate: req.user.profile?.resume?.uploadDate
      },
      consent: {
        dataProcessing: consent?.dataProcessing !== false,
        marketing: consent?.marketing || false,
        backgroundCheck: consent?.backgroundCheck || false
      },
      tracking: {
        appliedAt: new Date(),
        deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
        browserInfo: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });
    
    // Update job statistics
    await Job.findByIdAndUpdate(jobId, {
      $inc: {
        'stats.applications': 1,
        ...(isReferral && { 'stats.referralApplications': 1 })
      }
    });
    
    // Update referrer statistics
    if (isReferral && referredBy) {
      await User.findByIdAndUpdate(referredBy, {
        $inc: { 'referralStats.totalReferrals': 1 }
      });
    }
    
    // Update company statistics
    await Company.findByIdAndUpdate(job.companyId._id, {
      $inc: { 'stats.totalApplications': 1 }
    });
    
    // Populate the response
    await application.populate([
      { path: 'jobId', select: 'title companyId referralFee' },
      { path: 'companyId', select: 'companyName' },
      { path: 'referredBy', select: 'firstName lastName referralCode' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application: application.getSummary(),
        referralInfo: isReferral ? {
          referrerName: `${application.referredBy.firstName} ${application.referredBy.lastName}`,
          referralCode: application.referredBy.referralCode,
          potentialEarning: job.referralFee
        } : null
      }
    });
    
    console.log(`✅ Application submitted: ${req.user.firstName} applied to ${job.title}${isReferral ? ` (referred by ${referralCode})` : ''}`);
    
  } catch (error) {
    console.error('Submit application error:', error);
    
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
      message: 'Could not submit application'
    });
  }
};

// @desc    Get user's applications
// @route   GET /api/applications/my-applications
// @access  Private (User)
const getUserApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter
    const filters = { applicantId: req.user._id };
    if (status) filters.status = status;
    
    // Build sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get applications with pagination
    const applications = await Application.find(filters)
      .populate('jobId', 'title companyId referralFee')
      .populate('companyId', 'companyName profile.logo')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Application.countDocuments(filters);
    
    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalApplications: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get user applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve applications'
    });
  }
};

// @desc    Get user's referrals
// @route   GET /api/applications/my-referrals
// @access  Private (User)
const getUserReferrals = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter
    const filters = { referredBy: req.user._id };
    if (status) filters.status = status;
    
    // Build sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get referrals with pagination
    const referrals = await Application.find(filters)
      .populate('applicantId', 'firstName lastName email')
      .populate('jobId', 'title companyId')
      .populate('companyId', 'companyName')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Application.countDocuments(filters);
    
    // Calculate earnings summary
    const earningsStats = await Application.aggregate([
      { $match: { referredBy: req.user._id } },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          successfulReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] }
          },
          pendingEarnings: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$referralPayment.isEligible', true] },
                  { $eq: ['$referralPayment.status', 'pending'] }
                ]},
                '$referralPayment.amount',
                0
              ]
            }
          },
          totalEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$referralPayment.isEligible', true] },
                '$referralPayment.amount',
                0
              ]
            }
          }
        }
      }
    ]);
    
    const earnings = earningsStats[0] || {
      totalReferrals: 0,
      successfulReferrals: 0,
      pendingEarnings: 0,
      totalEarnings: 0
    };
    
    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalReferrals: total,
          hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        },
        earnings
      }
    });
    
  } catch (error) {
    console.error('Get user referrals error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve referrals'
    });
  }
};

// @desc    Get company applications
// @route   GET /api/applications/company-applications
// @access  Private (Company)
const getCompanyApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      jobId,
      isReferral,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter
    const filters = { companyId: req.user._id };
    if (status) filters.status = status;
    if (jobId) filters.jobId = jobId;
    if (isReferral !== undefined) filters.isReferral = isReferral === 'true';
    
    // Build sort
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get applications with pagination
    const applications = await Application.find(filters)
      .populate('applicantId', 'firstName lastName email profile phone')
      .populate('jobId', 'title')
      .populate('referredBy', 'firstName lastName referralCode')
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Application.countDocuments(filters);
    
    // Get application statistics
    const stats = await Application.aggregate([
      { $match: { companyId: req.user._id } },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          pendingApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          reviewingApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] }
          },
          interviewingApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'interviewing'] }, 1, 0] }
          },
          hiredApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] }
          },
          referralApplications: {
            $sum: { $cond: [{ $eq: ['$isReferral', true] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalApplications: total,
          hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        },
        statistics: stats[0] || {
          totalApplications: 0,
          pendingApplications: 0,
          reviewingApplications: 0,
          interviewingApplications: 0,
          hiredApplications: 0,
          referralApplications: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get company applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve applications'
    });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Company)
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, rating, feedback } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Find application and verify ownership
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    if (application.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update applications for your own jobs'
      });
    }
    
    const oldStatus = application.status;
    
    // Update application status
    application.status = status;
    application.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status changed to ${status}`,
      updatedBy: req.user._id,
      updatedByModel: 'Company'
    });
    
    // Update company feedback if provided
    if (rating || feedback) {
      application.companyFeedback = {
        ...application.companyFeedback,
        ...(rating && { rating }),
        ...(feedback && { 
          notes: feedback.notes,
          strengths: feedback.strengths,
          concerns: feedback.concerns,
          recommendation: feedback.recommendation
        }),
        reviewedBy: {
          name: `${req.user.profile?.contactPerson?.firstName || ''} ${req.user.profile?.contactPerson?.lastName || ''}`.trim(),
          position: req.user.profile?.contactPerson?.position
        },
        reviewedAt: new Date()
      };
    }
    
    // Handle special status changes
    if (status === 'hired' && application.isReferral) {
      // Process referral payment
      await processReferralPayment(application);
      
      // Update company hire stats
      await Company.findByIdAndUpdate(req.user._id, {
        $inc: { 'stats.totalHires': 1 }
      });
      
      // Update referrer stats
      if (application.referredBy) {
        await User.findByIdAndUpdate(application.referredBy, {
          $inc: { 'referralStats.successfulReferrals': 1 }
        });
      }
    }
    
    await application.save();
    
    // Populate for response
    await application.populate([
      { path: 'applicantId', select: 'firstName lastName email' },
      { path: 'jobId', select: 'title' },
      { path: 'referredBy', select: 'firstName lastName referralCode' }
    ]);
    
    res.json({
      success: true,
      message: `Application status updated to ${status}`,
      data: {
        application: application.getSummary(),
        statusChange: {
          from: oldStatus,
          to: status,
          note
        }
      }
    });
    
    console.log(`✅ Application status updated: ${application.applicantId.firstName} ${application.applicantId.lastName} - ${oldStatus} → ${status}`);
    
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not update application status'
    });
  }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private (Company or Applicant)
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await Application.findById(id)
      .populate('applicantId', 'firstName lastName email profile phone')
      .populate('jobId', 'title description requirements companyId referralFee')
      .populate('companyId', 'companyName profile')
      .populate('referredBy', 'firstName lastName referralCode')
      .lean();
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    // Check access permissions
    const isApplicant = req.user._id.toString() === application.applicantId._id.toString();
    const isCompany = req.user._id.toString() === application.companyId._id.toString();
    const isReferrer = application.referredBy && req.user._id.toString() === application.referredBy._id.toString();
    
    if (!isApplicant && !isCompany && !isReferrer) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only view your own applications or applications for your jobs'
      });
    }
    
    // Filter sensitive information based on user type
    let responseData = { ...application };
    
    if (isApplicant || isReferrer) {
      // Remove internal company notes and detailed feedback
      delete responseData.internalNotes;
      if (responseData.companyFeedback?.notes) {
        delete responseData.companyFeedback.notes;
      }
    }
    
    res.json({
      success: true,
      data: {
        application: responseData,
        permissions: {
          canUpdate: isCompany,
          canWithdraw: isApplicant && ['pending', 'reviewing', 'shortlisted'].includes(application.status),
          canView: true
        }
      }
    });
    
  } catch (error) {
    console.error('Get application by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        message: 'Invalid application ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not retrieve application'
    });
  }
};

// @desc    Withdraw application
// @route   PUT /api/applications/:id/withdraw
// @access  Private (User - Applicant only)
const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find application
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    // Check if user is the applicant
    if (application.applicantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only withdraw your own applications'
      });
    }
    
    // Check if application can be withdrawn
    if (!['pending', 'reviewing', 'shortlisted'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw application',
        message: 'This application cannot be withdrawn in its current state'
      });
    }
    
    // Update application status
    application.status = 'withdrawn';
    application.statusHistory.push({
      status: 'withdrawn',
      timestamp: new Date(),
      note: reason || 'Application withdrawn by applicant',
      updatedBy: req.user._id,
      updatedByModel: 'User'
    });
    
    await application.save();
    
    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: {
        applicationId: id,
        status: 'withdrawn',
        reason
      }
    });
    
    console.log(`✅ Application withdrawn: ${req.user.firstName} ${req.user.lastName} withdrew from ${application.jobId}`);
    
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not withdraw application'
    });
  }
};

// @desc    Schedule interview
// @route   POST /api/applications/:id/interview
// @access  Private (Company)
const scheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      scheduledAt,
      duration,
      location,
      interviewer,
      instructions
    } = req.body;
    
    // Find application and verify ownership
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    if (application.companyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Validate interview data
    if (!type || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Interview type and scheduled time are required'
      });
    }
    
    // Add interview to application
    application.interviews.push({
      type,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      location: {
        address: location?.address,
        meetingLink: location?.meetingLink,
        phone: location?.phone,
        instructions: instructions || location?.instructions
      },
      interviewer: {
        name: interviewer?.name,
        position: interviewer?.position,
        email: interviewer?.email
      },
      status: 'scheduled'
    });
    
    // Update application status if not already interviewing
    if (!['interviewing', 'offered', 'hired'].includes(application.status)) {
      application.status = 'interviewing';
      application.statusHistory.push({
        status: 'interviewing',
        timestamp: new Date(),
        note: `${type} interview scheduled`,
        updatedBy: req.user._id,
        updatedByModel: 'Company'
      });
    }
    
    await application.save();
    
    await application.populate([
      { path: 'applicantId', select: 'firstName lastName email' },
      { path: 'jobId', select: 'title' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: {
        application: application.getSummary(),
        interview: application.interviews[application.interviews.length - 1]
      }
    });
    
    console.log(`✅ Interview scheduled: ${type} interview for ${application.applicantId.firstName} ${application.applicantId.lastName}`);
    
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Could not schedule interview'
    });
  }
};

// Helper function to process referral payment
const processReferralPayment = async (application) => {
  try {
    if (!application.isReferral || !application.referredBy) return;
    
    // Get job details for referral fee
    const job = await Job.findById(application.jobId);
    if (!job) return;
    
    // Update referral payment status
    application.referralPayment = {
      isEligible: true,
      amount: job.referralFee,
      currency: job.referralFeeCurrency || 'GBP',
      status: 'pending',
      paymentReference: `REF-PAY-${Date.now()}`,
      notes: `Referral payment for successful hire - ${job.title}`
    };
    
    // Update referrer's earnings
    await User.findByIdAndUpdate(application.referredBy, {
      $inc: {
        'referralStats.pendingEarnings': job.referralFee,
        'referralStats.totalEarnings': job.referralFee
      }
    });
    
    console.log(`💰 Referral payment processed: £${job.referralFee} for user ${application.referredBy}`);
    
  } catch (error) {
    console.error('Process referral payment error:', error);
  }
};

module.exports = {
  submitApplication,
  getUserApplications,
  getUserReferrals,
  getCompanyApplications,
  updateApplicationStatus,
  getApplicationById,
  withdrawApplication,
  scheduleInterview
};