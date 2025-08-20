import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle,
  TrendingUp,
  PieChart,
  Activity,
  Download,
  Share2
} from 'lucide-react';
import apiService from '../services/apiService';
import realtimeService from '../services/realtimeService';

import { Election, Candidate } from '../services/apiService';

const Results: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'bar' | 'pie' | 'line'>('bar');

  // Real-time data fetching
  useEffect(() => {
    const fetchElectionResults = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const fetchedElection = await apiService.getElectionResults(id);
        setElection(fetchedElection);
      } catch (error) {
        console.error('Failed to fetch election results:', error);
        setElection(null);
      } finally {
        setLoading(false);
      }
    };

    fetchElectionResults();

    // Subscribe to real-time vote updates for this election
    if (id) {
      const subscription = realtimeService.subscribeToVotes(id, (update) => {
        if (update.type === 'vote' && update.action === 'create') {
          // Refresh results when new votes come in
          fetchElectionResults();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWinner = () => {
    if (!election) return null;
    return election.candidates.reduce((prev, current) => 
      ((prev.voteCount || 0) > (current.voteCount || 0)) ? prev : current
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Election not found</h2>
          <p className="text-slate-400">The election you're looking for doesn't exist</p>
        </div>
      </div>
    );
  }

  const winner = getWinner();

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Election Results</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Final results for {election.title}
          </p>
        </motion.div>

        {/* Election Info Card */}
        <motion.div 
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">{election.title}</h2>
              <p className="text-slate-400 mb-4">{election.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-slate-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Started: {formatDate(election.startDate)}</span>
                </div>
                <div className="flex items-center text-sm text-slate-400">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Ended: {formatDate(election.endDate)}</span>
                </div>
                <div className="flex items-center text-sm text-slate-400">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Total Votes: {election.totalVotes.toLocaleString()}</span>
                </div>
                {election.category && (
                  <div className="flex items-center text-sm text-slate-400">
                    <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      {election.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {election.imageUrl && (
              <div className="h-64 overflow-hidden rounded-lg">
                <img 
                  src={election.imageUrl} 
                  alt={election.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Winner Announcement */}
        {winner && (
          <motion.div 
            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6 mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-white mb-2">🏆 Winner Announced!</h3>
            <div className="flex items-center justify-center gap-4 mb-4">
              {winner.imageUrl && (
                <img 
                  src={winner.imageUrl} 
                  alt={winner.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-green-500"
                />
              )}
              <div>
                <h4 className="text-xl font-semibold text-white">{winner.name}</h4>
                <p className="text-green-400 font-medium">
                  {(winner.voteCount || 0).toLocaleString()} votes ({(winner.percentage || 0).toFixed(1)}%)
                </p>
              </div>
            </div>
            <p className="text-slate-300">
              Congratulations to {winner.name} for winning the election with a majority of votes!
            </p>
          </motion.div>
        )}

        {/* Chart Selection */}
        <motion.div 
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-white flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-cyan-400" />
              Results Visualization
            </h3>
            
            <div className="flex gap-2">
              {[
                { key: 'bar', icon: BarChart3, label: 'Bar Chart' },
                { key: 'pie', icon: PieChart, label: 'Pie Chart' },
                { key: 'line', icon: Activity, label: 'Trends' }
              ].map((chart) => (
                <button
                  key={chart.key}
                  onClick={() => setSelectedChart(chart.key as 'bar' | 'pie' | 'line')}
                  className={`p-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    selectedChart === chart.key
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <chart.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{chart.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart Display */}
          {selectedChart === 'bar' && (
            <div className="space-y-4">
              {election.candidates.map((candidate, index) => (
                <motion.div
                  key={candidate.id}
                  className="bg-slate-700/50 rounded-lg p-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {candidate.imageUrl && (
                        <img 
                          src={candidate.imageUrl} 
                          alt={candidate.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold text-white">{candidate.name}</h4>
                        <p className="text-sm text-slate-400">
                          {(candidate.voteCount || 0).toLocaleString()} votes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                                              <p className="text-lg font-semibold text-white">
                          {(candidate.percentage || 0).toFixed(1)}%
                        </p>
                      {candidate.id === winner?.id && (
                        <span className="text-green-400 text-sm font-medium">Winner</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-600 rounded-full h-3">
                    <motion.div
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${candidate.percentage || 0}%` }}
                      transition={{ duration: 1, delay: 1 + index * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {selectedChart === 'pie' && (
            <div className="text-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {election.candidates.map((candidate, index) => (
                  <div key={candidate.id} className="text-center">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                         style={{
                           background: `conic-gradient(${
                             candidate.id === winner?.id ? '#10b981' :
                             candidate.id === 2 ? '#3b82f6' :
                             '#8b5cf6'
                           } 0deg, ${
                             candidate.id === winner?.id ? '#10b981' :
                             candidate.id === 2 ? '#3b82f6' :
                             '#8b5cf6'
                           } ${((candidate.percentage || 0) / 100) * 360}deg, #334155 ${((candidate.percentage || 0) / 100) * 360}deg, #334155 360deg)`
                         }}>
                      {candidate.percentage || 0}%
                    </div>
                    <h5 className="font-semibold text-white mb-1">{candidate.name}</h5>
                                            <p className="text-slate-400 text-sm">{(candidate.voteCount || 0).toLocaleString()} votes</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedChart === 'line' && (
            <div className="text-center">
              <div className="space-y-4">
                {election.candidates.map((candidate, index) => (
                  <div key={candidate.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-cyan-400">#{index + 1}</span>
                      <div>
                        <h5 className="font-semibold text-white">{candidate.name}</h5>
                        <p className="text-slate-400 text-sm">{(candidate.voteCount || 0).toLocaleString()} votes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                                              <span className="text-cyan-400 font-medium">{(candidate.percentage || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex flex-wrap gap-4 justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200">
            <Download className="w-5 h-5" />
            Export Results (CSV)
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200">
            <Download className="w-5 h-5" />
            Export Report (PDF)
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors duration-200">
            <Share2 className="w-5 h-5" />
            Share Results
          </button>
        </motion.div>

        {/* Statistics */}
        <motion.div 
          className="grid md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <TrendingUp className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-2">Participation Rate</h4>
            <p className="text-3xl font-bold text-cyan-400">
              {((election.totalVotes / 5000) * 100).toFixed(1)}%
            </p>
            <p className="text-slate-400 text-sm">of eligible voters</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-2">Total Candidates</h4>
            <p className="text-3xl font-bold text-blue-400">
              {election.candidates.length}
            </p>
            <p className="text-slate-400 text-sm">participating</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-2">Margin of Victory</h4>
            <p className="text-3xl font-bold text-purple-400">
              {(winner ? (winner.percentage || 0) - Math.max(...election.candidates.filter(c => c.id !== winner.id).map(c => c.percentage || 0)) : 0).toFixed(1)}%
            </p>
            <p className="text-slate-400 text-sm">winning margin</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Results;
