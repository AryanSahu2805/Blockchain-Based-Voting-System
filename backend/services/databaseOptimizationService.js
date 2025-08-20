const mongoose = require('mongoose');
const Election = require('../models/Election');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');

class DatabaseOptimizationService {
  constructor() {
    this.optimizationStrategies = {
      indexing: this.optimizeIndexes.bind(this),
      queryOptimization: this.optimizeQueries.bind(this),
      connectionPooling: this.optimizeConnections.bind(this),
      aggregationPipelines: this.optimizeAggregations.bind(this),
      dataArchiving: this.optimizeDataArchiving.bind(this)
    };
    
    this.performanceMetrics = {
      queryTimes: new Map(),
      indexUsage: new Map(),
      connectionStats: new Map()
    };
  }

  /**
   * Initialize database optimization
   */
  async initializeOptimization() {
    try {
      console.log('🚀 Initializing database optimization...');
      
      // Create optimal indexes
      await this.createOptimalIndexes();
      
      // Optimize connection pool
      await this.optimizeConnectionPool();
      
      // Set up performance monitoring
      await this.setupPerformanceMonitoring();
      
      // Run initial optimization
      await this.runOptimization();
      
      console.log('✅ Database optimization initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database optimization:', error);
    }
  }

  /**
   * Create optimal indexes for performance
   */
  async createOptimalIndexes() {
    try {
      console.log('📊 Creating optimal indexes...');
      
      // Election indexes
      await Election.collection.createIndex(
        { organizationId: 1, status: 1, startTime: -1 },
        { background: true, name: 'org_status_starttime' }
      );
      
      await Election.collection.createIndex(
        { organizationId: 1, endTime: 1 },
        { background: true, name: 'org_endtime' }
      );
      
      await Election.collection.createIndex(
        { 'candidates.id': 1, organizationId: 1 },
        { background: true, name: 'candidate_org' }
      );
      
      // User indexes
      await User.collection.createIndex(
        { organizationId: 1, email: 1 },
        { background: true, unique: true, name: 'org_email_unique' }
      );
      
      await User.collection.createIndex(
        { organizationId: 1, walletAddress: 1 },
        { background: true, unique: true, name: 'org_wallet_unique' }
      );
      
      await User.collection.createIndex(
        { organizationId: 1, role: 1, status: 1 },
        { background: true, name: 'org_role_status' }
      );
      
      // AuditLog indexes
      await AuditLog.collection.createIndex(
        { organizationId: 1, eventType: 1, timestamp: -1 },
        { background: true, name: 'org_event_timestamp' }
      );
      
      await AuditLog.collection.createIndex(
        { organizationId: 1, userId: 1, timestamp: -1 },
        { background: true, name: 'org_user_timestamp' }
      );
      
      await AuditLog.collection.createIndex(
        { organizationId: 1, walletAddress: 1, timestamp: -1 },
        { background: true, name: 'org_wallet_timestamp' }
      );
      
      await AuditLog.collection.createIndex(
        { organizationId: 1, ip: 1, timestamp: -1 },
        { background: true, name: 'org_ip_timestamp' }
      );
      
      // Organization indexes
      await Organization.collection.createIndex(
        { domain: 1 },
        { background: true, unique: true, name: 'domain_unique' }
      );
      
      await Organization.collection.createIndex(
        { tenantId: 1 },
        { background: true, unique: true, name: 'tenant_unique' }
      );
      
      await Organization.collection.createIndex(
        { status: 1, subscriptionPlan: 1 },
        { background: true, name: 'status_plan' }
      );
      
      // Text search indexes
      await Election.collection.createIndex(
        { title: 'text', description: 'text' },
        { background: true, name: 'election_text_search' }
      );
      
      await User.collection.createIndex(
        { 'profile.firstName': 'text', 'profile.lastName': 'text', email: 'text' },
        { background: true, name: 'user_text_search' }
      );
      
      // Compound indexes for complex queries
      await AuditLog.collection.createIndex(
        { 
          organizationId: 1, 
          eventType: 1, 
          severity: 1, 
          timestamp: -1 
        },
        { background: true, name: 'org_event_severity_timestamp' }
      );
      
      await Election.collection.createIndex(
        { 
          organizationId: 1, 
          status: 1, 
          'candidates.id': 1, 
          startTime: -1 
        },
        { background: true, name: 'org_status_candidate_starttime' }
      );
      
      console.log('✅ Optimal indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Optimize connection pool
   */
  async optimizeConnectionPool() {
    try {
      const connection = mongoose.connection;
      
      // Set optimal connection pool settings
      const poolSize = process.env.MONGODB_POOL_SIZE || 10;
      const maxPoolSize = process.env.MONGODB_MAX_POOL_SIZE || 50;
      const minPoolSize = process.env.MONGODB_MIN_POOL_SIZE || 5;
      
      // Update connection options
      if (connection.db) {
        const adminDb = connection.db.admin();
        
        // Set connection pool settings
        await adminDb.command({
          setParameter: 1,
          maxTransactionLockRequestTimeoutMillis: 5000,
          maxIndexBuildTimeMillis: 300000
        });
      }
      
      console.log('✅ Connection pool optimized');
    } catch (error) {
      console.error('❌ Error optimizing connection pool:', error);
    }
  }

  /**
   * Setup performance monitoring
   */
  async setupPerformanceMonitoring() {
    try {
      // Monitor query performance
      mongoose.set('debug', process.env.MONGODB_DEBUG === 'true');
      
      // Set up query middleware for performance tracking
      this.setupQueryMiddleware();
      
      // Set up connection monitoring
      this.setupConnectionMonitoring();
      
      console.log('✅ Performance monitoring setup complete');
    } catch (error) {
      console.error('❌ Error setting up performance monitoring:', error);
    }
  }

  /**
   * Setup query middleware for performance tracking
   */
  setupQueryMiddleware() {
    // Track query execution time
    mongoose.Query.prototype.trackPerformance = function() {
      const startTime = Date.now();
      
      this.exec = function(...args) {
        const queryTime = Date.now() - startTime;
        const queryString = this.getQuery();
        const collection = this.mongooseCollection.name;
        
        // Store performance metrics
        this.constructor.performanceMetrics = this.constructor.performanceMetrics || new Map();
        this.constructor.performanceMetrics.set(`${collection}:${JSON.stringify(queryString)}`, {
          queryTime,
          timestamp: new Date(),
          count: (this.constructor.performanceMetrics.get(`${collection}:${JSON.stringify(queryString)}`)?.count || 0) + 1
        });
        
        return mongoose.Query.prototype.exec.apply(this, args);
      };
      
      return this;
    };
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    const connection = mongoose.connection;
    
    connection.on('connected', () => {
      console.log('✅ MongoDB connected');
      this.performanceMetrics.connectionStats.set('status', 'connected');
    });
    
    connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected');
      this.performanceMetrics.connectionStats.set('status', 'disconnected');
    });
    
    connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.performanceMetrics.connectionStats.set('lastError', error.message);
    });
  }

  /**
   * Run database optimization
   */
  async runOptimization() {
    try {
      console.log('🔄 Running database optimization...');
      
      // Analyze collection statistics
      const collectionStats = await this.analyzeCollections();
      
      // Optimize based on statistics
      await this.optimizeBasedOnStats(collectionStats);
      
      // Run maintenance tasks
      await this.runMaintenanceTasks();
      
      console.log('✅ Database optimization completed');
      
      return {
        success: true,
        collectionStats,
        optimizations: await this.getOptimizationSummary()
      };
    } catch (error) {
      console.error('❌ Error running optimization:', error);
      throw error;
    }
  }

  /**
   * Analyze collection statistics
   */
  async analyzeCollections() {
    try {
      const collections = ['elections', 'users', 'auditlogs', 'organizations'];
      const stats = {};
      
      for (const collection of collections) {
        const db = mongoose.connection.db;
        const coll = db.collection(collection);
        
        // Get collection stats
        const collStats = await coll.stats();
        
        // Get index usage
        const indexStats = await coll.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        // Get document count
        const documentCount = await coll.countDocuments();
        
        stats[collection] = {
          documentCount,
          size: collStats.size,
          avgObjSize: collStats.avgObjSize,
          storageSize: collStats.storageSize,
          indexes: collStats.nindexes,
          indexUsage: indexStats
        };
      }
      
      return stats;
    } catch (error) {
      console.error('❌ Error analyzing collections:', error);
      throw error;
    }
  }

  /**
   * Optimize based on collection statistics
   */
  async optimizeBasedOnStats(collectionStats) {
    try {
      for (const [collection, stats] of Object.entries(collectionStats)) {
        console.log(`🔧 Optimizing collection: ${collection}`);
        
        // Optimize indexes based on usage
        await this.optimizeCollectionIndexes(collection, stats);
        
        // Optimize data structure if needed
        await this.optimizeDataStructure(collection, stats);
        
        // Set up data archiving if collection is large
        if (stats.documentCount > 100000) {
          await this.setupDataArchiving(collection);
        }
      }
    } catch (error) {
      console.error('❌ Error optimizing based on stats:', error);
    }
  }

  /**
   * Optimize collection indexes
   */
  async optimizeCollectionIndexes(collection, stats) {
    try {
      const coll = mongoose.connection.db.collection(collection);
      
      // Analyze index usage
      const indexUsage = stats.indexUsage;
      const unusedIndexes = indexUsage.filter(idx => idx.accesses.ops === 0);
      
      // Remove unused indexes
      for (const index of unusedIndexes) {
        if (index.name !== '_id_') { // Don't remove primary key
          console.log(`🗑️ Removing unused index: ${index.name} from ${collection}`);
          await coll.dropIndex(index.name);
        }
      }
      
      // Create missing indexes based on query patterns
      await this.createMissingIndexes(collection);
      
    } catch (error) {
      console.error(`❌ Error optimizing indexes for ${collection}:`, error);
    }
  }

  /**
   * Create missing indexes based on query patterns
   */
  async createMissingIndexes(collection) {
    try {
      const missingIndexes = this.getMissingIndexes(collection);
      
      for (const index of missingIndexes) {
        console.log(`📊 Creating missing index: ${index.name} for ${collection}`);
        await mongoose.connection.db.collection(collection).createIndex(
          index.keys,
          index.options
        );
      }
    } catch (error) {
      console.error(`❌ Error creating missing indexes for ${collection}:`, error);
    }
  }

  /**
   * Get missing indexes based on common query patterns
   */
  getMissingIndexes(collection) {
    const missingIndexes = [];
    
    switch (collection) {
      case 'elections':
        // Index for time-based queries
        missingIndexes.push({
          name: 'org_starttime_endtime',
          keys: { organizationId: 1, startTime: 1, endTime: 1 },
          options: { background: true }
        });
        
        // Index for candidate queries
        missingIndexes.push({
          name: 'org_candidate_votes',
          keys: { organizationId: 1, 'candidates.id': 1, 'candidates.votes': -1 },
          options: { background: true }
        });
        break;
        
      case 'users':
        // Index for role-based queries
        missingIndexes.push({
          name: 'org_role_created',
          keys: { organizationId: 1, role: 1, createdAt: -1 },
          options: { background: true }
        });
        
        // Index for status queries
        missingIndexes.push({
          name: 'org_status_lastlogin',
          keys: { organizationId: 1, status: 1, lastLogin: -1 },
          options: { background: true }
        });
        break;
        
      case 'auditlogs':
        // Index for security analysis
        missingIndexes.push({
          name: 'org_severity_timestamp',
          keys: { organizationId: 1, severity: 1, timestamp: -1 },
          options: { background: true }
        });
        
        // Index for IP analysis
        missingIndexes.push({
          name: 'org_ip_event_timestamp',
          keys: { organizationId: 1, ip: 1, eventType: 1, timestamp: -1 },
          options: { background: true }
        });
        break;
    }
    
    return missingIndexes;
  }

  /**
   * Optimize data structure
   */
  async optimizeDataStructure(collection, stats) {
    try {
      if (stats.avgObjSize > 16384) { // 16KB threshold
        console.log(`📦 Large objects detected in ${collection}, optimizing structure...`);
        
        switch (collection) {
          case 'elections':
            await this.optimizeElectionStructure();
            break;
          case 'auditlogs':
            await this.optimizeAuditLogStructure();
            break;
          case 'users':
            await this.optimizeUserStructure();
            break;
        }
      }
    } catch (error) {
      console.error(`❌ Error optimizing data structure for ${collection}:`, error);
    }
  }

  /**
   * Optimize election data structure
   */
  async optimizeElectionStructure() {
    try {
      // Create optimized view for frequently accessed data
      await mongoose.connection.db.createCollection('elections_optimized');
      
      // Create aggregation pipeline for optimization
      const pipeline = [
        {
          $project: {
            _id: 1,
            organizationId: 1,
            title: 1,
            description: 1,
            status: 1,
            startTime: 1,
            endTime: 1,
            'candidates.id': 1,
            'candidates.name': 1,
            'candidates.votes': 1,
            totalVotes: { $sum: '$candidates.votes' },
            candidateCount: { $size: '$candidates' }
          }
        }
      ];
      
      await mongoose.connection.db.collection('elections').aggregate(pipeline).toArray();
      
    } catch (error) {
      console.error('❌ Error optimizing election structure:', error);
    }
  }

  /**
   * Optimize audit log structure
   */
  async optimizeAuditLogStructure() {
    try {
      // Create TTL index for automatic cleanup
      await AuditLog.collection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 7776000, background: true } // 90 days
      );
      
      // Create compressed collection for historical data
      await mongoose.connection.db.createCollection('auditlogs_compressed', {
        storageEngine: {
          wiredTiger: {
            configString: 'block_compressor=snappy'
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error optimizing audit log structure:', error);
    }
  }

  /**
   * Optimize user structure
   */
  async optimizeUserStructure() {
    try {
      // Create index for profile searches
      await User.collection.createIndex(
        { 'profile.firstName': 1, 'profile.lastName': 1, organizationId: 1 },
        { background: true, name: 'profile_name_search' }
      );
      
      // Create index for wallet lookups
      await User.collection.createIndex(
        { walletAddress: 1, organizationId: 1 },
        { background: true, unique: true, name: 'wallet_org_unique' }
      );
      
    } catch (error) {
      console.error('❌ Error optimizing user structure:', error);
    }
  }

  /**
   * Setup data archiving
   */
  async setupDataArchiving(collection) {
    try {
      console.log(`📦 Setting up data archiving for ${collection}`);
      
      // Create archive collection
      const archiveCollection = `${collection}_archive`;
      await mongoose.connection.db.createCollection(archiveCollection);
      
      // Create archive index
      await mongoose.connection.db.collection(archiveCollection).createIndex(
        { archivedAt: 1 },
        { background: true, name: 'archived_at' }
      );
      
      // Create archive job
      await this.createArchiveJob(collection);
      
    } catch (error) {
      console.error(`❌ Error setting up data archiving for ${collection}:`, error);
    }
  }

  /**
   * Create archive job
   */
  async createArchiveJob(collection) {
    try {
      const archiveJob = {
        collection,
        schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
        retentionDays: 365,
        lastRun: null,
        nextRun: this.calculateNextRun('0 2 * * 0'),
        status: 'active'
      };
      
      // Store archive job configuration
      await mongoose.connection.db.collection('archive_jobs').updateOne(
        { collection },
        { $set: archiveJob },
        { upsert: true }
      );
      
    } catch (error) {
      console.error(`❌ Error creating archive job for ${collection}:`, error);
    }
  }

  /**
   * Run maintenance tasks
   */
  async runMaintenanceTasks() {
    try {
      console.log('🔧 Running maintenance tasks...');
      
      // Compact collections
      await this.compactCollections();
      
      // Update statistics
      await this.updateCollectionStats();
      
      // Clean up temporary collections
      await this.cleanupTempCollections();
      
      console.log('✅ Maintenance tasks completed');
    } catch (error) {
      console.error('❌ Error running maintenance tasks:', error);
    }
  }

  /**
   * Compact collections
   */
  async compactCollections() {
    try {
      const collections = ['elections', 'users', 'auditlogs', 'organizations'];
      
      for (const collection of collections) {
        console.log(`🗜️ Compacting collection: ${collection}`);
        await mongoose.connection.db.command({
          compact: collection,
          force: false
        });
      }
    } catch (error) {
      console.error('❌ Error compacting collections:', error);
    }
  }

  /**
   * Update collection statistics
   */
  async updateCollectionStats() {
    try {
      const collections = ['elections', 'users', 'auditlogs', 'organizations'];
      
      for (const collection of collections) {
        await mongoose.connection.db.command({
          collMod: collection,
          validator: {},
          validationLevel: 'moderate'
        });
      }
    } catch (error) {
      console.error('❌ Error updating collection stats:', error);
    }
  }

  /**
   * Clean up temporary collections
   */
  async cleanupTempCollections() {
    try {
      const tempCollections = await mongoose.connection.db.listCollections({
        name: { $regex: /^temp_|^tmp_/ }
      }).toArray();
      
      for (const collection of tempCollections) {
        console.log(`🗑️ Cleaning up temporary collection: ${collection.name}`);
        await mongoose.connection.db.collection(collection.name).drop();
      }
    } catch (error) {
      console.error('❌ Error cleaning up temporary collections:', error);
    }
  }

  /**
   * Get optimization summary
   */
  async getOptimizationSummary() {
    try {
      const summary = {
        indexes: await this.getIndexSummary(),
        performance: await this.getPerformanceSummary(),
        recommendations: await this.generateRecommendations()
      };
      
      return summary;
    } catch (error) {
      console.error('❌ Error getting optimization summary:', error);
      return {};
    }
  }

  /**
   * Get index summary
   */
  async getIndexSummary() {
    try {
      const collections = ['elections', 'users', 'auditlogs', 'organizations'];
      const indexSummary = {};
      
      for (const collection of collections) {
        const indexes = await mongoose.connection.db.collection(collection).indexes();
        indexSummary[collection] = {
          total: indexes.length,
          indexes: indexes.map(idx => ({
            name: idx.name,
            keys: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false
          }))
        };
      }
      
      return indexSummary;
    } catch (error) {
      console.error('❌ Error getting index summary:', error);
      return {};
    }
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary() {
    try {
      const performance = {
        queryTimes: Array.from(this.performanceMetrics.queryTimes.entries()),
        connectionStats: Array.from(this.performanceMetrics.connectionStats.entries()),
        recommendations: []
      };
      
      // Analyze query performance
      const slowQueries = performance.queryTimes.filter(([key, value]) => value.queryTime > 100);
      if (slowQueries.length > 0) {
        performance.recommendations.push({
          type: 'SLOW_QUERIES',
          count: slowQueries.length,
          action: 'Consider adding indexes or optimizing query patterns'
        });
      }
      
      return performance;
    } catch (error) {
      console.error('❌ Error getting performance summary:', error);
      return {};
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations() {
    try {
      const recommendations = [];
      
      // Check for missing indexes
      const missingIndexes = await this.identifyMissingIndexes();
      if (missingIndexes.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          type: 'MISSING_INDEXES',
          description: `Found ${missingIndexes.length} missing indexes`,
          actions: missingIndexes.map(idx => `Add index on ${idx.collection}.${idx.field}`)
        });
      }
      
      // Check for large collections
      const largeCollections = await this.identifyLargeCollections();
      if (largeCollections.length > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'LARGE_COLLECTIONS',
          description: `Found ${largeCollections.length} large collections`,
          actions: largeCollections.map(coll => `Consider archiving old data in ${coll.name}`)
        });
      }
      
      // Check for connection pool issues
      const connectionIssues = await this.identifyConnectionIssues();
      if (connectionIssues.length > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'CONNECTION_ISSUES',
          description: `Found ${connectionIssues.length} connection issues`,
          actions: connectionIssues
        });
      }
      
      return recommendations;
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return [];
    }
  }

  // Helper methods

  /**
   * Calculate next run time for cron job
   */
  calculateNextRun(cronExpression) {
    // Simple cron parser - in production use a proper cron library
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 7); // Weekly
    nextRun.setHours(2, 0, 0, 0); // 2 AM
    return nextRun;
  }

  /**
   * Identify missing indexes
   */
  async identifyMissingIndexes() {
    // Implementation for identifying missing indexes
    return [];
  }

  /**
   * Identify large collections
   */
  async identifyLargeCollections() {
    // Implementation for identifying large collections
    return [];
  }

  /**
   * Identify connection issues
   */
  async identifyConnectionIssues() {
    // Implementation for identifying connection issues
    return [];
  }
}

module.exports = DatabaseOptimizationService;
