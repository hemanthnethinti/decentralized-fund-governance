# Deployment Guide

## Local Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Start local node
npm run node
```

### Deploy to Local Network

```bash
# Terminal 1: Start hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npm run deploy
```

## Configuration

### Network Setup

Edit `config/networks.js` to add network configurations:

```javascript
{
  network_name: {
    rpc: "https://rpc-url",
    chainId: 1,
    confirmations: 6
  }
}
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure:
```
PRIVATE_KEY=your_private_key
RPC_URL=https://rpc-url
ETHERSCAN_API_KEY=your_key
```

## Deployment Scripts

### Deploy Main Contract

```bash
npx hardhat run scripts/deploy/deploy.js --network <network_name>
```

### Run Full Demo

```bash
npx hardhat run scripts/interact/demo.js --network localhost
```

## Verification

After deployment, verify contract on Etherscan:

```bash
npx hardhat run scripts/deploy/verify.js --network <network_name>
```

## Governance Operations

### Create Proposal

```bash
npx hardhat run scripts/interact/create-proposal.js --network localhost
```

### Cast Vote

```bash
npx hardhat run scripts/interact/cast-vote.js --network localhost
```

### Execute Proposal

```bash
npx hardhat run scripts/interact/execute-proposal.js --network localhost
```

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Verify contract on Etherscan
- [ ] Initialize governance parameters
- [ ] Deposit initial treasury funds
- [ ] Grant necessary roles
- [ ] Test proposal creation
- [ ] Test voting
- [ ] Test proposal execution
- [ ] Document deployment addresses

## Troubleshooting

### Insufficient Gas

Increase gas limit in hardhat.config.js:
```javascript
gas: 8000000
gasPrice: "auto"
```

### Network Connection Issues

Check RPC URL and ensure endpoint is active.

### Deployment Fails

Verify sufficient balance and correct parameters in deployment script.
