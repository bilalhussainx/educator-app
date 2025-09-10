// src/pages/TalentCruciblePage.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Search,
    Sparkles,
    Brain,
    Target,
    TrendingUp,
    Users,
    Star,
    Zap,
    Heart,
    GraduationCap,
    BarChart3,
    MessageCircle,
    Calendar
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

// Types
interface TalentCrucibleResults {
    query: string;
    studentArchetype: string;
    talentCrucibleAnalysis: string;
    discoveries: MentorDiscovery[];
    alternativeStrategies: string;
    talentCrucibleInsights: string;
    totalMentorsAnalyzed: number;
}

interface MentorDiscovery {
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
    mentor: {
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
    };
}

// Component Props
interface StudentProfileForm {
    learningStyle: string;
    experienceLevel: string;
    timeline: string;
    challenges: string;
    motivationType: string;
    interactionStyle: string;
    successMetrics: string;
}

// Compatibility type styling
const COMPATIBILITY_STYLES = {
    'Perfect Synergy': {
        bgColor: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
        borderColor: 'border-purple-500/50',
        textColor: 'text-purple-300',
        icon: '✨'
    },
    'Strong Alignment': {
        bgColor: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
        borderColor: 'border-blue-500/50',
        textColor: 'text-blue-300',
        icon: '🎯'
    },
    'Complementary Strengths': {
        bgColor: 'bg-gradient-to-r from-green-500/10 to-emerald-500/10',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-300',
        icon: '🔄'
    },
    'Growth Catalyst': {
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-red-500/10',
        borderColor: 'border-orange-500/50',
        textColor: 'text-orange-300',
        icon: '🚀'
    }
};

const TIER_STYLES = {
    pathfinder: { color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    explorer: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    navigator: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' }
};

// Pillar Icons
const PILLAR_ICONS = {
    academic: GraduationCap,
    community: Users,
    mentorship: Heart,
    analytical: BarChart3
};

const TalentCruciblePage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [studentProfile, setStudentProfile] = useState<StudentProfileForm>({
        learningStyle: '',
        experienceLevel: 'beginner',
        timeline: '',
        challenges: '',
        motivationType: '',
        interactionStyle: '',
        successMetrics: ''
    });
    
    const [results, setResults] = useState<TalentCrucibleResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'results'>('search');

    const handleSearch = async () => {
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
                setResults(response.data.results);
                setActiveTab('results');
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

    const renderSearchForm = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full">
                        <Sparkles className="h-8 w-8 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Talent Crucible
                    </h1>
                </div>
                <p className="text-lg text-slate-300">
                    AI-powered deep compatibility analysis for mentor discovery
                </p>
                <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                    Our advanced AI analyzes your learning profile against mentor expertise, 
                    teaching styles, and success patterns to find perfect matches.
                </p>
            </div>

            {/* Main Search Query */}
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
                <CardContent>
                    <Textarea
                        placeholder="e.g., I want to master React development but struggle with state management and component architecture. I need someone who can explain complex concepts simply and provide hands-on guidance..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        rows={4}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                    />
                </CardContent>
            </Card>

            {/* Student Profile Form */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-cyan-300">
                        <Brain className="h-5 w-5" />
                        Learning Profile
                    </CardTitle>
                    <CardDescription>
                        Help us understand your learning style and preferences for better matching
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
                                <SelectValue placeholder="Select your level" />
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
                            placeholder="e.g., 3 months, flexible"
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

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-300">Main Challenges</label>
                        <Textarea
                            placeholder="What specific difficulties or obstacles are you facing?"
                            value={studentProfile.challenges}
                            onChange={(e) => setStudentProfile(prev => ({...prev, challenges: e.target.value}))}
                            rows={3}
                            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Search Button */}
            <div className="text-center">
                <Button
                    onClick={handleSearch}
                    disabled={isLoading || !searchQuery.trim()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-6 text-lg"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Analyzing Compatibility...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Discover Perfect Mentors
                        </>
                    )}
                </Button>
            </div>
        </div>
    );

    const renderMentorCard = (discovery: MentorDiscovery) => {
        const compatibilityStyle = COMPATIBILITY_STYLES[discovery.compatibilityType];
        const tierStyle = TIER_STYLES[discovery.mentor.user_tier];

        return (
            <Card key={discovery.mentorId} className={cn(
                "bg-slate-900/40 backdrop-blur-lg border text-white transition-all duration-300 hover:scale-105 hover:shadow-xl",
                compatibilityStyle.borderColor
            )}>
                <CardHeader className={cn("pb-4", compatibilityStyle.bgColor)}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">{compatibilityStyle.icon}</div>
                            <div>
                                <CardTitle className="text-xl text-white">
                                    {discovery.mentor.display_name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className={cn("px-2 py-1 text-xs", tierStyle.bgColor, tierStyle.color)}>
                                        {discovery.mentor.user_tier.charAt(0).toUpperCase() + discovery.mentor.user_tier.slice(1)}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-sm text-slate-300">
                                        <Zap className="h-3 w-3 text-yellow-400" />
                                        {discovery.mentor.ascendia_score}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={cn("text-2xl font-bold", compatibilityStyle.textColor)}>
                                {discovery.compatibilityScore}%
                            </div>
                            <div className={cn("text-sm", compatibilityStyle.textColor)}>
                                {discovery.compatibilityType}
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Mentor Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                            <Star className="h-4 w-4 text-yellow-400" />
                            {discovery.mentor.average_rating}/5.0 ({discovery.mentor.total_sessions} sessions)
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                            <Zap className="h-4 w-4 text-green-400" />
                            {discovery.mentor.hourly_rate_sparks} Sparks/hr
                        </div>
                    </div>

                    {/* Four Pillars */}
                    <div>
                        <h4 className="text-sm font-medium text-cyan-300 mb-2">Four Pillars Alignment</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(discovery.fourPillarsAlignment).map(([pillar]) => {
                                const Icon = PILLAR_ICONS[pillar as keyof typeof PILLAR_ICONS];
                                const value = discovery.mentor[`pillar_${pillar}` as keyof typeof discovery.mentor] as number;
                                
                                return (
                                    <div key={pillar} className="flex items-center gap-2 text-xs">
                                        <Icon className="h-3 w-3 text-slate-400" />
                                        <span className="text-slate-300 capitalize">{pillar}:</span>
                                        <span className="text-cyan-400 font-medium">{value}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Key Insights */}
                    <div className="space-y-3">
                        <div>
                            <h4 className="text-sm font-medium text-purple-300 mb-1">Unique Value</h4>
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
                    </div>

                    {/* Success Indicators */}
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

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-500">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Message
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 border-slate-600 hover:bg-slate-700">
                            <Calendar className="h-4 w-4 mr-1" />
                            Book Session
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderResults = () => {
        if (!results) return null;

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Talent Crucible Results</h1>
                        <p className="text-slate-400">Found {results.discoveries.length} compatible mentors</p>
                    </div>
                    <Button 
                        onClick={() => setActiveTab('search')}
                        variant="outline"
                        className="border-slate-600 hover:bg-slate-700"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        New Search
                    </Button>
                </div>

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
                            <p className="text-slate-300 text-sm">{results.studentArchetype}</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-purple-300 mb-1">Analysis</h4>
                            <p className="text-slate-300 text-sm">{results.talentCrucibleAnalysis}</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-cyan-300 mb-1">Insights</h4>
                            <p className="text-slate-300 text-sm">{results.talentCrucibleInsights}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Mentor Discoveries */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {results.discoveries.map((discovery) => renderMentorCard(discovery))}
                </div>

                {/* Alternative Strategies */}
                {results.alternativeStrategies && (
                    <Card className="bg-slate-900/40 backdrop-blur-lg border border-slate-700/80">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-300">
                                <TrendingUp className="h-5 w-5" />
                                Alternative Strategies
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 text-sm">{results.alternativeStrategies}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0a091a] text-white">
            <div className="container mx-auto px-4 py-8">
                {activeTab === 'search' ? renderSearchForm() : renderResults()}
            </div>
        </div>
    );
};

export default TalentCruciblePage;