// config/index.js - Main configuration initialization

const connectDB = require('./database');
const { testCloudinaryConnection } = require('./cloudinary');
const { testStripeConnection } = require('./stripe');
const { testEmailConnection } = require('./email');
const { connectRedis } = require('./redis');

/**
 * Initialize all services and configurations
 * This function is called when the server starts
 */
const initializeServices = async () => {
  console.log('🚀 Initializing Refer\'d Backend Services...\n');
  
  const services = {
    database: false,
    cloudinary: false,
    stripe: false,
    email: false,
    redis: false
  };
  
  try {
    // 1. Connect to MongoDB (Required)
    console.log('📊 Connecting to MongoDB...');
    await connectDB();
    services.database = true;
    
    // 2. Test Cloudinary connection (Optional - fallback to local storage)
    console.log('\n☁️ Testing Cloudinary connection...');
    services.cloudinary = await testCloudinaryConnection();
    
    // 3. Test Stripe connection (Optional - required for payments)
    console.log('\n💳 Testing Stripe connection...');
    services.stripe = await testStripeConnection();
    
    // 4. Test Email service (Optional - required for notifications)
    console.log('\n📧 Testing Email service...');
    services.email = await testEmailConnection();
    
    // 5. Connect to Redis (Optional - for caching)
    console.log('\n🔄 Connecting to Redis...');
    const redisClient = await connectRedis();
    services.redis = !!redisClient;
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 SERVICE STATUS SUMMARY');
    console.log('='.repeat(50));
    console.log(`📊 Database (MongoDB): ${services.database ? '✅ Connected' : '❌ Failed'}`);
    console.log(`☁️ File Storage (Cloudinary): ${services.cloudinary ? '✅ Connected' : '⚠️ Using local storage'}`);
    console.log(`💳 Payments (Stripe): ${services.stripe ? '✅ Connected' : '⚠️ Payments disabled'}`);
    console.log(`📧 Email Service: ${services.email ? '✅ Connected' : '⚠️ Email disabled'}`);
    console.log(`🔄 Caching (Redis): ${services.redis ? '✅ Connected' : '⚠️ Caching disabled'}`);
    console.log('='.repeat(50));
    
    // Check if core services are working
    if (!services.database) {
      throw new Error('Database connection is required. Please check your MongoDB configuration.');
    }
    
    // Warnings for optional services
    if (!services.stripe) {
      console.log('\n⚠️ WARNING: Stripe not configured. Referral payments will not work.');
      console.log('   Set STRIPE_SECRET_KEY to enable payments.');
    }
    
    if (!services.email) {
      console.log('\n⚠️ WARNING: Email service not configured. User notifications disabled.');
      console.log('   Set EMAIL_* environment variables to enable email notifications.');
    }
    
    if (!services.cloudinary) {
      console.log('\n⚠️ INFO: Using local file storage. Files will be stored on the server.');
      console.log('   Set CLOUDINARY_* environment variables for cloud storage.');
    }
    
    console.log('\n🎉 Backend initialization complete!\n');
    
    return services;
    
  } catch (error) {
    console.error('\n❌ Backend initialization failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('MongoDB')) {
      console.log('\n🔧 TROUBLESHOOTING MONGODB:');
      console.log('   1. Make sure MongoDB is running: sudo systemctl start mongod');
      console.log('   2. Check your MONGODB_URI in .env file');
      console.log('   3. For local MongoDB use: mongodb://localhost:27017/referd');
    }
    
    throw error;
  }
};

/**
 * Get environment-specific configuration
 */
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig = {
    env,
    port: process.env.PORT || 5001,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    
    // File upload limits
    fileUpload: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: {
        resume: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        image: ['image/jpeg', 'image/png', 'image/webp']
      }
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: env === 'production' ? 100 : 1000 // More lenient in development
    },
    
    // CORS settings
    cors: {
      origin: env === 'production' 
        ? [process.env.CLIENT_URL] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    
    // Socket.io settings
    socket: {
      pingTimeout: 60000,
      pingInterval: 25000
    }
  };
  
  // Environment-specific configurations
  const envConfigs = {
    development: {
      ...baseConfig,
      logLevel: 'dev',
      enableCors: true,
      trustProxy: false
    },
    
    production: {
      ...baseConfig,
      logLevel: 'combined',
      enableCors: true,
      trustProxy: true,
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
      }
    },
    
    test: {
      ...baseConfig,
      mongoUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/referd_test',
      logLevel: 'none',
      enableCors: false
    }
  };
  
  return envConfigs[env] || envConfigs.development;
};

/**
 * Validate required environment variables
 */
const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  console.log('✅ Environment variables validated');
};

/**
 * Setup graceful shutdown
 */
const setupGracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('🔌 HTTP server closed');
      
      // Close database connection
      const mongoose = require('mongoose');
      mongoose.connection.close(false, () => {
        console.log('📊 MongoDB connection closed');
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⏰ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = {
  initializeServices,
  getConfig,
  validateEnv,
  setupGracefulShutdown
};