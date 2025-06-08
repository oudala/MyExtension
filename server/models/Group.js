import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: '' // Will be populated with default avatar based on group name if not provided
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
groupSchema.index({ name: 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });
// Compound index to prevent duplicate group names for the same creator
groupSchema.index({ name: 1, creator: 1 }, { unique: true });

// Pre-save middleware to ensure creator is also a member with admin role
groupSchema.pre('save', function(next) {
  if (this.isNew) {
    const creatorMember = this.members.find(member => 
      member.user.toString() === this.creator.toString()
    );
    
    if (!creatorMember) {
      this.members.push({
        user: this.creator,
        role: 'admin',
        joinedAt: new Date()
      });
    }
  }
  next();
});

// Method to check if a user is a member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to check if a user is an admin
groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member && member.role === 'admin';
};

export default mongoose.model('Group', groupSchema); 