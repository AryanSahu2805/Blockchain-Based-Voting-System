const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { 
  authenticateToken, 
  optionalAuth, 
  requireVerified,
  authRateLimit,
  verifyWalletSignature 
} = require('../middleware/auth');

// SIWE Authentication routes
router.post('/siwe/challenge', userController.createSIWEChallenge);
router.post('/siwe/verify', userController.verifySIWEChallenge);

// Legacy Authentication routes
router.get('/auth/nonce/:walletAddress', userController.getAuthNonce);
router.post('/auth/login', 
  authRateLimit,
  verifyWalletSignature,
  userController.authenticateUser
);

router.get('/search', optionalAuth, userController.searchUsers);
router.get('/top-voters', optionalAuth, userController.getTopVoters);

// Protected routes (authentication required)
router.get('/profile', authenticateToken, userController.getUserProfile);
router.get('/profile/:walletAddress', optionalAuth, userController.getUserProfile);

router.put('/profile', 
  authenticateToken, 
  requireVerified,
  userController.validateProfileUpdate,
  userController.updateUserProfile
);

router.get('/voting-history', 
  authenticateToken, 
  userController.getUserVotingHistory
);

router.get('/voting-history/:walletAddress', 
  optionalAuth, 
  userController.getUserVotingHistory
);

router.get('/stats', authenticateToken, userController.getUserStats);
router.get('/stats/:walletAddress', optionalAuth, userController.getUserStats);

// Admin routes
router.get('/admin/stats', 
  authenticateToken, 
  requireVerified,
  userController.getSystemUserStats
);

router.post('/admin/:walletAddress/suspend', 
  authenticateToken, 
  requireVerified,
  userController.suspendUser
);

router.post('/admin/:walletAddress/unsuspend', 
  authenticateToken, 
  requireVerified,
  userController.unsuspendUser
);

router.post('/admin/:walletAddress/flag-activity', 
  authenticateToken, 
  requireVerified,
  userController.flagSuspiciousActivity
);

module.exports = router;
