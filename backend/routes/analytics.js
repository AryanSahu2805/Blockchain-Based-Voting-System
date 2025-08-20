const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const analyticsController = new AnalyticsController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/analytics/dashboard
 * @desc Get comprehensive analytics dashboard
 * @access Private (Admin, Analytics)
 */
router.get('/dashboard', 
  requireRole(['admin', 'analytics']), 
  analyticsController.getAnalyticsDashboard.bind(analyticsController)
);

/**
 * @route GET /api/analytics/fraud-report
 * @desc Get fraud detection report for specific election
 * @access Private (Admin, Security)
 */
router.get('/fraud-report', 
  requireRole(['admin', 'security']), 
  analyticsController.getFraudReport.bind(analyticsController)
);

/**
 * @route GET /api/analytics/predictive-report
 * @desc Get predictive analytics report for specific election
 * @access Private (Admin, Analytics)
 */
router.get('/predictive-report', 
  requireRole(['admin', 'analytics']), 
  analyticsController.getPredictiveReport.bind(analyticsController)
);

/**
 * @route POST /api/analytics/fraud-detection
 * @desc Perform real-time fraud detection for voting
 * @access Private (All authenticated users)
 */
router.post('/fraud-detection', 
  analyticsController.detectFraudRealTime.bind(analyticsController)
);

/**
 * @route GET /api/analytics/system-overview
 * @desc Get system overview statistics
 * @access Private (Admin, Analytics)
 */
router.get('/system-overview', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const overview = await analyticsController.getSystemOverview();
      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get system overview',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/election/:electionId
 * @desc Get detailed analytics for specific election
 * @access Private (Admin, Analytics)
 */
router.get('/election/:electionId', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { electionId } = req.params;
      const analytics = await analyticsController.getElectionAnalytics(electionId);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get election analytics',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/fraud-analytics
 * @desc Get fraud analytics for specified time range
 * @access Private (Admin, Security)
 */
router.get('/fraud-analytics', 
  requireRole(['admin', 'security']), 
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const fraudAnalytics = await analyticsController.getFraudAnalytics(timeRange);
      
      res.json({
        success: true,
        data: fraudAnalytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get fraud analytics',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/predictions/:electionId
 * @desc Get predictions for specific election
 * @access Private (Admin, Analytics)
 */
router.get('/predictions/:electionId', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { electionId } = req.params;
      const predictions = await analyticsController.getPredictions(electionId);
      
      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get predictions',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/trends
 * @desc Get system-wide trends
 * @access Private (Admin, Analytics)
 */
router.get('/trends', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const trends = await analyticsController.getSystemTrends(timeRange);
      
      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get system trends',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/security-events
 * @desc Get security events summary
 * @access Private (Admin, Security)
 */
router.get('/security-events', 
  requireRole(['admin', 'security']), 
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const timeWindow = analyticsController.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeWindow);
      
      const securityEvents = await analyticsController.analyzeSecurityEvents(startTime);
      
      res.json({
        success: true,
        data: securityEvents
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get security events',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/user-growth
 * @desc Get user growth analytics
 * @access Private (Admin, Analytics)
 */
router.get('/user-growth', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const timeWindow = analyticsController.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeWindow);
      
      const userGrowth = await analyticsController.analyzeUserGrowth(startTime);
      
      res.json({
        success: true,
        data: userGrowth
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user growth analytics',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/voting-patterns
 * @desc Get voting pattern analytics
 * @access Private (Admin, Analytics)
 */
router.get('/voting-patterns', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { timeRange = '7d' } = req.query;
      const timeWindow = analyticsController.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeWindow);
      
      const votingPatterns = await analyticsController.analyzeVotingPatterns(startTime);
      
      res.json({
        success: true,
        data: votingPatterns
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get voting pattern analytics',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/system-usage
 * @desc Get system usage analytics
 * @access Private (Admin, Analytics)
 */
router.get('/system-usage', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const timeWindow = analyticsController.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeWindow);
      
      const systemUsage = await analyticsController.analyzeSystemUsage(startTime);
      
      res.json({
        success: true,
        data: systemUsage
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get system usage analytics',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/analytics/export/:type
 * @desc Export analytics data in various formats
 * @access Private (Admin, Analytics)
 */
router.get('/export/:type', 
  requireRole(['admin', 'analytics']), 
  async (req, res) => {
    try {
      const { type } = req.params;
      const { format = 'json', timeRange = '24h' } = req.query;
      
      let data;
      switch (type) {
        case 'fraud':
          data = await analyticsController.getFraudAnalytics(timeRange);
          break;
        case 'predictions':
          data = await analyticsController.getPredictions(req.query.electionId);
          break;
        case 'trends':
          data = await analyticsController.getSystemTrends(timeRange);
          break;
        case 'overview':
          data = await analyticsController.getSystemOverview();
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid export type'
          });
      }
      
      // Set appropriate headers for export
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${Date.now()}.csv"`);
        // Convert data to CSV format
        const csv = convertToCSV(data);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${Date.now()}.json"`);
        res.json(data);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics data',
        details: error.message
      });
    }
  }
);

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data) {
  // Simple CSV conversion - in production, use a proper CSV library
  if (typeof data === 'object' && data !== null) {
    const rows = [];
    
    // Add headers
    const headers = Object.keys(data);
    rows.push(headers.join(','));
    
    // Add data row
    const values = headers.map(header => {
      const value = data[header];
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    rows.push(values.join(','));
    
    return rows.join('\n');
  }
  
  return String(data);
}

module.exports = router;
