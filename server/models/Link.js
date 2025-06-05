import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    match: /^https?:\/\/.+/
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['video', 'article', 'social', 'other'],
    default: 'other'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date
  }],
  note: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    domain: String,
    author: String,
    publishedAt: Date,
    duration: String // for videos
  }
}, {
  timestamps: true
});

// Indexes for performance
linkSchema.index({ sender: 1, createdAt: -1 });
linkSchema.index({ 'receivers.user': 1, createdAt: -1 });
linkSchema.index({ 'receivers.isRead': 1 });
linkSchema.index({ type: 1 });
linkSchema.index({ tags: 1 });

// Virtual for determining link type from URL
linkSchema.virtual('detectedType').get(function() {
  const url = this.url.toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
    return 'video';
  } else if (url.includes('twitter.com') || url.includes('instagram.com') || url.includes('facebook.com')) {
    return 'social';
  } else if (url.includes('medium.com') || url.includes('dev.to') || url.includes('blog')) {
    return 'article';
  }
  return 'other';
});

// Virtual for checking if a specific user has read the link
linkSchema.methods.isReadByUser = function(userId) {
  const receiver = this.receivers.find(r => r.user.toString() === userId.toString());
  return receiver ? receiver.isRead : false;
};

// Virtual for getting read status for a specific user
linkSchema.virtual('readStatus').get(function() {
  return this.receivers.map(receiver => ({
    userId: receiver.user,
    isRead: receiver.isRead,
    readAt: receiver.readAt
  }));
});

export default mongoose.model('Link', linkSchema);