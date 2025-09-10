import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import TierBadge from "@/components/ui/TierBadge";
import apiClient from '../services/apiClient';
import { Coins, Gift, MessageCircle, Video, Crown } from 'lucide-react';

interface TierInfo {
    balance: number;
    tier: 'pathfinder' | 'explorer' | 'navigator' | 'ascendant' | 'contributor' | 'standard'; // Support both systems
    tierName: string;
    ascendia_score: number; // New Four Pillars system
    pillar_academic: number;
    pillar_community: number;
    pillar_mentorship: number;
    pillar_analytical: number;
    thresholds: {
        NAVIGATOR: number;
        EXPLORER: number;
        PATHFINDER: number;
        // Legacy support
        ASCENDANT: number;
        CONTRIBUTOR: number;
    };
}

interface Transaction {
    id: string;
    amount: number;
    transaction_type: string;
    description: string;
    related_activity: string;
    created_at: string;
}

const TierStatusCard: React.FC = () => {
    const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTierInfo();
        fetchRecentTransactions();
    }, []);

    const fetchTierInfo = async () => {
        try {
            // Use the new Ascendia scoring profile endpoint
            const response = await apiClient.get('/api/ascendia/user/me/scoring-profile');
            if (response.data.success) {
                const profile = response.data.profile;
                setTierInfo({
                    balance: profile.sparks_balance || 0,
                    tier: profile.currentTier || 'pathfinder',
                    tierName: profile.currentTier ? profile.currentTier.charAt(0).toUpperCase() + profile.currentTier.slice(1) : 'Pathfinder',
                    ascendia_score: profile.ascendiaScore || 0,
                    pillar_academic: profile.pillars?.academic || 0,
                    pillar_community: profile.pillars?.community || 0,
                    pillar_mentorship: profile.pillars?.mentorship || 0,
                    pillar_analytical: profile.pillars?.analytical || 0,
                    thresholds: profile.tierProgress || {
                        PATHFINDER: 1000,
                        EXPLORER: 2500,
                        NAVIGATOR: 5000,
                        // Legacy fallbacks
                        CONTRIBUTOR: 2500,
                        ASCENDANT: 5000
                    }
                });
            }
        } catch (error: any) {
            console.error('Failed to fetch Ascendia profile:', error);
            // Fallback to legacy endpoint
            try {
                const legacyResponse = await apiClient.get('/api/ascendia/tier');
                setTierInfo(legacyResponse.data);
            } catch (legacyError: any) {
                setError(legacyError.response?.data?.error || 'Failed to fetch tier information');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRecentTransactions = async () => {
        try {
            const response = await apiClient.get('/api/ascendia/sparks/transactions?limit=5');
            setTransactions(response.data.transactions);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    };

    const getProgressToNextTier = () => {
        if (!tierInfo) return { progress: 0, nextTier: 'explorer', sparksNeeded: 2500 };

        // NEW ASCENDIA TIER SYSTEM
        if (tierInfo.tier === 'navigator') {
            return { progress: 100, nextTier: 'navigator', sparksNeeded: 0 };
        } else if (tierInfo.tier === 'explorer') {
            const progress = ((tierInfo.ascendia_score - (tierInfo.thresholds.EXPLORER || 2500)) / 
                            ((tierInfo.thresholds.NAVIGATOR || 5000) - (tierInfo.thresholds.EXPLORER || 2500))) * 100;
            return { 
                progress: Math.min(progress, 100), 
                nextTier: 'navigator', 
                sparksNeeded: Math.max(0, (tierInfo.thresholds.NAVIGATOR || 5000) - tierInfo.ascendia_score)
            };
        } else if (tierInfo.tier === 'pathfinder') {
            const progress = (tierInfo.ascendia_score / (tierInfo.thresholds.EXPLORER || 2500)) * 100;
            return { 
                progress: Math.min(progress, 100), 
                nextTier: 'explorer', 
                sparksNeeded: Math.max(0, (tierInfo.thresholds.EXPLORER || 2500) - tierInfo.ascendia_score)
            };
        }

        // LEGACY TIER SYSTEM SUPPORT
        else if (tierInfo.tier === 'ascendant') {
            return { progress: 100, nextTier: 'ascendant', sparksNeeded: 0 };
        } else if (tierInfo.tier === 'contributor') {
            const progress = ((tierInfo.balance - tierInfo.thresholds.CONTRIBUTOR) / 
                            (tierInfo.thresholds.ASCENDANT - tierInfo.thresholds.CONTRIBUTOR)) * 100;
            return { 
                progress: Math.min(progress, 100), 
                nextTier: 'ascendant', 
                sparksNeeded: tierInfo.thresholds.ASCENDANT - tierInfo.balance 
            };
        } else {
            const progress = (tierInfo.balance / tierInfo.thresholds.CONTRIBUTOR) * 100;
            return { 
                progress: Math.min(progress, 100), 
                nextTier: 'contributor', 
                sparksNeeded: tierInfo.thresholds.CONTRIBUTOR - tierInfo.balance 
            };
        }
    };

    const getTierPrivileges = (tier: string) => {
        switch (tier) {
            // NEW ASCENDIA TIERS
            case 'navigator':
                return [
                    { icon: MessageCircle, text: 'Unlimited direct messages', available: true },
                    { icon: Video, text: 'Priority session booking', available: true },
                    { icon: Crown, text: 'Navigator exclusive flair', available: true },
                    { icon: Gift, text: 'Premium support access', available: true }
                ];
            case 'explorer':
                return [
                    { icon: MessageCircle, text: '25 free messages per day', available: true },
                    { icon: Video, text: 'Enhanced session discovery', available: true },
                    { icon: Crown, text: 'Navigator exclusive flair', available: false },
                    { icon: Gift, text: 'Premium support access', available: false }
                ];
            case 'pathfinder':
                return [
                    { icon: MessageCircle, text: '10 free messages per day', available: true },
                    { icon: Video, text: 'Basic session booking', available: true },
                    { icon: Crown, text: 'Explorer/Navigator features', available: false },
                    { icon: Gift, text: 'Premium support access', available: false }
                ];
            // LEGACY TIERS
            case 'ascendant':
                return [
                    { icon: MessageCircle, text: 'Unlimited free direct messages', available: true },
                    { icon: Video, text: 'Free 30-min networking sessions', available: true },
                    { icon: Crown, text: 'Ascendant profile flair', available: true },
                    { icon: Gift, text: 'Priority support access', available: true }
                ];
            case 'contributor':
                return [
                    { icon: MessageCircle, text: 'Limited free direct messages', available: true },
                    { icon: Video, text: 'Free networking sessions', available: false },
                    { icon: Crown, text: 'Ascendant profile flair', available: false },
                    { icon: Gift, text: 'Priority support access', available: false }
                ];
            default:
                return [
                    { icon: MessageCircle, text: 'Free direct messages', available: false },
                    { icon: Video, text: 'Free networking sessions', available: false },
                    { icon: Crown, text: 'Premium features', available: false },
                    { icon: Gift, text: 'Priority support access', available: false }
                ];
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-yellow-400" />
                        Loading Tier Status...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                        <div className="h-8 bg-slate-700 rounded"></div>
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !tierInfo) {
        return (
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-red-700/80 text-white">
                <CardHeader>
                    <CardTitle className="text-red-400">Error Loading Tier Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-300">{error}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const progressInfo = getProgressToNextTier();
    const privileges = getTierPrivileges(tierInfo.tier);

    return (
        <div className="space-y-6">
            {/* Main Tier Status Card */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-3">
                                <Coins className="h-6 w-6 text-yellow-400" />
                                Ascendia Tier Status
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                                Your current standing in the Ascendia ecosystem
                            </CardDescription>
                        </div>
                        <TierBadge 
                            tier={tierInfo.tier} 
                            tierName={tierInfo.tierName} 
                            sparks={tierInfo.balance}
                            ascendiaScore={tierInfo.ascendia_score}
                            showCredits={true}
                            size="lg"
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Ascendia Score & Sparks Balance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg border border-cyan-600/50">
                            <div>
                                <p className="text-2xl font-bold text-cyan-400">
                                    {tierInfo.ascendia_score?.toLocaleString() || 0}
                                </p>
                                <p className="text-slate-400 text-sm">AscendiaScore</p>
                            </div>
                            <Crown className="h-8 w-8 text-cyan-400" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 rounded-lg border border-yellow-600/50">
                            <div>
                                <p className="text-2xl font-bold text-yellow-400">
                                    {tierInfo.balance.toLocaleString()}
                                </p>
                                <p className="text-slate-400 text-sm">Sparks Balance</p>
                            </div>
                            <Coins className="h-8 w-8 text-yellow-400" />
                        </div>
                    </div>

                    {/* Progress to Next Tier */}
                    {tierInfo.tier !== 'navigator' && tierInfo.tier !== 'ascendant' && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress to {progressInfo.nextTier === 'navigator' ? 'Navigator' : 
                                              progressInfo.nextTier === 'explorer' ? 'Explorer' : 
                                              progressInfo.nextTier === 'ascendant' ? 'Ascendant' : 'Contributor'}</span>
                                <span>{Math.round(progressInfo.progress)}%</span>
                            </div>
                            <Progress value={progressInfo.progress} className="h-3" />
                            <p className="text-xs text-slate-400">
                                {progressInfo.sparksNeeded > 0 
                                    ? `${progressInfo.sparksNeeded.toLocaleString()} more AscendiaScore points needed`
                                    : 'Maximum tier reached!'
                                }
                            </p>
                        </div>
                    )}

                    {/* Tier Privileges */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-200">Your Privileges</h4>
                        <div className="grid gap-2">
                            {privileges.map((privilege, index) => {
                                const Icon = privilege.icon;
                                return (
                                    <div 
                                        key={index}
                                        className={`flex items-center gap-3 p-2 rounded ${
                                            privilege.available 
                                                ? 'text-green-400 bg-green-500/10' 
                                                : 'text-slate-500 bg-slate-800/30'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-sm">{privilege.text}</span>
                                        {privilege.available && <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Spark Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {transactions.map(transaction => (
                                <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-600">
                                    <div>
                                        <p className="text-sm font-medium">{transaction.description}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(transaction.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`text-right ${
                                        transaction.transaction_type === 'earned' 
                                            ? 'text-green-400' 
                                            : 'text-red-400'
                                    }`}>
                                        <p className="font-semibold">
                                            {transaction.transaction_type === 'earned' ? '+' : '-'}
                                            {Math.abs(transaction.amount)} Sparks
                                        </p>
                                        <Badge 
                                            variant="outline" 
                                            className="text-xs"
                                        >
                                            {transaction.related_activity}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default TierStatusCard;