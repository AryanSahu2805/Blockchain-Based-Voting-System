const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    required: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: 500
  },
  imageUrl: { 
    type: String, 
    trim: true 
  },
  voteCount: { 
    type: Number, 
    default: 0,
    min: 0
  }
}, { _id: false });

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  contractAddress: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address'
    }
  },
  candidates: {
    type: [candidateSchema],
    validate: {
      validator: function(v) {
        return v && v.length >= 2;
      },
      message: 'At least 2 candidates are required'
    }
  },
  startDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Start date must be in the future'
    }
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  createdBy: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address'
    }
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'ended'],
    default: function() {
      const now = new Date();
      if (now < this.startDate) return 'upcoming';
      if (now <= this.endDate) return 'active';
      return 'ended';
    }
  },
  totalVotes: { 
    type: Number, 
    default: 0,
    min: 0
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  chainId: { 
    type: Number, 
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
  blockNumber: { 
    type: Number, 
    required: true,
    min: 0
  },
  metadata: {
    category: { 
      type: String, 
      trim: true,
      maxlength: 50
    },
    tags: [{ 
      type: String, 
      trim: true,
      maxlength: 30
    }],
    isPublic: { 
      type: Boolean, 
      default: true 
    },
    maxVoters: { 
      type: Number,
      min: 1
    },
    requiresRegistration: { 
      type: Boolean, 
      default: false 
    },
    votingMethod: {
      type: String,
      enum: ['simple', 'ranked', 'approval'],
      default: 'simple'
    }
  },
  statistics: {
    uniqueVoters: { 
      type: Number, 
      default: 0,
      min: 0
    },
    gasUsed: { 
      type: String, 
      default: '0' 
    },
    averageGasPerVote: { 
      type: String, 
      default: '0' 
    }
  },
  
  // IPFS Storage
  ipfsHash: String,
  ipfsUrl: String,
  ipfsMetadata: {
    hash: String,
    url: String,
    uploadedAt: Date,
    verified: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better query performance
electionSchema.index({ status: 1, startDate: -1 });
electionSchema.index({ createdBy: 1, createdAt: -1 });
electionSchema.index({ contractAddress: 1 });
electionSchema.index({ 'metadata.category': 1 });
electionSchema.index({ 'metadata.tags': 1 });
electionSchema.index({ startDate: 1, endDate: 1 });

// Virtual fields
electionSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

electionSchema.virtual('isUpcoming').get(function() {
  return new Date() < this.startDate;
});

electionSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
});

electionSchema.virtual('isEnded').get(function() {
  return new Date() > this.endDate;
});

electionSchema.virtual('duration').get(function() {
  return this.endDate - this.startDate;
});

electionSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (now > this.endDate) return 0;
  if (now < this.startDate) return this.startDate - now;
  return this.endDate - now;
});

electionSchema.virtual('participationRate').get(function() {
  if (!this.metadata.maxVoters || this.metadata.maxVoters === 0) return null;
  return ((this.totalVotes / this.metadata.maxVoters) * 100).toFixed(2);
});

// Middleware - Update status before saving
electionSchema.pre('save', function(next) {
  const now = new Date();
  
  if (now < this.startDate) {
    this.status = 'upcoming';
  } else if (now <= this.endDate) {
    this.status = 'active';
  } else {
    this.status = 'ended';
  }
  
  next();
});

// Middleware - Update statistics
electionSchema.pre('save', function(next) {
  // Calculate total votes from candidates
  const totalFromCandidates = this.candidates.reduce((sum, candidate) => {
    return sum + (candidate.voteCount || 0);
  }, 0);
  
  // Update total votes if different
  if (totalFromCandidates !== this.totalVotes) {
    this.totalVotes = totalFromCandidates;
  }
  
  next();
});

// Static methods
electionSchema.statics.getActiveElections = function(limit = 10, page = 1) {
  const skip = (page - 1) * limit;
  return this.find({ 
    status: 'active', 
    isActive: true 
  })
  .sort({ startDate: -1 })
  .limit(limit)
  .skip(skip);
};

electionSchema.statics.getUpcomingElections = function(limit = 10, page = 1) {
  const skip = (page - 1) * limit;
  return this.find({ 
    status: 'upcoming', 
    isActive: true 
  })
  .sort({ startDate: 1 })
  .limit(limit)
  .skip(skip);
};

electionSchema.statics.getElectionsByCreator = function(creatorAddress, limit = 10, page = 1) {
  const skip = (page - 1) * limit;
  return this.find({ 
    createdBy: creatorAddress.toLowerCase(),
    isActive: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

electionSchema.statics.searchElections = function(query, limit = 10, page = 1) {
  const skip = (page - 1) * limit;
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { 'metadata.category': searchRegex },
          { 'metadata.tags': { $in: [searchRegex] } }
        ]
      }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

electionSchema.statics.getElectionStats = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalElections: { $sum: 1 },
        activeElections: {
          $sum: {
            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
          }
        },
        upcomingElections: {
          $sum: {
            $cond: [{ $eq: ['$status', 'upcoming'] }, 1, 0]
          }
        },
        endedElections: {
          $sum: {
            $cond: [{ $eq: ['$status', 'ended'] }, 1, 0]
          }
        },
        totalVotes: { $sum: '$totalVotes' },
        averageVotesPerElection: { $avg: '$totalVotes' }
      }
    }
  ]);
};

// Instance methods
electionSchema.methods.updateVoteCount = function(candidateId, increment = 1) {
  const candidate = this.candidates.id(candidateId);
  if (candidate) {
    candidate.voteCount += increment;
    this.totalVotes += increment;
    return this.save();
  }
  throw new Error('Candidate not found');
};

electionSchema.methods.getWinner = function() {
  if (!this.isEnded) {
    throw new Error('Election has not ended yet');
  }
  
  if (this.totalVotes === 0) {
    return null;
  }
  
  return this.candidates.reduce((winner, candidate) => {
    return candidate.voteCount > winner.voteCount ? candidate : winner;
  });
};

electionSchema.methods.getResults = function() {
  return this.candidates
    .sort((a, b) => b.voteCount - a.voteCount)
    .map(candidate => ({
      ...candidate.toObject(),
      percentage: this.totalVotes > 0 
        ? ((candidate.voteCount / this.totalVotes) * 100).toFixed(2)
        : 0
    }));
};

electionSchema.methods.canVote = function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate && this.isActive;
};

module.exports = mongoose.model('Election', electionSchema);
