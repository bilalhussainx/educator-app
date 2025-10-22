/**
 * ================================================================
 * LEETCODE BROWSER - TOP 0.1% UI/UX DESIGN
 * ================================================================
 * Beautiful problem discovery with intelligent search, filters, and navigation
 * Features: Advanced search, pattern grouping, difficulty filtering, progress tracking
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Code,
    Search,
    Filter,
    TrendingUp,
    CheckCircle,
    Circle,
    ChevronRight,
    Zap,
    Trophy,
    Target,
    Hash,
    Tag,
    Sparkles,
    BookOpen,
    Flame,
    Star,
    ArrowUpCircle,
    BarChart3,
    Grid3x3,
    List
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeetCodeProblem {
    problem_number: number;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    pattern?: string;
    category?: string;
    acceptance_rate?: number;
    is_solved?: boolean;
}

const LeetCodeBrowser: React.FC = () => {
    const navigate = useNavigate();
    const [problems, setProblems] = useState<LeetCodeProblem[]>([]);
    const [filteredProblems, setFilteredProblems] = useState<LeetCodeProblem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
    const [patternFilter, setPatternFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
    const [patterns, setPatterns] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    useEffect(() => {
        fetchProblems();
    }, []);

    useEffect(() => {
        filterProblems();
    }, [problems, searchQuery, difficultyFilter, patternFilter, statusFilter]);

    const fetchProblems = async () => {
        try {
            setLoading(true);

            // Fetch all LeetCode problems from the backend
            const response = await apiClient.get('/api/leetcode/problems/all');

            if (response.data.success) {
                const problemsData = response.data.problems || [];
                setProblems(problemsData);

                // Extract unique patterns
                const uniquePatterns = [...new Set(problemsData
                    .map((p: LeetCodeProblem) => p.pattern)
                    .filter(Boolean)
                )] as string[];
                setPatterns(uniquePatterns.sort());

                toast.success(`Loaded ${problemsData.length} LeetCode problems`);
            } else {
                // Fallback: Generate default problem list
                generateDefaultProblems();
            }
        } catch (error) {
            console.error('Error fetching problems:', error);
            toast.error('Failed to load problems from server, using fallback list');
            generateDefaultProblems();
        } finally {
            setLoading(false);
        }
    };

    const generateDefaultProblems = () => {
        // Comprehensive list of popular LeetCode problems
        const defaultProblems: LeetCodeProblem[] = [
            // Arrays & Hashing
            { problem_number: 1, title: 'Two Sum', difficulty: 'easy', pattern: 'Arrays & Hashing' },
            { problem_number: 49, title: 'Group Anagrams', difficulty: 'medium', pattern: 'Arrays & Hashing' },
            { problem_number: 217, title: 'Contains Duplicate', difficulty: 'easy', pattern: 'Arrays & Hashing' },
            { problem_number: 242, title: 'Valid Anagram', difficulty: 'easy', pattern: 'Arrays & Hashing' },
            { problem_number: 347, title: 'Top K Frequent Elements', difficulty: 'medium', pattern: 'Arrays & Hashing' },

            // Two Pointers
            { problem_number: 125, title: 'Valid Palindrome', difficulty: 'easy', pattern: 'Two Pointers' },
            { problem_number: 15, title: '3Sum', difficulty: 'medium', pattern: 'Two Pointers' },
            { problem_number: 11, title: 'Container With Most Water', difficulty: 'medium', pattern: 'Two Pointers' },

            // Sliding Window
            { problem_number: 121, title: 'Best Time to Buy and Sell Stock', difficulty: 'easy', pattern: 'Sliding Window' },
            { problem_number: 3, title: 'Longest Substring Without Repeating', difficulty: 'medium', pattern: 'Sliding Window' },
            { problem_number: 424, title: 'Longest Repeating Character Replacement', difficulty: 'medium', pattern: 'Sliding Window' },

            // Stack
            { problem_number: 20, title: 'Valid Parentheses', difficulty: 'easy', pattern: 'Stack' },
            { problem_number: 155, title: 'Min Stack', difficulty: 'medium', pattern: 'Stack' },
            { problem_number: 739, title: 'Daily Temperatures', difficulty: 'medium', pattern: 'Stack' },

            // Binary Search
            { problem_number: 704, title: 'Binary Search', difficulty: 'easy', pattern: 'Binary Search' },
            { problem_number: 33, title: 'Search in Rotated Sorted Array', difficulty: 'medium', pattern: 'Binary Search' },
            { problem_number: 153, title: 'Find Minimum in Rotated Array', difficulty: 'medium', pattern: 'Binary Search' },

            // Linked List
            { problem_number: 21, title: 'Merge Two Sorted Lists', difficulty: 'easy', pattern: 'Linked List' },
            { problem_number: 206, title: 'Reverse Linked List', difficulty: 'easy', pattern: 'Linked List' },
            { problem_number: 141, title: 'Linked List Cycle', difficulty: 'easy', pattern: 'Linked List' },
            { problem_number: 19, title: 'Remove Nth Node From End', difficulty: 'medium', pattern: 'Linked List' },

            // Trees
            { problem_number: 226, title: 'Invert Binary Tree', difficulty: 'easy', pattern: 'Trees' },
            { problem_number: 104, title: 'Maximum Depth of Binary Tree', difficulty: 'easy', pattern: 'Trees' },
            { problem_number: 543, title: 'Diameter of Binary Tree', difficulty: 'easy', pattern: 'Trees' },
            { problem_number: 102, title: 'Binary Tree Level Order Traversal', difficulty: 'medium', pattern: 'Trees' },
            { problem_number: 98, title: 'Validate Binary Search Tree', difficulty: 'medium', pattern: 'Trees' },

            // Tries
            { problem_number: 208, title: 'Implement Trie', difficulty: 'medium', pattern: 'Tries' },
            { problem_number: 211, title: 'Design Add and Search Words', difficulty: 'medium', pattern: 'Tries' },

            // Heap / Priority Queue
            { problem_number: 703, title: 'Kth Largest Element in Stream', difficulty: 'easy', pattern: 'Heap' },
            { problem_number: 295, title: 'Find Median from Data Stream', difficulty: 'hard', pattern: 'Heap' },

            // Backtracking
            { problem_number: 78, title: 'Subsets', difficulty: 'medium', pattern: 'Backtracking' },
            { problem_number: 39, title: 'Combination Sum', difficulty: 'medium', pattern: 'Backtracking' },
            { problem_number: 46, title: 'Permutations', difficulty: 'medium', pattern: 'Backtracking' },

            // Graphs
            { problem_number: 200, title: 'Number of Islands', difficulty: 'medium', pattern: 'Graphs' },
            { problem_number: 133, title: 'Clone Graph', difficulty: 'medium', pattern: 'Graphs' },
            { problem_number: 207, title: 'Course Schedule', difficulty: 'medium', pattern: 'Graphs' },

            // Dynamic Programming
            { problem_number: 70, title: 'Climbing Stairs', difficulty: 'easy', pattern: 'Dynamic Programming' },
            { problem_number: 198, title: 'House Robber', difficulty: 'medium', pattern: 'Dynamic Programming' },
            { problem_number: 322, title: 'Coin Change', difficulty: 'medium', pattern: 'Dynamic Programming' },
            { problem_number: 300, title: 'Longest Increasing Subsequence', difficulty: 'medium', pattern: 'Dynamic Programming' },
            { problem_number: 1143, title: 'Longest Common Subsequence', difficulty: 'medium', pattern: 'Dynamic Programming' },

            // Greedy
            { problem_number: 53, title: 'Maximum Subarray', difficulty: 'medium', pattern: 'Greedy' },
            { problem_number: 55, title: 'Jump Game', difficulty: 'medium', pattern: 'Greedy' },

            // Intervals
            { problem_number: 57, title: 'Insert Interval', difficulty: 'medium', pattern: 'Intervals' },
            { problem_number: 56, title: 'Merge Intervals', difficulty: 'medium', pattern: 'Intervals' },

            // Math & Geometry
            { problem_number: 48, title: 'Rotate Image', difficulty: 'medium', pattern: 'Math & Geometry' },
            { problem_number: 73, title: 'Set Matrix Zeroes', difficulty: 'medium', pattern: 'Math & Geometry' },

            // Bit Manipulation
            { problem_number: 191, title: 'Number of 1 Bits', difficulty: 'easy', pattern: 'Bit Manipulation' },
            { problem_number: 338, title: 'Counting Bits', difficulty: 'easy', pattern: 'Bit Manipulation' },
            { problem_number: 268, title: 'Missing Number', difficulty: 'easy', pattern: 'Bit Manipulation' },
        ];

        setProblems(defaultProblems);
        const uniquePatterns = [...new Set(defaultProblems.map(p => p.pattern).filter(Boolean))] as string[];
        setPatterns(uniquePatterns.sort());
    };

    const filterProblems = () => {
        let filtered = problems;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(query) ||
                p.problem_number.toString().includes(query) ||
                p.pattern?.toLowerCase().includes(query)
            );
        }

        // Difficulty filter
        if (difficultyFilter !== 'all') {
            filtered = filtered.filter(p => p.difficulty === difficultyFilter);
        }

        // Pattern filter
        if (patternFilter !== 'all') {
            filtered = filtered.filter(p => p.pattern === patternFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p =>
                statusFilter === 'solved' ? p.is_solved : !p.is_solved
            );
        }

        setFilteredProblems(filtered);
    };

    const handleProblemClick = (problemNumber: number) => {
        // Format problem number with leading zeros (e.g., 0001, 0020, 0100)
        const formattedNumber = problemNumber.toString().padStart(4, '0');
        console.log(`🔗 Navigating to problem: ${formattedNumber} (${problemNumber})`);
        navigate(`/leetcode/ide/${formattedNumber}`);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            case 'medium':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
            case 'hard':
                return 'bg-rose-500/20 text-rose-400 border-rose-500/50';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
        }
    };

    const getDifficultyIcon = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return <Zap className="h-4 w-4" />;
            case 'medium':
                return <TrendingUp className="h-4 w-4" />;
            case 'hard':
                return <Flame className="h-4 w-4" />;
            default:
                return <Code className="h-4 w-4" />;
        }
    };

    const getStats = () => {
        const total = problems.length;
        const solved = problems.filter(p => p.is_solved).length;
        const easy = problems.filter(p => p.difficulty === 'easy').length;
        const medium = problems.filter(p => p.difficulty === 'medium').length;
        const hard = problems.filter(p => p.difficulty === 'hard').length;
        const solveRate = total > 0 ? Math.round((solved / total) * 100) : 0;

        return { total, solved, easy, medium, hard, solveRate };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <Code className="h-20 w-20 text-cyan-400 animate-pulse mx-auto mb-6" />
                        <div className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full animate-pulse"></div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Loading Problems
                    </h2>
                    <p className="text-slate-400">Fetching latest LeetCode challenges...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-12 space-y-8">
                {/* Hero Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-4">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm text-cyan-400 font-medium">Problem Discovery Hub</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                        LeetCode Arena
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
                        Master coding interviews with {stats.total} curated problems across {patterns.length} patterns
                    </p>
                </div>

                {/* Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Total */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/50 hover:border-cyan-500/50 transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                    <Target className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                                    <p className="text-xs text-slate-400">Total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Solved */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/50 hover:border-green-500/50 transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-green-500/10 rounded-lg border border-green-500/20 group-hover:scale-110 transition-transform">
                                    <CheckCircle className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.solved}</p>
                                    <p className="text-xs text-slate-400">Solved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Solve Rate */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/50 hover:border-purple-500/50 transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="h-5 w-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stats.solveRate}%</p>
                                    <p className="text-xs text-slate-400">Rate</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Easy */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-emerald-900/50 hover:border-emerald-500/50 transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <Zap className="h-5 w-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-emerald-400">{stats.easy}</p>
                                    <p className="text-xs text-slate-400">Easy</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Medium */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-amber-900/50 hover:border-amber-500/50 transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-amber-400">{stats.medium}</p>
                                    <p className="text-xs text-slate-400">Medium</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hard */}
                    <Card className="bg-slate-900/40 backdrop-blur-xl border-rose-900/50 hover:border-rose-500/50 transition-all group">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20 group-hover:scale-110 transition-transform">
                                    <Flame className="h-5 w-5 text-rose-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-rose-400">{stats.hard}</p>
                                    <p className="text-xs text-slate-400">Hard</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Card */}
                <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/50">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-cyan-400" />
                                <CardTitle className="text-xl">Filters & Search</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant={viewMode === 'list' ? 'default' : 'outline'}
                                    onClick={() => setViewMode('list')}
                                    className="h-9 w-9 p-0"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                                    onClick={() => setViewMode('grid')}
                                    className="h-9 w-9 p-0"
                                >
                                    <Grid3x3 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by title, number, or pattern..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                            />
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {/* Difficulty Filters */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('all')}
                                    className="bg-slate-700 hover:bg-slate-600"
                                >
                                    All Levels
                                </Button>
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'easy' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('easy')}
                                    className={cn(
                                        difficultyFilter === 'easy'
                                            ? 'bg-emerald-500 hover:bg-emerald-600'
                                            : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                                    )}
                                >
                                    <Zap className="h-3 w-3 mr-1" />
                                    Easy
                                </Button>
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'medium' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('medium')}
                                    className={cn(
                                        difficultyFilter === 'medium'
                                            ? 'bg-amber-500 hover:bg-amber-600'
                                            : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                                    )}
                                >
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Medium
                                </Button>
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'hard' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('hard')}
                                    className={cn(
                                        difficultyFilter === 'hard'
                                            ? 'bg-rose-500 hover:bg-rose-600'
                                            : 'border-rose-500/50 text-rose-400 hover:bg-rose-500/10'
                                    )}
                                >
                                    <Flame className="h-3 w-3 mr-1" />
                                    Hard
                                </Button>
                            </div>

                            {/* Pattern Dropdown */}
                            <div className="flex-1 min-w-[200px]">
                                <select
                                    value={patternFilter}
                                    onChange={(e) => setPatternFilter(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                >
                                    <option value="all">All Patterns ({patterns.length})</option>
                                    {patterns.map(pattern => (
                                        <option key={pattern} value={pattern}>{pattern}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filters */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    All Status
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'solved' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('solved')}
                                    className={cn(
                                        statusFilter === 'solved'
                                            ? 'bg-cyan-500 hover:bg-cyan-600'
                                            : 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'
                                    )}
                                >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Solved
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'unsolved' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('unsolved')}
                                >
                                    <Circle className="h-3 w-3 mr-1" />
                                    Unsolved
                                </Button>
                            </div>
                        </div>

                        {/* Active Filters Summary */}
                        {(searchQuery || difficultyFilter !== 'all' || patternFilter !== 'all' || statusFilter !== 'all') && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                                <span className="text-sm text-slate-400">Active filters:</span>
                                {searchQuery && (
                                    <Badge variant="secondary" className="bg-slate-700">
                                        Search: "{searchQuery}"
                                    </Badge>
                                )}
                                {difficultyFilter !== 'all' && (
                                    <Badge className={getDifficultyColor(difficultyFilter)}>
                                        {difficultyFilter}
                                    </Badge>
                                )}
                                {patternFilter !== 'all' && (
                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                        {patternFilter}
                                    </Badge>
                                )}
                                {statusFilter !== 'all' && (
                                    <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                                        {statusFilter}
                                    </Badge>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setDifficultyFilter('all');
                                        setPatternFilter('all');
                                        setStatusFilter('all');
                                    }}
                                    className="ml-auto text-xs"
                                >
                                    Clear all
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Problems List/Grid */}
                <Card className="bg-slate-900/40 backdrop-blur-xl border-slate-700/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">
                                Problems <span className="text-cyan-400">({filteredProblems.length})</span>
                            </CardTitle>
                            {filteredProblems.length === 0 && searchQuery && (
                                <span className="text-sm text-slate-400">
                                    No results found
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[700px] pr-4">
                            {viewMode === 'list' ? (
                                // List View
                                <div className="space-y-2">
                                    {filteredProblems.map((problem) => (
                                        <div
                                            key={problem.problem_number}
                                            onClick={() => handleProblemClick(problem.problem_number)}
                                            className="group cursor-pointer p-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                {/* Status Icon */}
                                                {problem.is_solved ? (
                                                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-slate-600 flex-shrink-0" />
                                                )}

                                                {/* Problem Number */}
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-4 w-4 text-slate-500" />
                                                    <span className="text-slate-400 font-mono font-semibold min-w-[60px]">
                                                        {problem.problem_number.toString().padStart(4, '0')}
                                                    </span>
                                                </div>

                                                {/* Title & Pattern */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                                                        {problem.title}
                                                    </h3>
                                                    {problem.pattern && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Tag className="h-3 w-3 text-slate-500" />
                                                            <span className="text-xs text-slate-500">{problem.pattern}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Difficulty Badge */}
                                                <Badge className={cn(getDifficultyColor(problem.difficulty), 'flex items-center gap-1.5')}>
                                                    {getDifficultyIcon(problem.difficulty)}
                                                    {problem.difficulty}
                                                </Badge>

                                                {/* Arrow */}
                                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // Grid View
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredProblems.map((problem) => (
                                        <div
                                            key={problem.problem_number}
                                            onClick={() => handleProblemClick(problem.problem_number)}
                                            className="group cursor-pointer p-5 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                                        >
                                            {/* Status & Number */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-4 w-4 text-slate-500" />
                                                    <span className="text-sm text-slate-400 font-mono font-semibold">
                                                        {problem.problem_number.toString().padStart(4, '0')}
                                                    </span>
                                                </div>
                                                {problem.is_solved ? (
                                                    <CheckCircle className="h-5 w-5 text-green-400" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-slate-600" />
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-3 line-clamp-2 min-h-[48px]">
                                                {problem.title}
                                            </h3>

                                            {/* Pattern & Difficulty */}
                                            <div className="flex items-center justify-between mt-auto">
                                                {problem.pattern && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Tag className="h-3 w-3 text-slate-500" />
                                                        <span className="text-xs text-slate-500 truncate">
                                                            {problem.pattern.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                )}
                                                <Badge className={cn(getDifficultyColor(problem.difficulty), 'flex items-center gap-1 ml-auto')}>
                                                    {getDifficultyIcon(problem.difficulty)}
                                                    <span className="text-xs">{problem.difficulty[0].toUpperCase()}</span>
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {filteredProblems.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="relative inline-block mb-6">
                                        <Code className="h-20 w-20 text-slate-600 mx-auto" />
                                        <div className="absolute inset-0 bg-slate-600/20 blur-2xl rounded-full"></div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">No problems found</h3>
                                    <p className="text-slate-400 mb-6">Try adjusting your filters or search query</p>
                                    <Button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setDifficultyFilter('all');
                                            setPatternFilter('all');
                                            setStatusFilter('all');
                                        }}
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                                    >
                                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                                        Clear All Filters
                                    </Button>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LeetCodeBrowser;
