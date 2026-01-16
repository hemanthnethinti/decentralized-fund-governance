// Script constants and utilities
const ethers = require("ethers");

const Constants = {
  // Proposal Types
  ProposalType: {
    HighConviction: 0,
    Experimental: 1,
    Operational: 2
  },
  
  // Treasury Categories
  TreasuryCategory: {
    HighConvictionFund: 0,
    ExperimentalFund: 1,
    OperationalFund: 2
  },
  
  // Proposal States
  ProposalState: {
    Pending: 0,
    Active: 1,
    Defeated: 2,
    Queued: 3,
    Executed: 4,
    Cancelled: 5
  },
  
  // Vote Types
  VoteType: {
    Against: 0,
    For: 1,
    Abstain: 2
  },
  
  // ETH Amounts
  ETH: {
    parse: (amount) => ethers.parseEther(amount.toString()),
    format: (amount) => ethers.formatEther(amount)
  },
  
  // Time
  Time: {
    seconds: (n) => n,
    minutes: (n) => n * 60,
    hours: (n) => n * 60 * 60,
    days: (n) => n * 24 * 60 * 60
  }
};

module.exports = Constants;
