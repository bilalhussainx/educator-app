/*
 * =================================================================
 * FOLDER: src/
 * FILE:   App.tsx (REDESIGNED - App Shell Layout)
 * =================================================================
 * DESCRIPTION: This version refactors the application's routing to use
 * a persistent AppLayout component (with a global sidebar) for all
 * protected routes, creating a professional application shell experience.
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { User } from './types/index.ts';

// --- APE/ANALYTICS: Import the analytics service ---
import analytics from './services/analyticsService.js';

// --- Layout Component ---
import { AppLayout } from './components/layout/AppLayout';

// --- Page Components ---
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import LiveTutorialPage from './pages/LiveTutorialPage';
import CreateLessonPage from './pages/CreateLessonPage';
// import AscentIDE from './pages/AscentIDE';
import SubmissionsPage from './pages/SubmissionsPage';
import CreateCoursePage from './pages/CreateCoursePage';
import CourseManagementPage from './pages/CourseManagementPage';
import DiscoverCoursesPage from './pages/DiscoverCoursesPage';
import CourseLandingPage from './pages/CourseLandingPage';
import StudentCoursePage from './pages/StudentCoursePage';
import mixpanel from 'mixpanel-browser';
import LessonLoaderPage from './pages/LessonLoaderPage';
// --- Mixpanel Initialization ---
const MIXPANEL_PROJECT_TOKEN = "ddb00402917fe523b477eafdf60f0580"; 
if (MIXPANEL_PROJECT_TOKEN) {
    mixpanel.init(MIXPANEL_PROJECT_TOKEN, {
        debug: true, 
        track_pageview: true,
        persistence: 'localStorage'
    });
} else {
    console.error("Mixpanel Project Token is not configured.");
}

// --- Protected Route Component (No Changes) ---
interface ProtectedRouteProps {
    token: string | null;
    user: User | null;
    roles?: string[];
    children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
    const location = useLocation();
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
        return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
    }
    return children;
};


// --- Main App Component ---
export default function App() {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wrapper function to update both state and localStorage
  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('authToken', newToken);
    } else {
      localStorage.removeItem('authToken');
    }
  };

  // Initialize token from localStorage on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    setTokenState(storedToken);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      try {
        const decodedUser: { user: User } = jwtDecode(token);
        setUser(decodedUser.user);
        analytics.identify(decodedUser.user);
      } catch (error) {
        console.error("Invalid token:", error);
        setToken(null);
        setUser(null);
        analytics.reset();
      }
    }
  }, [token]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
      <Routes>
        {/* --- Public Routes (No Layout) --- */}
        <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* --- Protected Routes (Wrapped in AppLayout) --- */}
        {/* This wildcard route matches any path for logged-in users */}
        <Route path="/*" element={
          <ProtectedRoute token={token} user={user}>
            <AppLayout user={user} setUser={setUser}>
              {/* Nested routes render inside the AppLayout's content area */}
              <Routes>
                <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />
                <Route path="/session/:sessionId" element={<LiveTutorialPage />} />
                
                {/* Teacher-Only Routes */}
                <Route path="/courses/new" element={<ProtectedRoute token={token} user={user} roles={['teacher']}><CreateCoursePage /></ProtectedRoute>} />
                <Route path="/courses/:courseId/manage" element={<ProtectedRoute token={token} user={user} roles={['teacher']}><CourseManagementPage /></ProtectedRoute>} />
                <Route path="/lessons/new" element={<ProtectedRoute token={token} user={user} roles={['teacher']}><CreateLessonPage /></ProtectedRoute>} />
                <Route path="/submissions/:lessonId" element={<ProtectedRoute token={token} user={user} roles={['teacher']}><SubmissionsPage /></ProtectedRoute>} />

                {/* Student-Accessible Routes */}
                {/* <Route path="/lesson/:lessonId" element={<AscentIDE />} /> */}
                <Route path="/lesson/:lessonId" element={<LessonLoaderPage />} />
                <Route path="/courses/discover" element={<DiscoverCoursesPage />} />
                <Route path="/courses/:courseId/learn" element={<StudentCoursePage />} />
                <Route path="/courses/:courseId/landing" element={<CourseLandingPage />} />

                {/* Default route for any other authenticated path */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }/>
      </Routes>
  );
}
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This version updates the application's routing and
//  * correctly identifies the user to the analytics service on initial
//  * app load if a valid token is present.
//  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types/index.ts';

// // --- APE/ANALYTICS: Import the analytics service ---
// import analytics from './services/analyticsService.js';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// // import ViewLessonPage from './pages/ViewLessonPage';
// import AscentIDE from './pages/AscentIDE'; // Import the new component

// import SubmissionsPage from './pages/SubmissionsPage';
// import CreateCoursePage from './pages/CreateCoursePage';
// import CourseManagementPage from './pages/CourseManagementPage';
// import DiscoverCoursesPage from './pages/DiscoverCoursesPage';
// import CourseLandingPage from './pages/CourseLandingPage';
// import StudentCoursePage from './pages/StudentCoursePage';
// import mixpanel from 'mixpanel-browser';

// // Replace with your actual project token from Mixpanel settings
// const MIXPANEL_PROJECT_TOKEN = "ddb00402917fe523b477eafdf60f0580"; 

// if (MIXPANEL_PROJECT_TOKEN) {
//     mixpanel.init(MIXPANEL_PROJECT_TOKEN, {
//         debug: true, 
//         track_pageview: true,
//         persistence: 'localStorage'
//     });
// } else {
//     console.error("Mixpanel Project Token is not configured.");
// }


// // Enhanced ProtectedRoute Component
// interface ProtectedRouteProps {
//     token: string | null;
//     user: User | null;
//     roles?: string[];
//     children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
//     const location = useLocation();

//     if (!token) {
//         return <Navigate to="/login" state={{ from: location }} replace />;
//     }

//     if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
//         return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
//     }

//     return children;
// };


// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
        
//         // This is the correct place to set the user state AND identify them.
//         setUser(decodedUser.user);

//         // --- APE/ANALYTICS: Identify the user to Mixpanel on app load ---
//         analytics.identify(decodedUser.user);
        
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//         // --- APE/ANALYTICS: Reset identity if token is bad ---
//         analytics.reset();
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* --- Protected Routes --- */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token} user={user}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token} user={user}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
        
//         {/* Teacher-Only Routes */}
//         <Route path="/courses/new" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CreateCoursePage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/courses/:courseId/manage" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CourseManagementPage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Student-Accessible Routes */}
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token} user={user}>
//             <AscentIDE />
//           </ProtectedRoute>
//         }/>
//         <Route path="/courses/discover" element={
//           <ProtectedRoute token={token} user={user}>
//             <DiscoverCoursesPage />
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/learn" element={
//           <ProtectedRoute token={token} user={user}>
//             <StudentCoursePage />
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/landing" element={
//           <ProtectedRoute token={token} user={user}>
//             <CourseLandingPage />
//           </ProtectedRoute>
//         }/>


//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This version updates the application's routing to
//  * include the new student course learning page, making the dashboard's
//  * "Continue Learning" button fully functional.
//  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types/index.ts';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';
// // Import the new course-related pages
// import CreateCoursePage from './pages/CreateCoursePage';
// import CourseManagementPage from './pages/CourseManagementPage';
// import DiscoverCoursesPage from './pages/DiscoverCoursesPage';
// import CourseLandingPage from './pages/CourseLandingPage';
// import StudentCoursePage from './pages/StudentCoursePage'; // NEW: Import the student course page
// import mixpanel from 'mixpanel-browser';

// // Replace with your actual project token from Mixpanel settings
// const MIXPANEL_PROJECT_TOKEN = "ddb00402917fe523b477eafdf60f0580"; 

// mixpanel.init(MIXPANEL_PROJECT_TOKEN, {
//     debug: true, // Set to false in production
//     track_pageview: true, // Automatically tracks page views
//     persistence: 'localStorage'
// });

// // Enhanced ProtectedRoute Component
// interface ProtectedRouteProps {
//     token: string | null;
//     user: User | null;
//     roles?: string[];
//     children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
//     const location = useLocation();

//     if (!token) {
//         return <Navigate to="/login" state={{ from: location }} replace />;
//     }

//     if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
//         return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
//     }

//     return children;
// };


// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
//         setUser(decodedUser.user);
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* --- Protected Routes --- */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token} user={user}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token} user={user}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
        
//         {/* Teacher-Only Routes */}
//         <Route path="/courses/new" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CreateCoursePage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/courses/:courseId/manage" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CourseManagementPage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Student-Accessible Routes */}
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token} user={user}>
//             <ViewLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/courses/discover" element={
//           <ProtectedRoute token={token} user={user}>
//             <DiscoverCoursesPage />
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/learn" element={
//           <ProtectedRoute token={token} user={user}>
//             <StudentCoursePage />
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/landing" element={
//           <ProtectedRoute token={token} user={user}>
//             <CourseLandingPage />
//           </ProtectedRoute>
//         }/>


//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }

// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This version updates the application's routing to
//  * include the new course-centric pages, making the updated
//  * dashboard fully functional.
//  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';
// // NEW: Import the new course-related pages
// import CreateCoursePage from './pages/CreateCoursePage';
// import CourseManagementPage from './pages/CourseManagementPage';
// import DiscoverCoursesPage from './pages/DiscoverCoursesPage';
// import CourseLandingPage from './pages/CourseLandingPage';


// // Enhanced ProtectedRoute Component
// interface ProtectedRouteProps {
//     token: string | null;
//     user: User | null;
//     roles?: string[];
//     children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
//     const location = useLocation();

//     if (!token) {
//         return <Navigate to="/login" state={{ from: location }} replace />;
//     }

//     if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
//         return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
//     }

//     return children;
// };


// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
//         setUser(decodedUser.user);
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* --- Protected Routes (Now with Course Routes) --- */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token} user={user}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token} user={user}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
        
//         {/* Teacher-Only Routes */}
//         <Route path="/courses/new" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CreateCoursePage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/courses/:courseId/manage" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CourseManagementPage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Student-Accessible Routes */}
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token} user={user}>
//             <ViewLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/courses/discover" element={
//           <ProtectedRoute token={token} user={user}>
//             <DiscoverCoursesPage />
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/learn" element={
//           <ProtectedRoute token={token} user={user}>
//             <div>Student Course Learning Page - Coming Soon!</div>
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/landing" element={
//           <ProtectedRoute token={token} user={user}>
//             <CourseLandingPage />
//           </ProtectedRoute>
//         }/>


//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }

// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This version updates the application's routing to
//  * include the new course-centric pages, making the updated
//  * dashboard fully functional.
//  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';
// // NEW: Import the new course-related pages
// import CreateCoursePage from './pages/CreateCoursePage';
// import CourseManagementPage from './pages/CourseManagementPage';
// import DiscoverCoursesPage from './pages/DiscoverCoursesPage';


// // Enhanced ProtectedRoute Component
// interface ProtectedRouteProps {
//     token: string | null;
//     user: User | null;
//     roles?: string[];
//     children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
//     const location = useLocation();

//     if (!token) {
//         return <Navigate to="/login" state={{ from: location }} replace />;
//     }

//     if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
//         return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
//     }

//     return children;
// };


// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
//         setUser(decodedUser.user);
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* --- Protected Routes (Now with Course Routes) --- */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token} user={user}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token} user={user}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
        
//         {/* Teacher-Only Routes */}
//         <Route path="/courses/new" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CreateCoursePage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/courses/:courseId/manage" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CourseManagementPage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Student-Accessible Routes */}
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token} user={user}>
//             <ViewLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/courses/discover" element={
//           <ProtectedRoute token={token} user={user}>
//             <DiscoverCoursesPage />
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/learn" element={
//           <ProtectedRoute token={token} user={user}>
//             <div>Student Course Learning Page - Coming Soon!</div>
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/landing" element={
//           <ProtectedRoute token={token} user={user}>
//             <div>Course Landing Page - Coming Soon!</div>
//           </ProtectedRoute>
//         }/>


//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }

// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This version updates the application's routing to
//  * include the new course-centric pages, making the updated
//  * dashboard fully functional.
//  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';
// // NEW: Import the new course-related pages
// import CreateCoursePage from './pages/CreateCoursePage';
// import CourseManagementPage from './pages/CourseManagementPage';


// // Enhanced ProtectedRoute Component from previous step
// interface ProtectedRouteProps {
//     token: string | null;
//     user: User | null;
//     roles?: string[];
//     children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
//     const location = useLocation();

//     if (!token) {
//         return <Navigate to="/login" state={{ from: location }} replace />;
//     }

//     if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
//         return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
//     }

//     return children;
// };


// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
//         setUser(decodedUser.user);
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* --- Protected Routes (Now with Course Routes) --- */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token} user={user}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token} user={user}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
        
//         {/* Teacher-Only Routes */}
//         <Route path="/courses/new" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CreateCoursePage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/courses/:courseId/manage" element={
//             <ProtectedRoute token={token} user={user} roles={['teacher']}>
//                 <CourseManagementPage />
//             </ProtectedRoute>
//         }/>
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Student-Accessible Routes */}
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token} user={user}>
//             <ViewLessonPage />
//           </ProtectedRoute>
//         }/>
//         {/* TODO: Create these student-facing pages next */}
//         <Route path="/courses/discover" element={
//           <ProtectedRoute token={token} user={user}>
//             <div>Discover Courses Page - Coming Soon!</div>
//           </ProtectedRoute>
//         }/>
//          <Route path="/courses/:courseId/learn" element={
//           <ProtectedRoute token={token} user={user}>
//             <div>Student Course Learning Page - Coming Soon!</div>
//           </ProtectedRoute>
//         }/>


//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }
// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This version introduces a more robust ProtectedRoute
//  * component that handles role-based access control (RBAC), ensuring
//  * that only authorized users (e.g., teachers) can access specific routes.
//  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';

// // --- NEW: Enhanced ProtectedRoute Component ---
// // This component now handles both authentication (is the user logged in?)
// // and authorization (does the user have the right role?).
// interface ProtectedRouteProps {
//     token: string | null;
//     user: User | null;
//     roles?: string[]; // Optional array of required roles
//     children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ token, user, roles, children }) => {
//     const location = useLocation();

//     if (!token) {
//         // If not logged in, redirect to the login page
//         return <Navigate to="/login" state={{ from: location }} replace />;
//     }

//     if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
//         // If logged in but does not have the required role, redirect to dashboard
//         // We can optionally pass a state to show an "access denied" message
//         return <Navigate to="/dashboard" state={{ error: "Access Denied" }} replace />;
//     }

//     // If logged in and has the required role (or no role is required), render the component
//     return children;
// };


// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
//         setUser(decodedUser.user);
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* --- Protected Routes (Now with Role Checks) --- */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token} user={user}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token} user={user}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
        
//         {/* Teacher-Only Routes */}
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token} user={user} roles={['teacher']}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Student-Accessible Route */}
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token} user={user}>
//             <ViewLessonPage />
//           </ProtectedRoute>
//         }/>

//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }

// // /*
// //  * =================================================================
// //  * FOLDER: src/
// //  * FILE:   App.tsx (UPDATED)
// //  * =================================================================
// //  */
// import React, { useState, useEffect } from 'react';
// import { Routes, Route, Navigate } from 'react-router-dom';
// import { jwtDecode } from 'jwt-decode';
// import type { User } from './types';

// // Import Pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';

// // Import Components
// import ProtectedRoute from './components/ProtectedRoute';

// export default function App() {
//   const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
//   const [user, setUser] = useState<User | null>(null);

//   useEffect(() => {
//     if (token) {
//       try {
//         const decodedUser: { user: User } = jwtDecode(token);
//         setUser(decodedUser.user);
//       } catch (error) {
//         console.error("Invalid token:", error);
//         localStorage.removeItem('authToken');
//         setToken(null);
//         setUser(null);
//       }
//     }
//   }, [token]);

//   return (
//     <div className="min-h-screen bg-gray-100 font-sans">
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/login" element={<LoginPage setToken={setToken} setUser={setUser} />} />
//         <Route path="/register" element={<RegisterPage />} />

//         {/* Protected Routes */}
//         <Route path="/dashboard" element={
//           <ProtectedRoute token={token}>
//             <Dashboard user={user} setUser={setUser} />
//           </ProtectedRoute>
//         }/>
//         <Route path="/session/:sessionId" element={
//           <ProtectedRoute token={token}>
//             <LiveTutorialPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/lessons/new" element={
//           <ProtectedRoute token={token}>
//             <CreateLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/lesson/:lessonId" element={
//           <ProtectedRoute token={token}>
//             <ViewLessonPage />
//           </ProtectedRoute>
//         }/>
//         <Route path="/submissions/:lessonId" element={
//           <ProtectedRoute token={token}>
//             <SubmissionsPage />
//           </ProtectedRoute>
//         }/>

//         {/* Default route: redirect to dashboard if logged in, otherwise to login */}
//         <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
//       </Routes>
//     </div>
//   );
// }

// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  */
// // 
// import React, { useState, useEffect } from 'react';
// import type { Route, User } from './types';
// import { jwtDecode } from 'jwt-decode';

// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';

// import AuthNav from './components/AuthNav';

// export default function App() {
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);
//   const [user, setUser] = useState<User | null>(null);
//   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
//   const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       const decodedUser: { user: User } = jwtDecode(savedToken);
//       setUser(decodedUser.user);
//       setRoute('dashboard');
//     }
//   }, []);

//   const startSession = (sessionId: string) => {
//     setCurrentSessionId(sessionId);
//     setRoute('live_session');
//   };

//   const viewLesson = (lessonId: string) => {
//     setCurrentLessonId(lessonId);
//     setRoute('view_lesson');
//   };

//   const viewSubmissions = (lessonId: string) => {
//     setCurrentLessonId(lessonId);
//     setRoute('view_submissions');
//   };

//   let content;

//   switch (route) {
//     case 'login':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} /></div>;
//       break;
//     case 'register':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><RegisterPage setRoute={setRoute} /></div>;
//       break;
//     case 'dashboard':
//       content = token ? <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} /> : <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//       break;
//     case 'live_session':
//       content = token && currentSessionId ? <LiveTutorialPage setRoute={setRoute} sessionId={currentSessionId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} />;
//       break;
//     case 'create_lesson':
//         content = token ? <CreateLessonPage setRoute={setRoute} /> : <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//         break;
//     case 'view_lesson':
//         content = token && currentLessonId ? <ViewLessonPage setRoute={setRoute} lessonId={currentLessonId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} />;
//         break;
//     case 'view_submissions':
//         content = token && currentLessonId ? <SubmissionsPage setRoute={setRoute} lessonId={currentLessonId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} />;
//         break;
//     default:
//       content = <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//       break;
//   }

//   const isFullScreenPage = route === 'live_session' || route === 'create_lesson' || route === 'view_lesson' || route === 'view_submissions';

//   return (
//     <div className={`min-h-screen bg-gray-100 font-sans ${!isFullScreenPage ? 'flex flex-col items-center justify-center p-4' : ''}`}>
//       {content}
//       {!isFullScreenPage && (
//           <footer className="mt-8 text-center text-gray-500 text-sm">
//               <p>Educator's Edge &copy; 2025</p>
//           </footer>
//       )}
//     </div>
//   );
// }



// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { Route, User } from './types';
// import { jwtDecode } from 'jwt-decode';

// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';
// import SubmissionsPage from './pages/SubmissionsPage';

// import AuthNav from './components/AuthNav';

// export default function App() {
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);
//   const [user, setUser] = useState<User | null>(null);
//   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
//   const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       const decodedUser: { user: User } = jwtDecode(savedToken);
//       setUser(decodedUser.user);
//       setRoute('dashboard');
//     }
//   }, []);

//   const startSession = (sessionId: string) => {
//     setCurrentSessionId(sessionId);
//     setRoute('live_session');
//   };

//   const viewLesson = (lessonId: string) => {
//     setCurrentLessonId(lessonId);
//     setRoute('view_lesson');
//   };

//   const viewSubmissions = (lessonId: string) => {
//     setCurrentLessonId(lessonId);
//     setRoute('view_submissions');
//   };

//   let content;

//   switch (route) {
//     case 'login':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} /></div>;
//       break;
//     case 'register':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><RegisterPage setRoute={setRoute} /></div>;
//       break;
//     case 'dashboard':
//       content = token ? <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} /> : <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//       break;
//     case 'live_session':
//       content = token && currentSessionId ? <LiveTutorialPage setRoute={setRoute} sessionId={currentSessionId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} />;
//       break;
//     case 'create_lesson':
//         // The token prop is no longer passed.
//         content = token ? <CreateLessonPage setRoute={setRoute} /> : <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//         break;
//     case 'view_lesson':
//         // The token prop is no longer passed.
//         content = token && currentLessonId ? <ViewLessonPage setRoute={setRoute} lessonId={currentLessonId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} />;
//         break;
//     case 'view_submissions':
//         // The token prop is no longer passed.
//         content = token && currentLessonId ? <SubmissionsPage setRoute={setRoute} lessonId={currentLessonId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} viewSubmissions={viewSubmissions} user={user} />;
//         break;
//     default:
//       content = <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//       break;
//   }

//   const isFullScreenPage = route === 'live_session' || route === 'create_lesson' || route === 'view_lesson' || route === 'view_submissions';

//   return (
//     <div className={`min-h-screen bg-gray-100 font-sans ${!isFullScreenPage ? 'flex flex-col items-center justify-center p-4' : ''}`}>
//       {content}
//       {!isFullScreenPage && (
//           <footer className="mt-8 text-center text-gray-500 text-sm">
//               <p>Educator's Edge &copy; 2025</p>
//           </footer>
//       )}
//     </div>
//   );
// }


// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { Route, User } from './types';
// import { jwtDecode } from 'jwt-decode';

// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage';

// import AuthNav from './components/AuthNav';

// export default function App() {
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);
//   const [user, setUser] = useState<User | null>(null); // NEW: State for the user object.
//   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
//   const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       // If a token exists, decode it to get user info on page load.
//       const decodedUser: { user: User } = jwtDecode(savedToken);
//       setUser(decodedUser.user);
//       setRoute('dashboard');
//     }
//   }, []);

//   const startSession = (sessionId: string) => {
//     setCurrentSessionId(sessionId);
//     setRoute('live_session');
//   };

//   const viewLesson = (lessonId: string) => {
//     setCurrentLessonId(lessonId);
//     setRoute('view_lesson');
//   };

//   let content;

//   switch (route) {
//     case 'login':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} /></div>;
//       break;
//     case 'register':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><RegisterPage setRoute={setRoute} /></div>;
//       break;
//     case 'dashboard':
//       content = token ? <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} user={user} /> : <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//       break;
//     case 'live_session':
//       content = token && currentSessionId ? <LiveTutorialPage setRoute={setRoute} sessionId={currentSessionId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} user={user} />;
//       break;
//     case 'create_lesson':
//         content = token ? <CreateLessonPage setRoute={setRoute} token={token} /> : <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//         break;
//     case 'view_lesson':
//         content = token && currentLessonId ? <ViewLessonPage setRoute={setRoute} token={token} lessonId={currentLessonId} /> : <Dashboard setRoute={setRoute} setToken={setToken} setUser={setUser} startSession={startSession} viewLesson={viewLesson} user={user} />;
//         break;
//     default:
//       content = <LoginPage setRoute={setRoute} setToken={setToken} setUser={setUser} />;
//       break;
//   }

//   const isFullScreenPage = route === 'live_session' || route === 'create_lesson' || route === 'view_lesson';

//   return (
//     <div className={`min-h-screen bg-gray-100 font-sans ${!isFullScreenPage ? 'flex flex-col items-center justify-center p-4' : ''}`}>
//       {content}
//       {!isFullScreenPage && (
//           <footer className="mt-8 text-center text-gray-500 text-sm">
//               <p>Educator's Edge &copy; 2025</p>
//           </footer>
//       )}
//     </div>
//   );
// }


// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { Route } from './types';

// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage';
// import ViewLessonPage from './pages/ViewLessonPage'; // NEW

// import AuthNav from './components/AuthNav';

// export default function App() {
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);
//   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
//   // NEW: State to hold the ID of the lesson being viewed.
//   const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       setRoute('dashboard');
//     }
//   }, []);

//   const startSession = (sessionId: string) => {
//     setCurrentSessionId(sessionId);
//     setRoute('live_session');
//   };

//   // NEW: Function to handle navigating to the lesson view page.
//   const viewLesson = (lessonId: string) => {
//     setCurrentLessonId(lessonId);
//     setRoute('view_lesson');
//   };

//   let content;

//   switch (route) {
//     case 'login':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><LoginPage setRoute={setRoute} setToken={setToken} /></div>;
//       break;
//     case 'register':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><RegisterPage setRoute={setRoute} /></div>;
//       break;
//     case 'dashboard':
//       content = token ? <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} viewLesson={viewLesson} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//       break;
//     case 'live_session':
//       content = token && currentSessionId ? <LiveTutorialPage setRoute={setRoute} sessionId={currentSessionId} /> : <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} viewLesson={viewLesson} />;
//       break;
//     case 'create_lesson':
//         content = token ? <CreateLessonPage setRoute={setRoute} token={token} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//         break;
//     // NEW: Route for viewing a single lesson.
//     case 'view_lesson':
//         content = token && currentLessonId ? <ViewLessonPage setRoute={setRoute} token={token} lessonId={currentLessonId} /> : <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} viewLesson={viewLesson} />;
//         break;
//     default:
//       content = <LoginPage setRoute={setRoute} setToken={setToken} />;
//       break;
//   }

//   const isFullScreenPage = route === 'live_session' || route === 'create_lesson' || route === 'view_lesson';

//   return (
//     <div className={`min-h-screen bg-gray-100 font-sans ${!isFullScreenPage ? 'flex flex-col items-center justify-center p-4' : ''}`}>
//       {content}
//       {!isFullScreenPage && (
//           <footer className="mt-8 text-center text-gray-500 text-sm">
//               <p>Educator's Edge &copy; 2025</p>
//           </footer>
//       )}
//     </div>
//   );
// }




// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { Route } from './types';

// // Import pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';
// import CreateLessonPage from './pages/CreateLessonPage'; // NEW

// // Import components
// import AuthNav from './components/AuthNav';

// export default function App() {
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);
//   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       setRoute('dashboard');
//     }
//   }, []);

//   const startSession = (sessionId: string) => {
//     setCurrentSessionId(sessionId);
//     setRoute('live_session');
//   };

//   let content;

//   switch (route) {
//     case 'login':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><LoginPage setRoute={setRoute} setToken={setToken} /></div>;
//       break;
//     case 'register':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><RegisterPage setRoute={setRoute} /></div>;
//       break;
//     case 'dashboard':
//       content = token ? <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//       break;
//     case 'live_session':
//       content = token && currentSessionId ? <LiveTutorialPage setRoute={setRoute} sessionId={currentSessionId} /> : <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} />;
//       break;
//     // NEW: Route for the create lesson page.
//     case 'create_lesson':
//         content = token ? <CreateLessonPage setRoute={setRoute} token={token} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//         break;
//     default:
//       content = <LoginPage setRoute={setRoute} setToken={setToken} />;
//       break;
//   }

//   // Updated layout logic to handle full-width pages vs centered pages.
//   const isFullScreenPage = route === 'live_session' || route === 'create_lesson';

//   return (
//     <div className={`min-h-screen bg-gray-100 font-sans ${!isFullScreenPage ? 'flex flex-col items-center justify-center p-4' : ''}`}>
//       {content}
//       {!isFullScreenPage && (
//           <footer className="mt-8 text-center text-gray-500 text-sm">
//               <p>Educator's Edge &copy; 2025</p>
//           </footer>
//       )}
//     </div>
//   );
// }





// /*
//  * =================================================================
//  * FOLDER: src/
//  * FILE:   App.tsx (CORRECTED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { Route } from './types';

// // Import pages
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import Dashboard from './pages/Dashboard';
// import LiveTutorialPage from './pages/LiveTutorialPage';

// // Import components
// import AuthNav from './components/AuthNav';

// export default function App() {
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);
//   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       setRoute('dashboard');
//     }
//   }, []);

//   const startSession = (sessionId: string) => {
//     setCurrentSessionId(sessionId);
//     setRoute('live_session');
//   };

//   // This variable will hold the main content to be rendered.
//   let content;

//   // We use a switch statement to determine which component to render.
//   switch (route) {
//     case 'login':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><LoginPage setRoute={setRoute} setToken={setToken} /></div>;
//       break;
//     case 'register':
//       content = <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"><AuthNav route={route} setRoute={setRoute} /><RegisterPage setRoute={setRoute} /></div>;
//       break;
//     case 'dashboard':
//       content = token ? <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//       break;
//     case 'live_session':
//       content = token && currentSessionId ? <LiveTutorialPage setRoute={setRoute} sessionId={currentSessionId} /> : <Dashboard setRoute={setRoute} setToken={setToken} startSession={startSession} />;
//       break;
//     default:
//       content = <LoginPage setRoute={setRoute} setToken={setToken} />;
//       break;
//   }

//   // The final return statement is now clean and simple.
//   return (
//     <div className={`min-h-screen bg-gray-100 font-sans ${route !== 'live_session' ? 'flex flex-col items-center justify-center p-4' : ''}`}>
//       {content}
//       {route !== 'live_session' && (
//           <footer className="mt-8 text-center text-gray-500 text-sm">
//               <p>Educator's Edge &copy; 2025</p>
//           </footer>
//       )}
//     </div>
//   );
// }

// /*
//  * =================================================================
//  * Main App Component: App.tsx
//  * =================================================================
//  * This is the root of your React application, now with routing to the
//  * main dashboard and the live tutorial page.
//  */
// import React, { useState, useEffect } from 'react';

// // --- Type Definitions ---

// // We've expanded the Route type to include the new pages.
// type Route = 'login' | 'register' | 'dashboard' | 'live_session';

// // Props for the navigation component
// type AuthNavProps = {
//   route: Route;
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// // Props for the login page
// type LoginPageProps = {
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
//   setToken: React.Dispatch<React.SetStateAction<string | null>>;
// };

// // Props for the registration page
// type RegisterPageProps = {
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// // Props for the dashboard page. Now includes setRoute for navigation.
// type DashboardProps = {
//     setRoute: React.Dispatch<React.SetStateAction<Route>>;
//     setToken: React.Dispatch<React.SetStateAction<string | null>>;
// };

// // Props for the live tutorial page.
// type LiveTutorialPageProps = {
//     setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };


// // --- Authentication Page Components (No change in logic) ---

// const AuthNav: React.FC<AuthNavProps> = ({ route, setRoute }) => (
//   <nav className="flex justify-center space-x-4 mb-8">
//     <button onClick={() => setRoute('login')} className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${ route === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200' }`}>Login</button>
//     <button onClick={() => setRoute('register')} className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${ route === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200' }`}>Register</button>
//   </nav>
// );

// const LoginPage: React.FC<LoginPageProps> = ({ setRoute, setToken }) => {
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Something went wrong');
      
//       // On successful login, save token and navigate to the dashboard
//       setToken(data.token);
//       localStorage.setItem('authToken', data.token);
//       setRoute('dashboard'); // <-- NAVIGATION CHANGE
      
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md">
//       <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back!</h2>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label htmlFor="email">Email Address</label>
//           <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         <div>
//           <label htmlFor="password">Password</label>
//           <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//         <div>
//           <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
//             {isLoading ? 'Logging in...' : 'Log In'}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// const RegisterPage: React.FC<RegisterPageProps> = ({ setRoute }) => {
//   const [formData, setFormData] = useState({ username: '', email: '', password: '' });
//   const [message, setMessage] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);
//     setMessage(null);
//     try {
//       const response = await fetch('http://localhost:5000/api/auth/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Failed to register');
//       setMessage('Registration successful! Please log in.');
//       setTimeout(() => setRoute('login'), 2000);
//     } catch (err) {
//       if (err instanceof Error) setError(err.message);
//       else setError('An unknown error occurred.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md">
//       <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Create Your Account</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div><label htmlFor="username">Username</label><input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" /></div>
//         <div><label htmlFor="email">Email Address</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" /></div>
//         <div><label htmlFor="password">Password</label><input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" /></div>
//         {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//         {message && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md">{message}</p>}
//         <div><button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">{isLoading ? 'Registering...' : 'Create Account'}</button></div>
//       </form>
//     </div>
//   );
// };


// // --- NEW & UPDATED Main Application Components ---

// const Dashboard: React.FC<DashboardProps> = ({ setRoute, setToken }) => {
//   const handleLogout = () => {
//     localStorage.removeItem('authToken');
//     setToken(null);
//     setRoute('login'); // On logout, go back to the login screen
//   };
  
//   return (
//     <div className="text-center w-full max-w-2xl">
//       <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
//       <p className="mt-4 text-lg text-gray-600">Welcome to Educator's Edge. Start a new session or view your past lessons.</p>
      
//       {/* This is the new button that navigates to the live session page */}
//       <button 
//         onClick={() => setRoute('live_session')}
//         className="mt-8 py-3 px-8 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
//       >
//         Create New Session
//       </button>

//       <button 
//         onClick={handleLogout}
//         className="mt-8 ml-4 py-3 px-8 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
//       >
//         Log Out
//       </button>
//     </div>
//   );
// };

// // This is the new placeholder component for our main classroom feature.
// const LiveTutorialPage: React.FC<LiveTutorialPageProps> = ({ setRoute }) => {
//     return (
//         <div className="text-center w-full max-w-4xl">
//             <h1 className="text-4xl font-bold text-gray-800">Live Tutorial Session</h1>
//             <p className="mt-4 text-lg text-gray-600">This is where the magic will happen! The code editor, video chat, and collaborative tools will live here.</p>
//             <button 
//                 onClick={() => setRoute('dashboard')}
//                 className="mt-8 py-2 px-6 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600"
//             >
//                 Back to Dashboard
//             </button>
//         </div>
//     );
// };


// // --- Main App Component ---
// export default function App() {
//   // The default route is now 'login'
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);

//   // This effect now checks for a token and sets the initial route accordingly.
//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//       setRoute('dashboard'); // If token exists, start at the dashboard
//     }
//   }, []);

//   // This function determines which component to show based on the route state.
//   const renderContent = () => {
//     switch (route) {
//       case 'login':
//         return (
//             <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
//                 <AuthNav route={route} setRoute={setRoute} />
//                 <LoginPage setRoute={setRoute} setToken={setToken} />
//             </div>
//         );
//       case 'register':
//         return (
//             <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
//                 <AuthNav route={route} setRoute={setRoute} />
//                 <RegisterPage setRoute={setRoute} />
//             </div>
//         );
//       case 'dashboard':
//         // We ensure the dashboard is only shown if a token exists.
//         return token ? <Dashboard setRoute={setRoute} setToken={setToken} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//       case 'live_session':
//         return token ? <LiveTutorialPage setRoute={setRoute} /> : <LoginPage setRoute={setRoute} setToken={setToken} />;
//       default:
//         return <LoginPage setRoute={setRoute} setToken={setToken} />;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans p-4">
//       {renderContent()}
//       <footer className="mt-8 text-center text-gray-500 text-sm">
//         <p>Educator's Edge &copy; 2025</p>
//       </footer>
//     </div>
//   );
// }
// /*
//  * =================================================================
//  * Main App Component: App.tsx
//  * =================================================================
//  * This is the root of your React application, now using TypeScript (.tsx).
//  *
//  * KEY TYPESCRIPT CONCEPTS INTRODUCED:
//  * - Type Aliases & Interfaces: We use `type` to define the shape of objects
//  * (like props) and the possible values for state.
//  * - Generics (`<T>`): `useState<string | null>` tells TypeScript exactly
//  * what kind of data this state variable can hold (a string or null).
//  * This prevents you from accidentally putting a number or object there.
//  * - React.FC: A type for defining a Functional Component. It provides
//  * type-checking for props and a return value.
//  * - Event Typing: Events like `onChange` and `onSubmit` are typed
//  * (e.g., `React.ChangeEvent<HTMLInputElement>`) to give you autocompletion
//  * and safety when accessing event properties like `e.target.value`.
//  */
// import React, { useState, useEffect } from 'react';

// // --- Type Definitions ---
// // It's a best practice to define your types in one place.

// // Defines the possible routes for our authentication flow.
// // This is a "union type", meaning `Route` can only be 'login' or 'register'.
// type Route = 'login' | 'register';

// // Defines the props for the AuthNav component.
// type AuthNavProps = {
//   route: Route;
//   // This is the type for a state setter function from `useState`.
//   // It's a function that dispatches an action to set the state.
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// // Defines the props for the LoginPage component.
// type LoginPageProps = {
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
//   setToken: React.Dispatch<React.SetStateAction<string | null>>;
// };

// // Defines the props for the RegisterPage component.
// type RegisterPageProps = {
//   setRoute: React.Dispatch<React.SetStateAction<Route>>;
// };

// // Defines the props for the Dashboard component.
// type DashboardProps = {
//     token: string;
//     setToken: React.Dispatch<React.SetStateAction<string | null>>;
// };


// // --- Helper Components ---

// // A simple navigation component to switch between Login and Register
// const AuthNav: React.FC<AuthNavProps> = ({ route, setRoute }) => (
//   <nav className="flex justify-center space-x-4 mb-8">
//     <button
//       onClick={() => setRoute('login')}
//       className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${
//         route === 'login'
//           ? 'bg-indigo-600 text-white shadow-md'
//           : 'text-gray-500 hover:bg-gray-200'
//       }`}
//     >
//       Login
//     </button>
//     <button
//       onClick={() => setRoute('register')}
//       className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${
//         route === 'register'
//           ? 'bg-indigo-600 text-white shadow-md'
//           : 'text-gray-500 hover:bg-gray-200'
//       }`}
//     >
//       Register
//     </button>
//   </nav>
// );

// // --- Page Components ---

// const LoginPage: React.FC<LoginPageProps> = ({ setRoute, setToken }) => {
//   // TypeScript infers the type of `formData` from its initial value.
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//   });
//   // We explicitly type state that can be one of multiple types.
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   // Here, we type the event `e` as a React ChangeEvent on an HTMLInputElement.
//   // This gives us type safety on `e.target`, so we know it has `name` and `value`.
//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   // We type the event `e` as a React FormEvent on an HTMLFormElement.
//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);

//     try {
//       const response = await fetch('http://localhost:5000/api/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || 'Something went wrong');
//       }

//       // We know `data` has a `token` property because our backend sends it.
//       // In a larger app, we would define a type for this response, e.g., `type LoginResponse = { token: string }`.
//       setToken(data.token);
//       localStorage.setItem('authToken', data.token);

//     } catch (err) {
//       // `err` is of type `unknown` in a catch block. We cast it to `Error`
//       // to safely access its `message` property.
//       if (err instanceof Error) {
//         setError(err.message);
//       } else {
//         setError('An unknown error occurred.');
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md">
//       <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back!</h2>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label htmlFor="email">Email Address</label>
//           <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         <div>
//           <label htmlFor="password">Password</label>
//           <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//         <div>
//           <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
//             {isLoading ? 'Logging in...' : 'Log In'}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// const RegisterPage: React.FC<RegisterPageProps> = ({ setRoute }) => {
//   const [formData, setFormData] = useState({
//     username: '',
//     email: '',
//     password: '',
//   });
//   const [message, setMessage] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);
//     setMessage(null);

//     try {
//       const response = await fetch('http://localhost:5000/api/auth/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       const data = await response.json();
//       if (!response.ok) {
//         throw new Error(data.error || 'Failed to register');
//       }
//       setMessage('Registration successful! Please log in.');
//       setTimeout(() => setRoute('login'), 2000);
//     } catch (err) {
//       if (err instanceof Error) {
//         setError(err.message);
//       } else {
//         setError('An unknown error occurred.');
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md">
//       <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Create Your Account</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label htmlFor="username">Username</label>
//           <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         <div>
//           <label htmlFor="email">Email Address</label>
//           <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         <div>
//           <label htmlFor="password">Password</label>
//           <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
//         </div>
//         {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
//         {message && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md">{message}</p>}
//         <div>
//           <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
//             {isLoading ? 'Registering...' : 'Create Account'}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// const Dashboard: React.FC<DashboardProps> = ({ token, setToken }) => {
//   const handleLogout = () => {
//     localStorage.removeItem('authToken');
//     setToken(null);
//   };
  
//   return (
//     <div className="text-center">
//       <h1 className="text-4xl font-bold">Welcome to Educator's Edge!</h1>
//       <p className="mt-4 text-lg text-gray-600">You are logged in.</p>
//       <p className="mt-2 text-sm text-gray-500 break-all">Your Token: {token}</p>
//       <button onClick={handleLogout} className="mt-8 py-2 px-6 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
//         Log Out
//       </button>
//     </div>
//   );
// };

// // --- Main App Component ---
// export default function App() {
//   // We explicitly type our state variables for maximum clarity and safety.
//   const [route, setRoute] = useState<Route>('login');
//   const [token, setToken] = useState<string | null>(null);

//   useEffect(() => {
//     const savedToken = localStorage.getItem('authToken');
//     if (savedToken) {
//       setToken(savedToken);
//     }
//   }, []); // Empty dependency array means this runs only once on mount.

//   const renderContent = () => {
//     switch (route) {
//       case 'login':
//         return <LoginPage setRoute={setRoute} setToken={setToken} />;
//       case 'register':
//         return <RegisterPage setRoute={setRoute} />;
//       default:
//         return <LoginPage setRoute={setRoute} setToken={setToken} />;
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center font-sans p-4">
//       <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
//         {token ? (
//           <Dashboard token={token} setToken={setToken} />
//         ) : (
//           <>
//             <AuthNav route={route} setRoute={setRoute} />
//             {renderContent()}
//           </>
//         )}
//       </div>
//        <footer className="mt-8 text-center text-gray-500 text-sm">
//         <p>Educator's Edge &copy; 2025</p>
//       </footer>
//     </div>
//   );
// }