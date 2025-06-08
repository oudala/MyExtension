import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import auth from '../middlewares/auth.js';
import { upload } from '../config/multer.js';

const router = express.Router();

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Create group
    const group = new Group({
      name,
      description,
      creator: req.userId,
      members: [{ user: req.userId, role: 'admin' }]
    });

    // If no avatar provided, we'll generate one based on the name in the frontend
    if (req.body.avatar) {
      group.avatar = req.body.avatar;
    }

    await group.save();

    // Populate creator and members info
    await group.populate('creator members.user', 'username avatar');

    res.status(201).json({ 
      message: 'Group created successfully',
      group 
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's groups
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.userId,
      isActive: true
    })
    .populate('creator members.user', 'username avatar')
    .sort('-lastActivity');

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific group
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.user': req.userId,
      isActive: true
    }).populate('creator members.user', 'username avatar');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add members to group
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.user': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.isAdmin(req.userId)) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Validate userIds
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Invalid user IDs' });
    }

    // Filter out existing members and add new ones
    const existingMemberIds = group.members.map(m => m.user.toString());
    const newMembers = userIds.filter(id => !existingMemberIds.includes(id))
      .map(userId => ({
        user: userId,
        role: 'member'
      }));

    if (newMembers.length > 0) {
      group.members.push(...newMembers);
      group.lastActivity = new Date();
      await group.save();
      await group.populate('members.user', 'username avatar');
    }

    res.json({ 
      message: 'Members added successfully',
      group 
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.user': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin or removing themselves
    if (!group.isAdmin(req.userId) && req.userId !== req.params.userId) {
      return res.status(403).json({ message: 'Unauthorized to remove members' });
    }

    // Cannot remove the last admin
    const adminCount = group.members.filter(m => m.role === 'admin').length;
    const targetMember = group.members.find(m => m.user.toString() === req.params.userId);
    
    if (targetMember?.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last admin' });
    }

    group.members = group.members.filter(member => 
      member.user.toString() !== req.params.userId
    );

    group.lastActivity = new Date();
    await group.save();
    await group.populate('members.user', 'username avatar');

    res.json({ 
      message: 'Member removed successfully',
      group 
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group
router.put('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId,
      'members.user': req.userId
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.isAdmin(req.userId)) {
      return res.status(403).json({ message: 'Only admins can update group' });
    }

    const { name, description, avatar } = req.body;
    
    if (name) group.name = name;
    if (description) group.description = description;
    if (avatar) group.avatar = avatar;

    group.lastActivity = new Date();
    await group.save();
    await group.populate('members.user', 'username avatar');

    res.json({ 
      message: 'Group updated successfully',
      group 
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 