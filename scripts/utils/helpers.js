// Helper functions for governance interactions
const ethers = require("ethers");

const Helpers = {
  /**
   * Calculate voting power from stake
   */
  calculateVotingPower: (stake) => {
    const COEFFICIENT = 100n;
    return sqrt(stake * COEFFICIENT);
  },
  
  /**
   * Square root calculation
   */
  sqrt: (value) => {
    if (value === 0n) return 0n;
    let z = (value + 1n) / 2n;
    let y = value;
    while (z < y) {
      y = z;
      z = (value / z + z) / 2n;
    }
    return y;
  },
  
  /**
   * Format proposal details
   */
  formatProposal: (details) => {
    return {
      proposer: details.proposer,
      recipient: details.recipient,
      amount: ethers.formatEther(details.amount),
      description: details.description,
      state: ["Pending", "Active", "Defeated", "Queued", "Executed", "Cancelled"][details.state],
      forVotes: details.forVotes.toString(),
      againstVotes: details.againstVotes.toString(),
      abstainVotes: details.abstainVotes.toString()
    };
  },
  
  /**
   * Parse proposal type name
   */
  getProposalTypeName: (type) => {
    const names = ["High Conviction", "Experimental", "Operational"];
    return names[type] || "Unknown";
  },
  
  /**
   * Parse vote type name
   */
  getVoteTypeName: (type) => {
    const names = ["Against", "For", "Abstain"];
    return names[type] || "Unknown";
  },
  
  /**
   * Wait for transaction
   */
  waitForTx: async (tx, confirmations = 1) => {
    console.log(`Tx hash: ${tx.hash}`);
    return await tx.wait(confirmations);
  }
};

module.exports = Helpers;
