// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Election.sol";

contract ElectionFactory is Ownable, ReentrancyGuard {
    struct ElectionInfo {
        address electionContract;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        address creator;
        bool isActive;
    }
    
    mapping(uint256 => ElectionInfo) public elections;
    uint256 public electionCount;
    
    event ElectionCreated(
        uint256 indexed electionId,
        address indexed electionContract,
        string title,
        address indexed creator
    );
    
    function createElection(
        string memory _title,
        string memory _description,
        string[] memory _candidateNames,
        uint256 _startTime,
        uint256 _endTime
    ) external nonReentrant returns (address) {
        require(_startTime < _endTime, "Invalid time range");
        require(_candidateNames.length >= 2, "Need at least 2 candidates");
        require(_startTime > block.timestamp, "Start time must be in future");
        
        Election newElection = new Election(
            _title,
            _description,
            _candidateNames,
            _startTime,
            _endTime,
            msg.sender
        );
        
        electionCount++;
        elections[electionCount] = ElectionInfo({
            electionContract: address(newElection),
            title: _title,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            creator: msg.sender,
            isActive: true
        });
        
        emit ElectionCreated(electionCount, address(newElection), _title, msg.sender);
        return address(newElection);
    }
    
    function getActiveElections() external view returns (ElectionInfo[] memory) {
        uint256 activeCount = 0;
        
        // Count active elections
        for (uint256 i = 1; i <= electionCount; i++) {
            if (elections[i].isActive && block.timestamp >= elections[i].startTime) {
                activeCount++;
            }
        }
        
        // Create array of active elections
        ElectionInfo[] memory activeElections = new ElectionInfo[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= electionCount; i++) {
            if (elections[i].isActive && block.timestamp >= elections[i].startTime) {
                activeElections[index] = elections[i];
                index++;
            }
        }
        
        return activeElections;
    }
    
    function getAllElections() external view returns (ElectionInfo[] memory) {
        ElectionInfo[] memory allElections = new ElectionInfo[](electionCount);
        
        for (uint256 i = 1; i <= electionCount; i++) {
            allElections[i - 1] = elections[i];
        }
        
        return allElections;
    }
    
    function getElection(uint256 _electionId) external view returns (ElectionInfo memory) {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        return elections[_electionId];
    }
    
    function deactivateElection(uint256 _electionId) external onlyOwner {
        require(_electionId > 0 && _electionId <= electionCount, "Invalid election ID");
        elections[_electionId].isActive = false;
    }
}
