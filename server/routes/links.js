import express from 'express';
import Link from '../models/Link.js';
import User from '../models/User.js';
import auth from '../middlewares/auth.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Group from '../models/Group.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Helper function to extract metadata from URL
async function extractMetadata(url) {
  try {
    const response = await axios.get(url, { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    return {
      title: $('title').text() || $('meta[property="og:title"]').attr('content') || 'Untitled',
      description: $('meta[name="description"]').attr('content') || 
                  $('meta[property="og:description"]').attr('content') || '',
      thumbnail: $('meta[property="og:image"]').attr('content') || '',
      domain: new URL(url).hostname,
      author: $('meta[name="author"]').attr('content') || ''
    };
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return {
      title: 'Link',
      description: '',
      thumbnail: '',
      domain: '',
      author: ''
    };
  }
}

// Share link with users or groups
router.post('/share', auth, async (req, res) => {
  try {
    const { url, title, description, type, friends, groups, note, tags } = req.body;

    // Validate input
    if (!url || !title) {
      return res.status(400).json({ message: 'URL and title are required' });
    }

    // Get user data
    const user = await User.findById(req.userId).select('username avatar');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create link
    const link = new Link({
      url,
      title,
      description,
      type,
      sender: req.userId,
      note,
      tags
    });

    // Add individual receivers (friends)
    if (friends && Array.isArray(friends)) {
      link.receivers = friends.map(userId => ({
        user: userId,
        isRead: false
      }));

      // Create notifications for individual receivers
      const notifications = friends.map(userId => ({
        type: 'new_link',
        title: 'New Link Shared',
        message: `${user.username} shared a link with you: ${title}`,
        recipient: userId,
        sender: req.userId,
        link: link._id
      }));

      await Notification.insertMany(notifications);

      // Emit socket events for individual receivers
      if (req.io) {
        friends.forEach(userId => {
          req.io.to(userId.toString()).emit('notification:new', {
            type: 'new_link',
            title: 'New Link Shared',
            message: `${user.username} shared a link with you: ${title}`,
            sender: {
              _id: req.userId,
              username: user.username,
              avatar: user.avatar
            },
            link: {
              _id: link._id,
              url,
              title
            }
          });
        });
      }
    }

    // Add groups
    if (groups && Array.isArray(groups)) {
      // Verify user is member of all groups
      const userGroups = await Group.find({
        _id: { $in: groups },
        'members.user': req.userId,
        isActive: true
      }).populate('members.user', 'username');

      if (userGroups.length !== groups.length) {
        return res.status(403).json({ message: 'You must be a member of all groups' });
      }

      link.sharedWithGroups = groups.map(groupId => ({
        group: groupId
      }));

      // Add all group members as receivers and create notifications
      const groupMembers = new Set();
      const groupNotifications = [];
      
      userGroups.forEach(group => {
        group.members.forEach(member => {
          if (member.user._id.toString() !== req.userId) {
            groupMembers.add(member.user._id.toString());
            
            // Create notification for each group member
            groupNotifications.push({
              type: 'group_link',
              title: 'New Group Link',
              message: `${user.username} shared a link in ${group.name}: ${title}`,
              recipient: member.user._id,
              sender: req.userId,
              group: group._id,
              link: link._id,
              metadata: {
                groupName: group.name
              }
            });
          }
        });
      });

      // Add unique group members to receivers
      const existingReceiverIds = new Set(link.receivers.map(r => r.user.toString()));
      groupMembers.forEach(memberId => {
        if (!existingReceiverIds.has(memberId)) {
          link.receivers.push({
            user: memberId,
            isRead: false
          });
        }
      });

      // Create notifications for group members
      await Notification.insertMany(groupNotifications);

      // Emit socket events for group members
      if (req.io) {
        groupNotifications.forEach(notification => {
          req.io.to(notification.recipient.toString()).emit('notification:new', {
            ...notification,
            sender: {
              _id: req.userId,
              username: user.username,
              avatar: user.avatar
            },
            link: {
              _id: link._id,
              url,
              title
            }
          });
        });
      }
    }

    await link.save();

    // Populate sender and receiver information
    await link.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'receivers.user', select: 'username avatar' },
      { path: 'sharedWithGroups.group', select: 'name avatar' }
    ]);

    res.status(201).json({
      message: 'Link shared successfully',
      link
    });
  } catch (error) {
    console.error('Share link error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).json({ message: 'Failed to share link. Please try again.' });
  }
});

// Get links shared with user (including group shares)
router.get('/', auth, async (req, res) => {
  try {
    const { type, isArchived } = req.query;
    
    // Get user's groups
    const userGroups = await Group.find({
      'members.user': req.userId,
      isActive: true
    }).select('_id');
    
    const groupIds = userGroups.map(g => g._id);

    // Build query
    const query = {
      $or: [
        { 'receivers.user': req.userId },
        { 'sharedWithGroups.group': { $in: groupIds } }
      ]
    };

    if (type) query.type = type;
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';

    const links = await Link.find(query)
      .populate('sender', 'username avatar')
      .populate('receivers.user', 'username avatar')
      .populate('sharedWithGroups.group', 'name avatar')
      .sort('-createdAt');

    res.json({ links });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get links shared with me
router.get('/shared-with-me', auth, async (req, res) => {
  try {
    // Get user's groups
    const userGroups = await Group.find({
      'members.user': req.userId,
      isActive: true
    }).select('_id');
    
    const groupIds = userGroups.map(g => g._id);

    // Build query for links shared directly or through groups
    const query = {
      $or: [
        { 'receivers.user': req.userId },
        { 'sharedWithGroups.group': { $in: groupIds } }
      ]
    };

    const links = await Link.find(query)
      .populate('sender', 'username avatar')
      .populate('receivers.user', 'username avatar')
      .populate('sharedWithGroups.group', 'name avatar')
      .sort('-createdAt')
      .limit(10);

    res.json({ links });
  } catch (error) {
    console.error('Get shared links error:', error);
    res.status(500).json({ message: 'Failed to load shared links' });
  }
});

// Get specific link
router.get('/:linkId', auth, async (req, res) => {
  try {
    // Get user's groups
    const userGroups = await Group.find({
      'members.user': req.userId,
      isActive: true
    }).select('_id');
    
    const groupIds = userGroups.map(g => g._id);

    const link = await Link.findOne({
      _id: req.params.linkId,
      $or: [
        { 'receivers.user': req.userId },
        { 'sharedWithGroups.group': { $in: groupIds } }
      ]
    })
    .populate('sender', 'username avatar')
    .populate('receivers.user', 'username avatar')
    .populate('sharedWithGroups.group', 'name avatar');

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Mark as read if not already
    if (link.receivers.some(r => r.user._id.toString() === req.userId && !r.isRead)) {
      await Link.updateOne(
        { 
          _id: link._id,
          'receivers.user': req.userId
        },
        {
          $set: {
            'receivers.$.isRead': true,
            'receivers.$.readAt': new Date()
          }
        }
      );
    }

    res.json({ link });
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update link
router.put('/:linkId', auth, async (req, res) => {
  try {
    const link = await Link.findOne({
      _id: req.params.linkId,
      sender: req.userId
    });

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    const { title, description, type, note, tags, isArchived } = req.body;

    if (title) link.title = title;
    if (description !== undefined) link.description = description;
    if (type) link.type = type;
    if (note !== undefined) link.note = note;
    if (tags) link.tags = tags;
    if (isArchived !== undefined) link.isArchived = isArchived;

    await link.save();
    await link.populate([
      { path: 'sender', select: 'username avatar' },
      { path: 'receivers.user', select: 'username avatar' },
      { path: 'sharedWithGroups.group', select: 'name avatar' }
    ]);

    res.json({
      message: 'Link updated successfully',
      link
    });
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete link
router.delete('/:linkId', auth, async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({
      _id: req.params.linkId,
      sender: req.userId
    });

    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search links
router.get('/search', auth, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    let query = {};
    
    // Filter by type (received or sent)
    if (type === 'received') {
      query['receivers.user'] = req.userId;
    } else if (type === 'sent') {
      query.sender = req.userId;
    } else {
      // 'all' - links either received or sent
      query.$or = [
        { 'receivers.user': req.userId },
        { sender: req.userId }
      ];
    }
    
    // Search in title, url, description, note, tags
    query.$and = [{
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { url: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { note: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    }];

    const links = await Link.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'username avatar')
      .populate('receivers.user', 'username avatar')
      .lean();

    res.json({ links });
  } catch (error) {
    console.error('Search links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
