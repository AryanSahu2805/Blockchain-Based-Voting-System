const FraudDetectionService = require('../services/fraudDetectionService');
const PredictiveAnalyticsService = require('../services/predictiveAnalyticsService');
const AuditLog = require('../models/AuditLog');
const Election = require('../models/Election');
const User = require('../models/User');

class AnalyticsController {
  constructor() {
    this.fraudDetectionService = new FraudDetectionService();
    this.predictiveAnalyticsService = new PredictiveAnalyticsService();
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getAnalyticsDashboard(req, res) {
    try {
      const { timeRange = '24h', electionId } = req.query;
      
      const dashboardData = {
        timestamp: new Date().toISOString(),
        timeRange,
        overview: await this.getSystemOverview(),
        elections: await this.getElectionAnalytics(electionId),
        fraud: await this.getFraudAnalytics(timeRange),
        predictions: electionId ? await this.getPredictions(electionId) : null,
        trends: await this.getSystemTrends(timeRange),
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate analytics dashboard',
        details: error.message
      });
    }
  }

  /**
   * Get system overview statistics
   */
  async getSystemOverview() {
    try {
      const [
        totalUsers,
        totalElections,
        totalVotes,
        activeElections,
        recentActivity
      ] = await Promise.all([
        User.countDocuments(),
        Election.countDocuments(),
        AuditLog.countDocuments({ eventType: 'VOTE_CAST' }),
        Election.countDocuments({ 
          startTime: { $lte: new Date() },
          endTime: { $gte: new Date() }
        }),
        AuditLog.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      return {
        users: {
          total: totalUsers,
          active: await this.getActiveUsersCount(),
          newThisWeek: await this.getNewUsersCount(7)
        },
        elections: {
          total: totalElections,
          active: activeElections,
          completed: totalElections - activeElections
        },
        voting: {
          totalVotes,
          votesToday: await this.getVotesCount(1),
          votesThisWeek: await this.getVotesCount(7)
        },
        activity: {
          last24Hours: recentActivity,
          lastWeek: await this.getActivityCount(7),
          lastMonth: await this.getActivityCount(30)
        }
      };
    } catch (error) {
      console.error('Error getting system overview:', error);
      throw error;
    }
  }

  /**
   * Get election-specific analytics
   */
  async getElectionAnalytics(electionId) {
    try {
      if (!electionId) {
        // Return summary for all elections
        return await this.getAllElectionsSummary();
      }

      // Return detailed analytics for specific election
      const election = await Election.findById(electionId);
      if (!election) {
        throw new Error('Election not found');
      }

      const votingData = await this.getElectionVotingData(electionId);
      const fraudAnalysis = await this.fraudDetectionService.analyzeVotingPatterns(electionId);
      const predictions = await this.predictiveAnalyticsService.predictElectionOutcome(electionId);

      return {
        election: {
          id: election._id,
          title: election.title,
          status: election.status,
          startTime: election.startTime,
          endTime: election.endTime
        },
        voting: votingData,
        fraud: fraudAnalysis,
        predictions,
        insights: this.generateElectionInsights(votingData, fraudAnalysis, predictions)
      };
    } catch (error) {
      console.error('Error getting election analytics:', error);
      throw error;
    }
  }

  /**
   * Get fraud analytics
   */
  async getFraudAnalytics(timeRange) {
    try {
      const timeWindow = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeWindow);

      // Get fraud-related events
      const fraudEvents = await AuditLog.find({
        eventType: {
          $in: [
            'AUTH_FAILURE',
            'VOTING_RATE_LIMIT_EXCEEDED',
            'CORS_VIOLATION',
            'INPUT_SANITIZATION_ERROR',
            'INVALID_TRANSACTION_HASH',
            'INVALID_SIGNATURE',
            'BLOCKED_IP_ACCESS',
            'SUSPICIOUS_IP_DETECTED'
          ]
        },
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 });

      // Analyze fraud patterns
      const fraudAnalysis = {
        totalEvents: fraudEvents.length,
        eventsByType: this.groupEventsByType(fraudEvents),
        eventsBySeverity: this.groupEventsBySeverity(fraudEvents),
        topSuspiciousIPs: this.getTopSuspiciousIPs(fraudEvents),
        riskTrends: await this.analyzeRiskTrends(fraudEvents),
        recommendations: this.generateFraudRecommendations(fraudEvents)
      };

      return fraudAnalysis;
    } catch (error) {
      console.error('Error getting fraud analytics:', error);
      throw error;
    }
  }

  /**
   * Get predictions for specific election
   */
  async getPredictions(electionId) {
    try {
      const predictions = await this.predictiveAnalyticsService.predictElectionOutcome(electionId);
      
      return {
        electionId,
        timestamp: new Date().toISOString(),
        predictions: predictions.predictions,
        trends: predictions.trends,
        factors: predictions.factors,
        confidence: predictions.predictions.confidence
      };
    } catch (error) {
      console.error('Error getting predictions:', error);
      throw error;
    }
  }

  /**
   * Get system-wide trends
   */
  async getSystemTrends(timeRange) {
    try {
      const timeWindow = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeWindow);

      const trends = {
        userGrowth: await this.analyzeUserGrowth(startTime),
        votingPatterns: await this.analyzeVotingPatterns(startTime),
        systemUsage: await this.analyzeSystemUsage(startTime),
        securityEvents: await this.analyzeSecurityEvents(startTime)
      };

      return trends;
    } catch (error) {
      console.error('Error getting system trends:', error);
      throw error;
    }
  }

  /**
   * Get fraud detection report
   */
  async getFraudReport(req, res) {
    try {
      const { electionId, timeRange = '24h' } = req.query;
      
      if (!electionId) {
        return res.status(400).json({
          success: false,
          error: 'Election ID is required'
        });
      }

      const report = await this.fraudDetectionService.generateFraudReport(electionId, timeRange);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating fraud report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate fraud report',
        details: error.message
      });
    }
  }

  /**
   * Get predictive analytics report
   */
  async getPredictiveReport(req, res) {
    try {
      const { electionId } = req.query;
      
      if (!electionId) {
        return res.status(400).json({
          success: false,
          error: 'Election ID is required'
        });
      }

      const predictions = await this.predictiveAnalyticsService.predictElectionOutcome(electionId);
      
      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      console.error('Error generating predictive report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate predictive report',
        details: error.message
      });
    }
  }

  /**
   * Get real-time fraud detection for voting
   */
  async detectFraudRealTime(req, res) {
    try {
      const voteData = req.body;
      
      if (!voteData.electionId || !voteData.walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Election ID and wallet address are required'
        });
      }

      // Add IP address from request
      voteData.ip = req.ip;
      
      const fraudDetection = await this.fraudDetectionService.detectFraudInRealTime(voteData);
      
      res.json({
        success: true,
        data: fraudDetection
      });
    } catch (error) {
      console.error('Error in real-time fraud detection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform fraud detection',
        details: error.message
      });
    }
  }

  // Helper methods

  /**
   * Get active users count
   */
  async getActiveUsersCount() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    });
  }

  /**
   * Get new users count
   */
  async getNewUsersCount(days) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await User.countDocuments({
      createdAt: { $gte: startDate }
    });
  }

  /**
   * Get votes count for specified days
   */
  async getVotesCount(days) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await AuditLog.countDocuments({
      eventType: 'VOTE_CAST',
      timestamp: { $gte: startDate }
    });
  }

  /**
   * Get activity count for specified days
   */
  async getActivityCount(days) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await AuditLog.countDocuments({
      timestamp: { $gte: startDate }
    });
  }

  /**
   * Get all elections summary
   */
  async getAllElectionsSummary() {
    const elections = await Election.find().select('title status startTime endTime');
    
    const summary = {
      total: elections.length,
      byStatus: {},
      byTimeframe: {
        upcoming: 0,
        active: 0,
        completed: 0
      }
    };

    const now = new Date();
    
    elections.forEach(election => {
      // Count by status
      summary.byStatus[election.status] = (summary.byStatus[election.status] || 0) + 1;
      
      // Count by timeframe
      if (election.startTime > now) {
        summary.byTimeframe.upcoming++;
      } else if (election.endTime > now) {
        summary.byTimeframe.active++;
      } else {
        summary.byTimeframe.completed++;
      }
    });

    return summary;
  }

  /**
   * Get election voting data
   */
  async getElectionVotingData(electionId) {
    const votingEvents = await AuditLog.find({
      eventType: 'VOTE_CAST',
      'details.electionId': electionId
    }).sort({ timestamp: 1 });

    const totalVotes = votingEvents.length;
    const uniqueVoters = new Set(votingEvents.map(e => e.walletAddress)).size;
    
    // Calculate hourly distribution
    const hourlyDistribution = {};
    votingEvents.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    return {
      totalVotes,
      uniqueVoters,
      hourlyDistribution,
      averageVotesPerHour: totalVotes / 24,
      peakHour: this.findPeakHour(hourlyDistribution)
    };
  }

  /**
   * Find peak voting hour
   */
  findPeakHour(hourlyDistribution) {
    let peakHour = 0;
    let peakVotes = 0;
    
    Object.entries(hourlyDistribution).forEach(([hour, votes]) => {
      if (votes > peakVotes) {
        peakVotes = votes;
        peakHour = parseInt(hour);
      }
    });
    
    return { hour: peakHour, votes: peakVotes };
  }

  /**
   * Generate election insights
   */
  generateElectionInsights(votingData, fraudAnalysis, predictions) {
    const insights = [];
    
    // Voting insights
    if (votingData.totalVotes > 100) {
      insights.push({
        type: 'HIGH_ENGAGEMENT',
        description: 'High voter engagement with significant participation',
        confidence: 0.8
      });
    }
    
    // Fraud insights
    if (fraudAnalysis.riskLevel === 'HIGH' || fraudAnalysis.riskLevel === 'CRITICAL') {
      insights.push({
        type: 'FRAUD_RISK',
        description: 'Elevated fraud risk detected - review recommended',
        confidence: fraudAnalysis.riskScore,
        priority: 'HIGH'
      });
    }
    
    // Prediction insights
    if (predictions && predictions.predictions.outcome.confidence > 0.7) {
      insights.push({
        type: 'STRONG_PREDICTION',
        description: 'High confidence in outcome prediction',
        confidence: predictions.predictions.outcome.confidence
      });
    }
    
    return insights;
  }

  /**
   * Parse time range string
   */
  parseTimeRange(timeRange) {
    const multipliers = {
      '1h': 3600000,
      '6h': 21600000,
      '12h': 43200000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    };

    return multipliers[timeRange] || 86400000; // Default to 24h
  }

  /**
   * Group events by type
   */
  groupEventsByType(events) {
    const grouped = {};
    events.forEach(event => {
      grouped[event.eventType] = (grouped[event.eventType] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Group events by severity
   */
  groupEventsBySeverity(events) {
    const grouped = {};
    events.forEach(event => {
      grouped[event.severity] = (grouped[event.severity] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Get top suspicious IPs
   */
  getTopSuspiciousIPs(events) {
    const ipCounts = {};
    events.forEach(event => {
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    });
    
    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  }

  /**
   * Analyze risk trends
   */
  async analyzeRiskTrends(events) {
    if (events.length === 0) return { trend: 'STABLE', confidence: 0.5 };
    
    // Group by day and calculate daily risk scores
    const dailyRisk = {};
    events.forEach(event => {
      const day = event.timestamp.toDateString();
      if (!dailyRisk[day]) {
        dailyRisk[day] = { events: [], totalRisk: 0 };
      }
      dailyRisk[day].events.push(event);
      dailyRisk[day].totalRisk += this.getEventRiskScore(event);
    });
    
    // Calculate trend
    const days = Object.keys(dailyRisk).sort();
    const riskScores = days.map(day => dailyRisk[day].totalRisk);
    
    const trend = this.calculateLinearTrend(riskScores);
    
    return {
      trend: trend > 0.1 ? 'INCREASING' : trend < -0.1 ? 'DECREASING' : 'STABLE',
      confidence: Math.abs(trend),
      dailyRisk
    };
  }

  /**
   * Get event risk score
   */
  getEventRiskScore(event) {
    const severityScores = {
      'LOW': 1,
      'MEDIUM': 3,
      'HIGH': 7,
      'CRITICAL': 10
    };
    
    return severityScores[event.severity] || 1;
  }

  /**
   * Calculate linear trend
   */
  calculateLinearTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((a, b, i) => a + (b * i), 0);
    const sumX2 = data.reduce((a, b, i) => a + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  /**
   * Generate fraud recommendations
   */
  generateFraudRecommendations(events) {
    const recommendations = [];
    
    if (events.length > 10) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implement additional security measures',
        description: 'High number of security events detected'
      });
    }
    
    const highSeverityEvents = events.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL');
    if (highSeverityEvents.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Immediate security review required',
        description: `${highSeverityEvents.length} high-severity security events detected`
      });
    }
    
    return recommendations;
  }

  /**
   * Analyze user growth
   */
  async analyzeUserGrowth(startTime) {
    const users = await User.find({
      createdAt: { $gte: startTime }
    }).sort({ createdAt: 1 });
    
    // Group by day
    const dailyGrowth = {};
    users.forEach(user => {
      const day = user.createdAt.toDateString();
      dailyGrowth[day] = (dailyGrowth[day] || 0) + 1;
    });
    
    const days = Object.keys(dailyGrowth).sort();
    const counts = days.map(day => dailyGrowth[day]);
    
    const trend = this.calculateLinearTrend(counts);
    
    return {
      totalNewUsers: users.length,
      dailyGrowth,
      trend: trend > 0.1 ? 'GROWING' : trend < -0.1 ? 'DECLINING' : 'STABLE',
      confidence: Math.abs(trend)
    };
  }

  /**
   * Analyze voting patterns
   */
  async analyzeVotingPatterns(startTime) {
    const votes = await AuditLog.find({
      eventType: 'VOTE_CAST',
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 });
    
    // Group by hour
    const hourlyPatterns = {};
    votes.forEach(vote => {
      const hour = vote.timestamp.getHours();
      hourlyPatterns[hour] = (hourlyPatterns[hour] || 0) + 1;
    });
    
    return {
      totalVotes: votes.length,
      hourlyPatterns,
      peakHour: this.findPeakHour(hourlyPatterns)
    };
  }

  /**
   * Analyze system usage
   */
  async analyzeSystemUsage(startTime) {
    const events = await AuditLog.find({
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 });
    
    // Group by event type
    const eventTypes = {};
    events.forEach(event => {
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
    });
    
    return {
      totalEvents: events.length,
      eventTypes,
      mostCommonEvent: Object.entries(eventTypes)
        .sort(([,a], [,b]) => b - a)[0]
    };
  }

  /**
   * Analyze security events
   */
  async analyzeSecurityEvents(startTime) {
    const securityEvents = await AuditLog.find({
      eventType: {
        $in: [
          'AUTH_FAILURE',
          'VOTING_RATE_LIMIT_EXCEEDED',
          'CORS_VIOLATION',
          'INPUT_SANITIZATION_ERROR'
        ]
      },
      timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 });
    
    return {
      totalEvents: securityEvents.length,
      byType: this.groupEventsByType(securityEvents),
      bySeverity: this.groupEventsBySeverity(securityEvents),
      riskLevel: this.calculateOverallRiskLevel(securityEvents)
    };
  }

  /**
   * Calculate overall risk level
   */
  calculateOverallRiskLevel(events) {
    if (events.length === 0) return 'LOW';
    
    const totalRisk = events.reduce((sum, event) => sum + this.getEventRiskScore(event), 0);
    const averageRisk = totalRisk / events.length;
    
    if (averageRisk > 7) return 'CRITICAL';
    if (averageRisk > 5) return 'HIGH';
    if (averageRisk > 3) return 'MEDIUM';
    return 'LOW';
  }
}

module.exports = AnalyticsController;
