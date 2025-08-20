import { ethers } from 'ethers';

// Types
export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
  totalVotes: number;
  candidates: Candidate[];
  category: string;
  imageUrl?: string;
  contractAddress?: string;
  metadata?: {
    category: string;
    tags: string[];
  };
}

export interface Candidate {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  voteCount?: number;
  percentage?: number;
}

export interface User {
  id: string;
  walletAddress: string;
  profileName: string;
  email: string;
  isAdmin: boolean;
  isSuspended: boolean;
  lastActive: string;
  totalVotes: number;
}

export interface Vote {
  id: string;
  electionId: string;
  candidateId: number;
  voterAddress: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
}

export interface ElectionStats {
  totalElections: number;
  activeElections: number;
  totalVotes: number;
  totalUsers: number;
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BLOCKCHAIN_RPC_URL = process.env.REACT_APP_BLOCKCHAIN_RPC_URL || 'https://rpc-mumbai.maticvigil.com';

class ApiService {
  private provider: ethers.providers.JsonRpcProvider | null = null;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      this.provider = new ethers.providers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
    } catch (error) {
      console.error('Failed to initialize blockchain provider:', error);
    }
  }

  // Generic API call method
  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Elections API
  async getElections(): Promise<Election[]> {
    try {
      return await this.apiCall<Election[]>('/elections');
    } catch (error) {
      console.error('Failed to fetch elections:', error);
      // Return empty array if API fails
      return [];
    }
  }

  async getElection(id: string): Promise<Election | null> {
    try {
      return await this.apiCall<Election>(`/elections/${id}`);
    } catch (error) {
      console.error(`Failed to fetch election ${id}:`, error);
      return null;
    }
  }

  async getElectionResults(id: string): Promise<Election | null> {
    try {
      return await this.apiCall<Election>(`/elections/${id}/results`);
    } catch (error) {
      console.error(`Failed to fetch election results ${id}:`, error);
      return null;
    }
  }

  async createElection(electionData: Partial<Election>): Promise<Election> {
    return await this.apiCall<Election>('/elections', {
      method: 'POST',
      body: JSON.stringify(electionData),
    });
  }

  async updateElection(id: string, electionData: Partial<Election>): Promise<Election> {
    return await this.apiCall<Election>(`/elections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(electionData),
    });
  }

  async deleteElection(id: string): Promise<void> {
    await this.apiCall<void>(`/elections/${id}`, {
      method: 'DELETE',
    });
  }

  // Voting API
  async castVote(electionId: string, candidateId: number, signature: string): Promise<Vote> {
    return await this.apiCall<Vote>('/votes', {
      method: 'POST',
      body: JSON.stringify({
        electionId,
        candidateId,
        signature,
      }),
    });
  }

  async getUserVote(electionId: string, userAddress: string): Promise<Vote | null> {
    try {
      return await this.apiCall<Vote>(`/votes/${electionId}/user/${userAddress}`);
    } catch (error) {
      return null;
    }
  }

  async getElectionVotes(electionId: string): Promise<Vote[]> {
    try {
      return await this.apiCall<Vote[]>(`/votes/${electionId}`);
    } catch (error) {
      console.error(`Failed to fetch votes for election ${electionId}:`, error);
      return [];
    }
  }

  // Users API
  async getUsers(): Promise<User[]> {
    try {
      return await this.apiCall<User[]>('/users');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  }

  async getUser(walletAddress: string): Promise<User | null> {
    try {
      return await this.apiCall<User>(`/users/${walletAddress}`);
    } catch (error) {
      console.error(`Failed to fetch user ${walletAddress}:`, error);
      return null;
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return await this.apiCall<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(walletAddress: string, userData: Partial<User>): Promise<User> {
    return await this.apiCall<User>(`/users/${walletAddress}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Analytics & Stats API
  async getElectionStats(): Promise<ElectionStats> {
    try {
      return await this.apiCall<ElectionStats>('/analytics/stats');
    } catch (error) {
      console.error('Failed to fetch election stats:', error);
      return {
        totalElections: 0,
        activeElections: 0,
        totalVotes: 0,
        totalUsers: 0,
        recentActivity: [],
      };
    }
  }

  async getSystemOverview(): Promise<any> {
    try {
      return await this.apiCall<any>('/analytics/system-overview');
    } catch (error) {
      console.error('Failed to fetch system overview:', error);
      return null;
    }
  }

  // Blockchain API
  async getBlockchainStats(): Promise<any> {
    try {
      return await this.apiCall<any>('/blockchain/stats');
    } catch (error) {
      console.error('Failed to fetch blockchain stats:', error);
      return null;
    }
  }

  async getContractData(contractAddress: string): Promise<any> {
    try {
      if (!this.provider) {
        throw new Error('Blockchain provider not initialized');
      }

      // Basic contract data fetch
      const balance = await this.provider.getBalance(contractAddress);
      const blockNumber = await this.provider.getBlockNumber();

      return {
        balance: ethers.utils.formatEther(balance),
        blockNumber,
        contractAddress,
      };
    } catch (error) {
      console.error('Failed to fetch contract data:', error);
      return null;
    }
  }

  // Real-time data methods
  async subscribeToElectionUpdates(electionId: string, callback: (data: any) => void): Promise<() => void> {
    // WebSocket or Server-Sent Events implementation
    // For now, return a cleanup function
    return () => {
      console.log('Unsubscribing from election updates');
    };
  }

  async subscribeToVoteUpdates(electionId: string, callback: (data: any) => void): Promise<() => void> {
    // WebSocket or Server-Sent Events implementation
    // For now, return a cleanup function
    return () => {
      console.log('Unsubscribing from vote updates');
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Error handling
  private handleApiError(error: any, context: string): never {
    console.error(`API Error in ${context}:`, error);
    throw new Error(`Failed to ${context}: ${error.message}`);
  }
}

export default new ApiService();
