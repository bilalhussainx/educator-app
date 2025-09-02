// components/recordings/RecordingsManager.tsx
// Teacher interface for managing recorded sessions

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Edit, Trash2, Clock, FileText, Brain, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';
import { cn } from '@/lib/utils';

interface Recording {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    ai_summary: string | null;
    ai_topics: string[] | null;
    processing_status: 'processing' | 'transcribing' | 'enriching' | 'completed' | 'failed';
    recorded_at: string;
    created_at: string;
}

interface RecordingsManagerProps {
    courseId: string;
}

export const RecordingsManager: React.FC<RecordingsManagerProps> = ({ courseId }) => {
    const navigate = useNavigate();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRecording, setEditingRecording] = useState<Recording | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [recordingToDelete, setRecordingToDelete] = useState<Recording | null>(null);

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/recordings/course/${courseId}`);
            setRecordings(response.data.recordings);
        } catch (error) {
            console.error('Error fetching recordings:', error);
            toast.error('Failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (courseId) {
            fetchRecordings();
        }
    }, [courseId]);

    const handleEdit = (recording: Recording) => {
        setEditingRecording(recording);
        setEditTitle(recording.title);
        setEditDescription(recording.description || '');
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingRecording) return;

        try {
            await apiClient.put(`/api/recordings/${editingRecording.id}`, {
                title: editTitle,
                description: editDescription
            });

            // Update local state
            setRecordings(prev => prev.map(r => 
                r.id === editingRecording.id 
                    ? { ...r, title: editTitle, description: editDescription }
                    : r
            ));

            toast.success('Recording updated successfully');
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error('Error updating recording:', error);
            toast.error('Failed to update recording');
        }
    };

    const handleDelete = async () => {
        if (!recordingToDelete) return;

        try {
            await apiClient.delete(`/api/recordings/${recordingToDelete.id}`);
            
            // Remove from local state
            setRecordings(prev => prev.filter(r => r.id !== recordingToDelete.id));
            
            toast.success('Recording deleted successfully');
            setIsDeleteDialogOpen(false);
            setRecordingToDelete(null);
        } catch (error) {
            console.error('Error deleting recording:', error);
            toast.error('Failed to delete recording');
        }
    };

    const openDeleteDialog = (recording: Recording) => {
        setRecordingToDelete(recording);
        setIsDeleteDialogOpen(true);
    };

    const getStatusIcon = (status: Recording['processing_status']) => {
        switch (status) {
            case 'processing':
                return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
            case 'transcribing':
                return <FileText className="h-4 w-4 text-yellow-500" />;
            case 'enriching':
                return <Brain className="h-4 w-4 text-purple-500" />;
            case 'completed':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
        }
    };

    const getStatusBadge = (status: Recording['processing_status']) => {
        const variants = {
            processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
            transcribing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
            enriching: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
            completed: 'bg-green-500/10 text-green-400 border-green-500/30',
            failed: 'bg-red-500/10 text-red-400 border-red-500/30'
        };

        return (
            <Badge variant="outline" className={cn('capitalize', variants[status])}>
                {getStatusIcon(status)}
                <span className="ml-1">{status}</span>
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-400">Loading recordings...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100">Session Recordings</h2>
                <Badge variant="outline" className="text-slate-300">
                    {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {recordings.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="text-center p-8">
                        <Play className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-400 mb-2">No recordings yet</p>
                        <p className="text-sm text-slate-500">
                            Start recording a live session to see it appear here
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {recordings.map((recording) => (
                        <Card key={recording.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-slate-100 flex items-center gap-2">
                                            {recording.title}
                                            {getStatusBadge(recording.processing_status)}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <Clock className="h-4 w-4" />
                                            Recorded {formatDate(recording.recorded_at)}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {recording.video_url && recording.processing_status === 'completed' && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => navigate(`/watch/${recording.id}?courseId=${courseId}`)}
                                            >
                                                <Play className="h-4 w-4 mr-1" />
                                                Watch
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(recording)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openDeleteDialog(recording)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            
                            {(recording.description || recording.ai_summary || recording.ai_topics) && (
                                <CardContent>
                                    {recording.description && (
                                        <div className="mb-3">
                                            <p className="text-sm text-slate-300">{recording.description}</p>
                                        </div>
                                    )}
                                    
                                    {recording.ai_summary && (
                                        <div className="mb-3">
                                            <h4 className="text-sm font-medium text-slate-200 mb-1 flex items-center gap-1">
                                                <Brain className="h-3 w-3" />
                                                AI Summary
                                            </h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">{recording.ai_summary}</p>
                                        </div>
                                    )}
                                    
                                    {recording.ai_topics && recording.ai_topics.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-200 mb-2">Topics</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {recording.ai_topics.map((topic, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                                        {topic}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100">Edit Recording</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the title and description for this recording.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="title" className="text-slate-200">Title</Label>
                            <Input
                                id="title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                                placeholder="Enter recording title"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description" className="text-slate-200">Description</Label>
                            <Textarea
                                id="description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-slate-100"
                                placeholder="Enter description (optional)"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100">Delete Recording</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to delete "{recordingToDelete?.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};