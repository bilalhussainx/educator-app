/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   CreateCoursePage.tsx (UPDATED for CoreZenith)
 * =================================================================
 * DESCRIPTION: This is the teacher's Foundry, a dedicated space for
 * creating new courses. The design is focused, inspiring, and fully
 * integrated into the immersive CoreZenith UI/UX.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

// CoreZenith UI Components & Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, XCircle, Feather } from 'lucide-react';
import { cn } from "@/lib/utils";

// --- CoreZenith Styled Components ---

const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card 
        className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}
        {...props} 
    />
);

// --- Main Component ---
const CreateCoursePage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // NOTE: All state and submission logic is preserved from the original file.
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await apiClient.post('/api/courses', { title, description });
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0a091a] text-white font-sans flex flex-col items-center justify-center p-4">
            {/* Background decorative grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <main className="relative z-10 w-full max-w-3xl">
                <div className="absolute -top-16 left-0">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-gray-400 hover:bg-slate-800 hover:text-white">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Return to Dashboard
                    </Button>
                </div>
                
                <GlassCard>
                    <CardHeader>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                <Feather className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-bold tracking-tight text-white">
                                    Construct New Course Blueprint
                                </CardTitle>
                                <CardDescription className="text-gray-400 mt-1">
                                    Define the core identity of your new course.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="title" className="text-base text-slate-300">Course Title</Label>
                                <Input 
                                    id="title" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    required 
                                    placeholder="e.g., Quantum Algorithms & Data Structures" 
                                    className="p-4 text-base bg-black/30 border-2 border-slate-700 focus:border-cyan-400"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="description" className="text-base text-slate-300">Course Description</Label>
                                <Textarea 
                                    id="description" 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Provide a brief, engaging summary of what students will learn and achieve in this course." 
                                    rows={5}
                                    className="p-4 text-base bg-black/30 border-2 border-slate-700 focus:border-cyan-400 resize-none"
                                />
                            </div>
                            
                            {error && (
                                <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
                                    <XCircle className="h-5 w-5 text-red-400" />
                                    <AlertTitle className="font-bold text-red-200">Creation Failed</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button type="submit" className="w-full p-6 text-lg font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-900" disabled={isLoading}>
                                {isLoading ? 'Constructing...' : 'Construct Course Blueprint'}
                            </Button>
                        </form>
                    </CardContent>
                </GlassCard>
            </main>
        </div>
    );
};

export default CreateCoursePage;
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateCoursePage.tsx
//  * =================================================================
//  * DESCRIPTION: This new page provides a clean, simple form for
//  * teachers to create a new course, fulfilling the next step in our
//  * systematic plan.
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { ChevronLeft, X } from 'lucide-react';

// const CreateCoursePage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/courses', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ title, description })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create course');
//             }

//             // On success, navigate back to the dashboard where the new course will be listed.
//             navigate('/dashboard');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
//             <div className="w-full max-w-2xl">
//                 <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
//                     <ChevronLeft className="mr-2 h-4 w-4" />
//                     Back to Dashboard
//                 </Button>
//                 <Card>
//                     <CardHeader>
//                         <CardTitle className="text-2xl">Create a New Course</CardTitle>
//                         <CardDescription>
//                             A course will contain all of your lessons, assignments, and student rosters.
//                         </CardDescription>
//                     </CardHeader>
//                     <CardContent>
//                         <form onSubmit={handleSubmit} className="space-y-6">
//                             <div className="space-y-2">
//                                 <Label htmlFor="title">Course Title</Label>
//                                 <Input 
//                                     id="title" 
//                                     value={title} 
//                                     onChange={(e) => setTitle(e.target.value)} 
//                                     required 
//                                     placeholder="e.g., Introduction to Web Development" 
//                                 />
//                             </div>
//                             <div className="space-y-2">
//                                 <Label htmlFor="description">Course Description</Label>
//                                 <Textarea 
//                                     id="description" 
//                                     value={description} 
//                                     onChange={(e) => setDescription(e.target.value)} 
//                                     placeholder="Provide a brief summary of what students will learn in this course." 
//                                     rows={4}
//                                 />
//                             </div>
                            
//                             {error && (
//                                 <Alert variant="destructive">
//                                     <X className="h-4 w-4" />
//                                     <AlertTitle>Error</AlertTitle>
//                                     <AlertDescription>{error}</AlertDescription>
//                                 </Alert>
//                             )}

//                             <Button type="submit" className="w-full" disabled={isLoading}>
//                                 {isLoading ? 'Creating Course...' : 'Save and Create Course'}
//                             </Button>
//                         </form>
//                     </CardContent>
//                 </Card>
//             </div>
//         </div>
//     );
// };
// export default CreateCoursePage;
