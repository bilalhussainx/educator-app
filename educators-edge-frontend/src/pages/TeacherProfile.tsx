import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
    User, 
    Edit3, 
    Save, 
    X, 
    GraduationCap, 
    Users, 
    Heart, 
    BarChart3, 
    Zap, 
    Star,
    Calendar,
    Trash2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';
import AccomplishmentsShowcase from '../components/portfolio/AccomplishmentsShowcase';
import PortfolioShowcase from '../components/portfolio/PortfolioShowcase';

interface TeacherProfileData {
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
    is_searchable_teacher: boolean;
    total_sessions: number;
    average_rating: number;
    calendly_url: string;
    hourly_rate_usd: number;
    years_experience: number;
    education_level: string;
    languages: string[];
    availability_status: string;
}

const TeacherProfile: React.FC = () => {
    const [profile, setProfile] = useState<TeacherProfileData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editForm, setEditForm] = useState({
        display_name: '',
        bio: '',
        location: '',
        calendly_url: '',
        hourly_rate_usd: 0,
        years_experience: 0,
        education_level: '',
        languages: '',
        availability_status: 'available',
        is_mentor: false,
        is_searchable_teacher: true
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('/api/profiles/');
            if (response.data.success !== false) {
                const profileData = response.data;
                setProfile(profileData);
                setEditForm({
                    display_name: profileData.display_name || '',
                    bio: profileData.bio || '',
                    location: profileData.location || '',
                    calendly_url: profileData.calendly_url || '',
                    hourly_rate_usd: profileData.hourly_rate_usd || 0,
                    years_experience: profileData.years_experience || 0,
                    education_level: profileData.education_level || '',
                    languages: Array.isArray(profileData.languages) ? profileData.languages.join(', ') : '',
                    availability_status: profileData.availability_status || 'available',
                    is_mentor: profileData.is_mentor || false,
                    is_searchable_teacher: profileData.is_searchable_teacher !== false
                });
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error('Access denied: Only teachers can manage profiles.');
            } else {
                console.error('Error fetching profile:', error);
                toast.error('Failed to load profile');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const response = await apiClient.put('/api/profiles/update', {
                ...editForm,
                languages: editForm.languages.split(',').map(lang => lang.trim()).filter(lang => lang)
            });
            
            if (response.data.success !== false) {
                toast.success('Profile updated successfully!');
                setIsEditing(false);
                await fetchProfile();
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error('Access denied: Only teachers can manage profiles.');
            } else {
                console.error('Error updating profile:', error);
                toast.error(error.response?.data?.error || 'Failed to update profile');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await apiClient.delete('/api/profiles/');
            if (response.data.success !== false) {
                toast.success('Profile deleted successfully!');
                setShowDeleteDialog(false);
                setProfile(null);
            }
        } catch (error: any) {
            console.error('Error deleting profile:', error);
            toast.error('Failed to delete profile');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                        <span className="ml-3 text-white">Loading profile...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                        <CardContent className="p-8 text-center">
                            <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2">No Profile Found</h2>
                            <p className="text-slate-300 mb-6">
                                You don't have a teacher profile yet. Create one to be discovered by students.
                            </p>
                            <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                                <User className="h-4 w-4 mr-2" />
                                Create Profile
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-white">Teacher Profile</h1>
                    <div className="flex gap-2">
                        {!isEditing && (
                            <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </div>

                {/* Profile Card */}
                <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border-2 border-slate-600">
                                <AvatarImage src={`/api/avatars/${profile.id}`} />
                                <AvatarFallback className="bg-slate-700 text-white text-2xl">
                                    {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Input
                                            value={editForm.display_name}
                                            onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                                            placeholder="Display Name"
                                            className="bg-slate-800 border-slate-600 text-white"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <CardTitle className="text-2xl text-white">
                                            {profile.display_name || profile.username}
                                        </CardTitle>
                                        <div className="flex items-center gap-3 mt-2">
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
                                    </>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-xl font-bold text-yellow-300">
                                    <Zap className="h-5 w-5" />
                                    {profile.ascendia_score}
                                </div>
                                <div className="text-sm text-slate-400">P-Score</div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Bio */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                About
                            </h3>
                            {isEditing ? (
                                <Textarea
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                                    placeholder="Tell students about yourself..."
                                    className="bg-slate-800 border-slate-600 text-white min-h-[100px]"
                                />
                            ) : (
                                <p className="text-slate-300">{profile.bio || 'No bio available'}</p>
                            )}
                        </div>

                        {/* P-Score Breakdown */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-400" />
                                P-Score Breakdown
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <GraduationCap className="h-4 w-4 text-blue-400" />
                                        <span className="text-sm text-slate-300">Academic</span>
                                    </div>
                                    <div className="text-xl font-bold text-blue-300">{profile.pillar_academic}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="h-4 w-4 text-green-400" />
                                        <span className="text-sm text-slate-300">Community</span>
                                    </div>
                                    <div className="text-xl font-bold text-green-300">{profile.pillar_community}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Heart className="h-4 w-4 text-pink-400" />
                                        <span className="text-sm text-slate-300">Mentorship</span>
                                    </div>
                                    <div className="text-xl font-bold text-pink-300">{profile.pillar_mentorship}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BarChart3 className="h-4 w-4 text-purple-400" />
                                        <span className="text-sm text-slate-300">Analytical</span>
                                    </div>
                                    <div className="text-xl font-bold text-purple-300">{profile.pillar_analytical}</div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Details */}
                        {isEditing && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                                    <Input
                                        value={editForm.location}
                                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                        placeholder="Your location"
                                        className="bg-slate-800 border-slate-600 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Calendly URL</label>
                                    <Input
                                        value={editForm.calendly_url}
                                        onChange={(e) => setEditForm({...editForm, calendly_url: e.target.value})}
                                        placeholder="https://calendly.com/your-username/30min"
                                        className="bg-slate-800 border-slate-600 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                                    <Input
                                        type="number"
                                        value={editForm.years_experience}
                                        onChange={(e) => setEditForm({...editForm, years_experience: parseInt(e.target.value) || 0})}
                                        className="bg-slate-800 border-slate-600 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Education Level</label>
                                    <Select value={editForm.education_level} onValueChange={(value) => setEditForm({...editForm, education_level: value})}>
                                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                            <SelectValue placeholder="Select education level" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600">
                                            <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                                            <SelectItem value="master">Master's Degree</SelectItem>
                                            <SelectItem value="phd">PhD</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {isEditing && (
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                                <Button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button 
                                    onClick={() => setIsEditing(false)} 
                                    variant="outline"
                                    className="border-slate-600 text-white hover:bg-slate-800"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/10 ml-auto">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Profile
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                                        <DialogHeader>
                                            <DialogTitle className="text-red-400">Delete Profile</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <p>Are you sure you want to delete your teacher profile? This action cannot be undone.</p>
                                            <div className="flex gap-3">
                                                <Button 
                                                    onClick={handleDelete}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Yes, Delete
                                                </Button>
                                                <Button 
                                                    onClick={() => setShowDeleteDialog(false)}
                                                    variant="outline"
                                                    className="border-slate-600"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Statistics */}
                {!isEditing && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                            <CardContent className="p-4 text-center">
                                <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{profile.total_sessions || 0}</div>
                                <div className="text-sm text-slate-400">Total Sessions</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                            <CardContent className="p-4 text-center">
                                <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{profile.average_rating && profile.average_rating > 0 ? Number(profile.average_rating).toFixed(1) : 'N/A'}</div>
                                <div className="text-sm text-slate-400">Average Rating</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                            <CardContent className="p-4 text-center">
                                <Calendar className="h-8 w-8 text-green-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{profile.calendly_url ? 'Active' : 'None'}</div>
                                <div className="text-sm text-slate-400">Booking Calendar</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Portfolio & Accomplishments Sections (Only shown when NOT editing) */}
                {!isEditing && (
                    <>
                        {/* Accomplishments Showcase */}
                        <AccomplishmentsShowcase isOwnProfile={true} />

                        {/* Portfolio Showcase */}
                        <PortfolioShowcase isOwnProfile={true} />
                    </>
                )}
            </div>
        </div>
    );
};

export default TeacherProfile;