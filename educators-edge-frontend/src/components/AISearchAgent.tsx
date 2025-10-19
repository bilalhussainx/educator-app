import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Search,
    Sparkles,
    ChevronRight,
    BookOpen,
    Code,
    Users,
    Trophy,
    Calendar,
    TrendingUp,
    Brain,
    Target,
    Check,
    Plus,
    X,
    User,
    BarChart3
} from 'lucide-react';

interface TaskSuggestion {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    priority: 'high' | 'medium' | 'low';
    category: 'learn' | 'build' | 'connect' | 'prove';
    canBeGoal?: boolean;
}

interface UserGoal {
    id: string;
    title: string;
    type: 'lesson' | 'course' | 'problem' | 'session';
    path: string;
    addedAt: Date;
}

const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300", className)} {...props} />
);

interface AISearchAgentProps {
    isCompact?: boolean;
    showGoals?: boolean;
}

export const AISearchAgent: React.FC<AISearchAgentProps> = ({ isCompact = false, showGoals = true }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [userGoals, setUserGoals] = useState<UserGoal[]>([]);

    // Load user goals from localStorage on mount
    useEffect(() => {
        const savedGoals = localStorage.getItem('userGoals');
        if (savedGoals) {
            setUserGoals(JSON.parse(savedGoals).map((g: any) => ({
                ...g,
                addedAt: new Date(g.addedAt)
            })));
        }
    }, []);

    // Smart search function that generates suggestions based on query
    const getSearchSuggestions = (query: string): TaskSuggestion[] => {
        if (!query.trim()) return [];

        const lowerQuery = query.toLowerCase();
        const suggestions: TaskSuggestion[] = [];

        // Keyword-based intelligent suggestions
        const keywords = {
            leetcode: ['leetcode', 'coding', 'problem', 'algorithm', 'dsa', 'code'],
            course: ['course', 'learn', 'lesson', 'study', 'tutorial'],
            session: ['session', 'meet', 'mentor', 'help', 'tutor'],
            essay: ['essay', 'write', 'writing', 'paper'],
            graph: ['graph', 'network', 'connect', 'friend', 'peer'],
            profile: ['profile', 'settings', 'account', 'me'],
            project: ['project', 'build', 'create', 'ide'],
            achievement: ['achievement', 'badge', 'rank', 'score', 'leaderboard'],
        };

        // Check for LeetCode queries
        if (keywords.leetcode.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-lc-1',
                    title: 'Browse LeetCode Problems',
                    description: 'View all available coding problems',
                    icon: Code,
                    path: '/leetcode',
                    priority: 'high',
                    category: 'build',
                    canBeGoal: true
                },
                {
                    id: 'search-lc-2',
                    title: 'LeetCode Courses',
                    description: 'Structured problem-solving courses',
                    icon: BookOpen,
                    path: '/leetcode-courses',
                    priority: 'high',
                    category: 'learn',
                    canBeGoal: true
                }
            );
        }

        // Check for course queries
        if (keywords.course.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-course-1',
                    title: 'Discover Courses',
                    description: 'Browse all available courses',
                    icon: BookOpen,
                    path: '/courses/discover',
                    priority: 'high',
                    category: 'learn',
                    canBeGoal: true
                },
                {
                    id: 'search-course-2',
                    title: 'My Enrolled Courses',
                    description: 'Continue your learning journey',
                    icon: BookOpen,
                    path: '/dashboard',
                    priority: 'medium',
                    category: 'learn'
                }
            );
        }

        // Check for session/mentorship queries
        if (keywords.session.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-session-1',
                    title: 'Book Mentorship Session',
                    description: 'Choose from mentors in Trust Graph',
                    icon: Calendar,
                    path: '/trust-graph',
                    priority: 'high',
                    category: 'connect',
                    canBeGoal: true
                },
                {
                    id: 'search-session-2',
                    title: 'My Sessions',
                    description: 'View scheduled and past sessions',
                    icon: Users,
                    path: '/sessions',
                    priority: 'high',
                    category: 'connect'
                }
            );
        }

        // Check for essay queries
        if (keywords.essay.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-essay-1',
                    title: 'AI Writing Assistant',
                    description: 'Get help with your essays',
                    icon: Brain,
                    path: '/ai-writing-assistant',
                    priority: 'high',
                    category: 'build',
                    canBeGoal: true
                }
            );
        }

        // Check for network/graph queries
        if (keywords.graph.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-graph-1',
                    title: 'Trust Graph Network',
                    description: 'Expand your professional network',
                    icon: Users,
                    path: '/trust-graph',
                    priority: 'high',
                    category: 'connect'
                }
            );
        }

        // Check for profile queries
        if (keywords.profile.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-profile-1',
                    title: 'My Profile',
                    description: 'View and edit your profile',
                    icon: User,
                    path: '/profile/setup',
                    priority: 'medium',
                    category: 'connect'
                }
            );
        }

        // Check for project/build queries
        if (keywords.project.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-project-1',
                    title: 'Ascent IDE',
                    description: 'Build projects in the cloud',
                    icon: Code,
                    path: '/ascent-ide',
                    priority: 'medium',
                    category: 'build',
                    canBeGoal: true
                }
            );
        }

        // Check for achievement queries
        if (keywords.achievement.some(k => lowerQuery.includes(k))) {
            suggestions.push(
                {
                    id: 'search-achieve-1',
                    title: 'My Achievements',
                    description: 'View your progress and badges',
                    icon: Trophy,
                    path: '/solved-problems',
                    priority: 'medium',
                    category: 'prove'
                },
                {
                    id: 'search-achieve-2',
                    title: 'Ecosystem Dashboard',
                    description: 'Check your rankings and stats',
                    icon: BarChart3,
                    path: '/ecosystem-dashboard',
                    priority: 'medium',
                    category: 'prove'
                }
            );
        }

        // If no keywords matched, suggest general navigation
        if (suggestions.length === 0) {
            suggestions.push(
                {
                    id: 'search-general-1',
                    title: 'Dashboard',
                    description: 'Return to your main dashboard',
                    icon: Target,
                    path: '/dashboard',
                    priority: 'low',
                    category: 'learn'
                },
                {
                    id: 'search-general-2',
                    title: `Search results for "${query}"`,
                    description: 'Try being more specific (e.g., "leetcode", "session", "course")',
                    icon: Search,
                    path: '#',
                    priority: 'low',
                    category: 'learn'
                }
            );
        }

        return suggestions;
    };

    // Get context-aware suggestions based on current page
    const getContextAwareSuggestions = (): TaskSuggestion[] => {
        const currentPath = location.pathname;

        // LeetCode page specific suggestions
        if (currentPath.includes('/leetcode')) {
            return [
                {
                    id: 'lc-1',
                    title: 'Two Sum Problem',
                    description: 'Easy - Arrays & Hashing',
                    icon: Code,
                    path: '/leetcode/problem/1',
                    priority: 'high',
                    category: 'build',
                    canBeGoal: true
                },
                {
                    id: 'lc-2',
                    title: 'Valid Parentheses',
                    description: 'Easy - Stack',
                    icon: Code,
                    path: '/leetcode/problem/20',
                    priority: 'medium',
                    category: 'build',
                    canBeGoal: true
                },
                {
                    id: 'lc-3',
                    title: 'Merge Two Sorted Lists',
                    description: 'Easy - Linked List',
                    icon: Code,
                    path: '/leetcode/problem/21',
                    priority: 'medium',
                    category: 'build',
                    canBeGoal: true
                },
                {
                    id: 'nav-1',
                    title: 'View All LeetCode Courses',
                    description: 'Browse structured learning paths',
                    icon: BookOpen,
                    path: '/courses/discover?filter=leetcode',
                    priority: 'low',
                    category: 'learn'
                }
            ];
        }

        // Courses page specific suggestions
        if (currentPath.includes('/courses')) {
            return [
                {
                    id: 'course-1',
                    title: 'React Advanced Concepts',
                    description: 'Continue Lesson 5 - Hooks',
                    icon: BookOpen,
                    path: '/courses/1/lesson/5',
                    priority: 'high',
                    category: 'learn',
                    canBeGoal: true
                },
                {
                    id: 'course-2',
                    title: 'Data Structures Fundamentals',
                    description: 'Start new course',
                    icon: BookOpen,
                    path: '/courses/2',
                    priority: 'medium',
                    category: 'learn',
                    canBeGoal: true
                },
                {
                    id: 'nav-2',
                    title: 'Practice on LeetCode',
                    description: 'Reinforce your learning',
                    icon: Trophy,
                    path: '/leetcode',
                    priority: 'medium',
                    category: 'build'
                }
            ];
        }

        // Trust Graph page suggestions
        if (currentPath.includes('/trust-graph')) {
            return [
                {
                    id: 'trust-1',
                    title: 'Connect with Senior Devs',
                    description: '3 professionals available',
                    icon: Users,
                    path: '/trust-graph?filter=seniors',
                    priority: 'high',
                    category: 'connect'
                },
                {
                    id: 'trust-2',
                    title: 'Book Mentorship Session',
                    description: 'Choose from mentors in Trust Graph',
                    icon: Calendar,
                    path: '/trust-graph',
                    priority: 'high',
                    category: 'connect',
                    canBeGoal: true
                }
            ];
        }

        // Default dashboard suggestions
        return [
            {
                id: '1',
                title: 'Continue LeetCode Problem',
                description: 'Complete "Two Sum" - 60% done',
                icon: Code,
                path: '/leetcode',
                priority: 'high',
                category: 'build',
                canBeGoal: true
            },
            {
                id: '2',
                title: 'Book Mentorship Session',
                description: 'Choose from mentors in Trust Graph',
                icon: Calendar,
                path: '/trust-graph',
                priority: 'high',
                category: 'connect',
                canBeGoal: true
            },
            {
                id: '3',
                title: 'Explore Trust Graph',
                description: 'Expand your professional network',
                icon: Users,
                path: '/trust-graph',
                priority: 'medium',
                category: 'connect'
            },
            {
                id: '4',
                title: 'Resume Next Lesson',
                description: 'React Advanced Concepts - Lesson 5',
                icon: BookOpen,
                path: '/courses/discover',
                priority: 'medium',
                category: 'learn',
                canBeGoal: true
            },
            {
                id: '5',
                title: 'Check Your Rankings',
                description: 'You moved up 15 spots this week!',
                icon: Trophy,
                path: '/ecosystem-dashboard',
                priority: 'low',
                category: 'prove'
            },
            {
                id: '6',
                title: 'Practice Trading',
                description: 'Build financial analysis skills',
                icon: TrendingUp,
                path: '/trading-terminal',
                priority: 'low',
                category: 'build'
            }
        ];
    };

    // Determine which suggestions to show: search results or context-aware
    const searchResults = searchQuery.trim() ? getSearchSuggestions(searchQuery) : [];
    const taskSuggestions = searchQuery.trim() ? searchResults : getContextAwareSuggestions();

    // Add task to goals
    const addToGoals = (task: TaskSuggestion, e: React.MouseEvent) => {
        e.stopPropagation();

        const newGoal: UserGoal = {
            id: task.id,
            title: task.title,
            type: task.path.includes('leetcode') ? 'problem' :
                  task.path.includes('courses') ? 'lesson' :
                  task.path.includes('sessions') ? 'session' : 'course',
            path: task.path,
            addedAt: new Date()
        };

        const updatedGoals = [...userGoals, newGoal];
        setUserGoals(updatedGoals);
        localStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    };

    // Remove goal
    const removeGoal = (goalId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedGoals = userGoals.filter(g => g.id !== goalId);
        setUserGoals(updatedGoals);
        localStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    };

    const isGoal = (taskId: string) => userGoals.some(g => g.id === taskId);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);

        // Simulate AI search processing
        setTimeout(() => {
            setIsSearching(false);
        }, 300);
    };

    const handleTaskClick = (path: string) => {
        navigate(path);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'border-red-500/50 bg-red-500/10';
            case 'medium':
                return 'border-orange-500/50 bg-orange-500/10';
            case 'low':
                return 'border-blue-500/50 bg-blue-500/10';
            default:
                return 'border-slate-500/50 bg-slate-500/10';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'learn':
                return 'text-cyan-400';
            case 'build':
                return 'text-orange-400';
            case 'connect':
                return 'text-purple-400';
            case 'prove':
                return 'text-yellow-400';
            default:
                return 'text-slate-400';
        }
    };

    return (
        <GlassCard className="border-emerald-500/50">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
                        <Brain className="h-6 w-6 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            AI Navigation Assistant
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                        </CardTitle>
                        <CardDescription className="text-emerald-400/80">
                            Smart suggestions for your next steps
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative">
                    <Input
                        type="text"
                        placeholder="Ask me anything... (e.g., 'What should I do next?')"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 pr-10"
                    />
                    <Button
                        type="submit"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30"
                        disabled={isSearching}
                    >
                        <Search className={cn("h-4 w-4 text-emerald-400", isSearching && "animate-spin")} />
                    </Button>
                </form>

                {/* Task Suggestions */}
                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        {searchQuery.trim() ? (
                            <>
                                <Search className="h-4 w-4 text-cyan-400" />
                                Search Results ({taskSuggestions.length})
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 text-emerald-400" />
                                Recommended Next Tasks
                            </>
                        )}
                    </h4>

                    {/* User Goals Section - Only show when not searching */}
                    {showGoals && userGoals.length > 0 && !searchQuery.trim() && (
                        <div className="mb-4 p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
                            <h5 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                My Goals ({userGoals.length})
                            </h5>
                            <div className="space-y-2">
                                {userGoals.map((goal) => (
                                    <div
                                        key={goal.id}
                                        onClick={() => navigate(goal.path)}
                                        className="group relative cursor-pointer rounded-lg p-2 border border-cyan-500/30 bg-slate-800/50 hover:bg-slate-800/70 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                                                <span className="text-sm text-white truncate">{goal.title}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 hover:bg-red-500/20"
                                                onClick={(e) => removeGoal(goal.id, e)}
                                            >
                                                <X className="h-3 w-3 text-red-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No results message */}
                    {searchQuery.trim() && taskSuggestions.length === 0 && (
                        <div className="text-center py-8">
                            <Search className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No results found for "{searchQuery}"</p>
                            <p className="text-slate-500 text-xs mt-1">Try: "leetcode", "session", "course", "profile"</p>
                        </div>
                    )}

                    {taskSuggestions.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => handleTaskClick(task.path)}
                            className={cn(
                                "group relative cursor-pointer rounded-lg p-3 border transition-all duration-200 hover:scale-[1.02]",
                                getPriorityColor(task.priority)
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn("p-2 bg-slate-800/50 rounded-lg", getCategoryColor(task.category))}>
                                    <task.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h5 className="text-sm font-semibold text-white truncate">
                                            {task.title}
                                        </h5>
                                        <div className="flex items-center gap-1">
                                            {task.canBeGoal && !isGoal(task.id) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 hover:bg-cyan-500/20"
                                                    onClick={(e) => addToGoals(task, e)}
                                                    title="Add to goals"
                                                >
                                                    <Plus className="h-3 w-3 text-cyan-400" />
                                                </Button>
                                            )}
                                            {isGoal(task.id) && (
                                                <Check className="h-4 w-4 text-cyan-400" title="Already in goals" />
                                            )}
                                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-1">
                                        {task.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            task.priority === 'high' && "bg-red-500/20 text-red-400",
                                            task.priority === 'medium' && "bg-orange-500/20 text-orange-400",
                                            task.priority === 'low' && "bg-blue-500/20 text-blue-400"
                                        )}>
                                            {task.priority === 'high' && '🔥 High Priority'}
                                            {task.priority === 'medium' && '⚡ Medium'}
                                            {task.priority === 'low' && '💡 Suggested'}
                                        </span>
                                        <span className="text-xs text-slate-500 uppercase">
                                            {task.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-slate-700/50">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => navigate('/trust-graph')}
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Trust Graph
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => navigate('/leetcode')}
                        >
                            <Code className="h-4 w-4 mr-2" />
                            LeetCode
                        </Button>
                    </div>
                </div>
            </CardContent>
        </GlassCard>
    );
};
