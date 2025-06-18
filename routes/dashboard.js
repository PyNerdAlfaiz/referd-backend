const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Dashboard routes are working!',
    endpoints: {
      'GET /stats': 'Get dashboard statistics',
      'GET /recent-activity': 'Get recent activity',
      'GET /analytics': 'Get analytics data'
    }
  });
});

// Placeholder routes
router.get('/stats', (req, res) => {
  res.json({ 
    message: 'Dashboard stats endpoint - Coming soon!',
    sampleData: {
      totalReferrals: 24,
      successfulReferrals: 8,
      totalEarnings: 8000,
      activeJobs: 45
    }
  });
});

router.get('/recent-activity', (req, res) => {
  res.json({ message: 'Recent activity endpoint - Coming soon!' });
});

module.exports = router;