import express from 'express';
import User from '../models/User.js';
import auth from '../middlewares/auth.js';
import { upload, handleMulterError } from '../config/multer.js';
import path from 'path';
import Notification from '../models/Notification.js';

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar, preferences } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (avatar) updateData.avatar = avatar;
    if (preferences) updateData.preferences = preferences;

    // Check if username is already taken (if being updated)
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username email avatar isOnline lastSeen')
      .select('friends');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ friends: user.friends || [] });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } }, // Exclude current user
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email avatar isOnline')
    .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/friend-request', auth, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Find the user to add
    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot add yourself as friend' });
    }

    // Check if already friends
    const currentUser = await User.findById(req.userId);
    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if friend request already exists
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUser._id.toString() && req.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Add friend request
    targetUser.friendRequests.push({
      from: currentUser._id,
      status: 'pending'
    });

    await targetUser.save();

    // Create notification for friend request
    const notification = new Notification({
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${currentUser.username} wants to be your friend`,
      recipient: targetUser._id,
      sender: currentUser._id,
      metadata: {
        requestId: targetUser.friendRequests[targetUser.friendRequests.length - 1]._id
      }
    });

    await notification.save();

    // Emit socket event for real-time notification
    if (req.io) {
      req.io.to(targetUser._id.toString()).emit('notification:new', {
        ...notification.toObject(),
        sender: {
          _id: currentUser._id,
          username: currentUser.username,
          avatar: currentUser.avatar
        }
      });
    }

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friend requests
router.get('/friend-requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friendRequests.from', 'username email avatar')
      .select('friendRequests');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pendingRequests = user.friendRequests.filter(req => req.status === 'pending') || [];
    res.json({ requests: pendingRequests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Handle friend request (accept/reject)
router.put('/friend-requests/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const request = user.friendRequests.id(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    request.status = action === 'accept' ? 'accepted' : 'rejected';

    if (action === 'accept') {
      // Add each other as friends
      const fromUser = await User.findById(request.from);
      if (!fromUser) {
        return res.status(404).json({ message: 'Requesting user not found' });
      }
      
      user.friends.push(fromUser._id);
      fromUser.friends.push(user._id);
      
      await fromUser.save();

      // Emit socket event for real-time update
      if (req.io) {
        req.io.to(fromUser._id.toString()).emit('friend:request:accepted', {
          friend: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            isOnline: user.isOnline
          }
        });
      }
    }

    await user.save();

    res.json({ 
      message: `Friend request ${action}ed successfully`,
      action,
      requestId
    });
  } catch (error) {
    console.error('Handle friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend
router.delete('/friends/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Remove from both users' friend lists
    const [user, friend] = await Promise.all([
      User.findByIdAndUpdate(
        req.userId,
        { $pull: { friends: friendId } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        friendId,
        { $pull: { friends: req.userId } },
        { new: true }
      )
    ]);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    // Emit socket event for real-time update
    if (req.io) {
      req.io.to(friendId).emit('friend:removed', { userId: req.userId });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload avatar
router.post('/avatar', auth, (req, res, next) => {
  console.log('Avatar upload request received');
  console.log('Headers:', req.headers);
  
  upload.single('avatar')(req, res, async (err) => {
    console.log('Multer processing completed');
    
    if (err) {
      console.error('Multer upload error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ message: err.message || 'Error uploading file' });
    }

    try {
      console.log('File details:', req.file);
      
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Get absolute file path
      const filePath = req.file.path.replace(/\\/g, '/');
      console.log('File path:', filePath);

      // Construct URL - use relative path for storage
      const avatarPath = `/uploads/${req.file.filename}`;
      console.log('Avatar path:', avatarPath);

      // Update user's avatar in database
      const user = await User.findByIdAndUpdate(
        req.userId,
        { avatar: avatarPath },
        { new: true }
      ).select('-password');

      if (!user) {
        console.log('User not found:', req.userId);
        return res.status(404).json({ message: 'User not found' });
      }

      const fullAvatarUrl = `${req.protocol}://${req.get('host')}${avatarPath}`;
      console.log('Full avatar URL:', fullAvatarUrl);
      
      res.json({
        message: 'Avatar uploaded successfully',
        avatar: avatarPath,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: avatarPath
        }
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ 
        message: 'Server error during avatar upload',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

export default router;
