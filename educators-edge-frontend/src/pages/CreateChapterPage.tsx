// src/pages/CreateChapterPage.tsx

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster, toast } from 'sonner';
import { ChevronLeft, BookText, Loader2 } from 'lucide-react';

const CreateChapterPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get('courseId');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) {
            toast.error("Missing course context. Cannot create chapter.");
            return;
        }
        if (!title.trim() || !content.trim()) {
            toast.error("Title and content cannot be empty.");
            return;
        }

        setIsLoading(true);
        try {
            // This API call now works because of the backend changes you made
            await apiClient.post('/api/lessons/chapter', { title, content, courseId });
            toast.success("Chapter created successfully!");
            setTimeout(() => navigate(`/courses/${courseId}/manage`), 1000);
        } catch (error) {
            toast.error("Failed to create chapter. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (courseId) {
            navigate(`/courses/${courseId}/manage`);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#0a091a] text-white flex items-center justify-center p-4">
            <Toaster theme="dark" richColors position="top-right" />
            <Card className="w-full max-w-3xl bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white">
                <CardHeader>
                     <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2 text-slate-400 hover:bg-slate-800 -ml-3 w-fit">
                        <ChevronLeft className="mr-1 h-4 w-4" /> Back to Editor
                    </Button>
                    <CardTitle className="flex items-center gap-2 text-2xl"><BookText /> Create New Chapter</CardTitle>
                    <CardDescription className="mt-2">Write notes, instructions, or introductory text. This content will be presented as a readable page to the student.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-base">Chapter Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Introduction to Asynchronous JavaScript" className="bg-slate-950/60 border-slate-700 text-lg" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content" className="text-base">Content (Markdown Supported)</Label>
                            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="## Key Concepts..." className="bg-slate-950/60 border-slate-700 min-h-[300px] font-mono" required />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold w-48">
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Save Chapter'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateChapterPage;