// setup.js - Quick setup script for development

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Refer\'d Backend Development Environment...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  console.error('   Please upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if MongoDB is running
try {
  execSync('mongosh --eval "db.runCommand({ping: 1})" --quiet', { stdio: 'ignore' });
  console.log('✅ MongoDB is running');
} catch (error) {
  console.log('⚠️ MongoDB might not be running');
  console.log('   Start MongoDB: sudo systemctl start mongod');
  console.log('   Or install MongoDB: https://docs.mongodb.com/manual/installation/');
}

// Create necessary directories
const directories = [
  'uploads',
  'uploads/resumes',
  'uploads/logos',
  'uploads/profiles',
  'logs'
];

console.log('\n📁 Creating directories...');
directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   Created: ${dir}/`);
  } else {
    console.log(`   Exists: ${dir}/`);
  }
});

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n⚠️ .env file not found');
  console.log('   Please create .env file with the template provided');
  console.log('   Copy the template and update the values for your setup');
} else {
  console.log('\n✅ .env file found');
  
  // Basic validation of .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(v => !envContent.includes(`${v}=`));
  
  if (missingVars.length > 0) {
    console.log(`⚠️ Missing required variables in .env: ${missingVars.join(', ')}`);
  } else {
    console.log('✅ Required environment variables found');
  }
}

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.log('\n📦 Creating package.json...');
  
  const packageJson = {
    "name": "referd-backend",
    "version": "1.0.0",
    "description": "Backend for Refer'd platform - Referrals that redefine recruitment",
    "main": "server.js",
    "scripts": {
      "start": "node server.js",
      "dev": "nodemon server.js",
      "test": "jest",
      "setup": "node setup.js",
      "seed": "node scripts/seedDatabase.js"
    },
    "keywords": ["referrals", "jobs", "recruitment", "nodejs", "mongodb"],
    "author": "Your Name",
    "license": "MIT",
    "dependencies": {
      "express": "^4.18.2",
      "mongoose": "^8.0.0",
      "bcryptjs": "^2.4.3",
      "jsonwebtoken": "^9.0.2",
      "cors": "^2.8.5",
      "dotenv": "^16.3.1",
      "multer": "^1.4.5",
      "multer-storage-cloudinary": "^4.0.0",
      "cloudinary": "^1.41.0",
      "stripe": "^14.0.0",
      "nodemailer": "^6.9.7",
      "socket.io": "^4.7.4",
      "helmet": "^7.1.0",
      "express-rate-limit": "^7.1.5",
      "joi": "^17.11.0",
      "compression": "^1.7.4",
      "morgan": "^1.10.0",
      "redis": "^4.6.0"
    },
    "devDependencies": {
      "nodemon": "^3.0.1",
      "jest": "^29.7.0",
      "supertest": "^6.3.3"
    },
    "engines": {
      "node": ">=16.0.0"
    }
  };
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json created');
} else {
  console.log('\n✅ package.json found');
}

// Installation instructions
console.log('\n' + '='.repeat(60));
console.log('🎉 SETUP COMPLETE! Next Steps:');
console.log('='.repeat(60));
console.log('');
console.log('1. Install dependencies:');
console.log('   npm install');
console.log('');
console.log('2. Create/update your .env file with:');
console.log('   MONGODB_URI=mongodb://localhost:27017/referd');
console.log('   JWT_SECRET=your_32_character_secret_key_here');
console.log('');
console.log('3. Start development server:');
console.log('   npm run dev');
console.log('');
console.log('4. Test the API:');
console.log('   curl http://localhost:5000/health');
console.log('');
console.log('5. Optional services to configure later:');
console.log('   - Stripe (for payments): Set STRIPE_SECRET_KEY');
console.log('   - Email (for notifications): Set EMAIL_* variables');
console.log('   - Cloudinary (for file storage): Set CLOUDINARY_* variables');
console.log('');
console.log('📚 API Documentation: http://localhost:5000/api');
console.log('🏥 Health Check: http://localhost:5000/health');
console.log('');
console.log('Happy coding! 🚀');
console.log('');

// Create a simple test script
const testScript = `// test-api.js - Simple API test script
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

const testAPI = async () => {
  try {
    console.log('🧪 Testing Refer\\'d API...');
    
    // Test health endpoint
    const health = await axios.get(\`\${API_BASE}/health\`);
    console.log('✅ Health check:', health.data.status);
    
    // Test API info
    const apiInfo = await axios.get(\`\${API_BASE}/api\`);
    console.log('✅ API info:', apiInfo.data.message);
    
    console.log('\\n🎉 API is working correctly!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('   Make sure the server is running: npm run dev');
  }
};

if (require.main === module) {
  testAPI();
}

module.exports = testAPI;
`;

fs.writeFileSync(path.join(__dirname, 'test-api.js'), testScript);
console.log('📝 Created test-api.js for API testing');
console.log('   Run: node test-api.js (after starting the server)');
console.log('');