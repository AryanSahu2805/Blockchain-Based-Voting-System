const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// System overview and statistics
router.get('/overview', adminController.getSystemOverview);
router.get('/health', adminController.getSystemHealth);
router.get('/logs', adminController.getSystemLogs);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:walletAddress', adminController.getUserDetails);
router.put('/users/:walletAddress', 
  adminController.validateUserUpdate,
  adminController.updateUser
);

// Election management
router.get('/elections', adminController.getAllElections);
router.get('/elections/:id', adminController.getElectionDetails);
router.put('/elections/:id', 
  adminController.validateElectionUpdate,
  adminController.updateElection
);
router.delete('/elections/:id', adminController.deleteElection);

module.exports = router;
