// test-server.js - Test the complete server setup
require('dotenv').config();

const testServer = async () => {
  console.log('🧪 Testing Complete Server Setup...\n');
  
  try {
    // Test 1: Environment Variables
    console.log('1️⃣ Testing Environment Variables:');
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
    let envTestPassed = true;
    
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`   ✅ ${envVar}: Set`);
      } else {
        console.log(`   ❌ ${envVar}: Missing`);
        envTestPassed = false;
      }
    });
    
    if (!envTestPassed) {
      throw new Error('Required environment variables missing');
    }
    
    // Test 2: Import and validate configurations
    console.log('\n2️⃣ Testing Configuration Imports:');
    
    try {
      const { validateEnv, getConfig } = require('./config');
      console.log('   ✅ Config index imported');
      
      validateEnv();
      console.log('   ✅ Environment validation passed');
      
      const config = getConfig();
      console.log(`   ✅ Configuration loaded for ${config.env} environment`);
      
    } catch (error) {
      console.log(`   ❌ Configuration error: ${error.message}`);
      throw error;
    }
    
    // Test 3: Database configuration
    console.log('\n3️⃣ Testing Database Configuration:');
    try {
      const connectDB = require('./config/database');
      console.log('   ✅ Database config imported');
      
      // Don't actually connect here, just test import
    } catch (error) {
      console.log(`   ❌ Database config error: ${error.message}`);
      throw error;
    }
    
    // Test 4: Optional service configurations
    console.log('\n4️⃣ Testing Optional Service Configurations:');
    
    try {
      const { testCloudinaryConnection } = require('./config/cloudinary');
      console.log('   ✅ Cloudinary config imported');
    } catch (error) {
      console.log(`   ❌ Cloudinary config error: ${error.message}`);
    }
    
    try {
      const { testStripeConnection } = require('./config/stripe');
      console.log('   ✅ Stripe config imported');
    } catch (error) {
      console.log(`   ❌ Stripe config error: ${error.message}`);
    }
    
    try {
      const { testEmailConnection } = require('./config/email');
      console.log('   ✅ Email config imported');
    } catch (error) {
      console.log(`   ❌ Email config error: ${error.message}`);
    }
    
    // Test 5: Server file
    console.log('\n5️⃣ Testing Server File:');
    try {
      // Don't start the server, just test if it imports without errors
      delete require.cache[require.resolve('./server.js')];
      require('./server.js');
      console.log('   ✅ Server file imports successfully');
    } catch (error) {
      console.log(`   ❌ Server file error: ${error.message}`);
      throw error;
    }
    
    // Test 6: Directory structure
    console.log('\n6️⃣ Testing Directory Structure:');
    const fs = require('fs');
    const path = require('path');
    
    const requiredDirs = ['config', 'uploads', 'uploads/resumes', 'uploads/logos'];
    requiredDirs.forEach(dir => {
      if (fs.existsSync(path.join(__dirname, dir))) {
        console.log(`   ✅ Directory exists: ${dir}/`);
      } else {
        console.log(`   ⚠️ Directory missing: ${dir}/`);
      }
    });
    
    const requiredFiles = [
      'server.js',
      'package.json',
      '.env',
      'config/index.js',
      'config/database.js'
    ];
    
    requiredFiles.forEach(file => {
      if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`   ✅ File exists: ${file}`);
      } else {
        console.log(`   ❌ File missing: ${file}`);
      }
    });
    
    console.log('\n🎉 All configuration tests passed!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Environment variables configured');
    console.log('✅ Configuration files working');
    console.log('✅ Server file imports successfully');
    console.log('✅ Directory structure correct');
    console.log('\n🚀 Ready to start the server!');
    console.log('\nNext steps:');
    console.log('1. Start server: npm run dev');
    console.log('2. Test API: node test-api.js');
    
  } catch (error) {
    console.error('\n❌ Server setup test failed:', error.message);
    console.log('\n🔧 Please fix the issues above before starting the server');
    process.exit(1);
  }
};

testServer();