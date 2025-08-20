// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Election is Ownable, ReentrancyGuard {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }
    
    string public title;
    string public description;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public totalVotes;
    
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public voterChoice;
    uint256 public candidateCount;
    
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ElectionEnded(uint256 totalVotes);
    
    modifier onlyDuringVoting() {
        require(block.timestamp >= startTime, "Voting has not started");
        require(block.timestamp <= endTime, "Voting has ended");
        _;
    }
    
    modifier hasNotVoted() {
        require(!hasVoted[msg.sender], "You have already voted");
        _;
    }
    
    constructor(
        string memory _title,
        string memory _description,
        string[] memory _candidateNames,
        uint256 _startTime,
        uint256 _endTime,
        address _creator
    ) {
        require(_candidateNames.length >= 2, "Need at least 2 candidates");
        require(_startTime < _endTime, "Invalid time range");
        
        title = _title;
        description = _description;
        startTime = _startTime;
        endTime = _endTime;
        
        // Add candidates
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            candidateCount++;
            candidates[candidateCount] = Candidate({
                id: candidateCount,
                name: _candidateNames[i],
                voteCount: 0
            });
        }
        
        _transferOwnership(_creator);
    }
    
    function vote(uint256 _candidateId) 
        external 
        onlyDuringVoting 
        hasNotVoted 
        nonReentrant 
    {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        
        hasVoted[msg.sender] = true;
        voterChoice[msg.sender] = _candidateId;
        candidates[_candidateId].voteCount++;
        totalVotes++;
        
        emit VoteCast(msg.sender, _candidateId);
    }
    
    function getResults() external view returns (Candidate[] memory) {
        Candidate[] memory results = new Candidate[](candidateCount);
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            results[i - 1] = candidates[i];
        }
        
        return results;
    }
    
    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        return candidates[_candidateId];
    }
    
    function isVotingActive() external view returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime;
    }
    
    function getElectionInfo() external view returns (
        string memory,
        string memory,
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        return (title, description, startTime, endTime, totalVotes, candidateCount);
    }
    
    function getWinner() external view returns (Candidate memory) {
        require(block.timestamp > endTime, "Election not ended yet");
        require(totalVotes > 0, "No votes cast");
        
        uint256 winningVoteCount = 0;
        uint256 winnerId = 0;
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = candidates[i].voteCount;
                winnerId = i;
            }
        }
        
        return candidates[winnerId];
    }
    
    function endElection() external onlyOwner {
        require(block.timestamp > endTime, "Election period not over");
        emit ElectionEnded(totalVotes);
    }
}
