// Network configurations
module.exports = {
  localhost: {
    name: "Localhost",
    rpc: "http://127.0.0.1:8545",
    chainId: 1337,
    confirmations: 0
  },
  hardhat: {
    name: "Hardhat",
    rpc: "http://127.0.0.1:8545",
    chainId: 1337,
    confirmations: 0
  },
  sepolia: {
    name: "Sepolia Testnet",
    rpc: process.env.SEPOLIA_RPC_URL || "",
    chainId: 11155111,
    confirmations: 6
  },
  mainnet: {
    name: "Ethereum Mainnet",
    rpc: process.env.MAINNET_RPC_URL || "",
    chainId: 1,
    confirmations: 12
  }
};
