import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TierBadge from "@/components/ui/TierBadge";
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '../services/apiClient';
import { 
    ChevronLeft, MapPin, Clock, Star, DollarSign, 
    BookOpen, MessageSquare, FileEdit, Video, MessageCircle,
    Calendar, Award, ExternalLink, GraduationCap, Languages,
    Verified, Globe, Mail, Phone, CheckCircle, AlertCircle,
    Users, Trophy
} from 'lucide-react';

interface Profile {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    location: string;
    timezone: string;
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
    tier: string;
    tierName: string;
    specializations: Array<{
        id: string;
        name: string;
        category: string;
        description: string;
        proficiency_level: string;
        years_experience: number;
    }>;
    reviews: Array<{
        rating: number;
        review_text: string;
        service_type: string;
        created_at: string;
        reviewer_username: string;
    }>;
    achievements: Array<{
        id: string;
        title: string;
        description: string;
        achievement_type: string;
        issuer: string;
        issued_date: string;
        is_verified: boolean;
    }>;
    portfolio: Array<{
        id: string;
        title: string;
        description: string;
        item_type: string;
        url: string;
        tags: string[];
    }>;
}

const ProfileViewPage: React.FC = () => {
    const { profileId } = useParams<{ profileId: string }>();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (profileId) {
            fetchProfile();
        }
    }, [profileId]);

    const fetchProfile = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiClient.get(`/api/profiles/${profileId}`);
            setProfile(response.data);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const requestSession = (serviceType: string) => {
        navigate(`/session/request/${profileId}?type=${serviceType}`);
    };

    const sendMessage = () => {
        navigate(`/messages/compose?to=${profileId}`);
    };

    const getServiceIcons = () => {
        if (!profile) return [];
        const services = [];
        if (profile.is_mentor) services.push({ icon: BookOpen, label: 'Mentoring', type: 'mentoring' });
        if (profile.is_counselor) services.push({ icon: MessageSquare, label: 'Counseling', type: 'counseling' });
        if (profile.is_essay_editor) services.push({ icon: FileEdit, label: 'Essay Editing', type: 'essay_editing' });
        return services;
    };

    const getAvailabilityColor = (status: string) => {
        switch (status) {
            case 'available': return 'text-green-400 bg-green-400';
            case 'busy': return 'text-yellow-400 bg-yellow-400';
            case 'offline': return 'text-slate-500 bg-slate-500';
            default: return 'text-slate-400 bg-slate-400';
        }
    };

    const getRatingStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-slate-600'}`} 
            />
        ));
    };

    const formatEducationLevel = (level: string) => {
        const levels = {
            'high_school': 'High School',
            'bachelor': "Bachelor's Degree",
            'master': "Master's Degree",
            'phd': 'PhD',
            'professional': 'Professional Certification'
        };
        return levels[level as keyof typeof levels] || level;
    };

    const groupSpecializationsByCategory = () => {
        if (!profile?.specializations) return {};
        
        return profile.specializations.reduce((acc, spec) => {
            if (!acc[spec.category]) acc[spec.category] = [];
            acc[spec.category].push(spec);
            return acc;
        }, {} as Record<string, typeof profile.specializations>);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a091a] flex items-center justify-center">
                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                        <p>Loading profile...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[#0a091a] flex items-center justify-center">
                <Card className="bg-slate-900/40 backdrop-blur-lg border border-red-700/80 text-white max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
                        <p className="text-slate-400 mb-4">{error}</p>
                        <Button onClick={() => navigate('/profiles/search')} variant="outline">
                            Back to Search
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const services = getServiceIcons();
    const specializationsByCategory = groupSpecializationsByCategory();

    return (
        <div className="min-h-screen bg-[#0a091a] text-white font-sans">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <div className="relative z-10 container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Back Button */}
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate(-1)}
                        className="text-slate-400 hover:text-white mb-6"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>

                    {/* Profile Header */}
                    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 mb-8">
                        <CardContent className="p-8">
                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                {/* Profile Image Placeholder */}
                                <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Users className="h-16 w-16 text-slate-500" />
                                </div>

                                {/* Profile Info */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                                            {profile.verified_mentor && (
                                                <Verified className="h-6 w-6 text-cyan-400" />
                                            )}
                                            <TierBadge tier={profile.tier as any} tierName={profile.tierName} />
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-slate-400">
                                            <div className={`flex items-center gap-2 ${getAvailabilityColor(profile.availability_status).split(' ')[0]}`}>
                                                <span className={`w-3 h-3 rounded-full ${getAvailabilityColor(profile.availability_status).split(' ')[1]}`}></span>
                                                {profile.availability_status.charAt(0).toUpperCase() + profile.availability_status.slice(1)}
                                            </div>
                                            {profile.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {profile.location}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {profile.years_experience} years experience
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rating and Stats */}
                                    <div className="flex items-center gap-6">
                                        {profile.total_reviews > 0 && (
                                            <div className="flex items-center gap-2">
                                                <div className="flex">{getRatingStars(profile.average_rating)}</div>
                                                <span className="text-lg font-semibold">{profile.average_rating.toFixed(1)}</span>
                                                <span className="text-slate-400">({profile.total_reviews} reviews)</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Users className="h-4 w-4" />
                                            {profile.total_sessions} sessions completed
                                        </div>
                                    </div>

                                    {/* Services */}
                                    <div className="flex flex-wrap gap-3">
                                        {services.map(service => {
                                            const Icon = service.icon;
                                            return (
                                                <Badge key={service.type} className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-3 py-1">
                                                    <Icon className="h-4 w-4 mr-2" />
                                                    {service.label}
                                                </Badge>
                                            );
                                        })}
                                    </div>

                                    {/* Rates */}
                                    <div className="flex items-center gap-6">
                                        {profile.hourly_rate_sparks > 0 && (
                                            <div className="flex items-center gap-2 text-yellow-400">
                                                <DollarSign className="h-5 w-5" />
                                                <span className="text-xl font-semibold">{profile.hourly_rate_sparks}</span>
                                                <span className="text-slate-400">Sparks/hour</span>
                                            </div>
                                        )}
                                        {profile.hourly_rate_usd > 0 && (
                                            <div className="flex items-center gap-2 text-green-400">
                                                <DollarSign className="h-5 w-5" />
                                                <span className="text-xl font-semibold">${profile.hourly_rate_usd}</span>
                                                <span className="text-slate-400">USD/hour</span>
                                            </div>
                                        )}
                                        {profile.hourly_rate_sparks === 0 && profile.hourly_rate_usd === 0 && (
                                            <div className="text-cyan-400 text-lg font-semibold">Free for Ascendant members</div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-3 lg:flex-shrink-0">
                                    {services.map(service => (
                                        <Button
                                            key={service.type}
                                            onClick={() => requestSession(service.type)}
                                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"
                                        >
                                            <Video className="h-4 w-4 mr-2" />
                                            Book {service.label}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        onClick={sendMessage}
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        Send Message
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {['overview', 'specializations', 'reviews', 'portfolio', 'achievements'].map(tab => (
                            <Button
                                key={tab}
                                variant={activeTab === tab ? 'default' : 'outline'}
                                onClick={() => setActiveTab(tab)}
                                className={activeTab === tab ? 'bg-cyan-500 text-slate-900' : 'border-slate-600 text-slate-300'}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Bio */}
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader>
                                    <CardTitle>About {profile.display_name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-300 whitespace-pre-wrap">{profile.bio}</p>
                                </CardContent>
                            </Card>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardContent className="p-4 text-center">
                                        <GraduationCap className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                                        <p className="text-lg font-semibold">{formatEducationLevel(profile.education_level)}</p>
                                        <p className="text-sm text-slate-400">Education</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardContent className="p-4 text-center">
                                        <Languages className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                                        <p className="text-lg font-semibold">{profile.languages.length}</p>
                                        <p className="text-sm text-slate-400">Languages</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardContent className="p-4 text-center">
                                        <Trophy className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                                        <p className="text-lg font-semibold">{profile.specializations.length}</p>
                                        <p className="text-sm text-slate-400">Specializations</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardContent className="p-4 text-center">
                                        <Globe className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                                        <p className="text-lg font-semibold">{profile.timezone}</p>
                                        <p className="text-sm text-slate-400">Timezone</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Languages */}
                            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Languages className="h-5 w-5 text-cyan-400" />
                                        Languages Spoken
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.languages.map(language => (
                                            <Badge key={language} variant="secondary" className="bg-slate-700 text-slate-300">
                                                {language}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'specializations' && (
                        <div className="space-y-6">
                            {Object.entries(specializationsByCategory).map(([category, specs]) => (
                                <Card key={category} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardHeader>
                                        <CardTitle className="capitalize">{category.replace('_', ' ')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {specs.map(spec => (
                                                <div key={spec.id} className="p-4 bg-slate-800/50 rounded-lg">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-lg">{spec.name}</h4>
                                                        <div className="flex gap-2">
                                                            <Badge variant="outline" className="border-cyan-500 text-cyan-300">
                                                                {spec.proficiency_level}
                                                            </Badge>
                                                            <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                                {spec.years_experience}y exp
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-400 text-sm">{spec.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="space-y-4">
                            {profile.reviews.length > 0 ? (
                                profile.reviews.map((review, index) => (
                                    <Card key={index} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                                                        {review.reviewer_username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{review.reviewer_username}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex">{getRatingStars(review.rating)}</div>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {review.service_type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-400">
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <p className="text-slate-300">{review.review_text}</p>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-center py-12">
                                    <CardContent>
                                        <Star className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                                        <p className="text-slate-400">No reviews yet</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'portfolio' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {profile.portfolio.length > 0 ? (
                                profile.portfolio.map(item => (
                                    <Card key={item.id} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                {item.title}
                                                {item.url && (
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </CardTitle>
                                            <CardDescription>{item.item_type}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-slate-300 mb-3">{item.description}</p>
                                            {item.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.tags.map(tag => (
                                                        <Badge key={tag} variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-center py-12 md:col-span-2">
                                    <CardContent>
                                        <Award className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                                        <p className="text-slate-400">No portfolio items yet</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        <div className="space-y-4">
                            {profile.achievements.length > 0 ? (
                                profile.achievements.map(achievement => (
                                    <Card key={achievement.id} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-cyan-500/20 rounded-lg">
                                                    <Award className="h-6 w-6 text-cyan-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-lg">{achievement.title}</h4>
                                                        {achievement.is_verified && (
                                                            <CheckCircle className="h-4 w-4 text-green-400" />
                                                        )}
                                                    </div>
                                                    <p className="text-slate-400 text-sm mb-2">
                                                        {achievement.issuer} • {new Date(achievement.issued_date).getFullYear()}
                                                    </p>
                                                    <p className="text-slate-300">{achievement.description}</p>
                                                    <Badge variant="outline" className="mt-2 border-slate-600 text-slate-400">
                                                        {achievement.achievement_type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-center py-12">
                                    <CardContent>
                                        <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-500" />
                                        <p className="text-slate-400">No achievements yet</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileViewPage;