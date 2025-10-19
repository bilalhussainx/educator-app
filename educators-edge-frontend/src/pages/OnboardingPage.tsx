/**
 * =================================================================
 * Onboarding Page - New User Journey
 * =================================================================
 * Multi-step wizard that guides new users through:
 * 1. Role confirmation
 * 2. Goal setting
 * 3. Skill assessment
 * 4. Personalized learning path generation
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    GraduationCap, Target, Code, TrendingUp, Users, BookOpen,
    Trophy, CheckCircle, ChevronRight, ChevronLeft, Sparkles,
    Rocket, Brain, Coffee, Award, Clock, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

// Types for onboarding data
interface OnboardingData {
    role: 'student' | 'teacher' | null;
    primaryGoal: string;
    secondaryGoals: string[];
    skillLevels: {
        coding: 'beginner' | 'intermediate' | 'advanced';
        algorithms: 'beginner' | 'intermediate' | 'advanced';
        trading: 'beginner' | 'intermediate' | 'advanced';
    };
    preferredLanguage: string;
    availableTime: string; // hours per week
    interests: string[];
}

interface LearningPath {
    week: number;
    title: string;
    tasks: Array<{
        type: 'course' | 'practice' | 'project' | 'session';
        title: string;
        duration: string;
        xp: number;
    }>;
}

const GOALS = [
    { id: 'first-job', label: 'Land my first tech job', icon: Rocket, description: 'Get hired as a developer' },
    { id: 'interviews', label: 'Pass technical interviews', icon: Brain, description: 'Ace coding interviews at top companies' },
    { id: 'portfolio', label: 'Build a portfolio', icon: Trophy, description: 'Showcase real-world projects' },
    { id: 'algorithms', label: 'Master algorithms', icon: Code, description: 'Become proficient in problem-solving' },
    { id: 'trading', label: 'Learn market analysis', icon: TrendingUp, description: 'Understand trading and finance' },
    { id: 'network', label: 'Build professional network', icon: Users, description: 'Connect with industry professionals' }
];

const PROGRAMMING_LANGUAGES = [
    { id: 'javascript', label: 'JavaScript', icon: '🟨' },
    { id: 'python', label: 'Python', icon: '🐍' },
    { id: 'java', label: 'Java', icon: '☕' },
    { id: 'cpp', label: 'C++', icon: '⚡' },
    { id: 'go', label: 'Go', icon: '🔵' },
    { id: 'rust', label: 'Rust', icon: '🦀' }
];

const INTERESTS = [
    { id: 'web-dev', label: 'Web Development', icon: '🌐' },
    { id: 'mobile', label: 'Mobile Apps', icon: '📱' },
    { id: 'ai-ml', label: 'AI/Machine Learning', icon: '🤖' },
    { id: 'blockchain', label: 'Blockchain', icon: '⛓️' },
    { id: 'data-science', label: 'Data Science', icon: '📊' },
    { id: 'cybersecurity', label: 'Cybersecurity', icon: '🔒' },
    { id: 'game-dev', label: 'Game Development', icon: '🎮' },
    { id: 'cloud', label: 'Cloud Computing', icon: '☁️' }
];

const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        role: null,
        primaryGoal: '',
        secondaryGoals: [],
        skillLevels: {
            coding: 'beginner',
            algorithms: 'beginner',
            trading: 'beginner'
        },
        preferredLanguage: '',
        availableTime: '5-10',
        interests: []
    });

    const [generatedPath, setGeneratedPath] = useState<LearningPath[]>([]);

    const totalSteps = 5;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    // Step 1: Role Confirmation
    const RoleConfirmation = () => (
        <div className="space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Welcome to Educator's Edge
                </h2>
                <p className="text-xl text-slate-400">
                    Let's personalize your learning experience
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Option */}
                <Card
                    className={cn(
                        "cursor-pointer transition-all duration-300 hover:scale-105",
                        onboardingData.role === 'student'
                            ? "border-cyan-500 ring-2 ring-cyan-500/50 bg-cyan-500/10"
                            : "border-slate-700 hover:border-cyan-500/50 bg-slate-900/40"
                    )}
                    onClick={() => setOnboardingData({ ...onboardingData, role: 'student' })}
                >
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-cyan-500/10 rounded-full border border-cyan-500/30">
                                <GraduationCap className="h-12 w-12 text-cyan-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">I'm a Student</h3>
                            <p className="text-slate-400">
                                Learn new skills, master algorithms, and build your career
                            </p>
                        </div>
                        <ul className="text-left space-y-2 text-sm text-slate-300">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-cyan-400" />
                                Access to courses and LeetCode practice
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-cyan-400" />
                                Connect with mentors
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-cyan-400" />
                                Track progress and earn achievements
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Teacher Option */}
                <Card
                    className={cn(
                        "cursor-pointer transition-all duration-300 hover:scale-105",
                        onboardingData.role === 'teacher'
                            ? "border-purple-500 ring-2 ring-purple-500/50 bg-purple-500/10"
                            : "border-slate-700 hover:border-purple-500/50 bg-slate-900/40"
                    )}
                    onClick={() => setOnboardingData({ ...onboardingData, role: 'teacher' })}
                >
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/30">
                                <Users className="h-12 w-12 text-purple-400" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">I'm an Educator</h3>
                            <p className="text-slate-400">
                                Share knowledge, create courses, and mentor aspiring developers
                            </p>
                        </div>
                        <ul className="text-left space-y-2 text-sm text-slate-300">
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-400" />
                                Create and publish courses
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-400" />
                                Host live tutorial sessions
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-400" />
                                Earn through mentorship
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    // Step 2: Goal Setting
    const GoalSetting = () => (
        <div className="space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-white">What's your primary goal?</h2>
                <p className="text-slate-400">
                    We'll tailor your experience to help you achieve it
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GOALS.map((goal) => (
                    <Card
                        key={goal.id}
                        className={cn(
                            "cursor-pointer transition-all duration-300 hover:scale-102",
                            onboardingData.primaryGoal === goal.id
                                ? "border-cyan-500 ring-2 ring-cyan-500/50 bg-cyan-500/10"
                                : "border-slate-700 hover:border-cyan-500/50 bg-slate-900/40"
                        )}
                        onClick={() => setOnboardingData({ ...onboardingData, primaryGoal: goal.id })}
                    >
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                                <goal.icon className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1">{goal.label}</h3>
                                <p className="text-sm text-slate-400">{goal.description}</p>
                            </div>
                            {onboardingData.primaryGoal === goal.id && (
                                <CheckCircle className="h-6 w-6 text-cyan-400" />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="text-center">
                <p className="text-sm text-slate-500">
                    You can select additional goals later in your profile settings
                </p>
            </div>
        </div>
    );

    // Step 3: Skill Assessment
    const SkillAssessment = () => {
        const skills = [
            { key: 'coding' as const, label: 'Coding', icon: Code },
            { key: 'algorithms' as const, label: 'Algorithms & Data Structures', icon: Brain },
            { key: 'trading' as const, label: 'Trading & Market Analysis', icon: TrendingUp }
        ];

        const levels = [
            { value: 'beginner' as const, label: 'Beginner', description: 'Just starting out' },
            { value: 'intermediate' as const, label: 'Intermediate', description: 'Some experience' },
            { value: 'advanced' as const, label: 'Advanced', description: 'Highly experienced' }
        ];

        return (
            <div className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-white">Rate your current skills</h2>
                    <p className="text-slate-400">
                        This helps us recommend the right content for you
                    </p>
                </div>

                <div className="space-y-6">
                    {skills.map((skill) => (
                        <Card key={skill.key} className="bg-slate-900/40 border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <skill.icon className="h-6 w-6 text-cyan-400" />
                                    <h3 className="text-lg font-bold text-white">{skill.label}</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {levels.map((level) => (
                                        <button
                                            key={level.value}
                                            onClick={() => setOnboardingData({
                                                ...onboardingData,
                                                skillLevels: {
                                                    ...onboardingData.skillLevels,
                                                    [skill.key]: level.value
                                                }
                                            })}
                                            className={cn(
                                                "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                                                onboardingData.skillLevels[skill.key] === level.value
                                                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                                                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-500/50"
                                            )}
                                        >
                                            <div className="font-semibold mb-1">{level.label}</div>
                                            <div className="text-xs">{level.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    // Step 4: Preferences
    const Preferences = () => (
        <div className="space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-white">Tell us your preferences</h2>
                <p className="text-slate-400">
                    Customize your learning experience
                </p>
            </div>

            <div className="space-y-8">
                {/* Preferred Programming Language */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">Preferred Programming Language</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {PROGRAMMING_LANGUAGES.map((lang) => (
                            <button
                                key={lang.id}
                                onClick={() => setOnboardingData({ ...onboardingData, preferredLanguage: lang.id })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-3",
                                    onboardingData.preferredLanguage === lang.id
                                        ? "border-cyan-500 bg-cyan-500/10 text-white"
                                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-500/50"
                                )}
                            >
                                <span className="text-2xl">{lang.icon}</span>
                                <span className="font-semibold">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Available Time */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">
                        <Clock className="inline h-5 w-5 mr-2" />
                        How much time can you dedicate per week?
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['1-5', '5-10', '10-20', '20+'].map((hours) => (
                            <button
                                key={hours}
                                onClick={() => setOnboardingData({ ...onboardingData, availableTime: hours })}
                                className={cn(
                                    "p-4 rounded-lg border-2 transition-all duration-200",
                                    onboardingData.availableTime === hours
                                        ? "border-cyan-500 bg-cyan-500/10 text-white"
                                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-500/50"
                                )}
                            >
                                <div className="font-bold text-lg">{hours}</div>
                                <div className="text-xs">hours/week</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interests */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">
                        Areas of Interest (select multiple)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {INTERESTS.map((interest) => (
                            <button
                                key={interest.id}
                                onClick={() => {
                                    const interests = onboardingData.interests.includes(interest.id)
                                        ? onboardingData.interests.filter(i => i !== interest.id)
                                        : [...onboardingData.interests, interest.id];
                                    setOnboardingData({ ...onboardingData, interests });
                                }}
                                className={cn(
                                    "p-3 rounded-lg border-2 transition-all duration-200",
                                    onboardingData.interests.includes(interest.id)
                                        ? "border-cyan-500 bg-cyan-500/10 text-white"
                                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-500/50"
                                )}
                            >
                                <div className="text-2xl mb-1">{interest.icon}</div>
                                <div className="text-xs font-semibold">{interest.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // Step 5: Personalized Learning Path
    const PersonalizedPath = () => {
        if (isGenerating) {
            return (
                <div className="text-center space-y-6 py-12">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-cyan-400 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Generating Your Learning Path</h2>
                        <p className="text-slate-400">
                            Creating a personalized roadmap based on your goals and skills...
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full border border-cyan-500/30">
                            <Rocket className="h-12 w-12 text-cyan-400" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Your Personalized Learning Path</h2>
                    <p className="text-slate-400">
                        Here's your customized 6-week journey to achieve your goals
                    </p>
                </div>

                {generatedPath.length > 0 && (
                    <div className="space-y-6">
                        {generatedPath.map((week) => (
                            <Card key={week.week} className="bg-slate-900/40 border-slate-700 overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-white">Week {week.week}</CardTitle>
                                            <CardDescription className="text-slate-400">{week.title}</CardDescription>
                                        </div>
                                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50">
                                            +{week.tasks.reduce((sum, task) => sum + task.xp, 0)} XP
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-3">
                                        {week.tasks.map((task, index) => (
                                            <div key={index} className="flex items-start gap-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/10 rounded-full border border-cyan-500/30 flex items-center justify-center text-sm font-bold text-cyan-400">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-white">{task.title}</h4>
                                                        <Badge variant="outline" className="text-xs">
                                                            {task.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {task.duration}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Sparkles className="h-3 w-3 text-yellow-400" />
                                                            +{task.xp} XP
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <Award className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-white mb-2">Ready to Start Your Journey?</h3>
                            <p className="text-sm text-slate-300 mb-4">
                                Follow this path to reach <strong>Navigator</strong> tier and unlock advanced mentorship, priority sessions, and custom learning paths.
                            </p>
                            <div className="flex items-center gap-2 text-sm text-cyan-400">
                                <Zap className="h-4 w-4" />
                                <span>Estimated total: {generatedPath.reduce((sum, week) => sum + week.tasks.reduce((s, t) => s + t.xp, 0), 0)} XP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const steps = [
        <RoleConfirmation key="role" />,
        <GoalSetting key="goals" />,
        <SkillAssessment key="skills" />,
        <Preferences key="preferences" />,
        <PersonalizedPath key="path" />
    ];

    const handleNext = async () => {
        // Validation for each step
        if (currentStep === 0 && !onboardingData.role) {
            toast.error('Please select your role');
            return;
        }
        if (currentStep === 1 && !onboardingData.primaryGoal) {
            toast.error('Please select your primary goal');
            return;
        }
        if (currentStep === 3 && !onboardingData.preferredLanguage) {
            toast.error('Please select your preferred programming language');
            return;
        }

        // Generate learning path before showing final step
        if (currentStep === 3) {
            setIsGenerating(true);
            setTimeout(() => {
                generateLearningPath();
                setIsGenerating(false);
                setCurrentStep(currentStep + 1);
            }, 2000);
            return;
        }

        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = async () => {
        try {
            // Save onboarding data to backend
            await apiClient.post('/api/users/onboarding', {
                ...onboardingData,
                completed: true
            });

            toast.success('Welcome to Educator\'s Edge! Your journey begins now.');
            navigate('/dashboard');
        } catch (error) {
            console.error('Onboarding save error:', error);
            toast.error('Could not save onboarding data');
            // Navigate anyway for demo purposes
            navigate('/dashboard');
        }
    };

    const generateLearningPath = () => {
        // Generate personalized learning path based on user's selections
        const goalBasedPath = getPathForGoal(onboardingData.primaryGoal, onboardingData.skillLevels);
        setGeneratedPath(goalBasedPath);
    };

    const getPathForGoal = (goal: string, skills: OnboardingData['skillLevels']): LearningPath[] => {
        // Example paths based on goals - can be made more sophisticated
        if (goal === 'first-job' || goal === 'interviews') {
            return [
                {
                    week: 1,
                    title: 'Foundation & Fundamentals',
                    tasks: [
                        { type: 'course', title: `${onboardingData.preferredLanguage || 'JavaScript'} Fundamentals`, duration: '5 hours', xp: 150 },
                        { type: 'practice', title: 'Solve 10 Easy LeetCode problems', duration: '3 hours', xp: 100 },
                        { type: 'project', title: 'Set up development environment', duration: '2 hours', xp: 50 }
                    ]
                },
                {
                    week: 2,
                    title: 'Data Structures Basics',
                    tasks: [
                        { type: 'course', title: 'Arrays & Strings Deep Dive', duration: '6 hours', xp: 200 },
                        { type: 'practice', title: 'Practice 15 Array problems', duration: '4 hours', xp: 150 },
                        { type: 'session', title: 'Book mentor session for Q&A', duration: '1 hour', xp: 100 }
                    ]
                },
                {
                    week: 3,
                    title: 'Algorithms Introduction',
                    tasks: [
                        { type: 'course', title: 'Hash Tables & Two Pointers', duration: '6 hours', xp: 200 },
                        { type: 'practice', title: 'Master the Two Sum pattern', duration: '3 hours', xp: 100 },
                        { type: 'practice', title: 'Solve 10 Medium problems', duration: '5 hours', xp: 200 }
                    ]
                },
                {
                    week: 4,
                    title: 'Building Portfolio',
                    tasks: [
                        { type: 'project', title: 'Create first portfolio project', duration: '8 hours', xp: 300 },
                        { type: 'practice', title: 'Continue daily LeetCode practice', duration: '3 hours', xp: 100 },
                        { type: 'session', title: 'Resume review with mentor', duration: '1 hour', xp: 150 }
                    ]
                },
                {
                    week: 5,
                    title: 'Interview Preparation',
                    tasks: [
                        { type: 'course', title: 'Interview Patterns Masterclass', duration: '7 hours', xp: 250 },
                        { type: 'practice', title: 'Mock interviews', duration: '4 hours', xp: 200 },
                        { type: 'session', title: 'Practice with peers', duration: '2 hours', xp: 100 }
                    ]
                },
                {
                    week: 6,
                    title: 'Job Application Sprint',
                    tasks: [
                        { type: 'project', title: 'Complete 2nd portfolio project', duration: '8 hours', xp: 300 },
                        { type: 'session', title: 'Career coaching session', duration: '1 hour', xp: 150 },
                        { type: 'practice', title: 'Final interview prep', duration: '4 hours', xp: 150 }
                    ]
                }
            ];
        }

        // Default path
        return [
            {
                week: 1,
                title: 'Getting Started',
                tasks: [
                    { type: 'course', title: 'Platform orientation', duration: '2 hours', xp: 100 },
                    { type: 'practice', title: 'First coding exercises', duration: '3 hours', xp: 100 },
                    { type: 'project', title: 'Setup workspace', duration: '1 hour', xp: 50 }
                ]
            }
        ];
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return onboardingData.role !== null;
            case 1: return onboardingData.primaryGoal !== '';
            case 2: return true; // Skills have defaults
            case 3: return onboardingData.preferredLanguage !== '';
            case 4: return generatedPath.length > 0;
            default: return false;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
                {/* Progress Bar */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-slate-400">
                            Step {currentStep + 1} of {totalSteps}
                        </div>
                        <div className="text-sm text-cyan-400 font-medium">
                            {Math.round(progress)}% Complete
                        </div>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-800" />
                </div>

                {/* Step Content */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 mb-8">
                    <CardContent className="p-8 md:p-12">
                        {steps[currentStep]}
                    </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="border-slate-600 text-white hover:bg-slate-800"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    {currentStep === totalSteps - 1 ? (
                        <Button
                            onClick={handleFinish}
                            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold px-8"
                            disabled={!canProceed()}
                        >
                            <Rocket className="mr-2 h-5 w-5" />
                            Start My Journey
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold"
                            disabled={!canProceed()}
                        >
                            Continue
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
