// src/types.ts

export type UserRole = 'teacher' | 'student' | 'unknown';
export type ViewingMode = 'teacher' | string; // 'teacher' or a student's ID

export interface CodeFile {
    id?: string;
    name: string;
    language: string;
    content: string;
}

export interface LessonFile {
    id: string;
    filename: string;
    content: string;
}

export interface Workspace {
    files: CodeFile[];
    activeFileName: string;
    problemData?: {
        title?: string;
        description?: string;
        examples?: Array<{
            input: string;
            output: string;
            explanation?: string;
        }>;
        constraints?: string[];
        difficulty?: 'easy' | 'medium' | 'hard';
        pattern?: string;
    };
}

export interface StudentHomeworkState extends Workspace {
    terminalOutput: string;
}

export interface Student {
    id: string;
    username: string;
}

export interface Lesson {
    id: number | string;
    title: string;
    description: string;
    course_id: string;
    files: LessonFile[];
    courseType?: 'leetcode' | 'enhanced' | 'native';
    isLeetCodeProblem?: boolean;
    problemId?: string;
}

export interface TestResult {
    passed: number;
    failed: number;
    total: number;
    results: string;
}

// Universal Workspace format for multi-IDE support (LeetCode, AscentIDE, etc.)
export interface UniversalWorkspace {
    type: 'native' | 'leetcode' | 'external';
    studentId?: string;

    // For native lessons (AscentIDE)
    files?: CodeFile[];
    activeFileName?: string;

    // For LeetCode/code problems
    code?: string;
    language?: string;
    problemId?: string;
    problemTitle?: string;
    problemDescription?: string;
    problemExamples?: Array<{
        input: string;
        output: string;
        explanation?: string;
    }>;
    problemConstraints?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    pattern?: string;
    testResults?: TestResult[];

    // Common fields
    lastUpdate?: number;
    terminalOutput?: string;
}

// Homework Assignment with type metadata
export interface HomeworkAssignment {
    lessonId: string;
    teacherSessionId: string;
    title: string;
    homeworkType: 'native' | 'leetcode' | 'external';
    courseType?: string;
    courseId?: string;
    problemId?: string;
}