import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign, TrendingUp, Calendar, Award, Lightbulb,
    ArrowUp, ArrowDown, Clock, Users, Target, Sparkles
} from 'lucide-react';

interface EarningsData {
    today: { earnings: number; sessions: number };
    week: { earnings: number; sessions: number };
    month: { earnings: number; sessions: number };
    lifetime: { earnings: number; sessions: number };
    rates: { hourlyUSD: number; hourlyZCredits: number };
    projections: {
        monthlyEarnings: number;
        avgSessionsPerWeek: number;
        avgEarningsPerSession: number;
    };
}

interface Suggestion {
    type: string;
    priority: string;
    title: string;
    description: string;
    action: string;
    potentialEarnings: number;
}

interface RankingData {
    rank: number | null;
    totalTeachers: number;
    percentile: number;
    myEarnings: number;
    message: string;
}

const TeacherEarningsDashboard: React.FC = () => {
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [ranking, setRanking] = useState<RankingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [earningsRes, suggestionsRes, rankingRes] = await Promise.all([
                fetch('http://localhost:10000/api/earnings/overview', { headers }),
                fetch('http://localhost:10000/api/earnings/suggestions', { headers }),
                fetch('http://localhost:10000/api/earnings/ranking', { headers })
            ]);

            if (earningsRes.ok) {
                const data = await earningsRes.json();
                setEarnings(data.data);
            }

            if (suggestionsRes.ok) {
                const data = await suggestionsRes.json();
                setSuggestions(data.data.suggestions);
            }

            if (rankingRes.ok) {
                const data = await rankingRes.json();
                setRanking(data.data);
            }
        } catch (error) {
            console.error('Error fetching earnings data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'border-red-500/30 bg-red-500/10';
            case 'medium': return 'border-yellow-500/30 bg-yellow-500/10';
            default: return 'border-blue-500/30 bg-blue-500/10';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading earnings data...</div>
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
                        <DollarSign className="w-10 h-10 text-green-400" />
                        <h1 className="text-4xl font-bold text-white">Earnings Dashboard</h1>
                    </div>
                    <p className="text-gray-300 text-lg">
                        Track your income, sessions, and growth opportunities
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Today */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-6 h-6 text-cyan-400" />
                            <span className="text-gray-300 text-sm">Today</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(earnings?.today.earnings || 0)}
                        </div>
                        <div className="text-sm text-gray-400">
                            {earnings?.today.sessions || 0} sessions
                        </div>
                    </motion.div>

                    {/* This Week */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                            <span className="text-gray-300 text-sm">This Week</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(earnings?.week.earnings || 0)}
                        </div>
                        <div className="text-sm text-gray-400">
                            {earnings?.week.sessions || 0} sessions
                        </div>
                    </motion.div>

                    {/* This Month */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-6 h-6 text-green-400" />
                            <span className="text-gray-300 text-sm">This Month</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(earnings?.month.earnings || 0)}
                        </div>
                        <div className="text-sm text-gray-400">
                            {earnings?.month.sessions || 0} sessions
                        </div>
                    </motion.div>

                    {/* Lifetime */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-green-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-6 border border-green-400/30"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-6 h-6 text-green-400" />
                            <span className="text-gray-300 text-sm">Lifetime</span>
                        </div>
                        <div className="text-3xl font-bold text-green-400 mb-1">
                            {formatCurrency(earnings?.lifetime.earnings || 0)}
                        </div>
                        <div className="text-sm text-gray-400">
                            {earnings?.lifetime.sessions || 0} total sessions
                        </div>
                    </motion.div>
                </div>

                {/* Projections & Ranking Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Projections */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Target className="w-6 h-6 text-cyan-400" />
                            Monthly Projections
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-400 mb-1">Projected Monthly Earnings</div>
                                <div className="text-2xl font-bold text-cyan-400">
                                    {formatCurrency(earnings?.projections.monthlyEarnings || 0)}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-400 mb-1">Avg Sessions/Week</div>
                                    <div className="text-xl font-semibold text-white">
                                        {earnings?.projections.avgSessionsPerWeek.toFixed(1) || 0}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400 mb-1">Avg Earnings/Session</div>
                                    <div className="text-xl font-semibold text-white">
                                        {formatCurrency(earnings?.projections.avgEarningsPerSession || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Ranking */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-6 border border-yellow-400/30"
                    >
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Award className="w-6 h-6 text-yellow-400" />
                            Your Ranking
                        </h3>
                        {ranking?.rank ? (
                            <div className="space-y-4">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-yellow-400">#{ranking.rank}</span>
                                    <span className="text-gray-300">out of {ranking.totalTeachers}</span>
                                </div>
                                <div className="text-lg text-white">
                                    {ranking.message}
                                </div>
                                <div className="flex items-center gap-2 text-gray-300">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                    <span>Top {100 - ranking.percentile}% of teachers</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-gray-300 mb-2">Complete your first session to see your ranking!</p>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Optimization Suggestions */}
                {suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
                    >
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Lightbulb className="w-7 h-7 text-yellow-400" />
                            Optimization Tips
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {suggestions.map((suggestion, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.8 + index * 0.1 }}
                                    className={`p-5 rounded-xl border ${getPriorityColor(suggestion.priority)}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="font-semibold text-white text-lg">{suggestion.title}</h4>
                                        {suggestion.potentialEarnings > 0 && (
                                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                                                +{formatCurrency(suggestion.potentialEarnings)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-300 text-sm mb-3">{suggestion.description}</p>
                                    <div className="flex items-center gap-2 text-cyan-400 text-sm">
                                        <ArrowUp className="w-4 h-4" />
                                        <span>{suggestion.action}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            <span className="text-gray-300">Hourly Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {formatCurrency(earnings?.rates.hourlyUSD || 0)}/hr
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-5 h-5 text-cyan-400" />
                            <span className="text-gray-300">Z-Credits Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {earnings?.rates.hourlyZCredits || 0} credits/hr
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-green-400" />
                            <span className="text-gray-300">Active This Month</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {earnings?.month.sessions || 0} sessions
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TeacherEarningsDashboard;
