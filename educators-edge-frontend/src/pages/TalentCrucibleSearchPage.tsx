// src/pages/TalentCrucibleSearchPage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    Sparkles,
    Brain,
    Target,
    TrendingUp,
    Users,
    Star,
    Clock,
    MapPin,
    Zap,
    Award,
    Heart,
    GraduationCap,
    BarChart3,
    ChevronRight,
    BookOpen,
    MessageCircle,
    Calendar,
    SlidersHorizontal,
    Lightbulb,
    Compass,
    Route,
    Microscope
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Enhanced types for Talent Crucible
interface TalentCrucibleMentor {
    user_id: string;
    display_name: string;
    bio: string;
    teacher_bio: string;
    user_tier: 'pathfinder' | 'explorer' | 'navigator';
    ascendia_score: number;
    pillar_academic: number;
    pillar_community: number;
    pillar_mentorship: number;
    pillar_analytical: number;
    average_rating: number;
    total_sessions: number;
    hourly_rate_sparks: number;
    hourly_rate_usd: number;
    specializations: string[];
    languages: string[];
    verified_mentor: boolean;
    location?: string;
    timezone?: string;
    availability_status: 'available' | 'busy' | 'offline';
    years_experience: number;
}

interface CompatibilityAnalysis {
    mentorId: string;
    compatibilityScore: number;
    compatibilityType: 'Perfect Synergy' | 'Strong Alignment' | 'Complementary Strengths' | 'Growth Catalyst';
    fourPillarsAlignment: {
        academic: string;
        community: string;
        mentorship: string;
        analytical: string;
    };
    psychologicalCompatibility: string;
    uniqueValue: string;
    growthTrajectory: string;
    potentialChallenges: string;
    recommendedApproach: string;
    successIndicators: string[];
    mentor: TalentCrucibleMentor;
}

interface TalentCrucibleResults {
    query: string;
    studentArchetype: string;
    talentCrucibleAnalysis: string;
    discoveries: CompatibilityAnalysis[];
    alternativeStrategies: string;
    talentCrucibleInsights: string;
    totalMentorsAnalyzed: number;
    aiProcessedAt: string;
}

interface LearningPathway {
    pathwayAnalysis: string;
    recommendedPhases: Array<{
        phase: number;
        title: string;
        duration: string;
        objective: string;
        recommendedMentor: string;
        sessionFrequency: string;
        focusAreas: string[];
        expectedOutcomes: string[];
        pillarsTargeted: string[];
        estimatedCost: string;
        mentor: TalentCrucibleMentor;
    }>;
    milestoneMarkers: string[];
    adaptationStrategies: string;
    successMetrics: string;
    riskMitigation: string;
}

interface PredictiveMatching {
    predictiveAnalysis: string;
    confidenceLevel: 'High' | 'Medium' | 'Low';
    predictions: Array<{
        mentorId: string;
        successProbability: number;
        patternStrength: 'Strong' | 'Medium' | 'Emerging';
        predictiveFactors: string[];
        expectedOutcomes: string[];
        riskFactors: string[];
        recommendedStrategy: string;
        mentor: TalentCrucibleMentor;
    }>;
    patternInsights: string;
    alternativeApproaches: string;
}

// Styling configurations
const COMPATIBILITY_STYLES = {
    'Perfect Synergy': {
        bgColor: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
        borderColor: 'border-purple-500/50',
        textColor: 'text-purple-300',
        iconColor: 'text-purple-400',
        icon: '✨'
    },
    'Strong Alignment': {
        bgColor: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
        borderColor: 'border-blue-500/50',
        textColor: 'text-blue-300',
        iconColor: 'text-blue-400',
        icon: '🎯'
    },
    'Complementary Strengths': {
        bgColor: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-300',
        iconColor: 'text-green-400',
        icon: '🔄'
    },
    'Growth Catalyst': {
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-red-500/10',
        borderColor: 'border-orange-500/50',
        textColor: 'text-orange-300',
        iconColor: 'text-orange-400',
        icon: '🚀'
    }
};

const TIER_STYLES = {
    pathfinder: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
    explorer: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    navigator: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' }
};

const PILLAR_ICONS = {
    academic: { icon: GraduationCap, color: 'text-blue-400' },
    community: { icon: Users, color: 'text-green-400' },
    mentorship: { icon: Heart, color: 'text-pink-400' },
    analytical: { icon: BarChart3, color: 'text-purple-400' }
};

const TalentCrucibleSearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeMode, setActiveMode] = useState<'discover' | 'pathway' | 'predictive'>('discover');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Student profile for enhanced matching
    const [studentProfile, setStudentProfile] = useState({
        learningStyle: '',
        experienceLevel: 'beginner',
        timeline: '',
        challenges: '',
        motivationType: '',
        interactionStyle: '',
        successMetrics: '',
        goals: '',
        preferredMethods: [],
        budget: '',
        availability: ''
    });

    // Results states
    const [talentResults, setTalentResults] = useState<TalentCrucibleResults | null>(null);
    const [pathwayResults, setPathwayResults] = useState<LearningPathway | null>(null);
    const [predictiveResults, setPredictiveResults] = useState<PredictiveMatching | null>(null);
    
    // UI states
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [selectedMentor, setSelectedMentor] = useState<TalentCrucibleMentor | null>(null);

    // Talent Crucible Discovery
    const handleTalentCrucibleSearch = async () => {
        if (!searchQuery.trim()) {
            toast.error('Please describe your learning goals');
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.post('/api/ai/talent-crucible/discover', {
                studentQuery: searchQuery,
                studentProfile
            });

            if (response.data.success) {
                setTalentResults(response.data.results);
                toast.success(`Found ${response.data.results.discoveries.length} mentor matches!`);
            } else {
                throw new Error(response.data.error || 'Search failed');
            }
        } catch (error: any) {
            console.error('Talent Crucible search error:', error);
            toast.error(error.message || 'Failed to perform mentor discovery');
        } finally {
            setIsLoading(false);
        }
    };

    // Learning Pathway Optimization
    const handlePathwayOptimization = async () => {
        if (!searchQuery.trim()) {
            toast.error('Please describe your learning goal');
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiClient.post('/api/ai/talent-crucible/optimize-pathway', {
                learningGoal: searchQuery,
                timeframeWeeks: parseInt(studentProfile.timeline) || 12
            });

            if (response.data.success) {
                setPathwayResults(response.data.pathway);
                toast.success('Learning pathway optimized!');
            } else {
                throw new Error(response.data.error || 'Pathway optimization failed');
            }
        } catch (error: any) {
            console.error('Pathway optimization error:', error);
            toast.error(error.message || 'Failed to optimize learning pathway');
        } finally {
            setIsLoading(false);
        }
    };

    // Predictive Success Matching
    const handlePredictiveMatching = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.post('/api/ai/talent-crucible/predictive-matching');

            if (response.data.success) {
                setPredictiveResults(response.data.predictions);
                toast.success('Predictive analysis completed!');
            } else {
                throw new Error(response.data.error || 'Predictive matching failed');
            }
        } catch (error: any) {
            console.error('Predictive matching error:', error);
            toast.error(error.message || 'Failed to perform predictive matching');
        } finally {
            setIsLoading(false);
        }
    };

    // Render mentor card with Four Pillars
    const renderMentorCard = (discovery: CompatibilityAnalysis, showCompatibility: boolean = true) => {
        const mentor = discovery.mentor;
        const compatibilityStyle = COMPATIBILITY_STYLES[discovery.compatibilityType];
        const tierStyle = TIER_STYLES[mentor.user_tier];

        return (
            <Card key={mentor.user_id} className={cn(
                "bg-slate-900/40 backdrop-blur-lg border text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
                showCompatibility ? compatibilityStyle.borderColor : "border-slate-700/50"
            )}>
                <CardHeader className={cn("pb-4", showCompatibility ? compatibilityStyle.bgColor : "")}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border border-slate-600">
                                <AvatarImage src={`/api/avatars/${mentor.user_id}`} />
                                <AvatarFallback className="bg-slate-700 text-white">
                                    {mentor.display_name?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    {mentor.display_name}
                                    {mentor.verified_mentor && (
                                        <Award className="h-4 w-4 text-blue-400" />
                                    )}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className={cn("px-2 py-1 text-xs", tierStyle.bgColor, tierStyle.color)}>
                                        {mentor.user_tier.charAt(0).toUpperCase() + mentor.user_tier.slice(1)}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-sm text-slate-300">
                                        <Zap className="h-3 w-3 text-yellow-400" />
                                        {mentor.ascendia_score}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {showCompatibility && (
                            <div className="text-right">
                                <div className="text-2xl mb-1">{compatibilityStyle.icon}</div>
                                <div className={cn("text-2xl font-bold", compatibilityStyle.textColor)}>
                                    {discovery.compatibilityScore}%
                                </div>
                                <div className={cn("text-xs", compatibilityStyle.textColor)}>
                                    {discovery.compatibilityType}
                                </div>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Four Pillars Visualization */}
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(PILLAR_ICONS).map(([pillar, config]) => {
                            const value = mentor[`pillar_${pillar}` as keyof typeof mentor] as number;
                            const Icon = config.icon;
                            const maxValue = Math.max(
                                mentor.pillar_academic,
                                mentor.pillar_community,
                                mentor.pillar_mentorship,
                                mentor.pillar_analytical,
                                100
                            );
                            
                            return (
                                <div key={pillar} className="flex items-center gap-2">
                                    <Icon className={cn("h-4 w-4", config.color)} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-slate-300 capitalize">{pillar}</span>
                                            <span className={config.color}>{value}</span>
                                        </div>
                                        <Progress 
                                            value={(value / maxValue) * 100} 
                                            className="h-1.5"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bio */}
                    {mentor.bio && (
                        <p className="text-sm text-slate-300 line-clamp-2">{mentor.bio}</p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            {mentor.average_rating}/5.0 ({mentor.total_sessions} sessions)
                        </div>
                        <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-green-400" />
                            {mentor.hourly_rate_sparks} Sparks/hr
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-400" />
                            {mentor.years_experience} years exp
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-purple-400" />
                            {mentor.location || 'Remote'}
                        </div>
                    </div>

                    {/* Compatibility Analysis */}
                    {showCompatibility && (
                        <div className="space-y-3 pt-2 border-t border-slate-700">
                            <div>
                                <h4 className={cn("text-sm font-medium mb-1", compatibilityStyle.textColor)}>
                                    Unique Value
                                </h4>
                                <p className="text-xs text-slate-300">{discovery.uniqueValue}</p>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-medium text-green-300 mb-1">Growth Trajectory</h4>
                                <p className="text-xs text-slate-300">{discovery.growthTrajectory}</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-blue-300 mb-1">Recommended Approach</h4>
                                <p className="text-xs text-slate-300">{discovery.recommendedApproach}</p>
                            </div>

                            {discovery.successIndicators.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-cyan-300 mb-2">Expected Outcomes</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {discovery.successIndicators.slice(0, 3).map((indicator, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                                {indicator}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button 
                            size="sm" 
                            className="flex-1 bg-purple-600 hover:bg-purple-500"
                            onClick={() => navigate(`/profile/${mentor.user_id}`)}
                        >
                            <BookOpen className="h-3 w-3 mr-1" />
                            View Profile
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 border-slate-600 hover:bg-slate-700"
                            onClick={() => navigate(`/sessions/book/${mentor.user_id}`)}
                        >
                            <Calendar className="h-3 w-3 mr-1" />
                            Book Session
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-slate-600 hover:bg-slate-700"
                            onClick={() => setSelectedMentor(mentor)}
                        >
                            <MessageCircle className="h-3 w-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Render pathway phase card
    const renderPathwayPhase = (phase: any, index: number) => {
        const mentor = phase.mentor;
        
        return (
            <Card key={index} className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <Badge className="bg-cyan-500/10 text-cyan-400 mb-2">
                                Phase {phase.phase}
                            </Badge>
                            <CardTitle className="text-lg">{phase.title}</CardTitle>
                            <CardDescription className="text-slate-400">
                                {phase.duration} • {phase.sessionFrequency}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-green-400">{phase.estimatedCost}</div>
                            <div className="text-xs text-slate-400">Estimated cost</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="text-sm text-slate-300">{phase.objective}</p>

                    {/* Mentor Info */}
                    {mentor && (
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-slate-700 text-white text-sm">
                                        {mentor.display_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-white">{mentor.display_name}</p>
                                    <p className="text-xs text-slate-400">Recommended mentor</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Focus Areas */}
                    <div>
                        <h4 className="text-sm font-medium text-cyan-300 mb-2">Focus Areas</h4>
                        <div className="flex flex-wrap gap-1">
                            {phase.focusAreas.map((area: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                    {area}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Expected Outcomes */}
                    <div>
                        <h4 className="text-sm font-medium text-green-300 mb-2">Expected Outcomes</h4>
                        <ul className="text-xs text-slate-300 space-y-1">
                            {phase.expectedOutcomes.map((outcome: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <ChevronRight className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                                    {outcome}
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full">
                        <Sparkles className="h-8 w-8 text-purple-400" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Talent Crucible
                    </h1>
                </div>
                <p className="text-xl text-slate-300 mb-2">
                    AI-powered deep compatibility analysis for mentor discovery
                </p>
                <p className="text-sm text-slate-400 max-w-3xl mx-auto">
                    Our advanced AI analyzes your learning profile against mentor expertise, teaching styles, 
                    and success patterns using Four Pillars scoring to find perfect matches.
                </p>
            </div>

            {/* Mode Selection */}
            <Tabs value={activeMode} onValueChange={(value: any) => setActiveMode(value)} className="mb-8">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
                    <TabsTrigger value="discover" className="flex items-center gap-2">
                        <Microscope className="h-4 w-4" />
                        Deep Discovery
                    </TabsTrigger>
                    <TabsTrigger value="pathway" className="flex items-center gap-2">
                        <Route className="h-4 w-4" />
                        Learning Pathway
                    </TabsTrigger>
                    <TabsTrigger value="predictive" className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Predictive Matching
                    </TabsTrigger>
                </TabsList>

                {/* Discovery Mode */}
                <TabsContent value="discover" className="space-y-6">
                    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-cyan-300">
                                <Target className="h-5 w-5" />
                                Learning Goals & Challenges
                            </CardTitle>
                            <CardDescription>
                                Describe what you want to learn and any specific challenges you're facing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="e.g., I want to master React development but struggle with state management and component architecture. I need someone who can explain complex concepts simply and provide hands-on guidance..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                rows={4}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                            />

                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                    className="border-slate-600 hover:bg-slate-700"
                                >
                                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                                    Advanced Options
                                </Button>

                                <Button
                                    onClick={handleTalentCrucibleSearch}
                                    disabled={isLoading || !searchQuery.trim()}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Discover Perfect Mentors
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Advanced Student Profile */}
                    {showAdvancedOptions && (
                        <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-cyan-300">
                                    <Brain className="h-5 w-5" />
                                    Enhanced Learning Profile
                                </CardTitle>
                                <CardDescription>
                                    Provide additional details for more precise mentor matching
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Experience Level</label>
                                    <Select 
                                        value={studentProfile.experienceLevel} 
                                        onValueChange={(value) => setStudentProfile(prev => ({...prev, experienceLevel: value}))}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-600">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beginner">Beginner</SelectItem>
                                            <SelectItem value="intermediate">Intermediate</SelectItem>
                                            <SelectItem value="advanced">Advanced</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Learning Style</label>
                                    <Input
                                        placeholder="e.g., Visual learner, hands-on practice"
                                        value={studentProfile.learningStyle}
                                        onChange={(e) => setStudentProfile(prev => ({...prev, learningStyle: e.target.value}))}
                                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Timeline</label>
                                    <Input
                                        placeholder="e.g., 12 weeks, 3 months"
                                        value={studentProfile.timeline}
                                        onChange={(e) => setStudentProfile(prev => ({...prev, timeline: e.target.value}))}
                                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Motivation Type</label>
                                    <Input
                                        placeholder="e.g., Career advancement, personal interest"
                                        value={studentProfile.motivationType}
                                        onChange={(e) => setStudentProfile(prev => ({...prev, motivationType: e.target.value}))}
                                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Discovery Results */}
                    {talentResults && (
                        <div className="space-y-6">
                            {/* AI Analysis */}
                            <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-purple-300">
                                        <Brain className="h-5 w-5" />
                                        AI Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <h4 className="font-medium text-pink-300 mb-1">Student Archetype</h4>
                                        <p className="text-slate-300 text-sm">{talentResults.studentArchetype}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-purple-300 mb-1">Deep Analysis</h4>
                                        <p className="text-slate-300 text-sm">{talentResults.talentCrucibleAnalysis}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-cyan-300 mb-1">Key Insights</h4>
                                        <p className="text-slate-300 text-sm">{talentResults.talentCrucibleInsights}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Mentor Discoveries */}
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Lightbulb className="h-6 w-6 text-yellow-400" />
                                    Mentor Discoveries ({talentResults.discoveries.length})
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {talentResults.discoveries.map((discovery) => renderMentorCard(discovery, true))}
                                </div>
                            </div>

                            {/* Alternative Strategies */}
                            {talentResults.alternativeStrategies && (
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-orange-300">
                                            <Compass className="h-5 w-5" />
                                            Alternative Strategies
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-300 text-sm">{talentResults.alternativeStrategies}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* Learning Pathway Mode */}
                <TabsContent value="pathway" className="space-y-6">
                    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-cyan-300">
                                <Route className="h-5 w-5" />
                                Learning Goal & Timeline
                            </CardTitle>
                            <CardDescription>
                                Define your learning objective and preferred timeline for AI-optimized pathway
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="e.g., Master full-stack web development from beginner to job-ready level"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                rows={3}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                            />
                            
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Timeline (weeks)</label>
                                    <Input
                                        type="number"
                                        placeholder="12"
                                        value={studentProfile.timeline}
                                        onChange={(e) => setStudentProfile(prev => ({...prev, timeline: e.target.value}))}
                                        className="bg-slate-800 border-slate-600 text-white w-24"
                                    />
                                </div>

                                <Button
                                    onClick={handlePathwayOptimization}
                                    disabled={isLoading || !searchQuery.trim()}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Optimizing...
                                        </>
                                    ) : (
                                        <>
                                            <Route className="h-4 w-4 mr-2" />
                                            Optimize Pathway
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pathway Results */}
                    {pathwayResults && (
                        <div className="space-y-6">
                            {/* Pathway Analysis */}
                            <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-300">
                                        <Route className="h-5 w-5" />
                                        Optimized Learning Pathway
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-300 text-sm">{pathwayResults.pathwayAnalysis}</p>
                                </CardContent>
                            </Card>

                            {/* Recommended Phases */}
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Calendar className="h-6 w-6 text-blue-400" />
                                    Recommended Learning Phases
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {pathwayResults.recommendedPhases.map((phase, index) => renderPathwayPhase(phase, index))}
                                </div>
                            </div>

                            {/* Milestones & Success Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-green-300">
                                            <Target className="h-5 w-5" />
                                            Milestone Markers
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 text-sm text-slate-300">
                                            {pathwayResults.milestoneMarkers.map((milestone, index) => (
                                                <li key={index} className="flex items-start gap-2">
                                                    <ChevronRight className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                                                    {milestone}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-purple-300">
                                            <TrendingUp className="h-5 w-5" />
                                            Success Metrics
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-300 text-sm">{pathwayResults.successMetrics}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* Predictive Matching Mode */}
                <TabsContent value="predictive" className="space-y-6">
                    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-cyan-300">
                                <Brain className="h-5 w-5" />
                                Predictive Success Matching
                            </CardTitle>
                            <CardDescription>
                                AI analyzes patterns from similar students who succeeded to predict your best mentor matches
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Button
                                onClick={handlePredictiveMatching}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Analyzing Patterns...
                                    </>
                                ) : (
                                    <>
                                        <Brain className="h-4 w-4 mr-2" />
                                        Run Predictive Analysis
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Predictive Results */}
                    {predictiveResults && (
                        <div className="space-y-6">
                            {/* Analysis Overview */}
                            <Card className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-indigo-300">
                                        <Brain className="h-5 w-5" />
                                        Predictive Analysis
                                        <Badge className={cn("ml-2", 
                                            predictiveResults.confidenceLevel === 'High' ? 'bg-green-500/20 text-green-300' :
                                            predictiveResults.confidenceLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-red-500/20 text-red-300'
                                        )}>
                                            {predictiveResults.confidenceLevel} Confidence
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <h4 className="font-medium text-purple-300 mb-1">Analysis</h4>
                                        <p className="text-slate-300 text-sm">{predictiveResults.predictiveAnalysis}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-cyan-300 mb-1">Pattern Insights</h4>
                                        <p className="text-slate-300 text-sm">{predictiveResults.patternInsights}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Predicted Matches */}
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-6 w-6 text-indigo-400" />
                                    Predicted Success Matches ({predictiveResults.predictions.length})
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {predictiveResults.predictions.map((prediction, index) => (
                                        <Card key={index} className="bg-slate-900/40 backdrop-blur-lg border border-indigo-500/30 text-white">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border border-slate-600">
                                                            <AvatarFallback className="bg-slate-700 text-white">
                                                                {prediction.mentor.display_name?.charAt(0) || '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <CardTitle className="text-lg">{prediction.mentor.display_name}</CardTitle>
                                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                                <Badge className="bg-indigo-500/20 text-indigo-300">
                                                                    {prediction.patternStrength} Pattern
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-indigo-400">
                                                            {prediction.successProbability}%
                                                        </div>
                                                        <div className="text-xs text-slate-400">Success Rate</div>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="space-y-3">
                                                <div>
                                                    <h4 className="text-sm font-medium text-green-300 mb-1">Expected Outcomes</h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {prediction.expectedOutcomes.slice(0, 3).map((outcome, idx) => (
                                                            <Badge key={idx} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                                                {outcome}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-medium text-blue-300 mb-1">Recommended Strategy</h4>
                                                    <p className="text-xs text-slate-300">{prediction.recommendedStrategy}</p>
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                                                        <BookOpen className="h-3 w-3 mr-1" />
                                                        View Profile
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1 border-slate-600 hover:bg-slate-700">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        Book Trial
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default TalentCrucibleSearchPage;