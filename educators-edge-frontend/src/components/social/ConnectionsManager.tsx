// src/components/social/ConnectionsManager.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    Users,
    Search,
    MessageCircle,
    Star,
    Award,
    Zap,
    Heart,
    MapPin,
    MoreVertical
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'sonner';

interface User {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    user_tier: 'pathfinder' | 'explorer' | 'navigator';
    ascendia_score: number;
    pillar_academic: number;
    pillar_community: number;
    pillar_mentorship: number;
    pillar_analytical: number;
    location?: string;
    specializations: string[];
    is_mentor: boolean;
    verified_mentor: boolean;
    total_sessions: number;
    average_rating: number;
}

interface Connection {
    id: string;
    user1_id: string;
    user2_id: string;
    status: 'pending' | 'accepted' | 'declined' | 'blocked';
    connection_type: 'mutual' | 'following' | 'mentor_student';
    created_at: string;
    connected_user: User;
    is_mutual: boolean;
    interaction_count: number;
    last_interaction: string;
}

interface ConnectionsManagerProps {
    userId?: string;
    className?: string;
    variant?: 'full' | 'compact' | 'widget';
    showActions?: boolean;
}

const TIER_STYLES = {
    pathfinder: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
    explorer: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    navigator: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' }
};

export const ConnectionsManager: React.FC<ConnectionsManagerProps> = ({ 
    userId, 
    className,
    variant = 'full',
    showActions = true
}) => {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [filteredConnections, setFilteredConnections] = useState<Connection[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTier, setFilterTier] = useState('');
    const [filterType, setFilterType] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [, setSelectedConnection] = useState<Connection | null>(null);

    useEffect(() => {
        fetchConnections();
    }, [userId]);

    useEffect(() => {
        applyFilters();
    }, [connections, searchQuery, filterTier, filterType]);

    const fetchConnections = async () => {
        try {
            setIsLoading(true);
            const endpoint = userId 
                ? `/api/ascendia/connections/user/${userId}` 
                : '/api/ascendia/connections/my-connections';
            
            const response = await apiClient.get(endpoint);
            
            if (response.data.success) {
                setConnections(response.data.connections);
            } else {
                throw new Error(response.data.message || 'Failed to fetch connections');
            }
        } catch (error: any) {
            console.error('Connections fetch error:', error);
            toast.error(error.message || 'Failed to load connections');
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = connections;

        // Search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(conn => 
                conn.connected_user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conn.connected_user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conn.connected_user.specializations.some(spec => 
                    spec.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Tier filter
        if (filterTier) {
            filtered = filtered.filter(conn => conn.connected_user.user_tier === filterTier);
        }

        // Type filter
        if (filterType) {
            if (filterType === 'mentor') {
                filtered = filtered.filter(conn => conn.connected_user.is_mentor);
            } else if (filterType === 'mutual') {
                filtered = filtered.filter(conn => conn.is_mutual);
            } else if (filterType === 'verified') {
                filtered = filtered.filter(conn => conn.connected_user.verified_mentor);
            }
        }

        setFilteredConnections(filtered);
    };

    const handleConnectionAction = async (connectionId: string, action: 'remove' | 'block' | 'message') => {
        try {
            let response;
            
            switch (action) {
                case 'remove':
                    response = await apiClient.delete(`/api/ascendia/connections/${connectionId}`);
                    break;
                case 'block':
                    response = await apiClient.post(`/api/ascendia/connections/${connectionId}/block`);
                    break;
                case 'message':
                    // Navigate to messaging or open message modal
                    toast.info('Opening message...');
                    return;
            }

            if (response?.data.success) {
                toast.success(`Connection ${action}ed successfully`);
                fetchConnections(); // Refresh data
            } else {
                throw new Error(response?.data.message || `Failed to ${action} connection`);
            }
        } catch (error: any) {
            console.error(`Connection ${action} error:`, error);
            toast.error(error.message || `Failed to ${action} connection`);
        }
    };

    const renderConnectionCard = (connection: Connection) => {
        const user = connection.connected_user;
        const tierStyle = TIER_STYLES[user.user_tier || 'pathfinder'];
        
        return (
            <Card 
                key={connection.id} 
                className={cn(
                    "transition-all duration-200 hover:shadow-lg",
                    variant === 'compact' ? 'p-2' : '',
                    tierStyle.borderColor,
                    "bg-slate-900/40 backdrop-blur-lg border text-white"
                )}
            >
                <CardContent className={cn("p-4", variant === 'compact' && "p-3")}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className={cn(
                                "border border-slate-600",
                                variant === 'compact' ? 'h-10 w-10' : 'h-12 w-12'
                            )}>
                                <AvatarImage src={`/api/avatars/${user.id}`} />
                                <AvatarFallback className="bg-slate-700 text-white">
                                    {user.display_name?.charAt(0) || user.username?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={cn(
                                        "font-semibold text-white",
                                        variant === 'compact' ? 'text-sm' : 'text-base'
                                    )}>
                                        {user.display_name || user.username}
                                    </h4>
                                    {user.verified_mentor && (
                                        <Award className="h-4 w-4 text-blue-400" />
                                    )}
                                    {connection.is_mutual && (
                                        <Heart className="h-3 w-3 text-pink-400" />
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className={cn("text-xs", tierStyle.bgColor, tierStyle.color)}>
                                        {user.user_tier.charAt(0).toUpperCase() + user.user_tier.slice(1)}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-sm text-slate-300">
                                        <Zap className="h-3 w-3 text-yellow-400" />
                                        {user.ascendia_score || 0}
                                    </div>
                                </div>
                                
                                {variant !== 'compact' && user.bio && (
                                    <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                                        {user.bio}
                                    </p>
                                )}
                                
                                {variant !== 'compact' && (
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        {user.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {user.location}
                                            </div>
                                        )}
                                        {user.is_mentor && user.total_sessions > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3 w-3 text-yellow-400" />
                                                {user.average_rating?.toFixed(1)} ({user.total_sessions} sessions)
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <MessageCircle className="h-3 w-3" />
                                            {connection.interaction_count} interactions
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {showActions && (
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleConnectionAction(connection.id, 'message')}
                                    className="border-slate-600 hover:bg-slate-700"
                                >
                                    <MessageCircle className="h-3 w-3" />
                                </Button>
                                
                                <div className="relative">
                                    <Button 
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-600 hover:bg-slate-700"
                                    >
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                    
                                    {/* Dropdown menu would go here */}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {variant !== 'compact' && user.specializations && user.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {user.specializations.slice(0, 3).map((spec: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                    {spec}
                                </Badge>
                            ))}
                            {user.specializations.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-400">
                                    +{user.specializations.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderFilters = () => {
        if (variant === 'widget') return null;
        
        return (
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 mb-6">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search connections..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        
                        <select 
                            value={filterTier} 
                            onChange={(e) => setFilterTier(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        >
                            <option value="">All Tiers</option>
                            <option value="navigator">Navigator</option>
                            <option value="explorer">Explorer</option>
                            <option value="pathfinder">Pathfinder</option>
                        </select>
                        
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="mentor">Mentors Only</option>
                            <option value="mutual">Mutual Connections</option>
                            <option value="verified">Verified Only</option>
                        </select>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className={cn("space-y-4", className)}>
                {variant !== 'widget' && renderFilters()}
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {renderFilters()}
            
            {variant !== 'widget' && (
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-200">
                        {filteredConnections.length} Connection{filteredConnections.length !== 1 ? 's' : ''}
                    </h3>
                    {filteredConnections.length !== connections.length && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                setSearchQuery('');
                                setFilterTier('');
                                setFilterType('');
                            }}
                            className="border-slate-600 hover:bg-slate-700"
                        >
                            Clear Filters
                        </Button>
                    )}
                </div>
            )}

            {filteredConnections.length === 0 ? (
                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                    <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">
                            {connections.length === 0 ? 'No connections yet' : 'No matching connections'}
                        </h3>
                        <p className="text-slate-400">
                            {connections.length === 0 
                                ? 'Start building your network by connecting with other users'
                                : 'Try adjusting your search or filters'
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className={cn(
                    "grid gap-4",
                    variant === 'compact' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                    variant === 'widget' ? 'grid-cols-1' :
                    'grid-cols-1 md:grid-cols-2 gap-6'
                )}>
                    {filteredConnections.map(connection => renderConnectionCard(connection))}
                </div>
            )}
        </div>
    );
};

export default ConnectionsManager;