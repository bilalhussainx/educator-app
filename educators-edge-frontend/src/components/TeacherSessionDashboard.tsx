import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Calendar,
    Clock,
    DollarSign,
    Zap,
    User,
    Check,
    X,
    MessageSquare,
    ExternalLink,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

interface SessionRequest {
    id: string;
    requester_id: string;
    session_type: string;
    description: string;
    chosen_rate_usd?: number;
    chosen_rate_z_credits?: number;
    booking_method: string;
    preferred_datetime?: string;
    duration_minutes: number;
    timezone: string;
    status: string;
    flow_status?: string;
    student_message?: string;
    created_at: string;
    student_username?: string;
    student_display_name?: string;
}

const TeacherSessionDashboard: React.FC = () => {
    const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        loadSessionRequests();
    }, []);

    const loadSessionRequests = async () => {
        try {
            const response = await apiClient.get('/api/sessions/requests', {
                params: { type: 'incoming' }
            });

            if (response.data.success) {
                setSessionRequests(response.data.requests);
            }
        } catch (error) {
            console.error('Failed to load session requests:', error);
            toast.error('Failed to load session requests');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${requestId}/respond`, {
                action: 'accept',
                scheduledTime: new Date().toISOString()
            });

            if (response.data.success) {
                toast.success('Session request accepted! Now provide availability.');
                setSelectedRequest(sessionRequests.find(r => r.id === requestId) || null);
                setShowResponseDialog(true);
                loadSessionRequests(); // Refresh the list
            }
        } catch (error: any) {
            console.error('Failed to accept request:', error);
            toast.error(error.response?.data?.message || 'Failed to accept request');
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${requestId}/respond`, {
                action: 'decline'
            });

            if (response.data.success) {
                toast.success('Session request declined');
                loadSessionRequests(); // Refresh the list
            }
        } catch (error: any) {
            console.error('Failed to decline request:', error);
            toast.error(error.response?.data?.message || 'Failed to decline request');
        }
    };

    const handleSendSchedulingResponse = async () => {
        if (!selectedRequest) return;

        if (!responseMessage.trim()) {
            toast.error('Please provide a message to the student');
            return;
        }

        if (!scheduledTime) {
            toast.error('Please select a time for the session');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await apiClient.post(
                `/api/sessions/requests/${selectedRequest.id}/schedule-response`,
                {
                    message: responseMessage,
                    schedulingType: 'fixed_time',
                    scheduledTime: new Date(scheduledTime).toISOString()
                }
            );

            if (response.data.success) {
                toast.success('Schedule sent to student!');
                setShowResponseDialog(false);
                setResponseMessage('');
                setScheduledTime('');
                setSelectedRequest(null);
                loadSessionRequests();
            }
        } catch (error: any) {
            console.error('Failed to send scheduling response:', error);
            toast.error(error.response?.data?.message || 'Failed to send response');
        } finally {
            setIsSubmitting(false);
        }
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

    const getStatusBadge = (request: SessionRequest) => {
        const status = request.status;
        const flowStatus = request.flow_status;

        if (status === 'pending') {
            return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
        } else if (status === 'accepted') {
            if (flowStatus === 'teacher_scheduled') {
                return <Badge className="bg-blue-500">Scheduled</Badge>;
            }
            return <Badge className="bg-green-500">Accepted</Badge>;
        } else if (status === 'declined') {
            return <Badge variant="destructive">Declined</Badge>;
        } else if (status === 'completed') {
            return <Badge className="bg-gray-500">Completed</Badge>;
        }
        return <Badge>{status}</Badge>;
    };

    const renderRequestCard = (request: SessionRequest) => {
        return (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                            {/* Student info */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {(request.student_display_name || request.student_username || 'S')[0]}
                                </div>
                                <div>
                                    <div className="font-semibold">
                                        {request.student_display_name || request.student_username || 'Student'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {request.session_type.replace('_', ' ')}
                                    </div>
                                </div>
                            </div>

                            {/* Request details */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {request.duration_minutes} minutes • {request.timezone}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    {request.chosen_rate_usd ? (
                                        <>
                                            <DollarSign className="h-4 w-4 text-green-600" />
                                            <span className="font-semibold text-green-600">
                                                ${request.chosen_rate_usd}
                                            </span>
                                        </>
                                    ) : request.chosen_rate_z_credits ? (
                                        <>
                                            <Zap className="h-4 w-4 text-purple-600" />
                                            <span className="font-semibold text-purple-600">
                                                {request.chosen_rate_z_credits} Z-Credits
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-gray-500">Free session</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600 dark:text-gray-400">
                                        Requested {formatDate(request.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Message */}
                            {(request.description || request.student_message) && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            {request.student_message || request.description}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Booking method badge */}
                            <div className="flex items-center gap-2">
                                {getStatusBadge(request)}
                                <Badge variant="outline" className="text-xs">
                                    {request.booking_method === 'calendly' ? 'Via Calendly' : 'Manual Request'}
                                </Badge>
                            </div>
                        </div>

                        {/* Actions */}
                        {request.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => handleAcceptRequest(request.id)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    Accept
                                </Button>
                                <Button
                                    onClick={() => handleDeclineRequest(request.id)}
                                    size="sm"
                                    variant="destructive"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Decline
                                </Button>
                            </div>
                        )}

                        {request.status === 'accepted' && request.flow_status !== 'teacher_scheduled' && (
                            <Button
                                onClick={() => {
                                    setSelectedRequest(request);
                                    setShowResponseDialog(true);
                                }}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Calendar className="h-4 w-4 mr-1" />
                                Schedule
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const pendingRequests = sessionRequests.filter(r => r.status === 'pending');
    const acceptedRequests = sessionRequests.filter(r => r.status === 'accepted');
    const completedRequests = sessionRequests.filter(r => r.status === 'completed' || r.status === 'declined');

    return (
        <div className="space-y-6">
            {/* Header with stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{pendingRequests.length}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Requests</div>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{acceptedRequests.length}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">
                                    ${sessionRequests.reduce((sum, r) => sum + (r.chosen_rate_usd || 0), 0).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Total Potential</div>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for different request states */}
            <Card>
                <CardHeader>
                    <CardTitle>Session Requests</CardTitle>
                    <CardDescription>
                        Manage your incoming session requests from students
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">
                                Pending ({pendingRequests.length})
                            </TabsTrigger>
                            <TabsTrigger value="accepted">
                                Accepted ({acceptedRequests.length})
                            </TabsTrigger>
                            <TabsTrigger value="history">
                                History ({completedRequests.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="space-y-4 mt-6">
                            {isLoading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : pendingRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No pending requests
                                </div>
                            ) : (
                                pendingRequests.map(renderRequestCard)
                            )}
                        </TabsContent>

                        <TabsContent value="accepted" className="space-y-4 mt-6">
                            {acceptedRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No accepted requests
                                </div>
                            ) : (
                                acceptedRequests.map(renderRequestCard)
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="space-y-4 mt-6">
                            {completedRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No completed sessions yet
                                </div>
                            ) : (
                                completedRequests.map(renderRequestCard)
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Scheduling dialog */}
            <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Schedule Session</DialogTitle>
                        <DialogDescription>
                            Provide a time for your session with {selectedRequest?.student_display_name || 'the student'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="scheduledTime">Session Date & Time</Label>
                            <Input
                                id="scheduledTime"
                                type="datetime-local"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>

                        <div>
                            <Label htmlFor="responseMessage">Message to Student</Label>
                            <Textarea
                                id="responseMessage"
                                placeholder="Looking forward to our session! Please come prepared with..."
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                rows={4}
                                className="mt-1.5"
                            />
                        </div>

                        {selectedRequest && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Session Type:</span>
                                        <span className="font-medium capitalize">
                                            {selectedRequest.session_type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                                        <span className="font-medium">{selectedRequest.duration_minutes} min</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                                        <span className="font-medium text-green-600">
                                            ${selectedRequest.chosen_rate_usd || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowResponseDialog(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendSchedulingResponse}
                            disabled={isSubmitting || !scheduledTime || !responseMessage.trim()}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Sending...
                                </>
                            ) : (
                                'Send Schedule'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherSessionDashboard;
