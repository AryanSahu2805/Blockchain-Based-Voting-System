const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/networks', blockchainController.getSupportedNetworks);
router.get('/networks/:networkId', blockchainController.getNetworkInfo);
router.get('/networks/:networkId/stats', blockchainController.getBlockchainStats);

// Protected routes (authentication required)
router.get('/elections/:electionId/blockchain-data', 
  optionalAuth,
  blockchainController.getBlockchainElectionData
);

router.post('/elections/:electionId/sync', 
  authenticateToken,
  blockchainController.validateSyncElection,
  blockchainController.syncElectionFromBlockchain
);

router.post('/verify-transaction', 
  authenticateToken,
  blockchainController.validateVerifyTransaction,
  blockchainController.verifyTransaction
);

router.post('/estimate-gas', 
  authenticateToken,
  blockchainController.validateEstimateGas,
  blockchainController.estimateVoteGas
);

module.exports = router;
