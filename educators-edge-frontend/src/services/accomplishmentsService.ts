import apiClient from './apiClient';

export interface Accomplishment {
    id: string;
    type: 'course_created' | 'student_helped' | 'session_completed' | 'high_rating' | 'milestone' | 'skill_badge';
    title: string;
    description: string;
    date: string;
    metadata: {
        studentCount?: number;
        rating?: number;
        courseTitle?: string;
        sessionType?: string;
        skillName?: string;
        badgeLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
    };
    isPublic: boolean;
    xpEarned: number;
}

export interface TeacherStats {
    totalStudentsHelped: number;
    totalCoursesCreated: number;
    totalSessionsCompleted: number;
    averageRating: number;
    specializations: string[];
    teachingStreak: number; // consecutive days active
    topSkills: Array<{
        skill: string;
        endorsements: number;
        sessions: number;
    }>;
    achievements: Array<{
        name: string;
        description: string;
        earnedDate: string;
        rarity: 'common' | 'rare' | 'epic' | 'legendary';
    }>;
}

export interface PortfolioShowcase {
    featuredProjects: Array<{
        title: string;
        description: string;
        imageUrl?: string;
        tags: string[];
        studentTestimonials: Array<{
            studentName: string;
            feedback: string;
            rating: number;
        }>;
    }>;
    teachingPhilosophy: string;
    expertiseAreas: string[];
    certifications: Array<{
        name: string;
        issuer: string;
        date: string;
        credentialUrl?: string;
    }>;
}

class AccomplishmentsService {
    async getTeacherAccomplishments(teacherId?: string): Promise<Accomplishment[]> {
        try {
            const endpoint = teacherId ? `/api/accomplishments/teacher/${teacherId}` : '/api/accomplishments/my';
            const response = await apiClient.get(endpoint);
            return response.data.accomplishments || [];
        } catch (error) {
            console.error('Error fetching accomplishments:', error);
            return [];
        }
    }

    async getTeacherStats(teacherId?: string): Promise<TeacherStats> {
        try {
            const endpoint = teacherId ? `/api/stats/teacher/${teacherId}` : '/api/stats/my';
            const response = await apiClient.get(endpoint);
            return response.data;
        } catch (error) {
            console.error('Error fetching teacher stats:', error);
            return {
                totalStudentsHelped: 0,
                totalCoursesCreated: 0,
                totalSessionsCompleted: 0,
                averageRating: 0,
                specializations: [],
                teachingStreak: 0,
                topSkills: [],
                achievements: []
            };
        }
    }

    async getPortfolioShowcase(teacherId?: string): Promise<PortfolioShowcase> {
        try {
            const endpoint = teacherId ? `/api/portfolio/teacher/${teacherId}` : '/api/portfolio/my';
            const response = await apiClient.get(endpoint);
            return response.data;
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            return {
                featuredProjects: [],
                teachingPhilosophy: '',
                expertiseAreas: [],
                certifications: []
            };
        }
    }

    async updatePortfolioShowcase(portfolio: PortfolioShowcase): Promise<boolean> {
        try {
            const response = await apiClient.put('/api/portfolio/update', portfolio);
            return response.data.success !== false;
        } catch (error) {
            console.error('Error updating portfolio:', error);
            return false;
        }
    }

    async addAccomplishment(accomplishment: Omit<Accomplishment, 'id' | 'date'>): Promise<boolean> {
        try {
            const response = await apiClient.post('/api/accomplishments/add', accomplishment);
            return response.data.success !== false;
        } catch (error) {
            console.error('Error adding accomplishment:', error);
            return false;
        }
    }

    async generateTeacherPresence(teacherId: string): Promise<string> {
        try {
            // Generate a shareable link for teacher profile
            const baseUrl = window.location.origin;
            return `${baseUrl}/teacher/${teacherId}`;
        } catch (error) {
            console.error('Error generating teacher presence:', error);
            return '';
        }
    }

    // Mock data for development (replace with real API calls)
    getMockAccomplishments(): Accomplishment[] {
        return [
            {
                id: '1',
                type: 'course_created',
                title: 'Advanced React Course Published',
                description: 'Created comprehensive React course with 25 lessons covering hooks, context, and performance optimization',
                date: '2024-09-15',
                metadata: {
                    courseTitle: 'Mastering React: From Basics to Advanced',
                    studentCount: 150
                },
                isPublic: true,
                xpEarned: 500
            },
            {
                id: '2',
                type: 'high_rating',
                title: 'Excellent Teaching Rating',
                description: 'Achieved 4.9/5 star rating from students this month',
                date: '2024-09-10',
                metadata: {
                    rating: 4.9,
                    studentCount: 45
                },
                isPublic: true,
                xpEarned: 200
            },
            {
                id: '3',
                type: 'milestone',
                title: '100 Students Helped',
                description: 'Reached milestone of helping 100+ students achieve their learning goals',
                date: '2024-09-05',
                metadata: {
                    studentCount: 100
                },
                isPublic: true,
                xpEarned: 1000
            },
            {
                id: '4',
                type: 'skill_badge',
                title: 'JavaScript Expert Badge',
                description: 'Earned expert-level JavaScript teaching certification',
                date: '2024-08-20',
                metadata: {
                    skillName: 'JavaScript',
                    badgeLevel: 'gold'
                },
                isPublic: true,
                xpEarned: 300
            }
        ];
    }
}

export default new AccomplishmentsService();