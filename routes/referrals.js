const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Referral routes are working!',
    endpoints: {
      'POST /create': 'Create referral',
      'GET /my-referrals': 'Get user referrals',
      'POST /track-click': 'Track referral click',
      'GET /stats': 'Get referral statistics'
    }
  });
});

// Placeholder routes
router.post('/create', (req, res) => {
  res.json({ message: 'Create referral endpoint - Coming soon!' });
});

router.get('/my-referrals', (req, res) => {
  res.json({ message: 'Get user referrals endpoint - Coming soon!' });
});

router.post('/track-click', (req, res) => {
  res.json({ message: 'Track referral click endpoint - Coming soon!' });
});

module.exports = router;