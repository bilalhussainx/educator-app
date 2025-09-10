import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import TierBadge from "@/components/ui/TierBadge";
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '../services/apiClient';
import { 
    Search, Filter, MapPin, Clock, Star, DollarSign, 
    BookOpen, MessageSquare, FileEdit, Video, Eye, 
    ChevronLeft, Users, Verified, AlertCircle
} from 'lucide-react';

interface Profile {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    location: string;
    profile_image_url: string;
    is_mentor: boolean;
    is_counselor: boolean;
    is_essay_editor: boolean;
    hourly_rate_sparks: number;
    hourly_rate_usd: number;
    years_experience: number;
    education_level: string;
    languages: string[];
    availability_status: string;
    total_sessions: number;
    average_rating: number;
    total_reviews: number;
    verified_mentor: boolean;
    spark_balance: number;
    specializations: Array<{
        name: string;
        category: string;
        proficiency_level: string;
    }>;
}

interface SearchFilters {
    service_type: string;
    specialization: string;
    location: string;
    max_rate_sparks: string;
    max_rate_usd: string;
    min_rating: string;
    availability: string;
    education_level: string;
    languages: string;
}

const ProfileSearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [showFilters, setShowFilters] = useState(false);
    
    const [filters, setFilters] = useState<SearchFilters>({
        service_type: searchParams.get('service') || 'all',
        specialization: searchParams.get('specialization') || '',
        location: searchParams.get('location') || '',
        max_rate_sparks: searchParams.get('max_rate_sparks') || '',
        max_rate_usd: searchParams.get('max_rate_usd') || '',
        min_rating: searchParams.get('min_rating') || '',
        availability: searchParams.get('availability') || '',
        education_level: searchParams.get('education') || '',
        languages: searchParams.get('lang') || ''
    });

    useEffect(() => {
        searchProfiles();
    }, [page]);

    useEffect(() => {
        if (page === 1) {
            searchProfiles();
        } else {
            setPage(1);
        }
    }, [filters, searchQuery]);

    const searchProfiles = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            
            // Add search parameters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            if (searchQuery) params.append('search', searchQuery);
            params.append('page', page.toString());
            params.append('limit', '12');

            const response = await apiClient.get(`/api/profiles/search/profiles?${params.toString()}`);
            
            if (page === 1) {
                setProfiles(response.data.profiles);
            } else {
                setProfiles(prev => [...prev, ...response.data.profiles]);
            }
            
            setHasMore(response.data.hasMore);
            
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to search profiles');
        } finally {
            setIsLoading(false);
        }
    };

    const updateFilters = (key: keyof SearchFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        
        // Update URL params
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setFilters({
            service_type: 'all',
            specialization: '',
            location: '',
            max_rate_sparks: '',
            max_rate_usd: '',
            min_rating: '',
            availability: '',
            education_level: '',
            languages: ''
        });
        setSearchQuery('');
        setSearchParams({});
    };

    const loadMore = () => {
        setPage(prev => prev + 1);
    };

    const viewProfile = (profileId: string) => {
        navigate(`/profile/${profileId}`);
    };

    const requestSession = (profileId: string, serviceType: string) => {
        navigate(`/session/request/${profileId}?type=${serviceType}`);
    };

    const getServiceIcons = (profile: Profile) => {
        const services = [];
        if (profile.is_mentor) services.push({ icon: BookOpen, label: 'Mentor', type: 'mentoring' });
        if (profile.is_counselor) services.push({ icon: MessageSquare, label: 'Counselor', type: 'counseling' });
        if (profile.is_essay_editor) services.push({ icon: FileEdit, label: 'Editor', type: 'essay_editing' });
        return services;
    };

    const getAvailabilityColor = (status: string) => {
        switch (status) {
            case 'available': return 'text-green-400';
            case 'busy': return 'text-yellow-400';
            case 'offline': return 'text-slate-500';
            default: return 'text-slate-400';
        }
    };

    const getRatingStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-slate-600'}`} 
            />
        ));
    };

    return (
        <div className="min-h-screen bg-[#0a091a] text-white font-sans">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <div className="relative z-10 container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => navigate('/dashboard')}
                                className="text-slate-400 hover:text-white"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-4">
                            Find Your Perfect Mentor
                        </h1>
                        <p className="text-lg text-gray-400">
                            Connect with verified mentors, counselors, and essay editors to accelerate your learning
                        </p>
                    </header>

                    {/* Search and Filters */}
                    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 mb-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row gap-4 items-end">
                                <div className="flex-1">
                                    <Label htmlFor="search" className="text-sm text-slate-300 mb-2 block">
                                        Search by name, bio, or specialization
                                    </Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input
                                            id="search"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search mentors, counselors, essay editors..."
                                            className="pl-10 bg-slate-800 border-slate-600 text-white"
                                            onKeyPress={e => e.key === 'Enter' && searchProfiles()}
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="border-slate-600 text-slate-300"
                                    >
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filters
                                    </Button>
                                    <Button onClick={() => searchProfiles()} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900">
                                        Search
                                    </Button>
                                </div>
                            </div>

                            {/* Filters Panel */}
                            {showFilters && (
                                <div className="mt-6 pt-6 border-t border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-sm text-slate-300">Service Type</Label>
                                            <select
                                                value={filters.service_type}
                                                onChange={e => updateFilters('service_type', e.target.value)}
                                                className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
                                            >
                                                <option value="all">All Services</option>
                                                <option value="mentor">Mentoring</option>
                                                <option value="counselor">Counseling</option>
                                                <option value="essay_editor">Essay Editing</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="text-sm text-slate-300">Location</Label>
                                            <Input
                                                value={filters.location}
                                                onChange={e => updateFilters('location', e.target.value)}
                                                placeholder="City, Country"
                                                className="bg-slate-800 border-slate-600"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-sm text-slate-300">Max Rate (Sparks)</Label>
                                            <Input
                                                type="number"
                                                value={filters.max_rate_sparks}
                                                onChange={e => updateFilters('max_rate_sparks', e.target.value)}
                                                placeholder="Max per hour"
                                                className="bg-slate-800 border-slate-600"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-sm text-slate-300">Min Rating</Label>
                                            <select
                                                value={filters.min_rating}
                                                onChange={e => updateFilters('min_rating', e.target.value)}
                                                className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
                                            >
                                                <option value="">Any Rating</option>
                                                <option value="4">4+ Stars</option>
                                                <option value="4.5">4.5+ Stars</option>
                                                <option value="5">5 Stars</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="text-sm text-slate-300">Availability</Label>
                                            <select
                                                value={filters.availability}
                                                onChange={e => updateFilters('availability', e.target.value)}
                                                className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
                                            >
                                                <option value="">Any Status</option>
                                                <option value="available">Available</option>
                                                <option value="busy">Busy</option>
                                            </select>
                                        </div>

                                        <div>
                                            <Label className="text-sm text-slate-300">Education Level</Label>
                                            <select
                                                value={filters.education_level}
                                                onChange={e => updateFilters('education_level', e.target.value)}
                                                className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
                                            >
                                                <option value="">Any Level</option>
                                                <option value="bachelor">Bachelor's</option>
                                                <option value="master">Master's</option>
                                                <option value="phd">PhD</option>
                                                <option value="professional">Professional</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <Label className="text-sm text-slate-300">Specialization</Label>
                                            <Input
                                                value={filters.specialization}
                                                onChange={e => updateFilters('specialization', e.target.value)}
                                                placeholder="e.g. Web Development, Data Science"
                                                className="bg-slate-800 border-slate-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <Button variant="outline" onClick={clearFilters} className="border-slate-600 text-slate-300">
                                            Clear All Filters
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Results */}
                    {error && (
                        <Alert className="border-red-700/80 bg-red-500/10 mb-8">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-red-300">{error}</AlertDescription>
                        </Alert>
                    )}

                    {!isLoading && profiles.length === 0 && (
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-center py-16">
                            <CardContent>
                                <Users className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                                <h3 className="text-xl font-semibold text-slate-300 mb-2">No profiles found</h3>
                                <p className="text-slate-400 mb-4">Try adjusting your search criteria or filters</p>
                                <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Profile Grid */}
                    {profiles.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {profiles.map(profile => (
                                <Card key={profile.id} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 hover:border-cyan-500/50 transition-colors">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CardTitle className="text-lg">{profile.display_name}</CardTitle>
                                                    {profile.verified_mentor && (
                                                        <Verified className="h-4 w-4 text-cyan-400" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <span className={`w-2 h-2 rounded-full ${getAvailabilityColor(profile.availability_status)} bg-current`}></span>
                                                    {profile.availability_status}
                                                    {profile.location && (
                                                        <>
                                                            <span>•</span>
                                                            <MapPin className="h-3 w-3" />
                                                            {profile.location}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <TierBadge 
                                                tier={profile.spark_balance >= 20000 ? 'ascendant' : profile.spark_balance >= 5000 ? 'contributor' : 'standard'}
                                                size="sm"
                                            />
                                        </div>

                                        {/* Rating and Experience */}
                                        <div className="flex items-center gap-4 mt-2">
                                            {profile.total_reviews > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <div className="flex">{getRatingStars(profile.average_rating)}</div>
                                                    <span className="text-sm text-slate-400">
                                                        {profile.average_rating.toFixed(1)} ({profile.total_reviews})
                                                    </span>
                                                </div>
                                            )}
                                            {profile.years_experience > 0 && (
                                                <div className="flex items-center gap-1 text-sm text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    {profile.years_experience}y exp
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        {/* Bio */}
                                        <p className="text-sm text-slate-300 line-clamp-3">{profile.bio}</p>

                                        {/* Services */}
                                        <div className="flex flex-wrap gap-2">
                                            {getServiceIcons(profile).map(service => {
                                                const Icon = service.icon;
                                                return (
                                                    <Badge key={service.type} variant="secondary" className="bg-slate-700 text-slate-300">
                                                        <Icon className="h-3 w-3 mr-1" />
                                                        {service.label}
                                                    </Badge>
                                                );
                                            })}
                                        </div>

                                        {/* Specializations */}
                                        {profile.specializations.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {profile.specializations.slice(0, 3).map(spec => (
                                                    <Badge key={spec.name} variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                        {spec.name}
                                                    </Badge>
                                                ))}
                                                {profile.specializations.length > 3 && (
                                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                        +{profile.specializations.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Rates */}
                                        <div className="flex items-center gap-4 text-sm">
                                            {profile.hourly_rate_sparks > 0 && (
                                                <div className="flex items-center gap-1 text-yellow-400">
                                                    <DollarSign className="h-3 w-3" />
                                                    {profile.hourly_rate_sparks} Sparks/hr
                                                </div>
                                            )}
                                            {profile.hourly_rate_usd > 0 && (
                                                <div className="flex items-center gap-1 text-green-400">
                                                    <DollarSign className="h-3 w-3" />
                                                    ${profile.hourly_rate_usd}/hr
                                                </div>
                                            )}
                                            {profile.hourly_rate_sparks === 0 && profile.hourly_rate_usd === 0 && (
                                                <div className="text-cyan-400 font-medium">Free for Ascendants</div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => viewProfile(profile.id)}
                                                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                View Profile
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => requestSession(profile.id, getServiceIcons(profile)[0]?.type || 'mentoring')}
                                                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                                            >
                                                <Video className="h-3 w-3 mr-1" />
                                                Book Session
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Load More */}
                    {hasMore && (
                        <div className="text-center">
                            <Button 
                                onClick={loadMore} 
                                disabled={isLoading}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                {isLoading ? 'Loading...' : 'Load More Profiles'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSearchPage;