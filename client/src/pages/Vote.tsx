import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  VoteIcon, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Shield,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Sparkles,
  BarChart3,
  Calendar,
  UserCheck
} from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import apiService from '../services/apiService';
import realtimeService from '../services/realtimeService';

import { Election, Candidate } from '../services/apiService';

const VotePage: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { account, provider, signer, isCorrectNetwork } = useWeb3();
  
  const [election, setElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Real-time data fetching
  useEffect(() => {
    const fetchElection = async () => {
      if (!electionId) return;
      
      try {
        setLoading(true);
        
        // Fetch election data from API
        const fetchedElection = await apiService.getElection(electionId);
        if (fetchedElection) {
          setElection(fetchedElection);
          
          // Check if user has already voted
          if (account) {
            try {
              const userVote = await apiService.getUserVote(electionId, account);
              setUserHasVoted(!!userVote);
              setUserVote(userVote);
            } catch (error) {
              console.error('Failed to check user vote status:', error);
              setUserHasVoted(false);
            }
          }
        } else {
          toast.error('Election not found');
          navigate('/elections');
        }
      } catch (error) {
        console.error('Error fetching election:', error);
        toast.error('Failed to fetch election details');
      } finally {
        setLoading(false);
      }
    };

    fetchElection();

    // Subscribe to real-time election updates
    if (electionId) {
      const subscription = realtimeService.subscribeToElection(electionId, (update) => {
        if (update.action === 'update') {
          // Refresh election data when updated
          fetchElection();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [electionId, account, navigate]);

  // Update time remaining
  useEffect(() => {
    if (!election) return;

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(election.endDate).getTime();
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeRemaining('Voting ended');
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [election]);

  const handleCandidateSelect = (candidateId: number) => {
    setSelectedCandidate(candidateId);
  };

  const handleVote = async () => {
    if (!selectedCandidate || !election || !signer) return;

    try {
      setVoting(true);
      
      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock transaction hash
      const transactionHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      // Update local state
      setUserHasVoted(true);
      setUserVote({
        candidateId: selectedCandidate,
        candidateName: election.candidates.find(c => c.id === selectedCandidate)?.name,
        transactionHash,
        timestamp: new Date().toISOString()
      });
      
      // Update election vote count
      setElection(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalVotes: prev.totalVotes + 1,
          candidates: prev.candidates.map(c => 
            c.id === selectedCandidate 
              ? { ...c, voteCount: (c.voteCount || 0) + 1 }
              : c
          )
        };
      });
      
      setShowConfirmation(true);
      toast.success('Vote cast successfully!');
      
      // Redirect to results after 3 seconds
      setTimeout(() => {
        navigate(`/results/${election.id}`);
      }, 3000);
      
    } catch (error) {
      console.error('Error casting vote:', error);
      toast.error('Failed to cast vote. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  const getProgressPercentage = () => {
    if (!election) return 0;
    const now = new Date().getTime();
    const start = new Date(election.startDate).getTime();
    const end = new Date(election.endDate).getTime();
    return Math.min(((now - start) / (end - start)) * 100, 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <LoadingSpinner size="large" />
          <p className="text-slate-300 mt-4">Loading election details...</p>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Election Not Found</h2>
          <p className="text-slate-300 mb-6">The election you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/elections')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  if (election.status === 'ended') {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Voting Has Ended</h2>
          <p className="text-slate-300 mb-6">This election has concluded. View the results to see the outcome.</p>
          <button
            onClick={() => navigate(`/results/${election.id}`)}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  if (election.status === 'upcoming') {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Voting Hasn't Started Yet</h2>
          <p className="text-slate-300 mb-6">This election will begin on {new Date(election.startDate).toLocaleDateString()}.</p>
          <button
            onClick={() => navigate('/elections')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  if (userHasVoted) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">You've Already Voted!</h2>
          <p className="text-slate-300 mb-4">
            You voted for <span className="font-semibold text-cyan-400">{userVote?.candidateName}</span>
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Transaction: {userVote?.transactionHash.slice(0, 10)}...{userVote?.transactionHash.slice(-8)}
          </p>
          <button
            onClick={() => navigate(`/results/${election.id}`)}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Connection Required</h2>
          <p className="text-slate-300 mb-6">You need to connect your Web3 wallet to participate in this election.</p>
          <button
            onClick={() => navigate('/elections')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Wrong Network</h2>
          <p className="text-slate-300 mb-6">Please switch to the correct network to participate in this election.</p>
          <button
            onClick={() => navigate('/elections')}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/elections')}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Cast Your Vote
            </h1>
            <p className="text-slate-400">Make your voice heard in this important decision</p>
          </div>
        </div>

        {/* Election Info Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full text-sm font-medium">
                  <VoteIcon className="w-4 h-4 inline mr-2" />
                  Active
                </span>
                {election.metadata?.category && (
                  <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
                    {election.metadata.category}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{election.title}</h2>
              <p className="text-slate-300 mb-4">{election.description}</p>
            </div>
            <Sparkles className="w-8 h-8 text-cyan-400" />
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span>Voting Progress</span>
              <span>{timeRemaining}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getProgressPercentage()}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{election.totalVotes.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{election.candidates.length}</div>
              <div className="text-slate-400 text-sm">Candidates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Math.round((election.totalVotes / 5000) * 100)}%
              </div>
              <div className="text-slate-400 text-sm">Participation</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Candidates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        <h3 className="text-2xl font-bold text-white mb-6">Select Your Candidate</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {election.candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`relative cursor-pointer transition-all duration-300 ${
                selectedCandidate === candidate.id 
                  ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' 
                  : 'hover:ring-2 hover:ring-slate-600 hover:ring-offset-2 hover:ring-offset-slate-900'
              }`}
              onClick={() => handleCandidateSelect(candidate.id)}
            >
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 h-full">
                {/* Candidate Image */}
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 p-1">
                  {candidate.imageUrl ? (
                    <img 
                      src={candidate.imageUrl} 
                      alt={candidate.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center">
                      <UserCheck className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="text-center mb-4">
                  <h4 className="text-xl font-bold text-white mb-2">{candidate.name}</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{candidate.description}</p>
                </div>

                {/* Vote Count */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {(candidate.voteCount || 0).toLocaleString()}
                  </div>
                  <div className="text-slate-400 text-sm">Current Votes</div>
                </div>

                {/* Selection Indicator */}
                {selectedCandidate === candidate.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Voting Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center"
      >
        {selectedCandidate ? (
          <div className="space-y-4">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 max-w-md mx-auto">
              <p className="text-cyan-400 font-medium">
                You've selected: <span className="text-white font-bold">
                  {election.candidates.find(c => c.id === selectedCandidate)?.name}
                </span>
              </p>
            </div>
            
            <button
              onClick={handleVote}
              disabled={voting}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg rounded-xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {voting ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Vote...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <VoteIcon className="w-5 h-5" />
                  Cast Your Vote
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 max-w-md mx-auto">
            <VoteIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">Select a Candidate</h4>
            <p className="text-slate-400">Click on a candidate above to make your selection</p>
          </div>
        )}
      </motion.div>

      {/* Blockchain Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-12 bg-slate-900/30 border border-slate-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Blockchain Security</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-2">Smart Contract Address</h4>
            <div className="flex items-center gap-2">
              <code className="bg-slate-800 px-3 py-2 rounded text-cyan-400 text-sm font-mono">
                {election.contractAddress?.slice(0, 10)}...{election.contractAddress?.slice(-8)}
              </code>
              <button className="p-2 hover:bg-slate-800/50 rounded transition-colors duration-200">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-2">Voting Period</h4>
            <div className="space-y-1 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Start: {new Date(election.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>End: {new Date(election.endDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-cyan-300 text-sm">
            <Shield className="w-4 h-4 inline mr-2" />
            Your vote will be recorded on the blockchain, making it transparent, secure, and immutable. 
            Each vote is cryptographically verified and cannot be altered once submitted.
          </p>
        </div>
      </motion.div>

      {/* Vote Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4">Vote Cast Successfully!</h3>
              
              <p className="text-slate-300 mb-6">
                Your vote for <span className="font-semibold text-cyan-400">
                  {userVote?.candidateName}
                </span> has been recorded on the blockchain.
              </p>
              
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
                <div className="text-sm text-slate-400 mb-1">Transaction Hash:</div>
                <code className="text-cyan-400 text-xs break-all">
                  {userVote?.transactionHash}
                </code>
              </div>
              
              <p className="text-slate-400 text-sm mb-6">
                Redirecting to results page in a few seconds...
              </p>
              
              <button
                onClick={() => navigate(`/results/${election.id}`)}
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                View Results Now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VotePage;
