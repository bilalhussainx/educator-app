import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Gift, Users, TrendingUp, Award, Copy, Check,
    Share2, Twitter, Facebook, Linkedin, MessageCircle,
    Trophy, Sparkles, ChevronRight, ExternalLink
} from 'lucide-react';

interface ReferralStats {
    referralCode: string;
    referredBy: string | null;
    stats: {
        totalReferrals: number;
        successfulReferrals: number;
        pendingReferrals: number;
        totalRewardsEarned: number;
        zCreditsEarned: number;
        usdEarned: number;
        lastReferralDate: string | null;
    };
    shareUrl: string;
}

interface ReferralHistoryItem {
    id: string;
    referred_username: string;
    referred_email: string;
    status: string;
    reward_amount: number;
    referrer_rewarded: boolean;
    referred_rewarded: boolean;
    conversion_date: string | null;
    referral_date: string;
}

interface LeaderboardEntry {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    stats: {
        totalReferrals: number;
        successfulReferrals: number;
        totalRewardsEarned: number;
    };
    rank: number;
}

const ReferralDashboard: React.FC = () => {
    const [referralData, setReferralData] = useState<ReferralStats | null>(null);
    const [referralHistory, setReferralHistory] = useState<ReferralHistoryItem[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'leaderboard'>('overview');

    useEffect(() => {
        fetchReferralData();
        fetchReferralHistory();
        fetchLeaderboard();
    }, []);

    const fetchReferralData = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:10000/api/referrals/my-code', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setReferralData(data.data);
            }
        } catch (error) {
            console.error('Error fetching referral data:', error);
        }
    };

    const fetchReferralHistory = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:10000/api/referrals/history?limit=50', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setReferralHistory(data.data.referrals);
            }
        } catch (error) {
            console.error('Error fetching referral history:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:10000/api/referrals/leaderboard?limit=50', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLeaderboard(data.data);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOnSocial = (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp') => {
        const shareText = `Join me on Educators Edge and get 100 Z-Credits! Use my referral code: ${referralData?.referralCode}`;
        const url = referralData?.shareUrl || '';

        const urls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`
        };

        window.open(urls[platform], '_blank', 'width=600,height=400');
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            completed: 'bg-green-500/20 text-green-300 border-green-500/30',
            rewarded: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Gift className="w-10 h-10 text-cyan-400" />
                        <h1 className="text-4xl font-bold text-white">Referral Program</h1>
                    </div>
                    <p className="text-gray-300 text-lg">
                        Earn 100 Z-Credits for every friend you refer! They get 100 Z-Credits too! 🎉
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-6 h-6 text-cyan-400" />
                            <span className="text-gray-300 text-sm">Total Referrals</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {referralData?.stats.totalReferrals || 0}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Check className="w-6 h-6 text-green-400" />
                            <span className="text-gray-300 text-sm">Successful</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {referralData?.stats.successfulReferrals || 0}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-yellow-400" />
                            <span className="text-gray-300 text-sm">Pending</span>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {referralData?.stats.pendingReferrals || 0}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/30"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-6 h-6 text-cyan-400" />
                            <span className="text-gray-300 text-sm">Z-Credits Earned</span>
                        </div>
                        <div className="text-3xl font-bold text-cyan-400">
                            {referralData?.stats.zCreditsEarned || 0}
                        </div>
                    </motion.div>
                </div>

                {/* Referral Code Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/20 mb-8"
                >
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Your Referral Code</h2>
                        <p className="text-gray-300">Share this code with friends to earn rewards</p>
                    </div>

                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="bg-black/30 rounded-xl px-8 py-4 border-2 border-cyan-400/50">
                            <span className="text-3xl font-mono font-bold text-cyan-400">
                                {referralData?.referralCode}
                            </span>
                        </div>
                        <button
                            onClick={() => copyToClipboard(referralData?.referralCode || '')}
                            className="p-4 bg-cyan-500 hover:bg-cyan-600 rounded-xl transition-colors"
                        >
                            {copied ? <Check className="w-6 h-6 text-white" /> : <Copy className="w-6 h-6 text-white" />}
                        </button>
                    </div>

                    {/* Share URL */}
                    <div className="mb-6">
                        <label className="text-gray-300 text-sm mb-2 block">Referral Link</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={referralData?.shareUrl || ''}
                                className="flex-1 bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white font-mono text-sm"
                            />
                            <button
                                onClick={() => copyToClipboard(referralData?.shareUrl || '')}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-colors"
                            >
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>

                    {/* Social Share Buttons */}
                    <div>
                        <label className="text-gray-300 text-sm mb-3 block">Share on Social Media</label>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                            <button
                                onClick={() => shareOnSocial('twitter')}
                                className="flex items-center gap-2 px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] rounded-xl text-white transition-colors"
                            >
                                <Twitter className="w-5 h-5" />
                                Twitter
                            </button>
                            <button
                                onClick={() => shareOnSocial('facebook')}
                                className="flex items-center gap-2 px-6 py-3 bg-[#4267B2] hover:bg-[#365899] rounded-xl text-white transition-colors"
                            >
                                <Facebook className="w-5 h-5" />
                                Facebook
                            </button>
                            <button
                                onClick={() => shareOnSocial('linkedin')}
                                className="flex items-center gap-2 px-6 py-3 bg-[#0077B5] hover:bg-[#006399] rounded-xl text-white transition-colors"
                            >
                                <Linkedin className="w-5 h-5" />
                                LinkedIn
                            </button>
                            <button
                                onClick={() => shareOnSocial('whatsapp')}
                                className="flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1fb855] rounded-xl text-white transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/20">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-3 font-medium transition-colors relative ${
                            activeTab === 'overview'
                                ? 'text-cyan-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Overview
                        {activeTab === 'overview' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-3 font-medium transition-colors relative ${
                            activeTab === 'history'
                                ? 'text-cyan-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        My Referrals
                        {activeTab === 'history' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`px-6 py-3 font-medium transition-colors relative ${
                            activeTab === 'leaderboard'
                                ? 'text-cyan-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Leaderboard
                        {activeTab === 'leaderboard' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                            />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
                    >
                        <h3 className="text-2xl font-bold text-white mb-6">How It Works</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Share2 className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h4 className="text-white font-semibold mb-2">1. Share Your Code</h4>
                                <p className="text-gray-300 text-sm">
                                    Share your unique referral code with friends via social media or direct link
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-purple-400" />
                                </div>
                                <h4 className="text-white font-semibold mb-2">2. They Sign Up</h4>
                                <p className="text-gray-300 text-sm">
                                    Your friend creates an account using your referral code and completes their profile
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Gift className="w-8 h-8 text-green-400" />
                                </div>
                                <h4 className="text-white font-semibold mb-2">3. Both Get Rewards</h4>
                                <p className="text-gray-300 text-sm">
                                    You both receive 100 Z-Credits instantly - no limits on how much you can earn!
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
                    >
                        {referralHistory.length === 0 ? (
                            <div className="p-12 text-center">
                                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Referrals Yet</h3>
                                <p className="text-gray-400">Start sharing your referral code to see your referrals here!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-black/30">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Reward</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {referralHistory.map((referral) => (
                                            <tr key={referral.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-white font-medium">{referral.referred_username}</div>
                                                    <div className="text-gray-400 text-sm">{referral.referred_email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(referral.status)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {referral.referrer_rewarded ? (
                                                        <span className="text-green-400 font-semibold">
                                                            +{referral.reward_amount} Z-Credits
                                                        </span>
                                                    ) : (
                                                        <span className="text-yellow-400">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-300">
                                                    {new Date(referral.referral_date).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'leaderboard' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
                    >
                        <div className="p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-white/20">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-yellow-400" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">Top Referrers</h3>
                                    <p className="text-gray-300 text-sm">See who's leading the referral race!</p>
                                </div>
                            </div>
                        </div>

                        {leaderboard.length === 0 ? (
                            <div className="p-12 text-center">
                                <Award className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">Leaderboard Empty</h3>
                                <p className="text-gray-400">Be the first to start referring!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/10">
                                {leaderboard.map((entry) => (
                                    <div
                                        key={entry.userId}
                                        className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                                entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                                entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                                                entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-white/10 text-white'
                                            }`}>
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <div className="text-white font-semibold">{entry.displayName}</div>
                                                <div className="text-gray-400 text-sm">@{entry.username}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white font-semibold text-lg">
                                                {entry.stats.successfulReferrals} referrals
                                            </div>
                                            <div className="text-cyan-400 text-sm">
                                                {entry.stats.totalRewardsEarned} Z-Credits
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ReferralDashboard;
