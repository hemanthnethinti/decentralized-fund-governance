const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoVenturesDAO", function () {
  let dao;
  let owner, member1, member2, member3, recipient, guardian;
  
  const MINIMUM_STAKE = ethers.parseEther("0.1");
  const ONE_ETH = ethers.parseEther("1");
  const TEN_ETH = ethers.parseEther("10");
  
  // Proposal Types
  const ProposalType = {
    HighConviction: 0,
    Experimental: 1,
    Operational: 2
  };
  
  // Treasury Categories
  const TreasuryCategory = {
    HighConvictionFund: 0,
    ExperimentalFund: 1,
    OperationalFund: 2
  };
  
  // Proposal States
  const ProposalState = {
    Pending: 0,
    Active: 1,
    Defeated: 2,
    Queued: 3,
    Executed: 4,
    Cancelled: 5
  };
  
  // Vote Types
  const VoteType = {
    Against: 0,
    For: 1,
    Abstain: 2
  };
  
  beforeEach(async function () {
    [owner, member1, member2, member3, recipient, guardian] = await ethers.getSigners();
    
    const CryptoVenturesDAO = await ethers.getContractFactory("CryptoVenturesDAO");
    dao = await CryptoVenturesDAO.deploy();
    
    // Grant guardian role to guardian account
    const GUARDIAN_ROLE = await dao.GUARDIAN_ROLE();
    await dao.grantRole(GUARDIAN_ROLE, guardian.address);
    
    // Grant executor role to owner
    const EXECUTOR_ROLE = await dao.EXECUTOR_ROLE();
    await dao.grantRole(EXECUTOR_ROLE, owner.address);
  });
  
  describe("Member Management", function () {
    it("Should allow members to join DAO with ETH stake", async function () {
      await expect(dao.connect(member1).joinDAO({ value: ONE_ETH }))
        .to.emit(dao, "MemberJoined")
        .withArgs(member1.address, ONE_ETH, await calculateVotingPower(ONE_ETH));
      
      const member = await dao.members(member1.address);
      expect(member.stake).to.equal(ONE_ETH);
      expect(member.votingPower).to.equal(await calculateVotingPower(ONE_ETH));
    });
    
    it("Should calculate voting power using square root to reduce whale dominance", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.connect(member2).joinDAO({ value: ethers.parseEther("100") }); // 100x more stake
      
      const votingPower1 = await dao.getVotingPower(member1.address);
      const votingPower2 = await dao.getVotingPower(member2.address);
      
      // With 100x more stake, voting power should be ~10x (square root), not 100x
      expect(votingPower2 / votingPower1).to.be.lessThan(15n); // Approximately 10x
      expect(votingPower2 / votingPower1).to.be.greaterThan(5n);
    });
    
    it("Should allow increasing stake", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      
      await expect(dao.connect(member1).joinDAO({ value: ONE_ETH }))
        .to.emit(dao, "StakeIncreased");
      
      const member = await dao.members(member1.address);
      expect(member.stake).to.equal(ONE_ETH * 2n);
    });
    
    it("Should allow withdrawing stake", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH * 2n });
      
      const initialBalance = await ethers.provider.getBalance(member1.address);
      
      await expect(dao.connect(member1).withdrawStake(ONE_ETH))
        .to.emit(dao, "StakeWithdrawn");
      
      const member = await dao.members(member1.address);
      expect(member.stake).to.equal(ONE_ETH);
    });
    
    it("Should not allow withdrawing more than staked", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      
      await expect(
        dao.connect(member1).withdrawStake(ONE_ETH * 2n)
      ).to.be.revertedWith("Insufficient stake");
    });
    
    it("Should track total staked and voting power", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.connect(member2).joinDAO({ value: ONE_ETH * 2n });
      
      expect(await dao.totalStaked()).to.equal(ONE_ETH * 3n);
      expect(await dao.totalVotingPower()).to.be.greaterThan(0n);
    });
  });
  
  describe("Delegation", function () {
    beforeEach(async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.connect(member2).joinDAO({ value: ONE_ETH });
    });
    
    it("Should allow delegating voting power", async function () {
      const votingPower1 = await dao.getVotingPower(member1.address);
      
      await expect(dao.connect(member1).delegateVotingPower(member2.address))
        .to.emit(dao, "VotingPowerDelegated")
        .withArgs(member1.address, member2.address, votingPower1);
      
      const member1Data = await dao.members(member1.address);
      expect(member1Data.delegateTo).to.equal(member2.address);
      
      const effectivePower = await dao.getEffectiveVotingPower(member2.address);
      const ownPower = await dao.getVotingPower(member2.address);
      expect(effectivePower).to.equal(ownPower + votingPower1);
    });
    
    it("Should allow revoking delegation", async function () {
      await dao.connect(member1).delegateVotingPower(member2.address);
      
      await expect(dao.connect(member1).revokeDelegation())
        .to.emit(dao, "DelegationRevoked");
      
      const member1Data = await dao.members(member1.address);
      expect(member1Data.delegateTo).to.equal(ethers.ZeroAddress);
    });
    
    it("Should not allow delegating to self", async function () {
      await expect(
        dao.connect(member1).delegateVotingPower(member1.address)
      ).to.be.revertedWith("Cannot delegate to self");
    });
    
    it("Should not allow double delegation", async function () {
      await dao.connect(member1).delegateVotingPower(member2.address);
      
      await expect(
        dao.connect(member1).delegateVotingPower(member3.address)
      ).to.be.revertedWith("Already delegated, revoke first");
    });
    
    it("Should not allow withdrawing stake while delegated", async function () {
      await dao.connect(member1).delegateVotingPower(member2.address);
      
      await expect(
        dao.connect(member1).withdrawStake(ONE_ETH)
      ).to.be.revertedWith("Must revoke delegation first");
    });
  });
  
  describe("Proposal Creation", function () {
    beforeEach(async function () {
      await dao.connect(member1).joinDAO({ value: MINIMUM_STAKE });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
    });
    
    it("Should allow creating proposals with minimum stake", async function () {
      await expect(
        dao.connect(member1).createProposal(
          recipient.address,
          ONE_ETH,
          "Test proposal",
          ProposalType.Operational,
          TreasuryCategory.OperationalFund
        )
      ).to.emit(dao, "ProposalCreated");
      
      const proposalCount = await dao.proposalCount();
      expect(proposalCount).to.equal(1n);
    });
    
    it("Should not allow creating proposals without minimum stake", async function () {
      await expect(
        dao.connect(member2).createProposal(
          recipient.address,
          ONE_ETH,
          "Test proposal",
          ProposalType.Operational,
          TreasuryCategory.OperationalFund
        )
      ).to.be.revertedWith("Insufficient stake to propose");
    });
    
    it("Should require matching proposal type and treasury category", async function () {
      await expect(
        dao.connect(member1).createProposal(
          recipient.address,
          ONE_ETH,
          "Test proposal",
          ProposalType.Operational,
          TreasuryCategory.HighConvictionFund // Mismatch
        )
      ).to.be.revertedWith("Category must match proposal type");
    });
    
    it("Should store proposal details correctly", async function () {
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test proposal",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      
      const details = await dao.getProposalDetails(1);
      expect(details.proposer).to.equal(member1.address);
      expect(details.recipient).to.equal(recipient.address);
      expect(details.amount).to.equal(ONE_ETH);
      expect(details.description).to.equal("Test proposal");
      expect(details.proposalType).to.equal(ProposalType.Operational);
    });
  });
  
  describe("Voting", function () {
    let proposalId;
    
    beforeEach(async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.connect(member2).joinDAO({ value: ONE_ETH * 2n });
      await dao.connect(member3).joinDAO({ value: ONE_ETH });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test proposal",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      proposalId = await dao.proposalCount();
      
      await dao.connect(member1).activateProposal(proposalId);
    });
    
    it("Should allow casting votes on active proposals", async function () {
      const votingPower = await dao.getVotingPower(member1.address);
      
      await expect(dao.connect(member1).castVote(proposalId, VoteType.For))
        .to.emit(dao, "VoteCast")
        .withArgs(member1.address, proposalId, VoteType.For, votingPower);
      
      expect(await dao.hasVotedOnProposal(proposalId, member1.address)).to.be.true;
    });
    
    it("Should count votes correctly", async function () {
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.Against);
      await dao.connect(member3).castVote(proposalId, VoteType.Abstain);
      
      const details = await dao.getProposalDetails(proposalId);
      expect(details.forVotes).to.be.greaterThan(0n);
      expect(details.againstVotes).to.be.greaterThan(0n);
      expect(details.abstainVotes).to.be.greaterThan(0n);
    });
    
    it("Should not allow voting twice", async function () {
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      
      await expect(
        dao.connect(member1).castVote(proposalId, VoteType.Against)
      ).to.be.revertedWith("Already voted");
    });
    
    it("Should not allow voting when delegated", async function () {
      await dao.connect(member1).delegateVotingPower(member2.address);
      
      await expect(
        dao.connect(member1).castVote(proposalId, VoteType.For)
      ).to.be.revertedWith("Cannot vote when delegated");
    });
    
    it("Should count delegated voting power for delegate", async function () {
      await dao.connect(member1).delegateVotingPower(member2.address);
      
      const effectivePower = await dao.getEffectiveVotingPower(member2.address);
      
      await dao.connect(member2).castVote(proposalId, VoteType.For);
      
      const details = await dao.getProposalDetails(proposalId);
      expect(details.forVotes).to.equal(effectivePower);
    });
    
    it("Should not allow voting before voting period starts", async function () {
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test proposal 2",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      const newProposalId = await dao.proposalCount();
      
      // Don't activate - stays in pending
      await expect(
        dao.connect(member1).castVote(newProposalId, VoteType.For)
      ).to.be.revertedWith("Proposal not active");
    });
    
    it("Should not allow voting after voting period ends", async function () {
      // Fast forward past voting period (3 days for operational)
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      await expect(
        dao.connect(member1).castVote(proposalId, VoteType.For)
      ).to.be.revertedWith("Voting period ended");
    });
  });
  
  describe("Proposal Lifecycle", function () {
    let proposalId;
    
    beforeEach(async function () {
      // Setup members with enough voting power
      await dao.connect(member1).joinDAO({ value: ONE_ETH * 5n });
      await dao.connect(member2).joinDAO({ value: ONE_ETH * 5n });
      await dao.connect(member3).joinDAO({ value: ONE_ETH * 5n });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test proposal",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      proposalId = await dao.proposalCount();
      
      await dao.connect(member1).activateProposal(proposalId);
    });
    
    it("Should queue proposal if it passes", async function () {
      // Cast votes to pass (need 50% approval, 15% quorum for operational)
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.For);
      await dao.connect(member3).castVote(proposalId, VoteType.Against);
      
      // Fast forward past voting period
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      await expect(dao.queueProposal(proposalId))
        .to.emit(dao, "ProposalQueued");
      
      expect(await dao.getProposalState(proposalId)).to.equal(ProposalState.Queued);
    });
    
    it("Should defeat proposal if quorum not met", async function () {
      // Only one vote, not enough for quorum
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      await expect(dao.queueProposal(proposalId))
        .to.emit(dao, "ProposalDefeated");
      
      expect(await dao.getProposalState(proposalId)).to.equal(ProposalState.Defeated);
    });
    
    it("Should defeat proposal if approval threshold not met", async function () {
      // More against than for
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.Against);
      await dao.connect(member3).castVote(proposalId, VoteType.Against);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      await expect(dao.queueProposal(proposalId))
        .to.emit(dao, "ProposalDefeated");
      
      expect(await dao.getProposalState(proposalId)).to.equal(ProposalState.Defeated);
    });
    
    it("Should execute proposal after timelock", async function () {
      // Pass the proposal
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.For);
      await dao.connect(member3).castVote(proposalId, VoteType.For);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await dao.queueProposal(proposalId);
      
      // Fast forward past timelock (12 hours for operational)
      await time.increase(12 * 60 * 60 + 1);
      
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      await expect(dao.executeProposal(proposalId))
        .to.emit(dao, "ProposalExecuted");
      
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ONE_ETH);
      
      expect(await dao.getProposalState(proposalId)).to.equal(ProposalState.Executed);
    });
    
    it("Should not execute proposal before timelock expires", async function () {
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.For);
      await dao.connect(member3).castVote(proposalId, VoteType.For);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await dao.queueProposal(proposalId);
      
      // Don't wait for timelock
      await expect(
        dao.executeProposal(proposalId)
      ).to.be.revertedWith("Timelock period not elapsed");
    });
    
    it("Should not execute proposal twice", async function () {
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.For);
      await dao.connect(member3).castVote(proposalId, VoteType.For);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await dao.queueProposal(proposalId);
      await time.increase(12 * 60 * 60 + 1);
      
      await dao.executeProposal(proposalId);
      
      await expect(
        dao.executeProposal(proposalId)
      ).to.be.revertedWith("Proposal not queued");
    });
    
    it("Should fail execution if insufficient treasury funds", async function () {
      // Create proposal for more than treasury has
      await dao.connect(member1).createProposal(
        recipient.address,
        ethers.parseEther("20"), // More than 10 ETH in treasury
        "Large proposal",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      const largeProposalId = await dao.proposalCount();
      
      await dao.connect(member1).activateProposal(largeProposalId);
      await dao.connect(member1).castVote(largeProposalId, VoteType.For);
      await dao.connect(member2).castVote(largeProposalId, VoteType.For);
      await dao.connect(member3).castVote(largeProposalId, VoteType.For);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await dao.queueProposal(largeProposalId);
      await time.increase(12 * 60 * 60 + 1);
      
      await expect(
        dao.executeProposal(largeProposalId)
      ).to.be.revertedWith("Insufficient treasury funds");
    });
  });
  
  describe("Multi-Tier Treasury", function () {
    it("Should allow deposits to different treasury categories", async function () {
      await expect(dao.depositToTreasury(TreasuryCategory.HighConvictionFund, { value: ONE_ETH }))
        .to.emit(dao, "TreasuryDeposit");
      
      expect(await dao.treasuryBalances(TreasuryCategory.HighConvictionFund)).to.equal(ONE_ETH);
    });
    
    it("Should track different proposal types with different requirements", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      
      // Get configs for different types
      const highConvictionConfig = await dao.proposalConfigs(ProposalType.HighConviction);
      const experimentalConfig = await dao.proposalConfigs(ProposalType.Experimental);
      const operationalConfig = await dao.proposalConfigs(ProposalType.Operational);
      
      // High conviction should have strictest requirements
      expect(highConvictionConfig.quorumPercentage).to.be.greaterThan(experimentalConfig.quorumPercentage);
      expect(experimentalConfig.quorumPercentage).to.be.greaterThan(operationalConfig.quorumPercentage);
      
      expect(highConvictionConfig.approvalThreshold).to.be.greaterThan(experimentalConfig.approvalThreshold);
      expect(experimentalConfig.approvalThreshold).to.be.greaterThan(operationalConfig.approvalThreshold);
      
      expect(highConvictionConfig.timelockDelay).to.be.greaterThan(experimentalConfig.timelockDelay);
      expect(experimentalConfig.timelockDelay).to.be.greaterThan(operationalConfig.timelockDelay);
    });
    
    it("Should calculate total treasury balance correctly", async function () {
      await dao.depositToTreasury(TreasuryCategory.HighConvictionFund, { value: ONE_ETH });
      await dao.depositToTreasury(TreasuryCategory.ExperimentalFund, { value: ONE_ETH * 2n });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: ONE_ETH * 3n });
      
      expect(await dao.getTotalTreasuryBalance()).to.equal(ONE_ETH * 6n);
    });
  });
  
  describe("Emergency Functions", function () {
    let proposalId;
    
    beforeEach(async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test proposal",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      proposalId = await dao.proposalCount();
      await dao.connect(member1).activateProposal(proposalId);
    });
    
    it("Should allow guardian to cancel queued proposals", async function () {
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await time.increase(3 * 24 * 60 * 60 + 1);
      await dao.queueProposal(proposalId);
      
      await expect(dao.connect(guardian).cancelProposal(proposalId))
        .to.emit(dao, "ProposalCancelled");
      
      expect(await dao.getProposalState(proposalId)).to.equal(ProposalState.Cancelled);
    });
    
    it("Should allow guardian to pause contract", async function () {
      await expect(dao.connect(guardian).pause())
        .to.emit(dao, "EmergencyPause");
      
      await expect(
        dao.connect(member2).joinDAO({ value: ONE_ETH })
      ).to.be.revertedWithCustomError(dao, "EnforcedPause");
    });
    
    it("Should allow guardian to unpause contract", async function () {
      await dao.connect(guardian).pause();
      
      await expect(dao.connect(guardian).unpause())
        .to.emit(dao, "EmergencyUnpause");
      
      // Should work again
      await expect(dao.connect(member2).joinDAO({ value: ONE_ETH }))
        .to.not.be.reverted;
    });
    
    it("Should not allow non-guardian to cancel proposals", async function () {
      await expect(
        dao.connect(member1).cancelProposal(proposalId)
      ).to.be.reverted; // AccessControl will revert
    });
  });
  
  describe("Role-Based Access Control", function () {
    it("Should grant proposer role to members who join", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      
      const PROPOSER_ROLE = await dao.PROPOSER_ROLE();
      expect(await dao.hasRole(PROPOSER_ROLE, member1.address)).to.be.true;
    });
    
    it("Should only allow executor role to execute proposals", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH * 5n });
      await dao.connect(member2).joinDAO({ value: ONE_ETH * 5n });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      const proposalId = await dao.proposalCount();
      
      await dao.connect(member1).activateProposal(proposalId);
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.For);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      await dao.queueProposal(proposalId);
      await time.increase(12 * 60 * 60 + 1);
      
      // member1 doesn't have executor role
      await expect(
        dao.connect(member1).executeProposal(proposalId)
      ).to.be.reverted;
      
      // owner has executor role
      await expect(dao.connect(owner).executeProposal(proposalId))
        .to.not.be.reverted;
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle proposals with zero votes", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      const proposalId = await dao.proposalCount();
      await dao.connect(member1).activateProposal(proposalId);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      await expect(dao.queueProposal(proposalId))
        .to.emit(dao, "ProposalDefeated");
    });
    
    it("Should handle tie in voting results", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH });
      await dao.connect(member2).joinDAO({ value: ONE_ETH });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      const proposalId = await dao.proposalCount();
      await dao.connect(member1).activateProposal(proposalId);
      
      await dao.connect(member1).castVote(proposalId, VoteType.For);
      await dao.connect(member2).castVote(proposalId, VoteType.Against);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Should be defeated as it doesn't meet 50% threshold
      await expect(dao.queueProposal(proposalId))
        .to.emit(dao, "ProposalDefeated");
    });
    
    it("Should handle abstain-only votes", async function () {
      await dao.connect(member1).joinDAO({ value: ONE_ETH * 5n });
      await dao.connect(member2).joinDAO({ value: ONE_ETH * 5n });
      await dao.depositToTreasury(TreasuryCategory.OperationalFund, { value: TEN_ETH });
      
      await dao.connect(member1).createProposal(
        recipient.address,
        ONE_ETH,
        "Test",
        ProposalType.Operational,
        TreasuryCategory.OperationalFund
      );
      const proposalId = await dao.proposalCount();
      await dao.connect(member1).activateProposal(proposalId);
      
      await dao.connect(member1).castVote(proposalId, VoteType.Abstain);
      await dao.connect(member2).castVote(proposalId, VoteType.Abstain);
      
      await time.increase(3 * 24 * 60 * 60 + 1);
      
      // Should be defeated as no for/against votes
      await expect(dao.queueProposal(proposalId))
        .to.emit(dao, "ProposalDefeated");
    });
  });
  
  // Helper function to calculate expected voting power
  async function calculateVotingPower(stake) {
    const VOTING_POWER_COEFFICIENT = 100n;
    return sqrt(stake * VOTING_POWER_COEFFICIENT);
  }
  
  function sqrt(value) {
    if (value === 0n) return 0n;
    let z = (value + 1n) / 2n;
    let y = value;
    while (z < y) {
      y = z;
      z = (value / z + z) / 2n;
    }
    return y;
  }
});
