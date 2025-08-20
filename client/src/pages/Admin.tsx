import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Vote, 
  Settings, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import apiService from '../services/apiService';
import realtimeService from '../services/realtimeService';

import { User, Election } from '../services/apiService';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch users and elections in parallel
        const [fetchedUsers, fetchedElections] = await Promise.all([
          apiService.getUsers(),
          apiService.getElections()
        ]);
        
        setUsers(fetchedUsers);
        setElections(fetchedElections);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
        setUsers([]);
        setElections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const userSubscription = realtimeService.subscribeToSystem((update) => {
      if (update.type === 'user') {
        fetchData(); // Refresh data when users are updated
      }
    });

    const electionSubscription = realtimeService.subscribeToSystem((update) => {
      if (update.type === 'election') {
        fetchData(); // Refresh data when elections are updated
      }
    });

    return () => {
      userSubscription.unsubscribe();
      electionSubscription.unsubscribe();
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ended': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'upcoming': return 'Upcoming';
      case 'ended': return 'Ended';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Manage users, elections, and system settings
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'elections', label: 'Elections', icon: Vote },
            { key: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                  <Users className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">{users.length}</h3>
                  <p className="text-slate-400">Total Users</p>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                  <Vote className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">{elections.length}</h3>
                  <p className="text-slate-400">Total Elections</p>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                  <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {elections.reduce((sum, e) => sum + e.totalVotes, 0).toLocaleString()}
                  </h3>
                  <p className="text-slate-400">Total Votes Cast</p>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                  <Shield className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {users.filter(u => u.isAdmin).length}
                  </h3>
                  <p className="text-slate-400">Admin Users</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.profileName}</p>
                          <p className="text-sm text-slate-400">
                            Last active: {formatDate(user.lastActive)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.isSuspended ? (
                          <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-sm">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full text-sm">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-xl font-semibold text-white">User Management</h3>
                <p className="text-slate-400">Manage user accounts and permissions</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Wallet Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{user.profileName}</div>
                              <div className="text-sm text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-sm text-slate-300 font-mono">
                            {user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-8)}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.isSuspended ? (
                              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-sm">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full text-sm">
                                Active
                              </span>
                            )}
                            {user.isAdmin && (
                              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full text-sm">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {formatDate(user.lastActive)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                              Edit
                            </button>
                            {user.isSuspended ? (
                              <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors duration-200">
                                Unsuspend
                              </button>
                            ) : (
                              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors duration-200">
                                Suspend
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Elections Tab */}
          {activeTab === 'elections' && (
            <div className="space-y-6">
              {elections.map((election) => (
                <div key={election.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">{election.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>Started: {formatDate(election.startDate)}</span>
                        <span>Ends: {formatDate(election.endDate)}</span>
                        <span>Total Votes: {election.totalVotes.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(election.status)}`}>
                      {getStatusText(election.status)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                      View Details
                    </button>
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                      Edit
                    </button>
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors duration-200">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">System Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Maintenance Mode</h4>
                    <p className="text-sm text-slate-400">Temporarily disable the platform for maintenance</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                    Enable
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Rate Limiting</h4>
                    <p className="text-sm text-slate-400">Configure API rate limits and DDoS protection</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                    Configure
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Backup & Recovery</h4>
                    <p className="text-sm text-slate-400">Manage database backups and recovery procedures</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                    Manage
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Security Settings</h4>
                    <p className="text-sm text-slate-400">Configure security headers and authentication settings</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
