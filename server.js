// server.js - Main server file with complete configuration

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import configurations
const { 
  initializeServices, 
  getConfig, 
  validateEnv, 
  setupGracefulShutdown 
} = require('./config');
const configureSocket = require('./config/socket');

// Initialize Express app
const app = express();

// Main server initialization function
const startServer = async () => {
  try {
    console.log('🚀 Starting Refer\'d Backend Server...\n');
    
    // 1. Validate environment variables
    console.log('🔍 Validating environment variables...');
    validateEnv();
    
    // 2. Get configuration
    const config = getConfig();
    console.log(`🌍 Environment: ${config.env}`);
    
    // 3. Initialize all services (database, email, stripe, etc.)
    const services = await initializeServices();
    
    // 4. Configure middleware
    setupMiddleware(app, config);
    
    // 5. Setup routes
    setupRoutes(app);
    
    // 6. Setup error handling
    setupErrorHandling(app);
    
    // 7. Start the server with port fallback
    const startServerOnPort = async (port) => {
      try {
        const server = app.listen(port, () => {
          console.log(`🚪 Server running on port ${port}`);
          console.log(`🌐 API URL: http://localhost:${port}/api`);
          console.log(`📱 Frontend URL: ${config.clientUrl}`);
          console.log('\n✅ Refer\'d Backend is ready to accept connections!\n');
        });
        
        // 8. Configure Socket.io
        const { io, socketHelpers } = configureSocket(server);
        
        // Make socket helpers available to routes
        app.set('socketHelpers', socketHelpers);
        app.set('services', services);
        
        // 9. Setup graceful shutdown
        setupGracefulShutdown(server);
        
        return server;
      } catch (error) {
        if (error.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
          return startServerOnPort(port + 1);
        }
        throw error;
      }
    };
    
    await startServerOnPort(config.port);
    
  } catch (error) {
    console.error('\n❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

// Configure middleware
const setupMiddleware = (app, config) => {
  console.log('⚙️ Setting up middleware...');
  
  // Trust proxy in production
  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  
  // Compression
  app.use(compression());
  
  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
          'http://127.0.0.1:5500',
          'http://localhost:5500',
          'http://127.0.0.1:5501', 
          'http://localhost:5501',
          process.env.CLIENT_URL, // Your Netlify URL
          'https://your-netlify-app.netlify.app' // Replace with actual URL
      ].filter(Boolean);
      
      if (allowedOrigins.includes(origin)) {
          callback(null, true);
      } else {
          console.log('❌ CORS blocked origin:', origin);
          callback(new Error('Not allowed by CORS'));
      }
  },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  // Apply CORS middleware
  app.use(cors(corsOptions));

  // Handle preflight requests
  app.options('*', cors(corsOptions));

  // Add headers middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
  
  // Special rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  
  // Logging
  if (config.logLevel !== 'none') {
    app.use(morgan(config.logLevel));
  }
  
  // Body parsing middleware
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store raw body for webhook verification
      if (req.originalUrl.includes('/webhooks/')) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  // Serve static files from the public directory with proper MIME types
  app.use(express.static(path.join(__dirname, '../'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  
  console.log('✅ Middleware configured');
};

// Setup API routes
// Add these routes to your server.js in the setupRoutes function

// Setup API routes
const setupRoutes = (app) => {
  console.log('🛣️ Setting up routes...');
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const services = app.get('services') || {};
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: services.database ? 'connected' : 'disconnected',
        email: services.email ? 'configured' : 'not configured',
        stripe: services.stripe ? 'configured' : 'not configured',
        cloudinary: services.cloudinary ? 'configured' : 'local storage',
        redis: services.redis ? 'connected' : 'not configured'
      }
    });
  });
  
  // API Documentation endpoint
  app.get('/api', (req, res) => {
    res.json({
      message: 'Welcome to Refer\'d API',
      version: '1.0.0',
      documentation: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        companies: '/api/companies',
        jobs: '/api/jobs',
        applications: '/api/applications',
        referrals: '/api/referrals',
        payments: '/api/payments',
        dashboard: '/api/dashboard'
      }
    });
  });
  
  // Database test endpoint
  app.get('/api/db-test', async (req, res) => {
    try {
      const User = require('./models/User');
      const Company = require('./models/Company');
      
      console.log('🧪 Testing database...');
      
      const userCount = await User.countDocuments().maxTimeMS(5000);
      const companyCount = await Company.countDocuments().maxTimeMS(5000);
      
      console.log('✅ Database test successful');
      
      res.json({
        success: true,
        message: 'Database connection working perfectly',
        data: {
          users: userCount,
          companies: companyCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Database test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        type: error.name
      });
    }
  });
  
  // API Routes - Enable the ones you have
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/applications', require('./routes/applications'));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/companies', require('./routes/companies'));
  app.use('/api/referrals', require('./routes/referrals'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/webhooks', require('./routes/webhooks'));
  
  console.log('✅ Routes configured');
};
// Setup error handling
const setupErrorHandling = (app) => {
  console.log('🚨 Setting up error handling...');
  
  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'API endpoint not found',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
      availableEndpoints: [
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/jobs',
        'GET /api/users/profile',
        // ... add more as you implement them
      ]
    });
  });
  
  // Global error handler
  app.use((error, req, res, next) => {
    console.error('🚨 Error caught by global handler:', error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: 'Validation Error',
        messages: errors
      });
    }
    
    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: 'Duplicate Value',
        message: `${field} already exists`
      });
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Please login again'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Please login again'
      });
    }
    
    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File Too Large',
        message: 'Please upload a smaller file'
      });
    }
    
    // Stripe errors
    if (error.type && error.type.includes('Stripe')) {
      return res.status(400).json({
        error: 'Payment Error',
        message: error.message
      });
    }
    
    // Default error
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });
  
  console.log('✅ Error handling configured');
};

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error('💥 Fatal error during startup:', error);
    process.exit(1);
  });
}

module.exports = app;