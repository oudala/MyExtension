import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const setupSocket = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId;
      
      // Update user status to online
      await User.findByIdAndUpdate(decoded.userId, {
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Send initial notification count
      const user = await User.findById(decoded.userId);
      if (user) {
        socket.emit('notification:count', user.notificationCount);
      }
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Join a room with their user ID for direct messages
    socket.join(socket.userId);
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });
    });
    
    // Notification events
    socket.on('notification:read', async (notificationId) => {
      try {
        const notification = await Notification.findById(notificationId);
        if (notification && notification.userId.toString() === socket.userId) {
          notification.isRead = true;
          await notification.save();
          
          // Update user's notification count
          await User.findByIdAndUpdate(socket.userId, {
            $inc: { notificationCount: -1 }
          });
          
          // Emit updated count to the user
          socket.emit('notification:count', await User.findById(socket.userId).select('notificationCount'));
        }
      } catch (error) {
        console.error('Error reading notification:', error);
        socket.emit('error', 'Failed to mark notification as read');
      }
    });

    socket.on('notification:markAllRead', async () => {
      try {
        await Notification.updateMany(
          { userId: socket.userId, isRead: false },
          { isRead: true }
        );
        
        await User.findByIdAndUpdate(socket.userId, {
          notificationCount: 0
        });
        
        socket.emit('notification:count', 0);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        socket.emit('error', 'Failed to mark all notifications as read');
      }
    });

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
    });
    
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
    });
  });
  
  // Make io available to the app
  return io;
};
