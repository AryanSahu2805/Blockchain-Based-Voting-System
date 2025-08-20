// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/**
 * @title ElectionUpgradeable
 * @dev Upgradeable election contract with advanced features
 * @dev Supports candidate management, voting, and result tracking
 */
contract ElectionUpgradeable is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _candidateCounter;
    CountersUpgradeable.Counter private _voteCounter;
    
    struct Candidate {
        uint256 id;
        string name;
        string description;
        string imageUrl;
        uint256 voteCount;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Vote {
        uint256 id;
        address voter;
        uint256 candidateId;
        uint256 timestamp;
        string ipfsHash; // For storing additional vote metadata
        bool isValid;
    }
    
    struct ElectionMetadata {
        string title;
        string description;
        string imageUrl;
        string category;
        string[] tags;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 totalVotes;
        uint256 candidateCount;
        address creator;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // State variables
    ElectionMetadata public metadata;
    
    // Mappings
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public voterChoice;
    mapping(uint256 => Vote) public votes;
    mapping(address => bool) public authorizedVoters;
    mapping(address => uint256) public voterWeight; // For weighted voting
    
    // Arrays
    uint256[] public candidateIds;
    address[] public voters;
    
    // Events
    event CandidateAdded(uint256 indexed candidateId, string name, address indexed creator);
    event CandidateUpdated(uint256 indexed candidateId, string name);
    event CandidateDeactivated(uint256 indexed candidateId);
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 timestamp);
    event VoteInvalidated(address indexed voter, uint256 indexed candidateId);
    event ElectionStarted(uint256 startTime, uint256 endTime);
    event ElectionEnded(uint256 endTime, uint256 totalVotes);
    event VoterAuthorized(address indexed voter, uint256 weight);
    event VoterDeauthorized(address indexed voter);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        string memory title,
        uint256 startTime,
        uint256 endTime,
        string[] memory candidateNames,
        string[] memory candidateDescriptions,
        string[] memory candidateImageUrls,
        address creator
    ) public initializer {
        __Ownable_init();
        _transferOwnership(creator);
        __ReentrancyGuard_init();
        __Pausable_init();
        
        require(bytes(title).length > 0, "Title cannot be empty");
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(candidateNames.length >= 2, "Must have at least 2 candidates");
        require(
            candidateNames.length == candidateDescriptions.length &&
            candidateNames.length == candidateImageUrls.length,
            "Candidate arrays must have same length"
        );
        
        metadata = ElectionMetadata({
            title: title,
            description: "",
            imageUrl: "",
            category: "",
            tags: new string[](0),
            startTime: startTime,
            endTime: endTime,
            isActive: true,
            totalVotes: 0,
            candidateCount: 0,
            creator: creator,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        // Add initial candidates
        for (uint256 i = 0; i < candidateNames.length; i++) {
            _addCandidate(
                candidateNames[i],
                candidateDescriptions[i],
                candidateImageUrls[i]
            );
        }
        
        emit ElectionStarted(startTime, endTime);
    }
    
    /**
     * @dev Add a new candidate (only owner)
     */
    function addCandidate(
        string memory name,
        string memory description,
        string memory imageUrl
    ) external onlyOwner whenNotPaused {
        _addCandidate(name, description, imageUrl);
    }
    
    function _addCandidate(
        string memory name,
        string memory description,
        string memory imageUrl
    ) internal {
        require(bytes(name).length > 0, "Candidate name cannot be empty");
        require(metadata.isActive, "Election is not active");
        
        _candidateCounter.increment();
        uint256 candidateId = _candidateCounter.current();
        
        candidates[candidateId] = Candidate({
            id: candidateId,
            name: name,
            description: description,
            imageUrl: imageUrl,
            voteCount: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        candidateIds.push(candidateId);
        metadata.candidateCount++;
        metadata.updatedAt = block.timestamp;
        
        emit CandidateAdded(candidateId, name, msg.sender);
    }
    
    /**
     * @dev Update candidate information (only owner)
     */
    function updateCandidate(
        uint256 candidateId,
        string memory name,
        string memory description,
        string memory imageUrl
    ) external onlyOwner whenNotPaused {
        require(candidates[candidateId].id != 0, "Candidate does not exist");
        require(candidates[candidateId].isActive, "Candidate is not active");
        
        candidates[candidateId].name = name;
        candidates[candidateId].description = description;
        candidates[candidateId].imageUrl = imageUrl;
        
        metadata.updatedAt = block.timestamp;
        
        emit CandidateUpdated(candidateId, name);
    }
    
    /**
     * @dev Deactivate a candidate (only owner)
     */
    function deactivateCandidate(uint256 candidateId) external onlyOwner whenNotPaused {
        require(candidates[candidateId].id != 0, "Candidate does not exist");
        require(candidates[candidateId].isActive, "Candidate is already inactive");
        
        candidates[candidateId].isActive = false;
        metadata.updatedAt = block.timestamp;
        
        emit CandidateDeactivated(candidateId);
    }
    
    /**
     * @dev Cast a vote
     */
    function vote(uint256 candidateId, string memory ipfsHash) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(!hasVoted[msg.sender], "Already voted");
        require(metadata.isActive, "Election is not active");
        require(block.timestamp >= metadata.startTime, "Voting has not started");
        require(block.timestamp <= metadata.endTime, "Voting has ended");
        require(candidates[candidateId].id != 0, "Candidate does not exist");
        require(candidates[candidateId].isActive, "Candidate is not active");
        
        // Check if voter is authorized (if authorization is required)
        if (metadata.creator != address(0)) {
            require(
                authorizedVoters[msg.sender] || msg.sender == metadata.creator,
                "Voter not authorized"
            );
        }
        
        _voteCounter.increment();
        uint256 voteId = _voteCounter.current();
        
        // Record the vote
        votes[voteId] = Vote({
            id: voteId,
            voter: msg.sender,
            candidateId: candidateId,
            timestamp: block.timestamp,
            ipfsHash: ipfsHash,
            isValid: true
        });
        
        // Update candidate vote count
        candidates[candidateId].voteCount++;
        
        // Update election state
        hasVoted[msg.sender] = true;
        voterChoice[msg.sender] = candidateId;
        voters.push(msg.sender);
        metadata.totalVotes++;
        metadata.updatedAt = block.timestamp;
        
        emit VoteCast(msg.sender, candidateId, block.timestamp);
    }
    
    /**
     * @dev Invalidate a vote (only owner or voter)
     */
    function invalidateVote(address voter) external {
        require(
            msg.sender == voter || msg.sender == owner(),
            "Only voter or owner can invalidate vote"
        );
        require(hasVoted[voter], "Voter has not voted");
        
        uint256 candidateId = voterChoice[voter];
        
        // Decrease candidate vote count
        candidates[candidateId].voteCount--;
        
        // Update election state
        hasVoted[voter] = false;
        metadata.totalVotes--;
        metadata.updatedAt = block.timestamp;
        
        emit VoteInvalidated(voter, candidateId);
    }
    
    /**
     * @dev Authorize a voter (only owner)
     */
    function authorizeVoter(address voter, uint256 weight) external onlyOwner {
        authorizedVoters[voter] = true;
        voterWeight[voter] = weight;
        emit VoterAuthorized(voter, weight);
    }
    
    /**
     * @dev Deauthorize a voter (only owner)
     */
    function deauthorizeVoter(address voter) external onlyOwner {
        authorizedVoters[voter] = false;
        voterWeight[voter] = 0;
        emit VoterDeauthorized(voter);
    }
    
    /**
     * @dev End the election (only owner)
     */
    function endElection() external onlyOwner {
        require(metadata.isActive, "Election is already ended");
        require(block.timestamp >= metadata.endTime, "Election time has not ended");
        
        metadata.isActive = false;
        metadata.updatedAt = block.timestamp;
        
        emit ElectionEnded(metadata.endTime, metadata.totalVotes);
    }
    
    /**
     * @dev Get candidate information
     */
    function getCandidate(uint256 candidateId) external view returns (Candidate memory) {
        return candidates[candidateId];
    }
    
    /**
     * @dev Get all candidate IDs
     */
    function getAllCandidateIds() external view returns (uint256[] memory) {
        return candidateIds;
    }
    
    /**
     * @dev Get vote information
     */
    function getVote(uint256 voteId) external view returns (Vote memory) {
        return votes[voteId];
    }
    
    /**
     * @dev Get voter's choice
     */
    function getVoterChoice(address voter) external view returns (uint256) {
        return voterChoice[voter];
    }
    
    /**
     * @dev Check if address has voted
     */
    function hasAddressVoted(address voter) external view returns (bool) {
        return hasVoted[voter];
    }
    
    /**
     * @dev Get total votes
     */
    function getTotalVotes() external view returns (uint256) {
        return metadata.totalVotes;
    }
    
    /**
     * @dev Get election status
     */
    function isActive() external view returns (bool) {
        return metadata.isActive && 
               block.timestamp >= metadata.startTime && 
               block.timestamp <= metadata.endTime;
    }
    
    /**
     * @dev Get election metadata
     */
    function getMetadata() external view returns (ElectionMetadata memory) {
        return metadata;
    }
    
    /**
     * @dev Update election metadata (only owner)
     */
    function updateMetadata(
        string memory description,
        string memory imageUrl,
        string memory category,
        string[] memory tags
    ) external onlyOwner {
        metadata.description = description;
        metadata.imageUrl = imageUrl;
        metadata.category = category;
        metadata.tags = tags;
        metadata.updatedAt = block.timestamp;
    }
    
    /**
     * @dev Pause/unpause election (only owner)
     */
    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }
    
    /**
     * @dev Get election results
     */
    function getResults() external view returns (
        uint256[] memory candidateIds_,
        uint256[] memory voteCounts_,
        uint256 totalVotes_
    ) {
        candidateIds_ = candidateIds;
        voteCounts_ = new uint256[](candidateIds.length);
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            voteCounts_[i] = candidates[candidateIds[i]].voteCount;
        }
        
        totalVotes_ = metadata.totalVotes;
    }
}
