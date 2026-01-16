// Role definitions
module.exports = {
  roles: {
    DEFAULT_ADMIN: "0x0000000000000000000000000000000000000000000000000000000000000000",
    PROPOSER: "0x3bfa6196796b1e6d3f6b1a7e1f8e7e8f8e7e8f8e7e8f8e7e8f8e7e8f8e7e8f",
    EXECUTOR: "0x4bfa6196796b1e6d3f6b1a7e1f8e7e8f8e7e8f8e7e8f8e7e8f8e7e8f8e7e8f",
    GUARDIAN: "0x5bfa6196796b1e6d3f6b1a7e1f8e7e8f8e7e8f8e7e8f8e7e8f8e7e8f8e7e8f"
  },
  
  permissions: {
    PROPOSER: [
      "createProposal",
      "activateProposal",
      "joinDAO",
      "delegateVotingPower",
      "revokeDelegation"
    ],
    VOTER: [
      "castVote",
      "joinDAO",
      "delegateVotingPower",
      "revokeDelegation"
    ],
    EXECUTOR: [
      "executeProposal"
    ],
    GUARDIAN: [
      "cancelProposal",
      "pause",
      "unpause"
    ]
  }
};
