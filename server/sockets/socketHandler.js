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

    // Send initial friend data
    try {
      const user = await User.findById(socket.userId)
        .populate('friends', 'username email avatar isOnline lastSeen')
        .populate('friendRequests.from', 'username email avatar')
        .select('friends friendRequests');

      // Send friends list
      socket.emit('friends:list', user.friends);

      // Send pending friend requests
      const pendingRequests = user.friendRequests.filter(req => req.status === 'pending');
      socket.emit('friends:requests', pendingRequests);
    } catch (error) {
      console.error('Error sending initial friend data:', error);
    }
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Notify friends about offline status
      const user = await User.findById(socket.userId);
      if (user && user.friends.length > 0) {
        user.friends.forEach(friendId => {
          io.to(friendId.toString()).emit('friend:status', {
            userId: socket.userId,
            isOnline: false,
            lastSeen: new Date()
          });
        });
      }
    });

    // Friend request events
    socket.on('friend:request', async ({ targetUsername }) => {
      try {
        const targetUser = await User.findOne({ username: targetUsername });
        if (!targetUser) {
          return socket.emit('friend:request:error', 'User not found');
        }

        const currentUser = await User.findById(socket.userId);
        
        // Check if already friends
        if (currentUser.friends.includes(targetUser._id)) {
          return socket.emit('friend:request:error', 'Already friends with this user');
        }

        // Check if request already exists
        const existingRequest = targetUser.friendRequests.find(
          req => req.from.toString() === socket.userId && req.status === 'pending'
        );

        if (existingRequest) {
          return socket.emit('friend:request:error', 'Friend request already sent');
        }

        // Add friend request
        targetUser.friendRequests.push({
          from: socket.userId,
          status: 'pending'
        });
        await targetUser.save();

        // Notify target user
        io.to(targetUser._id.toString()).emit('friend:request:received', {
          from: {
            _id: currentUser._id,
            username: currentUser.username,
            avatar: currentUser.avatar
          }
        });

        socket.emit('friend:request:sent', { message: 'Friend request sent successfully' });
      } catch (error) {
        console.error('Friend request error:', error);
        socket.emit('friend:request:error', 'Failed to send friend request');
      }
    });

    socket.on('friend:request:respond', async ({ requestId, action }) => {
      try {
        const user = await User.findById(socket.userId);
        const request = user.friendRequests.id(requestId);

        if (!request || request.status !== 'pending') {
          return socket.emit('friend:request:error', 'Friend request not found');
        }

        request.status = action === 'accept' ? 'accepted' : 'rejected';

        if (action === 'accept') {
          const fromUser = await User.findById(request.from);
          
          // Add each other as friends
          user.friends.push(fromUser._id);
          fromUser.friends.push(user._id);
          
          await fromUser.save();

          // Notify both users
          socket.emit('friend:added', {
            friend: {
              _id: fromUser._id,
              username: fromUser.username,
              avatar: fromUser.avatar,
              isOnline: fromUser.isOnline,
              lastSeen: fromUser.lastSeen
            }
          });

          io.to(fromUser._id.toString()).emit('friend:added', {
            friend: {
              _id: user._id,
              username: user.username,
              avatar: user.avatar,
              isOnline: user.isOnline,
              lastSeen: user.lastSeen
            }
          });
        }

        await user.save();
        socket.emit('friend:request:updated', { requestId, action });
      } catch (error) {
        console.error('Friend request response error:', error);
        socket.emit('friend:request:error', 'Failed to process friend request');
      }
    });

    // Friend status events
    socket.on('friend:status:check', async () => {
      try {
        const user = await User.findById(socket.userId)
          .populate('friends', 'isOnline lastSeen');
        
        const friendStatuses = user.friends.map(friend => ({
          userId: friend._id,
          isOnline: friend.isOnline,
          lastSeen: friend.lastSeen
        }));

        socket.emit('friend:status:bulk', friendStatuses);
      } catch (error) {
        console.error('Friend status check error:', error);
      }
    });

    // Notification events
    socket.on('notification:read', async (notificationId) => {
      try {
        const notification = await Notification.findById(notificationId);
        if (notification && notification.recipient.toString() === socket.userId) {
          notification.isRead = true;
          await notification.save();
        }
      } catch (error) {
        console.error('Error reading notification:', error);
        socket.emit('error', 'Failed to mark notification as read');
      }
    });

    socket.on('notification:markAllRead', async () => {
      try {
        await Notification.updateMany(
          { recipient: socket.userId, isRead: false },
          { isRead: true }
        );
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
  
  return io;
};
