import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AccomplishmentsShowcase from '../components/portfolio/AccomplishmentsShowcase';
import PortfolioShowcase from '../components/portfolio/PortfolioShowcase';
import EnhancedSessionBooking from '../components/EnhancedSessionBooking';
import {
    User,
    GraduationCap,
    Users,
    Heart,
    BarChart3,
    Zap,
    Star,
    Calendar,
    ExternalLink,
    ArrowLeft,
    MessageSquare,
    BookOpen,
    Award,
    MapPin,
    Clock,
    DollarSign,
    Globe,
    Mail,
    Phone
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

interface PublicTeacherProfileData {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    location: string;
    user_tier: string;
    ascendia_score: number;
    pillar_academic: number;
    pillar_community: number;
    pillar_mentorship: number;
    pillar_analytical: number;
    is_mentor: boolean;
    total_sessions: number;
    average_rating: number;
    calendly_url: string;
    hourly_rate_usd: number;
    years_experience: number;
    education_level: string;
    languages: string[];
    availability_status: string;
    profile_image_url?: string;
    specializations?: string[];
    website_url?: string;
    linkedin_url?: string;
    public_email?: string;
}

const PublicTeacherProfile: React.FC = () => {
    const { teacherId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<PublicTeacherProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);

    useEffect(() => {
        if (teacherId) {
            fetchPublicProfile();
        }
    }, [teacherId]);

    const fetchPublicProfile = async () => {
        try {
            setIsLoading(true);

            // Mock data for development - replace with actual API call
            const mockProfile: PublicTeacherProfileData = {
                id: teacherId || '1',
                username: 'sarah_chen_dev',
                display_name: 'Sarah Chen',
                bio: 'Senior Full-Stack Developer and Technical Mentor with 8+ years of experience. Passionate about helping students transition into tech careers through practical, project-based learning. Specialized in React, Node.js, and modern web development practices.',
                location: 'San Francisco, CA',
                user_tier: 'Gold',
                ascendia_score: 2847,
                pillar_academic: 92,
                pillar_community: 88,
                pillar_mentorship: 95,
                pillar_analytical: 87,
                is_mentor: true,
                total_sessions: 156,
                average_rating: 4.9,
                calendly_url: 'https://calendly.com/sarah-chen-mentor/30min',
                hourly_rate_usd: 75,
                years_experience: 8,
                education_level: 'Master\'s Degree',
                languages: ['English', 'Mandarin', 'Spanish'],
                availability_status: 'available',
                specializations: ['React Development', 'Full-Stack Architecture', 'Career Mentoring', 'Technical Interviews'],
                website_url: 'https://sarahchen.dev',
                linkedin_url: 'https://linkedin.com/in/sarahchen-dev',
                public_email: 'mentor@sarahchen.dev'
            };

            setProfile(mockProfile);
        } catch (error: any) {
            console.error('Error fetching public profile:', error);
            toast.error('Failed to load teacher profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookSession = () => {
        setShowBookingModal(true);
    };

    const handleContactTeacher = () => {
        setShowContactModal(true);
    };

    const getAvailabilityColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-green-500';
            case 'busy': return 'bg-yellow-500';
            case 'unavailable': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getAvailabilityText = (status: string) => {
        switch (status) {
            case 'available': return 'Available for Sessions';
            case 'busy': return 'Limited Availability';
            case 'unavailable': return 'Currently Unavailable';
            default: return 'Status Unknown';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                        <span className="ml-3 text-white">Loading teacher profile...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
                <div className="max-w-6xl mx-auto">
                    <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                        <CardContent className="p-8 text-center">
                            <User className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2">Teacher Not Found</h2>
                            <p className="text-slate-300 mb-6">
                                The teacher profile you're looking for doesn't exist or is not public.
                            </p>
                            <Button onClick={() => navigate('/teachers/search')} className="bg-blue-600 hover:bg-blue-700">
                                <Users className="h-4 w-4 mr-2" />
                                Browse Teachers
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="ghost"
                        className="text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white">Teacher Profile</h1>
                        <p className="text-slate-300">Discover expertise and book sessions</p>
                    </div>
                </div>

                {/* Main Profile Card */}
                <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column - Basic Info */}
                            <div className="lg:col-span-1">
                                <div className="text-center mb-6">
                                    <Avatar className="h-32 w-32 mx-auto mb-4 border-4 border-slate-600">
                                        <AvatarImage src={profile.profile_image_url || `/api/avatars/${profile.id}`} />
                                        <AvatarFallback className="bg-slate-700 text-white text-4xl">
                                            {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {profile.display_name || profile.username}
                                    </h2>

                                    <div className="flex items-center justify-center gap-3 mb-4">
                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                            <GraduationCap className="h-3 w-3 mr-1" />
                                            Teacher
                                        </Badge>
                                        {profile.is_mentor && (
                                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                                <Users className="h-3 w-3 mr-1" />
                                                Mentor
                                            </Badge>
                                        )}
                                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                            {profile.user_tier}
                                        </Badge>
                                    </div>

                                    {/* Availability Status */}
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(profile.availability_status)}`}></div>
                                        <span className="text-sm text-slate-300">
                                            {getAvailabilityText(profile.availability_status)}
                                        </span>
                                    </div>

                                    {/* P-Score */}
                                    <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                                        <div className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-300 mb-2">
                                            <Zap className="h-6 w-6" />
                                            {profile.ascendia_score}
                                        </div>
                                        <div className="text-sm text-slate-400">P-Score</div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        <Button
                                            onClick={handleBookSession}
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            disabled={profile.availability_status === 'unavailable'}
                                        >
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Book Session
                                        </Button>

                                        <Button
                                            onClick={handleContactTeacher}
                                            variant="outline"
                                            className="w-full border-slate-600 text-white hover:bg-slate-800"
                                        >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Contact Teacher
                                        </Button>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                                        <Users className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                                        <div className="text-lg font-bold">{profile.total_sessions}</div>
                                        <div className="text-xs text-slate-400">Sessions</div>
                                    </div>
                                    <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                                        <Star className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                                        <div className="text-lg font-bold">{profile.average_rating}</div>
                                        <div className="text-xs text-slate-400">Rating</div>
                                    </div>
                                    <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                                        <Clock className="h-5 w-5 text-green-400 mx-auto mb-1" />
                                        <div className="text-lg font-bold">{profile.years_experience}</div>
                                        <div className="text-xs text-slate-400">Years Exp</div>
                                    </div>
                                    <div className="bg-slate-800/30 rounded-lg p-3 text-center">
                                        <DollarSign className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                                        <div className="text-lg font-bold">${profile.hourly_rate_usd}</div>
                                        <div className="text-xs text-slate-400">Per Hour</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Detailed Info */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Bio */}
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        About {profile.display_name?.split(' ')[0] || 'Teacher'}
                                    </h3>
                                    <p className="text-slate-300 leading-relaxed">{profile.bio}</p>
                                </div>

                                {/* P-Score Breakdown */}
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-yellow-400" />
                                        P-Score Breakdown
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GraduationCap className="h-5 w-5 text-blue-400" />
                                                <span className="text-slate-300">Academic</span>
                                            </div>
                                            <div className="text-2xl font-bold text-blue-300">{profile.pillar_academic}</div>
                                            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                                <div className="bg-blue-400 h-2 rounded-full" style={{width: `${profile.pillar_academic}%`}}></div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users className="h-5 w-5 text-green-400" />
                                                <span className="text-slate-300">Community</span>
                                            </div>
                                            <div className="text-2xl font-bold text-green-300">{profile.pillar_community}</div>
                                            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                                <div className="bg-green-400 h-2 rounded-full" style={{width: `${profile.pillar_community}%`}}></div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Heart className="h-5 w-5 text-pink-400" />
                                                <span className="text-slate-300">Mentorship</span>
                                            </div>
                                            <div className="text-2xl font-bold text-pink-300">{profile.pillar_mentorship}</div>
                                            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                                <div className="bg-pink-400 h-2 rounded-full" style={{width: `${profile.pillar_mentorship}%`}}></div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <BarChart3 className="h-5 w-5 text-purple-400" />
                                                <span className="text-slate-300">Analytical</span>
                                            </div>
                                            <div className="text-2xl font-bold text-purple-300">{profile.pillar_analytical}</div>
                                            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                                <div className="bg-purple-400 h-2 rounded-full" style={{width: `${profile.pillar_analytical}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Specializations */}
                                {profile.specializations && profile.specializations.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                            <Award className="h-5 w-5 text-purple-400" />
                                            Specializations
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.specializations.map((spec, index) => (
                                                <Badge
                                                    key={index}
                                                    className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1"
                                                >
                                                    {spec}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Languages & Additional Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-md font-medium text-white mb-2 flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            Languages
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                            {profile.languages.map((lang, index) => (
                                                <Badge key={index} variant="outline" className="border-slate-600 text-slate-300">
                                                    {lang}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-md font-medium text-white mb-2 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Details
                                        </h4>
                                        <div className="space-y-1 text-sm text-slate-300">
                                            <div>{profile.location}</div>
                                            <div>{profile.education_level}</div>
                                            {profile.website_url && (
                                                <a
                                                    href={profile.website_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Website
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Portfolio & Accomplishments */}
                <AccomplishmentsShowcase teacherId={profile.id} isOwnProfile={false} />
                <PortfolioShowcase teacherId={profile.id} isOwnProfile={false} />
            </div>

            {/* Enhanced Session Booking Modal */}
            <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
                    <EnhancedSessionBooking
                        teacher={{
                            id: profile.id,
                            username: profile.username,
                            display_name: profile.display_name,
                            bio: profile.bio,
                            calendly_url: profile.calendly_url,
                            session_rate_min_usd: 25,
                            session_rate_max_usd: profile.hourly_rate_usd || 100,
                            average_rating: profile.average_rating,
                            total_reviews: 0,
                            total_sessions: profile.total_sessions,
                            years_experience: profile.years_experience
                        }}
                        onBookingComplete={(data) => {
                            console.log('Booking completed:', data);
                            setShowBookingModal(false);
                            toast.success('Session request sent successfully!');
                        }}
                        onCancel={() => setShowBookingModal(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PublicTeacherProfile;