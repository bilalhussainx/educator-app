import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '../services/apiClient';
import { 
    User, DollarSign, 
    BookOpen, MessageSquare, FileEdit, Save, Plus, X, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle, Star, Briefcase, Globe, Target, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Specialization {
    id: string;
    name: string;
    category: string;
    description: string;
}

interface UserSpecialization {
    specialization_id: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    years_experience: number;
}

interface ProfileFormData {
    // Step 1: Basic Info
    display_name: string;
    bio: string;
    location: string;
    timezone: string;
    
    // Step 2: Professional Background
    years_experience: number;
    education_level: 'high_school' | 'bachelor' | 'master' | 'phd' | 'professional';
    languages: string[];
    
    // Step 3: Services Offered
    is_mentor: boolean;
    is_counselor: boolean;
    is_essay_editor: boolean;
    hourly_rate_sparks: number;
    hourly_rate_usd: number;
    
    // Step 4: Specializations
    specializations: UserSpecialization[];
}

const STEPS = [
    { id: 1, name: 'Basic Info', description: 'Tell us about yourself' },
    { id: 2, name: 'Background', description: 'Your professional experience' },
    { id: 3, name: 'Services', description: 'What do you want to offer?' },
    { id: 4, name: 'Expertise', description: 'Your areas of specialization' }
];

const EDUCATION_LEVELS = [
    { value: 'high_school', label: 'High School' },
    { value: 'bachelor', label: "Bachelor's Degree" },
    { value: 'master', label: "Master's Degree" },
    { value: 'phd', label: 'PhD' },
    { value: 'professional', label: 'Professional Certification' }
];

const PROFICIENCY_LEVELS = [
    { value: 'beginner', label: 'Beginner', color: 'bg-red-500/10 text-red-300 border-red-500/30' },
    { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' },
    { value: 'advanced', label: 'Advanced', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
    { value: 'expert', label: 'Expert', color: 'bg-green-500/10 text-green-300 border-green-500/30' }
];

const ProfileSetupPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    // Form data
    const [formData, setFormData] = useState<ProfileFormData>({
        display_name: '',
        bio: '',
        location: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        years_experience: 0,
        education_level: 'bachelor',
        languages: ['English'],
        is_mentor: false,
        is_counselor: false,
        is_essay_editor: false,
        hourly_rate_sparks: 0,
        hourly_rate_usd: 0,
        specializations: []
    });

    // Available specializations
    const [availableSpecializations, setAvailableSpecializations] = useState<Specialization[]>([]);
    const [newLanguage, setNewLanguage] = useState('');

    // Load existing profile and specializations
    useEffect(() => {
        fetchProfile();
        fetchSpecializations();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await apiClient.get('/api/profiles/');
            if (response.data.display_name) {
                setFormData(prev => ({
                    ...prev,
                    display_name: response.data.display_name || '',
                    bio: response.data.bio || '',
                    location: response.data.location || '',
                    timezone: response.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    is_mentor: response.data.is_mentor || false,
                    is_counselor: response.data.is_counselor || false,
                    is_essay_editor: response.data.is_essay_editor || false,
                    hourly_rate_sparks: response.data.hourly_rate_z_credits || 0,
                    hourly_rate_usd: response.data.hourly_rate_usd || 0,
                    years_experience: response.data.years_experience || 0,
                    education_level: response.data.education_level || 'bachelor',
                    languages: response.data.languages || ['English'],
                    specializations: response.data.specializations?.map((spec: any) => ({
                        specialization_id: spec.id,
                        proficiency_level: spec.proficiency_level,
                        years_experience: spec.years_experience
                    })) || []
                }));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchSpecializations = async () => {
        try {
            const response = await apiClient.get('/api/profiles/data/specializations');
            setAvailableSpecializations(response.data.specializations);
        } catch (error) {
            console.error('Error fetching specializations:', error);
        }
    };

    const updateFormData = (field: keyof ProfileFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const addLanguage = () => {
        if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
            updateFormData('languages', [...formData.languages, newLanguage.trim()]);
            setNewLanguage('');
        }
    };

    const removeLanguage = (language: string) => {
        if (formData.languages.length > 1) {
            updateFormData('languages', formData.languages.filter(lang => lang !== language));
        }
    };

    const addSpecialization = (specializationId: string) => {
        if (!formData.specializations.find(spec => spec.specialization_id === specializationId)) {
            const newSpec: UserSpecialization = {
                specialization_id: specializationId,
                proficiency_level: 'intermediate',
                years_experience: 1
            };
            updateFormData('specializations', [...formData.specializations, newSpec]);
        }
    };

    const updateSpecialization = (specializationId: string, field: string, value: any) => {
        const updatedSpecs = formData.specializations.map(spec => 
            spec.specialization_id === specializationId 
                ? { ...spec, [field]: value }
                : spec
        );
        updateFormData('specializations', updatedSpecs);
    };

    const removeSpecialization = (specializationId: string) => {
        updateFormData('specializations', 
            formData.specializations.filter(spec => spec.specialization_id !== specializationId)
        );
    };

    const validateCurrentStep = (): boolean => {
        switch (currentStep) {
            case 1:
                return formData.display_name.trim() !== '' && formData.bio.trim() !== '';
            case 2:
                return formData.languages.length > 0;
            case 3:
                return formData.is_mentor || formData.is_counselor || formData.is_essay_editor;
            case 4:
                return true; // Specializations are optional
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateCurrentStep() && currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Map form data to API format
            const profileData = {
                display_name: formData.display_name,
                bio: formData.bio,
                location: formData.location,
                timezone: formData.timezone,
                is_mentor: formData.is_mentor,
                is_counselor: formData.is_counselor,
                is_essay_editor: formData.is_essay_editor,
                hourly_rate_z_credits: formData.hourly_rate_sparks,
                hourly_rate_usd: formData.hourly_rate_usd,
                years_experience: formData.years_experience,
                education_level: formData.education_level,
                languages: formData.languages,
                availability_status: 'available',
                // Make profile searchable if they offer any services
                is_searchable_teacher: formData.is_mentor || formData.is_counselor || formData.is_essay_editor
            };

            // Update profile
            await apiClient.put('/api/profiles/update', profileData);
            
            // Update specializations if any
            if (formData.specializations.length > 0) {
                await apiClient.put('/api/profiles/specializations/update', {
                    specializations: formData.specializations
                });
            }

            setSuccess(true);

            // Mark profile as completed in localStorage for faster first-load detection
            // Get user ID from auth token
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    const { jwtDecode } = await import('jwt-decode');
                    const decoded: any = jwtDecode(token);
                    const userId = decoded?.user?.id;
                    if (userId) {
                        localStorage.setItem(`profile_completed_${userId}`, 'true');
                    }
                } catch (err) {
                    console.error('Error decoding token:', err);
                }
            }

            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const getStepProgress = () => ((currentStep - 1) / (STEPS.length - 1)) * 100;

    const categorizedSpecializations = availableSpecializations.reduce((acc, spec) => {
        if (!acc[spec.category]) acc[spec.category] = [];
        acc[spec.category].push(spec);
        return acc;
    }, {} as Record<string, Specialization[]>);

    const getSpecializationName = (id: string) => {
        return availableSpecializations.find(spec => spec.id === id)?.name || 'Unknown';
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Card className="bg-slate-900/90 backdrop-blur-lg border border-green-500/30 text-white max-w-md w-full mx-4">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-400" />
                        </div>
                        <CardTitle className="text-2xl text-green-400 font-bold">Profile Complete!</CardTitle>
                        <CardDescription className="text-slate-300 text-base">
                            Your mentor profile has been successfully created. You're now ready to help students on their learning journey.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <User className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Tell Us About Yourself</h2>
                            <p className="text-slate-400">Let's start with the basics so students can get to know you</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="display_name" className="text-white text-base font-medium mb-2 block">
                                    Display Name *
                                </Label>
                                <Input
                                    id="display_name"
                                    value={formData.display_name}
                                    onChange={e => updateFormData('display_name', e.target.value)}
                                    className="bg-slate-800/50 border-slate-600 text-white h-12 text-base placeholder:text-slate-400"
                                    placeholder="How should students address you?"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="bio" className="text-white text-base font-medium mb-2 block">
                                    Bio / Introduction *
                                </Label>
                                <textarea
                                    id="bio"
                                    value={formData.bio}
                                    onChange={e => updateFormData('bio', e.target.value)}
                                    className="w-full p-4 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-base placeholder-slate-400 min-h-[120px] resize-none"
                                    placeholder="Tell students about your background, experience, and teaching approach. What makes you passionate about helping others learn?"
                                    required
                                />
                                <p className="text-sm text-slate-400 mt-2">
                                    {formData.bio.length}/500 characters
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="location" className="text-white text-base font-medium mb-2 block">
                                    Location
                                </Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={e => updateFormData('location', e.target.value)}
                                    className="bg-slate-800/50 border-slate-600 text-white h-12 text-base placeholder:text-slate-400"
                                    placeholder="City, Country (optional)"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <Briefcase className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Professional Background</h2>
                            <p className="text-slate-400">Help students understand your experience and credentials</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="years_experience" className="text-white text-base font-medium mb-2 block">
                                    Years of Experience
                                </Label>
                                <Input
                                    id="years_experience"
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={formData.years_experience}
                                    onChange={e => updateFormData('years_experience', parseInt(e.target.value) || 0)}
                                    className="bg-slate-800/50 border-slate-600 text-white h-12 text-base"
                                />
                            </div>
                            <div>
                                <Label htmlFor="education_level" className="text-white text-base font-medium mb-2 block">
                                    Education Level
                                </Label>
                                <select
                                    id="education_level"
                                    value={formData.education_level}
                                    onChange={e => updateFormData('education_level', e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-base focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                >
                                    {EDUCATION_LEVELS.map(level => (
                                        <option key={level.value} value={level.value} className="bg-slate-800">
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label className="text-white text-base font-medium mb-3 block">Languages Spoken *</Label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {formData.languages.map(language => (
                                    <Badge key={language} className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-3 py-1 text-sm flex items-center gap-2">
                                        <Globe className="h-3 w-3" />
                                        {language}
                                        {formData.languages.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeLanguage(language)}
                                                className="hover:text-red-400 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newLanguage}
                                    onChange={e => setNewLanguage(e.target.value)}
                                    placeholder="Add a language"
                                    className="bg-slate-800/50 border-slate-600 text-white h-12 text-base placeholder:text-slate-400"
                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                                />
                                <Button type="button" onClick={addLanguage} className="bg-cyan-500 hover:bg-cyan-600 h-12 px-6">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <Star className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Services You Offer</h2>
                            <p className="text-slate-400">Select the services you want to provide to students</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card 
                                className={cn(
                                    "cursor-pointer transition-all duration-200 border-2 hover:scale-[1.02]",
                                    formData.is_mentor 
                                        ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' 
                                        : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                )} 
                                onClick={() => updateFormData('is_mentor', !formData.is_mentor)}
                            >
                                <CardContent className="p-6 text-center">
                                    <BookOpen className="h-10 w-10 mx-auto mb-4 text-cyan-400" />
                                    <h3 className="text-lg font-semibold text-white mb-2">Mentoring</h3>
                                    <p className="text-sm text-slate-300 mb-4">Computer Science & Technology guidance</p>
                                    {formData.is_mentor && (
                                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Selected
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>

                            <Card 
                                className={cn(
                                    "cursor-pointer transition-all duration-200 border-2 hover:scale-[1.02]",
                                    formData.is_counselor 
                                        ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                                        : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                )} 
                                onClick={() => updateFormData('is_counselor', !formData.is_counselor)}
                            >
                                <CardContent className="p-6 text-center">
                                    <MessageSquare className="h-10 w-10 mx-auto mb-4 text-purple-400" />
                                    <h3 className="text-lg font-semibold text-white mb-2">Counseling</h3>
                                    <p className="text-sm text-slate-300 mb-4">College Prep & Career Guidance</p>
                                    {formData.is_counselor && (
                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Selected
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>

                            <Card 
                                className={cn(
                                    "cursor-pointer transition-all duration-200 border-2 hover:scale-[1.02]",
                                    formData.is_essay_editor 
                                        ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20' 
                                        : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                )} 
                                onClick={() => updateFormData('is_essay_editor', !formData.is_essay_editor)}
                            >
                                <CardContent className="p-6 text-center">
                                    <FileEdit className="h-10 w-10 mx-auto mb-4 text-green-400" />
                                    <h3 className="text-lg font-semibold text-white mb-2">Essay Editing</h3>
                                    <p className="text-sm text-slate-300 mb-4">Academic & College Essays</p>
                                    {formData.is_essay_editor && (
                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Selected
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {(formData.is_mentor || formData.is_counselor || formData.is_essay_editor) && (
                            <Card className="bg-slate-800/30 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-green-400" />
                                        Set Your Rates (Optional)
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Leave as 0 to offer free sessions to students
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="rate_sparks" className="text-white text-base font-medium mb-2 block">
                                            Rate (Sparks per hour)
                                        </Label>
                                        <Input
                                            id="rate_sparks"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={formData.hourly_rate_sparks}
                                            onChange={e => updateFormData('hourly_rate_sparks', parseFloat(e.target.value) || 0)}
                                            className="bg-slate-800/50 border-slate-600 text-white h-12 text-base"
                                            placeholder="0 = Free sessions"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="rate_usd" className="text-white text-base font-medium mb-2 block">
                                            Rate (USD per hour)
                                        </Label>
                                        <Input
                                            id="rate_usd"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.hourly_rate_usd}
                                            onChange={e => updateFormData('hourly_rate_usd', parseFloat(e.target.value) || 0)}
                                            className="bg-slate-800/50 border-slate-600 text-white h-12 text-base"
                                            placeholder="0 = Free sessions"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <Target className="h-12 w-12 text-cyan-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Areas of Expertise</h2>
                            <p className="text-slate-400">Select your specializations to help students find you</p>
                        </div>

                        {/* Current Specializations */}
                        {formData.specializations.length > 0 && (
                            <Card className="bg-slate-800/30 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">Your Specializations</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {formData.specializations.map((spec, index) => {
                                        const profLevel = PROFICIENCY_LEVELS.find(p => p.value === spec.proficiency_level);
                                        return (
                                            <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="font-medium text-white text-base">
                                                        {getSpecializationName(spec.specialization_id)}
                                                    </h5>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSpecialization(spec.specialization_id)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-slate-300 text-sm mb-2 block">Proficiency Level</Label>
                                                        <select
                                                            value={spec.proficiency_level}
                                                            onChange={e => updateSpecialization(spec.specialization_id, 'proficiency_level', e.target.value)}
                                                            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
                                                        >
                                                            {PROFICIENCY_LEVELS.map(level => (
                                                                <option key={level.value} value={level.value} className="bg-slate-800">
                                                                    {level.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <Label className="text-slate-300 text-sm mb-2 block">Years Experience</Label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="30"
                                                            value={spec.years_experience}
                                                            onChange={e => updateSpecialization(spec.specialization_id, 'years_experience', parseInt(e.target.value) || 0)}
                                                            className="bg-slate-800 border-slate-600 text-white text-sm h-10"
                                                        />
                                                    </div>
                                                </div>
                                                {profLevel && (
                                                    <Badge className={cn("mt-2", profLevel.color)}>
                                                        {profLevel.label}
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        )}

                        {/* Add Specializations */}
                        <Card className="bg-slate-800/30 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Add Specializations</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Click on areas where you have expertise
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Object.entries(categorizedSpecializations).map(([category, specs]) => (
                                    <div key={category} className="mb-6">
                                        <h5 className="text-base font-medium text-slate-300 mb-3 capitalize flex items-center gap-2">
                                            <Award className="h-4 w-4" />
                                            {category.replace('_', ' ')}
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {specs.map(spec => {
                                                const isSelected = formData.specializations.some(us => us.specialization_id === spec.id);
                                                return (
                                                    <button
                                                        key={spec.id}
                                                        type="button"
                                                        onClick={() => isSelected ? removeSpecialization(spec.id) : addSpecialization(spec.id)}
                                                        className={cn(
                                                            "p-3 rounded-lg border text-left transition-all duration-200 hover:scale-[1.02]",
                                                            isSelected 
                                                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/10' 
                                                                : 'bg-slate-700/30 text-slate-300 border-slate-600 hover:bg-slate-700/50 hover:border-slate-500'
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-sm">{spec.name}</span>
                                                            {isSelected ? (
                                                                <CheckCircle className="h-4 w-4 text-cyan-400" />
                                                            ) : (
                                                                <Plus className="h-4 w-4 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                            {spec.description}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] opacity-30"></div>
            
            <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
                        Profile Setup
                    </h1>
                    <p className="text-lg text-slate-400 mb-6">
                        Create your mentor profile and start helping students succeed
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md mx-auto">
                        <div className="flex justify-between text-sm text-slate-400 mb-2">
                            <span>Step {currentStep} of {STEPS.length}</span>
                            <span>{Math.round(getStepProgress())}% Complete</span>
                        </div>
                        <Progress value={getStepProgress()} className="h-2" />
                        <div className="flex justify-between mt-3">
                            {STEPS.map(step => (
                                <div key={step.id} className="text-center">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto",
                                        currentStep >= step.id 
                                            ? 'bg-cyan-500 text-white' 
                                            : 'bg-slate-700 text-slate-400'
                                    )}>
                                        {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 hidden sm:block">{step.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <Card className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50">
                    <CardContent className="p-8">
                        {renderStepContent()}

                        {/* Error Display */}
                        {error && (
                            <Alert className="border-red-500/50 bg-red-500/10 mt-6">
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-300 text-base">{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Navigation */}
                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-700">
                            <Button 
                                onClick={prevStep} 
                                disabled={currentStep === 1}
                                variant="outline"
                                className="border-slate-600 hover:bg-slate-700 text-white h-12 px-6"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Previous
                            </Button>

                            <div className="text-center">
                                <p className="text-sm text-slate-400">
                                    {STEPS.find(s => s.id === currentStep)?.description}
                                </p>
                            </div>

                            {currentStep < STEPS.length ? (
                                <Button 
                                    onClick={nextStep} 
                                    disabled={!validateCurrentStep()}
                                    className="bg-cyan-500 hover:bg-cyan-600 h-12 px-6 font-medium"
                                >
                                    Next Step
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={isLoading}
                                    className="bg-green-500 hover:bg-green-600 h-12 px-6 font-medium"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Creating Profile...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Save className="h-4 w-4" />
                                            Complete Profile
                                        </div>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfileSetupPage;