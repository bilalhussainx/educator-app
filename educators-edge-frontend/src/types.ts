// src/types.ts

export type UserRole = 'teacher' | 'student' | 'unknown';
export type ViewingMode = 'teacher' | string; // 'teacher' or a student's ID

export interface CodeFile {
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
}

export interface TestResult {
    passed: number;
    failed: number;
    total: number;
    results: string;
}