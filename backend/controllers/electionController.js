const Election = require('../models/Election');
const User = require('../models/User');
const { ethers } = require('ethers');
const { body, validationResult } = require('express-validator');
const IPFSService = require('../services/ipfsService');

// Get all elections with filtering and pagination
const getElections = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
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
      currentPage: page,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
};

// Get election by ID
const getElectionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const election = await Election.findById(id)
      .populate('creator', 'walletAddress profileName')
      .exec();

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.json(election);
  } catch (error) {
    console.error('Error fetching election:', error);
    res.status(500).json({ error: 'Failed to fetch election' });
  }
};

// Initialize IPFS service
const ipfsService = new IPFSService();

// Create new election
const createElection = async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      candidates,
      startDate,
      endDate,
      category,
      tags,
      maxVoters,
      requiresRegistration,
      votingMethod,
      imageUrl
    } = req.body;

    // Validate dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start <= now) {
      return res.status(400).json({ error: 'Start date must be in the future' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Validate candidates
    if (!candidates || candidates.length < 2) {
      return res.status(400).json({ error: 'At least 2 candidates are required' });
    }

    // Create election object
    const electionData = {
      title,
      description,
      candidates: candidates.map((candidate, index) => ({
        id: index + 1,
        name: candidate.name,
        imageUrl: candidate.imageUrl,
        description: candidate.description
      })),
      startDate: start,
      endDate: end,
      category,
      tags: tags || [],
      maxVoters: maxVoters || null,
      requiresRegistration: requiresRegistration || false,
      votingMethod: votingMethod || 'single_choice',
      imageUrl,
      creator: req.user.walletAddress,
      status: 'upcoming'
    };

    const election = new Election(electionData);
    await election.save();

    // Upload election metadata to IPFS
    try {
      const ipfsMetadata = await ipfsService.uploadElectionMetadata({
        id: election._id.toString(),
        ...electionData
      });
      
      // Update election with IPFS hash
      election.ipfsHash = ipfsMetadata.hash;
      election.ipfsUrl = ipfsMetadata.url;
      await election.save();
      
      console.log(`✅ Election metadata uploaded to IPFS: ${ipfsMetadata.hash}`);
    } catch (ipfsError) {
      console.error('⚠️ IPFS upload failed, continuing without IPFS:', ipfsError);
      // Continue without IPFS - election is still created
    }

    // Update user stats
    await User.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      { $inc: { 'stats.electionsCreated': 1 } }
    );

    res.status(201).json({
      ...election.toObject(),
      ipfsHash: election.ipfsHash,
      ipfsUrl: election.ipfsUrl
    });
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({ error: 'Failed to create election' });
  }
};

// Update election
const updateElection = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Check if user is creator or admin
    if (election.creator !== req.user.walletAddress && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to update this election' });
    }

    // Prevent updates if voting has started
    if (election.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot update election after voting has started' });
    }

    // Remove fields that shouldn't be updated
    delete updateData.creator;
    delete updateData.status;
    delete updateData.totalVotes;
    delete updateData.blockchainDetails;

    // Validate dates if being updated
    if (updateData.startDate || updateData.endDate) {
      const start = updateData.startDate ? new Date(updateData.startDate) : election.startDate;
      const end = updateData.endDate ? new Date(updateData.endDate) : election.endDate;
      const now = new Date();

      if (start <= now) {
        return res.status(400).json({ error: 'Start date must be in the future' });
      }

      if (end <= start) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }
    }

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

// Delete election
const deleteElection = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Check if user is creator or admin
    if (election.creator !== req.user.walletAddress && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this election' });
    }

    // Prevent deletion if voting has started
    if (election.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot delete election after voting has started' });
    }

    await Election.findByIdAndDelete(id);

    // Update user stats
    await User.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      { $inc: { 'stats.electionsCreated': -1 } }
    );

    res.json({ message: 'Election deleted successfully' });
  } catch (error) {
    console.error('Error deleting election:', error);
    res.status(500).json({ error: 'Failed to delete election' });
  }
};

// Get election results
const getElectionResults = async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    // Check if voting has ended
    if (election.status === 'upcoming' || election.status === 'active') {
      return res.status(400).json({ error: 'Voting has not ended yet' });
    }

    const results = election.getResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching election results:', error);
    res.status(500).json({ error: 'Failed to fetch election results' });
  }
};

// Get user's voting history for an election
const getUserVoteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.user;

    const user = await User.findByWallet(walletAddress);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const vote = user.getVoteInElection(id);
    
    if (!vote) {
      return res.json({ hasVoted: false });
    }

    res.json({
      hasVoted: true,
      vote
    });
  } catch (error) {
    console.error('Error fetching vote history:', error);
    res.status(500).json({ error: 'Failed to fetch vote history' });
  }
};

// Get election statistics
const getElectionStats = async (req, res) => {
  try {
    const stats = await Election.getElectionStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching election stats:', error);
    res.status(500).json({ error: 'Failed to fetch election stats' });
  }
};

// Search elections
const searchElections = async (req, res) => {
  try {
    const { q, category, status, creator } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await Election.searchElections(q, { category, status, creator });
    res.json(results);
  } catch (error) {
    console.error('Error searching elections:', error);
    res.status(500).json({ error: 'Failed to search elections' });
  }
};

// Get elections by category
const getElectionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const elections = await Election.find({ category })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('creator', 'walletAddress profileName');

    res.json(elections);
  } catch (error) {
    console.error('Error fetching elections by category:', error);
    res.status(500).json({ error: 'Failed to fetch elections by category' });
  }
};

// Get elections by creator
const getElectionsByCreator = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const elections = await Election.find({ creator: walletAddress })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('creator', 'walletAddress profileName');

    const total = await Election.countDocuments({ creator: walletAddress });

    res.json({
      elections,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching elections by creator:', error);
    res.status(500).json({ error: 'Failed to fetch elections by creator' });
  }
};

// Validation middleware
const validateElection = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('candidates')
    .isArray({ min: 2, max: 50 })
    .withMessage('Must have between 2 and 50 candidates'),
  
  body('candidates.*.name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Candidate name must be between 1 and 100 characters'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  
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
    .withMessage('Each tag must be between 1 and 30 characters'),
  
  body('maxVoters')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max voters must be a positive integer'),
  
  body('requiresRegistration')
    .optional()
    .isBoolean()
    .withMessage('Requires registration must be a boolean'),
  
  body('votingMethod')
    .optional()
    .isIn(['single_choice', 'multiple_choice', 'ranked_choice'])
    .withMessage('Invalid voting method'),
  
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL')
];

module.exports = {
  getElections,
  getElectionById,
  createElection,
  updateElection,
  deleteElection,
  getElectionResults,
  getUserVoteHistory,
  getElectionStats,
  searchElections,
  getElectionsByCategory,
  getElectionsByCreator,
  validateElection
};
