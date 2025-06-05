import express from 'express';
import Link from '../models/Link.js';
import User from '../models/User.js';
import auth from '../middlewares/auth.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

// Share a link
router.post('/share', auth, async (req, res) => {
  try {
    const { url, title, friends, note, tags } = req.body;

    if (!url || !friends || friends.length === 0) {
      return res.status(400).json({ message: 'URL and at least one friend are required' });
    }

    // Extract metadata if no title provided
    let metadata = { title: title || 'Shared Link' };
    if (!title) {
      metadata = await extractMetadata(url);
    }

    // Create link document
    const link = new Link({
      url,
      title: title || metadata.title,
      description: metadata.description,
      thumbnail: metadata.thumbnail,
      domain: metadata.domain || new URL(url).hostname,
      sender: req.userId,
      receivers: friends.map(friendId => ({ user: friendId })),
      note: note || '',
      tags: tags || []
    });

    await link.save();

    // Get sender info for notifications
    const sender = await User.findById(req.userId).select('username avatar');

    // Send notifications via socket
    const io = req.io;
    if (io) {
      friends.forEach(friendId => {
        io.to(friendId.toString()).emit('new_link', {
          _id: link._id,
          url: link.url,
          title: link.title,
          sender: {
            _id: sender._id,
            username: sender.username,
            avatar: sender.avatar
          },
          createdAt: link.createdAt
        });
      });
    }

    res.status(201).json({ 
      message: 'Link shared successfully',
      link
    });
  } catch (error) {
    console.error('Share link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get links shared with me
router.get('/shared-with-me', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const links = await Link.find({ 'receivers.user': req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .lean();

    const total = await Link.countDocuments({ 'receivers.user': req.userId });

    res.json({
      links,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get links I've shared
router.get('/my-shares', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const links = await Link.find({ sender: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('receivers.user', 'username avatar')
      .lean();

    const total = await Link.countDocuments({ sender: req.userId });

    res.json({
      links,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get my shares error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark link as read
router.put('/:linkId/read', auth, async (req, res) => {
  try {
    const { linkId } = req.params;

    const link = await Link.findOneAndUpdate(
      { 
        _id: linkId,
        'receivers.user': req.userId,
        'receivers.read': false
      },
      {
        $set: { 'receivers.$.read': true, 'receivers.$.readAt': new Date() }
      },
      { new: true }
    );

    if (!link) {
      return res.status(404).json({ message: 'Link not found or already read' });
    }

    res.json({ message: 'Link marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a link (only sender can delete)
router.delete('/:linkId', auth, async (req, res) => {
  try {
    const { linkId } = req.params;

    const link = await Link.findOneAndDelete({
      _id: linkId,
      sender: req.userId
    });

    if (!link) {
      return res.status(404).json({ message: 'Link not found or you are not the sender' });
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
