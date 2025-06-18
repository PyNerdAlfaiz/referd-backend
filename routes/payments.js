const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Payment routes are working!',
    endpoints: {
      'GET /earnings': 'Get user earnings',
      'GET /history': 'Get payment history',
      'POST /withdraw': 'Request payment withdrawal',
      'GET /methods': 'Get payment methods'
    }
  });
});

// Placeholder routes
router.get('/earnings', (req, res) => {
  res.json({ 
    message: 'Get user earnings endpoint - Coming soon!',
    sampleData: {
      totalEarnings: 2400,
      pendingEarnings: 1000,
      paidEarnings: 1400
    }
  });
});

router.get('/history', (req, res) => {
  res.json({ message: 'Get payment history endpoint - Coming soon!' });
});

module.exports = router;