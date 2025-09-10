import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TierBadge from "@/components/ui/TierBadge";
import { Users, Crown, Star, User } from 'lucide-react';

interface Participant {
    id: string;
    username: string;
    role: 'teacher' | 'student';
    tier: 'ascendant' | 'contributor' | 'standard';
    tierName: string;
    sparks: number;
}

interface ParticipantsListProps {
    participants: Participant[];
    currentUserId?: string;
    className?: string;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
    participants, 
    currentUserId, 
    className 
}) => {
    const getRoleIcon = (role: string) => {
        return role === 'teacher' ? '👨‍🏫' : '🎓';
    };

    const sortedParticipants = [...participants].sort((a, b) => {
        // Teachers first
        if (a.role !== b.role) {
            return a.role === 'teacher' ? -1 : 1;
        }
        // Then by tier (ascendant > contributor > standard)
        const tierOrder = { ascendant: 3, contributor: 2, standard: 1 };
        if (tierOrder[a.tier] !== tierOrder[b.tier]) {
            return tierOrder[b.tier] - tierOrder[a.tier];
        }
        // Finally alphabetically
        return a.username.localeCompare(b.username);
    });

    return (
        <Card className={`bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white ${className}`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-cyan-400" />
                    Participants ({participants.length})
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Session members and their tiers
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sortedParticipants.map(participant => (
                        <div 
                            key={participant.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                participant.id === currentUserId 
                                    ? 'bg-cyan-500/10 border-cyan-500/30' 
                                    : 'bg-slate-800/30 border-slate-600 hover:bg-slate-700/30'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg" title={`${participant.role}`}>
                                    {getRoleIcon(participant.role)}
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-200">
                                            {participant.username}
                                            {participant.id === currentUserId && (
                                                <span className="text-xs text-cyan-400 ml-1">(You)</span>
                                            )}
                                        </p>
                                        {participant.role === 'teacher' && (
                                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                                Teacher
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        {participant.sparks.toLocaleString()} Sparks
                                    </p>
                                </div>
                            </div>
                            <TierBadge 
                                tier={participant.tier}
                                tierName={participant.tierName}
                                size="sm"
                            />
                        </div>
                    ))}
                </div>
                
                {participants.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No participants yet</p>
                    </div>
                )}

                {/* Tier Distribution Summary */}
                {participants.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-slate-600">
                        <p className="text-xs text-slate-400 mb-2">Tier Distribution:</p>
                        <div className="flex gap-2 text-xs">
                            {['ascendant', 'contributor', 'standard'].map(tier => {
                                const count = participants.filter(p => p.tier === tier).length;
                                if (count === 0) return null;
                                
                                const tierConfig = {
                                    ascendant: { icon: Crown, color: 'text-yellow-400', name: 'Ascendant' },
                                    contributor: { icon: Star, color: 'text-blue-400', name: 'Contributor' },
                                    standard: { icon: User, color: 'text-slate-400', name: 'Standard' }
                                };
                                
                                const config = tierConfig[tier as keyof typeof tierConfig];
                                const Icon = config.icon;
                                
                                return (
                                    <div key={tier} className={`flex items-center gap-1 ${config.color}`}>
                                        <Icon className="h-3 w-3" />
                                        <span>{count}</span>
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

export default ParticipantsList;