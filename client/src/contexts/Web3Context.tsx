import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

interface Web3ContextType {
  account: string | null;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  isCorrectNetwork: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Use ref to avoid circular dependency in useEffect
  const connectRef = useRef<() => Promise<void>>();

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
  };

  // Disconnect from MetaMask
  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setIsConnected(false);
  }, []);

  // Connect to MetaMask
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      alert('Please install MetaMask to use this application');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request account access
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // Create provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum!);
      const signer = provider.getSigner();
      
      // Get network info
      const network = await provider.getNetwork();
      
      setAccount(account);
      setProvider(provider);
      setSigner(signer);
      setChainId(network.chainId);
      setIsConnected(true);
      
      // Listen for account changes
      window.ethereum!.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Use the disconnect function directly to avoid circular dependency
          setAccount(null);
          setProvider(null);
          setSigner(null);
          setChainId(null);
          setIsConnected(false);
        } else {
          setAccount(accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum!.on('chainChanged', (chainId: string) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload();
      });

    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      alert('Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  }, []); // Remove disconnect from dependencies
  
  // Store connect function in ref to avoid circular dependency
  connectRef.current = connect;

  // Switch network
  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If the network doesn't exist, add it
      if (error.code === 4902) {
        const networkConfig = getNetworkConfig(targetChainId);
        if (networkConfig) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
          }
        }
      }
    }
  };

  // Get network configuration
  const getNetworkConfig = (chainId: number) => {
    const networks = {
      80001: { // Mumbai
        chainId: '0x13881',
        chainName: 'Mumbai Testnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com']
      },
      137: { // Polygon
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
      },
      11155111: { // Sepolia
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://rpc.sepolia.org'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      }
    };
    
    return networks[chainId as keyof typeof networks];
  };

  // Check connection status on mount
  useEffect(() => {
    if (isMetaMaskInstalled() && window.ethereum!.selectedAddress && connectRef.current) {
      connectRef.current();
    }
  }, []); // No dependencies needed since we use ref

  const value: Web3ContextType = {
    account,
    provider,
    signer,
    chainId,
    isConnected,
    isConnecting,
    connect,
    connectWallet: connect,
    disconnect,
    disconnectWallet: disconnect,
    switchNetwork,
    isCorrectNetwork: chainId === 80001 || chainId === 137 || chainId === 11155111,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
