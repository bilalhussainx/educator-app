/**
 * =================================================================
 * Tier Progression Page - Career Development Tiers
 * =================================================================
 * Shows user's current tier, progress, unlocks, and paths to advance
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Trophy, Sparkles, Users, BookOpen, Code, Target,
    ChevronRight, Zap, Crown, Star, Award, Lock, CheckCircle
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

// Tier system configuration
const TIERS = [
    {
        name: 'Pathfinder',
        emoji: '🔷',
        color: 'cyan',
        minXP: 0,
        maxXP: 1000,
        benefits: {
            learning: [
                'Access to beginner courses',
                'Basic course enrollment',
                'Community forum access'
            ],
            mentorship: [
                'Browse mentor profiles',
                '1 free session/month',
                'Basic mentor matching'
            ],
            recognition: [
                'Pathfinder badge',
                'Public profile',
                'Activity tracking'
            ]
        }
    },
    {
        name: 'Navigator',
        emoji: '🔶',
        color: 'blue',
        minXP: 1000,
        maxXP: 3000,
        benefits: {
            learning: [
                'Access to intermediate courses',
                'Priority in live sessions',
                'Custom learning path generation'
            ],
            mentorship: [
                'Match with top 20% mentors',
                '2 free sessions/month',
                'Resume review by professionals'
            ],
            recognition: [
                'Navigator badge',
                'Featured in talent pool',
                'Exclusive Discord channel'
            ]
        }
    },
    {
        name: 'Visionary',
        emoji: '🔴',
        color: 'purple',
        minXP: 3000,
        maxXP: 6000,
        benefits: {
            learning: [
                'Access to advanced courses',
                'Private session hosting',
                'Course creation tools'
            ],
            mentorship: [
                'Match with elite mentors',
                '4 free sessions/month',
                'Career coaching sessions'
            ],
            recognition: [
                'Visionary badge',
                'Priority job board access',
                'Exclusive events access'
            ]
        }
    },
    {
        name: 'Luminary',
        emoji: '⭐',
        color: 'yellow',
        minXP: 6000,
        maxXP: 10000,
        benefits: {
            learning: [
                'Unlimited course access',
                'Personalized AI tutor',
                'Early access to new features'
            ],
            mentorship: [
                'Unlimited mentor sessions',
                'Become a verified mentor',
                '1-on-1 with platform founders'
            ],
            recognition: [
                'Luminary badge',
                'Lifetime achievement status',
                'Platform ambassador role'
            ]
        }
    }
];

const XP_EARNING_PATHS = [
    {
        category: 'LeetCode Mastery',
        icon: Code,
        color: 'cyan',
        tasks: [
            { description: 'Solve 10 easy problems', xp: 100 },
            { description: 'Solve 5 medium problems', xp: 150 },
            { description: 'Solve 1 hard problem', xp: 100 },
            { description: 'Complete a pattern guide', xp: 50 },
            { description: 'Maintain 7-day streak', xp: 100 }
        ]
    },
    {
        category: 'Course Completion',
        icon: BookOpen,
        color: 'purple',
        tasks: [
            { description: 'Complete a beginner course', xp: 200 },
            { description: 'Complete an intermediate course', xp: 300 },
            { description: 'Complete an advanced course', xp: 500 },
            { description: 'Score 90%+ on final exam', xp: 150 }
        ]
    },
    {
        category: 'Professional Network',
        icon: Users,
        color: 'pink',
        tasks: [
            { description: 'Complete 1 mentor session', xp: 150 },
            { description: 'Connect with 5 professionals', xp: 50 },
            { description: 'Refer a friend', xp: 100 },
            { description: 'Attend live tutorial', xp: 75 }
        ]
    },
    {
        category: 'Portfolio Building',
        icon: Trophy,
        color: 'orange',
        tasks: [
            { description: 'Create 1 portfolio project', xp: 200 },
            { description: 'Get 5 peer reviews', xp: 100 },
            { description: 'Publish project to GitHub', xp: 50 },
            { description: 'Complete profile (100%)', xp: 50 }
        ]
    }
];

// Reusable Glass Card Component
const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:bg-slate-900/50", className)} {...props} />
);

const TierProgressionPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentXP, setCurrentXP] = useState(450);
    const [currentTier, setCurrentTier] = useState('Pathfinder');

    useEffect(() => {
        fetchUserProgress();
    }, []);

    const fetchUserProgress = async () => {
        try {
            const response = await apiClient.get('/api/submissions/ecosystem-profile');
            if (response.data.success && response.data.profile) {
                setCurrentXP(response.data.profile.total_sparks || 0);
                setCurrentTier(response.data.profile.spark_level || 'Pathfinder');
            }
        } catch (error) {
            console.log('Using default tier data');
        }
    };

    const getCurrentTierIndex = () => {
        return TIERS.findIndex(tier => tier.name.toLowerCase() === currentTier.toLowerCase());
    };

    const getCurrentTierData = () => {
        return TIERS[getCurrentTierIndex()] || TIERS[0];
    };

    const getNextTierData = () => {
        const currentIndex = getCurrentTierIndex();
        return currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1] : null;
    };

    const getTierProgress = () => {
        const tier = getCurrentTierData();
        const progress = ((currentXP - tier.minXP) / (tier.maxXP - tier.minXP)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    const getXPToNextTier = () => {
        const tier = getCurrentTierData();
        return tier.maxXP - currentXP;
    };

    const getTierColor = (tierName: string) => {
        const tier = TIERS.find(t => t.name === tierName);
        return tier?.color || 'slate';
    };

    const currentTierData = getCurrentTierData();
    const nextTierData = getNextTierData();
    const tierProgress = getTierProgress();
    const xpToNext = getXPToNextTier();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 container mx-auto px-6 py-12 space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                        Career Tier Journey
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        Progress through four tiers of professional development and unlock exclusive benefits
                    </p>
                </div>

                {/* Current Tier Status */}
                <GlassCard className="border-cyan-500/50">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-6xl">{currentTierData.emoji}</div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white">{currentTierData.name}</h2>
                                    <p className="text-slate-400">Your Current Tier</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-cyan-400">{currentXP.toLocaleString()}</div>
                                <div className="text-sm text-slate-400">Total XP</div>
                            </div>
                        </div>

                        {nextTierData && (
                            <>
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Progress to {nextTierData.name}</span>
                                        <span className="text-cyan-400 font-medium">{Math.round(tierProgress)}%</span>
                                    </div>
                                    <Progress value={tierProgress} className="h-3 bg-slate-800" />
                                    <div className="text-xs text-slate-500">
                                        {xpToNext.toLocaleString()} XP until {nextTierData.emoji} {nextTierData.name}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
                                    <div className="text-sm font-semibold text-cyan-300 mb-2">Next Milestone: {nextTierData.name}</div>
                                    <div className="text-xs text-slate-300">
                                        Unlock advanced mentorship matching, priority sessions, and custom learning paths
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </GlassCard>

                {/* Tier Timeline */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white text-center">All Career Tiers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TIERS.map((tier, index) => {
                            const isCurrentTier = tier.name === currentTierData.name;
                            const isPastTier = index < getCurrentTierIndex();
                            const isFutureTier = index > getCurrentTierIndex();

                            return (
                                <GlassCard
                                    key={tier.name}
                                    className={cn(
                                        "relative overflow-hidden transition-all duration-300",
                                        isCurrentTier && "border-cyan-500/70 ring-2 ring-cyan-500/30",
                                        isPastTier && "opacity-60",
                                        isFutureTier && "opacity-40"
                                    )}
                                >
                                    {isCurrentTier && (
                                        <div className="absolute top-0 right-0 bg-cyan-500 text-slate-900 px-3 py-1 text-xs font-bold rounded-bl-lg">
                                            CURRENT
                                        </div>
                                    )}
                                    <CardContent className="p-6 text-center">
                                        <div className="text-5xl mb-3">{tier.emoji}</div>
                                        <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                                        <div className="text-sm text-slate-400 mb-4">
                                            {tier.minXP.toLocaleString()} - {tier.maxXP.toLocaleString()} XP
                                        </div>

                                        <div className="space-y-3 text-left">
                                            <div>
                                                <div className="text-xs font-semibold text-cyan-400 mb-1">🎓 Learning</div>
                                                <ul className="text-xs text-slate-300 space-y-1">
                                                    {tier.benefits.learning.slice(0, 2).map((benefit, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            {isPastTier || isCurrentTier ? (
                                                                <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                                                            ) : (
                                                                <Lock className="h-3 w-3 text-slate-500 mt-0.5 flex-shrink-0" />
                                                            )}
                                                            <span className={isFutureTier ? 'text-slate-500' : ''}>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-purple-400 mb-1">🤝 Mentorship</div>
                                                <ul className="text-xs text-slate-300 space-y-1">
                                                    {tier.benefits.mentorship.slice(0, 2).map((benefit, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            {isPastTier || isCurrentTier ? (
                                                                <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                                                            ) : (
                                                                <Lock className="h-3 w-3 text-slate-500 mt-0.5 flex-shrink-0" />
                                                            )}
                                                            <span className={isFutureTier ? 'text-slate-500' : ''}>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </CardContent>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>

                {/* How to Earn XP */}
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">How to Earn XP</h2>
                        <p className="text-slate-400">Multiple paths to advance your career tier</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {XP_EARNING_PATHS.map((path) => (
                            <GlassCard key={path.category}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className={`p-2 bg-${path.color}-500/10 rounded-lg border border-${path.color}-500/30`}>
                                            <path.icon className={`h-5 w-5 text-${path.color}-400`} />
                                        </div>
                                        <span>{path.category}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {path.tasks.map((task, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                <div className="flex items-start gap-2 flex-1">
                                                    <div className={`w-6 h-6 rounded-full border-2 border-${path.color}-500/30 flex items-center justify-center text-xs text-slate-400`}>
                                                        {index + 1}
                                                    </div>
                                                    <span className="text-sm text-slate-300">{task.description}</span>
                                                </div>
                                                <div className="flex items-center gap-1 ml-4">
                                                    <Sparkles className="h-4 w-4 text-yellow-400" />
                                                    <span className="text-sm font-bold text-yellow-400">+{task.xp}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold text-white">Ready to Level Up?</h3>
                    <p className="text-slate-400 max-w-xl mx-auto">
                        Start earning XP today and unlock exclusive benefits across the platform
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-6 py-3"
                            onClick={() => navigate('/leetcode')}
                        >
                            <Code className="mr-2 h-5 w-5" /> Start Practicing
                        </Button>
                        <Button
                            variant="outline"
                            className="border-slate-600 text-white hover:bg-slate-800"
                            onClick={() => navigate('/dashboard')}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierProgressionPage;
