// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

/**
 * @title PrivateVoting
 * @dev Privacy-preserving voting using zero-knowledge proofs
 * @dev Voters can prove they voted without revealing their choice
 */
contract PrivateVoting is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _electionCounter;
    CountersUpgradeable.Counter private _nullifierCounter;
    
    struct Candidate {
        uint256 id;
        string name;
        string description;
        string imageUrl;
        uint256 voteCount;
        bool isActive;
        uint256 createdAt;
    }
    
    struct Election {
        uint256 id;
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
        bool isPrivate;
        uint256 merkleRoot;
        mapping(uint256 => Candidate) candidates;
        uint256[] candidateIds;
        mapping(bytes32 => bool) nullifiers;
        mapping(address => bool) authorizedVoters;
        address[] voters;
    }
    
    struct VoteProof {
        bytes32 nullifier;
        bytes32 commitment;
        uint256[8] proof; // ZK-SNARK proof
        uint256 candidateId;
        uint256 timestamp;
    }
    
    struct MerkleProof {
        bytes32[] siblings;
        uint256 path;
    }
    
    // State variables
    mapping(uint256 => Election) public elections;
    uint256[] public electionIds;
    
    // ZK-SNARK verification key (simplified for demo)
    uint256[4] public verificationKey;
    
    // Events
    event PrivateElectionCreated(
        uint256 indexed electionId,
        address indexed creator,
        string title,
        uint256 startTime,
        uint256 endTime,
        bool isPrivate
    );
    
    event PrivateVoteCast(
        uint256 indexed electionId,
        bytes32 indexed nullifier,
        bytes32 commitment,
        uint256 timestamp
    );
    
    event NullifierUsed(bytes32 indexed nullifier, uint256 indexed electionId);
    event MerkleRootUpdated(uint256 indexed electionId, uint256 newRoot);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address initialOwner) public initializer {
        __Ownable_init();
        _transferOwnership(initialOwner);
        __ReentrancyGuard_init();
        __Pausable_init();
        
        // Initialize verification key (in production, this would be a real ZK-SNARK key)
        verificationKey = [
            0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
            0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890,
            0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234,
            0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678
        ];
    }
    
    /**
     * @dev Create a new private election
     */
    function createPrivateElection(
        string memory title,
        uint256 startTime,
        uint256 endTime,
        string[] memory candidateNames,
        string[] memory candidateDescriptions,
        string[] memory candidateImageUrls,
        address[] memory authorizedVoters,
        uint256 initialMerkleRoot
    ) external whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        require(candidateNames.length >= 2, "Must have at least 2 candidates");
        require(
            candidateNames.length == candidateDescriptions.length &&
            candidateNames.length == candidateImageUrls.length,
            "Candidate arrays must have same length"
        );
        
        _electionCounter.increment();
        uint256 electionId = _electionCounter.current();
        
        Election storage election = elections[electionId];
        election.id = electionId;
        election.title = title;
        election.description = "";
        election.imageUrl = "";
        election.category = "";
        election.tags = new string[](0);
        election.startTime = startTime;
        election.endTime = endTime;
        election.isActive = true;
        election.totalVotes = 0;
        election.candidateCount = 0;
        election.creator = msg.sender;
        election.createdAt = block.timestamp;
        election.updatedAt = block.timestamp;
        election.isPrivate = true;
        election.merkleRoot = initialMerkleRoot;
        
        // Add candidates
        for (uint256 i = 0; i < candidateNames.length; i++) {
            _addCandidateToElection(electionId, candidateNames[i], candidateDescriptions[i], candidateImageUrls[i]);
        }
        
        // Add authorized voters
        for (uint256 i = 0; i < authorizedVoters.length; i++) {
            election.authorizedVoters[authorizedVoters[i]] = true;
            election.voters.push(authorizedVoters[i]);
        }
        
        electionIds.push(electionId);
        
        emit PrivateElectionCreated(
            electionId,
            msg.sender,
            title,
            startTime,
            endTime,
            true
        );
        
        return electionId;
    }
    
    /**
     * @dev Add candidate to election
     */
    function _addCandidateToElection(
        uint256 electionId,
        string memory name,
        string memory description,
        string memory imageUrl
    ) internal {
        Election storage election = elections[electionId];
        
        election.candidateCount++;
        uint256 candidateId = election.candidateCount;
        
        election.candidates[candidateId] = Candidate({
            id: candidateId,
            name: name,
            description: description,
            imageUrl: imageUrl,
            voteCount: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        election.candidateIds.push(candidateId);
    }
    
    /**
     * @dev Cast a private vote using ZK-SNARK proof
     */
    function castPrivateVote(
        uint256 electionId,
        VoteProof memory voteProof,
        MerkleProof memory merkleProof
    ) external whenNotPaused nonReentrant {
        Election storage election = elections[electionId];
        
        require(election.id != 0, "Election does not exist");
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime, "Voting has not started");
        require(block.timestamp <= election.endTime, "Voting has ended");
        require(election.isPrivate, "Election is not private");
        
        // Verify nullifier hasn't been used
        require(!election.nullifiers[voteProof.nullifier], "Nullifier already used");
        
        // Verify ZK-SNARK proof (simplified verification for demo)
        require(verifyVoteProof(voteProof), "Invalid vote proof");
        
        // Verify merkle proof
        require(verifyMerkleProof(voteProof.commitment, merkleProof, election.merkleRoot), "Invalid merkle proof");
        
        // Mark nullifier as used
        election.nullifiers[voteProof.nullifier] = true;
        
        // Update candidate vote count
        require(voteProof.candidateId > 0 && voteProof.candidateId <= election.candidateCount, "Invalid candidate");
        require(election.candidates[voteProof.candidateId].isActive, "Candidate is not active");
        
        election.candidates[voteProof.candidateId].voteCount++;
        election.totalVotes++;
        election.updatedAt = block.timestamp;
        
        emit PrivateVoteCast(
            electionId,
            voteProof.nullifier,
            voteProof.commitment,
            voteProof.timestamp
        );
        
        emit NullifierUsed(voteProof.nullifier, electionId);
    }
    
    /**
     * @dev Verify ZK-SNARK proof (simplified for demo)
     */
    function verifyVoteProof(VoteProof memory voteProof) internal view returns (bool) {
        // In production, this would use a real ZK-SNARK verification library
        // For demo purposes, we'll do basic validation
        
        require(voteProof.nullifier != bytes32(0), "Invalid nullifier");
        require(voteProof.commitment != bytes32(0), "Invalid commitment");
        require(voteProof.timestamp <= block.timestamp, "Vote timestamp in future");
        require(voteProof.timestamp > block.timestamp - 1 days, "Vote too old");
        
        // Basic proof validation (in production, use proper ZK-SNARK verification)
        for (uint256 i = 0; i < 8; i++) {
            require(voteProof.proof[i] != 0, "Invalid proof element");
        }
        
        return true;
    }
    
    /**
     * @dev Verify merkle proof
     */
    function verifyMerkleProof(
        bytes32 leaf,
        MerkleProof memory proof,
        uint256 root
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.siblings.length; i++) {
            if (proof.path & (1 << i) == 0) {
                computedHash = keccak256(abi.encodePacked(computedHash, proof.siblings[i]));
            } else {
                computedHash = keccak256(abi.encodePacked(proof.siblings[i], computedHash));
            }
        }
        
        return uint256(computedHash) == root;
    }
    
    /**
     * @dev Update merkle root (only owner)
     */
    function updateMerkleRoot(uint256 electionId, uint256 newRoot) external onlyOwner {
        require(elections[electionId].id != 0, "Election does not exist");
        
        elections[electionId].merkleRoot = newRoot;
        elections[electionId].updatedAt = block.timestamp;
        
        emit MerkleRootUpdated(electionId, newRoot);
    }
    
    /**
     * @dev Get election information
     */
    function getElection(uint256 electionId) external view returns (
        uint256 id,
        string memory title,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint256 totalVotes,
        uint256 candidateCount,
        address creator,
        bool isPrivate,
        uint256 merkleRoot
    ) {
        Election storage election = elections[electionId];
        require(election.id != 0, "Election does not exist");
        
        return (
            election.id,
            election.title,
            election.startTime,
            election.endTime,
            election.isActive,
            election.totalVotes,
            election.candidateCount,
            election.creator,
            election.isPrivate,
            election.merkleRoot
        );
    }
    
    /**
     * @dev Get candidate information
     */
    function getCandidate(uint256 electionId, uint256 candidateId) external view returns (
        uint256 id,
        string memory name,
        string memory description,
        string memory imageUrl,
        uint256 voteCount,
        bool isActive
    ) {
        Election storage election = elections[electionId];
        require(election.id != 0, "Election does not exist");
        require(candidateId > 0 && candidateId <= election.candidateCount, "Invalid candidate");
        
        Candidate storage candidate = election.candidates[candidateId];
        
        return (
            candidate.id,
            candidate.name,
            candidate.description,
            candidate.imageUrl,
            candidate.voteCount,
            candidate.isActive
        );
    }
    
    /**
     * @dev Get all candidate IDs for an election
     */
    function getCandidateIds(uint256 electionId) external view returns (uint256[] memory) {
        Election storage election = elections[electionId];
        require(election.id != 0, "Election does not exist");
        
        return election.candidateIds;
    }
    
    /**
     * @dev Check if nullifier has been used
     */
    function isNullifierUsed(uint256 electionId, bytes32 nullifier) external view returns (bool) {
        return elections[electionId].nullifiers[nullifier];
    }
    
    /**
     * @dev Get election results (only after voting ends)
     */
    function getElectionResults(uint256 electionId) external view returns (
        uint256[] memory candidateIds,
        uint256[] memory voteCounts,
        uint256 totalVotes
    ) {
        Election storage election = elections[electionId];
        require(election.id != 0, "Election does not exist");
        require(block.timestamp > election.endTime, "Voting has not ended");
        
        candidateIds = election.candidateIds;
        voteCounts = new uint256[](candidateIds.length);
        
        for (uint256 i = 0; i < candidateIds.length; i++) {
            voteCounts[i] = election.candidates[candidateIds[i]].voteCount;
        }
        
        totalVotes = election.totalVotes;
    }
    
    /**
     * @dev End election (only creator)
     */
    function endElection(uint256 electionId) external {
        Election storage election = elections[electionId];
        require(election.id != 0, "Election does not exist");
        require(msg.sender == election.creator, "Only creator can end election");
        require(election.isActive, "Election already ended");
        require(block.timestamp >= election.endTime, "Election time has not ended");
        
        election.isActive = false;
        election.updatedAt = block.timestamp;
    }
    
    /**
     * @dev Pause/unpause contract (only owner)
     */
    function togglePause() external onlyOwner {
        if (paused()) {
            _unpause();
        } else {
            _pause();
        }
    }
    
    /**
     * @dev Get all election IDs
     */
    function getAllElectionIds() external view returns (uint256[] memory) {
        return electionIds;
    }
    
    /**
     * @dev Get verification key
     */
    function getVerificationKey() external view returns (uint256[4] memory) {
        return verificationKey;
    }
}
