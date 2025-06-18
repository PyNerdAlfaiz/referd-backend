const { Server } = require('socket.io');

const configureSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  // Store connected users
  const connectedUsers = new Map();
  
  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.id}`);
    
    // User joins their personal room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`👤 User ${userId} joined personal room`);
    });
    
    // Company joins their room
    socket.on('join_company', (companyId) => {
      socket.join(`company_${companyId}`);
      console.log(`🏢 Company ${companyId} joined company room`);
    });
    
    // Handle real-time referral updates
    socket.on('referral_update', (data) => {
      // Notify referrer about their referral status
      io.to(`user_${data.referrerId}`).emit('referral_status_update', {
        referralId: data.referralId,
        status: data.status,
        message: data.message
      });
    });
    
    // Handle application status updates
    socket.on('application_update', (data) => {
      // Notify applicant
      io.to(`user_${data.applicantId}`).emit('application_status_update', {
        applicationId: data.applicationId,
        status: data.status,
        message: data.message
      });
      
      // Notify referrer if exists
      if (data.referrerId) {
        io.to(`user_${data.referrerId}`).emit('referral_progress_update', {
          referralId: data.referralId,
          status: data.status,
          applicantName: data.applicantName
        });
      }
    });
    
    // Handle payment notifications
    socket.on('payment_processed', (data) => {
      io.to(`user_${data.userId}`).emit('payment_notification', {
        amount: data.amount,
        status: data.status,
        referralId: data.referralId
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`👤 User disconnected: ${socket.id}`);
      
      // Remove from connected users
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });
  
  // Helper functions to emit events from controllers
  const socketHelpers = {
    notifyUser: (userId, event, data) => {
      io.to(`user_${userId}`).emit(event, data);
    },
    
    notifyCompany: (companyId, event, data) => {
      io.to(`company_${companyId}`).emit(event, data);
    },
    
    broadcast: (event, data) => {
      io.emit(event, data);
    },
    
    getConnectedUsers: () => Array.from(connectedUsers.keys()),
    
    isUserOnline: (userId) => connectedUsers.has(userId)
  };
  
  console.log('✅ Socket.io configured successfully');
  
  return { io, socketHelpers };
};

module.exports = configureSocket;