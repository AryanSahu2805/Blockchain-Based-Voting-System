const { ethers } = require('ethers');
const crypto = require('crypto');

class MetaTransactionService {
  constructor() {
    this.relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    this.relayerAddress = process.env.RELAYER_ADDRESS;
    this.gasPrice = process.env.GAS_PRICE || '20000000000'; // 20 gwei
    this.maxGasLimit = process.env.MAX_GAS_LIMIT || '500000';
    
    if (this.relayerPrivateKey) {
      this.relayerWallet = new ethers.Wallet(this.relayerPrivateKey);
    }
  }

  /**
   * Create meta-transaction for voting
   */
  async createVoteMetaTransaction(
    electionAddress,
    candidateId,
    voterAddress,
    nonce,
    deadline
  ) {
    try {
      // Create the function call data
      const functionSelector = '0x01234567'; // Placeholder for vote function selector
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ['uint256'],
        [candidateId]
      );
      
      const functionData = functionSelector + encodedData.slice(2);
      
      // Create the meta-transaction hash
      const metaTxHash = this.createMetaTxHash(
        electionAddress,
        functionData,
        voterAddress,
        nonce,
        deadline
      );
      
      return {
        electionAddress,
        candidateId,
        voterAddress,
        nonce,
        deadline,
        functionData,
        metaTxHash,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating meta-transaction:', error);
      throw error;
    }
  }

  /**
   * Create meta-transaction hash
   */
  createMetaTxHash(
    target,
    data,
    user,
    nonce,
    deadline
  ) {
    const domain = {
      name: 'Blockchain Voting',
      version: '1',
      chainId: process.env.CHAIN_ID || 80001,
      verifyingContract: target
    };

    const types = {
      MetaTransaction: [
        { name: 'nonce', type: 'uint256' },
        { name: 'from', type: 'address' },
        { name: 'functionSignature', type: 'bytes' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    const value = {
      nonce: nonce,
      from: user,
      functionSignature: data,
      deadline: deadline
    };

    return { domain, types, value };
  }

  /**
   * Verify meta-transaction signature
   */
  async verifyMetaTransaction(
    target,
    data,
    user,
    nonce,
    deadline,
    signature
  ) {
    try {
      const metaTxHash = this.createMetaTxHash(target, data, user, nonce, deadline);
      
      // Recover the signer address
      const recoveredAddress = ethers.utils.verifyTypedData(
        metaTxHash.domain,
        metaTxHash.types,
        metaTxHash.value,
        signature
      );
      
      // Check if the recovered address matches the user
      if (recoveredAddress.toLowerCase() !== user.toLowerCase()) {
        return {
          valid: false,
          error: 'Signature verification failed',
          recoveredAddress: recoveredAddress.toLowerCase(),
          expectedAddress: user.toLowerCase()
        };
      }
      
      // Check if deadline has passed
      if (Date.now() > deadline * 1000) {
        return {
          valid: false,
          error: 'Meta-transaction deadline has passed',
          deadline: deadline,
          currentTime: Date.now()
        };
      }
      
      return {
        valid: true,
        recoveredAddress: recoveredAddress.toLowerCase(),
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Meta-transaction verification failed:', error);
      return {
        valid: false,
        error: 'Verification failed',
        details: error.message
      };
    }
  }

  /**
   * Execute meta-transaction using relayer
   */
  async executeMetaTransaction(
    target,
    data,
    user,
    nonce,
    deadline,
    signature,
    networkName
  ) {
    try {
      if (!this.relayerWallet) {
        throw new Error('Relayer not configured');
      }
      
      // Verify the meta-transaction first
      const verification = await this.verifyMetaTransaction(
        target,
        data,
        user,
        nonce,
        deadline,
        signature
      );
      
      if (!verification.valid) {
        throw new Error(`Meta-transaction verification failed: ${verification.error}`);
      }
      
      // Get provider for the network
      const provider = this.getProvider(networkName);
      const relayerWallet = this.relayerWallet.connect(provider);
      
      // Estimate gas for the transaction
      const gasEstimate = await provider.estimateGas({
        from: this.relayerAddress,
        to: target,
        data: data
      });
      
      // Check if gas estimate is within limits
      if (gasEstimate.gt(this.maxGasLimit)) {
        throw new Error(`Gas estimate ${gasEstimate.toString()} exceeds limit ${this.maxGasLimit}`);
      }
      
      // Create the transaction
      const tx = {
        to: target,
        data: data,
        gasLimit: gasEstimate,
        gasPrice: ethers.utils.parseUnits(this.gasPrice, 'wei'),
        nonce: await provider.getTransactionCount(this.relayerAddress)
      };
      
      // Send the transaction
      const transaction = await relayerWallet.sendTransaction(tx);
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      return {
        success: true,
        transactionHash: transaction.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice.toString(),
        relayer: this.relayerAddress,
        executedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Meta-transaction execution failed:', error);
      throw error;
    }
  }

  /**
   * Get provider for specific network
   */
  getProvider(networkName) {
    const networks = {
      mumbai: {
        rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com'
      },
      polygon: {
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
      },
      sepolia: {
        rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
      },
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/' + process.env.INFURA_PROJECT_ID
      }
    };
    
    const network = networks[networkName];
    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }
    
    return new ethers.providers.JsonRpcProvider(network.rpcUrl);
  }

  /**
   * Generate nonce for meta-transaction
   */
  generateNonce() {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Generate deadline for meta-transaction
   */
  generateDeadline(minutes = 30) {
    return Math.floor(Date.now() / 1000) + (minutes * 60);
  }

  /**
   * Get relayer balance
   */
  async getRelayerBalance(networkName) {
    try {
      const provider = this.getProvider(networkName);
      const balance = await provider.getBalance(this.relayerAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Failed to get relayer balance:', error);
      throw error;
    }
  }

  /**
   * Get gas price for network
   */
  async getGasPrice(networkName) {
    try {
      const provider = this.getProvider(networkName);
      const gasPrice = await provider.getGasPrice();
      return ethers.utils.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      console.error('Failed to get gas price:', error);
      throw error;
    }
  }

  /**
   * Estimate gas cost for meta-transaction
   */
  async estimateGasCost(target, data, networkName) {
    try {
      const provider = this.getProvider(networkName);
      
      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        from: this.relayerAddress,
        to: target,
        data: data
      });
      
      // Get current gas price
      const gasPrice = await provider.getGasPrice();
      
      // Calculate estimated cost
      const estimatedCost = gasEstimate.mul(gasPrice);
      
      // Get network currency
      const network = await provider.getNetwork();
      const currency = this.getNetworkCurrency(network.chainId);
      
      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        estimatedCost: ethers.utils.formatEther(estimatedCost),
        currency: currency
      };
    } catch (error) {
      console.error('Failed to estimate gas cost:', error);
      throw error;
    }
  }

  /**
   * Get network currency
   */
  getNetworkCurrency(chainId) {
    const currencies = {
      1: 'ETH',      // Ethereum
      137: 'MATIC',  // Polygon
      80001: 'MATIC', // Mumbai
      11155111: 'ETH' // Sepolia
    };
    
    return currencies[chainId] || 'ETH';
  }

  /**
   * Check if relayer is configured
   */
  isRelayerConfigured() {
    return !!(this.relayerPrivateKey && this.relayerAddress);
  }

  /**
   * Get relayer status
   */
  async getRelayerStatus(networkName) {
    try {
      const configured = this.isRelayerConfigured();
      const balance = configured ? await this.getRelayerBalance(networkName) : '0';
      const gasPrice = configured ? await this.getGasPrice(networkName) : '0';
      
      return {
        configured,
        address: this.relayerAddress || 'Not configured',
        balance,
        gasPrice,
        network: networkName
      };
    } catch (error) {
      console.error('Failed to get relayer status:', error);
      return {
        configured: false,
        address: 'Error',
        balance: '0',
        gasPrice: '0',
        network: networkName
      };
    }
  }
}

module.exports = MetaTransactionService;
