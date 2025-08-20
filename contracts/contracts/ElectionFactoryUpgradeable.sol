// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./ElectionUpgradeable.sol";

/**
 * @title ElectionFactoryUpgradeable
 * @dev Factory contract for creating upgradeable election contracts
 * @dev Uses OpenZeppelin's upgradeable pattern for better maintainability
 */
contract ElectionFactoryUpgradeable is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _electionCounter;
    
    // Mapping from election ID to election contract address
    mapping(uint256 => address) public elections;
    
    // Mapping from election address to election info
    mapping(address => ElectionInfo) public electionInfo;
    
    // Array of all election addresses
    address[] public allElections;
    
    // Events
    event ElectionCreated(
        uint256 indexed electionId,
        address indexed electionAddress,
        address indexed creator,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event ElectionPaused(uint256 indexed electionId, address indexed electionAddress);
    event ElectionUnpaused(uint256 indexed electionId, address indexed electionAddress);
    event FactoryPaused(address indexed pauser);
    event FactoryUnpaused(address indexed pauser);
    
    struct ElectionInfo {
        uint256 electionId;
        address creator;
        string title;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 totalVotes;
        uint256 candidateCount;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address initialOwner) public initializer {
        __Ownable_init();
        _transferOwnership(initialOwner);
        __ReentrancyGuard_init();
        __Pausable_init();
    }
    
    /**
     * @dev Create a new election
     * @param title Election title
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @param candidateNames Array of candidate names
     * @param candidateDescriptions Array of candidate descriptions
     * @param candidateImageUrls Array of candidate image URLs
     * @return electionAddress Address of the created election contract
     */
    function createElection(
        string memory title,
        uint256 startTime,
        uint256 endTime,
        string[] memory candidateNames,
        string[] memory candidateDescriptions,
        string[] memory candidateImageUrls
    ) external whenNotPaused nonReentrant returns (address electionAddress) {
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
        
        // Create new election contract
        ElectionUpgradeable election = new ElectionUpgradeable();
        election.initialize(
            title,
            startTime,
            endTime,
            candidateNames,
            candidateDescriptions,
            candidateImageUrls,
            msg.sender
        );
        
        electionAddress = address(election);
        
        // Store election info
        elections[electionId] = electionAddress;
        electionInfo[electionAddress] = ElectionInfo({
            electionId: electionId,
            creator: msg.sender,
            title: title,
            startTime: startTime,
            endTime: endTime,
            isActive: true,
            totalVotes: 0,
            candidateCount: candidateNames.length
        });
        
        allElections.push(electionAddress);
        
        emit ElectionCreated(
            electionId,
            electionAddress,
            msg.sender,
            title,
            startTime,
            endTime
        );
    }
    
    /**
     * @dev Get election statistics
     * @param electionId ID of the election
     * @return info Election information
     */
    function getElectionStats(uint256 electionId) external view returns (ElectionInfo memory info) {
        require(elections[electionId] != address(0), "Election does not exist");
        info = electionInfo[elections[electionId]];
        
        // Get real-time data from election contract
        ElectionUpgradeable election = ElectionUpgradeable(elections[electionId]);
        info.totalVotes = election.getTotalVotes();
        info.isActive = election.isActive();
    }
    
    /**
     * @dev Get all elections
     * @return Array of all election addresses
     */
    function getAllElections() external view returns (address[] memory) {
        return allElections;
    }
    
    /**
     * @dev Get elections by creator
     * @param creator Address of the election creator
     * @return Array of election addresses created by the specified address
     */
    function getElectionsByCreator(address creator) external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allElections.length; i++) {
            if (electionInfo[allElections[i]].creator == creator) {
                count++;
            }
        }
        
        address[] memory creatorElections = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allElections.length; i++) {
            if (electionInfo[allElections[i]].creator == creator) {
                creatorElections[index] = allElections[i];
                index++;
            }
        }
        
        return creatorElections;
    }
    
    /**
     * @dev Pause/unpause specific election (only creator or owner)
     * @param electionId ID of the election to pause/unpause
     */
    function toggleElectionPause(uint256 electionId) external {
        address electionAddress = elections[electionId];
        require(electionAddress != address(0), "Election does not exist");
        
        ElectionInfo memory info = electionInfo[electionAddress];
        require(
            msg.sender == info.creator || msg.sender == owner(),
            "Only creator or owner can pause/unpause"
        );
        
        ElectionUpgradeable election = ElectionUpgradeable(electionAddress);
        
        if (election.isActive()) {
            election.togglePause();
            emit ElectionPaused(electionId, electionAddress);
        } else {
            election.togglePause();
            emit ElectionUnpaused(electionId, electionAddress);
        }
    }
    
    /**
     * @dev Pause factory (only owner)
     */
    function pauseFactory() external onlyOwner {
        _pause();
        emit FactoryPaused(msg.sender);
    }
    
    /**
     * @dev Unpause factory (only owner)
     */
    function unpauseFactory() external onlyOwner {
        _unpause();
        emit FactoryUnpaused(msg.sender);
    }
    
    /**
     * @dev Get total number of elections
     * @return Total count of elections
     */
    function getElectionCount() external view returns (uint256) {
        return _electionCounter.current();
    }
    
    /**
     * @dev Check if address is an election creator
     * @param creator Address to check
     * @return True if address has created elections
     */
    function isElectionCreator(address creator) external view returns (bool) {
        for (uint256 i = 0; i < allElections.length; i++) {
            if (electionInfo[allElections[i]].creator == creator) {
                return true;
            }
        }
        return false;
    }
}
