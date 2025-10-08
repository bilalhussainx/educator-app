import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    Trophy, Sparkles, TrendingUp, Target, Award, Calendar, Users, Code,
    BarChart3, Zap, Star, Crown, Flame, BookOpen, ArrowRight, ChevronRight,
    Activity, Clock, CheckCircle, Medal, LineChart, PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

// Types for ecosystem data
interface EcosystemProfile {
    user_id: string;
    p_score: number;
    total_sparks: number;
    sparks_this_month: number;
    spark_level: string;
    total_problems_solved: number;
    coding_streak_days: number;
    longest_coding_streak: number;
    favorite_programming_language: string;
    sessions_completed: number;
    teacher_rating: number;
    overall_ecosystem_score: number;
    trading_level: string;
    win_rate: number;
    successful_trades: number;
    total_trades: number;
}

interface RecentActivity {
    id: string;
    type: 'submission' | 'achievement' | 'session' | 'trade';
    title: string;
    description: string;
    timestamp: string;
    sparks_earned?: number;
    icon?: string;
}

interface Achievement {
    id: string;
    type: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    sparks_reward: number;
    unlocked_at: string;
}

interface LeaderboardEntry {
    user_id: string;
    username: string;
    position: number;
    score: number;
    category: string;
}

// Reusable Glass Card Component
const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:bg-slate-900/50", className)} {...props} />
);

// Progress Ring Component
const ProgressRing: React.FC<{ progress: number; size?: number; strokeWidth?: number; children?: React.ReactNode }> = ({
    progress, size = 120, strokeWidth = 8, children
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-slate-700"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="text-cyan-400 transition-all duration-300"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

// Level Badge Component
const LevelBadge: React.FC<{ level: string; type: 'spark' | 'trading' }> = ({ level, type }) => {
    const getColors = (lvl: string, t: 'spark' | 'trading') => {
        if (t === 'spark') {
            switch (lvl) {
                case 'Novice': return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
                case 'Rising': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
                case 'Bright': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
                case 'Brilliant': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
                case 'Luminous': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
                case 'Radiant': return 'bg-pink-500/20 text-pink-300 border-pink-500/50 animate-pulse';
                default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
            }
        } else {
            switch (lvl) {
                case 'Beginner': return 'bg-green-500/20 text-green-300 border-green-500/50';
                case 'Intermediate': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
                case 'Advanced': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
                case 'Expert': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
                case 'Master': return 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse';
                default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
            }
        }
    };

    return (
        <Badge className={cn("border font-medium", getColors(level, type))}>
            {level}
        </Badge>
    );
};

// Achievement Card Component
const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'border-gray-500/50';
            case 'uncommon': return 'border-green-500/50';
            case 'rare': return 'border-blue-500/50';
            case 'epic': return 'border-purple-500/50';
            case 'legendary': return 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10';
            default: return 'border-gray-500/50';
        }
    };

    return (
        <GlassCard className={cn("hover:scale-105 transition-transform", getRarityColor(achievement.rarity))}>
            <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
                <p className="text-xs text-slate-400 mb-2">{achievement.description}</p>
                <div className="flex items-center justify-between text-xs">
                    <Badge className={cn("text-xs", getRarityColor(achievement.rarity).replace('border-', 'bg-').replace('/50', '/20'))}>
                        {achievement.rarity}
                    </Badge>
                    <div className="flex items-center text-yellow-400">
                        <Sparkles className="h-3 w-3 mr-1" />
                        +{achievement.sparks_reward}
                    </div>
                </div>
            </CardContent>
        </GlassCard>
    );
};

export const EcosystemDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<EcosystemProfile | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [leaderboards, setLeaderboards] = useState<{ [key: string]: LeaderboardEntry[] }>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchEcosystemData();
    }, []);

    const fetchEcosystemData = async () => {
        try {
            const [profileRes, dashboardRes, achievementsRes, leaderboardRes] = await Promise.all([
                apiClient.get('/api/submissions/ecosystem-profile'),
                apiClient.get('/api/submissions/dashboard'),
                apiClient.get('/api/submissions/achievements'),
                apiClient.get('/api/submissions/leaderboards')
            ]);

            if (profileRes.data.success) setProfile(profileRes.data.profile);
            if (dashboardRes.data.success) setRecentActivity(dashboardRes.data.recent_activity || []);
            if (achievementsRes.data.success) setAchievements(achievementsRes.data.achievements || []);
            if (leaderboardRes.data.success) setLeaderboards(leaderboardRes.data.leaderboards || {});
        } catch (error) {
            console.error('Error fetching ecosystem data:', error);
            toast.error('Failed to load ecosystem dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <div className="text-white text-xl">Loading your ecosystem...</div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center text-white">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <h2 className="text-2xl font-bold mb-2">Welcome to the Ecosystem!</h2>
                    <p className="text-slate-400 mb-4">Start solving problems to build your profile.</p>
                    <Button onClick={() => navigate('/courses/discover')} className="bg-cyan-500 hover:bg-cyan-600">
                        Discover Courses
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Activity className="h-8 w-8 text-cyan-400" />
                            Ecosystem Dashboard
                        </h1>
                        <p className="text-slate-400 mt-1">Your comprehensive progress and achievements</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/solved-problems')}
                            className="border-slate-600"
                        >
                            <Trophy className="h-4 w-4 mr-2" />
                            View Solved Problems
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-800 border-slate-700">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-600">Overview</TabsTrigger>
                        <TabsTrigger value="achievements" className="data-[state=active]:bg-cyan-600">Achievements</TabsTrigger>
                        <TabsTrigger value="leaderboards" className="data-[state=active]:bg-cyan-600">Leaderboards</TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-600">Analytics</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Core Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Overall Score */}
                            <GlassCard className="col-span-full lg:col-span-2">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                <Crown className="h-5 w-5 text-yellow-400" />
                                                Ecosystem Score
                                            </h3>
                                            <div className="text-3xl font-bold text-cyan-400">
                                                {profile.overall_ecosystem_score.toLocaleString()}
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                Ranking across all activities
                                            </p>
                                        </div>
                                        <ProgressRing progress={Math.min((profile.overall_ecosystem_score / 1000) * 100, 100)}>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-cyan-400">
                                                    {Math.round((profile.overall_ecosystem_score / 1000) * 100)}%
                                                </div>
                                                <div className="text-xs text-slate-400">to max</div>
                                            </div>
                                        </ProgressRing>
                                    </div>
                                </CardContent>
                            </GlassCard>

                            {/* Sparks */}
                            <GlassCard>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-slate-400">Total Sparks</p>
                                            <p className="text-2xl font-bold text-yellow-400">{profile.total_sparks.toLocaleString()}</p>
                                        </div>
                                        <Sparkles className="h-8 w-8 text-yellow-400" />
                                    </div>
                                    <div className="mt-4">
                                        <LevelBadge level={profile.spark_level} type="spark" />
                                    </div>
                                </CardContent>
                            </GlassCard>

                            {/* P-Score */}
                            <GlassCard>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-slate-400">P-Score</p>
                                            <p className="text-2xl font-bold text-cyan-400">{profile.p_score.toFixed(2)}</p>
                                        </div>
                                        <TrendingUp className="h-8 w-8 text-cyan-400" />
                                    </div>
                                    <div className="mt-4">
                                        <LevelBadge level={profile.trading_level} type="trading" />
                                    </div>
                                </CardContent>
                            </GlassCard>
                        </div>

                        {/* Activity Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Coding Stats */}
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Code className="h-5 w-5 text-green-400" />
                                        Coding Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Problems Solved</span>
                                        <span className="font-semibold text-green-400">{profile.total_problems_solved}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Current Streak</span>
                                        <span className="font-semibold text-orange-400 flex items-center gap-1">
                                            <Flame className="h-4 w-4" />
                                            {profile.coding_streak_days} days
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Best Streak</span>
                                        <span className="font-semibold text-yellow-400">{profile.longest_coding_streak} days</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Favorite Language</span>
                                        <Badge className="bg-blue-500/20 text-blue-300">
                                            {profile.favorite_programming_language || 'None'}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </GlassCard>

                            {/* Trading Stats */}
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <BarChart3 className="h-5 w-5 text-cyan-400" />
                                        Trading Performance
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Win Rate</span>
                                        <span className="font-semibold text-green-400">{profile.win_rate.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Successful Trades</span>
                                        <span className="font-semibold text-cyan-400">{profile.successful_trades}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Total Trades</span>
                                        <span className="font-semibold text-slate-300">{profile.total_trades}</span>
                                    </div>
                                    <div className="pt-2">
                                        <Progress value={profile.win_rate} className="h-2" />
                                    </div>
                                </CardContent>
                            </GlassCard>

                            {/* Session Stats */}
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Users className="h-5 w-5 text-purple-400" />
                                        Learning Sessions
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-400">Sessions Completed</span>
                                        <span className="font-semibold text-purple-400">{profile.sessions_completed}</span>
                                    </div>
                                    {profile.teacher_rating > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Teacher Rating</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                                <span className="font-semibold text-yellow-400">{profile.teacher_rating.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </GlassCard>
                        </div>

                        {/* Recent Activity */}
                        {recentActivity.length > 0 && (
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-slate-400" />
                                        Recent Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentActivity.slice(0, 5).map((activity, index) => (
                                            <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                                                <div className="flex-shrink-0 p-2 bg-slate-700 rounded-lg">
                                                    {activity.type === 'submission' && <CheckCircle className="h-4 w-4 text-green-400" />}
                                                    {activity.type === 'achievement' && <Award className="h-4 w-4 text-yellow-400" />}
                                                    {activity.type === 'session' && <Users className="h-4 w-4 text-purple-400" />}
                                                    {activity.type === 'trade' && <TrendingUp className="h-4 w-4 text-cyan-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-white truncate">{activity.title}</h4>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(activity.timestamp).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">{activity.description}</p>
                                                    {activity.sparks_earned && (
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <Sparkles className="h-3 w-3 text-yellow-400" />
                                                            <span className="text-xs text-yellow-400">+{activity.sparks_earned} sparks</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </GlassCard>
                        )}
                    </TabsContent>

                    {/* Achievements Tab */}
                    <TabsContent value="achievements" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Your Achievements</h2>
                                <p className="text-slate-400">Unlock achievements by completing challenges across the platform</p>
                            </div>
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                                {achievements.length} Unlocked
                            </Badge>
                        </div>

                        {achievements.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {achievements.map(achievement => (
                                    <AchievementCard key={achievement.id} achievement={achievement} />
                                ))}
                            </div>
                        ) : (
                            <GlassCard>
                                <CardContent className="p-8 text-center">
                                    <Medal className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                    <div className="text-slate-400 text-lg">No achievements yet</div>
                                    <div className="text-slate-500 text-sm mt-2">
                                        Start solving problems and completing activities to unlock achievements!
                                    </div>
                                </CardContent>
                            </GlassCard>
                        )}
                    </TabsContent>

                    {/* Leaderboards Tab */}
                    <TabsContent value="leaderboards" className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Global Rankings</h2>
                            <p className="text-slate-400">See how you rank against other users across different categories</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(leaderboards).map(([category, entries]) => (
                                <GlassCard key={category}>
                                    <CardHeader>
                                        <CardTitle className="capitalize flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-yellow-400" />
                                            {category.replace('_', ' ')} Leaderboard
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {entries.slice(0, 10).map((entry, index) => (
                                                <div key={entry.user_id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                            index === 0 ? "bg-yellow-500 text-black" :
                                                            index === 1 ? "bg-gray-400 text-black" :
                                                            index === 2 ? "bg-orange-600 text-white" :
                                                            "bg-slate-600 text-white"
                                                        )}>
                                                            {entry.position}
                                                        </div>
                                                        <span className="text-white font-medium">{entry.username}</span>
                                                    </div>
                                                    <span className="text-slate-400">{entry.score.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </GlassCard>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Performance Analytics</h2>
                            <p className="text-slate-400">Deep insights into your learning and trading patterns</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <LineChart className="h-5 w-5 text-cyan-400" />
                                        Progress Trends
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center py-8">
                                    <PieChart className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400">Detailed analytics coming soon...</p>
                                    <p className="text-slate-500 text-sm">We're working on advanced charts and insights</p>
                                </CardContent>
                            </GlassCard>

                            <GlassCard>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5 text-purple-400" />
                                        Goals & Targets
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Daily Coding Streak</span>
                                            <span className="text-white">{profile.coding_streak_days}/30 days</span>
                                        </div>
                                        <Progress value={(profile.coding_streak_days / 30) * 100} className="h-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Problems This Month</span>
                                            <span className="text-white">{Math.min(profile.total_problems_solved, 50)}/50</span>
                                        </div>
                                        <Progress value={(Math.min(profile.total_problems_solved, 50) / 50) * 100} className="h-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Ecosystem Score</span>
                                            <span className="text-white">{profile.overall_ecosystem_score}/1000</span>
                                        </div>
                                        <Progress value={(profile.overall_ecosystem_score / 1000) * 100} className="h-2" />
                                    </div>
                                </CardContent>
                            </GlassCard>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default EcosystemDashboard;