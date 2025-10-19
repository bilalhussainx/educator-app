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
    Tag
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

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

    useEffect(() => {
        fetchProblems();
    }, []);

    useEffect(() => {
        filterProblems();
    }, [problems, searchQuery, difficultyFilter, patternFilter, statusFilter]);

    const fetchProblems = async () => {
        try {
            setLoading(true);

            // Fetch all LeetCode problems from the enriched database
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
            toast.error('Failed to load problems, using default list');
            generateDefaultProblems();
        } finally {
            setLoading(false);
        }
    };

    const generateDefaultProblems = () => {
        // Generate a comprehensive list of popular LeetCode problems
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
        navigate(`/leetcode/ide/${problemNumber}`);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'hard':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            default:
                return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
        }
    };

    const getStats = () => {
        const total = problems.length;
        const solved = problems.filter(p => p.is_solved).length;
        const easy = problems.filter(p => p.difficulty === 'easy').length;
        const medium = problems.filter(p => p.difficulty === 'medium').length;
        const hard = problems.filter(p => p.difficulty === 'hard').length;

        return { total, solved, easy, medium, hard };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <Code className="h-16 w-16 text-cyan-400 animate-pulse mx-auto mb-4" />
                    <p className="text-xl">Loading LeetCode Problems...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            LeetCode Problem Browser
                        </h1>
                        <p className="text-slate-400 mt-2">
                            Browse and solve {stats.total} coding problems across {patterns.length} patterns
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/leetcode/courses')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                        <Trophy className="h-4 w-4 mr-2" />
                        View Courses
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Target className="h-8 w-8 text-cyan-400" />
                                <div>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                    <p className="text-sm text-slate-400">Total Problems</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-8 w-8 text-green-400" />
                                <div>
                                    <p className="text-2xl font-bold">{stats.solved}</p>
                                    <p className="text-sm text-slate-400">Solved</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-green-900/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Zap className="h-8 w-8 text-green-400" />
                                <div>
                                    <p className="text-2xl font-bold text-green-400">{stats.easy}</p>
                                    <p className="text-sm text-slate-400">Easy</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-yellow-900/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-8 w-8 text-yellow-400" />
                                <div>
                                    <p className="text-2xl font-bold text-yellow-400">{stats.medium}</p>
                                    <p className="text-sm text-slate-400">Medium</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-red-900/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Trophy className="h-8 w-8 text-red-400" />
                                <div>
                                    <p className="text-2xl font-bold text-red-400">{stats.hard}</p>
                                    <p className="text-sm text-slate-400">Hard</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by title, number, or pattern..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex flex-wrap gap-4">
                            {/* Difficulty */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('all')}
                                >
                                    All
                                </Button>
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'easy' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('easy')}
                                    className="border-green-500/50 text-green-400"
                                >
                                    Easy
                                </Button>
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'medium' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('medium')}
                                    className="border-yellow-500/50 text-yellow-400"
                                >
                                    Medium
                                </Button>
                                <Button
                                    size="sm"
                                    variant={difficultyFilter === 'hard' ? 'default' : 'outline'}
                                    onClick={() => setDifficultyFilter('hard')}
                                    className="border-red-500/50 text-red-400"
                                >
                                    Hard
                                </Button>
                            </div>

                            {/* Pattern */}
                            <div className="flex-1">
                                <select
                                    value={patternFilter}
                                    onChange={(e) => setPatternFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                                >
                                    <option value="all">All Patterns</option>
                                    {patterns.map(pattern => (
                                        <option key={pattern} value={pattern}>{pattern}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    All
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'solved' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('solved')}
                                    className="border-cyan-500/50 text-cyan-400"
                                >
                                    Solved
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'unsolved' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('unsolved')}
                                >
                                    Unsolved
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Problems List */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Problems ({filteredProblems.length})</span>
                            {filteredProblems.length === 0 && searchQuery && (
                                <span className="text-sm font-normal text-slate-400">
                                    No results found
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-2">
                                {filteredProblems.map((problem) => (
                                    <div
                                        key={problem.problem_number}
                                        onClick={() => handleProblemClick(problem.problem_number)}
                                        className="group cursor-pointer p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                {/* Status Icon */}
                                                {problem.is_solved ? (
                                                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-slate-600 flex-shrink-0" />
                                                )}

                                                {/* Problem Number */}
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-4 w-4 text-slate-500" />
                                                    <span className="text-slate-400 font-mono">{problem.problem_number}</span>
                                                </div>

                                                {/* Title */}
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
                                                <Badge className={getDifficultyColor(problem.difficulty)}>
                                                    {problem.difficulty}
                                                </Badge>

                                                {/* Arrow */}
                                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredProblems.length === 0 && !searchQuery && (
                                    <div className="text-center py-12">
                                        <Code className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400">No problems match your filters</p>
                                        <Button
                                            onClick={() => {
                                                setDifficultyFilter('all');
                                                setPatternFilter('all');
                                                setStatusFilter('all');
                                            }}
                                            className="mt-4"
                                            variant="outline"
                                        >
                                            Clear Filters
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LeetCodeBrowser;
