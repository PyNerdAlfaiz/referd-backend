const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  if (!process.env.EMAIL_HOST) {
    console.log('⚠️ Email not configured - set EMAIL_* environment variables');
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Test email connection
const testEmailConnection = async () => {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('✅ Email service connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Email service connection failed:', error.message);
    console.log('🔧 Check your EMAIL_* environment variables');
    return false;
  }
};

// Email templates
const emailTemplates = {
  // Welcome email for new users
  welcome: (firstName) => ({
    subject: 'Welcome to Refer\'d - Start earning with referrals!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #CDE892;">Welcome to Refer'd, ${firstName}!</h1>
        <p>You're now part of the Refer'd community where referrals redefine recruitment.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3>Your unique referral code: <strong style="color: #3E99F7;">REF-${firstName.toUpperCase()}-******</strong></h3>
          <p>Use this code to refer friends to job opportunities and earn £1000 for each successful hire!</p>
        </div>
        <p>Start exploring job opportunities and building your referral network today.</p>
        <p>Best regards,<br>The Refer'd Team</p>
      </div>
    `
  }),
  
  // Email verification
  verification: (firstName, verificationUrl) => ({
    subject: 'Verify your Refer\'d account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3E99F7;">Verify Your Email</h1>
        <p>Hi ${firstName},</p>
        <p>Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #CDE892; color: black; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `
  }),
  
  // Referral success notification
  referralSuccess: (firstName, jobTitle, amount) => ({
    subject: 'Congratulations! Your referral was hired 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #CDE892;">Congratulations ${firstName}!</h1>
        <p>Great news! Your referral for the <strong>${jobTitle}</strong> position was successful.</p>
        <div style="background: #E8F5E8; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <h2 style="color: #2E7D32; margin: 0;">You earned £${amount}!</h2>
          <p style="margin: 10px 0 0 0;">Payment will be processed within 2-3 business days.</p>
        </div>
        <p>Keep referring and keep earning!</p>
        <p>Best regards,<br>The Refer'd Team</p>
      </div>
    `
  }),
  
  // Password reset
  passwordReset: (firstName, resetUrl) => ({
    subject: 'Reset your Refer\'d password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3E99F7;">Reset Your Password</h1>
        <p>Hi ${firstName},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #E91E63; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  })
};

module.exports = {
  createTransporter,
  testEmailConnection,
  emailTemplates
};