/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   DiscoverCoursesPage.tsx (V2 - CoreZenith Design)
 * =================================================================
 * DESCRIPTION: This version implements the CoreZenith "Stellar
 * Marketplace" design, transforming the course discovery experience
 * into an immersive exploration hub while preserving 100% of the
 * original V2 functionality.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '../types';
import { cn } from "@/lib/utils";

// Import shadcn components and icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, Search, Users, BookOpen, XCircle } from 'lucide-react';

// --- Type definition for a public course ---
interface PublicCourse extends Course {
    teacher_name: string;
}

// --- CoreZenith Styled Components ---
const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card 
        className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white transition-all duration-300 hover:border-slate-500 hover:bg-slate-900/60", className)}
        {...props} 
    />
);

const DiscoverCoursesPage: React.FC = () => {
    const navigate = useNavigate();
    // --- State Management (100% Original) ---
    const [courses, setCourses] = useState<PublicCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Data Fetching Logic (100% Original) ---
    useEffect(() => {
        const fetchCourses = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const response = await fetch('http://localhost:5000/api/courses/discover', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch courses');
                }
                const data = await response.json();
                setCourses(data);
            } catch (err) {
                if (err instanceof Error) setError(err.message);
                else setError('An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, [navigate]);

    // --- Filtering Logic (100% Original) ---
    const filteredCourses = courses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center text-slate-400 mt-16">Scanning for available learning paths...</p>;
        }
        
        if (error) {
            return (
                 <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300 max-w-2xl mx-auto">
                    <XCircle className="h-5 w-5 text-red-400" />
                    <AlertTitle className="font-bold">Failed to Load Courses</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }

        if (filteredCourses.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => (
                        <GlassCard key={course.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-slate-100">{course.title}</CardTitle>
                                <CardDescription className="text-slate-400">By {course.teacher_name}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-between">
                                <p className="text-sm text-slate-300 mb-6 flex-grow">{course.description}</p>
                                <div className="space-y-4">
                                     <div className="flex justify-between text-sm text-slate-400 border-t border-slate-700 pt-4">
                                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400/70" /><span>{course.student_count} Students</span></div>
                                        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-400/70" /><span>{course.lesson_count} Lessons</span></div>
                                    </div>
                                    <Button className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold" onClick={() => navigate(`/courses/${course.id}/landing`)}>
                                        Explore Blueprint
                                    </Button>
                                </div>
                            </CardContent>
                        </GlassCard>
                    ))}
                </div>
            );
        }

        return (
            <div className="col-span-full text-center py-16 mt-8 border-2 border-dashed border-slate-700 rounded-lg">
                <h3 className="text-lg font-medium text-slate-300">No Matching Courses Found</h3>
                <p className="text-slate-500">Try adjusting your search query or check back later for new content.</p>
            </div>
        );
    };

    return (
        <div className="w-full min-h-screen bg-[#0a091a] text-white font-sans">
             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Button>

                <header className="mb-12 text-center">
                    <h1 className="text-5xl font-bold tracking-tighter text-slate-100">Stellar Marketplace</h1>
                    <p className="text-lg text-slate-400 mt-2 max-w-2xl mx-auto">Chart your course. Discover your next learning adventure in the CoreZenith cosmos.</p>
                    <div className="relative mt-8 max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input 
                            type="text"
                            placeholder="Search by course, topic, or instructor..."
                            className="w-full p-4 pl-12 text-base bg-slate-900/60 border-2 border-slate-700 rounded-lg focus:border-cyan-400 focus:ring-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                {renderContent()}
            </div>
        </div>
    );
};

export default DiscoverCoursesPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   DiscoverCoursesPage.tsx (V2 - Live Data)
//  * =================================================================
//  * DESCRIPTION: This version is now connected to the live backend.
//  * It fetches the real list of published courses from the API
//  * instead of using mock data.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import type { Course } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { ChevronLeft, Search } from 'lucide-react';

// // Define a type for a public course, including the teacher's name
// interface PublicCourse extends Course {
//     teacher_name: string;
// }

// const DiscoverCoursesPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [courses, setCourses] = useState<PublicCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [searchTerm, setSearchTerm] = useState('');

//     useEffect(() => {
//         // UPDATED: This now makes a live API call to the backend.
//         const fetchCourses = async () => {
//             const token = localStorage.getItem('authToken');
//             if (!token) {
//                 navigate('/login');
//                 return;
//             }
//             try {
//                 const response = await fetch('http://localhost:5000/api/courses/discover', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const errorData = await response.json();
//                     throw new Error(errorData.error || 'Failed to fetch courses');
//                 }
//                 const data = await response.json();
//                 setCourses(data);
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//                 else setError('An unknown error occurred.');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourses();
//     }, [navigate]);

//     const filteredCourses = courses.filter(course => 
//         course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         course.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8 text-center">
//                     <h1 className="text-4xl font-bold text-gray-900">Discover Courses</h1>
//                     <p className="text-lg text-gray-600 mt-2">Find your next learning adventure.</p>
//                     <div className="relative mt-6 max-w-lg mx-auto">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
//                         <Input 
//                             type="text"
//                             placeholder="Search for courses, topics, or teachers..."
//                             className="pl-10"
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                         />
//                     </div>
//                 </header>

//                 {isLoading ? <p className="text-center">Loading courses...</p> : 
//                  error ? <p className="text-center text-destructive">{error}</p> : (
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                         {filteredCourses.length > 0 ? filteredCourses.map(course => (
//                             <Card key={course.id} className="flex flex-col">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription>By {course.teacher_name}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="flex-grow flex flex-col justify-between">
//                                     <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/landing`)}>
//                                         View Course
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )) : (
//                             <div className="col-span-full text-center py-16">
//                                 <h3 className="text-lg font-medium text-gray-700">No courses found</h3>
//                                 <p className="text-gray-500">Try adjusting your search term or check back later!</p>
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default DiscoverCoursesPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   DiscoverCoursesPage.tsx
//  * =================================================================
//  * DESCRIPTION: This new page serves as the course marketplace for
//  * students, allowing them to browse and find courses to enroll in.
//  */
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import type { Course } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { ChevronLeft, Search } from 'lucide-react';

// // NEW: Define a type for a public course, including the teacher's name
// interface PublicCourse extends Course {
//     teacher_name: string;
// }

// const DiscoverCoursesPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [courses, setCourses] = useState<PublicCourse[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState('');

//     useEffect(() => {
//         // MOCK DATA: Using mock data until the backend is ready.
//         const fetchDiscoverableCourses = () => {
//             const mockCourses: PublicCourse[] = [
//                 { id: '1', title: 'Introduction to JavaScript', description: 'Master the fundamentals of JavaScript, from variables to asynchronous programming.', student_count: 34, lesson_count: 12, teacher_name: 'Alice Johnson' },
//                 { id: '2', title: 'Advanced CSS with Flexbox & Grid', description: 'Build complex, responsive layouts with modern CSS techniques.', student_count: 21, lesson_count: 8, teacher_name: 'Bob Williams' },
//                 { id: '4', title: 'Data Structures in Python', description: 'Understand the core data structures for efficient programming.', student_count: 45, lesson_count: 15, teacher_name: 'Alice Johnson' },
//                 { id: '5', title: 'React for Beginners', description: 'Learn to build interactive user interfaces with the React library.', student_count: 52, lesson_count: 18, teacher_name: 'Charlie Brown' },
//             ];
//             setCourses(mockCourses);
//             setIsLoading(false);
//         };
//         fetchDiscoverableCourses();

//         /*
//         // TODO: Replace mock data with API call
//         const fetchCourses = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch('http://localhost:5000/api/courses/discover', {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch courses');
//                 const data = await response.json();
//                 setCourses(data);
//             } catch (error) {
//                 console.error(error);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchCourses();
//         */
//     }, []);

//     const filteredCourses = courses.filter(course => 
//         course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         course.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     return (
//         <div className="w-full min-h-screen bg-slate-50">
//             <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>

//                 <header className="mb-8 text-center">
//                     <h1 className="text-4xl font-bold text-gray-900">Discover Courses</h1>
//                     <p className="text-lg text-gray-600 mt-2">Find your next learning adventure.</p>
//                     <div className="relative mt-6 max-w-lg mx-auto">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
//                         <Input 
//                             type="text"
//                             placeholder="Search for courses, topics, or teachers..."
//                             className="pl-10"
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                         />
//                     </div>
//                 </header>

//                 {isLoading ? <p>Loading courses...</p> : (
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                         {filteredCourses.length > 0 ? filteredCourses.map(course => (
//                             <Card key={course.id} className="flex flex-col">
//                                 <CardHeader>
//                                     <CardTitle>{course.title}</CardTitle>
//                                     <CardDescription>By {course.teacher_name}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="flex-grow flex flex-col justify-between">
//                                     <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
//                                     <Button className="w-full" onClick={() => navigate(`/courses/${course.id}/landing`)}>
//                                         View Course
//                                     </Button>
//                                 </CardContent>
//                             </Card>
//                         )) : (
//                             <div className="col-span-full text-center py-16">
//                                 <h3 className="text-lg font-medium text-gray-700">No courses found</h3>
//                                 <p className="text-gray-500">Try adjusting your search term.</p>
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default DiscoverCoursesPage;