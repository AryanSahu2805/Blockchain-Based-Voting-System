const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 63
  },
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: {
    type: String, // URL to logo image
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Logo must be a valid URL'
    }
  },

  // Contact Information
  adminEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  adminWallet: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid wallet address format'
    }
  },
  contactInfo: {
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    website: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL'
      }
    }
  },

  // Subscription & Billing
  subscriptionPlan: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    default: 'basic',
    required: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trial', 'expired', 'cancelled', 'past_due'],
    default: 'active'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annually'],
    default: 'monthly'
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  trialEndsAt: Date,
  cancelledAt: Date,

  // Usage Limits
  limits: {
    maxUsers: {
      type: Number,
      required: true,
      min: 1,
      max: 100000
    },
    maxElections: {
      type: Number,
      required: true,
      min: 1,
      max: 10000
    },
    maxVotesPerElection: {
      type: Number,
      required: true,
      min: 100,
      max: 1000000
    },
    maxCandidatesPerElection: {
      type: Number,
      required: true,
      min: 2,
      max: 1000
    },
    maxStorageGB: {
      type: Number,
      required: true,
      min: 1,
      max: 1000
    },
    maxApiCallsPerMonth: {
      type: Number,
      required: true,
      min: 1000,
      max: 10000000
    }
  },

  // Feature Flags
  features: {
    fraudDetection: {
      type: Boolean,
      default: true
    },
    predictiveAnalytics: {
      type: Boolean,
      default: true
    },
    ipfsStorage: {
      type: Boolean,
      default: true
    },
    zkProofs: {
      type: Boolean,
      default: true
    },
    gaslessVoting: {
      type: Boolean,
      default: true
    },
    multiNetwork: {
      type: Boolean,
      default: true
    },
    auditLogging: {
      type: Boolean,
      default: true
    },
    complianceReporting: {
      type: Boolean,
      default: true
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    whiteLabel: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: true
    },
    webhooks: {
      type: Boolean,
      default: false
    }
  },

  // Organization Settings
  settings: {
    timezone: {
      type: String,
      default: 'UTC',
      enum: [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai'
      ]
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY',
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    },
    timeFormat: {
      type: String,
      default: '12h',
      enum: ['12h', '24h']
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      },
      webhook: {
        type: Boolean,
        default: false
      }
    },
    security: {
      mfaRequired: {
        type: Boolean,
        default: false
      },
      sessionTimeout: {
        type: Number,
        default: 3600, // seconds
        min: 300,
        max: 86400
      },
      passwordPolicy: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      ipWhitelist: [String],
      allowedCountries: [String],
      maxLoginAttempts: {
        type: Number,
        default: 5,
        min: 3,
        max: 10
      },
      lockoutDuration: {
        type: Number,
        default: 900, // 15 minutes
        min: 300,
        max: 3600
      }
    },
    compliance: {
      gdprCompliant: {
        type: Boolean,
        default: true
      },
      dataRetentionDays: {
        type: Number,
        default: 2555, // 7 years
        min: 365,
        max: 3650
      },
      auditLogRetention: {
        type: Number,
        default: 2555,
        min: 365,
        max: 3650
      },
      dataEncryption: {
        type: Boolean,
        default: true
      },
      backupFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
      }
    }
  },

  // Custom Branding (Enterprise only)
  branding: {
    primaryColor: {
      type: String,
      default: '#3B82F6',
      validate: {
        validator: function(v) {
          return !v || /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Primary color must be a valid hex color'
      }
    },
    secondaryColor: {
      type: String,
      default: '#1F2937',
      validate: {
        validator: function(v) {
          return !v || /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Secondary color must be a valid hex color'
      }
    },
    customCSS: String,
    customLogo: String,
    customFavicon: String,
    customDomain: String
  },

  // API Configuration
  api: {
    enabled: {
      type: Boolean,
      default: true
    },
    rateLimit: {
      type: Number,
      default: 1000, // requests per hour
      min: 100,
      max: 100000
    },
    webhooks: [{
      url: {
        type: String,
        required: true,
        validate: {
          validator: function(v) {
            return /^https?:\/\/.+/.test(v);
          },
          message: 'Webhook URL must be a valid URL'
        }
      },
      events: [{
        type: String,
        enum: ['vote_cast', 'election_created', 'election_ended', 'user_registered']
      }],
      secret: String,
      active: {
        type: Boolean,
        default: true
      },
      lastTriggered: Date,
      failureCount: {
        type: Number,
        default: 0
      }
    }],
    keys: [{
      name: String,
      key: {
        type: String,
        required: true
      },
      permissions: [String],
      lastUsed: Date,
      active: {
        type: Boolean,
        default: true
      }
    }]
  },

  // Status & Metadata
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted', 'pending'],
    default: 'pending',
    required: true
  },
  adminUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  suspendedAt: Date,
  suspendedBy: String,
  deletedAt: Date,
  deletedBy: String,

  // Statistics
  stats: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalElections: {
      type: Number,
      default: 0
    },
    totalVotes: {
      type: Number,
      default: 0
    },
    lastActivity: Date,
    monthlyActiveUsers: {
      type: Number,
      default: 0
    },
    averageElectionDuration: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
organizationSchema.index({ domain: 1 });
organizationSchema.index({ tenantId: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ subscriptionPlan: 1 });
organizationSchema.index({ 'adminUsers': 1 });
organizationSchema.index({ createdAt: 1 });
organizationSchema.index({ nextBillingDate: 1 });

// Virtual fields
organizationSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

organizationSchema.virtual('isTrial').get(function() {
  return this.subscriptionStatus === 'trial' && this.trialEndsAt > new Date();
});

organizationSchema.virtual('trialDaysLeft').get(function() {
  if (!this.trialEndsAt) return 0;
  const now = new Date();
  const trialEnd = new Date(this.trialEndsAt);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

organizationSchema.virtual('subscriptionExpired').get(function() {
  return this.subscriptionStatus === 'expired' || 
         (this.subscriptionStatus === 'trial' && this.trialEndsAt <= new Date());
});

// Pre-save middleware
organizationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set next billing date if not set
  if (!this.nextBillingDate) {
    this.nextBillingDate = this.calculateNextBillingDate();
  }
  
  // Set trial end date for new organizations
  if (this.isNew && this.subscriptionStatus === 'trial' && !this.trialEndsAt) {
    this.trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  next();
});

// Instance methods
organizationSchema.methods.calculateNextBillingDate = function() {
  const now = new Date();
  const nextBilling = new Date(this.nextBillingDate || now);
  
  switch (this.billingCycle) {
    case 'monthly':
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      break;
    case 'quarterly':
      nextBilling.setMonth(nextBilling.getMonth() + 3);
      break;
    case 'annually':
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      break;
  }
  
  return nextBilling;
};

organizationSchema.methods.canUseFeature = function(feature) {
  return this.features[feature] === true;
};

organizationSchema.methods.isWithinLimits = function(limitType, currentValue) {
  return currentValue <= this.limits[limitType];
};

organizationSchema.methods.upgradePlan = function(newPlan) {
  const planOrder = ['basic', 'professional', 'enterprise'];
  const currentIndex = planOrder.indexOf(this.subscriptionPlan);
  const newIndex = planOrder.indexOf(newPlan);
  
  if (newIndex > currentIndex) {
    this.subscriptionPlan = newPlan;
    this.nextBillingDate = this.calculateNextBillingDate();
    return true;
  }
  return false;
};

organizationSchema.methods.suspend = function(reason = 'System suspension') {
  this.status = 'suspended';
  this.suspendedAt = new Date();
  this.suspendedBy = reason;
};

organizationSchema.methods.activate = function() {
  this.status = 'active';
  this.suspendedAt = undefined;
  this.suspendedBy = undefined;
};

organizationSchema.methods.delete = function(reason = 'System deletion') {
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.deletedBy = reason;
};

// Static methods
organizationSchema.statics.findByDomain = function(domain) {
  return this.findOne({ domain: domain.toLowerCase() });
};

organizationSchema.statics.findByTenantId = function(tenantId) {
  return this.findOne({ tenantId });
};

organizationSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

organizationSchema.statics.findBySubscriptionPlan = function(plan) {
  return this.find({ subscriptionPlan: plan });
};

organizationSchema.statics.getExpiredSubscriptions = function() {
  return this.find({
    $or: [
      { subscriptionStatus: 'expired' },
      { subscriptionStatus: 'trial', trialEndsAt: { $lte: new Date() } }
    ]
  });
};

// Export the model
module.exports = mongoose.model('Organization', organizationSchema);
