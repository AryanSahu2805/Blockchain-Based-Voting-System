import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Clock,
  Vote
} from 'lucide-react';
import apiService from '../services/apiService';
import realtimeService from '../services/realtimeService';

import { Election } from '../services/apiService';

const Elections: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Real-time data fetching
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        const fetchedElections = await apiService.getElections();
        setElections(fetchedElections);
      } catch (error) {
        console.error('Failed to fetch elections:', error);
        // Show empty state if API fails
        setElections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchElections();

    // Subscribe to real-time election updates
    const subscription = realtimeService.subscribeToSystem((update) => {
      if (update.type === 'election') {
        // Refresh elections when there are updates
        fetchElections();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredElections = elections.filter(election => {
    const matchesSearch = election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         election.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || election.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading elections...</p>
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Active Elections</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Participate in secure, blockchain-based voting for important community decisions
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          className="mb-8 flex flex-col md:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search elections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </motion.div>

        {/* Elections Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredElections.map((election, index) => (
            <motion.div
              key={election.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            >
              {/* Election Image */}
              {election.imageUrl && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={election.imageUrl} 
                    alt={election.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}

              {/* Election Content */}
              <div className="p-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(election.status)}`}>
                    {getStatusText(election.status)}
                  </span>
                  {election.category && (
                    <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      {election.category}
                    </span>
                  )}
                </div>

                {/* Title and Description */}
                <h3 className="text-xl font-semibold mb-3 text-white">{election.title}</h3>
                <p className="text-slate-400 mb-4 line-clamp-3">{election.description}</p>

                {/* Election Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-slate-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Starts: {formatDate(election.startDate)}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Ends: {formatDate(election.endDate)}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{election.candidates.length} candidates</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    <Vote className="w-4 h-4 mr-2" />
                    <span>{election.totalVotes} votes cast</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  to={election.status === 'active' ? `/vote/${election.id}` : `/results/${election.id}`}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-all duration-200 ${
                    election.status === 'active'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {election.status === 'active' ? 'Vote Now' : 'View Results'}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* No Results */}
        {filteredElections.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No elections found</h3>
            <p className="text-slate-400">Try adjusting your search terms or filters</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Elections;
