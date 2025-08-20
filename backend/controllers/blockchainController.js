const { ethers } = require('ethers');
const Election = require('../models/Election');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const MetaTransactionService = require('../services/metaTransactionService');

// Initialize provider based on network
const getProvider = (networkId) => {
  const rpcUrls = {
    80001: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    137: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    11155111: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    1: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID
  };

  const rpcUrl = rpcUrls[networkId];
  if (!rpcUrl) {
    throw new Error(`Unsupported network ID: ${networkId}`);
  }

  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get contract instance
const getContract = (contractAddress, abi, networkId) => {
  const provider = getProvider(networkId);
  return new ethers.Contract(contractAddress, abi, provider);
};

// Get election factory contract
const getElectionFactory = (networkId) => {
  const contractAddresses = {
    80001: process.env.MUMBAI_ELECTION_FACTORY_ADDRESS,
    137: process.env.POLYGON_ELECTION_FACTORY_ADDRESS,
    11155111: process.env.SEPOLIA_ELECTION_FACTORY_ADDRESS,
    1: process.env.ETHEREUM_ELECTION_FACTORY_ADDRESS
  };

  const address = contractAddresses[networkId];
  if (!address) {
    throw new Error(`Election factory address not configured for network ${networkId}`);
  }

  // Basic ABI for reading factory data
  const abi = [
    'function getElection(uint256) external view returns (address)',
    'function getElectionCount() external view returns (uint256)',
    'function getElections(uint256, uint256) external view returns (address[])'
  ];

  return getContract(address, abi, networkId);
};

// Get election contract
const getElectionContract = (electionAddress, networkId) => {
  // Basic ABI for reading election data
  const abi = [
    'function title() external view returns (string)',
    'function description() external view returns (string)',
    'function startTime() external view returns (uint256)',
    'function endTime() external view returns (uint256)',
    'function candidateCount() external view returns (uint256)',
    'function getCandidate(uint256) external view returns (string, uint256)',
    'function hasVoted(address) external view returns (bool)',
    'function getVoteCount(uint256) external view returns (uint256)',
    'function totalVotes() external view returns (uint256)',
    'function getWinner() external view returns (uint256)',
    'function isActive() external view returns (bool)',
    'function creator() external view returns (address)'
  ];

  return getContract(electionAddress, abi, networkId);
};

// Sync election data from blockchain
const syncElectionFromBlockchain = async (req, res) => {
  try {
    const { electionId } = req.params;
    const { networkId } = req.body;

    if (!networkId) {
      return res.status(400).json({ error: 'Network ID is required' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (!election.blockchainDetails?.contractAddress) {
      return res.status(400).json({ error: 'Election not deployed to blockchain' });
    }

    const contract = getElectionContract(election.blockchainDetails.contractAddress, networkId);
    
    // Fetch blockchain data
    const [
      title,
      description,
      startTime,
      endTime,
      candidateCount,
      totalVotes,
      isActive,
      creator
    ] = await Promise.all([
      contract.title(),
      contract.description(),
      contract.startTime(),
      contract.startTime(),
      contract.candidateCount(),
      contract.totalVotes(),
      contract.isActive(),
      contract.creator()
    ]);

    // Fetch candidates
    const candidates = [];
    for (let i = 0; i < candidateCount; i++) {
      const [name, voteCount] = await contract.getCandidate(i);
      candidates.push({
        id: i + 1,
        name,
        voteCount: voteCount.toString(),
        imageUrl: election.candidates[i]?.imageUrl || null,
        description: election.candidates[i]?.description || null
      });
    }

    // Update election with blockchain data
    election.title = title;
    election.description = description;
    election.startDate = new Date(startTime * 1000);
    election.endDate = new Date(endTime * 1000);
    election.candidates = candidates;
    election.totalVotes = parseInt(totalVotes);
    election.status = isActive ? 'active' : 'ended';
    election.blockchainDetails.lastSync = new Date();
    election.blockchainDetails.networkId = networkId;

    await election.save();

    res.json({
      message: 'Election synced successfully',
      election
    });
  } catch (error) {
    console.error('Error syncing election:', error);
    res.status(500).json({ error: 'Failed to sync election from blockchain' });
  }
};

// Get blockchain election data
const getBlockchainElectionData = async (req, res) => {
  try {
    const { electionId } = req.params;
    const { networkId } = req.query;

    if (!networkId) {
      return res.status(400).json({ error: 'Network ID is required' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (!election.blockchainDetails?.contractAddress) {
      return res.status(400).json({ error: 'Election not deployed to blockchain' });
    }

    const contract = getElectionContract(election.blockchainDetails.contractAddress, networkId);
    
    // Get basic election info
    const [
      title,
      description,
      startTime,
      endTime,
      candidateCount,
      totalVotes,
      isActive,
      creator
    ] = await Promise.all([
      contract.title(),
      contract.description(),
      contract.startTime(),
      contract.endTime(),
      contract.candidateCount(),
      contract.totalVotes(),
      contract.isActive(),
      contract.creator()
    ]);

    // Get candidate details with vote counts
    const candidates = [];
    for (let i = 0; i < candidateCount; i++) {
      const [name, voteCount] = await contract.getCandidate(i);
      candidates.push({
        id: i + 1,
        name,
        voteCount: voteCount.toString(),
        imageUrl: election.candidates[i]?.imageUrl || null,
        description: election.candidates[i]?.description || null
      });
    }

    // Check if current user has voted
    let userVote = null;
    if (req.user?.walletAddress) {
      const hasVoted = await contract.hasVoted(req.user.walletAddress);
      if (hasVoted) {
        // Note: This would require additional contract methods to get the actual vote
        userVote = { hasVoted: true };
      }
    }

    const blockchainData = {
      title,
      description,
      startTime: new Date(startTime * 1000),
      endTime: new Date(endTime * 1000),
      candidateCount: candidateCount.toString(),
      totalVotes: totalVotes.toString(),
      isActive,
      creator,
      candidates,
      userVote,
      lastUpdated: new Date()
    };

    res.json(blockchainData);
  } catch (error) {
    console.error('Error fetching blockchain election data:', error);
    res.status(500).json({ error: 'Failed to fetch blockchain election data' });
  }
};

// Verify transaction on blockchain
const verifyTransaction = async (req, res) => {
  try {
    const { transactionHash, networkId } = req.body;

    if (!transactionHash || !networkId) {
      return res.status(400).json({ error: 'Transaction hash and network ID are required' });
    }

    const provider = getProvider(networkId);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get transaction details
    const transaction = await provider.getTransaction(transactionHash);
    
    // Check if transaction was successful
    const isSuccess = receipt.status === 1;
    
    // Get block information
    const block = await provider.getBlock(receipt.blockNumber);

    const verificationResult = {
      transactionHash,
      networkId,
      isSuccess,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: transaction.gasPrice.toString(),
      from: receipt.from,
      to: receipt.to,
      timestamp: block.timestamp,
      confirmations: await provider.getTransactionReceipt(transactionHash).then(r => r ? 1 : 0)
    };

    res.json(verificationResult);
  } catch (error) {
    console.error('Error verifying transaction:', error);
    res.status(500).json({ error: 'Failed to verify transaction' });
  }
};

// Get network information
const getNetworkInfo = async (req, res) => {
  try {
    const { networkId } = req.params;

    if (!networkId) {
      return res.status(400).json({ error: 'Network ID is required' });
    }

    const provider = getProvider(networkId);
    
    // Get network information
    const [
      network,
      blockNumber,
      gasPrice,
      chainId
    ] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData(),
      provider.getNetwork().then(n => n.chainId)
    ]);

    const networkInfo = {
      chainId: chainId.toString(),
      name: network.name,
      blockNumber: blockNumber.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || '0',
      maxFeePerGas: gasPrice.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString() || '0',
      lastUpdated: new Date()
    };

    res.json(networkInfo);
  } catch (error) {
    console.error('Error fetching network info:', error);
    res.status(500).json({ error: 'Failed to fetch network information' });
  }
};

// Get supported networks
const getSupportedNetworks = async (req, res) => {
  try {
    const networks = [
      {
        id: 80001,
        name: 'Mumbai Testnet',
        currency: 'MATIC',
        rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
        explorer: 'https://mumbai.polygonscan.com',
        isTestnet: true
      },
      {
        id: 137,
        name: 'Polygon Mainnet',
        currency: 'MATIC',
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        explorer: 'https://polygonscan.com',
        isTestnet: false
      },
      {
        id: 11155111,
        name: 'Sepolia Testnet',
        currency: 'ETH',
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
        explorer: 'https://sepolia.etherscan.io',
        isTestnet: true
      },
      {
        id: 1,
        name: 'Ethereum Mainnet',
        currency: 'ETH',
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
        explorer: 'https://etherscan.io',
        isTestnet: false
      }
    ];

    res.json(networks);
  } catch (error) {
    console.error('Error fetching supported networks:', error);
    res.status(500).json({ error: 'Failed to fetch supported networks' });
  }
};

// Estimate gas for voting
const estimateVoteGas = async (req, res) => {
  try {
    const { electionAddress, candidateId, networkId } = req.body;

    if (!electionAddress || candidateId === undefined || !networkId) {
      return res.status(400).json({ error: 'Election address, candidate ID, and network ID are required' });
    }

    const contract = getElectionContract(electionAddress, networkId);
    
    // Estimate gas for vote function
    const gasEstimate = await contract.vote.estimateGas(candidateId);
    
    // Get current gas price
    const provider = getProvider(networkId);
    const feeData = await provider.getFeeData();
    
    const gasEstimation = {
      gasLimit: gasEstimate.toString(),
      gasPrice: feeData.gasPrice?.toString() || '0',
      maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
      estimatedCost: (BigInt(gasEstimate) * (feeData.gasPrice || BigInt(0))).toString(),
      networkId,
      lastUpdated: new Date()
    };

    res.json(gasEstimation);
  } catch (error) {
    console.error('Error estimating gas:', error);
    res.status(500).json({ error: 'Failed to estimate gas for voting' });
  }
};

// Initialize meta-transaction service
const metaTransactionService = new MetaTransactionService();

// Get blockchain statistics
const getBlockchainStats = async (req, res) => {
  try {
    const { networkId } = req.query;

    if (!networkId) {
      return res.status(400).json({ error: 'Network ID is required' });
    }

    const provider = getProvider(networkId);
    
    // Get basic network stats
    const [blockNumber, gasPrice] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);

    // Get election factory stats if available
    let factoryStats = null;
    try {
      const factory = getElectionFactory(networkId);
      const electionCount = await factory.getElectionCount();
      factoryStats = {
        totalElections: electionCount.toString()
      };
    } catch (error) {
      console.warn('Could not fetch factory stats:', error.message);
    }

    const stats = {
      networkId: parseInt(networkId),
      blockNumber: blockNumber.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || '0',
      maxFeePerGas: gasPrice.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString() || '0',
      factoryStats,
      lastUpdated: new Date()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching blockchain stats:', error);
    res.status(500).json({ error: 'Failed to fetch blockchain statistics' });
  }
};

// Create meta-transaction for gasless voting
const createMetaTransaction = async (req, res) => {
  try {
    const { electionAddress, candidateId, networkName } = req.body;
    
    if (!electionAddress || !candidateId || !networkName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Generate nonce and deadline
    const nonce = metaTransactionService.generateNonce();
    const deadline = metaTransactionService.generateDeadline(30); // 30 minutes

    // Create meta-transaction
    const metaTx = await metaTransactionService.createVoteMetaTransaction(
      electionAddress,
      candidateId,
      req.user.walletAddress,
      nonce,
      deadline
    );

    res.json({
      success: true,
      metaTransaction: metaTx,
      message: 'Meta-transaction created successfully. Sign the message to proceed with gasless voting.'
    });
  } catch (error) {
    console.error('Error creating meta-transaction:', error);
    res.status(500).json({ error: 'Failed to create meta-transaction' });
  }
};

// Execute meta-transaction
const executeMetaTransaction = async (req, res) => {
  try {
    const { 
      target, 
      data, 
      user, 
      nonce, 
      deadline, 
      signature, 
      networkName 
    } = req.body;

    if (!target || !data || !user || !nonce || !deadline || !signature || !networkName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Execute the meta-transaction
    const result = await metaTransactionService.executeMetaTransaction(
      target,
      data,
      user,
      nonce,
      deadline,
      signature,
      networkName
    );

    res.json({
      success: true,
      result,
      message: 'Meta-transaction executed successfully'
    });
  } catch (error) {
    console.error('Error executing meta-transaction:', error);
    res.status(500).json({ error: 'Failed to execute meta-transaction' });
  }
};

// Get relayer status
const getRelayerStatus = async (req, res) => {
  try {
    const { networkName } = req.query;
    
    if (!networkName) {
      return res.status(400).json({ error: 'Network name is required' });
    }

    const status = await metaTransactionService.getRelayerStatus(networkName);
    
    res.json({
      success: true,
      relayerStatus: status
    });
  } catch (error) {
    console.error('Error getting relayer status:', error);
    res.status(500).json({ error: 'Failed to get relayer status' });
  }
};

// Estimate gas cost for meta-transaction
const estimateMetaTransactionGas = async (req, res) => {
  try {
    const { target, data, networkName } = req.body;
    
    if (!target || !data || !networkName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const gasEstimation = await metaTransactionService.estimateGasCost(
      target,
      data,
      networkName
    );

    res.json({
      success: true,
      gasEstimation
    });
  } catch (error) {
    console.error('Error estimating meta-transaction gas:', error);
    res.status(500).json({ error: 'Failed to estimate gas cost' });
  }
};

// Validation middleware
const validateSyncElection = [
  body('networkId')
    .isInt({ min: 1 })
    .withMessage('Network ID must be a positive integer')
];

const validateVerifyTransaction = [
  body('transactionHash')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  
  body('networkId')
    .isInt({ min: 1 })
    .withMessage('Network ID must be a positive integer')
];

const validateEstimateGas = [
  body('electionAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid election address format'),
  
  body('candidateId')
    .isInt({ min: 1 })
    .withMessage('Candidate ID must be a positive integer'),
  
  body('networkId')
    .isInt({ min: 1 })
    .withMessage('Network ID must be a positive integer')
];

module.exports = {
  syncElectionFromBlockchain,
  getBlockchainElectionData,
  verifyTransaction,
  getNetworkInfo,
  getSupportedNetworks,
  estimateVoteGas,
  getBlockchainStats,
  createMetaTransaction,
  executeMetaTransaction,
  getRelayerStatus,
  estimateMetaTransactionGas,
  validateSyncElection,
  validateVerifyTransaction,
  validateEstimateGas
};
