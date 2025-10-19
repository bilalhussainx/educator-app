import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, BookOpen, Clock, Users, Target, TrendingUp, Play, ChevronRight, Star, Filter, Search } from 'lucide-react';
import { AISearchAgent } from '../components/AISearchAgent';

interface LeetCodeCourse {
    id: string;
    title: string;
    description: string;
    difficulty_level: string;
    estimated_duration: string;
    created_at: string;
    lesson_count: number;
    problem_count: number;
    patterns: string[];
}

const LeetCodeCoursesPage: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<LeetCodeCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'problems'>('newest');

    useEffect(() => {
        fetchLeetCodeCourses();
    }, []);

    const fetchLeetCodeCourses = async () => {
        try {
            setLoading(true);
            
            // Get auth token with development fallback
            const token = localStorage.getItem('authToken') || 'dev-token-for-testing';
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            console.log('Fetching LeetCode courses from /api/enhanced-courses/leetcode');
            
            const response = await fetch('/api/enhanced-courses/leetcode', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`Failed to fetch courses: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Enhance courses with lesson/problem counts
            const enhancedCourses = await Promise.all(data.map(async (course: any) => {
                try {
                    const lessonResponse = await fetch(`/api/enhanced-courses/${course.id}/lessons`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!lessonResponse.ok) {
                        console.warn(`Could not fetch lessons for course ${course.id}: ${lessonResponse.status}`);
                        throw new Error('Failed to fetch lessons');
                    }
                    
                    const lessons = await lessonResponse.json();
                    
                    const problemLessons = lessons.filter((l: any) => l.lesson_type === 'coding_problem');
                    const patterns = extractPatternsFromLessons(lessons);
                    
                    return {
                        ...course,
                        lesson_count: lessons.length,
                        problem_count: problemLessons.length,
                        patterns
                    };
                } catch (error) {
                    console.warn(`Could not get lessons for course ${course.id}`);
                    return {
                        ...course,
                        lesson_count: 0,
                        problem_count: 0,
                        patterns: []
                    };
                }
            }));
            
            setCourses(enhancedCourses);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const extractPatternsFromLessons = (lessons: any[]): string[] => {
        const patterns = new Set<string>();
        lessons.forEach(lesson => {
            if (lesson.title?.includes('Introduction to')) {
                const pattern = lesson.title.replace('Introduction to ', '');
                patterns.add(pattern);
            }
        });
        return Array.from(patterns);
    };

    const filteredCourses = courses
        .filter(course => {
            if (filter !== 'all' && course.difficulty_level !== filter) return false;
            if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
                !course.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'problems':
                    return b.problem_count - a.problem_count;
                default:
                    return 0;
            }
        });

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-600 bg-green-100 border-green-200';
            case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
            case 'hard': return 'text-red-600 bg-red-100 border-red-200';
            default: return 'text-gray-600 bg-gray-100 border-gray-200';
        }
    };

    const startCourse = (courseId: string) => {
        navigate(`/enhanced-courses/${courseId}/lessons`);
    };

    const viewProblems = (courseId: string) => {
        navigate(`/leetcode-course/${courseId}/problems`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading LeetCode courses...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4 text-xl">⚠️ Error</div>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={fetchLeetCodeCourses}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4">
                            🚀 LeetCode Mastery Courses
                        </h1>
                        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                            Master coding interviews with pattern-based learning. 
                            Each course contains real LeetCode problems organized by algorithmic patterns.
                        </p>
                        <div className="mt-8 flex justify-center gap-8 text-sm">
                            <div className="flex items-center gap-2">
                                <Code className="w-5 h-5" />
                                <span>Multi-language Support</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                <span>Pattern-based Learning</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                <span>Real LeetCode Problems</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="max-w-7xl mx-auto px-4 py-6 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="problems">Most Problems</option>
                    </select>
                </div>
            </div>

            {/* Main Content with AI Agent */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Courses Grid - Takes 3 columns */}
                    <div className="lg:col-span-3">
                        {filteredCourses.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4 text-6xl">📚</div>
                        <h3 className="text-xl font-medium text-gray-600 mb-2">No courses found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters, or generate a new course.</p>
                        <button
                            onClick={() => navigate('/course-generator')}
                            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Generate New Course
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map(course => (
                            <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200">
                                {/* Course Header */}
                                <div className="p-6 pb-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Code className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(course.difficulty_level)}`}>
                                                    {course.difficulty_level.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-yellow-500">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="text-sm font-medium">4.8</span>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                                        {course.title}
                                    </h3>
                                    
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                        {course.description}
                                    </p>
                                </div>

                                {/* Course Stats */}
                                <div className="px-6 pb-4">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="flex items-center justify-center mb-1">
                                                <BookOpen className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-800">{course.lesson_count}</div>
                                            <div className="text-xs text-gray-500">Lessons</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center mb-1">
                                                <Target className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-800">{course.problem_count}</div>
                                            <div className="text-xs text-gray-500">Problems</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center mb-1">
                                                <Clock className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div className="text-lg font-bold text-gray-800">{course.estimated_duration}</div>
                                            <div className="text-xs text-gray-500">Duration</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Patterns */}
                                {course.patterns.length > 0 && (
                                    <div className="px-6 pb-4">
                                        <div className="text-xs text-gray-500 mb-2">Patterns Covered:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {course.patterns.slice(0, 3).map((pattern, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                    {pattern}
                                                </span>
                                            ))}
                                            {course.patterns.length > 3 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                    +{course.patterns.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => startCourse(course.id)}
                                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                        >
                                            <Play className="w-4 h-4" />
                                            Start Course
                                        </button>
                                        <button
                                            onClick={() => viewProblems(course.id)}
                                            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                    </div>

                    {/* AI Agent Sidebar - Takes 1 column */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <AISearchAgent isCompact={false} showGoals={true} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-600 mb-2">{courses.length}</div>
                            <div className="text-gray-600">Total Courses</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {courses.reduce((sum, course) => sum + course.problem_count, 0)}
                            </div>
                            <div className="text-gray-600">LeetCode Problems</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-600 mb-2">14</div>
                            <div className="text-gray-600">Coding Patterns</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-orange-600 mb-2">3</div>
                            <div className="text-gray-600">Languages</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeetCodeCoursesPage;