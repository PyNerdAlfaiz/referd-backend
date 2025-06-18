const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'User routes are working!',
    endpoints: {
      'GET /profile': 'Get user profile',
      'PUT /profile': 'Update user profile',
      'GET /referrals': 'Get user referrals',
      'GET /earnings': 'Get user earnings',
      'POST /upload-resume': 'Upload resume'
    }
  });
});

// Placeholder routes
router.get('/profile', (req, res) => {
  res.json({ message: 'Get user profile endpoint - Coming soon!' });
});

router.put('/profile', (req, res) => {
  res.json({ message: 'Update user profile endpoint - Coming soon!' });
});

router.get('/referrals', (req, res) => {
  res.json({ message: 'Get user referrals endpoint - Coming soon!' });
});

router.get('/earnings', (req, res) => {
  res.json({ message: 'Get user earnings endpoint - Coming soon!' });
});

module.exports = router;