const User = require('../models/User');
const Election = require('../models/Election');
const { body, validationResult } = require('express-validator');

// Get system overview statistics
const getSystemOverview = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get user statistics
    const userStats = await User.getUserStats();
    const userStatsData = userStats[0] || {};

    // Get election statistics
    const electionStats = await Election.getElectionStats();
    const electionStatsData = electionStats[0] || {};

    // Get recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('walletAddress profileName createdAt');

    const recentElections = await Election.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title creator status createdAt');

    const suspendedUsers = await User.countDocuments({ 'security.isSuspended': true });
    const activeElections = await Election.countDocuments({ status: 'active' });

    const overview = {
      users: {
        total: userStatsData.totalUsers || 0,
        verified: userStatsData.verifiedUsers || 0,
        active: userStatsData.activeUsers || 0,
        suspended: suspendedUsers,
        recent: recentUsers
      },
      elections: {
        total: electionStatsData.totalElections || 0,
        active: activeElections,
        upcoming: electionStatsData.upcomingElections || 0,
        ended: electionStatsData.endedElections || 0,
        recent: recentElections
      },
      voting: {
        totalVotes: userStatsData.totalVotesCast || 0,
        avgVotesPerUser: userStatsData.avgVotesPerUser || 0
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
      }
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching system overview:', error);
    res.status(500).json({ error: 'Failed to fetch system overview' });
  }
};

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { profileName: { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'suspended') {
      filter['security.isSuspended'] = true;
    } else if (status === 'active') {
      filter['security.isSuspended'] = false;
    } else if (status === 'verified') {
      filter.isVerified = true;
    } else if (status === 'unverified') {
      filter.isVerified = false;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const users = await User.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-votingHistory -security.suspiciousActivity')
      .exec();

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user details (admin view)
const getUserDetails = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { walletAddress } = req.params;

    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// Update user (admin)
const updateUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress } = req.params;
    const updateData = req.body;

    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from modifying other admins
    if (user.isAdmin && req.user.walletAddress !== walletAddress) {
      return res.status(403).json({ error: 'Cannot modify other admin users' });
    }

    // Update allowed fields
    if (updateData.isAdmin !== undefined) {
      user.isAdmin = updateData.isAdmin;
    }

    if (updateData.isVerified !== undefined) {
      user.isVerified = updateData.isVerified;
    }

    if (updateData.profileName !== undefined) {
      user.profileName = updateData.profileName;
    }

    if (updateData.email !== undefined) {
      user.email = updateData.email;
    }

    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Get all elections with admin view
const getAllElections = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      page = 1,
      limit = 20,
      status,
      category,
      creator,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (creator) {
      filter.creator = creator;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const elections = await Election.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('creator', 'walletAddress profileName')
      .exec();

    // Get total count for pagination
    const total = await Election.countDocuments(filter);

    res.json({
      elections,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
};

// Get election details (admin view)
const getElectionDetails = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    const election = await Election.findById(id)
      .populate('creator', 'walletAddress profileName')
      .exec();

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.json(election);
  } catch (error) {
    console.error('Error fetching election details:', error);
    res.status(500).json({ error: 'Failed to fetch election details' });
  }
};

// Update election (admin)
const updateElection = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData = req.body;

    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Remove fields that shouldn't be updated
    delete updateData.creator;
    delete updateData.blockchainDetails;

    const updatedElection = await Election.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'walletAddress profileName');

    res.json(updatedElection);
  } catch (error) {
    console.error('Error updating election:', error);
    res.status(500).json({ error: 'Failed to update election' });
  }
};

// Delete election (admin)
const deleteElection = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    await Election.findByIdAndDelete(id);

    // Update user stats
    if (election.creator) {
      await User.findOneAndUpdate(
        { walletAddress: election.creator },
        { $inc: { 'stats.electionsCreated': -1 } }
      );
    }

    res.json({ message: 'Election deleted successfully' });
  } catch (error) {
    console.error('Error deleting election:', error);
    res.status(500).json({ error: 'Failed to delete election' });
  }
};

// Get system logs and activity
const getSystemLogs = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, limit = 100 } = req.query;

    let logs = [];

    if (type === 'suspicious') {
      // Get users with suspicious activity
      const users = await User.find({
        'security.suspiciousActivity': { $exists: true, $ne: [] }
      })
      .select('walletAddress profileName security.suspiciousActivity')
      .limit(parseInt(limit));

      logs = users.map(user => ({
        type: 'suspicious_activity',
        user: user.walletAddress,
        profileName: user.profileName,
        activities: user.security.suspiciousActivity
      }));
    } else if (type === 'recent') {
      // Get recent user registrations and elections
      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit / 2))
        .select('walletAddress profileName createdAt');

      const recentElections = await Election.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit / 2))
        .select('title creator status createdAt');

      logs = [
        ...recentUsers.map(user => ({
          type: 'user_registration',
          user: user.walletAddress,
          profileName: user.profileName,
          timestamp: user.createdAt
        })),
        ...recentElections.map(election => ({
          type: 'election_created',
          title: election.title,
          creator: election.creator,
          status: election.status,
          timestamp: election.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
       .slice(0, parseInt(limit));
    }

    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
};

// Get system health check
const getSystemHealth = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected', // You can add actual DB connection check here
      checks: {
        database: true,
        memory: process.memoryUsage().heapUsed < 100 * 1024 * 1024, // Less than 100MB
        uptime: process.uptime() > 0
      }
    };

    // Determine overall health
    const allChecksPassed = Object.values(health.checks).every(check => check);
    health.status = allChecksPassed ? 'healthy' : 'degraded';

    res.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
};

// Validation middleware
const validateUserUpdate = [
  body('isAdmin')
    .optional()
    .isBoolean()
    .withMessage('isAdmin must be a boolean'),
  
  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
  
  body('profileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Profile name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
];

const validateElectionUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('status')
    .optional()
    .isIn(['upcoming', 'active', 'ended', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  
  body('tags.*')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

module.exports = {
  getSystemOverview,
  getAllUsers,
  getUserDetails,
  updateUser,
  getAllElections,
  getElectionDetails,
  updateElection,
  deleteElection,
  getSystemLogs,
  getSystemHealth,
  validateUserUpdate,
  validateElectionUpdate
};
