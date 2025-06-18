// test-database.js - Test MongoDB connection specifically
require('dotenv').config();
const mongoose = require('mongoose');

const testDatabase = async () => {
  console.log('🧪 Testing MongoDB Connection...\n');
  
  try {
    console.log('📊 MongoDB URI:', process.env.MONGODB_URI);
    console.log('🔌 Attempting connection...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Test database operations
    console.log('\n🔍 Testing database operations...');
    
    // Create a simple test schema
    const testSchema = new mongoose.Schema({
      name: String,
      testType: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('ConnectionTest', testSchema);
    
    // Test CREATE
    console.log('   📝 Testing CREATE operation...');
    const testDoc = await TestModel.create({
      name: 'Backend Setup Test',
      testType: 'connection_test'
    });
    console.log('   ✅ Document created:', testDoc.name);
    
    // Test READ
    console.log('   📖 Testing READ operation...');
    const foundDoc = await TestModel.findById(testDoc._id);
    console.log('   ✅ Document found:', foundDoc.name);
    
    // Test UPDATE
    console.log('   ✏️ Testing UPDATE operation...');
    const updatedDoc = await TestModel.findByIdAndUpdate(
      testDoc._id, 
      { name: 'Updated Test Document' }, 
      { new: true }
    );
    console.log('   ✅ Document updated:', updatedDoc.name);
    
    // Test DELETE
    console.log('   🗑️ Testing DELETE operation...');
    await TestModel.findByIdAndDelete(testDoc._id);
    console.log('   ✅ Document deleted');
    
    // Check if deletion worked
    const deletedDoc = await TestModel.findById(testDoc._id);
    if (!deletedDoc) {
      console.log('   ✅ Deletion confirmed');
    }
    
    // Test database info
    console.log('\n📊 Database Information:');
    try {
      const dbStats = await mongoose.connection.db.stats();
      console.log(`   Database Name: ${mongoose.connection.name}`);
      console.log(`   Collections: ${dbStats.collections}`);
      console.log(`   Documents: ${dbStats.objects}`);
      console.log(`   Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (statsError) {
      console.log('   ⚠️ Could not fetch database statistics');
    }
    
    console.log('\n🎉 All database tests passed!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    
    // Provide specific error help
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 SOLUTION:');
      console.log('   1. Check if MongoDB is running:');
      console.log('      sudo systemctl status mongod');
      console.log('   2. Start MongoDB if needed:');
      console.log('      sudo systemctl start mongod');
      console.log('   3. Or install MongoDB Community:');
      console.log('      https://docs.mongodb.com/manual/installation/');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n🔧 SOLUTION:');
      console.log('   Use: MONGODB_URI=mongodb://localhost:27017/referd');
      console.log('   (No username/password for local MongoDB)');
    }
    
    process.exit(1);
  }
};

// Run the test
testDatabase();