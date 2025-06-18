// create-routes.js - Script to create all route files
const fs = require('fs');
const path = require('path');

console.log('📁 Creating routes folder structure...\n');

// Create routes directory if it doesn't exist
const routesDir = path.join(__dirname, 'routes');
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir);
  console.log('✅ Created routes/ directory');
} else {
  console.log('✅ routes/ directory already exists');
}

// Route files to create with their content
const routeFiles = {
  'auth.js': `// routes/auth.js - Authentication routes placeholder
const express = require('express');
const router = express.Router();

// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes are working!',
    endpoints: {
      'POST /register': 'Register new user',
      'POST /login': 'User login',
      'POST /logout': 'User logout',
      'GET /me': 'Get current user',
      'POST /forgot-password': 'Request password reset',
      'POST /reset-password': 'Reset password'
    }
  });
});

// Placeholder routes (we'll implement these next)
router.post('/register', (req, res) => {
  res.json({ message: 'User registration endpoint - Coming soon!' });
});

router.post('/login', (req, res) => {
  res.json({ message: 'User login endpoint - Coming soon!' });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'User logout endpoint - Coming soon!' });
});

router.get('/me', (req, res) => {
  res.json({ message: 'Get current user endpoint - Coming soon!' });
});

module.exports = router;`,

  'users.js': `// routes/users.js - User routes placeholder
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

module.exports = router;`,

  'companies.js': `// routes/companies.js - Company routes placeholder
const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Company routes are working!',
    endpoints: {
      'GET /profile': 'Get company profile',
      'PUT /profile': 'Update company profile',
      'GET /jobs': 'Get company jobs',
      'POST /jobs': 'Create new job',
      'GET /applications': 'Get job applications'
    }
  });
});

// Placeholder routes
router.get('/profile', (req, res) => {
  res.json({ message: 'Get company profile endpoint - Coming soon!' });
});

router.put('/profile', (req, res) => {
  res.json({ message: 'Update company profile endpoint - Coming soon!' });
});

router.get('/jobs', (req, res) => {
  res.json({ message: 'Get company jobs endpoint - Coming soon!' });
});

router.post('/jobs', (req, res) => {
  res.json({ message: 'Create new job endpoint - Coming soon!' });
});

module.exports = router;`,

  'jobs.js': `// routes/jobs.js - Job routes placeholder
const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Job routes are working!',
    endpoints: {
      'GET /': 'Get all jobs',
      'GET /:id': 'Get job by ID',
      'POST /': 'Create new job (companies only)',
      'PUT /:id': 'Update job (companies only)',
      'DELETE /:id': 'Delete job (companies only)'
    }
  });
});

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ 
    message: 'Get all jobs endpoint - Coming soon!',
    sampleData: {
      jobs: [
        {
          id: 1,
          title: 'Senior React Developer',
          company: 'TechCorp',
          location: 'London',
          salary: '£70,000',
          referralFee: '£1,000'
        }
      ]
    }
  });
});

router.get('/:id', (req, res) => {
  res.json({ 
    message: \`Get job \${req.params.id} endpoint - Coming soon!\`,
    jobId: req.params.id
  });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create new job endpoint - Coming soon!' });
});

module.exports = router;`,

  'applications.js': `// routes/applications.js - Application routes placeholder
const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Application routes are working!',
    endpoints: {
      'POST /': 'Submit job application',
      'GET /my-applications': 'Get user applications',
      'GET /company-applications': 'Get company applications',
      'PUT /:id/status': 'Update application status'
    }
  });
});

// Placeholder routes
router.post('/', (req, res) => {
  res.json({ message: 'Submit job application endpoint - Coming soon!' });
});

router.get('/my-applications', (req, res) => {
  res.json({ message: 'Get user applications endpoint - Coming soon!' });
});

module.exports = router;`,

  'referrals.js': `// routes/referrals.js - Referral routes placeholder
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

module.exports = router;`,

  'payments.js': `// routes/payments.js - Payment routes placeholder
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

module.exports = router;`,

  'dashboard.js': `// routes/dashboard.js - Dashboard routes placeholder
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

module.exports = router;`,

  'webhooks.js': `// routes/webhooks.js - Webhook routes placeholder
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

module.exports = router;`
};

// Create each route file
Object.entries(routeFiles).forEach(([filename, content]) => {
  const filePath = path.join(routesDir, filename);
  
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created routes/${filename}`);
  } else {
    console.log(`✅ routes/${filename} already exists`);
  }
});

console.log('\n🎉 All route files created successfully!');
console.log('\n📋 Created routes:');
console.log('   • routes/auth.js - Authentication endpoints');
console.log('   • routes/users.js - User management endpoints');
console.log('   • routes/companies.js - Company endpoints');
console.log('   • routes/jobs.js - Job listing endpoints');
console.log('   • routes/applications.js - Job application endpoints');
console.log('   • routes/referrals.js - Referral system endpoints');
console.log('   • routes/payments.js - Payment system endpoints');
console.log('   • routes/dashboard.js - Dashboard data endpoints');
console.log('   • routes/webhooks.js - External service webhooks');
console.log('\n🚀 Server should now start without errors!');
console.log('   Run: npm run dev');
console.log('\n🧪 Test the routes:');
console.log('   • http://localhost:5000/api/auth/test');
console.log('   • http://localhost:5000/api/jobs/test');
console.log('   • http://localhost:5000/api/users/test');