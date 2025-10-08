import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
    Calendar, 
    Clock, 
    User, 
    Check, 
    X, 
    AlertCircle,
    MessageCircle,
    Video,
    Phone
} from 'lucide-react';
import { format, parseISO, isPast, isSameDay } from 'date-fns';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

interface SessionRequest {
    id: string;
    student_username: string;
    student_display_name?: string;
    session_type: string;
    description: string;
    preferred_datetime?: string;
    duration_minutes?: number;
    timezone?: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
}

interface Appointment {
    id: number;
    student_id: string;
    student_username: string;
    student_display_name?: string;
    session_type: string;
    description?: string;
    scheduled_time?: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    created_at: string;
}

const AppointmentManager: React.FC = () => {
    const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
    const [responseNote, setResponseNote] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch incoming session requests
            const requestsResponse = await apiClient.get('/api/sessions/requests?type=incoming');
            if (requestsResponse.data.success) {
                setSessionRequests(requestsResponse.data.requests.filter((r: any) => r.status === 'pending'));
            }

            // Fetch upcoming appointments
            const appointmentsResponse = await apiClient.get('/api/calendar/my-appointments');
            if (appointmentsResponse.data.success) {
                setUpcomingAppointments(appointmentsResponse.data.appointments || []);
            }
        } catch (error) {
            console.error('Failed to fetch appointment data:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const respondToRequest = async (requestId: string, action: 'accept' | 'decline', scheduledTime?: string) => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${requestId}/respond`, {
                action,
                scheduledTime,
                note: responseNote
            });

            if (response.data.success) {
                toast.success(`Session request ${action}ed successfully!`);
                setShowRequestModal(false);
                setSelectedRequest(null);
                setResponseNote('');
                fetchData(); // Refresh data
            }
        } catch (error: any) {
            console.error('Failed to respond to request:', error);
            toast.error(error.response?.data?.error || `Failed to ${action} request`);
        }
    };

    const getStatusBadge = (status: string, scheduledTime?: string) => {
        const isPastScheduled = scheduledTime && isPast(parseISO(scheduledTime));
        
        if (status === 'pending') {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
        }
        if (status === 'scheduled') {
            return isPastScheduled ? 
                <Badge variant="secondary" className="bg-red-100 text-red-800">Overdue</Badge> :
                <Badge variant="secondary" className="bg-green-100 text-green-800">Scheduled</Badge>;
        }
        if (status === 'active') {
            return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Active</Badge>;
        }
        if (status === 'completed') {
            return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Completed</Badge>;
        }
        if (status === 'cancelled') {
            return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelled</Badge>;
        }
        return <Badge variant="secondary">{status}</Badge>;
    };

    const formatDateTime = (dateTimeString?: string) => {
        if (!dateTimeString) return 'Not scheduled';
        try {
            const date = parseISO(dateTimeString);
            return format(date, 'MMM d, yyyy \'at\' h:mm a');
        } catch {
            return 'Invalid date';
        }
    };

    const handleRequestClick = (request: SessionRequest) => {
        setSelectedRequest(request);
        setResponseNote('');
        setShowRequestModal(true);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading appointments...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Pending Session Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Pending Session Requests ({sessionRequests.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sessionRequests.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No pending session requests</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessionRequests.map((request) => (
                                <Card 
                                    key={request.id} 
                                    className="border-l-4 border-l-orange-400 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handleRequestClick(request)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback>
                                                        {(request.student_display_name || request.student_username)?.charAt(0) || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold">
                                                            {request.student_display_name || request.student_username}
                                                        </h4>
                                                        <Badge variant="outline" className="text-xs">
                                                            {request.session_type}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                                        {request.description}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>Requested {format(parseISO(request.created_at), 'MMM d')}</span>
                                                        </div>
                                                        {request.preferred_datetime && (
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>Prefers {formatDateTime(request.preferred_datetime)}</span>
                                                            </div>
                                                        )}
                                                        {request.duration_minutes && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{request.duration_minutes}min</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        respondToRequest(request.id, 'accept', request.preferred_datetime);
                                                    }}
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Accept
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        respondToRequest(request.id, 'decline');
                                                    }}
                                                >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Upcoming Appointments ({upcomingAppointments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {upcomingAppointments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No upcoming appointments</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingAppointments.map((appointment) => {
                                const isToday = appointment.scheduled_time && isSameDay(parseISO(appointment.scheduled_time), new Date());
                                const isPastDue = appointment.scheduled_time && isPast(parseISO(appointment.scheduled_time));
                                
                                return (
                                    <Card 
                                        key={appointment.id} 
                                        className={cn(
                                            "border-l-4",
                                            isToday && "border-l-blue-400 bg-blue-50/50",
                                            !isToday && !isPastDue && "border-l-green-400",
                                            isPastDue && "border-l-red-400 bg-red-50/50"
                                        )}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback>
                                                            {(appointment.student_display_name || appointment.student_username)?.charAt(0) || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold">
                                                                {appointment.student_display_name || appointment.student_username}
                                                            </h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                {appointment.session_type}
                                                            </Badge>
                                                            {getStatusBadge(appointment.status, appointment.scheduled_time)}
                                                        </div>
                                                        {appointment.description && (
                                                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                                                {appointment.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            {appointment.scheduled_time && (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    <span>{formatDateTime(appointment.scheduled_time)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {appointment.status === 'scheduled' && (
                                                        <>
                                                            <Button size="sm" variant="outline">
                                                                <MessageCircle className="h-3 w-3 mr-1" />
                                                                Message
                                                            </Button>
                                                            {!isPastDue && (
                                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                                                                    <Video className="h-3 w-3 mr-1" />
                                                                    Start Session
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Request Detail Modal */}
            <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Session Request from {selectedRequest?.student_display_name || selectedRequest?.student_username}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-slate-600">Session Type:</span>
                                        <p>{selectedRequest.session_type}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-600">Requested:</span>
                                        <p>{format(parseISO(selectedRequest.created_at), 'MMM d, yyyy \'at\' h:mm a')}</p>
                                    </div>
                                    {selectedRequest.preferred_datetime && (
                                        <div className="col-span-2">
                                            <span className="font-medium text-slate-600">Preferred Time:</span>
                                            <p>{formatDateTime(selectedRequest.preferred_datetime)}</p>
                                        </div>
                                    )}
                                    {selectedRequest.duration_minutes && (
                                        <div>
                                            <span className="font-medium text-slate-600">Duration:</span>
                                            <p>{selectedRequest.duration_minutes} minutes</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <span className="font-medium text-slate-600">Description:</span>
                                <p className="mt-1 text-sm">{selectedRequest.description}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Response Note (Optional)
                                </label>
                                <Textarea
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                    placeholder="Add a note to your response..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowRequestModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => respondToRequest(selectedRequest.id, 'decline')}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Decline
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-500"
                                    onClick={() => respondToRequest(
                                        selectedRequest.id, 
                                        'accept', 
                                        selectedRequest.preferred_datetime
                                    )}
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Accept
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AppointmentManager;