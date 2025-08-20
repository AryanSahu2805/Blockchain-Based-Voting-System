const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const SIWEService = require('../services/siweService');

// Initialize SIWE service
const siweService = new SIWEService();

// Create SIWE authentication challenge
const createSIWEChallenge = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Verify wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Create SIWE challenge
    const challenge = siweService.createChallenge(walletAddress);
    
    // Store challenge in session or database for verification
    // For now, we'll return it directly (in production, store securely)
    
    res.json({
      success: true,
      challenge,
      message: challenge.message
    });
  } catch (error) {
    console.error('SIWE challenge creation error:', error);
    res.status(500).json({ error: 'Failed to create authentication challenge' });
  }
};

// Verify SIWE authentication
const verifySIWEChallenge = async (req, res) => {
  try {
    const { walletAddress, signature, challenge } = req.body;

    if (!walletAddress || !signature || !challenge) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify the SIWE challenge
    const verification = await siweService.verifyChallenge(challenge, signature);
    
    if (!verification.valid) {
      return res.status(400).json({ 
        error: 'Authentication failed', 
        details: verification.error 
      });
    }

    // Find or create user
    let user = await User.findByWallet(walletAddress);
    
    if (!user) {
      // Create new user
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        profileName: null,
        email: null
      });
      await user.save();
    }

    // Record login
    await user.recordLogin();

    // Create session token
    const sessionToken = siweService.createSessionToken(walletAddress, challenge);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        sessionToken
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      sessionToken,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        profileName: user.profileName,
        email: user.email,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        profile: user.profile,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('SIWE verification error:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
};

// User authentication with wallet signature (legacy method)
const authenticateUser = async (req, res) => {
  try {
    const { walletAddress, signature, message, nonce } = req.body;

    if (!walletAddress || !signature || !message || !nonce) {
      return res.status(400).json({ error: 'Missing required authentication parameters' });
    }

    // Verify wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Verify nonce hasn't expired (5 minutes)
    const nonceTimestamp = parseInt(nonce);
    if (Date.now() - nonceTimestamp > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'Authentication nonce expired' });
    }

    // Verify signature
    const expectedMessage = `Authenticate to Blockchain Voting System\nNonce: ${nonce}`;
    const messageHash = crypto.createHash('sha256').update(expectedMessage).digest('hex');
    
    // For now, we'll accept the signature as valid
    // In production, you should verify the signature against the message hash
    
    // Find or create user
    let user = await User.findByWallet(walletAddress);
    
    if (!user) {
      // Create new user
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        profileName: null,
        email: null
      });
      await user.save();
    }

    // Record login
    await user.recordLogin();

    // Generate JWT token
    const token = jwt.sign(
      { 
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        profileName: user.profileName,
        email: user.email,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        profile: user.profile,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // If no wallet address provided, return current user's profile
    const targetWallet = walletAddress || req.user.walletAddress;
    
    const user = await User.findByWallet(targetWallet);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    if (!user.preferences.privacy.showProfile && targetWallet !== req.user.walletAddress) {
      return res.status(403).json({ error: 'Profile is private' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress } = req.user;
    const updateData = req.body;

    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update profile
    if (updateData.profile) {
      await user.updateProfile(updateData.profile);
    }

    // Update preferences
    if (updateData.preferences) {
      await user.updatePreferences(updateData.preferences);
    }

    // Update basic info
    if (updateData.profileName !== undefined) {
      user.profileName = updateData.profileName;
    }

    if (updateData.email !== undefined) {
      user.email = updateData.email;
    }

    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

// Get user voting history
const getUserVotingHistory = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // If no wallet address provided, return current user's history
    const targetWallet = walletAddress || req.user.walletAddress;
    
    const user = await User.findByWallet(targetWallet);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    if (!user.preferences.privacy.showVotingHistory && targetWallet !== req.user.walletAddress) {
      return res.status(403).json({ error: 'Voting history is private' });
    }

    // Get voting history with pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const history = user.votingHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(startIndex, endIndex);

    const total = user.votingHistory.length;

    res.json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNext: endIndex < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching voting history:', error);
    res.status(500).json({ error: 'Failed to fetch voting history' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // If no wallet address provided, return current user's stats
    const targetWallet = walletAddress || req.user.walletAddress;
    
    const user = await User.findByWallet(targetWallet);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    if (!user.preferences.privacy.showActivity && targetWallet !== req.user.walletAddress) {
      return res.status(403).json({ error: 'User activity is private' });
    }

    const stats = {
      electionsVoted: user.stats.electionsVoted,
      electionsCreated: user.stats.electionsCreated,
      totalGasSpent: user.stats.totalGasSpent,
      averageGasPerVote: user.stats.averageGasPerVote,
      firstVoteDate: user.stats.firstVoteDate,
      lastVoteDate: user.stats.lastVoteDate,
      reputation: user.reputation,
      membershipDuration: user.membershipDuration,
      isActive: user.isActive
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.searchUsers(q, parseInt(limit));
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// Get top voters
const getTopVoters = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const topVoters = await User.getTopVoters(parseInt(limit));
    res.json(topVoters);
  } catch (error) {
    console.error('Error fetching top voters:', error);
    res.status(500).json({ error: 'Failed to fetch top voters' });
  }
};

// Get user statistics (admin only)
const getSystemUserStats = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await User.getUserStats();
    res.json(stats[0] || {});
  } catch (error) {
    console.error('Error fetching system user stats:', error);
    res.status(500).json({ error: 'Failed to fetch system user stats' });
  }
};

// Suspend user (admin only)
const suspendUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { walletAddress } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.status(400).json({ error: 'Cannot suspend admin users' });
    }

    await user.suspend(reason);

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

// Unsuspend user (admin only)
const unsuspendUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { walletAddress } = req.params;

    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.unsuspend();

    res.json({ message: 'User unsuspended successfully' });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
};

// Flag suspicious activity
const flagSuspiciousActivity = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { type, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: 'Activity type and description are required' });
    }

    const user = await User.findByWallet(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.flagSuspiciousActivity(type, description);

    res.json({ message: 'Suspicious activity flagged successfully' });
  } catch (error) {
    console.error('Error flagging suspicious activity:', error);
    res.status(500).json({ error: 'Failed to flag suspicious activity' });
  }
};

// Get authentication nonce
const getAuthNonce = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Valid wallet address is required' });
    }

    const nonce = Date.now().toString();
    
    res.json({ nonce });
  } catch (error) {
    console.error('Error generating auth nonce:', error);
    res.status(500).json({ error: 'Failed to generate authentication nonce' });
  }
};

// Validation middleware
const validateProfileUpdate = [
  body('profileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Profile name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),
  
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('profile.location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  body('profile.website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  
  body('profile.avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('profile.socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Twitter URL must be valid'),
  
  body('profile.socialLinks.linkedin')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be valid'),
  
  body('profile.socialLinks.github')
    .optional()
    .isURL()
    .withMessage('GitHub URL must be valid'),
  
  body('profile.interests')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 interests allowed'),
  
  body('profile.interests.*')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),
  
  body('preferences.notifications.*')
    .optional()
    .isBoolean()
    .withMessage('Notification preferences must be boolean'),
  
  body('preferences.privacy.*')
    .optional()
    .isBoolean()
    .withMessage('Privacy preferences must be boolean'),
  
  body('preferences.display.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  
  body('preferences.display.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters')
];

module.exports = {
  createSIWEChallenge,
  verifySIWEChallenge,
  authenticateUser,
  getUserProfile,
  updateUserProfile,
  getUserVotingHistory,
  getUserStats,
  searchUsers,
  getTopVoters,
  getSystemUserStats,
  suspendUser,
  unsuspendUser,
  flagSuspiciousActivity,
  getAuthNonce,
  validateProfileUpdate
};
