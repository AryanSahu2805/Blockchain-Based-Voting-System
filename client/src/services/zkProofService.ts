import { ethers } from 'ethers';

interface ZKProof {
  nullifier: string;
  commitment: string;
  proof: number[];
  candidateId: number;
  timestamp: number;
}

interface MerkleProof {
  siblings: string[];
  path: number;
}

class ZKProofService {
  private verificationKey: number[] = [];

  constructor() {
    // In production, this would be fetched from the smart contract
    this.verificationKey = [
      0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
      0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890,
      0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234,
      0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678
    ];
  }

  /**
   * Generate nullifier for voter
   */
  generateNullifier(voterAddress: string, electionId: string, secret: string): string {
    const input = `${voterAddress}-${electionId}-${secret}`;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
  }

  /**
   * Generate commitment for vote
   */
  generateCommitment(voterAddress: string, candidateId: number, secret: string): string {
    const input = `${voterAddress}-${candidateId}-${secret}`;
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input));
  }

  /**
   * Generate random secret
   */
  generateSecret(): string {
    return ethers.utils.hexlify(ethers.utils.randomBytes(32));
  }

  /**
   * Create ZK proof for voting
   */
  async createVoteProof(
    voterAddress: string,
    electionId: string,
    candidateId: number,
    secret: string
  ): Promise<ZKProof> {
    try {
      const nullifier = this.generateNullifier(voterAddress, electionId, secret);
      const commitment = this.generateCommitment(voterAddress, candidateId, secret);
      
      // In production, this would use a real ZK-SNARK proving system
      // For demo purposes, we'll create a simplified proof
      const proof = this.generateSimplifiedProof(voterAddress, candidateId, secret);
      
      return {
        nullifier,
        commitment,
        proof,
        candidateId,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      console.error('Error creating ZK proof:', error);
      throw error;
    }
  }

  /**
   * Generate simplified proof (demo purposes)
   */
  private generateSimplifiedProof(
    voterAddress: string,
    candidateId: number,
    secret: string
  ): number[] {
    // In production, this would be a real ZK-SNARK proof
    // For demo, we'll create a hash-based proof
    const proofInput = `${voterAddress}-${candidateId}-${secret}-${Date.now()}`;
    const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(proofInput));
    
    // Convert hash to array of numbers
    const proofArray: number[] = [];
    for (let i = 0; i < 8; i++) {
      const slice = proofHash.slice(2 + i * 8, 2 + (i + 1) * 8);
      proofArray.push(parseInt(slice, 16));
    }
    
    return proofArray;
  }

  /**
   * Verify ZK proof
   */
  async verifyProof(proof: ZKProof): Promise<boolean> {
    try {
      // Basic validation
      if (!proof.nullifier || !proof.commitment || !proof.proof) {
        return false;
      }

      if (proof.proof.length !== 8) {
        return false;
      }

      // Check timestamp (proof shouldn't be too old)
      const now = Math.floor(Date.now() / 1000);
      if (proof.timestamp > now || proof.timestamp < now - 86400) {
        return false;
      }

      // In production, this would verify the actual ZK-SNARK proof
      // For demo, we'll do basic validation
      return this.verifySimplifiedProof(proof);
    } catch (error) {
      console.error('Error verifying ZK proof:', error);
      return false;
    }
  }

  /**
   * Verify simplified proof (demo purposes)
   */
  private verifySimplifiedProof(proof: ZKProof): boolean {
    // Basic proof validation
    for (let i = 0; i < proof.proof.length; i++) {
      if (proof.proof[i] === 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate merkle proof
   */
  generateMerkleProof(leaf: string, siblings: string[], path: number): MerkleProof {
    return {
      siblings,
      path
    };
  }

  /**
   * Verify merkle proof
   */
  verifyMerkleProof(
    leaf: string,
    proof: MerkleProof,
    root: string
  ): boolean {
    try {
      let computedHash = leaf;
      
      for (let i = 0; i < proof.siblings.length; i++) {
        if ((proof.path & (1 << i)) === 0) {
                  computedHash = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32'],
            [computedHash, proof.siblings[i]]
          )
        );
        } else {
                  computedHash = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32'],
            [proof.siblings[i], computedHash]
          )
        );
        }
      }
      
      return computedHash === root;
    } catch (error) {
      console.error('Error verifying merkle proof:', error);
      return false;
    }
  }

  /**
   * Create merkle tree from voter list
   */
  createMerkleTree(voterAddresses: string[]): {
    root: string;
    leaves: string[];
    proofs: Map<string, MerkleProof>;
  } {
    if (voterAddresses.length === 0) {
      throw new Error('Voter list cannot be empty');
    }

    const leaves = voterAddresses.map(addr => 
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(addr))
    );

    const tree = this.buildMerkleTree(leaves);
    const proofs = this.generateMerkleProofs(leaves, tree);

    return {
      root: tree[tree.length - 1][0],
      leaves,
      proofs
    };
  }

  /**
   * Build merkle tree
   */
  private buildMerkleTree(leaves: string[]): string[][] {
    const tree: string[][] = [leaves];
    let currentLevel = leaves;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const hash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['bytes32', 'bytes32'],
              [currentLevel[i], currentLevel[i + 1]]
            )
          );
          nextLevel.push(hash);
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  /**
   * Generate merkle proofs for all leaves
   */
  private generateMerkleProofs(
    leaves: string[],
    tree: string[][]
  ): Map<string, MerkleProof> {
    const proofs = new Map<string, MerkleProof>();

    for (let i = 0; i < leaves.length; i++) {
      const proof = this.generateMerkleProofForLeaf(i, tree);
      proofs.set(leaves[i], proof);
    }

    return proofs;
  }

  /**
   * Generate merkle proof for specific leaf
   */
  private generateMerkleProofForLeaf(
    leafIndex: number,
    tree: string[][]
  ): MerkleProof {
    const siblings: string[] = [];
    let path = 0;
    let currentIndex = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      
      if (currentIndex % 2 === 0) {
        // Left child
        if (currentIndex + 1 < currentLevel.length) {
          siblings.push(currentLevel[currentIndex + 1]);
        }
      } else {
        // Right child
        siblings.push(currentLevel[currentIndex - 1]);
        path |= (1 << level);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { siblings, path };
  }

  /**
   * Get proof for specific voter
   */
  getVoterProof(
    voterAddress: string,
    merkleData: {
      root: string;
      leaves: string[];
      proofs: Map<string, MerkleProof>;
    }
  ): MerkleProof | null {
    const leaf = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(voterAddress));
    return merkleData.proofs.get(leaf) || null;
  }

  /**
   * Format proof for smart contract
   */
  formatProofForContract(proof: ZKProof): {
    nullifier: string;
    commitment: string;
    proof: number[];
    candidateId: number;
    timestamp: number;
  } {
    return {
      nullifier: proof.nullifier,
      commitment: proof.commitment,
      proof: proof.proof,
      candidateId: proof.candidateId,
      timestamp: proof.timestamp
    };
  }

  /**
   * Validate proof data
   */
  validateProofData(proof: ZKProof): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!proof.nullifier || proof.nullifier.length !== 66) {
      errors.push('Invalid nullifier format');
    }

    if (!proof.commitment || proof.commitment.length !== 66) {
      errors.push('Invalid commitment format');
    }

    if (!proof.proof || proof.proof.length !== 8) {
      errors.push('Invalid proof format');
    }

    if (proof.candidateId <= 0) {
      errors.push('Invalid candidate ID');
    }

    if (proof.timestamp <= 0) {
      errors.push('Invalid timestamp');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default ZKProofService;
