import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_link', 'friend_request', 'friend_accepted', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
