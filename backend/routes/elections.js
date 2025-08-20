const express = require('express');
const router = express.Router();
const electionController = require('../controllers/electionController');
const { authenticateToken, optionalAuth, requireVerified } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/', optionalAuth, electionController.getElections);
router.get('/search', optionalAuth, electionController.searchElections);
router.get('/category/:category', optionalAuth, electionController.getElectionsByCategory);
router.get('/creator/:walletAddress', optionalAuth, electionController.getElectionsByCreator);
router.get('/stats', optionalAuth, electionController.getElectionStats);
router.get('/:id', optionalAuth, electionController.getElectionById);
router.get('/:id/results', optionalAuth, electionController.getElectionResults);

// Protected routes (authentication required)
router.post('/', 
  authenticateToken, 
  requireVerified,
  electionController.validateElection,
  electionController.createElection
);

router.put('/:id', 
  authenticateToken, 
  requireVerified,
  electionController.validateElection,
  electionController.updateElection
);

router.delete('/:id', 
  authenticateToken, 
  requireVerified,
  electionController.deleteElection
);

router.get('/:id/vote-history', 
  authenticateToken, 
  electionController.getUserVoteHistory
);

module.exports = router;
