const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connected successfully');
    return true;
  } catch (error) {
    console.log('⚠️ Cloudinary not configured or connection failed');
    console.log('   Set CLOUDINARY_* environment variables for cloud storage');
    return false;
  }
};

// Cloudinary storage for different file types
const createCloudinaryStorage = (folder, allowedFormats) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `referd/${folder}`,
      allowed_formats: allowedFormats,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' }
      ],
    },
  });
};

// Local storage fallback
const createLocalStorage = (folder) => {
  const path = require('path');
  const fs = require('fs');
  
  const uploadPath = path.join(__dirname, '..', 'uploads', folder);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
};

// File filter for different types
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
    }
  };
};

// Export configurations
module.exports = {
  cloudinary,
  testCloudinaryConnection,
  
  // Resume upload configuration
  resumeUpload: async () => {
    const isCloudinaryConnected = await testCloudinaryConnection();
    
    return multer({
      storage: isCloudinaryConnected 
        ? createCloudinaryStorage('resumes', ['pdf', 'doc', 'docx'])
        : createLocalStorage('resumes'),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: createFileFilter([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ])
    });
  },
  
  // Logo upload configuration
  logoUpload: async () => {
    const isCloudinaryConnected = await testCloudinaryConnection();
    
    return multer({
      storage: isCloudinaryConnected 
        ? createCloudinaryStorage('logos', ['jpg', 'jpeg', 'png', 'webp'])
        : createLocalStorage('logos'),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
      },
      fileFilter: createFileFilter([
        'image/jpeg',
        'image/png',
        'image/webp'
      ])
    });
  },
  
  // Profile image upload
  profileUpload: async () => {
    const isCloudinaryConnected = await testCloudinaryConnection();
    
    return multer({
      storage: isCloudinaryConnected 
        ? createCloudinaryStorage('profiles', ['jpg', 'jpeg', 'png', 'webp'])
        : createLocalStorage('profiles'),
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB limit
      },
      fileFilter: createFileFilter([
        'image/jpeg',
        'image/png',
        'image/webp'
      ])
    });
  }
};