const { ethers } = require("hardhat");

// Replace with your deployed DAO address
const DAO_ADDRESS = "YOUR_DAO_ADDRESS_HERE";

async function main() {
  const [owner, member1, member2, recipient] = await ethers.getSigners();
  
  console.log("Interacting with CryptoVenturesDAO at:", DAO_ADDRESS);
  console.log("Using accounts:");
  console.log("- Owner:", owner.address);
  console.log("- Member1:", member1.address);
  console.log("- Member2:", member2.address);
  console.log("- Recipient:", recipient.address);
  
  const dao = await ethers.getContractAt("CryptoVenturesDAO", DAO_ADDRESS);
  
  // Step 1: Members join DAO
  console.log("\n=== Step 1: Members Join DAO ===");
  
  console.log("Member1 joining with 1 ETH...");
  let tx = await dao.connect(member1).joinDAO({ value: ethers.parseEther("1") });
  await tx.wait();
  console.log("✓ Member1 joined");
  
  console.log("Member2 joining with 2 ETH...");
  tx = await dao.connect(member2).joinDAO({ value: ethers.parseEther("2") });
  await tx.wait();
  console.log("✓ Member2 joined");
  
  const member1Data = await dao.members(member1.address);
  const member2Data = await dao.members(member2.address);
  
  console.log("\nMember1 stats:");
  console.log("- Stake:", ethers.formatEther(member1Data.stake), "ETH");
  console.log("- Voting Power:", member1Data.votingPower.toString());
  
  console.log("\nMember2 stats:");
  console.log("- Stake:", ethers.formatEther(member2Data.stake), "ETH");
  console.log("- Voting Power:", member2Data.votingPower.toString());
  
  const totalStaked = await dao.totalStaked();
  const totalVotingPower = await dao.totalVotingPower();
  console.log("\nDAO Totals:");
  console.log("- Total Staked:", ethers.formatEther(totalStaked), "ETH");
  console.log("- Total Voting Power:", totalVotingPower.toString());
  
  // Step 2: Deposit to treasury
  console.log("\n=== Step 2: Deposit to Treasury ===");
  
  console.log("Depositing 10 ETH to Operational Fund...");
  tx = await dao.depositToTreasury(2, { value: ethers.parseEther("10") }); // 2 = OperationalFund
  await tx.wait();
  console.log("✓ Treasury funded");
  
  const operationalBalance = await dao.treasuryBalances(2);
  console.log("Operational Fund Balance:", ethers.formatEther(operationalBalance), "ETH");
  
  // Step 3: Create a proposal
  console.log("\n=== Step 3: Create Proposal ===");
  
  console.log("Member1 creating operational proposal...");
  tx = await dao.connect(member1).createProposal(
    recipient.address,
    ethers.parseEther("1"),
    "Fund development team for Q1 2026",
    2, // Operational
    2  // OperationalFund
  );
  let receipt = await tx.wait();
  
  // Get proposal ID from event
  const proposalCreatedEvent = receipt.logs.find(
    log => log.fragment && log.fragment.name === "ProposalCreated"
  );
  const proposalId = proposalCreatedEvent.args[0];
  
  console.log("✓ Proposal created with ID:", proposalId.toString());
  
  // Step 4: Activate proposal
  console.log("\n=== Step 4: Activate Proposal ===");
  
  console.log("Activating proposal...");
  tx = await dao.connect(member1).activateProposal(proposalId);
  await tx.wait();
  console.log("✓ Proposal activated");
  
  const details = await dao.getProposalDetails(proposalId);
  console.log("\nProposal Details:");
  console.log("- Proposer:", details.proposer);
  console.log("- Recipient:", details.recipient);
  console.log("- Amount:", ethers.formatEther(details.amount), "ETH");
  console.log("- Description:", details.description);
  console.log("- State:", details.state.toString(), "(1 = Active)");
  
  // Step 5: Cast votes
  console.log("\n=== Step 5: Cast Votes ===");
  
  console.log("Member1 voting FOR...");
  tx = await dao.connect(member1).castVote(proposalId, 1); // 1 = For
  await tx.wait();
  console.log("✓ Member1 voted FOR");
  
  console.log("Member2 voting FOR...");
  tx = await dao.connect(member2).castVote(proposalId, 1); // 1 = For
  await tx.wait();
  console.log("✓ Member2 voted FOR");
  
  const updatedDetails = await dao.getProposalDetails(proposalId);
  console.log("\nVoting Results:");
  console.log("- For:", updatedDetails.forVotes.toString());
  console.log("- Against:", updatedDetails.againstVotes.toString());
  console.log("- Abstain:", updatedDetails.abstainVotes.toString());
  
  console.log("\n=== Voting Period Active ===");
  console.log("In a real scenario, you would now wait for the voting period to end (3 days for operational proposals).");
  console.log("\nNext steps:");
  console.log("1. Wait for voting period to end");
  console.log("2. Call queueProposal(" + proposalId + ")");
  console.log("3. Wait for timelock period (12 hours for operational)");
  console.log("4. Call executeProposal(" + proposalId + ") with executor role");
  
  // Optional: Demonstrate delegation
  console.log("\n=== Bonus: Delegation Example ===");
  
  console.log("Owner joining with 0.5 ETH...");
  tx = await dao.connect(owner).joinDAO({ value: ethers.parseEther("0.5") });
  await tx.wait();
  
  console.log("Owner delegating voting power to Member1...");
  tx = await dao.connect(owner).delegateVotingPower(member1.address);
  await tx.wait();
  console.log("✓ Delegation complete");
  
  const member1EffectivePower = await dao.getEffectiveVotingPower(member1.address);
  console.log("Member1 effective voting power (own + delegated):", member1EffectivePower.toString());
  
  console.log("\n=== Interaction Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
