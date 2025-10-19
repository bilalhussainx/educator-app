/**
 * User Progress Widget - Always visible tier/XP/P-Score indicator
 * Appears in top-right corner of the application
 */
import React, { useState, useEffect } from 'react';
import { User } from '@/types/index.ts';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Sparkles, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';

interface UserProgressWidgetProps {
    user: User | null;
}

interface UserStats {
    tier: string;
    tierProgress: number; // Percentage to next tier
    pScore: number;
    xp: number;
    streak: number;
    nextTier: string;
    xpToNextTier: number;
}

const getTierColor = (tier: string): string => {
    switch (tier.toLowerCase()) {
        case 'pathfinder': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
        case 'navigator': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
        case 'visionary': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
        case 'luminary': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
        default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
};

const getTierEmoji = (tier: string): string => {
    switch (tier.toLowerCase()) {
        case 'pathfinder': return '🔷';
        case 'navigator': return '🔶';
        case 'visionary': return '🔴';
        case 'luminary': return '⭐';
        default: return '⚪';
    }
};

export const UserProgressWidget: React.FC<UserProgressWidgetProps> = ({ user }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [stats, setStats] = useState<UserStats>({
        tier: 'Pathfinder',
        tierProgress: 45,
        pScore: 0,
        xp: 2450,
        streak: 12,
        nextTier: 'Navigator',
        xpToNextTier: 300
    });

    useEffect(() => {
        if (user) {
            fetchUserStats();
        }
    }, [user]);

    const fetchUserStats = async () => {
        try {
            // Try to fetch from ecosystem profile
            const response = await apiClient.get('/api/submissions/ecosystem-profile');
            if (response.data.success && response.data.profile) {
                const profile = response.data.profile;
                setStats({
                    tier: profile.spark_level || 'Pathfinder',
                    tierProgress: calculateTierProgress(profile.total_sparks),
                    pScore: profile.p_score || 0,
                    xp: profile.total_sparks || 0,
                    streak: profile.coding_streak_days || 0,
                    nextTier: getNextTier(profile.spark_level),
                    xpToNextTier: calculateXpToNext(profile.total_sparks)
                });
            }
        } catch (error) {
            console.log('Using default stats - ecosystem profile not available');
            // Keep default stats
        }
    };

    const calculateTierProgress = (xp: number): number => {
        // Simple progression: 0-1000 = Pathfinder, 1001-3000 = Navigator, etc.
        const tierThresholds = [0, 1000, 3000, 6000, 10000];
        for (let i = 0; i < tierThresholds.length - 1; i++) {
            if (xp >= tierThresholds[i] && xp < tierThresholds[i + 1]) {
                const progress = ((xp - tierThresholds[i]) / (tierThresholds[i + 1] - tierThresholds[i])) * 100;
                return Math.min(progress, 100);
            }
        }
        return 100; // Max tier
    };

    const calculateXpToNext = (xp: number): number => {
        const tierThresholds = [0, 1000, 3000, 6000, 10000];
        for (let i = 0; i < tierThresholds.length - 1; i++) {
            if (xp >= tierThresholds[i] && xp < tierThresholds[i + 1]) {
                return tierThresholds[i + 1] - xp;
            }
        }
        return 0; // Max tier
    };

    const getNextTier = (currentTier: string): string => {
        const tiers = ['Pathfinder', 'Navigator', 'Visionary', 'Luminary'];
        const currentIndex = tiers.findIndex(t => t.toLowerCase() === currentTier.toLowerCase());
        return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : 'Max Level';
    };

    if (!user) return null;

    return (
        <div className="fixed top-4 right-4 z-50">
            <Card
                className={cn(
                    "bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 text-white transition-all duration-300 cursor-pointer hover:border-cyan-500/50",
                    isExpanded ? "w-80" : "w-auto"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <CardContent className="p-4">
                    {/* Compact View */}
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-cyan-500/30">
                            <AvatarImage src={user.avatar} alt={user.username} />
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">
                                {user.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">
                                    {user.username}
                                </span>
                                <Badge className={cn("text-xs px-2 py-0 border", getTierColor(stats.tier))}>
                                    {getTierEmoji(stats.tier)} {stats.tier}
                                </Badge>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-cyan-400" />
                                    {stats.pScore}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-yellow-400" />
                                    {stats.xp.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                        <div className="mt-4 space-y-4 border-t border-slate-700 pt-4">
                            {/* Tier Progress */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Progress to {stats.nextTier}</span>
                                    <span className="text-cyan-400 font-medium">{Math.round(stats.tierProgress)}%</span>
                                </div>
                                <Progress
                                    value={stats.tierProgress}
                                    className="h-2 bg-slate-800"
                                />
                                <div className="text-xs text-slate-500">
                                    {stats.xpToNextTier.toLocaleString()} XP to next tier
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                        <Zap className="h-3 w-3 text-cyan-400" />
                                        P-Score
                                    </div>
                                    <div className="text-lg font-bold text-cyan-400">{stats.pScore}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                        <Sparkles className="h-3 w-3 text-yellow-400" />
                                        Total XP
                                    </div>
                                    <div className="text-lg font-bold text-yellow-400">{stats.xp.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Streak */}
                            {stats.streak > 0 && (
                                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">🔥</span>
                                            <div>
                                                <div className="text-xs text-slate-400">Current Streak</div>
                                                <div className="text-sm font-bold text-orange-400">{stats.streak} days</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tier Benefits Preview */}
                            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                                <div className="text-xs font-semibold text-slate-300 mb-2">
                                    {stats.nextTier} Unlocks:
                                </div>
                                <div className="space-y-1 text-xs text-slate-400">
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-400">✓</span>
                                        <span>Advanced mentor matching</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-400">✓</span>
                                        <span>Priority in live sessions</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-400">✓</span>
                                        <span>Custom learning paths</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
