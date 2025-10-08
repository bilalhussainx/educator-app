import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    Search, Filter, Trophy, Clock, Zap, Code, ChevronRight,
    BarChart3, Target, Award, Sparkles, TrendingUp, BookOpen,
    ArrowLeft, Download, Calendar, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

// Types for solved problems
interface SolvedProblem {
    id: string;
    lesson_title: string;
    course_title: string;
    language: string;
    submission_time: string;
    first_solve_time: string;
    attempts_count: number;
    pass_rate: number;
    execution_time_ms: number;
    lines_of_code: number;
    code_complexity_score: number;
    difficulty_level?: 'easy' | 'medium' | 'hard';
    course_id: string;
    module_index?: number;
    lesson_index?: number;
    problem_tags?: string[];
    estimated_time_minutes?: number;
    global_success_rate?: number;
}

interface UserProgress {
    total_problems_solved: number;
    total_sparks_earned: number;
    total_p_score_earned: number;
    favorite_language: string;
    coding_streak_days: number;
    average_pass_rate: number;
    languages_used: string[];
}

interface ProgressData {
    courseProgress: any[];
    recentSubmissions: any[];
    languageStats: any[];
    summary: {
        totalCourses: number;
        totalSolved: number;
        totalSubmissions: number;
    };
}

// Reusable Glass Card Component
const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:bg-slate-900/50", className)} {...props} />
);

// Difficulty Badge Component
const DifficultyBadge: React.FC<{ difficulty?: string }> = ({ difficulty }) => {
    const getDifficultyColor = (diff?: string) => {
        switch (diff) {
            case 'easy': return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/50';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    return (
        <Badge className={cn("border", getDifficultyColor(difficulty))}>
            {difficulty || 'unknown'}
        </Badge>
    );
};

// Language Badge Component
const LanguageBadge: React.FC<{ language: string }> = ({ language }) => {
    const getLanguageColor = (lang: string) => {
        const colors = {
            javascript: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
            python: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
            java: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
            cpp: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
            typescript: 'bg-blue-600/20 text-blue-300 border-blue-600/50',
            go: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
        };
        return colors[lang as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    };

    return (
        <Badge className={cn("border", getLanguageColor(language.toLowerCase()))}>
            <Code className="h-3 w-3 mr-1" />
            {language}
        </Badge>
    );
};

export const SolvedProblemsPage: React.FC = () => {
    const navigate = useNavigate();
    const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);
    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [languageFilter, setLanguageFilter] = useState<string>('all');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('recent');

    useEffect(() => {
        fetchSolvedProblems();
        fetchUserProgress();
    }, []);

    const fetchSolvedProblems = async () => {
        try {
            const response = await apiClient.get('/api/submissions/solved');
            if (response.data.success) {
                setSolvedProblems(response.data.problems || []);
            }
        } catch (error) {
            console.error('Error fetching solved problems:', error);
            toast.error('Failed to load solved problems');
            setSolvedProblems([]);
        }
    };

    const fetchUserProgress = async () => {
        try {
            const response = await apiClient.get('/api/submissions/progress');
            if (response.data.success) {
                setProgressData(response.data);
            }
        } catch (error) {
            console.error('Error fetching user progress:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort problems
    const filteredAndSortedProblems = React.useMemo(() => {
        let filtered = solvedProblems.filter(problem => {
            const matchesSearch = problem.lesson_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                problem.course_title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLanguage = languageFilter === 'all' || problem.language === languageFilter;
            const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty_level === difficultyFilter;

            return matchesSearch && matchesLanguage && matchesDifficulty;
        });

        // Sort problems
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    return new Date(b.submission_time).getTime() - new Date(a.submission_time).getTime();
                case 'sparks':
                    return 0; // No sparks data in backend yet
                case 'difficulty':
                    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                    return (difficultyOrder[b.difficulty_level || 'easy'] - difficultyOrder[a.difficulty_level || 'easy']);
                case 'performance':
                    return b.pass_rate - a.pass_rate;
                default:
                    return 0;
            }
        });

        return filtered;
    }, [solvedProblems, searchTerm, languageFilter, difficultyFilter, sortBy]);

    const handleProblemClick = (problem: SolvedProblem) => {
        // Navigate to the specific lesson
        if (problem.module_index !== undefined && problem.lesson_index !== undefined) {
            // Enhanced course - navigate to IDE with lesson parameters
            navigate(`/enhanced-courses/${problem.course_id}/ide?moduleIndex=${problem.module_index}&lessonIndex=${problem.lesson_index}&language=${problem.language}`);
        } else {
            // Regular course - navigate to course page
            navigate(`/courses/${problem.course_id}`);
        }
    };

    const exportResults = () => {
        const csvContent = [
            ['Problem', 'Course', 'Language', 'Solved At', 'Attempts', 'Pass Rate', 'Lines of Code', 'Complexity Score'].join(','),
            ...filteredAndSortedProblems.map(problem => [
                problem.lesson_title,
                problem.course_title,
                problem.language,
                new Date(problem.submission_time).toLocaleDateString(),
                problem.attempts_count,
                `${problem.pass_rate}%`,
                problem.lines_of_code,
                problem.code_complexity_score || 0
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'solved-problems.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Exported solved problems to CSV');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white text-xl">Loading your achievements...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="text-slate-400 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Trophy className="h-8 w-8 text-yellow-400" />
                                Solved Problems
                            </h1>
                            <p className="text-slate-400 mt-1">Your coding journey and achievements</p>
                        </div>
                    </div>
                    <Button onClick={exportResults} variant="outline" className="border-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Progress Overview */}
                {progressData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <GlassCard>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">{progressData.summary.totalSolved}</div>
                                    <div className="text-sm text-slate-400">Problems Solved</div>
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 rounded-lg">
                                    <BookOpen className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">{progressData.summary.totalCourses}</div>
                                    <div className="text-sm text-slate-400">Courses Started</div>
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-cyan-500/20 rounded-lg">
                                    <Code className="h-6 w-6 text-cyan-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">{progressData.summary.totalSubmissions}</div>
                                    <div className="text-sm text-slate-400">Total Submissions</div>
                                </div>
                            </CardContent>
                        </GlassCard>

                        <GlassCard>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-lg">
                                    <Target className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-white">{progressData.languageStats.length}</div>
                                    <div className="text-sm text-slate-400">Languages Used</div>
                                </div>
                            </CardContent>
                        </GlassCard>
                    </div>
                )}

                {/* Filters and Search */}
                <GlassCard>
                    <CardContent className="p-6">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search problems..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-800 border-slate-600 text-white"
                                    />
                                </div>
                            </div>

                            <Select value={languageFilter} onValueChange={setLanguageFilter}>
                                <SelectTrigger className="w-[150px] bg-slate-800 border-slate-600 text-white">
                                    <SelectValue placeholder="Language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Languages</SelectItem>
                                    <SelectItem value="javascript">JavaScript</SelectItem>
                                    <SelectItem value="python">Python</SelectItem>
                                    <SelectItem value="java">Java</SelectItem>
                                    <SelectItem value="cpp">C++</SelectItem>
                                    <SelectItem value="typescript">TypeScript</SelectItem>
                                    <SelectItem value="go">Go</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                                <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600 text-white">
                                    <SelectValue placeholder="Difficulty" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600 text-white">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Most Recent</SelectItem>
                                    <SelectItem value="sparks">Most Sparks</SelectItem>
                                    <SelectItem value="difficulty">Difficulty</SelectItem>
                                    <SelectItem value="performance">Performance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </GlassCard>

                {/* Results Count */}
                <div className="text-slate-400">
                    Showing {filteredAndSortedProblems.length} of {solvedProblems.length} solved problems
                </div>

                {/* Problems List */}
                <div className="space-y-4">
                    {filteredAndSortedProblems.length === 0 ? (
                        <GlassCard>
                            <CardContent className="p-8 text-center">
                                <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                                <div className="text-slate-400 text-lg">No problems found</div>
                                <div className="text-slate-500 text-sm mt-2">
                                    {solvedProblems.length === 0
                                        ? "Start solving problems to see them here!"
                                        : "Try adjusting your filters"}
                                </div>
                            </CardContent>
                        </GlassCard>
                    ) : (
                        filteredAndSortedProblems.map((problem, index) => (
                            <GlassCard key={problem.id} className="hover:border-cyan-500/50 cursor-pointer transition-all">
                                <CardContent className="p-6" onClick={() => handleProblemClick(problem)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white mb-1">
                                                        {problem.lesson_title}
                                                    </h3>
                                                    <p className="text-slate-400 text-sm">
                                                        {problem.course_title}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-400 ml-4" />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <LanguageBadge language={problem.language} />
                                                <DifficultyBadge difficulty={problem.difficulty_level} />

                                                <div className="flex items-center gap-1 text-sm text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(problem.submission_time).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="flex items-center gap-1 text-slate-300">
                                                    <Target className="h-3 w-3" />
                                                    {problem.attempts_count} attempt{problem.attempts_count !== 1 ? 's' : ''}
                                                </div>

                                                <div className="flex items-center gap-1 text-green-400">
                                                    <BarChart3 className="h-3 w-3" />
                                                    {problem.pass_rate}% pass rate
                                                </div>

                                                <div className="flex items-center gap-1 text-purple-400">
                                                    <Code className="h-3 w-3" />
                                                    {problem.lines_of_code} lines
                                                </div>

                                                {problem.code_complexity_score && (
                                                    <div className="flex items-center gap-1 text-cyan-400">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Score: {problem.code_complexity_score}
                                                    </div>
                                                )}
                                            </div>

                                            {problem.execution_time_ms && (
                                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                                    <span>⚡ {problem.execution_time_ms}ms</span>
                                                    {problem.estimated_time_minutes && (
                                                        <span>⏱️ ~{problem.estimated_time_minutes}min</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </GlassCard>
                        ))
                    )}
                </div>

                {/* Load More Button (if needed) */}
                {filteredAndSortedProblems.length > 0 && (
                    <div className="text-center mt-8">
                        <p className="text-slate-400 text-sm">
                            You've viewed all your solved problems! 🎉
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SolvedProblemsPage;