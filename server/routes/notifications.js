import express from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// Get all notifications for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar')
      .limit(50)
      .lean();

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({ 
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a notification
router.delete('/:notificationId', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipient: req.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all notifications
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.userId });
    res.json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
