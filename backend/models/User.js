const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address'
    }
  },
  profileName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    validate: {
      validator: function(v) {
        return !v || /\S+@\S+\.\S+/.test(v);
      },
      message: 'Invalid email address'
    }
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  votingHistory: [{
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true
    },
    transactionHash: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{64}$/.test(v);
        },
        message: 'Invalid transaction hash'
      }
    },
    candidateId: {
      type: Number,
      required: true,
      min: 1
    },
    candidateName: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    blockNumber: {
      type: Number,
      min: 0
    },
    gasUsed: {
      type: Number,
      min: 0
    }
  }],
  profile: {
    bio: { 
      type: String, 
      maxlength: 500 
    },
    avatar: { 
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|svg)$/i.test(v);
        },
        message: 'Invalid avatar URL'
      }
    },
    location: { 
      type: String, 
      maxlength: 100 
    },
    website: { 
      type: String, 
      maxlength: 200,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid website URL'
      }
    },
    socialLinks: {
      twitter: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^https?:\/\/(www\.)?twitter\.com\//.test(v);
          },
          message: 'Invalid Twitter URL'
        }
      },
      linkedin: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^https?:\/\/(www\.)?linkedin\.com\//.test(v);
          },
          message: 'Invalid LinkedIn URL'
        }
      },
      github: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^https?:\/\/(www\.)?github\.com\//.test(v);
          },
          message: 'Invalid GitHub URL'
        }
      }
    },
    interests: [{
      type: String,
      trim: true,
      maxlength: 50
    }]
  },
  preferences: {
    notifications: {
      email: { 
        type: Boolean, 
        default: true 
      },
      browser: { 
        type: Boolean, 
        default: true 
      },
      newElections: { 
        type: Boolean, 
        default: true 
      },
      electionReminders: { 
        type: Boolean, 
        default: true 
      },
      results: { 
        type: Boolean, 
        default: true 
      }
    },
    privacy: {
      showVotingHistory: { 
        type: Boolean, 
        default: false 
      },
      showProfile: { 
        type: Boolean, 
        default: true 
      },
      showActivity: { 
        type: Boolean, 
        default: true 
      }
    },
    display: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'dark'
      },
      language: {
        type: String,
        default: 'en',
        maxlength: 5
      }
    }
  },
  stats: {
    electionsVoted: { 
      type: Number, 
      default: 0,
      min: 0
    },
    electionsCreated: { 
      type: Number, 
      default: 0,
      min: 0
    },
    totalGasSpent: { 
      type: String, 
      default: '0' 
    },
    averageGasPerVote: { 
      type: String, 
      default: '0' 
    },
    firstVoteDate: Date,
    lastVoteDate: Date
  },
  security: {
    lastLogin: Date,
    loginCount: { 
      type: Number, 
      default: 0,
      min: 0
    },
    suspiciousActivity: [{
      type: {
        type: String,
        enum: ['multiple_votes', 'suspicious_timing', 'gas_anomaly']
      },
      description: String,
      timestamp: { 
        type: Date, 
        default: Date.now 
      },
      resolved: { 
        type: Boolean, 
        default: false 
      }
    }],
    isSuspended: { 
      type: Boolean, 
      default: false 
    },
    suspensionReason: String,
    suspensionDate: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      delete ret.security;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ walletAddress: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ isAdmin: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ 'votingHistory.electionId': 1 });
userSchema.index({ 'stats.electionsVoted': -1 });
userSchema.index({ createdAt: -1 });

// Virtual fields
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

userSchema.virtual('displayName').get(function() {
  if (this.profileName) return this.profileName;
  return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
});

userSchema.virtual('votingHistoryCount').get(function() {
  return this.votingHistory.length;
});

userSchema.virtual('isActive').get(function() {
  return !this.security.isSuspended;
});

userSchema.virtual('membershipDuration').get(function() {
  return Date.now() - this.createdAt.getTime();
});

userSchema.virtual('reputation').get(function() {
  // Simple reputation calculation based on activity
  let score = 0;
  score += this.stats.electionsVoted * 10;
  score += this.stats.electionsCreated * 25;
  score += this.isVerified ? 50 : 0;
  score += this.profileName ? 20 : 0;
  
  // Penalty for suspicious activity
  score -= this.security.suspiciousActivity.filter(a => !a.resolved).length * 10;
  
  return Math.max(0, score);
});

// Methods
userSchema.methods.addVote = function(electionId, candidateId, candidateName, transactionHash, blockNumber, gasUsed) {
  const voteRecord = {
    electionId,
    candidateId,
    candidateName,
    transactionHash,
    blockNumber,
    gasUsed,
    timestamp: new Date()
  };
  
  this.votingHistory.push(voteRecord);
  this.stats.electionsVoted += 1;
  
  // Update gas statistics
  if (gasUsed) {
    const currentTotal = BigInt(this.stats.totalGasSpent || '0');
    const newTotal = currentTotal + BigInt(gasUsed);
    this.stats.totalGasSpent = newTotal.toString();
    
    const avgGas = newTotal / BigInt(this.stats.electionsVoted);
    this.stats.averageGasPerVote = avgGas.toString();
  }
  
  // Update vote dates
  if (!this.stats.firstVoteDate) {
    this.stats.firstVoteDate = new Date();
  }
  this.stats.lastVoteDate = new Date();
  
  return this.save();
};

userSchema.methods.hasVotedInElection = function(electionId) {
  return this.votingHistory.some(vote => 
    vote.electionId.toString() === electionId.toString()
  );
};

userSchema.methods.getVoteInElection = function(electionId) {
  return this.votingHistory.find(vote => 
    vote.electionId.toString() === electionId.toString()
  );
};

userSchema.methods.updateProfile = function(profileData) {
  Object.keys(profileData).forEach(key => {
    if (this.profile[key] !== undefined) {
      this.profile[key] = profileData[key];
    }
  });
  return this.save();
};

userSchema.methods.updatePreferences = function(preferences) {
  Object.keys(preferences).forEach(category => {
    if (this.preferences[category]) {
      Object.keys(preferences[category]).forEach(key => {
        if (this.preferences[category][key] !== undefined) {
          this.preferences[category][key] = preferences[category][key];
        }
      });
    }
  });
  return this.save();
};

userSchema.methods.recordLogin = function() {
  this.security.lastLogin = new Date();
  this.security.loginCount += 1;
  return this.save();
};

userSchema.methods.flagSuspiciousActivity = function(type, description) {
  this.security.suspiciousActivity.push({
    type,
    description,
    timestamp: new Date()
  });
  return this.save();
};

userSchema.methods.suspend = function(reason) {
  this.security.isSuspended = true;
  this.security.suspensionReason = reason;
  this.security.suspensionDate = new Date();
  return this.save();
};

userSchema.methods.unsuspend = function() {
  this.security.isSuspended = false;
  this.security.suspensionReason = undefined;
  this.security.suspensionDate = undefined;
  return this.save();
};

// Static methods
userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

userSchema.statics.getAdmins = function() {
  return this.find({ isAdmin: true }).sort({ createdAt: -1 });
};

userSchema.statics.getTopVoters = function(limit = 10) {
  return this.find({ 'stats.electionsVoted': { $gt: 0 } })
    .sort({ 'stats.electionsVoted': -1 })
    .limit(limit)
    .select('walletAddress profileName stats.electionsVoted');
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        verifiedUsers: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        activeUsers: {
          $sum: { $cond: ['$security.isSuspended', 0, 1] }
        },
        totalVotesCast: { $sum: '$stats.electionsVoted' },
        totalElectionsCreated: { $sum: '$stats.electionsCreated' },
        avgVotesPerUser: { $avg: '$stats.electionsVoted' }
      }
    }
  ]);
};

userSchema.statics.searchUsers = function(query, limit = 10) {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { profileName: searchRegex },
      { walletAddress: searchRegex },
      { email: searchRegex }
    ]
  })
  .limit(limit)
  .select('walletAddress profileName stats isVerified');
};

module.exports = mongoose.model('User', userSchema);
