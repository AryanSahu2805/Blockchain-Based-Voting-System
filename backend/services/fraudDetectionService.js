const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const Election = require('../models/Election');
const User = require('../models/User');

class FraudDetectionService {
  constructor() {
    this.anomalyThresholds = {
      votingSpeed: 0.8,        // Z-score threshold for voting speed anomalies
      geographicClustering: 0.7, // Threshold for geographic clustering
      timePatterns: 0.6,       // Threshold for time-based patterns
      walletBehavior: 0.75,    // Threshold for wallet behavior anomalies
      networkActivity: 0.65    // Threshold for network activity patterns
    };
    
    this.mlModels = {
      votingPattern: null,
      userBehavior: null,
      networkAnalysis: null
    };
    
    this.initializeModels();
  }

  /**
   * Initialize ML models
   */
  async initializeModels() {
    try {
      // In production, load pre-trained models
      // For demo, we'll use statistical analysis
      console.log('✅ Fraud detection models initialized');
    } catch (error) {
      console.error('❌ Failed to initialize fraud detection models:', error);
    }
  }

  /**
   * Analyze voting patterns for fraud detection
   */
  async analyzeVotingPatterns(electionId, timeWindow = 3600000) { // 1 hour default
    try {
      const startTime = new Date(Date.now() - timeWindow);
      
      // Get voting data from audit logs
      const votingEvents = await AuditLog.find({
        eventType: 'VOTE_CAST',
        'details.electionId': electionId,
        timestamp: { $gte: startTime }
      }).sort({ timestamp: 1 });

      if (votingEvents.length < 10) {
        return { risk: 'LOW', confidence: 0.9, reason: 'Insufficient data for analysis' };
      }

      const analysis = {
        totalVotes: votingEvents.length,
        timeDistribution: this.analyzeTimeDistribution(votingEvents),
        geographicDistribution: await this.analyzeGeographicDistribution(votingEvents),
        walletBehavior: await this.analyzeWalletBehavior(votingEvents),
        networkPatterns: await this.analyzeNetworkPatterns(votingEvents),
        riskScore: 0,
        anomalies: [],
        recommendations: []
      };

      // Calculate overall risk score
      analysis.riskScore = this.calculateRiskScore(analysis);
      analysis.riskLevel = this.getRiskLevel(analysis.riskScore);
      
      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing voting patterns:', error);
      throw error;
    }
  }

  /**
   * Analyze time distribution of votes
   */
  analyzeTimeDistribution(votingEvents) {
    const timeSlots = {};
    const hourInMs = 3600000;
    
    // Group votes by hour
    votingEvents.forEach(event => {
      const hour = Math.floor(event.timestamp.getTime() / hourInMs);
      timeSlots[hour] = (timeSlots[hour] || 0) + 1;
    });

    // Calculate statistics
    const values = Object.values(timeSlots);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies (bursts of voting)
    const anomalies = values.filter(v => Math.abs(v - mean) > this.anomalyThresholds.votingSpeed * stdDev);

    return {
      distribution: timeSlots,
      statistics: { mean, variance, stdDev },
      anomalies: anomalies.length,
      risk: anomalies.length > 0 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Analyze geographic distribution of votes
   */
  async analyzeGeographicDistribution(votingEvents) {
    try {
      const locations = {};
      const ipAddresses = [...new Set(votingEvents.map(e => e.ip))];

      // Group by IP addresses (simplified geographic analysis)
      ipAddresses.forEach(ip => {
        const votesFromIP = votingEvents.filter(e => e.ip === ip).length;
        locations[ip] = votesFromIP;
      });

      // Calculate clustering score
      const totalVotes = votingEvents.length;
      const uniqueIPs = Object.keys(locations).length;
      const clusteringScore = uniqueIPs / totalVotes;

      // Detect potential bot networks
      const suspiciousIPs = Object.entries(locations)
        .filter(([ip, count]) => count > totalVotes * 0.1) // More than 10% of votes from single IP
        .map(([ip, count]) => ({ ip, count, risk: 'HIGH' }));

      return {
        locations,
        clusteringScore,
        suspiciousIPs,
        risk: suspiciousIPs.length > 0 ? 'HIGH' : clusteringScore < 0.3 ? 'MEDIUM' : 'LOW'
      };
    } catch (error) {
      console.error('Error analyzing geographic distribution:', error);
      return { risk: 'UNKNOWN', error: error.message };
    }
  }

  /**
   * Analyze wallet behavior patterns
   */
  async analyzeWalletBehavior(votingEvents) {
    try {
      const walletStats = {};
      
      // Group by wallet address
      votingEvents.forEach(event => {
        const wallet = event.walletAddress;
        if (!wallet) return;

        if (!walletStats[wallet]) {
          walletStats[wallet] = {
            voteCount: 0,
            firstVote: event.timestamp,
            lastVote: event.timestamp,
            timeBetweenVotes: [],
            totalVotes: 0
          };
        }

        walletStats[wallet].voteCount++;
        walletStats[wallet].lastVote = event.timestamp;
        
        if (walletStats[wallet].voteCount > 1) {
          const timeDiff = event.timestamp - walletStats[wallet].lastVote;
          walletStats[wallet].timeBetweenVotes.push(timeDiff);
        }
      });

      // Analyze suspicious patterns
      const suspiciousWallets = [];
      Object.entries(walletStats).forEach(([wallet, stats]) => {
        const anomalies = [];

        // Multiple votes in short time
        if (stats.voteCount > 1) {
          const avgTimeBetween = stats.timeBetweenVotes.reduce((a, b) => a + b, 0) / stats.timeBetweenVotes.length;
          if (avgTimeBetween < 60000) { // Less than 1 minute between votes
            anomalies.push('RAPID_VOTING');
          }
        }

        // Unusual voting patterns
        if (stats.voteCount > 5) {
          anomalies.push('EXCESSIVE_VOTING');
        }

        if (anomalies.length > 0) {
          suspiciousWallets.push({
            wallet,
            stats,
            anomalies,
            risk: 'HIGH'
          });
        }
      });

      return {
        walletStats,
        suspiciousWallets,
        risk: suspiciousWallets.length > 0 ? 'HIGH' : 'LOW'
      };
    } catch (error) {
      console.error('Error analyzing wallet behavior:', error);
      return { risk: 'UNKNOWN', error: error.message };
    }
  }

  /**
   * Analyze network activity patterns
   */
  async analyzeNetworkPatterns(votingEvents) {
    try {
      // Analyze transaction patterns
      const networkStats = {
        transactionHashes: [],
        gasPrices: [],
        blockNumbers: [],
        networkIds: []
      };

      votingEvents.forEach(event => {
        if (event.details.transactionHash) {
          networkStats.transactionHashes.push(event.details.transactionHash);
        }
        if (event.details.gasPrice) {
          networkStats.gasPrices.push(event.details.gasPrice);
        }
        if (event.details.blockNumber) {
          networkStats.blockNumbers.push(event.details.blockNumber);
        }
        if (event.details.networkId) {
          networkStats.networkIds.push(event.details.networkId);
        }
      });

      // Detect suspicious network patterns
      const anomalies = [];

      // Check for transaction hash collisions (impossible)
      const uniqueHashes = new Set(networkStats.transactionHashes);
      if (uniqueHashes.size !== networkStats.transactionHashes.length) {
        anomalies.push('DUPLICATE_TRANSACTIONS');
      }

      // Check for unusual gas price patterns
      if (networkStats.gasPrices.length > 0) {
        const gasPrices = networkStats.gasPrices.map(gp => parseFloat(gp));
        const avgGasPrice = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;
        const suspiciousGasPrices = gasPrices.filter(gp => gp > avgGasPrice * 10);
        
        if (suspiciousGasPrices.length > 0) {
          anomalies.push('SUSPICIOUS_GAS_PRICES');
        }
      }

      // Check for network switching during voting
      const uniqueNetworks = new Set(networkStats.networkIds);
      if (uniqueNetworks.size > 1) {
        anomalies.push('NETWORK_SWITCHING');
      }

      return {
        networkStats,
        anomalies,
        risk: anomalies.length > 0 ? 'MEDIUM' : 'LOW'
      };
    } catch (error) {
      console.error('Error analyzing network patterns:', error);
      return { risk: 'UNKNOWN', error: error.message };
    }
  }

  /**
   * Calculate overall risk score
   */
  calculateRiskScore(analysis) {
    let riskScore = 0;
    let totalFactors = 0;

    // Time distribution risk
    if (analysis.timeDistribution.risk === 'HIGH') {
      riskScore += 0.3;
    } else if (analysis.timeDistribution.risk === 'MEDIUM') {
      riskScore += 0.15;
    }
    totalFactors++;

    // Geographic distribution risk
    if (analysis.geographicDistribution.risk === 'HIGH') {
      riskScore += 0.25;
    } else if (analysis.geographicDistribution.risk === 'MEDIUM') {
      riskScore += 0.125;
    }
    totalFactors++;

    // Wallet behavior risk
    if (analysis.walletBehavior.risk === 'HIGH') {
      riskScore += 0.25;
    } else if (analysis.walletBehavior.risk === 'MEDIUM') {
      riskScore += 0.125;
    }
    totalFactors++;

    // Network patterns risk
    if (analysis.networkPatterns.risk === 'HIGH') {
      riskScore += 0.2;
    } else if (analysis.networkPatterns.risk === 'MEDIUM') {
      riskScore += 0.1;
    }
    totalFactors++;

    return Math.min(1.0, riskScore);
  }

  /**
   * Get risk level based on score
   */
  getRiskLevel(riskScore) {
    if (riskScore >= 0.7) return 'CRITICAL';
    if (riskScore >= 0.5) return 'HIGH';
    if (riskScore >= 0.3) return 'MEDIUM';
    if (riskScore >= 0.1) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.timeDistribution.risk === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'TIMING',
        action: 'Implement additional rate limiting for rapid voting patterns',
        impact: 'Prevent voting bot attacks and timing-based manipulation'
      });
    }

    if (analysis.geographicDistribution.risk === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'GEOGRAPHIC',
        action: 'Investigate suspicious IP clustering and implement IP-based restrictions',
        impact: 'Prevent coordinated attacks from specific geographic locations'
      });
    }

    if (analysis.walletBehavior.risk === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'WALLET',
        action: 'Review and potentially suspend suspicious wallet addresses',
        impact: 'Prevent abuse from compromised or malicious wallets'
      });
    }

    if (analysis.networkPatterns.risk === 'HIGH') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'NETWORK',
        action: 'Monitor network switching patterns and implement additional validation',
        impact: 'Prevent cross-network manipulation attempts'
      });
    }

    // General recommendations
    if (analysis.riskScore > 0.5) {
      recommendations.push({
        priority: 'HIGH',
        category: 'GENERAL',
        action: 'Implement additional fraud detection measures and manual review',
        impact: 'Enhance overall system security and fraud prevention'
      });
    }

    return recommendations;
  }

  /**
   * Real-time fraud detection for incoming votes
   */
  async detectFraudInRealTime(voteData) {
    try {
      const fraudIndicators = [];
      let riskScore = 0;

      // Check for duplicate voting
      const existingVote = await AuditLog.findOne({
        eventType: 'VOTE_CAST',
        'details.electionId': voteData.electionId,
        walletAddress: voteData.walletAddress
      });

      if (existingVote) {
        fraudIndicators.push({
          type: 'DUPLICATE_VOTE',
          severity: 'CRITICAL',
          description: 'Wallet has already voted in this election'
        });
        riskScore += 0.8;
      }

      // Check for rapid voting
      const recentVotes = await AuditLog.find({
        eventType: 'VOTE_CAST',
        walletAddress: voteData.walletAddress,
        timestamp: { $gte: new Date(Date.now() - 300000) } // Last 5 minutes
      });

      if (recentVotes.length > 2) {
        fraudIndicators.push({
          type: 'RAPID_VOTING',
          severity: 'HIGH',
          description: 'Multiple votes in short time period'
        });
        riskScore += 0.6;
      }

      // Check for suspicious IP patterns
      const votesFromIP = await AuditLog.find({
        eventType: 'VOTE_CAST',
        ip: voteData.ip,
        timestamp: { $gte: new Date(Date.now() - 600000) } // Last 10 minutes
      });

      if (votesFromIP.length > 5) {
        fraudIndicators.push({
          type: 'IP_CLUSTERING',
          severity: 'MEDIUM',
          description: 'Multiple votes from same IP address'
        });
        riskScore += 0.4;
      }

      // Check for network manipulation
      if (voteData.networkId && voteData.previousNetworkId && voteData.networkId !== voteData.previousNetworkId) {
        fraudIndicators.push({
          type: 'NETWORK_SWITCHING',
          severity: 'MEDIUM',
          description: 'Network switching during voting process'
        });
        riskScore += 0.3;
      }

      const riskLevel = this.getRiskLevel(riskScore);
      const shouldBlock = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';

      return {
        fraudDetected: fraudIndicators.length > 0,
        riskScore,
        riskLevel,
        fraudIndicators,
        shouldBlock,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in real-time fraud detection:', error);
      return {
        fraudDetected: false,
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        error: error.message
      };
    }
  }

  /**
   * Generate fraud detection report
   */
  async generateFraudReport(electionId, timeRange = '24h') {
    try {
      const timeWindow = this.parseTimeRange(timeRange);
      const analysis = await this.analyzeVotingPatterns(electionId, timeWindow);
      
      const report = {
        electionId,
        timeRange,
        generatedAt: new Date().toISOString(),
        summary: {
          totalVotes: analysis.totalVotes,
          riskLevel: analysis.riskLevel,
          riskScore: analysis.riskScore,
          anomaliesDetected: analysis.anomalies.length
        },
        detailedAnalysis: analysis,
        recommendations: analysis.recommendations,
        metadata: {
          modelVersion: '1.0.0',
          confidence: this.calculateConfidence(analysis),
          lastUpdated: new Date().toISOString()
        }
      };

      return report;
    } catch (error) {
      console.error('Error generating fraud report:', error);
      throw error;
    }
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
   * Calculate confidence in analysis
   */
  calculateConfidence(analysis) {
    let confidence = 0.9; // Base confidence

    // Reduce confidence based on data quality
    if (analysis.totalVotes < 50) {
      confidence -= 0.2;
    }
    if (analysis.totalVotes < 20) {
      confidence -= 0.3;
    }

    // Increase confidence based on anomaly detection
    if (analysis.anomalies.length > 0) {
      confidence += 0.05;
    }

    return Math.min(0.95, Math.max(0.5, confidence));
  }
}

module.exports = FraudDetectionService;
