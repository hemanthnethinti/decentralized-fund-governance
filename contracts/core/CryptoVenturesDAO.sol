// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../libraries/Math.sol";

/**
 * @title CryptoVenturesDAO
 * @dev Comprehensive governance system for decentralized investment fund
 * Features: Staking, Weighted Voting, Delegation, Timelock, Multi-Tier Treasury
 */
contract CryptoVenturesDAO is AccessControl, ReentrancyGuard, Pausable {
    
    // ============ Roles ============
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    // ============ Enums ============
    enum ProposalState { Pending, Active, Defeated, Queued, Executed, Cancelled }
    
    enum VoteType { Against, For, Abstain }
    
    enum ProposalType { 
        HighConviction,    // Large investments, highest requirements
        Experimental,      // Risky investments, moderate requirements
        Operational        // Day-to-day expenses, lowest requirements
    }
    
    enum TreasuryCategory {
        HighConvictionFund,
        ExperimentalFund,
        OperationalFund
    }
    
    // ============ Structs ============
    struct Proposal {
        uint256 id;
        address proposer;
        address recipient;
        uint256 amount;
        string description;
        ProposalType proposalType;
        TreasuryCategory category;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        ProposalState state;
        uint256 queuedTime;
        uint256 executedTime;
        mapping(address => bool) hasVoted;
        mapping(address => VoteType) votes;
    }
    
    struct ProposalConfig {
        uint256 votingPeriod;      // Duration of voting in seconds
        uint256 quorumPercentage;  // Required quorum (basis points: 100 = 1%)
        uint256 approvalThreshold; // Required approval % (basis points)
        uint256 timelockDelay;     // Delay before execution in seconds
    }
    
    struct Member {
        uint256 stake;
        uint256 votingPower;
        address delegateTo;
        uint256 delegatedPower;
    }
    
    // ============ State Variables ============
    
    // Member management
    mapping(address => Member) public members;
    uint256 public totalStaked;
    uint256 public totalVotingPower;
    address[] public memberList;
    
    // Proposal management
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256 public constant MINIMUM_STAKE_TO_PROPOSE = 0.1 ether;
    
    // Proposal configurations by type
    mapping(ProposalType => ProposalConfig) public proposalConfigs;
    
    // Treasury management
    mapping(TreasuryCategory => uint256) public treasuryBalances;
    mapping(TreasuryCategory => uint256) public treasuryLimits;
    
    // Voting power calculation parameters
    uint256 public constant VOTING_POWER_COEFFICIENT = 100; // Used for square root approximation
    
    // ============ Events ============
    event MemberJoined(address indexed member, uint256 stake, uint256 votingPower);
    event StakeIncreased(address indexed member, uint256 additionalStake, uint256 newVotingPower);
    event StakeWithdrawn(address indexed member, uint256 amount, uint256 newVotingPower);
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address recipient,
        uint256 amount,
        ProposalType proposalType,
        string description
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType voteType,
        uint256 votingPower
    );
    
    event VotingPowerDelegated(
        address indexed delegator,
        address indexed delegatee,
        uint256 votingPower
    );
    
    event DelegationRevoked(
        address indexed delegator,
        address indexed previousDelegatee,
        uint256 votingPower
    );
    
    event ProposalQueued(uint256 indexed proposalId, uint256 queuedTime, uint256 executionTime);
    event ProposalExecuted(uint256 indexed proposalId, address recipient, uint256 amount);
    event ProposalDefeated(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId, address indexed canceller);
    
    event TreasuryDeposit(TreasuryCategory indexed category, uint256 amount);
    event EmergencyPause(address indexed guardian);
    event EmergencyUnpause(address indexed guardian);
    
    // ============ Constructor ============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GUARDIAN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        
        // Configure High Conviction proposals
        proposalConfigs[ProposalType.HighConviction] = ProposalConfig({
            votingPeriod: 7 days,
            quorumPercentage: 4000,  // 40%
            approvalThreshold: 6500,  // 65%
            timelockDelay: 2 days
        });
        
        // Configure Experimental proposals
        proposalConfigs[ProposalType.Experimental] = ProposalConfig({
            votingPeriod: 5 days,
            quorumPercentage: 2500,  // 25%
            approvalThreshold: 5500,  // 55%
            timelockDelay: 1 days
        });
        
        // Configure Operational proposals
        proposalConfigs[ProposalType.Operational] = ProposalConfig({
            votingPeriod: 3 days,
            quorumPercentage: 1500,  // 15%
            approvalThreshold: 5000,  // 50%
            timelockDelay: 12 hours
        });
        
        // Set treasury limits
        treasuryLimits[TreasuryCategory.HighConvictionFund] = type(uint256).max;
        treasuryLimits[TreasuryCategory.ExperimentalFund] = type(uint256).max;
        treasuryLimits[TreasuryCategory.OperationalFund] = type(uint256).max;
    }
    
    // ============ Member Functions ============
    
    /**
     * @dev Join DAO by depositing ETH stake
     * Voting power calculated using square root to reduce whale dominance
     */
    function joinDAO() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Must deposit ETH");
        
        Member storage member = members[msg.sender];
        
        if (member.stake == 0) {
            memberList.push(msg.sender);
            _grantRole(PROPOSER_ROLE, msg.sender);
        }
        
        member.stake += msg.value;
        totalStaked += msg.value;
        
        // Calculate voting power using square root to reduce whale dominance
        uint256 oldVotingPower = member.votingPower;
        member.votingPower = Math.sqrt(member.stake * VOTING_POWER_COEFFICIENT);
        
        // Update total voting power
        totalVotingPower = totalVotingPower - oldVotingPower + member.votingPower;
        
        // If delegated, update delegate's power
        if (member.delegateTo != address(0)) {
            members[member.delegateTo].delegatedPower = 
                members[member.delegateTo].delegatedPower - oldVotingPower + member.votingPower;
        }
        
        if (oldVotingPower == 0) {
            emit MemberJoined(msg.sender, msg.value, member.votingPower);
        } else {
            emit StakeIncreased(msg.sender, msg.value, member.votingPower);
        }
    }
    
    /**
     * @dev Withdraw stake from DAO
     */
    function withdrawStake(uint256 amount) external nonReentrant whenNotPaused {
        Member storage member = members[msg.sender];
        require(member.stake >= amount, "Insufficient stake");
        require(member.delegateTo == address(0), "Must revoke delegation first");
        
        member.stake -= amount;
        totalStaked -= amount;
        
        uint256 oldVotingPower = member.votingPower;
        member.votingPower = member.stake > 0 ? Math.sqrt(member.stake * VOTING_POWER_COEFFICIENT) : 0;
        
        totalVotingPower = totalVotingPower - oldVotingPower + member.votingPower;
        
        payable(msg.sender).transfer(amount);
        
        emit StakeWithdrawn(msg.sender, amount, member.votingPower);
    }
    
    /**
     * @dev Get current voting power of a member
     */
    function getVotingPower(address account) public view returns (uint256) {
        return members[account].votingPower;
    }
    
    /**
     * @dev Get effective voting power (own + delegated)
     */
    function getEffectiveVotingPower(address account) public view returns (uint256) {
        Member storage member = members[account];
        return member.votingPower + member.delegatedPower;
    }
    
    // ============ Delegation Functions ============
    
    /**
     * @dev Delegate voting power to another member
     */
    function delegateVotingPower(address delegatee) external whenNotPaused {
        require(delegatee != address(0), "Cannot delegate to zero address");
        require(delegatee != msg.sender, "Cannot delegate to self");
        require(members[msg.sender].stake > 0, "Must have stake to delegate");
        require(members[msg.sender].delegateTo == address(0), "Already delegated, revoke first");
        
        Member storage delegator = members[msg.sender];
        Member storage delegate = members[delegatee];
        
        delegator.delegateTo = delegatee;
        delegate.delegatedPower += delegator.votingPower;
        
        emit VotingPowerDelegated(msg.sender, delegatee, delegator.votingPower);
    }
    
    /**
     * @dev Revoke delegation
     */
    function revokeDelegation() external whenNotPaused {
        Member storage delegator = members[msg.sender];
        require(delegator.delegateTo != address(0), "No active delegation");
        
        address previousDelegate = delegator.delegateTo;
        Member storage delegate = members[previousDelegate];
        
        delegate.delegatedPower -= delegator.votingPower;
        delegator.delegateTo = address(0);
        
        emit DelegationRevoked(msg.sender, previousDelegate, delegator.votingPower);
    }
    
    // ============ Proposal Functions ============
    
    /**
     * @dev Create a new proposal
     */
    function createProposal(
        address recipient,
        uint256 amount,
        string memory description,
        ProposalType proposalType,
        TreasuryCategory category
    ) external onlyRole(PROPOSER_ROLE) whenNotPaused returns (uint256) {
        require(members[msg.sender].stake >= MINIMUM_STAKE_TO_PROPOSE, "Insufficient stake to propose");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(description).length > 0, "Description required");
        
        // Validate treasury category matches proposal type
        require(
            (proposalType == ProposalType.HighConviction && category == TreasuryCategory.HighConvictionFund) ||
            (proposalType == ProposalType.Experimental && category == TreasuryCategory.ExperimentalFund) ||
            (proposalType == ProposalType.Operational && category == TreasuryCategory.OperationalFund),
            "Category must match proposal type"
        );
        
        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        
        proposal.id = proposalCount;
        proposal.proposer = msg.sender;
        proposal.recipient = recipient;
        proposal.amount = amount;
        proposal.description = description;
        proposal.proposalType = proposalType;
        proposal.category = category;
        proposal.state = ProposalState.Pending;
        
        emit ProposalCreated(proposalCount, msg.sender, recipient, amount, proposalType, description);
        
        return proposalCount;
    }
    
    /**
     * @dev Activate proposal to start voting
     */
    function activateProposal(uint256 proposalId) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.state == ProposalState.Pending, "Proposal not in pending state");
        require(
            proposal.proposer == msg.sender || hasRole(GUARDIAN_ROLE, msg.sender),
            "Only proposer or guardian can activate"
        );
        
        ProposalConfig memory config = proposalConfigs[proposal.proposalType];
        
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + config.votingPeriod;
        proposal.state = ProposalState.Active;
    }
    
    /**
     * @dev Cast a vote on an active proposal
     */
    function castVote(uint256 proposalId, VoteType voteType) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(members[msg.sender].delegateTo == address(0), "Cannot vote when delegated");
        
        uint256 votingPower = getEffectiveVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        proposal.votes[msg.sender] = voteType;
        
        if (voteType == VoteType.For) {
            proposal.forVotes += votingPower;
        } else if (voteType == VoteType.Against) {
            proposal.againstVotes += votingPower;
        } else {
            proposal.abstainVotes += votingPower;
        }
        
        emit VoteCast(msg.sender, proposalId, voteType, votingPower);
    }
    
    /**
     * @dev Queue a proposal after voting ends if it passes
     */
    function queueProposal(uint256 proposalId) external whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        
        ProposalConfig memory config = proposalConfigs[proposal.proposalType];
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 requiredQuorum = (totalVotingPower * config.quorumPercentage) / 10000;
        
        // Check quorum
        if (totalVotes < requiredQuorum) {
            proposal.state = ProposalState.Defeated;
            emit ProposalDefeated(proposalId);
            return;
        }
        
        // Check approval threshold (for votes vs for + against)
        uint256 votesForDecision = proposal.forVotes + proposal.againstVotes;
        if (votesForDecision == 0) {
            proposal.state = ProposalState.Defeated;
            emit ProposalDefeated(proposalId);
            return;
        }
        
        uint256 approvalPercentage = (proposal.forVotes * 10000) / votesForDecision;
        
        if (approvalPercentage >= config.approvalThreshold) {
            proposal.state = ProposalState.Queued;
            proposal.queuedTime = block.timestamp;
            
            uint256 executionTime = block.timestamp + config.timelockDelay;
            emit ProposalQueued(proposalId, block.timestamp, executionTime);
        } else {
            proposal.state = ProposalState.Defeated;
            emit ProposalDefeated(proposalId);
        }
    }
    
    /**
     * @dev Execute a queued proposal after timelock
     */
    function executeProposal(uint256 proposalId) external onlyRole(EXECUTOR_ROLE) nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.state == ProposalState.Queued, "Proposal not queued");
        
        ProposalConfig memory config = proposalConfigs[proposal.proposalType];
        require(
            block.timestamp >= proposal.queuedTime + config.timelockDelay,
            "Timelock period not elapsed"
        );
        
        // Check treasury has sufficient funds
        require(
            treasuryBalances[proposal.category] >= proposal.amount,
            "Insufficient treasury funds"
        );
        
        proposal.state = ProposalState.Executed;
        proposal.executedTime = block.timestamp;
        
        treasuryBalances[proposal.category] -= proposal.amount;
        
        payable(proposal.recipient).transfer(proposal.amount);
        
        emit ProposalExecuted(proposalId, proposal.recipient, proposal.amount);
    }
    
    /**
     * @dev Cancel a queued proposal (emergency function)
     */
    function cancelProposal(uint256 proposalId) external onlyRole(GUARDIAN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(
            proposal.state == ProposalState.Queued || proposal.state == ProposalState.Active,
            "Cannot cancel proposal in current state"
        );
        
        proposal.state = ProposalState.Cancelled;
        
        emit ProposalCancelled(proposalId, msg.sender);
    }
    
    /**
     * @dev Get proposal state
     */
    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        return proposals[proposalId].state;
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposalDetails(uint256 proposalId) external view returns (
        address proposer,
        address recipient,
        uint256 amount,
        string memory description,
        ProposalType proposalType,
        ProposalState state,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 startTime,
        uint256 endTime
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.recipient,
            proposal.amount,
            proposal.description,
            proposal.proposalType,
            proposal.state,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.startTime,
            proposal.endTime
        );
    }
    
    /**
     * @dev Check if address has voted on proposal
     */
    function hasVotedOnProposal(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    /**
     * @dev Get vote cast by address on proposal
     */
    function getVote(uint256 proposalId, address voter) external view returns (VoteType) {
        require(proposals[proposalId].hasVoted[voter], "Has not voted");
        return proposals[proposalId].votes[voter];
    }
    
    // ============ Treasury Functions ============
    
    /**
     * @dev Deposit funds to specific treasury category
     */
    function depositToTreasury(TreasuryCategory category) external payable whenNotPaused {
        require(msg.value > 0, "Must deposit ETH");
        require(
            treasuryBalances[category] + msg.value <= treasuryLimits[category],
            "Exceeds treasury limit"
        );
        
        treasuryBalances[category] += msg.value;
        
        emit TreasuryDeposit(category, msg.value);
    }
    
    /**
     * @dev Set treasury limit for a category
     */
    function setTreasuryLimit(TreasuryCategory category, uint256 limit) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        treasuryLimits[category] = limit;
    }
    
    /**
     * @dev Get total treasury balance
     */
    function getTotalTreasuryBalance() external view returns (uint256) {
        return treasuryBalances[TreasuryCategory.HighConvictionFund] +
               treasuryBalances[TreasuryCategory.ExperimentalFund] +
               treasuryBalances[TreasuryCategory.OperationalFund];
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @dev Update proposal configuration
     */
    function updateProposalConfig(
        ProposalType proposalType,
        uint256 votingPeriod,
        uint256 quorumPercentage,
        uint256 approvalThreshold,
        uint256 timelockDelay
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(quorumPercentage <= 10000, "Quorum cannot exceed 100%");
        require(approvalThreshold <= 10000, "Threshold cannot exceed 100%");
        
        proposalConfigs[proposalType] = ProposalConfig({
            votingPeriod: votingPeriod,
            quorumPercentage: quorumPercentage,
            approvalThreshold: approvalThreshold,
            timelockDelay: timelockDelay
        });
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender);
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }
    
    /**
     * @dev Get member count
     */
    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }
    
    /**
     * @dev Receive ETH
     */
    receive() external payable {
        // Accept ETH donations to general fund
        treasuryBalances[TreasuryCategory.OperationalFund] += msg.value;
    }
}
