import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TierBadge from "@/components/ui/TierBadge";
import apiClient from '../../services/apiClient';
import { 
    Search, Users, Star, MapPin, BookOpen, MessageSquare, 
    FileEdit, ChevronRight, Sparkles, TrendingUp, Clock,
    Eye, Video, ArrowRight
} from 'lucide-react';

interface QuickProfile {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    location: string;
    is_mentor: boolean;
    is_counselor: boolean;
    is_essay_editor: boolean;
    hourly_rate_sparks: number;
    hourly_rate_usd: number;
    average_rating: number;
    total_reviews: number;
    verified_mentor: boolean;
    availability_status: string;
    specializations: Array<{ name: string; category: string; }>;
    tier: 'pathfinder' | 'explorer' | 'navigator';
    // ASCENDIA PLATFORM: Four Pillars support
    ascendia_score?: number;
    pillar_academic?: number;
    pillar_community?: number;
    pillar_mentorship?: number;
    pillar_analytical?: number;
}

interface DiscoveryState {
    searchQuery: string;
    profiles: QuickProfile[];
    isSearching: boolean;
    showSuggestions: boolean;
    activeService: string;
}

const ProfileDiscoveryWidget: React.FC = () => {
    const navigate = useNavigate();
    const [state, setState] = useState<DiscoveryState>({
        searchQuery: '',
        profiles: [],
        isSearching: false,
        showSuggestions: false,
        activeService: 'all'
    });

    const [featuredProfiles, setFeaturedProfiles] = useState<QuickProfile[]>([]);
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

    // Load featured profiles on mount
    useEffect(() => {
        loadFeaturedProfiles();
    }, []);

    const loadFeaturedProfiles = async () => {
        try {
            const response = await apiClient.get('/api/profiles/search/profiles?service_type=all&min_rating=4&limit=6');
            setFeaturedProfiles(response.data.profiles);
        } catch (error) {
            console.error('Failed to load featured profiles:', error);
        } finally {
            setIsLoadingFeatured(false);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setState(prev => ({ ...prev, profiles: [], showSuggestions: false, isSearching: false }));
            return;
        }

        setState(prev => ({ ...prev, isSearching: true, showSuggestions: true }));

        try {
            const params = new URLSearchParams();
            params.append('specialization', query);
            if (state.activeService !== 'all') {
                params.append('service_type', state.activeService);
            }
            params.append('limit', '5');

            const response = await apiClient.get(`/api/profiles/search/profiles?${params.toString()}`);
            setState(prev => ({ 
                ...prev, 
                profiles: response.data.profiles, 
                isSearching: false 
            }));
        } catch (error) {
            console.error('Search failed:', error);
            setState(prev => ({ 
                ...prev, 
                profiles: [], 
                isSearching: false 
            }));
        }
    };

    const handleInputChange = (value: string) => {
        setState(prev => ({ ...prev, searchQuery: value }));
        
        // Debounced search
        const timeoutId = setTimeout(() => {
            handleSearch(value);
        }, 300);

        return () => clearTimeout(timeoutId);
    };

    const getServiceIcon = (profile: QuickProfile) => {
        if (profile.is_mentor) return BookOpen;
        if (profile.is_counselor) return MessageSquare;
        if (profile.is_essay_editor) return FileEdit;
        return Users;
    };

    const getServiceLabel = (profile: QuickProfile) => {
        if (profile.is_mentor) return 'Mentor';
        if (profile.is_counselor) return 'Counselor';
        if (profile.is_essay_editor) return 'Editor';
        return 'Teacher';
    };

    const getRatingStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-slate-600'}`} 
            />
        ));
    };

    const viewProfile = (profileId: string) => {
        navigate(`/profile/${profileId}`);
    };

    const requestSession = (profileId: string) => {
        navigate(`/session/request/${profileId}`);
    };

    const serviceFilters = [
        { value: 'all', label: 'All Services', icon: Users },
        { value: 'mentor', label: 'Mentors', icon: BookOpen },
        { value: 'counselor', label: 'Counselors', icon: MessageSquare },
        { value: 'essay_editor', label: 'Editors', icon: FileEdit }
    ];

    return (
        <div className="space-y-6">
            {/* Enhanced Search Interface */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Search className="h-5 w-5 text-cyan-400" />
                                Find Your Perfect Mentor
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                                Connect with verified experts in CS, Finance, and College Prep
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/profiles/search')}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            Advanced Search
                            <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Service Type Filters */}
                    <div className="flex flex-wrap gap-2">
                        {serviceFilters.map(filter => {
                            const Icon = filter.icon;
                            return (
                                <Button
                                    key={filter.value}
                                    variant={state.activeService === filter.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setState(prev => ({ ...prev, activeService: filter.value }))}
                                    className={state.activeService === filter.value 
                                        ? 'bg-cyan-500 text-slate-900' 
                                        : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                                    }
                                >
                                    <Icon className="h-3 w-3 mr-1" />
                                    {filter.label}
                                </Button>
                            );
                        })}
                    </div>

                    {/* Smart Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                            value={state.searchQuery}
                            onChange={e => handleInputChange(e.target.value)}
                            placeholder="Search by specialization (e.g., Web Development, Data Science, Essay Writing...)"
                            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                            onFocus={() => state.searchQuery && setState(prev => ({ ...prev, showSuggestions: true }))}
                        />
                        {state.isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                            </div>
                        )}
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {state.showSuggestions && state.profiles.length > 0 && (
                        <div className="absolute z-50 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                            {state.profiles.map(profile => {
                                const ServiceIcon = getServiceIcon(profile);
                                return (
                                    <div 
                                        key={profile.id} 
                                        className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-700 last:border-b-0"
                                        onClick={() => {
                                            viewProfile(profile.id);
                                            setState(prev => ({ ...prev, showSuggestions: false }));
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-slate-700 rounded">
                                                    <ServiceIcon className="h-4 w-4 text-cyan-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{profile.display_name}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {getServiceLabel(profile)} • {profile.location || 'Remote'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <TierBadge tier={profile.tier} size="sm" />
                                                {profile.total_reviews > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <div className="flex">{getRatingStars(profile.average_rating)}</div>
                                                        <span className="text-xs text-slate-400">({profile.total_reviews})</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Featured Mentors Carousel */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-400" />
                            Featured Mentors
                        </CardTitle>
                        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 text-yellow-300 border-yellow-400/30">
                            Top Rated
                        </Badge>
                    </div>
                    <CardDescription className="text-slate-400">
                        Highly-rated experts ready to accelerate your learning
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {isLoadingFeatured ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }, (_, i) => (
                                <div key={i} className="p-4 bg-slate-800/50 rounded-lg animate-pulse">
                                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-slate-700 rounded w-1/2 mb-3"></div>
                                    <div className="h-2 bg-slate-700 rounded w-full mb-2"></div>
                                    <div className="h-2 bg-slate-700 rounded w-2/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {featuredProfiles.map(profile => {
                                const ServiceIcon = getServiceIcon(profile);
                                return (
                                    <div 
                                        key={profile.id} 
                                        className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all cursor-pointer"
                                        onClick={() => viewProfile(profile.id)}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium text-white group-hover:text-cyan-300 transition-colors">
                                                        {profile.display_name}
                                                    </h4>
                                                    <TierBadge tier={profile.tier} size="sm" />
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <ServiceIcon className="h-3 w-3" />
                                                    {getServiceLabel(profile)}
                                                    {profile.location && (
                                                        <>
                                                            <span>•</span>
                                                            <MapPin className="h-3 w-3" />
                                                            {profile.location}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${
                                                profile.availability_status === 'available' ? 'bg-green-400' :
                                                profile.availability_status === 'busy' ? 'bg-yellow-400' : 'bg-slate-500'
                                            }`}></div>
                                        </div>

                                        <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                                            {profile.bio}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                {profile.total_reviews > 0 ? (
                                                    <>
                                                        <div className="flex">{getRatingStars(profile.average_rating)}</div>
                                                        <span className="text-xs text-slate-400 ml-1">
                                                            {profile.average_rating.toFixed(1)} ({profile.total_reviews})
                                                        </span>
                                                    </>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                        New
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        viewProfile(profile.id);
                                                    }}
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-7 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-xs font-medium"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        requestSession(profile.id);
                                                    }}
                                                >
                                                    <Video className="h-3 w-3 mr-1" />
                                                    Book
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isLoadingFeatured && featuredProfiles.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No featured mentors available right now</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                    className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white hover:border-cyan-500/50 cursor-pointer transition-all group"
                    onClick={() => navigate('/profiles/search?service=mentor')}
                >
                    <CardContent className="p-4 text-center">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <h4 className="font-medium mb-1">Find CS Mentors</h4>
                        <p className="text-sm text-slate-400">Get 1:1 coding help</p>
                    </CardContent>
                </Card>

                <Card 
                    className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white hover:border-cyan-500/50 cursor-pointer transition-all group"
                    onClick={() => navigate('/profiles/search?service=counselor')}
                >
                    <CardContent className="p-4 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-400 group-hover:scale-110 transition-transform" />
                        <h4 className="font-medium mb-1">College Counselors</h4>
                        <p className="text-sm text-slate-400">Plan your future</p>
                    </CardContent>
                </Card>

                <Card 
                    className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white hover:border-cyan-500/50 cursor-pointer transition-all group"
                    onClick={() => navigate('/profiles/search?service=essay_editor')}
                >
                    <CardContent className="p-4 text-center">
                        <FileEdit className="h-8 w-8 mx-auto mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                        <h4 className="font-medium mb-1">Essay Editors</h4>
                        <p className="text-sm text-slate-400">Perfect your writing</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfileDiscoveryWidget;