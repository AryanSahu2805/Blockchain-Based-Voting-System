const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Event identification
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_REGISTRATION',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'AUTH_FAILURE',
      'AUTH_RATE_LIMIT_EXCEEDED',
      
      // Voting events
      'VOTE_CAST',
      'VOTE_ATTEMPT',
      'VOTE_FAILURE',
      'VOTING_RATE_LIMIT_EXCEEDED',
      'VOTE_VERIFICATION',
      'VOTE_INVALIDATION',
      
      // Election events
      'ELECTION_CREATED',
      'ELECTION_UPDATED',
      'ELECTION_DELETED',
      'ELECTION_STARTED',
      'ELECTION_ENDED',
      'ELECTION_PAUSED',
      
      // Admin events
      'ADMIN_LOGIN',
      'ADMIN_ACTION',
      'ADMIN_RATE_LIMIT_EXCEEDED',
      'USER_MANAGEMENT',
      'SYSTEM_CONFIGURATION',
      
      // Security events
      'RATE_LIMIT_EXCEEDED',
      'CORS_VIOLATION',
      'INPUT_SANITIZATION_ERROR',
      'INVALID_TRANSACTION_HASH',
      'INVALID_SIGNATURE',
      'INVALID_WALLET_ADDRESS',
      'BLOCKED_IP_ACCESS',
      'SUSPICIOUS_IP_DETECTED',
      'TRANSACTION_VALIDATION_ERROR',
      'WALLET_ADDRESS_VALIDATION_ERROR',
      
      // Blockchain events
      'BLOCKCHAIN_SYNC',
      'CONTRACT_DEPLOYMENT',
      'TRANSACTION_SUBMISSION',
      'TRANSACTION_CONFIRMATION',
      'TRANSACTION_FAILURE',
      'NETWORK_SWITCH',
      
      // IPFS events
      'IPFS_UPLOAD',
      'IPFS_DOWNLOAD',
      'IPFS_VERIFICATION',
      'IPFS_FAILURE',
      
      // Meta-transaction events
      'META_TRANSACTION_CREATED',
      'META_TRANSACTION_EXECUTED',
      'META_TRANSACTION_FAILED',
      
      // ZK Proof events
      'ZK_PROOF_GENERATED',
      'ZK_PROOF_VERIFIED',
      'ZK_PROOF_FAILED',
      
      // System events
      'REQUEST_START',
      'REQUEST_COMPLETE',
      'SYSTEM_STARTUP',
      'SYSTEM_SHUTDOWN',
      'BACKUP_CREATED',
      'RESTORE_ATTEMPTED',
      
      // Compliance events
      'GDPR_REQUEST',
      'DATA_EXPORT',
      'DATA_DELETION',
      'AUDIT_REPORT_GENERATED',
      'COMPLIANCE_CHECK'
    ],
    index: true
  },
  
  // Timestamp and duration
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Request information
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    index: true
  },
  
  path: {
    type: String,
    required: true,
    index: true
  },
  
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  walletAddress: {
    type: String,
    index: true,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid wallet address format'
    }
  },
  
  sessionId: {
    type: String,
    index: true
  },
  
  // Network and location
  ip: {
    type: String,
    required: true,
    index: true
  },
  
  userAgent: {
    type: String,
    index: true
  },
  
  country: {
    type: String,
    index: true
  },
  
  city: {
    type: String,
    index: true
  },
  
  // Event details
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Severity level
  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },
  
  // Status and outcome
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'PENDING', 'BLOCKED'],
    default: 'SUCCESS',
    index: true
  },
  
  // Error information
  error: {
    message: String,
    code: String,
    stack: String
  },
  
  // Blockchain specific
  blockchain: {
    network: {
      type: String,
      enum: ['mumbai', 'polygon', 'sepolia', 'ethereum', 'hardhat'],
      index: true
    },
    transactionHash: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
        },
        message: 'Invalid transaction hash format'
      }
    },
    blockNumber: Number,
    gasUsed: String,
    gasPrice: String
  },
  
  // Compliance and retention
  retention: {
    expiresAt: {
      type: Date,
      default: function() {
        // Default retention: 7 years for compliance
        const date = new Date();
        date.setFullYear(date.getFullYear() + 7);
        return date;
      },
      index: true
    },
    category: {
      type: String,
      enum: ['OPERATIONAL', 'SECURITY', 'COMPLIANCE', 'AUDIT'],
      default: 'OPERATIONAL',
      index: true
    }
  },
  
  // Metadata
  metadata: {
    version: {
      type: String,
      default: '1.0.0'
    },
    source: {
      type: String,
      default: 'api'
    },
    correlationId: String,
    requestId: String
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for performance
auditLogSchema.index({ timestamp: -1, eventType: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ walletAddress: 1, timestamp: -1 });
auditLogSchema.index({ ip: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ 'blockchain.network': 1, timestamp: -1 });
auditLogSchema.index({ 'retention.expiresAt': 1 });

// TTL index for automatic cleanup
auditLogSchema.index({ 'retention.expiresAt': 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
auditLogSchema.pre('save', function(next) {
  // Set retention based on event type
  if (this.eventType && this.retention.category === 'OPERATIONAL') {
    switch (this.eventType) {
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
      case 'REQUEST_START':
      case 'REQUEST_COMPLETE':
        this.retention.category = 'OPERATIONAL';
        this.retention.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        break;
        
      case 'VOTE_CAST':
      case 'ELECTION_CREATED':
      case 'ELECTION_ENDED':
        this.retention.category = 'AUDIT';
        this.retention.expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
        break;
        
      case 'AUTH_FAILURE':
      case 'VOTING_RATE_LIMIT_EXCEEDED':
      case 'CORS_VIOLATION':
        this.retention.category = 'SECURITY';
        this.retention.expiresAt = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
        break;
        
      case 'GDPR_REQUEST':
      case 'DATA_EXPORT':
      case 'DATA_DELETION':
        this.retention.category = 'COMPLIANCE';
        this.retention.expiresAt = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
        break;
    }
  }
  
  next();
});

// Static methods
auditLogSchema.statics.findByEventType = function(eventType, options = {}) {
  const query = { eventType };
  
  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: new Date(options.endDate) };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .populate('userId', 'walletAddress profileName email');
};

auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: new Date(options.endDate) };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.findByWallet = function(walletAddress, options = {}) {
  const query = { walletAddress: walletAddress.toLowerCase() };
  
  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: new Date(options.endDate) };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.findBySeverity = function(severity, options = {}) {
  const query = { severity };
  
  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: new Date(options.endDate) };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

auditLogSchema.statics.findSecurityEvents = function(options = {}) {
  const securityEventTypes = [
    'AUTH_FAILURE',
    'VOTING_RATE_LIMIT_EXCEEDED',
    'CORS_VIOLATION',
    'INPUT_SANITIZATION_ERROR',
    'INVALID_TRANSACTION_HASH',
    'INVALID_SIGNATURE',
    'BLOCKED_IP_ACCESS',
    'SUSPICIOUS_IP_DETECTED'
  ];
  
  const query = { eventType: { $in: securityEventTypes } };
  
  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }
  
  if (options.endDate) {
    query.timestamp = { ...query.timestamp, $lte: new Date(options.endDate) };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Instance methods
auditLogSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  
  // Remove sensitive information for public access
  delete obj.details.headers;
  delete obj.details.body;
  delete obj.error.stack;
  delete obj.sessionId;
  
  return obj;
};

// Virtual fields
auditLogSchema.virtual('isExpired').get(function() {
  return this.retention.expiresAt < new Date();
});

auditLogSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.retention.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Export the model
module.exports = mongoose.model('AuditLog', auditLogSchema);
