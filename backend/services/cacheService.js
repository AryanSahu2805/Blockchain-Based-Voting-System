const Redis = require('ioredis');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.redis = null;
    this.cachePrefix = 'blockchain_voting:';
    this.defaultTTL = 3600; // 1 hour
    this.cacheStrategies = {
      election: { ttl: 1800, strategy: 'write-through' }, // 30 minutes
      user: { ttl: 7200, strategy: 'write-behind' }, // 2 hours
      analytics: { ttl: 300, strategy: 'write-around' }, // 5 minutes
      blockchain: { ttl: 60, strategy: 'write-through' }, // 1 minute
      fraud: { ttl: 900, strategy: 'write-behind' }, // 15 minutes
      compliance: { ttl: 86400, strategy: 'write-around' } // 24 hours
    };
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        keyPrefix: this.cachePrefix
      });

      // Handle Redis events
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis ready for operations');
      });

      // Test connection
      await this.redis.ping();
      console.log('✅ Redis ping successful');
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  /**
   * Generate cache key
   */
  generateCacheKey(prefix, identifier, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? ':' + Object.entries(params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join(':')
      : '';
    
    return `${prefix}:${identifier}${paramString}`;
  }

  /**
   * Set cache value with strategy
   */
  async set(key, value, options = {}) {
    if (!this.redis) return false;

    try {
      const { ttl = this.defaultTTL, strategy = 'write-through' } = options;
      const serializedValue = JSON.stringify(value);
      
      // Apply caching strategy
      switch (strategy) {
        case 'write-through':
          await this.redis.setex(key, ttl, serializedValue);
          break;
        case 'write-behind':
          // Store in cache immediately, persist to database asynchronously
          await this.redis.setex(key, ttl, serializedValue);
          this.persistToDatabase(key, value).catch(console.error);
          break;
        case 'write-around':
          // Only cache read operations, bypass cache for writes
          if (options.operation === 'read') {
            await this.redis.setex(key, ttl, serializedValue);
          }
          break;
        default:
          await this.redis.setex(key, ttl, serializedValue);
      }

      // Set metadata for cache management
      await this.setCacheMetadata(key, {
        strategy,
        ttl,
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Get cache value with intelligent fallback
   */
  async get(key, options = {}) {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      
      if (value) {
        // Update access metadata
        await this.updateAccessMetadata(key);
        
        // Update hit statistics
        await this.incrementCacheHit(key);
        
        return JSON.parse(value);
      }

      // Cache miss - update statistics
      await this.incrementCacheMiss(key);
      
      return null;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  /**
   * Get or set cache with fallback function
   */
  async getOrSet(key, fallbackFunction, options = {}) {
    let value = await this.get(key, options);
    
    if (value === null) {
      try {
        value = await fallbackFunction();
        if (value !== null && value !== undefined) {
          await this.set(key, value, options);
        }
      } catch (error) {
        console.error('Error in fallback function:', error);
        return null;
      }
    }
    
    return value;
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    if (!this.redis) return false;

    try {
      const result = await this.redis.del(key);
      await this.deleteCacheMetadata(key);
      return result > 0;
    } catch (error) {
      console.error('Error deleting cache:', error);
      return false;
    }
  }

  /**
   * Delete multiple cache keys
   */
  async deleteMultiple(keys) {
    if (!this.redis || !Array.isArray(keys)) return false;

    try {
      const pipeline = this.redis.pipeline();
      keys.forEach(key => {
        pipeline.del(key);
        pipeline.del(this.getMetadataKey(key));
      });
      
      const results = await pipeline.exec();
      return results.every(result => result[0] === null);
    } catch (error) {
      console.error('Error deleting multiple cache keys:', error);
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern) {
    if (!this.redis) return false;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach(key => {
          pipeline.del(key);
          pipeline.del(this.getMetadataKey(key));
        });
        
        await pipeline.exec();
        console.log(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      console.error('Error clearing cache by pattern:', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    if (!this.redis) return false;

    try {
      await this.redis.flushdb();
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  }

  /**
   * Set cache with tags for grouped invalidation
   */
  async setWithTags(key, value, tags = [], options = {}) {
    if (!this.redis) return false;

    try {
      // Set the main value
      await this.set(key, value, options);
      
      // Store tags for this key
      if (tags.length > 0) {
        const tagKey = this.getTagKey(key);
        await this.redis.sadd(tagKey, ...tags);
        
        // Set expiration for tags
        const { ttl = this.defaultTTL } = options;
        await this.redis.expire(tagKey, ttl);
        
        // Store reverse mapping (tag -> keys)
        for (const tag of tags) {
          const reverseTagKey = this.getReverseTagKey(tag);
          await this.redis.sadd(reverseTagKey, key);
          await this.redis.expire(reverseTagKey, ttl);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error setting cache with tags:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags) {
    if (!this.redis || !Array.isArray(tags)) return false;

    try {
      const keysToDelete = new Set();
      
      for (const tag of tags) {
        const reverseTagKey = this.getReverseTagKey(tag);
        const keys = await this.redis.smembers(reverseTagKey);
        
        keys.forEach(key => keysToDelete.add(key));
        
        // Clean up tag mappings
        await this.redis.del(reverseTagKey);
      }
      
      // Delete all affected keys
      if (keysToDelete.size > 0) {
        const pipeline = this.redis.pipeline();
        Array.from(keysToDelete).forEach(key => {
          pipeline.del(key);
          pipeline.del(this.getMetadataKey(key));
          pipeline.del(this.getTagKey(key));
        });
        
        await pipeline.exec();
        console.log(`Invalidated ${keysToDelete.size} cache keys by tags: ${tags.join(', ')}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error invalidating cache by tags:', error);
      return false;
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache(warmingStrategy) {
    if (!this.redis) return false;

    try {
      const { elections, users, analytics } = warmingStrategy;
      
      if (elections) {
        await this.warmElectionCache(elections);
      }
      
      if (users) {
        await this.warmUserCache(users);
      }
      
      if (analytics) {
        await this.warmAnalyticsCache(analytics);
      }
      
      console.log('Cache warming completed');
      return true;
    } catch (error) {
      console.error('Error warming cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.redis) return null;

    try {
      const info = await this.redis.info();
      const keyspace = await this.redis.info('keyspace');
      
      // Parse Redis info
      const stats = this.parseRedisInfo(info);
      const keyspaceStats = this.parseKeyspaceInfo(keyspace);
      
      // Get cache hit/miss statistics
      const hitStats = await this.getHitMissStats();
      
      return {
        redis: stats,
        keyspace: keyspaceStats,
        performance: hitStats,
        memory: await this.getMemoryStats(),
        keys: await this.getKeyStats()
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache() {
    if (!this.redis) return false;

    try {
      // Analyze cache usage patterns
      const usagePatterns = await this.analyzeCacheUsage();
      
      // Optimize TTL based on access patterns
      await this.optimizeTTL(usagePatterns);
      
      // Clean up expired keys
      await this.cleanupExpiredKeys();
      
      // Optimize memory usage
      await this.optimizeMemory();
      
      console.log('Cache optimization completed');
      return true;
    } catch (error) {
      console.error('Error optimizing cache:', error);
      return false;
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck() {
    if (!this.redis) {
      return {
        status: 'unhealthy',
        message: 'Redis not connected',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Redis responding normally',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Helper methods

  /**
   * Set cache metadata
   */
  async setCacheMetadata(key, metadata) {
    if (!this.redis) return;
    
    try {
      const metadataKey = this.getMetadataKey(key);
      await this.redis.setex(metadataKey, 86400, JSON.stringify(metadata)); // 24 hours
    } catch (error) {
      console.error('Error setting cache metadata:', error);
    }
  }

  /**
   * Get metadata key
   */
  getMetadataKey(key) {
    return `meta:${key}`;
  }

  /**
   * Get tag key
   */
  getTagKey(key) {
    return `tags:${key}`;
  }

  /**
   * Get reverse tag key
   */
  getReverseTagKey(tag) {
    return `tag:${tag}:keys`;
  }

  /**
   * Update access metadata
   */
  async updateAccessMetadata(key) {
    if (!this.redis) return;
    
    try {
      const metadataKey = this.getMetadataKey(key);
      const metadata = await this.redis.get(metadataKey);
      
      if (metadata) {
        const parsed = JSON.parse(metadata);
        parsed.accessCount = (parsed.accessCount || 0) + 1;
        parsed.lastAccessed = Date.now();
        
        await this.redis.setex(metadataKey, 86400, JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Error updating access metadata:', error);
    }
  }

  /**
   * Delete cache metadata
   */
  async deleteCacheMetadata(key) {
    if (!this.redis) return;
    
    try {
      const metadataKey = this.getMetadataKey(key);
      await this.redis.del(metadataKey);
    } catch (error) {
      console.error('Error deleting cache metadata:', error);
    }
  }

  /**
   * Increment cache hit
   */
  async incrementCacheHit(key) {
    if (!this.redis) return;
    
    try {
      await this.redis.hincrby('cache:stats:hits', 'total', 1);
      await this.redis.hincrby('cache:stats:hits', key, 1);
    } catch (error) {
      console.error('Error incrementing cache hit:', error);
    }
  }

  /**
   * Increment cache miss
   */
  async incrementCacheMiss(key) {
    if (!this.redis) return;
    
    try {
      await this.redis.hincrby('cache:stats:misses', 'total', 1);
      await this.redis.hincrby('cache:stats:misses', key, 1);
    } catch (error) {
      console.error('Error incrementing cache miss:', error);
    }
  }

  /**
   * Get hit/miss statistics
   */
  async getHitMissStats() {
    if (!this.redis) return {};

    try {
      const [hits, misses] = await Promise.all([
        this.redis.hgetall('cache:stats:hits'),
        this.redis.hgetall('cache:stats:misses')
      ]);
      
      const totalHits = parseInt(hits.total || 0);
      const totalMisses = parseInt(misses.total || 0);
      const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;
      
      return {
        hits: totalHits,
        misses: totalMisses,
        hitRate: Math.round(hitRate * 100) / 100,
        total: totalHits + totalMisses
      };
    } catch (error) {
      console.error('Error getting hit/miss stats:', error);
      return {};
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    if (!this.redis) return {};

    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');
      const memoryStats = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryStats[key] = value;
        }
      });
      
      return {
        usedMemory: memoryStats.used_memory_human,
        usedMemoryPeak: memoryStats.used_memory_peak_human,
        usedMemoryRss: memoryStats.used_memory_rss_human,
        memFragmentationRatio: memoryStats.mem_fragmentation_ratio
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return {};
    }
  }

  /**
   * Get key statistics
   */
  async getKeyStats() {
    if (!this.redis) return {};

    try {
      const dbInfo = await this.redis.info('keyspace');
      const lines = dbInfo.split('\r\n');
      let totalKeys = 0;
      
      lines.forEach(line => {
        if (line.includes('keys=')) {
          const match = line.match(/keys=(\d+)/);
          if (match) {
            totalKeys += parseInt(match[1]);
          }
        }
      });
      
      return {
        totalKeys,
        databases: lines.filter(line => line.startsWith('db')).length
      };
    } catch (error) {
      console.error('Error getting key stats:', error);
      return {};
    }
  }

  /**
   * Parse Redis info
   */
  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const stats = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    });
    
    return stats;
  }

  /**
   * Parse keyspace info
   */
  parseKeyspaceInfo(info) {
    const lines = info.split('\r\n');
    const keyspace = {};
    
    lines.forEach(line => {
      if (line.startsWith('db')) {
        const [db, ...pairs] = line.split(',');
        const dbStats = {};
        
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          dbStats[key] = parseInt(value);
        });
        
        keyspace[db] = dbStats;
      }
    });
    
    return keyspace;
  }

  /**
   * Persist to database (for write-behind strategy)
   */
  async persistToDatabase(key, value) {
    // This would typically persist to the main database
    // For demo purposes, we'll just log it
    console.log(`Persisting to database: ${key}`);
  }

  /**
   * Warm election cache
   */
  async warmElectionCache(elections) {
    // Implementation for warming election-related cache
    console.log('Warming election cache...');
  }

  /**
   * Warm user cache
   */
  async warmUserCache(users) {
    // Implementation for warming user-related cache
    console.log('Warming user cache...');
  }

  /**
   * Warm analytics cache
   */
  async warmAnalyticsCache(analytics) {
    // Implementation for warming analytics cache
    console.log('Warming analytics cache...');
  }

  /**
   * Analyze cache usage patterns
   */
  async analyzeCacheUsage() {
    // Implementation for analyzing cache usage patterns
    return {};
  }

  /**
   * Optimize TTL based on usage patterns
   */
  async optimizeTTL(usagePatterns) {
    // Implementation for TTL optimization
    console.log('Optimizing TTL...');
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys() {
    // Implementation for cleaning up expired keys
    console.log('Cleaning up expired keys...');
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory() {
    // Implementation for memory optimization
    console.log('Optimizing memory...');
  }
}

module.exports = CacheService;
