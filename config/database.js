// config/database.js - Simple working MongoDB connection for Windows
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    // Simple connection options that work with all MongoDB versions
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      maxPoolSize: 10, // Maximum number of connections
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`📍 Port: ${conn.connection.port}`);
    
    // Test the connection immediately
    console.log('🧪 Testing database connection...');
    const admin = conn.connection.db.admin();
    const ping = await admin.ping();
    console.log('✅ Database ping successful:', ping);
    
    // Log connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📴 MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.log('🔧 MongoDB is not running. Please start MongoDB:');
      console.log('   Check services.msc and start MongoDB service');
    }
    
    if (error.message.includes('authentication failed')) {
      console.log('🔧 Check your MongoDB username and password in MONGODB_URI');
    }
    
    if (error.message.includes('network timeout')) {
      console.log('🔧 Check your internet connection and MongoDB URI');
    }
    
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const User = require('../models/User');
    console.log('🧪 Testing User model...');
    
    const userCount = await User.countDocuments();
    console.log(`✅ Database test successful. Users count: ${userCount}`);
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
};

// Export both named and default
module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.testConnection = testConnection;