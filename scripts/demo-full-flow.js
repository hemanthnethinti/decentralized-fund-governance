const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
  console.log("Running Complete Governance Flow Demo...\n");
  
  const [owner, member1, member2, member3, recipient] = await ethers.getSigners();
  
  // Deploy DAO
  console.log("=== Deploying DAO ===");
  const CryptoVenturesDAO = await ethers.getContractFactory("CryptoVenturesDAO");
  const dao = await CryptoVenturesDAO.deploy();
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("DAO deployed to:", daoAddress);
  
  // Members join
  console.log("\n=== Members Join DAO ===");
  await dao.connect(member1).joinDAO({ value: ethers.parseEther("5") });
  console.log("✓ Member1 joined with 5 ETH");
  
  await dao.connect(member2).joinDAO({ value: ethers.parseEther("5") });
  console.log("✓ Member2 joined with 5 ETH");
  
  await dao.connect(member3).joinDAO({ value: ethers.parseEther("5") });
  console.log("✓ Member3 joined with 5 ETH");
  
  console.log("\nTotal Staked:", ethers.formatEther(await dao.totalStaked()), "ETH");
  console.log("Total Voting Power:", (await dao.totalVotingPower()).toString());
  
  // Fund treasury
  console.log("\n=== Fund Treasury ===");
  await dao.depositToTreasury(2, { value: ethers.parseEther("20") }); // Operational
  console.log("✓ Deposited 20 ETH to Operational Fund");
  
  // Create proposal
  console.log("\n=== Create Proposal ===");
  const tx = await dao.connect(member1).createProposal(
    recipient.address,
    ethers.parseEther("2"),
    "Fund Q1 2026 Development Budget",
    2, // Operational
    2  // OperationalFund
  );
  const receipt = await tx.wait();
  const proposalId = 1n;
  console.log("✓ Proposal created with ID:", proposalId.toString());
  
  // Activate proposal
  console.log("\n=== Activate Proposal ===");
  await dao.connect(member1).activateProposal(proposalId);
  console.log("✓ Proposal activated");
  
  const details = await dao.getProposalDetails(proposalId);
  console.log("\nProposal Details:");
  console.log("- Amount:", ethers.formatEther(details.amount), "ETH");
  console.log("- Description:", details.description);
  console.log("- Recipient:", details.recipient);
  
  // Cast votes
  console.log("\n=== Cast Votes ===");
  await dao.connect(member1).castVote(proposalId, 1); // For
  console.log("✓ Member1 voted FOR");
  
  await dao.connect(member2).castVote(proposalId, 1); // For
  console.log("✓ Member2 voted FOR");
  
  await dao.connect(member3).castVote(proposalId, 0); // Against
  console.log("✓ Member3 voted AGAINST");
  
  const voteDetails = await dao.getProposalDetails(proposalId);
  console.log("\nVote Tally:");
  console.log("- For:", voteDetails.forVotes.toString());
  console.log("- Against:", voteDetails.againstVotes.toString());
  console.log("- Abstain:", voteDetails.abstainVotes.toString());
  
  // Fast forward past voting period (3 days)
  console.log("\n=== Fast Forward Time ===");
  console.log("Advancing 3 days (voting period)...");
  await time.increase(3 * 24 * 60 * 60 + 1);
  console.log("✓ Voting period ended");
  
  // Queue proposal
  console.log("\n=== Queue Proposal ===");
  await dao.queueProposal(proposalId);
  const state1 = await dao.getProposalState(proposalId);
  console.log("✓ Proposal queued (state:", state1.toString(), ")");
  
  // Fast forward past timelock (12 hours)
  console.log("\n=== Wait for Timelock ===");
  console.log("Advancing 12 hours (timelock period)...");
  await time.increase(12 * 60 * 60 + 1);
  console.log("✓ Timelock period elapsed");
  
  // Execute proposal
  console.log("\n=== Execute Proposal ===");
  const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
  
  await dao.connect(owner).executeProposal(proposalId);
  console.log("✓ Proposal executed");
  
  const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
  const received = recipientBalanceAfter - recipientBalanceBefore;
  
  console.log("\nRecipient received:", ethers.formatEther(received), "ETH");
  
  const state2 = await dao.getProposalState(proposalId);
  console.log("Proposal state:", state2.toString(), "(4 = Executed)");
  
  const newTreasuryBalance = await dao.treasuryBalances(2);
  console.log("Remaining treasury balance:", ethers.formatEther(newTreasuryBalance), "ETH");
  
  console.log("\n=== Demo Complete ===");
  console.log("Successfully demonstrated full governance lifecycle:");
  console.log("✓ Members joined and staked");
  console.log("✓ Proposal created and activated");
  console.log("✓ Votes cast with weighted voting power");
  console.log("✓ Proposal queued after passing");
  console.log("✓ Timelock enforced");
  console.log("✓ Proposal executed and funds transferred");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
