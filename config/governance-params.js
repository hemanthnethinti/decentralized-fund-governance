// Governance parameters
module.exports = {
  proposalTypes: {
    HighConviction: {
      votingPeriod: 7 * 24 * 60 * 60,      // 7 days
      quorumPercentage: 4000,              // 40% in basis points
      approvalThreshold: 6500,             // 65% in basis points
      timelockDelay: 2 * 24 * 60 * 60      // 2 days
    },
    Experimental: {
      votingPeriod: 5 * 24 * 60 * 60,      // 5 days
      quorumPercentage: 2500,              // 25% in basis points
      approvalThreshold: 5500,             // 55% in basis points
      timelockDelay: 1 * 24 * 60 * 60      // 1 day
    },
    Operational: {
      votingPeriod: 3 * 24 * 60 * 60,      // 3 days
      quorumPercentage: 1500,              // 15% in basis points
      approvalThreshold: 5000,             // 50% in basis points
      timelockDelay: 12 * 60 * 60          // 12 hours
    }
  },
  
  minStakeToPropose: "0.1",               // in ETH
  votingPowerCoefficient: 100,
  
  treasuryCategories: {
    HighConviction: 0,
    Experimental: 1,
    Operational: 2
  },
  
  initialTreasuryFunding: {
    HighConviction: "100",                // in ETH
    Experimental: "50",                   // in ETH
    Operational: "20"                     // in ETH
  }
};
