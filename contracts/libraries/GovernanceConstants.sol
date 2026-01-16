// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GovernanceConstants
 * @dev Constants used throughout the governance system
 */
library GovernanceConstants {
    // Proposal Types
    uint8 public constant PROPOSAL_TYPE_HIGH_CONVICTION = 0;
    uint8 public constant PROPOSAL_TYPE_EXPERIMENTAL = 1;
    uint8 public constant PROPOSAL_TYPE_OPERATIONAL = 2;
    
    // Treasury Categories
    uint8 public constant TREASURY_HIGH_CONVICTION = 0;
    uint8 public constant TREASURY_EXPERIMENTAL = 1;
    uint8 public constant TREASURY_OPERATIONAL = 2;
    
    // Proposal States
    uint8 public constant STATE_PENDING = 0;
    uint8 public constant STATE_ACTIVE = 1;
    uint8 public constant STATE_DEFEATED = 2;
    uint8 public constant STATE_QUEUED = 3;
    uint8 public constant STATE_EXECUTED = 4;
    uint8 public constant STATE_CANCELLED = 5;
    
    // Vote Types
    uint8 public constant VOTE_AGAINST = 0;
    uint8 public constant VOTE_FOR = 1;
    uint8 public constant VOTE_ABSTAIN = 2;
    
    // System Parameters
    uint256 public constant MINIMUM_STAKE_TO_PROPOSE = 0.1 ether;
    uint256 public constant VOTING_POWER_COEFFICIENT = 100;
    
    // Time Periods
    uint256 public constant HIGH_CONVICTION_VOTING_PERIOD = 7 days;
    uint256 public constant EXPERIMENTAL_VOTING_PERIOD = 5 days;
    uint256 public constant OPERATIONAL_VOTING_PERIOD = 3 days;
    
    uint256 public constant HIGH_CONVICTION_TIMELOCK = 2 days;
    uint256 public constant EXPERIMENTAL_TIMELOCK = 1 days;
    uint256 public constant OPERATIONAL_TIMELOCK = 12 hours;
    
    // Governance Requirements (basis points: 100 = 1%)
    uint256 public constant HIGH_CONVICTION_QUORUM = 4000;      // 40%
    uint256 public constant EXPERIMENTAL_QUORUM = 2500;         // 25%
    uint256 public constant OPERATIONAL_QUORUM = 1500;          // 15%
    
    uint256 public constant HIGH_CONVICTION_THRESHOLD = 6500;   // 65%
    uint256 public constant EXPERIMENTAL_THRESHOLD = 5500;      // 55%
    uint256 public constant OPERATIONAL_THRESHOLD = 5000;       // 50%
}
