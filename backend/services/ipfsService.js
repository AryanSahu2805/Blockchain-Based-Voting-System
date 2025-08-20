// const { create } = require('ipfs-http-client');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataGateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    
    this.initializeIPFS();
  }

  /**
   * Initialize IPFS client
   */
  async initializeIPFS() {
    try {
      // Skip IPFS client initialization due to dependency issues
      // Using Pinata as primary storage method
      console.log('⚠️ IPFS client initialization skipped (using Pinata as storage)');
      this.ipfs = null;
    } catch (error) {
      console.error('❌ IPFS initialization failed:', error);
      console.log('⚠️ Using Pinata as fallback storage');
    }
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(fileBuffer, filename, metadata = {}) {
    try {
      if (this.ipfs) {
        return await this.uploadToIPFS(fileBuffer, filename, metadata);
      } else if (this.pinataApiKey) {
        return await this.uploadToPinata(fileBuffer, filename, metadata);
      } else {
        throw new Error('No IPFS or Pinata configuration available');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload to IPFS node
   */
  async uploadToIPFS(fileBuffer, filename, metadata = {}) {
    try {
      // Add file to IPFS
      const result = await this.ipfs.add(fileBuffer, {
        pin: true,
        metadata: {
          name: filename,
          ...metadata
        }
      });

      // Pin the file
      await this.ipfs.pin.add(result.cid);

      return {
        hash: result.cid.toString(),
        size: result.size,
        filename,
        url: `${this.gateway}${result.cid}`,
        gateway: this.gateway,
        pinned: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload to Pinata
   */
  async uploadToPinata(fileBuffer, filename, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename,
        contentType: this.getContentType(filename)
      });

      // Add metadata
      const pinataMetadata = {
        name: filename,
        keyvalues: {
          ...metadata,
          timestamp: new Date().toISOString(),
          service: 'blockchain-voting'
        }
      };
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinata upload failed: ${error}`);
      }

      const result = await response.json();

      return {
        hash: result.IpfsHash,
        size: result.PinSize,
        filename,
        url: `${this.pinataGateway}${result.IpfsHash}`,
        gateway: this.pinataGateway,
        pinned: true,
        timestamp: new Date().toISOString(),
        pinataId: result.Id
      };
    } catch (error) {
      console.error('Pinata upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload JSON data to IPFS
   */
  async uploadJSON(data, filename = 'data.json') {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');
      
      return await this.uploadFile(buffer, filename, {
        type: 'application/json',
        encoding: 'utf-8'
      });
    } catch (error) {
      console.error('JSON upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload election metadata
   */
  async uploadElectionMetadata(electionData) {
    try {
      const metadata = {
        title: electionData.title,
        description: electionData.description,
        category: electionData.category,
        tags: electionData.tags || [],
        startTime: electionData.startTime,
        endTime: electionData.endTime,
        candidates: electionData.candidates.map(candidate => ({
          name: candidate.name,
          description: candidate.description,
          imageUrl: candidate.imageUrl
        })),
        creator: electionData.creator,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        schema: 'election-metadata-v1'
      };

      return await this.uploadJSON(metadata, `election-${electionData.id}-metadata.json`);
    } catch (error) {
      console.error('Election metadata upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload voting proof
   */
  async uploadVotingProof(voteData) {
    try {
      const proof = {
        electionId: voteData.electionId,
        voter: voteData.voter,
        candidateId: voteData.candidateId,
        timestamp: voteData.timestamp,
        transactionHash: voteData.transactionHash,
        blockNumber: voteData.blockNumber,
        proofHash: this.generateProofHash(voteData),
        version: '1.0.0',
        schema: 'voting-proof-v1'
      };

      return await this.uploadJSON(proof, `vote-proof-${voteData.electionId}-${voteData.voter}.json`);
    } catch (error) {
      console.error('Voting proof upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload image to IPFS
   */
  async uploadImage(imageBuffer, filename, metadata = {}) {
    try {
      const contentType = this.getContentType(filename);
      
      return await this.uploadFile(imageBuffer, filename, {
        type: contentType,
        category: 'image',
        ...metadata
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  /**
   * Get content type from filename
   */
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate proof hash for voting
   */
  generateProofHash(voteData) {
    const proofString = `${voteData.electionId}-${voteData.voter}-${voteData.candidateId}-${voteData.timestamp}`;
    return crypto.createHash('sha256').update(proofString).digest('hex');
  }

  /**
   * Verify file on IPFS
   */
  async verifyFile(hash) {
    try {
      if (this.ipfs) {
        // Try to get file info from IPFS
        const stat = await this.ipfs.files.stat(`/ipfs/${hash}`);
        return {
          hash,
          size: stat.size,
          verified: true,
          timestamp: new Date().toISOString()
        };
      } else {
        // Verify through gateway
        const response = await fetch(`${this.gateway}${hash}`);
        if (response.ok) {
          return {
            hash,
            verified: true,
            timestamp: new Date().toISOString()
          };
        } else {
          return {
            hash,
            verified: false,
            error: 'File not found on gateway'
          };
        }
      }
    } catch (error) {
      console.error('File verification failed:', error);
      return {
        hash,
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Get file from IPFS
   */
  async getFile(hash) {
    try {
      if (this.ipfs) {
        const chunks = [];
        for await (const chunk of this.ipfs.cat(hash)) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      } else {
        // Get from gateway
        const response = await fetch(`${this.gateway}${hash}`);
        if (response.ok) {
          return Buffer.from(await response.arrayBuffer());
        } else {
          throw new Error('File not found on gateway');
        }
      }
    } catch (error) {
      console.error('File retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Pin file to IPFS
   */
  async pinFile(hash) {
    try {
      if (this.ipfs) {
        await this.ipfs.pin.add(hash);
        return { hash, pinned: true };
      } else if (this.pinataApiKey) {
        const response = await fetch(`https://api.pinata.cloud/pinning/pinByHash`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          },
          body: JSON.stringify({
            hashToPin: hash,
            pinataMetadata: {
              name: `pinned-${hash}`,
              keyvalues: {
                service: 'blockchain-voting',
                timestamp: new Date().toISOString()
              }
            }
          })
        });

        if (response.ok) {
          return { hash, pinned: true };
        } else {
          throw new Error('Pinata pin failed');
        }
      } else {
        throw new Error('No IPFS or Pinata configuration available');
      }
    } catch (error) {
      console.error('File pinning failed:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      if (this.ipfs) {
        const stats = await this.ipfs.repo.stat();
        return {
          numObjects: stats.numObjects,
          repoSize: stats.repoSize,
          repoPath: stats.repoPath,
          version: stats.version,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          service: 'Pinata',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Storage stats failed:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = IPFSService;
