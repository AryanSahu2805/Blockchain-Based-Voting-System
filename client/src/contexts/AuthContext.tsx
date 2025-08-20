import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface User {
  id: string;
  walletAddress: string;
  profileName?: string;
  email?: string;
  isAdmin: boolean;
  isVerified: boolean;
  profile?: {
    bio?: string;
    location?: string;
    website?: string;
  };
  stats: {
    electionsVoted: number;
    electionsCreated: number;
    totalVotes: number;
    lastVoteDate?: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      showProfile: boolean;
      showVotingHistory: boolean;
      showStats: boolean;
    };
    display: {
      theme: 'light' | 'dark' | 'auto';
      language: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (walletAddress: string, signature: string, message: string, nonce: string) => Promise<void>;
  loginWithSIWE: (walletAddress: string, signature: string, challenge: any) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  // API base URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Legacy authentication method
  const login = async (walletAddress: string, signature: string, message: string, nonce: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE}/users/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          message,
          nonce
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      
      // Store token
      localStorage.setItem('authToken', data.token);
      
      // Update state
      setUser(data.user);
      setIsAuthenticated(true);
      
      toast.success('Successfully authenticated!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // SIWE authentication method
  const loginWithSIWE = async (walletAddress: string, signature: string, challenge: any) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE}/users/siwe/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          challenge
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'SIWE authentication failed');
      }

      const data = await response.json();
      
      // Store token and session token
      localStorage.setItem('authToken', data.token);
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }
      
      // Update state
      setUser(data.user);
      setIsAuthenticated(true);
      
      toast.success('Successfully authenticated with SIWE!');
    } catch (error) {
      console.error('SIWE login error:', error);
      toast.error(error instanceof Error ? error.message : 'SIWE authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionToken');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Successfully logged out');
  };

  // Update user profile
  const updateUser = async (updates: Partial<User>) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${API_BASE}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Update user error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
      throw error;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('sessionToken');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      // Clear invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('sessionToken');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithSIWE,
    logout,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
