const crypto = require('crypto');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');

class MultiTenancyService {
  constructor() {
    this.tenantCache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Create a new organization tenant
   */
  async createTenant(tenantData) {
    try {
      const {
        name,
        domain,
        adminEmail,
        adminWallet,
        subscriptionPlan = 'basic',
        maxUsers = 100,
        maxElections = 10,
        features = {},
        settings = {}
      } = tenantData;

      // Validate tenant data
      await this.validateTenantData(tenantData);

      // Generate tenant identifier
      const tenantId = this.generateTenantId(domain);
      
      // Check for existing tenant
      const existingTenant = await Organization.findOne({ 
        $or: [{ domain }, { tenantId }] 
      });
      
      if (existingTenant) {
        throw new Error('Organization with this domain or tenant ID already exists');
      }

      // Create organization
      const organization = new Organization({
        name,
        domain,
        tenantId,
        adminEmail,
        adminWallet,
        subscriptionPlan,
        limits: {
          maxUsers,
          maxElections,
          maxVotesPerElection: 10000,
          maxCandidatesPerElection: 50
        },
        features: {
          fraudDetection: features.fraudDetection !== false,
          predictiveAnalytics: features.predictiveAnalytics !== false,
          ipfsStorage: features.ipfsStorage !== false,
          zkProofs: features.zkProofs !== false,
          gaslessVoting: features.gaslessVoting !== false,
          multiNetwork: features.multiNetwork !== false,
          auditLogging: features.auditLogging !== false,
          complianceReporting: features.complianceReporting !== false
        },
        settings: {
          timezone: settings.timezone || 'UTC',
          language: settings.language || 'en',
          currency: settings.currency || 'USD',
          dateFormat: settings.dateFormat || 'MM/DD/YYYY',
          timeFormat: settings.timeFormat || '12h',
          notifications: settings.notifications || {
            email: true,
            sms: false,
            push: true
          },
          security: settings.security || {
            mfaRequired: false,
            sessionTimeout: 3600,
            passwordPolicy: 'medium',
            ipWhitelist: [],
            allowedCountries: []
          }
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await organization.save();

      // Create admin user for the organization
      const adminUser = new User({
        email: adminEmail,
        walletAddress: adminWallet,
        organizationId: organization._id,
        role: 'admin',
        permissions: ['*'],
        status: 'active',
        profile: {
          firstName: 'Admin',
          lastName: 'User',
          title: 'System Administrator'
        }
      });

      await adminUser.save();

      // Update organization with admin user
      organization.adminUsers = [adminUser._id];
      await organization.save();

      // Cache the tenant
      this.cacheTenant(organization);

      return {
        success: true,
        organization,
        adminUser,
        message: 'Organization created successfully'
      };
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by identifier
   */
  async getTenant(identifier) {
    try {
      // Check cache first
      const cachedTenant = this.getCachedTenant(identifier);
      if (cachedTenant) {
        return cachedTenant;
      }

      // Query database
      const tenant = await Organization.findOne({
        $or: [
          { tenantId: identifier },
          { domain: identifier },
          { _id: identifier }
        ]
      }).populate('adminUsers', 'email walletAddress role status');

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Cache the tenant
      this.cacheTenant(tenant);

      return tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      throw error;
    }
  }

  /**
   * Update tenant configuration
   */
  async updateTenant(tenantId, updateData) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Validate update data
      await this.validateTenantUpdate(tenant, updateData);

      // Apply updates
      Object.keys(updateData).forEach(key => {
        if (key === 'features' || key === 'settings' || key === 'limits') {
          tenant[key] = { ...tenant[key], ...updateData[key] };
        } else if (key !== '_id' && key !== 'tenantId') {
          tenant[key] = updateData[key];
        }
      });

      tenant.updatedAt = new Date();
      await tenant.save();

      // Update cache
      this.cacheTenant(tenant);

      return {
        success: true,
        organization: tenant,
        message: 'Tenant updated successfully'
      };
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Suspend or activate tenant
   */
  async toggleTenantStatus(tenantId, status) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (!['active', 'suspended', 'deleted'].includes(status)) {
        throw new Error('Invalid status. Must be active, suspended, or deleted');
      }

      tenant.status = status;
      tenant.updatedAt = new Date();

      if (status === 'suspended') {
        tenant.suspendedAt = new Date();
        tenant.suspendedBy = 'system'; // In production, track who suspended
      } else if (status === 'deleted') {
        tenant.deletedAt = new Date();
        tenant.deletedBy = 'system';
      }

      await tenant.save();

      // Update cache
      this.cacheTenant(tenant);

      // If suspending, also suspend all users
      if (status === 'suspended') {
        await User.updateMany(
          { organizationId: tenant._id },
          { status: 'suspended' }
        );
      }

      return {
        success: true,
        organization: tenant,
        message: `Tenant ${status} successfully`
      };
    } catch (error) {
      console.error('Error toggling tenant status:', error);
      throw error;
    }
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const [
        userCount,
        electionCount,
        totalVotes,
        activeElections,
        storageUsed,
        apiCalls
      ] = await Promise.all([
        User.countDocuments({ organizationId: tenant._id }),
        Election.countDocuments({ organizationId: tenant._id }),
        AuditLog.countDocuments({ 
          organizationId: tenant._id,
          eventType: 'VOTE_CAST'
        }),
        Election.countDocuments({ 
          organizationId: tenant._id,
          status: 'active'
        }),
        this.calculateStorageUsage(tenant._id),
        this.getApiUsage(tenant._id)
      ]);

      const usage = {
        users: {
          current: userCount,
          limit: tenant.limits.maxUsers,
          percentage: (userCount / tenant.limits.maxUsers) * 100
        },
        elections: {
          current: electionCount,
          limit: tenant.limits.maxElections,
          percentage: (electionCount / tenant.limits.maxElections) * 100
        },
        votes: {
          total: totalVotes,
          averagePerElection: electionCount > 0 ? totalVotes / electionCount : 0
        },
        activeElections,
        storage: {
          used: storageUsed,
          limit: this.getStorageLimit(tenant.subscriptionPlan)
        },
        api: apiCalls,
        limits: tenant.limits,
        subscription: {
          plan: tenant.subscriptionPlan,
          status: tenant.status,
          nextBilling: this.calculateNextBilling(tenant.createdAt)
        }
      };

      return usage;
    } catch (error) {
      console.error('Error getting tenant usage:', error);
      throw error;
    }
  }

  /**
   * Check tenant limits and restrictions
   */
  async checkTenantLimits(tenantId, operation, data = {}) {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (tenant.status !== 'active') {
        throw new Error(`Tenant is ${tenant.status}. Operation not allowed.`);
      }

      const limits = tenant.limits;
      const restrictions = [];

      switch (operation) {
        case 'create_user':
          const userCount = await User.countDocuments({ organizationId: tenant._id });
          if (userCount >= limits.maxUsers) {
            restrictions.push({
              type: 'USER_LIMIT_EXCEEDED',
              message: `Maximum users (${limits.maxUsers}) reached`,
              current: userCount,
              limit: limits.maxUsers
            });
          }
          break;

        case 'create_election':
          const electionCount = await Election.countDocuments({ organizationId: tenant._id });
          if (electionCount >= limits.maxElections) {
            restrictions.push({
              type: 'ELECTION_LIMIT_EXCEEDED',
              message: `Maximum elections (${limits.maxElections}) reached`,
              current: electionCount,
              limit: limits.maxElections
            });
          }
          break;

        case 'add_candidate':
          if (data.electionId) {
            const election = await Election.findById(data.electionId);
            if (election && election.candidates.length >= limits.maxCandidatesPerElection) {
              restrictions.push({
                type: 'CANDIDATE_LIMIT_EXCEEDED',
                message: `Maximum candidates (${limits.maxCandidatesPerElection}) reached for this election`,
                current: election.candidates.length,
                limit: limits.maxCandidatesPerElection
              });
            }
          }
          break;

        case 'cast_vote':
          if (data.electionId) {
            const voteCount = await AuditLog.countDocuments({
              organizationId: tenant._id,
              'details.electionId': data.electionId,
              eventType: 'VOTE_CAST'
            });
            
            if (voteCount >= limits.maxVotesPerElection) {
              restrictions.push({
                type: 'VOTE_LIMIT_EXCEEDED',
                message: `Maximum votes (${limits.maxVotesPerElection}) reached for this election`,
                current: voteCount,
                limit: limits.maxVotesPerElection
              });
            }
          }
          break;

        case 'use_feature':
          if (data.feature && !tenant.features[data.feature]) {
            restrictions.push({
              type: 'FEATURE_NOT_AVAILABLE',
              message: `Feature '${data.feature}' is not available in your subscription plan`,
              feature: data.feature,
              availableFeatures: Object.keys(tenant.features).filter(f => tenant.features[f])
            });
          }
          break;
      }

      return {
        allowed: restrictions.length === 0,
        restrictions,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          subscriptionPlan: tenant.subscriptionPlan,
          status: tenant.status
        }
      };
    } catch (error) {
      console.error('Error checking tenant limits:', error);
      throw error;
    }
  }

  /**
   * Get all tenants (admin only)
   */
  async getAllTenants(filters = {}, pagination = {}) {
    try {
      const { status, subscriptionPlan, search } = filters;
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = -1 } = pagination;

      const query = {};
      
      if (status) query.status = status;
      if (subscriptionPlan) query.subscriptionPlan = subscriptionPlan;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { domain: { $regex: search, $options: 'i' } },
          { adminEmail: { $regex: search, $options: 'i' } }
        ];
      }

      const total = await Organization.countDocuments(query);
      const organizations = await Organization.find(query)
        .populate('adminUsers', 'email walletAddress role status')
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit);

      return {
        organizations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all tenants:', error);
      throw error;
    }
  }

  /**
   * Migrate tenant data
   */
  async migrateTenant(tenantId, targetTenantId) {
    try {
      const sourceTenant = await this.getTenant(tenantId);
      const targetTenant = await this.getTenant(targetTenantId);

      if (!sourceTenant || !targetTenant) {
        throw new Error('Source or target tenant not found');
      }

      // Validate migration compatibility
      await this.validateMigration(sourceTenant, targetTenant);

      // Perform migration
      const migration = {
        sourceTenant: sourceTenant._id,
        targetTenant: targetTenant._id,
        startedAt: new Date(),
        status: 'in_progress',
        steps: []
      };

      // Migrate users
      const users = await User.find({ organizationId: sourceTenant._id });
      for (const user of users) {
        user.organizationId = targetTenant._id;
        await user.save();
        migration.steps.push({
          step: 'user_migration',
          userId: user._id,
          status: 'completed'
        });
      }

      // Migrate elections
      const elections = await Election.find({ organizationId: sourceTenant._id });
      for (const election of elections) {
        election.organizationId = targetTenant._id;
        await election.save();
        migration.steps.push({
          step: 'election_migration',
          electionId: election._id,
          status: 'completed'
        });
      }

      // Migrate audit logs
      const auditLogs = await AuditLog.find({ organizationId: sourceTenant._id });
      for (const log of auditLogs) {
        log.organizationId = targetTenant._id;
        await log.save();
      }

      migration.status = 'completed';
      migration.completedAt = new Date();
      migration.steps.push({
        step: 'migration_complete',
        status: 'completed',
        timestamp: new Date()
      });

      // Suspend source tenant
      await this.toggleTenantStatus(tenantId, 'deleted');

      return {
        success: true,
        migration,
        message: 'Tenant migration completed successfully'
      };
    } catch (error) {
      console.error('Error migrating tenant:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Generate unique tenant ID
   */
  generateTenantId(domain) {
    const hash = crypto.createHash('sha256').update(domain + Date.now()).digest('hex');
    return `tenant_${hash.substring(0, 16)}`;
  }

  /**
   * Validate tenant data
   */
  async validateTenantData(tenantData) {
    const { name, domain, adminEmail, adminWallet } = tenantData;

    if (!name || !domain || !adminEmail || !adminWallet) {
      throw new Error('Missing required fields: name, domain, adminEmail, adminWallet');
    }

    if (domain.length < 3 || domain.length > 63) {
      throw new Error('Domain must be between 3 and 63 characters');
    }

    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      throw new Error('Invalid domain format');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      throw new Error('Invalid admin email format');
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(adminWallet)) {
      throw new Error('Invalid wallet address format');
    }
  }

  /**
   * Validate tenant update
   */
  async validateTenantUpdate(tenant, updateData) {
    if (updateData.domain && updateData.domain !== tenant.domain) {
      const existingTenant = await Organization.findOne({ domain: updateData.domain });
      if (existingTenant && existingTenant._id.toString() !== tenant._id.toString()) {
        throw new Error('Domain already in use by another organization');
      }
    }

    if (updateData.limits) {
      const currentUsage = await this.getTenantUsage(tenant._id);
      
      if (updateData.limits.maxUsers && updateData.limits.maxUsers < currentUsage.users.current) {
        throw new Error(`Cannot reduce user limit below current usage (${currentUsage.users.current})`);
      }
      
      if (updateData.limits.maxElections && updateData.limits.maxElections < currentUsage.elections.current) {
        throw new Error(`Cannot reduce election limit below current usage (${currentUsage.elections.current})`);
      }
    }
  }

  /**
   * Cache tenant data
   */
  cacheTenant(tenant) {
    this.tenantCache.set(tenant.tenantId, {
      data: tenant,
      timestamp: Date.now()
    });
    
    this.tenantCache.set(tenant.domain, {
      data: tenant,
      timestamp: Date.now()
    });
    
    this.tenantCache.set(tenant._id.toString(), {
      data: tenant,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached tenant
   */
  getCachedTenant(identifier) {
    const cached = this.tenantCache.get(identifier);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    
    // Remove expired cache
    if (cached) {
      this.tenantCache.delete(identifier);
    }
    
    return null;
  }

  /**
   * Calculate storage usage
   */
  async calculateStorageUsage(organizationId) {
    // This would typically query actual storage usage
    // For demo, return estimated usage
    const elections = await Election.countDocuments({ organizationId });
    const users = await User.countDocuments({ organizationId });
    
    return elections * 1024 + users * 512; // KB
  }

  /**
   * Get API usage
   */
  async getApiUsage(organizationId) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await AuditLog.countDocuments({
      organizationId,
      timestamp: { $gte: last24h }
    });
  }

  /**
   * Get storage limit based on subscription
   */
  getStorageLimit(subscriptionPlan) {
    const limits = {
      basic: 1024 * 1024, // 1GB
      professional: 10 * 1024 * 1024, // 10GB
      enterprise: 100 * 1024 * 1024 // 100GB
    };
    return limits[subscriptionPlan] || limits.basic;
  }

  /**
   * Calculate next billing date
   */
  calculateNextBilling(createdAt) {
    const nextBilling = new Date(createdAt);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    return nextBilling;
  }

  /**
   * Validate migration compatibility
   */
  async validateMigration(sourceTenant, targetTenant) {
    if (sourceTenant.subscriptionPlan === 'enterprise' && targetTenant.subscriptionPlan !== 'enterprise') {
      throw new Error('Cannot migrate from enterprise plan to lower plan');
    }

    const sourceUsage = await this.getTenantUsage(sourceTenant._id);
    const targetLimits = targetTenant.limits;

    if (sourceUsage.users.current > targetLimits.maxUsers) {
      throw new Error('Target tenant user limit too low for migration');
    }

    if (sourceUsage.elections.current > targetLimits.maxElections) {
      throw new Error('Target tenant election limit too low for migration');
    }
  }
}

module.exports = MultiTenancyService;
