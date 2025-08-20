const Election = require('../models/Election');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

class PredictiveAnalyticsService {
  constructor() {
    this.models = {
      turnoutPrediction: null,
      outcomePrediction: null,
      trendAnalysis: null
    };
    
    this.featureExtractors = {
      demographic: this.extractDemographicFeatures.bind(this),
      temporal: this.extractTemporalFeatures.bind(this),
      behavioral: this.extractBehavioralFeatures.bind(this),
      network: this.extractNetworkFeatures.bind(this)
    };
    
    this.initializeModels();
  }

  /**
   * Initialize ML models
   */
  async initializeModels() {
    try {
      // In production, load pre-trained models
      // For demo, we'll use statistical analysis and heuristics
      console.log('✅ Predictive analytics models initialized');
    } catch (error) {
      console.error('❌ Failed to initialize predictive analytics models:', error);
    }
  }

  /**
   * Predict election outcome based on current data
   */
  async predictElectionOutcome(electionId) {
    try {
      const election = await Election.findById(electionId);
      if (!election) {
        throw new Error('Election not found');
      }

      // Get current voting data
      const votingData = await this.getVotingData(electionId);
      
      // Extract features for prediction
      const features = await this.extractFeatures(election, votingData);
      
      // Generate predictions
      const predictions = {
        electionId,
        timestamp: new Date().toISOString(),
        currentStats: votingData.summary,
        predictions: {
          finalTurnout: this.predictFinalTurnout(election, votingData),
          outcome: this.predictOutcome(election, votingData),
          completionTime: this.predictCompletionTime(election, votingData),
          confidence: this.calculatePredictionConfidence(votingData)
        },
        trends: await this.analyzeTrends(electionId),
        factors: this.identifyKeyFactors(features),
        metadata: {
          modelVersion: '1.0.0',
          lastUpdated: new Date().toISOString()
        }
      };

      return predictions;
    } catch (error) {
      console.error('Error predicting election outcome:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive voting data for analysis
   */
  async getVotingData(electionId) {
    try {
      const votingEvents = await AuditLog.find({
        eventType: 'VOTE_CAST',
        'details.electionId': electionId
      }).sort({ timestamp: 1 });

      const totalVotes = votingEvents.length;
      const uniqueVoters = new Set(votingEvents.map(e => e.walletAddress)).size;
      
      // Calculate voting rate over time
      const timeSlots = this.groupVotesByTime(votingEvents);
      const votingRate = this.calculateVotingRate(timeSlots);
      
      // Get candidate performance
      const candidateStats = this.analyzeCandidatePerformance(votingEvents);
      
      // Calculate engagement metrics
      const engagementMetrics = this.calculateEngagementMetrics(votingEvents);

      return {
        summary: {
          totalVotes,
          uniqueVoters,
          averageVotesPerHour: votingRate.average,
          peakVotingHour: votingRate.peakHour,
          totalCandidates: Object.keys(candidateStats).length
        },
        timeSeries: timeSlots,
        candidateStats,
        engagementMetrics,
        rawData: votingEvents
      };
    } catch (error) {
      console.error('Error getting voting data:', error);
      throw error;
    }
  }

  /**
   * Group votes by time intervals
   */
  groupVotesByTime(votingEvents, intervalMinutes = 60) {
    const timeSlots = {};
    const intervalMs = intervalMinutes * 60 * 1000;
    
    votingEvents.forEach(event => {
      const slot = Math.floor(event.timestamp.getTime() / intervalMs);
      timeSlots[slot] = (timeSlots[slot] || 0) + 1;
    });
    
    return timeSlots;
  }

  /**
   * Calculate voting rate statistics
   */
  calculateVotingRate(timeSlots) {
    const values = Object.values(timeSlots);
    const total = values.reduce((a, b) => a + b, 0);
    const average = total / values.length;
    
    let peakHour = 0;
    let peakVotes = 0;
    
    Object.entries(timeSlots).forEach(([hour, votes]) => {
      if (votes > peakVotes) {
        peakVotes = votes;
        peakHour = parseInt(hour);
      }
    });
    
    return {
      average,
      peakHour,
      peakVotes,
      total
    };
  }

  /**
   * Analyze candidate performance
   */
  analyzeCandidatePerformance(votingEvents) {
    const candidateStats = {};
    
    votingEvents.forEach(event => {
      const candidateId = event.details.candidateId;
      if (!candidateId) return;
      
      if (!candidateStats[candidateId]) {
        candidateStats[candidateId] = {
          votes: 0,
          firstVote: event.timestamp,
          lastVote: event.timestamp,
          votingTrend: []
        };
      }
      
      candidateStats[candidateId].votes++;
      candidateStats[candidateId].lastVote = event.timestamp;
      candidateStats[candidateId].votingTrend.push(event.timestamp);
    });
    
    // Calculate momentum for each candidate
    Object.values(candidateStats).forEach(stats => {
      stats.momentum = this.calculateMomentum(stats.votingTrend);
    });
    
    return candidateStats;
  }

  /**
   * Calculate voting momentum
   */
  calculateMomentum(votingTrend) {
    if (votingTrend.length < 2) return 0;
    
    const recentVotes = votingTrend.slice(-10); // Last 10 votes
    const earlyVotes = votingTrend.slice(0, Math.min(10, votingTrend.length));
    
    const recentRate = recentVotes.length / 10;
    const earlyRate = earlyVotes.length / 10;
    
    return recentRate - earlyRate; // Positive = gaining momentum
  }

  /**
   * Calculate engagement metrics
   */
  calculateEngagementMetrics(votingEvents) {
    const totalVotes = votingEvents.length;
    const uniqueVoters = new Set(votingEvents.map(e => e.walletAddress)).size;
    
    // Calculate time-based engagement
    const timeDistribution = this.analyzeTimeDistribution(votingEvents);
    
    // Calculate geographic engagement
    const geographicDistribution = this.analyzeGeographicDistribution(votingEvents);
    
    return {
      voterEngagement: uniqueVoters / totalVotes,
      timeDistribution,
      geographicDistribution,
      overallEngagement: this.calculateOverallEngagement(timeDistribution, geographicDistribution)
    };
  }

  /**
   * Analyze time distribution patterns
   */
  analyzeTimeDistribution(votingEvents) {
    const hourDistribution = {};
    
    votingEvents.forEach(event => {
      const hour = event.timestamp.getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });
    
    // Find peak voting hours
    const peakHours = Object.entries(hourDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    
    return {
      distribution: hourDistribution,
      peakHours,
      totalVotes: votingEvents.length
    };
  }

  /**
   * Analyze geographic distribution
   */
  analyzeGeographicDistribution(votingEvents) {
    const ipDistribution = {};
    
    votingEvents.forEach(event => {
      const ip = event.ip;
      ipDistribution[ip] = (ipDistribution[ip] || 0) + 1;
    });
    
    const uniqueIPs = Object.keys(ipDistribution).length;
    const totalVotes = votingEvents.length;
    
    return {
      distribution: ipDistribution,
      uniqueIPs,
      totalVotes,
      concentration: uniqueIPs / totalVotes
    };
  }

  /**
   * Calculate overall engagement score
   */
  calculateOverallEngagement(timeDistribution, geographicDistribution) {
    const timeScore = timeDistribution.peakHours.length > 0 ? 0.4 : 0.2;
    const geographicScore = geographicDistribution.concentration > 0.5 ? 0.3 : 0.6;
    const diversityScore = 0.3;
    
    return timeScore + geographicScore + diversityScore;
  }

  /**
   * Predict final voter turnout
   */
  predictFinalTurnout(election, votingData) {
    const currentTurnout = votingData.summary.uniqueVoters;
    const timeElapsed = Date.now() - election.startTime.getTime();
    const totalTime = election.endTime.getTime() - election.startTime.getTime();
    const progress = timeElapsed / totalTime;
    
    if (progress >= 1) {
      return {
        predicted: currentTurnout,
        confidence: 1.0,
        method: 'COMPLETED'
      };
    }
    
    // Use historical patterns and current trends
    const currentRate = votingData.summary.averageVotesPerHour;
    const remainingHours = (totalTime - timeElapsed) / (1000 * 60 * 60);
    const projectedAdditional = currentRate * remainingHours;
    
    const predicted = Math.round(currentTurnout + projectedAdditional);
    const confidence = Math.min(0.9, 0.5 + (progress * 0.4));
    
    return {
      predicted,
      confidence,
      method: 'TREND_ANALYSIS',
      factors: {
        currentRate,
        remainingHours,
        projectedAdditional
      }
    };
  }

  /**
   * Predict election outcome
   */
  predictOutcome(election, votingData) {
    const candidateStats = votingData.candidateStats;
    const candidates = Object.entries(candidateStats);
    
    if (candidates.length === 0) {
      return {
        winner: null,
        confidence: 0,
        method: 'NO_DATA'
      };
    }
    
    // Sort by votes and momentum
    const rankedCandidates = candidates
      .map(([id, stats]) => ({
        id,
        votes: stats.votes,
        momentum: stats.momentum,
        score: stats.votes + (stats.momentum * 10) // Weight momentum
      }))
      .sort((a, b) => b.score - a.score);
    
    const winner = rankedCandidates[0];
    const runnerUp = rankedCandidates[1];
    
    // Calculate confidence based on margin
    let confidence = 0.5;
    if (runnerUp) {
      const margin = winner.score - runnerUp.score;
      const totalScore = winner.score + runnerUp.score;
      confidence = Math.min(0.95, 0.5 + (margin / totalScore) * 0.45);
    }
    
    return {
      winner: {
        id: winner.id,
        votes: winner.votes,
        momentum: winner.momentum,
        score: winner.score
      },
      runnerUp: runnerUp ? {
        id: runnerUp.id,
        votes: runnerUp.votes,
        momentum: runnerUp.momentum,
        score: runnerUp.score
      } : null,
      confidence,
      method: 'SCORE_BASED_ANALYSIS',
      allCandidates: rankedCandidates
    };
  }

  /**
   * Predict completion time
   */
  predictCompletionTime(election, votingData) {
    const currentTime = new Date();
    const endTime = election.endTime;
    
    if (currentTime >= endTime) {
      return {
        predicted: endTime,
        confidence: 1.0,
        method: 'COMPLETED'
      };
    }
    
    // Predict based on current voting rate
    const currentRate = votingData.summary.averageVotesPerHour;
    const remainingVotes = this.estimateRemainingVotes(election, votingData);
    const estimatedHours = remainingVotes / currentRate;
    
    const predicted = new Date(currentTime.getTime() + (estimatedHours * 60 * 60 * 1000));
    const confidence = Math.min(0.8, 0.3 + (currentRate / 100) * 0.5);
    
    return {
      predicted,
      confidence,
      method: 'RATE_BASED_ESTIMATION',
      factors: {
        currentRate,
        remainingVotes,
        estimatedHours
      }
    };
  }

  /**
   * Estimate remaining votes
   */
  estimateRemainingVotes(election, votingData) {
    // Use historical data or heuristics
    const currentTurnout = votingData.summary.uniqueVoters;
    const estimatedTotalVoters = this.estimateTotalVoters(election);
    
    return Math.max(0, estimatedTotalVoters - currentTurnout);
  }

  /**
   * Estimate total potential voters
   */
  estimateTotalVoters(election) {
    // This would typically use demographic data
    // For demo, use a simple heuristic
    return Math.round(election.estimatedVoters || 1000);
  }

  /**
   * Analyze voting trends
   */
  async analyzeTrends(electionId) {
    try {
      const votingEvents = await AuditLog.find({
        eventType: 'VOTE_CAST',
        'details.electionId': electionId
      }).sort({ timestamp: 1 });
      
      if (votingEvents.length < 10) {
        return { trends: [], confidence: 0.3 };
      }
      
      const trends = [];
      
      // Analyze hourly trends
      const hourlyTrends = this.analyzeHourlyTrends(votingEvents);
      if (hourlyTrends.trend !== 'STABLE') {
        trends.push({
          type: 'HOURLY_PATTERN',
          description: `Voting shows ${hourlyTrends.trend.toLowerCase()} trend`,
          confidence: hourlyTrends.confidence,
          data: hourlyTrends
        });
      }
      
      // Analyze daily trends
      const dailyTrends = this.analyzeDailyTrends(votingEvents);
      if (dailyTrends.trend !== 'STABLE') {
        trends.push({
          type: 'DAILY_PATTERN',
          description: `Daily voting shows ${dailyTrends.trend.toLowerCase()} pattern`,
          confidence: dailyTrends.confidence,
          data: dailyTrends
        });
      }
      
      // Analyze candidate momentum
      const momentumTrends = this.analyzeCandidateMomentum(votingEvents);
      trends.push(...momentumTrends);
      
      return {
        trends,
        confidence: this.calculateTrendConfidence(trends),
        totalTrends: trends.length
      };
    } catch (error) {
      console.error('Error analyzing trends:', error);
      return { trends: [], confidence: 0, error: error.message };
    }
  }

  /**
   * Analyze hourly voting trends
   */
  analyzeHourlyTrends(votingEvents) {
    const hourlyData = {};
    
    votingEvents.forEach(event => {
      const hour = event.timestamp.getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(event.timestamp);
    });
    
    // Calculate trend
    const hours = Object.keys(hourlyData).map(Number).sort();
    const counts = hours.map(hour => hourlyData[hour].length);
    
    const trend = this.calculateLinearTrend(counts);
    
    return {
      trend: trend > 0.1 ? 'INCREASING' : trend < -0.1 ? 'DECREASING' : 'STABLE',
      confidence: Math.abs(trend),
      data: { hours, counts, hourlyData }
    };
  }

  /**
   * Analyze daily voting trends
   */
  analyzeDailyTrends(votingEvents) {
    const dailyData = {};
    
    votingEvents.forEach(event => {
      const day = event.timestamp.toDateString();
      if (!dailyData[day]) {
        dailyData[day] = [];
      }
      dailyData[day].push(event.timestamp);
    });
    
    const days = Object.keys(dailyData).sort();
    const counts = days.map(day => dailyData[day].length);
    
    const trend = this.calculateLinearTrend(counts);
    
    return {
      trend: trend > 0.1 ? 'INCREASING' : trend < -0.1 ? 'DECREASING' : 'STABLE',
      confidence: Math.abs(trend),
      data: { days, counts, dailyData }
    };
  }

  /**
   * Analyze candidate momentum trends
   */
  analyzeCandidateMomentum(votingEvents) {
    const candidateMomentum = {};
    
    // Group votes by candidate and time
    votingEvents.forEach(event => {
      const candidateId = event.details.candidateId;
      if (!candidateId) return;
      
      if (!candidateMomentum[candidateId]) {
        candidateMomentum[candidateId] = [];
      }
      candidateMomentum[candidateId].push(event.timestamp);
    });
    
    const trends = [];
    
    Object.entries(candidateMomentum).forEach(([candidateId, timestamps]) => {
      if (timestamps.length < 5) return;
      
      // Split into early and late periods
      const midPoint = Math.floor(timestamps.length / 2);
      const earlyVotes = timestamps.slice(0, midPoint);
      const lateVotes = timestamps.slice(midPoint);
      
      const earlyRate = earlyVotes.length / midPoint;
      const lateRate = lateVotes.length / (timestamps.length - midPoint);
      
      const momentum = lateRate - earlyRate;
      
      if (Math.abs(momentum) > 0.1) {
        trends.push({
          type: 'CANDIDATE_MOMENTUM',
          candidateId,
          description: `Candidate ${candidateId} shows ${momentum > 0 ? 'gaining' : 'losing'} momentum`,
          confidence: Math.abs(momentum),
          data: { earlyRate, lateRate, momentum }
        });
      }
    });
    
    return trends;
  }

  /**
   * Calculate linear trend from data points
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
   * Calculate prediction confidence
   */
  calculatePredictionConfidence(votingData) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence with more data
    if (votingData.summary.totalVotes > 100) confidence += 0.2;
    if (votingData.summary.totalVotes > 500) confidence += 0.1;
    
    // Increase confidence with consistent patterns
    if (votingData.timeSeries && Object.keys(votingData.timeSeries).length > 5) {
      confidence += 0.1;
    }
    
    // Increase confidence with engagement
    if (votingData.engagementMetrics.overallEngagement > 0.7) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Calculate trend confidence
   */
  calculateTrendConfidence(trends) {
    if (trends.length === 0) return 0.3;
    
    const avgConfidence = trends.reduce((sum, trend) => sum + trend.confidence, 0) / trends.length;
    return Math.min(0.9, avgConfidence);
  }

  /**
   * Extract features for ML models
   */
  async extractFeatures(election, votingData) {
    const features = {};
    
    // Extract different types of features
    for (const [type, extractor] of Object.entries(this.featureExtractors)) {
      try {
        features[type] = await extractor(election, votingData);
      } catch (error) {
        console.error(`Error extracting ${type} features:`, error);
        features[type] = null;
      }
    }
    
    return features;
  }

  /**
   * Extract demographic features
   */
  async extractDemographicFeatures(election, votingData) {
    // This would typically use external demographic data
    // For demo, return basic features
    return {
      totalVoters: votingData.summary.uniqueVoters,
      voterDiversity: votingData.engagementMetrics.geographicDistribution.concentration
    };
  }

  /**
   * Extract temporal features
   */
  async extractTemporalFeatures(election, votingData) {
    return {
      timeElapsed: Date.now() - election.startTime.getTime(),
      totalDuration: election.endTime.getTime() - election.startTime.getTime(),
      votingRate: votingData.summary.averageVotesPerHour,
      peakHour: votingData.summary.peakVotingHour
    };
  }

  /**
   * Extract behavioral features
   */
  async extractBehavioralFeatures(election, votingData) {
    return {
      engagement: votingData.engagementMetrics.overallEngagement,
      momentum: Object.values(votingData.candidateStats)
        .reduce((sum, stats) => sum + stats.momentum, 0) / Object.keys(votingData.candidateStats).length
    };
  }

  /**
   * Extract network features
   */
  async extractNetworkFeatures(election, votingData) {
    return {
      networkDiversity: votingData.engagementMetrics.geographicDistribution.uniqueIPs,
      concentration: votingData.engagementMetrics.geographicDistribution.concentration
    };
  }

  /**
   * Identify key factors affecting predictions
   */
  identifyKeyFactors(features) {
    const factors = [];
    
    if (features.temporal) {
      if (features.temporal.votingRate > 50) {
        factors.push({
          factor: 'HIGH_VOTING_RATE',
          impact: 'POSITIVE',
          description: 'High voting rate indicates strong engagement'
        });
      }
    }
    
    if (features.behavioral) {
      if (features.behavioral.engagement > 0.7) {
        factors.push({
          factor: 'HIGH_ENGAGEMENT',
          impact: 'POSITIVE',
          description: 'High voter engagement suggests successful election'
        });
      }
    }
    
    if (features.network) {
      if (features.network.concentration < 0.5) {
        factors.push({
          factor: 'GEOGRAPHIC_DIVERSITY',
          impact: 'POSITIVE',
          description: 'Geographic diversity indicates broad participation'
        });
      }
    }
    
    return factors;
  }
}

module.exports = PredictiveAnalyticsService;
