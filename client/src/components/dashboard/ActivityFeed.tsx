import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Vote, 
  Users, 
  Clock, 
  TrendingUp,
  Eye,
  EyeOff,
  Filter,
  RefreshCw
} from 'lucide-react';
import realtimeService from '../../services/realtimeService';

interface ActivityItem {
  id: string;
  type: 'vote' | 'election' | 'user' | 'system';
  action: 'create' | 'update' | 'delete';
  description: string;
  timestamp: string;
  metadata?: {
    electionId?: string;
    candidateName?: string;
    voterAddress?: string;
    transactionHash?: string;
    blockNumber?: number;
  };
}

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'vote' | 'election' | 'user' | 'system'>('all');
  const [isVisible, setIsVisible] = useState(true);
  const [maxItems, setMaxItems] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = realtimeService.subscribeToSystem((update) => {
      const newActivity: ActivityItem = {
        id: `${update.type}-${update.action}-${Date.now()}-${Math.random()}`,
        type: update.type,
        action: update.action,
        description: update.data.message || update.data.description || `${update.action} ${update.type}`,
        timestamp: update.timestamp,
        metadata: {
          electionId: update.data.electionId,
          candidateName: update.data.candidateName,
          voterAddress: update.data.voterAddress,
          transactionHash: update.data.transactionHash,
          blockNumber: update.data.blockNumber,
        }
      };

      setActivities(prev => {
        const updated = [newActivity, ...prev];
        // Keep only the latest maxItems
        return updated.slice(0, maxItems);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [maxItems]);

  const filteredActivities = activities.filter(activity => 
    filter === 'all' || activity.type === filter
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vote':
        return <Vote className="w-4 h-4 text-green-400" />;
      case 'election':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'user':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'system':
        return <Activity className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'vote':
        return 'border-l-green-500 bg-green-500/5';
      case 'election':
        return 'border-l-blue-500 bg-blue-500/5';
      case 'user':
        return 'border-l-purple-500 bg-purple-500/5';
      case 'system':
        return 'border-l-cyan-500 bg-cyan-500/5';
      default:
        return 'border-l-slate-500 bg-slate-500/5';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      default:
        return action;
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

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate refresh by clearing and re-adding activities
    setTimeout(() => {
      setActivities(prev => [...prev]);
      setLoading(false);
    }, 500);
  };

  const clearActivities = () => {
    setActivities([]);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg border border-slate-600 transition-colors"
        >
          <Eye className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      className="fixed bottom-4 right-4 w-96 max-h-96 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl z-50"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex space-x-1">
          {(['all', 'vote', 'election', 'user', 'system'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-2 py-1 text-xs rounded ${
                filter === filterType
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              } transition-colors`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
        
        <button
          onClick={clearActivities}
          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Activity List */}
      <div className="max-h-64 overflow-y-auto">
        <AnimatePresence>
          {filteredActivities.length === 0 ? (
            <motion.div
              className="p-4 text-center text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activities yet</p>
              <p className="text-xs">Activities will appear here in real-time</p>
            </motion.div>
          ) : (
            filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                className={`p-3 border-l-4 ${getActivityColor(activity.type)} hover:bg-slate-700/30 transition-colors`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-slate-400">
                        {getActionText(activity.action)}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-white mb-2">
                      {activity.description}
                    </p>
                    
                    {/* Metadata */}
                    {activity.metadata && (
                      <div className="space-y-1">
                        {activity.metadata.electionId && (
                          <div className="text-xs text-slate-400">
                            Election: {truncateAddress(activity.metadata.electionId)}
                          </div>
                        )}
                        {activity.metadata.candidateName && (
                          <div className="text-xs text-slate-400">
                            Candidate: {activity.metadata.candidateName}
                          </div>
                        )}
                        {activity.metadata.voterAddress && (
                          <div className="text-xs text-slate-400">
                            Voter: {truncateAddress(activity.metadata.voterAddress)}
                          </div>
                        )}
                        {activity.metadata.transactionHash && (
                          <div className="text-xs text-slate-400">
                            TX: {truncateAddress(activity.metadata.transactionHash)}
                          </div>
                        )}
                        {activity.metadata.blockNumber && (
                          <div className="text-xs text-slate-400">
                            Block: {activity.metadata.blockNumber.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{filteredActivities.length} activities</span>
          <span>Real-time updates</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityFeed;
