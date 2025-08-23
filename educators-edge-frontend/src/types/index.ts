/*
 * =================================================================
 * FOLDER: src/
 * FILE:   types.ts (CORRECTED)
 * =================================================================
 * DESCRIPTION: This file contains the shared TypeScript types used
 * across the application. It has been updated to include the
 * `EnrolledCourse` type for student-specific course data.
 */

// User authentication and profile information
export interface User {
    id: string;
    username: string;
    role: 'teacher' | 'student';
}

// Represents a single file within a lesson or submission
export interface LessonFile {
    id: string;
    filename: string;
    content: string;
}

// Represents a course created by a teacher
export interface Course {
    id: string;
    title: string;
    description: string;
    student_count: number;
    lesson_count: number;
}

// NEW & MOVED: Represents a student's enrolled course with progress.
// This extends the base Course type with student-specific progress info.
export interface EnrolledCourse extends Course {
    lessons_completed: number;
}

// Represents a lesson, now linked to a course
export interface Lesson {
    id: string;
    title: string;
    description: string;
    teacher_id: string;
    course_id: string;
    created_at: string;
    files: LessonFile[];
}

// Represents a student's submission for a lesson
export interface Submission {
    id: string;
    lesson_id: string;
    student_id: string;
    username: string; // Joined from the users table
    submitted_code: LessonFile[]; // Stored as JSONB
    feedback: string | null;
    grade: string | null;
    submitted_at: string;
    // Student performance stats
    mastery_level?: number; // 0-100 score
    code_churn?: number; // Number of code changes/edits
    copy_paste_activity?: number; // Percentage of code that was copy-pasted
    time_taken?: number; // Time in minutes to complete submission
}


// --- Component Prop Types ---

export interface LoginPageProps {
    setToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
}

export interface DashboardProps {
    user: User | null;
    setUser: (user: User | null) => void;
}

export interface AuthNavProps {
    route: string;
    setRoute: (route: string) => void;
}
// Represents a single, simple test case for display on the frontend.
export interface TestCase {
    description: string;
    input: string;
    expectedOutput: string;
}

// Represents a student's past submission attempt for a specific lesson.
export interface SubmissionHistory {
    id: string;
    submitted_at: string;
    is_correct: boolean;
    submitted_code: LessonFile[];
    // Performance metrics
    code_churn?: number; // Number of code changes/edits
    copy_paste_activity?: number; // Percentage of code that was copy-pasted (0-100)
    time_taken?: number; // Time in minutes to complete submission
    time_to_solve_seconds?: number; // Time in seconds for more precision
    mastery_level?: number; // 0-100 score
}




export interface AscentIdeData {
    lesson: Lesson;
    files: LessonFile[];
    testCases: TestCase[];
    submissionHistory: SubmissionHistory[];
    gradedSubmission: Submission | null;
    officialSolution?: {
        code: LessonFile[];
        explanation: string;
    };
    courseId: string;
    previousLessonId: string | null;
    nextLessonId: string | null;
}
// Type for a live session object
export interface LiveSession {
    sessionId: string;
    teacherName: string;
    courseName: string;
}

// Type for the AI-powered alert object for teachers
export interface StuckPointNotification {
    alert_type: "stuck_point";
    student_id: string;
    teacher_id: string;
    message: string;
    details: {
        lesson_id: string;
        problem_id: string;
        stuck_on_test: string;
        attempts_on_test: number;
    };
}

// Type for awards/achievements
export interface Award {
    id: string;
    title: string;
    description: string;
    icon?: string;
    earned_at?: string;
}

// Additional types for live tutorial functionality
export type UserRole = 'teacher' | 'student';
export type ViewingMode = 'teacher' | string; // string for student IDs

export interface CodeFile {
    id: string;
    filename: string;
    content: string;
    language: string;
}

export interface Student {
    id: string;
    username: string;
}

export interface StudentHomeworkState {
    studentId: string;
    files: CodeFile[];
    terminalOutput: string;
    activeFileName?: string;
}

// Test result interface for code execution
export interface TestResult {
    passed: number;
    failed: number;
    total: number;
    results: string;
}

// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   types.ts (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This file contains the shared TypeScript types used
//  * across the application. It has been updated to include the new
//  * `Course` type and ensure consistency across all models.
//  */

// // User authentication and profile information
// // NOTE: User ID is a UUID string from the database.
// export interface User {
//     id: string;
//     username: string;
//     role: 'teacher' | 'student';
// }

// // Represents a single file within a lesson or submission
// export interface LessonFile {
//     id: string;
//     filename: string;
//     content: string;
// }

// // NEW: Represents a course created by a teacher
// export interface Course {
//     id: string;
//     title: string;
//     description: string;
//     // These counts will be calculated by the backend
//     student_count: number;
//     lesson_count: number;
// }

// // Represents a lesson, now linked to a course
// export interface Lesson {
//     id: string;
//     title: string;
//     description: string;
//     teacher_id: string;
//     course_id: string;
//     created_at: string;
//     files: LessonFile[];
// }

// // Represents a student's submission for a lesson
// export interface Submission {
//     id: string;
//     lesson_id: string;
//     student_id: string;
//     username: string; // Joined from the users table
//     submitted_code: LessonFile[]; // Stored as JSONB
//     feedback: string | null;
//     grade: string | null;
//     submitted_at: string;
// }

// // --- Component Prop Types ---

// export interface LoginPageProps {
//     setToken: (token: string | null) => void;
//     setUser: (user: User | null) => void;
// }

// export interface DashboardProps {
//     user: User | null;
//     setUser: (user: User | null) => void;
// }
// /*
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts (UPDATED)
//  * =================================================================
//  */
// export type User = {
//     id: string;
//     username: string;
//     role: 'student' | 'teacher';
// };

// export type LessonFile = {
//     id: string;
//     filename: string;
//     content: string;
// };

// export type Lesson = {
//     id: string;
//     title: string;
//     description: string;
//     files: LessonFile[];
//     created_at: string;
// };

// export type Submission = {
//     id: string;
//     // The submitted code is now an array of files.
//     submitted_code: LessonFile[];
//     feedback: string | null;
//     grade: string | null;
//     submitted_at: string;
//     username: string;
// };
// // Other prop types remain the same...
// export type LoginPageProps = {
//   setToken: (token: string | null) => void;
//   setUser: (user: User | null) => void;
// };
// export type DashboardProps = {
//     setUser: (user: User | null) => void;
//     user: User | null;
// };

// MVP
// /*
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts (UPDATED)
//  * =================================================================
//  */
// export type User = {
//     id: string;
//     username: string;
//     role: 'student' | 'teacher';
// };
// export type Lesson = {
//     id: string;
//     title: string;
//     description: string;
//     boilerplate_code?: string;
//     language: string;
//     created_at: string;
// };
// export type Submission = {
//     id: string;
//     submitted_code: string;
//     feedback: string | null;
//     grade: string | null;
//     submitted_at: string;
//     username: string;
// };
// export type LoginPageProps = {
//   setToken: (token: string | null) => void;
//   setUser: (user: User | null) => void;
// };
// export type DashboardProps = {
//     setUser: (user: User | null) => void;
//     user: User | null;
// };
// // NEW: LiveTutorialPage now needs the user's role
// export type LiveTutorialPageProps = {
//     user: User | null;
// }
// *
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts (UPDATED)
//  * =================================================================
//  * DESCRIPTION: Prop types are updated to remove the 'setRoute' function,
//  * as navigation will now be handled by React Router.
//  */

// export type User = {
//     id: string;
//     username: string;
//     role: 'student' | 'teacher';
// };

// export type Lesson = {
//     id: string;
//     title: string;
//     description: string;
//     boilerplate_code?: string;
//     language: string;
//     created_at: string;
// };

// export type Submission = {
//     id: string;
//     submitted_code: string;
//     feedback: string | null;
//     grade: string | null;
//     submitted_at: string;
//     username: string;
// };

// // Props for components that no longer need routing functions passed down.
// export type LoginPageProps = {
//   setToken: (token: string | null) => void;
//   setUser: (user: User | null) => void;
// };

// export type DashboardProps = {
//     setUser: (user: User | null) => void;
//     user: User | null;
// };


// /*
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts (UPDATED)
//  * =================================================================
//  */

// export type Route = 'login' | 'register' | 'dashboard' | 'live_session' | 'create_lesson' | 'view_lesson' | 'view_submissions';

// export type User = {
//     id: string;
//     username: string;
//     role: 'student' | 'teacher';
// };

// export type Lesson = {
//     id: string;
//     title: string;
//     description: string;
//     boilerplate_code?: string;
//     language: string;
//     created_at: string;
// };

// export type Submission = {
//     id: string;
//     submitted_code: string;
//     feedback: string | null;
//     grade: string | null;
//     submitted_at: string;
//     username: string;
// };

// // Props no longer need to pass the token down, as components will read it directly.
// export type CreateLessonPageProps = {
//     setRoute: (route: Route) => void;
// };

// export type ViewLessonPageProps = {
//     setRoute: (route: Route) => void;
//     lessonId: string;
// };

// export type SubmissionsPageProps = {
//     setRoute: (route: Route) => void;
//     lessonId: string;
// };

// // Other prop types remain the same...
// export type AuthNavProps = {
//   route: Route;
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };
// export type LoginPageProps = {
//   setRoute: (route: Route) => void;
//   setToken: (token: string | null) => void;
//   setUser: (user: User | null) => void;
// };
// export type RegisterPageProps = {
//   setRoute: (route: Route) => void;
// };
// export type DashboardProps = {
//     setRoute: (route: Route) => void;
//     setToken: (token: string | null) => void;
//     setUser: (user: User | null) => void;
//     startSession: (sessionId: string) => void;
//     viewLesson: (lessonId: string) => void;
//     viewSubmissions: (lessonId: string) => void;
//     user: User | null;
// };
// export type LiveTutorialPageProps = {
//     setRoute: (route: Route) => void;
//     sessionId: string;
// };




// /*
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts (UPDATED)
//  * =================================================================
//  */

// // NEW: Added 'create_lesson' to our possible routes.
// export type Route = 'login' | 'register' | 'dashboard' | 'live_session' | 'create_lesson';

// // NEW: A type definition for a Lesson object, matching our database schema.
// export type Lesson = {
//     id: string;
//     title: string;
//     description: string;
//     language: string;
//     created_at: string;
// };

// // Props for the AuthNav component.
// export type AuthNavProps = {
//   route: Route;
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// // Props for the LoginPage component.
// export type LoginPageProps = {
//   setRoute: (route: Route) => void;
//   setToken: (token: string | null) => void;
// };

// // Props for the RegisterPage component.
// export type RegisterPageProps = {
//   setRoute: (route: Route) => void;
// };

// // Props for the Dashboard component.
// export type DashboardProps = {
//     setRoute: (route: Route) => void;
//     setToken: (token: string | null) => void;
//     startSession: (sessionId: string) => void;
// };

// // Props for the LiveTutorialPage component.
// export type LiveTutorialPageProps = {
//     setRoute: (route: Route) => void;
//     sessionId: string;
// };

// // NEW: Props for the CreateLessonPage component.
// export type CreateLessonPageProps = {
//     setRoute: (route: Route) => void;
//     token: string | null;
// };


// /*
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts (UPDATED)
//  * =================================================================
//  * DESCRIPTION: Types have been updated to handle passing the session ID.
//  */

// export type Route = 'login' | 'register' | 'dashboard' | 'live_session';

// export type AuthNavProps = {
//   route: Route;
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// export type LoginPageProps = {
//   setRoute: (route: Route) => void;
//   setToken: (token: string | null) => void;
// };

// export type RegisterPageProps = {
//   setRoute: (route: Route) => void;
// };

// // The Dashboard now needs a function to start a session.
// export type DashboardProps = {
//     setRoute: (route: Route) => void;
//     setToken: (token: string | null) => void;
//     startSession: (sessionId: string) => void;
// };

// // The LiveTutorialPage now requires a sessionId prop.
// export type LiveTutorialPageProps = {
//     setRoute: (route: Route) => void;
//     sessionId: string;
// };
// /*
//  * =================================================================
//  * FOLDER: src/types/
//  * FILE:   index.ts
//  * =================================================================
//  */

// export type Route = 'login' | 'register' | 'dashboard' | 'live_session';

// export type AuthNavProps = {
//   route: Route;
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// export type LoginPageProps = {
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
//   setToken: React.Dispatch<React.SetStateAction<string | null>>;
// };

// export type RegisterPageProps = {
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// export type DashboardProps = {
//     setRoute: React.Dispatch<React.SetStateAction<Route>>;
//     setToken: React.Dispatch<React.SetStateAction<string | null>>;
// };

// export type LiveTutorialPageProps = {
//     setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };
