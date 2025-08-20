import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Vote, 
  Activity, 
  Clock,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import apiService from '../../services/apiService';
import realtimeService from '../../services/realtimeService';

interface LiveStats {
  totalElections: number;
  activeElections: number;
  totalVotes: number;
  totalUsers: number;
  blockchainStats: {
    currentBlock: number;
    gasPrice: string;
    network: string;
    lastUpdate: string;
  };
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

const LiveStats: React.FC = () => {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch stats from API
        const [electionStats, blockchainStats] = await Promise.all([
          apiService.getElectionStats(),
          apiService.getBlockchainStats()
        ]);

        const liveStats: LiveStats = {
          totalElections: electionStats.totalElections,
          activeElections: electionStats.activeElections,
          totalVotes: electionStats.totalVotes,
          totalUsers: electionStats.totalUsers,
          blockchainStats: blockchainStats || {
            currentBlock: 0,
            gasPrice: '0',
            network: 'Unknown',
            lastUpdate: new Date().toISOString()
          },
          recentActivity: electionStats.recentActivity || []
        };

        setStats(liveStats);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch live stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const subscription = realtimeService.subscribeToSystem((update) => {
      if (update.type === 'vote' || update.type === 'election' || update.type === 'user') {
        // Refresh stats when there are updates
        fetchStats();
      }
    });

    // Auto-refresh every 30 seconds if enabled
    let refreshInterval: NodeJS.Timeout;
    if (autoRefresh) {
      refreshInterval = setInterval(fetchStats, 30000);
    }

    // Check WebSocket connection status
    const checkConnection = () => {
      setIsConnected(realtimeService.getConnectionStatus());
    };
    
    const connectionCheckInterval = setInterval(checkConnection, 5000);
    checkConnection();

    return () => {
      subscription.unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
      clearInterval(connectionCheckInterval);
    };
  }, [autoRefresh]);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const [electionStats, blockchainStats] = await Promise.all([
        apiService.getElectionStats(),
        apiService.getBlockchainStats()
      ]);

      const liveStats: LiveStats = {
        totalElections: electionStats.totalElections,
        activeElections: electionStats.activeElections,
        totalVotes: electionStats.totalVotes,
        totalUsers: electionStats.totalUsers,
        blockchainStats: blockchainStats || {
          currentBlock: 0,
          gasPrice: '0',
          network: 'Unknown',
          lastUpdate: new Date().toISOString()
        },
        recentActivity: electionStats.recentActivity || []
      };

      setStats(liveStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading && !stats) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Live Statistics</h3>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-600 bg-slate-700 text-cyan-400 focus:ring-cyan-400"
            />
            <span>Auto-refresh</span>
          </label>
          
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div 
          className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Vote className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Elections</p>
              <p className="text-xl font-bold text-white">{stats?.totalElections || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Elections</p>
              <p className="text-xl font-bold text-white">{stats?.activeElections || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Votes</p>
              <p className="text-xl font-bold text-white">{stats?.totalVotes || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Users</p>
              <p className="text-xl font-bold text-white">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Blockchain Stats */}
      {stats?.blockchainStats && (
        <div className="bg-slate-700/30 rounded-lg p-4 mb-6 border border-slate-600/30">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Blockchain Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Network</p>
              <p className="text-white font-medium">{stats.blockchainStats.network}</p>
            </div>
            <div>
              <p className="text-slate-400">Current Block</p>
              <p className="text-white font-medium">{stats.blockchainStats.currentBlock.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400">Gas Price</p>
              <p className="text-white font-medium">{stats.blockchainStats.gasPrice} Gwei</p>
            </div>
            <div>
              <p className="text-slate-400">Last Update</p>
              <p className="text-white font-medium">{formatTimeAgo(stats.blockchainStats.lastUpdate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Recent Activity</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stats.recentActivity.slice(0, 5).map((activity, index) => (
              <motion.div 
                key={index}
                className="flex items-center space-x-3 text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-300">{activity.description}</span>
                <span className="text-slate-500 ml-auto">{formatTimeAgo(activity.timestamp)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="mt-4 text-right">
        <p className="text-xs text-slate-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
};

export default LiveStats;
