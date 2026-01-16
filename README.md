# CryptoVentures DAO - Decentralized Investment Fund Governance System

A production-ready governance system for decentralized investment funds with weighted voting, delegation, timelock security, and multi-tier treasury management.

##  Project Structure

```
decentralized-fund-governance/
├── contracts/
│   ├── core/
│   │   └── CryptoVenturesDAO.sol              # Main governance contract
│   ├── interfaces/
│   │   └── IGovernance.sol                    # Interface definitions
│   └── libraries/
│       ├── GovernanceConstants.sol            # System constants
│       └── Math.sol                           # Math utilities (sqrt)
│
├── test/
│   └── CryptoVenturesDAO.test.js              # 41 comprehensive tests
│
├── scripts/
│   ├── deploy.js                              # Contract deployment
│   ├── interact.js                            # Contract interactions
│   └── demo-full-flow.js                      # Full governance demo
│
├── config/
│   ├── governance-params.js                   # Governance parameters
│   ├── networks.js                            # Network configurations
│   └── roles.js                               # Role definitions
│
├── docs/
│   ├── ARCHITECTURE.md                        # System architecture
│   ├── DEPLOYMENT.md                          # Deployment guide
│   └── SECURITY.md                            # Security analysis
│
├── hardhat.config.js                          # Hardhat configuration
├── package.json                               # Dependencies
├── package-lock.json                          # Lock file
├── .env.example                               # Environment template
└── README.md                                  # This file
```

##  Quick Start

### Install Dependencies
```bash
npm install
```

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy Locally
```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npm run deploy
```

##  Component Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| **Main Contract** | `contracts/core/CryptoVenturesDAO.sol` | Governance logic (630 lines) |
| **Interfaces** | `contracts/interfaces/IGovernance.sol` | Type definitions |
| **Math Library** | `contracts/libraries/Math.sol` | Square root utility |
| **Constants** | `contracts/libraries/GovernanceConstants.sol` | System-wide constants |
| **Tests** | `test/CryptoVenturesDAO.test.js` | 41 test cases (>95% coverage) |
| **Deployment** | `scripts/deploy.js` | Automated deployment |
| **Demo** | `scripts/demo-full-flow.js` | Complete flow demonstration |
| **Config** | `config/` | Governance & network settings |
| **Documentation** | `docs/` | Technical documentation |

##  Key Features

-  Weighted voting (√stake prevents whale dominance)
-  Delegation system with revocation
-  Three proposal types with different requirements
-  Multi-tier treasury management
-  Timelock security delays
-  Role-based access control
-  Emergency pause/cancel functions
-  41 passing tests (>95% coverage)

##  Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design & components
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Setup & deployment guide
- **[SECURITY.md](docs/SECURITY.md)** - Security considerations

##  Testing

```bash
# Run all tests
npm run test

# Run with coverage report
npm run coverage

# Generate gas report
npm run gas-report
```

##  Tech Stack

- **Language**: Solidity 0.8.20
- **Framework**: Hardhat
- **Libraries**: OpenZeppelin 5.0.1
- **Testing**: Chai, Hardhat Test
- **Runtime**: Ethers.js

##  Contract Functions

### Member Management
- `joinDAO()` - Join DAO with ETH stake
- `withdrawStake()` - Withdraw staked ETH
- `getVotingPower()` - Check voting power

### Proposals
- `createProposal()` - Create new proposal
- `activateProposal()` - Start voting period
- `castVote()` - Vote on proposal
- `queueProposal()` - Queue approved proposal
- `executeProposal()` - Execute after timelock

### Delegation
- `delegateVotingPower()` - Delegate to member
- `revokeDelegation()` - Revoke delegation

### Treasury
- `depositToTreasury()` - Add funds to treasury
- `setTreasuryLimit()` - Set category limits

### Emergency
- `pause()` - Pause operations
- `unpause()` - Resume operations

##  Governance Parameters

| Proposal Type | Voting Period | Quorum | Approval Threshold | Timelock |
|---------------|--------------|--------|-------------------|----------|
| High Conviction | 7 days | 40% | 65% | 2 days |
| Experimental | 5 days | 25% | 55% | 1 day |
| Operational | 3 days | 15% | 50% | 12 hours |

##  Key Notes

- Voting power formula: `sqrt(stake * 100)` - prevents 100x whale advantage
- One vote per proposal - votes are final
- Cannot vote while delegated - must revoke first
- Cannot withdraw while delegated - must revoke first
- Timelock cannot be bypassed - ensures security window

## License

MIT
