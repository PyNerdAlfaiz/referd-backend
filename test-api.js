// test-api.js - Simple API test script
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

const testAPI = async () => {
  try {
    console.log('🧪 Testing Refer\'d API...');
    
    // Test health endpoint
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check:', health.data.status);
    
    // Test API info
    const apiInfo = await axios.get(`${API_BASE}/api`);
    console.log('✅ API info:', apiInfo.data.message);
    
    console.log('\n🎉 API is working correctly!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('   Make sure the server is running: npm run dev');
  }
};

if (require.main === module) {
  testAPI();
}

module.exports = testAPI;
