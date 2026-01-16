const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying CryptoVenturesDAO...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy the DAO
  const CryptoVenturesDAO = await ethers.getContractFactory("CryptoVenturesDAO");
  const dao = await CryptoVenturesDAO.deploy();
  
  await dao.waitForDeployment();
  
  const daoAddress = await dao.getAddress();
  console.log("CryptoVenturesDAO deployed to:", daoAddress);
  
  // Display initial configuration
  console.log("\n=== Initial Configuration ===");
  
  const highConvictionConfig = await dao.proposalConfigs(0);
  console.log("\nHigh Conviction Proposals:");
  console.log("- Voting Period:", highConvictionConfig.votingPeriod.toString(), "seconds (", Number(highConvictionConfig.votingPeriod) / 86400, "days)");
  console.log("- Quorum:", (Number(highConvictionConfig.quorumPercentage) / 100).toFixed(1), "%");
  console.log("- Approval Threshold:", (Number(highConvictionConfig.approvalThreshold) / 100).toFixed(1), "%");
  console.log("- Timelock Delay:", highConvictionConfig.timelockDelay.toString(), "seconds (", Number(highConvictionConfig.timelockDelay) / 86400, "days)");
  
  const experimentalConfig = await dao.proposalConfigs(1);
  console.log("\nExperimental Proposals:");
  console.log("- Voting Period:", experimentalConfig.votingPeriod.toString(), "seconds (", Number(experimentalConfig.votingPeriod) / 86400, "days)");
  console.log("- Quorum:", (Number(experimentalConfig.quorumPercentage) / 100).toFixed(1), "%");
  console.log("- Approval Threshold:", (Number(experimentalConfig.approvalThreshold) / 100).toFixed(1), "%");
  console.log("- Timelock Delay:", experimentalConfig.timelockDelay.toString(), "seconds (", Number(experimentalConfig.timelockDelay) / 86400, "days)");
  
  const operationalConfig = await dao.proposalConfigs(2);
  console.log("\nOperational Proposals:");
  console.log("- Voting Period:", operationalConfig.votingPeriod.toString(), "seconds (", Number(operationalConfig.votingPeriod) / 86400, "days)");
  console.log("- Quorum:", (Number(operationalConfig.quorumPercentage) / 100).toFixed(1), "%");
  console.log("- Approval Threshold:", (Number(operationalConfig.approvalThreshold) / 100).toFixed(1), "%");
  console.log("- Timelock Delay:", operationalConfig.timelockDelay.toString(), "seconds (", Number(operationalConfig.timelockDelay) / 3600, "hours)");
  
  console.log("\n=== Roles ===");
  const DEFAULT_ADMIN_ROLE = await dao.DEFAULT_ADMIN_ROLE();
  const PROPOSER_ROLE = await dao.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await dao.EXECUTOR_ROLE();
  const GUARDIAN_ROLE = await dao.GUARDIAN_ROLE();
  
  console.log("Deployer has DEFAULT_ADMIN_ROLE:", await dao.hasRole(DEFAULT_ADMIN_ROLE, deployer.address));
  console.log("Deployer has GUARDIAN_ROLE:", await dao.hasRole(GUARDIAN_ROLE, deployer.address));
  console.log("Deployer has EXECUTOR_ROLE:", await dao.hasRole(EXECUTOR_ROLE, deployer.address));
  
  console.log("\n=== Deployment Complete ===");
  console.log("Save this address for interaction:", daoAddress);
  
  return daoAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
