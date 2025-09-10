// src/components/dashboard/FourPillarsWidget.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    GraduationCap, 
    Users, 
    Heart, 
    BarChart3, 
    TrendingUp, 
    Award,
    Zap
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'sonner';

// Types
interface FourPillarsData {
    userId: string;
    currentTier: 'pathfinder' | 'explorer' | 'navigator';
    ascendiaScore: number;
    pillars: {
        academic: number;
        community: number;
        mentorship: number;
        analytical: number;
    };
    recentActivities: Array<{
        type: string;
        pillar: string;
        points: number;
        timestamp: string;
    }>;
    tierProgress: {
        current: number;
        nextTierThreshold: number;
        progressPercentage: number;
    };
}

// Pillar configuration
const PILLAR_CONFIG = {
    academic: {
        icon: GraduationCap,
        label: 'Academic Excellence',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        description: 'Knowledge mastery and teaching expertise'
    },
    community: {
        icon: Users,
        label: 'Community Impact',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        description: 'Building connections and fostering collaboration'
    },
    mentorship: {
        icon: Heart,
        label: 'Mentorship Quality',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
        description: 'Guiding and supporting student growth'
    },
    analytical: {
        icon: BarChart3,
        label: 'Analytical Thinking',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        description: 'Problem-solving and strategic insights'
    }
} as const;

const TIER_CONFIG = {
    pathfinder: { 
        label: 'Pathfinder', 
        color: 'text-amber-400', 
        bgColor: 'bg-amber-500/10',
        threshold: 1000
    },
    explorer: { 
        label: 'Explorer', 
        color: 'text-emerald-400', 
        bgColor: 'bg-emerald-500/10',
        threshold: 2500
    },
    navigator: { 
        label: 'Navigator', 
        color: 'text-cyan-400', 
        bgColor: 'bg-cyan-500/10',
        threshold: 5000
    }
} as const;

// Component Props
interface FourPillarsWidgetProps {
    userId: string;
    className?: string;
}

// Progress Bar Component
const PillarProgressBar: React.FC<{ value: number; maxValue: number; color: string }> = ({ 
    value, 
    maxValue, 
    color 
}) => (
    <div className="w-full bg-slate-800 rounded-full h-2">
        <div 
            className={cn("h-2 rounded-full transition-all duration-500", color)}
            style={{ width: `${Math.min((value / maxValue) * 100, 100)}%` }}
        />
    </div>
);

// Main Component
export const FourPillarsWidget: React.FC<FourPillarsWidgetProps> = ({ 
    userId, 
    className 
}) => {
    const [data, setData] = useState<FourPillarsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFourPillarsData();
    }, [userId]);

    const fetchFourPillarsData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await apiClient.get(`/api/ascendia/user/${userId}/scoring-profile`);
            
            if (response.data.success) {
                setData(response.data.profile);
            } else {
                throw new Error(response.data.message || 'Failed to fetch Four Pillars data');
            }
        } catch (err: any) {
            console.error('Four Pillars data fetch error:', err);
            setError(err.message || 'Failed to load Four Pillars data');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="h-3 bg-slate-700 rounded"></div>
                                    <div className="h-2 bg-slate-700 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-red-500/50 text-white", className)}>
                <CardContent className="p-6 text-center">
                    <div className="space-y-4">
                        <div className="text-red-400">
                            {error || 'Failed to load Four Pillars data'}
                        </div>
                        <Button 
                            onClick={fetchFourPillarsData}
                            variant="outline"
                            className="border-slate-600 hover:bg-slate-700"
                        >
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const maxPillarValue = Math.max(
        data.pillars.academic,
        data.pillars.community,
        data.pillars.mentorship,
        data.pillars.analytical,
        500 // Minimum scale
    );

    const currentTierConfig = TIER_CONFIG[data.currentTier];
    const nextTier = data.currentTier === 'pathfinder' ? 'explorer' : 
                     data.currentTier === 'explorer' ? 'navigator' : null;

    return (
        <Card className={cn(
            "bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:border-slate-600",
            className
        )}>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Four Pillars of Ascent
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Your expertise across key dimensions
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <Badge 
                            className={cn(
                                "px-3 py-1 text-sm font-medium",
                                currentTierConfig.bgColor,
                                currentTierConfig.color
                            )}
                        >
                            {currentTierConfig.label}
                        </Badge>
                        <div className="text-2xl font-bold text-white mt-1 flex items-center gap-1">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            {data.ascendiaScore}
                        </div>
                    </div>
                </div>

                {/* Tier Progress */}
                {nextTier && (
                    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-300">
                                Progress to {TIER_CONFIG[nextTier].label}
                            </span>
                            <span className="text-sm font-medium text-cyan-400">
                                {data.tierProgress.progressPercentage.toFixed(1)}%
                            </span>
                        </div>
                        <PillarProgressBar 
                            value={data.tierProgress.progressPercentage}
                            maxValue={100}
                            color="bg-gradient-to-r from-cyan-500 to-blue-500"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                            {data.tierProgress.current} / {data.tierProgress.nextTierThreshold} points
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Pillars Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(PILLAR_CONFIG).map(([key, config]) => {
                        const pillarKey = key as keyof typeof data.pillars;
                        const value = data.pillars[pillarKey];
                        const Icon = config.icon;

                        return (
                            <div 
                                key={key}
                                className={cn(
                                    "p-4 rounded-lg border transition-all duration-200 hover:scale-105",
                                    config.bgColor,
                                    config.borderColor
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn("h-4 w-4", config.color)} />
                                        <span className="text-sm font-medium text-white">
                                            {config.label}
                                        </span>
                                    </div>
                                    <span className={cn("text-lg font-bold", config.color)}>
                                        {value}
                                    </span>
                                </div>
                                
                                <PillarProgressBar 
                                    value={value}
                                    maxValue={maxPillarValue}
                                    color={`bg-gradient-to-r ${config.color.replace('text-', 'from-').replace('-400', '-500')} to-slate-600`}
                                />
                                
                                <p className="text-xs text-slate-400 mt-2">
                                    {config.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Recent Activities */}
                {data.recentActivities.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm font-medium text-cyan-300">Recent Progress</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {data.recentActivities.slice(0, 5).map((activity, index) => {
                                const pillarConfig = PILLAR_CONFIG[activity.pillar as keyof typeof PILLAR_CONFIG];
                                return (
                                    <div 
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-slate-800/30 rounded text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", 
                                                pillarConfig ? pillarConfig.color.replace('text-', 'bg-') : 'bg-slate-400'
                                            )} />
                                            <span className="text-slate-300">{activity.type}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400">+{activity.points}</span>
                                            <span className="text-slate-500">
                                                {new Date(activity.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FourPillarsWidget;