const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class BlockchainService {
  constructor() {
    this.providers = new Map();
    this.contracts = new Map();
    this.networks = this.initializeNetworks();
    this.currentNetwork = null;
  }

  /**
   * Initialize supported networks
   */
  initializeNetworks() {
    return {
      mumbai: {
        name: 'Mumbai Testnet',
        chainId: 80001,
        rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
        blockExplorer: 'https://mumbai.polygonscan.com',
        currency: 'MATIC',
        isTestnet: true
      },
      polygon: {
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com',
        currency: 'MATIC',
        isTestnet: false
      },
      sepolia: {
        name: 'Sepolia Testnet',
        chainId: 11155111,
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
        blockExplorer: 'https://sepolia.etherscan.io',
        currency: 'ETH',
        isTestnet: true
      },
      ethereum: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID,
        blockExplorer: 'https://etherscan.io',
        currency: 'ETH',
        isTestnet: false
      }
    };
  }

  /**
   * Get provider for specific network
   */
  getProvider(networkName) {
    if (!this.providers.has(networkName)) {
      const network = this.networks[networkName];
      if (!network) {
        throw new Error(`Unsupported network: ${networkName}`);
      }

      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
      this.providers.set(networkName, provider);
    }
    return this.providers.get(networkName);
  }

  /**
   * Get contract instance
   */
  async getContract(contractName, networkName, address) {
    const key = `${contractName}-${networkName}-${address}`;
    
    if (!this.contracts.has(key)) {
      const provider = this.getProvider(networkName);
      const abi = await this.getContractABI(contractName);
      
      const contract = new ethers.Contract(address, abi, provider);
      this.contracts.set(key, contract);
    }
    
    return this.contracts.get(key);
  }

  /**
   * Get contract ABI
   */
  async getContractABI(contractName) {
    try {
      // Try to get ABI from artifacts
      const artifactsPath = path.join(__dirname, '..', '..', 'contracts', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
      
      if (fs.existsSync(artifactsPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
        return artifact.abi;
      }
      
      // Fallback to hardcoded ABI for common functions
      return this.getFallbackABI(contractName);
    } catch (error) {
      console.error(`Error loading ABI for ${contractName}:`, error);
      return this.getFallbackABI(contractName);
    }
  }

  /**
   * Fallback ABI for common contract functions
   */
  getFallbackABI(contractName) {
    const commonABI = [
      "function getElectionCount() external view returns (uint256)",
      "function elections(uint256) external view returns (address)",
      "function getElectionStats(uint256) external view returns (tuple(uint256,address,string,uint256,uint256,bool,uint256,uint256))",
      "function getAllElections() external view returns (address[])",
      "function getElectionsByCreator(address) external view returns (address[])",
      "function isElectionCreator(address) external view returns (bool)",
      "function getMetadata() external view returns (tuple(string,string,string,string,string[],uint256,uint256,bool,uint256,uint256,address,uint256,uint256))",
      "function getCandidate(uint256) external view returns (tuple(uint256,string,string,string,uint256,bool,uint256))",
      "function getAllCandidateIds() external view returns (uint256[])",
      "function getTotalVotes() external view returns (uint256)",
      "function isActive() external view returns (bool)",
      "function getResults() external view returns (uint256[],uint256[],uint256)",
      "function hasAddressVoted(address) external view returns (bool)",
      "function getVoterChoice(address) external view returns (uint256)",
      "event ElectionCreated(uint256 indexed,address indexed,address indexed,string,uint256,uint256)",
      "event VoteCast(address indexed,uint256 indexed,uint256)",
      "event ElectionEnded(uint256,uint256)"
    ];

    return commonABI;
  }

  /**
   * Get network information
   */
  async getNetworkInfo(networkName) {
    try {
      const provider = this.getProvider(networkName);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      const gasPrice = await provider.getGasPrice();
      
      return {
        name: this.networks[networkName].name,
        chainId: network.chainId,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        currency: this.networks[networkName].currency,
        isTestnet: this.networks[networkName].isTestnet,
        rpcUrl: this.networks[networkName].rpcUrl,
        blockExplorer: this.networks[networkName].blockExplorer
      };
    } catch (error) {
      console.error(`Error getting network info for ${networkName}:`, error);
      throw error;
    }
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks() {
    return Object.keys(this.networks).map(name => ({
      name,
      ...this.networks[name]
    }));
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(networkName, from, to, data, value = '0x0') {
    try {
      const provider = this.getProvider(networkName);
      const gasEstimate = await provider.estimateGas({
        from,
        to,
        data,
        value
      });
      
      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: await provider.getGasPrice(),
        estimatedCost: ethers.utils.formatEther(gasEstimate.mul(await provider.getGasPrice()))
      };
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Get blockchain statistics
   */
  async getBlockchainStats(networkName) {
    try {
      const provider = this.getProvider(networkName);
      const [blockNumber, gasPrice, balance] = await Promise.all([
        provider.getBlockNumber(),
        provider.getGasPrice(),
        provider.getBalance(ethers.constants.AddressZero)
      ]);

      return {
        network: this.networks[networkName].name,
        chainId: this.networks[networkName].chainId,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        totalSupply: ethers.utils.formatEther(balance),
        currency: this.networks[networkName].currency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error getting blockchain stats for ${networkName}:`, error);
      throw error;
    }
  }

  /**
   * Verify transaction
   */
  async verifyTransaction(networkName, txHash) {
    try {
      const provider = this.getProvider(networkName);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error('Transaction not found');
      }

      const tx = await provider.getTransaction(txHash);
      
      return {
        hash: txHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice.toString(),
        value: ethers.utils.formatEther(tx.value),
        status: receipt.status === 1 ? 'success' : 'failed',
        confirmations: receipt.confirmations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw error;
    }
  }

  /**
   * Get election data from blockchain
   */
  async getBlockchainElectionData(networkName, factoryAddress, electionId) {
    try {
      const factory = await this.getContract('ElectionFactoryUpgradeable', networkName, factoryAddress);
      
      // Get election address
      const electionAddress = await factory.elections(electionId);
      if (electionAddress === ethers.constants.AddressZero) {
        throw new Error('Election not found');
      }

      // Get election contract
      const election = await this.getContract('ElectionUpgradeable', networkName, electionAddress);
      
      // Get election metadata
      const metadata = await election.getMetadata();
      
      // Get candidates
      const candidateIds = await election.getAllCandidateIds();
      const candidates = await Promise.all(
        candidateIds.map(async (id) => {
          const candidate = await election.getCandidate(id);
          return {
            id: candidate.id.toString(),
            name: candidate.name,
            description: candidate.description,
            imageUrl: candidate.imageUrl,
            voteCount: candidate.voteCount.toString(),
            isActive: candidate.isActive,
            createdAt: new Date(candidate.createdAt * 1000).toISOString()
          };
        })
      );

      // Get results
      const [candidateIds_, voteCounts_, totalVotes] = await election.getResults();

      return {
        id: electionId.toString(),
        address: electionAddress,
        title: metadata.title,
        description: metadata.description,
        imageUrl: metadata.imageUrl,
        category: metadata.category,
        tags: metadata.tags,
        startTime: new Date(metadata.startTime * 1000).toISOString(),
        endTime: new Date(metadata.endTime * 1000).toISOString(),
        isActive: metadata.isActive,
        totalVotes: totalVotes.toString(),
        candidateCount: metadata.candidateCount.toString(),
        creator: metadata.creator,
        createdAt: new Date(metadata.createdAt * 1000).toISOString(),
        updatedAt: new Date(metadata.updatedAt * 1000).toISOString(),
        candidates,
        results: {
          candidateIds: candidateIds_.map(id => id.toString()),
          voteCounts: voteCounts_.map(count => count.toString()),
          totalVotes: totalVotes.toString()
        }
      };
    } catch (error) {
      console.error('Error getting blockchain election data:', error);
      throw error;
    }
  }

  /**
   * Sync election data from blockchain to database
   */
  async syncElectionData(networkName, factoryAddress, electionId, dbService) {
    try {
      const blockchainData = await this.getBlockchainElectionData(networkName, factoryAddress, electionId);
      
      // Update or create election in database
      const election = await dbService.updateElectionFromBlockchain(blockchainData);
      
      return {
        success: true,
        election,
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error syncing election data:', error);
      throw error;
    }
  }

  /**
   * Get factory statistics
   */
  async getFactoryStats(networkName, factoryAddress) {
    try {
      const factory = await this.getContract('ElectionFactoryUpgradeable', networkName, factoryAddress);
      
      const [electionCount, allElections] = await Promise.all([
        factory.getElectionCount(),
        factory.getAllElections()
      ]);

      return {
        totalElections: electionCount.toString(),
        electionAddresses: allElections,
        network: networkName,
        factoryAddress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting factory stats:', error);
      throw error;
    }
  }

  /**
   * Check if address has voted in specific election
   */
  async checkVotingStatus(networkName, electionAddress, voterAddress) {
    try {
      const election = await this.getContract('ElectionUpgradeable', networkName, electionAddress);
      
      const [hasVoted, voterChoice] = await Promise.all([
        election.hasAddressVoted(voterAddress),
        election.getVoterChoice(voterAddress)
      ]);

      return {
        hasVoted,
        voterChoice: hasVoted ? voterChoice.toString() : null,
        voterAddress,
        electionAddress,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking voting status:', error);
      throw error;
    }
  }
}

module.exports = BlockchainService;
