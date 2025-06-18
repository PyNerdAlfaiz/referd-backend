// test-mongodb.js - Simple MongoDB connection test
const mongoose = require('mongoose');
require('dotenv').config();

const testMongoDB = async () => {
  try {
    console.log('🧪 Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    // Try to connect with simple options
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      bufferCommands: false,
      maxPoolSize: 10
    };
    
    console.log('🔌 Attempting to connect...');
    const connection = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('Host:', connection.connection.host);
    console.log('Port:', connection.connection.port);
    console.log('Database:', connection.connection.name);
    
    // Test a simple database operation
    console.log('🧪 Testing database operations...');
    
    // Create a simple test collection
    const TestCollection = mongoose.model('Test', new mongoose.Schema({
      name: String,
      timestamp: { type: Date, default: Date.now }
    }));
    
    // Insert a test document
    const testDoc = await TestCollection.create({
      name: 'Connection Test',
      timestamp: new Date()
    });
    
    console.log('✅ Test document created:', testDoc._id);
    
    // Count documents
    const count = await TestCollection.countDocuments();
    console.log('✅ Document count:', count);
    
    // Clean up test document
    await TestCollection.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');
    
    console.log('🎉 MongoDB is working perfectly!');
    
    await mongoose.connection.close();
    console.log('📴 Connection closed');
    
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error('Error:', error.message);
    console.error('Error Type:', error.name);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if MongoDB service is running in services.msc');
      console.log('2. Try restarting MongoDB service');
      console.log('3. Check if port 27017 is available');
    }
    
    if (error.message.includes('timeout')) {
      console.log('\n🔧 Connection timeout:');
      console.log('1. MongoDB might be starting up');
      console.log('2. Try again in a few seconds');
      console.log('3. Check Windows Firewall settings');
    }
  }
};

// Run the test
testMongoDB();