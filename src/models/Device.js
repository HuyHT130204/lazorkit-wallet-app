const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  browser: {
    type: String,
    required: true
  },
  os: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true
  },
  screen: {
    w: {
      type: Number,
      required: true
    },
    h: {
      type: Number,
      required: true
    }
  },
  language: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  location: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    }
  },
  locationAccuracy: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    path: {
      type: String,
      default: '/'
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  revoked: {
    type: Boolean,
    default: false
  },
  refreshTokenHash: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// TTL index for cleanup of old devices (optional - 30 days)
deviceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Virtual for checking if device is active (within 5 minutes)
deviceSchema.virtual('isActive').get(function() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo && !this.revoked;
});

// Ensure virtual fields are serialized
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Device', deviceSchema);
