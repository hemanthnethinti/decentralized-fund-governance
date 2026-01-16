# CryptoVentures DAO - Decentralized Investment Fund Governance System

A comprehensive governance system for decentralized investment funds with multi-tier treasury management, weighted voting, delegation, timelock security, and role-based access control.

## Project Overview

CryptoVentures DAO is a production-ready governance system that enables token holders to collectively manage treasury allocations and investment decisions. The system implements advanced governance patterns used by major DAOs like Compound, Aave, and MakerDAO.

### Key Features

- **Weighted Voting**: Square root voting power calculation to prevent whale dominance
- **Delegation System**: Members can delegate voting power to trusted representatives
- **Timelock Mechanism**: Security delay before proposal execution
- **Multi-Tier Treasury**: Separate fund categories with different approval requirements
- **Role-Based Access Control**: Separation of powers (Proposer, Executor, Guardian)
- **Complete Proposal Lifecycle**: Pending → Active → Queued → Executed/Defeated
- **Emergency Functions**: Guardian role can pause system and cancel malicious proposals
- **Gas Optimized**: Efficient storage and computation patterns

##  Architecture

### Proposal Types & Requirements

| Type | Voting Period | Quorum | Approval | Timelock |
|------|--------------|---------|----------|----------|
| **High Conviction** | 7 days | 40% | 65% | 2 days |
| **Experimental** | 5 days | 25% | 55% | 1 day |
| **Operational** | 3 days | 15% | 50% | 12 hours |

### Treasury Categories

- **High Conviction Fund**: Large, strategic investments
- **Experimental Fund**: Risky, innovative opportunities
- **Operational Fund**: Day-to-day expenses and operations

### Roles

- **DEFAULT_ADMIN**: Manage roles and system configuration
- **PROPOSER**: Create proposals (auto-granted to members with minimum stake)
- **EXECUTOR**: Execute approved proposals after timelock
- **GUARDIAN**: Emergency pause and proposal cancellation

##  Getting Started

### Prerequisites

- Node.js v16+ 
- npm or yarn
- Hardhat

### Installation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Run local node
npm run node

# Deploy (in another terminal)
npm run deploy
```

## Testing

Comprehensive test suite covering all functionality:

```bash
npx hardhat test
```

### Test Coverage

-  Member Management (join, stake, withdraw)
-  Delegation (delegate, revoke, voting with delegated power)
-  Proposal Creation (all types, validation)
-  Voting (casting, counting, restrictions)
-  Proposal Lifecycle (queuing, timelock, execution)
-  Multi-Tier Treasury
-  Emergency Functions (pause, cancel)
-  Role-Based Access Control
-  Edge Cases (zero votes, ties, abstain-only)

##  Usage Guide

### 1. Join the DAO

Members stake ETH to gain governance influence with anti-whale protection:

```javascript
// Join with 1 ETH stake
await dao.joinDAO({ value: ethers.parseEther("1") });

// Voting power calculated as sqrt(stake * 100)
// 1 ETH = 10 voting power
// 100 ETH = 100 voting power (not 1000!)
```

### 2. Create a Proposal

```javascript
await dao.createProposal(
  recipientAddress,           // Who receives funds
  ethers.parseEther("10"),   // Amount to transfer
  "Fund Q1 Development",     // Description
  ProposalType.Operational,  // 0=HighConviction, 1=Experimental, 2=Operational
  TreasuryCategory.OperationalFund // Must match proposal type
);
```

### 3. Activate Proposal

```javascript
await dao.activateProposal(proposalId);
// Starts voting period based on proposal type
```

### 4. Cast Vote

```javascript
// Vote types: 0=Against, 1=For, 2=Abstain
await dao.castVote(proposalId, VoteType.For);
```

### 5. Delegate Voting Power

```javascript
// Delegate to trusted member
await dao.delegateVotingPower(delegateAddress);

// Revoke delegation
await dao.revokeDelegation();
```

### 6. Queue Approved Proposal

```javascript
// After voting period ends
await dao.queueProposal(proposalId);
// Proposal enters timelock delay
```

### 7. Execute Proposal

```javascript
// After timelock expires (requires EXECUTOR role)
await dao.executeProposal(proposalId);
// Funds transferred to recipient
```

##  Security Features

### Timelock Protection

All approved proposals must wait in a queue before execution:
- **High Conviction**: 2 days delay
- **Experimental**: 1 day delay  
- **Operational**: 12 hours delay

This allows the community to detect and cancel malicious proposals.

### Whale Dominance Prevention

Voting power uses square root calculation:
- Member with 1 ETH → 10 voting power
- Member with 100 ETH → 100 voting power (only 10x, not 100x)

### Emergency Controls

Guardian role can:
- Pause all operations (`pause()`)
- Cancel malicious proposals (`cancelProposal()`)
- Unpause system (`unpause()`)

### Reentrancy Protection

All functions that transfer ETH use OpenZeppelin's `ReentrancyGuard`.

##  Querying the System

### Get Voting Power

```javascript
// Own voting power
const power = await dao.getVotingPower(address);

// Effective voting power (own + delegated)
const effectivePower = await dao.getEffectiveVotingPower(address);
```

### Get Proposal Details

```javascript
const details = await dao.getProposalDetails(proposalId);
console.log(details.proposer);
console.log(details.recipient);
console.log(details.amount);
console.log(details.description);
console.log(details.state); // 0=Pending, 1=Active, 2=Defeated, 3=Queued, 4=Executed, 5=Cancelled
console.log(details.forVotes);
console.log(details.againstVotes);
console.log(details.abstainVotes);
```

### Check Voting Status

```javascript
// Check if address voted
const hasVoted = await dao.hasVotedOnProposal(proposalId, address);

// Get their vote
if (hasVoted) {
  const vote = await dao.getVote(proposalId, address);
  // 0=Against, 1=For, 2=Abstain
}
```

### Treasury Information

```javascript
// Get balance of specific fund
const balance = await dao.treasuryBalances(TreasuryCategory.OperationalFund);

// Get total treasury
const total = await dao.getTotalTreasuryBalance();
```

##  Demo Scripts

### Quick Demo

Run complete governance lifecycle:

```bash
npx hardhat run scripts/demo-full-flow.js
```

This demonstrates:
1. Members joining with ETH stakes
2. Treasury funding
3. Proposal creation and activation
4. Voting with weighted power
5. Queuing after approval
6. Timelock enforcement
7. Successful execution

### Interactive Script

```bash
npx hardhat run scripts/interact.js
```

Step-by-step interaction guide with detailed logging.

##  Contract Structure

```
CryptoVenturesDAO.sol (single comprehensive contract)
├── Member Management
│   ├── joinDAO()
│   ├── withdrawStake()
│   └── getVotingPower()
├── Delegation
│   ├── delegateVotingPower()
│   └── revokeDelegation()
├── Proposal Management
│   ├── createProposal()
│   ├── activateProposal()
│   ├── queueProposal()
│   ├── executeProposal()
│   └── cancelProposal()
├── Voting
│   └── castVote()
├── Treasury
│   ├── depositToTreasury()
│   └── setTreasuryLimit()
├── Configuration
│   └── updateProposalConfig()
└── Emergency
    ├── pause()
    └── unpause()
```

##  Configuration

### Update Proposal Requirements

```javascript
await dao.updateProposalConfig(
  ProposalType.Operational,
  votingPeriod,      // seconds
  quorumPercentage,  // basis points (100 = 1%)
  approvalThreshold, // basis points (5000 = 50%)
  timelockDelay      // seconds
);
```

### Set Treasury Limits

```javascript
await dao.setTreasuryLimit(
  TreasuryCategory.OperationalFund,
  ethers.parseEther("1000") // Max balance
);
```

##  Events

All significant actions emit events for off-chain indexing:

- `MemberJoined(member, stake, votingPower)`
- `StakeIncreased(member, additionalStake, newVotingPower)`
- `StakeWithdrawn(member, amount, newVotingPower)`
- `ProposalCreated(proposalId, proposer, recipient, amount, proposalType, description)`
- `VoteCast(voter, proposalId, voteType, votingPower)`
- `VotingPowerDelegated(delegator, delegatee, votingPower)`
- `DelegationRevoked(delegator, previousDelegatee, votingPower)`
- `ProposalQueued(proposalId, queuedTime, executionTime)`
- `ProposalExecuted(proposalId, recipient, amount)`
- `ProposalDefeated(proposalId)`
- `ProposalCancelled(proposalId, canceller)`
- `TreasuryDeposit(category, amount)`
- `EmergencyPause(guardian)`
- `EmergencyUnpause(guardian)`

##  Important Notes

### Voting Power Calculation

Voting power is deliberately designed to reduce whale dominance:

```solidity
votingPower = sqrt(stake * 100)
```

This means:
- Doubling your stake only increases voting power by ~41%
- A 100x larger stake only gives ~10x voting power

### Cannot Vote While Delegated

If you delegate your voting power, you cannot vote directly. You must revoke delegation first.

### Cannot Withdraw While Delegated

To protect delegate's voting calculations, you must revoke delegation before withdrawing stake.

### One Vote Per Proposal

Votes are final and cannot be changed. Choose carefully!

### Timelock Cannot Be Bypassed

Even urgent proposals must wait through the timelock period. This is intentional for security.

##  Development

### Project Structure

```
decentralized-fund-governance/
├── contracts/
│   └── CryptoVenturesDAO.sol
├── test/
│   └── CryptoVenturesDAO.test.js
├── scripts/
│   ├── deploy.js
│   ├── interact.js
│   └── demo-full-flow.js
├── hardhat.config.js
└── package.json
```

### Solidity Version

- Solidity: ^0.8.20
- OpenZeppelin Contracts: ^5.0.1

### Dependencies

- Hardhat: Development environment
- OpenZeppelin: Access control, security patterns
- Ethers.js: Ethereum library
- Chai: Testing assertions

##  Deployment

### Local Network

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet (e.g., Sepolia)

1. Update `hardhat.config.js` with network configuration
2. Add private key and RPC URL to `.env`
3. Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

##  Learning Outcomes

This project demonstrates:

 **Advanced Governance Patterns**: Proposal lifecycle, weighted voting, delegation
 **Security Best Practices**: Timelock, reentrancy guards, role-based access
 **Gas Optimization**: Efficient storage, minimal redundancy
 **State Machine Design**: Proper proposal state transitions
 **Treasury Management**: Multi-tier fund allocation
 **Event-Driven Architecture**: Comprehensive logging for off-chain indexers
 **Access Control**: OpenZeppelin role-based permissions
 **Test-Driven Development**: Extensive test coverage
 **Edge Case Handling**: Zero votes, ties, insufficient funds

##  License

MIT

##  Contributing

This is a learning project for CryptoVentures DAO governance system implementation. Feel free to fork and experiment!

##  Quick Reference

### Minimum Stake to Propose
```solidity
0.1 ETH
```

### Proposal States
```
0 = Pending
1 = Active  
2 = Defeated
3 = Queued
4 = Executed
5 = Cancelled
```

### Vote Types
```
0 = Against
1 = For
2 = Abstain
```

### Treasury Categories
```
0 = HighConvictionFund
1 = ExperimentalFund
2 = OperationalFund
```

### Proposal Types
```
0 = HighConviction
1 = Experimental
2 = Operational
```

---

**Built with ❤️ for decentralized governance**