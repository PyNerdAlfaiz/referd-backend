const Referral = require('../models/Referral');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const { sendNotification } = require('../utils/notificationService');

// Create a referral (when user shares a job)
const createReferral = async (req, res) => {
  try {
    const { jobId, referralMethod = 'direct_link' } = req.body;
    const referrerId = req.user._id;
    
    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Check if user already has an active referral for this job
    const existingReferral = await Referral.findOne({
      referrerId,
      jobId,
      status: 'active'
    });
    
    if (existingReferral) {
      return res.status(400).json({ 
        message: 'You already have an active referral for this job',
        referralCode: existingReferral.referralCode 
      });
    }
    
    // Create new referral
    const referral = await Referral.create({
      referrerId,
      jobId,
      companyId: job.companyId,
      referralCode: req.user.referralCode,
      referralMethod,
      referralFee: job.referralFee,
      status: 'active'
    });
    
    // Update user's referral stats
    await User.findByIdAndUpdate(referrerId, {
      $inc: { 'referralStats.totalReferrals': 1 }
    });
    
    res.status(201).json({
      success: true,
      message: 'Referral created successfully',
      referral,
      shareLink: `${process.env.CLIENT_URL}/jobs/${jobId}?ref=${req.user.referralCode}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Track referral click
const trackReferralClick = async (req, res) => {
  try {
    const { referralCode, jobId } = req.body;
    
    const referral = await Referral.findOne({
      referralCode,
      jobId,
      status: 'active'
    });
    
    if (referral) {
      await Referral.findByIdAndUpdate(referral._id, {
        $inc: { clicks: 1 }
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Process successful hire (triggers referral payment)
const processSuccessfulHire = async (applicationId) => {
  try {
    const application = await Application.findById(applicationId)
      .populate('jobId')
      .populate('referredBy');
    
    if (!application.referredBy) {
      return; // No referral involved
    }
    
    // Find the referral
    const referral = await Referral.findOne({
      referrerId: application.referredBy._id,
      jobId: application.jobId._id,
      status: 'active'
    });
    
    if (!referral) {
      console.error('Referral not found for successful hire');
      return;
    }
    
    // Update referral status
    await Referral.findByIdAndUpdate(referral._id, {
      status: 'successful',
      hireDate: new Date(),
      paymentStatus: 'pending'
    });
    
    // Update referrer's stats
    await User.findByIdAndUpdate(referral.referrerId, {
      $inc: {
        'referralStats.successfulReferrals': 1,
        'referralStats.pendingEarnings': referral.referralFee,
        'referralStats.totalEarnings': referral.referralFee
      }
    });
    
    // Create payment record
    const Payment = require('../models/Payment');
    await Payment.create({
      referrerId: referral.referrerId,
      companyId: referral.companyId,
      referralId: referral._id,
      amount: referral.referralFee,
      currency: 'GBP',
      status: 'pending',
      paymentReference: `PAY-REF-${Date.now()}`
    });
    
    // Send notifications
    await sendNotification({
      userId: referral.referrerId,
      type: 'referral_hired',
      title: 'Congratulations! Your referral was hired',
      message: `Your referral for ${application.jobId.title} was successful. You earned £${referral.referralFee}!`,
      relatedJobId: application.jobId._id,
      relatedReferralId: referral._id
    });
    
    console.log(`Referral payment processed: £${referral.referralFee} for user ${referral.referrerId}`);
  } catch (error) {
    console.error('Error processing successful hire:', error);
  }
};

// Get user's referrals
const getUserReferrals = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrerId: req.user._id })
      .populate('jobId', 'title companyId salary status')
      .populate('companyId', 'companyName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      referrals
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReferral,
  trackReferralClick,
  processSuccessfulHire,
  getUserReferrals
};

// controllers/jobController.js
const Job = require('../models/Job');
const Company = require('../models/Company');

// Create a new job (Company only)
const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      jobType,
      workType,
      location,
      salary,
      referralFee = 1000,
      category,
      experienceLevel,
      applicationDeadline
    } = req.body;
    
    const job = await Job.create({
      ...req.body,
      companyId: req.user._id,
      status: 'active'
    });
    
    // Update company stats
    await Company.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalJobsPosted': 1, 'stats.activeJobs': 1 }
    });
    
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all jobs (with referral code tracking)
const getAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, location, jobType, search, ref } = req.query;
    
    // Build filter
    const filter = { status: 'active' };
    
    if (category) filter.category = category;
    if (location) filter['location.city'] = new RegExp(location, 'i');
    if (jobType) filter.jobType = jobType;
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    
    const jobs = await Job.find(filter)
      .populate('companyId', 'companyName profile.logo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Job.countDocuments(filter);
    
    // Track referral view if ref code provided
    if (ref && jobs.length > 0) {
      const Referral = require('../models/Referral');
      await Referral.updateMany(
        { referralCode: ref, jobId: { $in: jobs.map(job => job._id) } },
        { $inc: { views: 1 } }
      );
    }
    
    res.json({
      success: true,
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single job with referral tracking
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const { ref } = req.query;
    
    const job = await Job.findById(id)
      .populate('companyId', 'companyName profile website description');
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Track referral view
    if (ref) {
      const Referral = require('../models/Referral');
      await Referral.findOneAndUpdate(
        { referralCode: ref, jobId: id },
        { $inc: { views: 1 } }
      );
    }
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get company's jobs
const getCompanyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ companyId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  getCompanyJobs
};