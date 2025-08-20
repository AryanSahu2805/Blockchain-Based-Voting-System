# ⛓️ Smart Contracts

Solidity smart contracts for the blockchain voting platform.

## 📁 Structure

- **`ElectionFactory.sol`** - Factory contract for creating and managing elections
- **`Election.sol`** - Individual election contract with voting logic

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy.js --network mumbai
```

## 🔧 Configuration

Copy and configure environment variables:

```bash
cp env.example .env
# Edit .env with your private key and API keys
```

## 🧪 Testing

```bash
npm test
```

## 📦 Deployment

```bash
# Deploy to Mumbai testnet
npx hardhat run scripts/deploy.js --network mumbai

# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon
```

## 🌐 Supported Networks

- **Mumbai Testnet** (Chain ID: 80001)
- **Polygon Mainnet** (Chain ID: 137)
- **Sepolia Testnet** (Chain ID: 11155111)
- **Ethereum Mainnet** (Chain ID: 1)
