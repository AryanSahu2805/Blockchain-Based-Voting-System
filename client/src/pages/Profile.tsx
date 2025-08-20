import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Vote, 
  Calendar, 
  Settings, 
  Edit, 
  Save, 
  X,
  Shield,
  Award,
  Activity,
  BarChart3,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { account } = useWeb3();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    profileName: '',
    email: '',
    bio: '',
    location: '',
    website: ''
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        profileName: user.profileName || '',
        email: user.email || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateUser({
        profileName: editForm.profileName,
        email: editForm.email,
        profile: {
          bio: editForm.bio,
          location: editForm.location,
          website: editForm.website
        }
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditForm({
        profileName: user.profileName || '',
        email: user.email || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || ''
      });
    }
    setIsEditing(false);
  };

  if (!user || !account) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-slate-300 mb-6">Please connect your wallet to view your profile.</p>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Profile</h1>
            <p className="text-slate-400">Manage your account and view your voting activity</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.profileName}
                    onChange={(e) => setEditForm({ ...editForm, profileName: e.target.value })}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white text-center w-full"
                  />
                ) : (
                  user.profileName || 'Anonymous User'
                )}
              </h2>
              <p className="text-slate-400 font-mono text-sm">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                ) : (
                  <p className="text-white">{user.email || 'No email provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white resize-none"
                  />
                ) : (
                  <p className="text-white">{user.profile?.bio || 'No bio provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                ) : (
                  <p className="text-white">{user.profile?.location || 'No location provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                ) : (
                  <p className="text-white">
                    {user.profile?.website ? (
                      <a href={user.profile.website} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                        {user.profile.website}
                      </a>
                    ) : (
                      'No website provided'
                    )}
                  </p>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats and Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Vote className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {user.stats.electionsVoted}
              </div>
              <div className="text-slate-400">Elections Voted</div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {user.stats.electionsCreated}
              </div>
              <div className="text-slate-400">Elections Created</div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {user.isVerified ? 'Verified' : 'Pending'}
              </div>
              <div className="text-slate-400">Status</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Recent Activity
            </h3>
            
            <div className="space-y-4">
              {[
                { action: 'Voted in Student Government Election', time: '2 hours ago', type: 'vote' },
                { action: 'Created Campus Sustainability Initiative', time: '1 day ago', type: 'create' },
                { action: 'Voted in Technology Club Leadership', time: '3 days ago', type: 'vote' },
                { action: 'Profile updated', time: '1 week ago', type: 'profile' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'vote' ? 'bg-green-400' :
                    activity.type === 'create' ? 'bg-blue-400' :
                    'bg-purple-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-slate-400 text-sm">{activity.time}</p>
                  </div>
                  <div className="text-slate-500">
                    {activity.type === 'vote' ? <Vote className="w-4 h-4" /> :
                     activity.type === 'create' ? <BarChart3 className="w-4 h-4" /> :
                     <User className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voting History */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Voting History
            </h3>
            
            <div className="space-y-3">
              {[
                { election: 'Student Government President 2024', candidate: 'Alice Johnson', date: '2024-03-18', status: 'completed' },
                { election: 'Campus Sustainability Initiative', candidate: 'Support Initiative', date: '2024-03-15', status: 'completed' },
                { election: 'Technology Club Leadership', candidate: 'Team Alpha', date: '2024-03-10', status: 'completed' }
              ].map((vote, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{vote.election}</p>
                    <p className="text-slate-400 text-sm">Voted for: {vote.candidate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">{vote.date}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">{vote.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
