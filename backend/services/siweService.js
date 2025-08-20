const { ethers } = require('ethers');
const crypto = require('crypto');

class SIWEService {
  constructor() {
    this.domain = process.env.SIWE_DOMAIN || 'blockchain-voting.com';
    this.version = '1';
    this.chainId = process.env.CHAIN_ID || '1';
    this.uri = process.env.SIWE_URI || 'https://blockchain-voting.com';
  }

  /**
   * Generate SIWE message for authentication
   */
  generateMessage(address, nonce) {
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const message = {
      domain: this.domain,
      address: address.toLowerCase(),
      statement: 'Sign in to Blockchain Voting Platform',
      uri: this.uri,
      version: this.version,
      chainId: this.chainId,
      nonce: nonce,
      issuedAt: issuedAt,
      expirationTime: expirationTime,
      resources: [
        'https://docs.blockchain-voting.com',
        'https://github.com/blockchain-voting'
      ]
    };

    return this.formatMessage(message);
  }

  /**
   * Format SIWE message according to EIP-4361 standard
   */
  formatMessage(message) {
    const lines = [
      `${message.domain} wants you to sign in with your Ethereum account:`,
      `${message.address}`,
      '',
      message.statement,
      '',
      `URI: ${message.uri}`,
      `Version: ${message.version}`,
      `Chain ID: ${message.chainId}`,
      `Nonce: ${message.nonce}`,
      `Issued At: ${message.issuedAt}`,
      `Expiration Time: ${message.expirationTime}`,
      `Resources:`,
      ...message.resources.map(resource => `- ${resource}`)
    ];

    return lines.join('\n');
  }

  /**
   * Verify SIWE signature
   */
  async verifySignature(message, signature, expectedAddress) {
    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      // Check if the recovered address matches the expected address
      if (recoveredAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        return {
          valid: false,
          error: 'Address mismatch',
          recoveredAddress: recoveredAddress.toLowerCase(),
          expectedAddress: expectedAddress.toLowerCase()
        };
      }

      // Parse the message to extract components
      const parsedMessage = this.parseMessage(message);
      
      // Validate message components
      const validation = this.validateMessage(parsedMessage);
      if (!validation.valid) {
        return validation;
      }

      return {
        valid: true,
        address: recoveredAddress.toLowerCase(),
        message: parsedMessage,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Signature verification failed',
        details: error.message
      };
    }
  }

  /**
   * Parse SIWE message
   */
  parseMessage(message) {
    const lines = message.split('\n');
    const parsed = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'wants you to sign in with your Ethereum account':
            parsed.domain = lines[0].trim();
            break;
          case 'URI':
            parsed.uri = value;
            break;
          case 'Version':
            parsed.version = value;
            break;
          case 'Chain ID':
            parsed.chainId = value;
            break;
          case 'Nonce':
            parsed.nonce = value;
            break;
          case 'Issued At':
            parsed.issuedAt = value;
            break;
          case 'Expiration Time':
            parsed.expirationTime = value;
            break;
        }
      }
    }

    // Extract address from the second line
    parsed.address = lines[1]?.trim();
    
    // Extract statement (lines between domain and URI)
    const uriIndex = lines.findIndex(line => line.startsWith('URI:'));
    if (uriIndex > 2) {
      parsed.statement = lines.slice(2, uriIndex).join('\n').trim();
    }

    return parsed;
  }

  /**
   * Validate parsed message
   */
  validateMessage(parsedMessage) {
    const now = new Date();
    const issuedAt = new Date(parsedMessage.issuedAt);
    const expirationTime = new Date(parsedMessage.expirationTime);

    // Check if message has expired
    if (now > expirationTime) {
      return {
        valid: false,
        error: 'Message has expired',
        issuedAt: parsedMessage.issuedAt,
        expirationTime: parsedMessage.expirationTime,
        currentTime: now.toISOString()
      };
    }

    // Check if message was issued in the future
    if (issuedAt > now) {
      return {
        valid: false,
        error: 'Message issued in the future',
        issuedAt: parsedMessage.issuedAt,
        currentTime: now.toISOString()
      };
    }

    // Validate domain
    if (parsedMessage.domain !== this.domain) {
      return {
        valid: false,
        error: 'Invalid domain',
        expected: this.domain,
        received: parsedMessage.domain
      };
    }

    // Validate URI
    if (parsedMessage.uri !== this.uri) {
      return {
        valid: false,
        error: 'Invalid URI',
        expected: this.uri,
        received: parsedMessage.uri
      };
    }

    // Validate version
    if (parsedMessage.version !== this.version) {
      return {
        valid: false,
        error: 'Invalid version',
        expected: this.version,
        received: parsedMessage.version
      };
    }

    // Validate chain ID
    if (parsedMessage.chainId !== this.chainId) {
      return {
        valid: false,
        error: 'Invalid chain ID',
        expected: this.chainId,
        received: parsedMessage.chainId
      };
    }

    return {
      valid: true,
      message: parsedMessage
    };
  }

  /**
   * Generate secure nonce
   */
  generateNonce() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create authentication challenge
   */
  createChallenge(address) {
    const nonce = this.generateNonce();
    const message = this.generateMessage(address, nonce);
    
    return {
      message,
      nonce,
      address: address.toLowerCase(),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Verify authentication response
   */
  async verifyChallenge(challenge, signature) {
    try {
      const result = await this.verifySignature(challenge.message, signature, challenge.address);
      
      if (result.valid) {
        // Check if nonce matches
        if (result.message.nonce !== challenge.nonce) {
          return {
            valid: false,
            error: 'Nonce mismatch',
            expected: challenge.nonce,
            received: result.message.nonce
          };
        }

        // Check if challenge has expired
        const now = new Date();
        const expiresAt = new Date(challenge.expiresAt);
        
        if (now > expiresAt) {
          return {
            valid: false,
            error: 'Challenge has expired',
            expiresAt: challenge.expiresAt,
            currentTime: now.toISOString()
          };
        }

        return {
          valid: true,
          address: result.address,
          verifiedAt: result.verifiedAt,
          challenge: challenge
        };
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        error: 'Challenge verification failed',
        details: error.message
      };
    }
  }

  /**
   * Create session token
   */
  createSessionToken(address, challenge) {
    const sessionData = {
      address: address.toLowerCase(),
      nonce: challenge.nonce,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    // In production, this should be signed with a secret key
    return Buffer.from(JSON.stringify(sessionData)).toString('base64');
  }

  /**
   * Validate session token
   */
  validateSessionToken(token) {
    try {
      const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
      const now = new Date();
      const expiresAt = new Date(sessionData.expiresAt);

      if (now > expiresAt) {
        return {
          valid: false,
          error: 'Session has expired',
          expiresAt: sessionData.expiresAt,
          currentTime: now.toISOString()
        };
      }

      return {
        valid: true,
        session: sessionData
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid session token',
        details: error.message
      };
    }
  }
}

module.exports = SIWEService;
