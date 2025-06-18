const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Webhook routes are working!',
    endpoints: {
      'POST /stripe': 'Stripe payment webhooks',
      'POST /email': 'Email service webhooks'
    }
  });
});

// Placeholder routes
router.post('/stripe', (req, res) => {
  res.json({ message: 'Stripe webhook endpoint - Coming soon!' });
});

router.post('/email', (req, res) => {
  res.json({ message: 'Email webhook endpoint - Coming soon!' });
});

module.exports = router;