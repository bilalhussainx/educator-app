import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, addDays, isSameDay, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { cn } from "@/lib/utils";
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

interface TimeSlot {
    id?: number;
    start_datetime: string;
    end_datetime: string;
    status: 'available' | 'booked' | 'blocked';
    notes?: string;
}

interface AvailabilitySlot {
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_duration: number;
    buffer_time: number;
}

interface TeacherCalendarProps {
    teacherId: string;
    isOwnCalendar?: boolean; // true if viewing your own calendar, false if viewing someone else's
    onTimeSlotSelect?: (startTime: string, endTime: string) => void;
    selectedDate?: Date;
}

const TeacherCalendar: React.FC<TeacherCalendarProps> = ({ 
    teacherId, 
    isOwnCalendar = false, 
    onTimeSlotSelect,
    selectedDate = new Date()
}) => {
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(selectedDate));
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [calendarSettings, setCalendarSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
    const [bookingDuration, setBookingDuration] = useState(60);

    useEffect(() => {
        fetchCalendarData();
    }, [teacherId, currentWeek]);

    const fetchCalendarData = async () => {
        try {
            setLoading(true);
            const startDate = format(currentWeek, 'yyyy-MM-dd');
            const endDate = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
            
            const response = await apiClient.get(`/api/calendar/teacher/${teacherId}/availability`, {
                params: { startDate, endDate }
            });

            if (response.data.success) {
                setAvailability(response.data.availability || []);
                setTimeSlots(response.data.timeSlots || []);
                setCalendarSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Failed to fetch calendar data:', error);
            toast.error('Failed to load calendar');
        } finally {
            setLoading(false);
        }
    };

    const generateTimeSlots = (date: Date) => {
        const dayOfWeek = date.getDay();
        const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);
        const existingSlots = timeSlots.filter(slot => 
            isSameDay(parseISO(slot.start_datetime), date)
        );

        const slots: any[] = [];

        // Generate slots from recurring availability
        dayAvailability.forEach(avail => {
            const startTime = avail.start_time;
            const endTime = avail.end_time;
            const duration = avail.session_duration;
            const buffer = avail.buffer_time;

            // Parse time strings and create slots
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            
            let currentTime = startHour * 60 + startMin; // Convert to minutes
            const endTimeMinutes = endHour * 60 + endMin;

            while (currentTime + duration <= endTimeMinutes) {
                const slotStart = new Date(date);
                slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
                
                const slotEnd = new Date(slotStart);
                slotEnd.setMinutes(slotEnd.getMinutes() + duration);

                // Check if this slot conflicts with existing bookings
                const isBooked = existingSlots.some(existing => {
                    const existingStart = parseISO(existing.start_datetime);
                    const existingEnd = parseISO(existing.end_datetime);
                    return (slotStart < existingEnd && slotEnd > existingStart);
                });

                slots.push({
                    start: slotStart.toISOString(),
                    end: slotEnd.toISOString(),
                    status: isBooked ? 'booked' : 'available',
                    duration
                });

                currentTime += duration + buffer;
            }
        });

        // Add existing specific slots
        existingSlots.forEach(slot => {
            if (!slots.some(s => s.start === slot.start_datetime)) {
                slots.push({
                    start: slot.start_datetime,
                    end: slot.end_datetime,
                    status: slot.status,
                    duration: Math.round((parseISO(slot.end_datetime).getTime() - parseISO(slot.start_datetime).getTime()) / 60000),
                    id: slot.id,
                    notes: slot.notes
                });
            }
        });

        return slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    };

    const handleSlotClick = (slot: any) => {
        if (slot.status === 'booked') return;

        if (isOwnCalendar) {
            // Teachers can manage their slots
            // TODO: Implement slot management modal
        } else {
            // Students can book available slots
            if (slot.status === 'available') {
                setSelectedSlot(slot);
                setBookingDuration(slot.duration);
                if (onTimeSlotSelect) {
                    onTimeSlotSelect(slot.start, slot.end);
                } else {
                    setShowBookingModal(true);
                }
            }
        }
    };

    const renderWeekView = () => {
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
        
        return (
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date, index) => {
                    const daySlots = generateTimeSlots(date);
                    const dayName = format(date, 'EEE');
                    const dayNumber = format(date, 'd');
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                        <div key={index} className="space-y-2">
                            <div className={cn(
                                "text-center p-2 rounded",
                                isToday && "bg-blue-100 dark:bg-blue-900"
                            )}>
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    {dayName}
                                </div>
                                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    {dayNumber}
                                </div>
                            </div>
                            
                            <div className="space-y-1 min-h-[300px]">
                                {daySlots.map((slot, slotIndex) => {
                                    const startTime = format(parseISO(slot.start), 'HH:mm');
                                    const endTime = format(parseISO(slot.end), 'HH:mm');
                                    
                                    return (
                                        <div
                                            key={slotIndex}
                                            onClick={() => handleSlotClick(slot)}
                                            className={cn(
                                                "p-2 rounded text-xs cursor-pointer transition-colors",
                                                slot.status === 'available' && "bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200",
                                                slot.status === 'booked' && "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 cursor-not-allowed",
                                                slot.status === 'blocked' && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                                            )}
                                        >
                                            <div className="flex items-center gap-1">
                                                {slot.status === 'available' && <CheckCircle className="h-3 w-3" />}
                                                {slot.status === 'booked' && <XCircle className="h-3 w-3" />}
                                                {slot.status === 'blocked' && <AlertCircle className="h-3 w-3" />}
                                                <span>{startTime}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {slot.duration}min
                                            </div>
                                        </div>
                                    );
                                })}
                                {daySlots.length === 0 && (
                                    <div className="text-center text-slate-400 dark:text-slate-600 py-8">
                                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <div className="text-xs">No availability</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const bookTimeSlot = async () => {
        if (!selectedSlot) return;

        try {
            // This would integrate with the existing session request system
            // For now, just show a success message
            toast.success('Time slot selected! Continue with your booking request.');
            setShowBookingModal(false);
        } catch (error) {
            console.error('Failed to book slot:', error);
            toast.error('Failed to book time slot');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading calendar...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {isOwnCalendar ? 'Your Calendar' : 'Available Times'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
                            >
                                ← Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentWeek(startOfWeek(new Date()))}
                            >
                                Today
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                            >
                                Next →
                            </Button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Week of {format(currentWeek, 'MMMM d, yyyy')}
                    </div>
                </CardHeader>
                <CardContent>
                    {renderWeekView()}
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded"></div>
                            <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-red-100 dark:bg-red-900 rounded"></div>
                            <span>Booked</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded"></div>
                            <span>Blocked</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Booking Modal */}
            <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Book Time Slot</DialogTitle>
                    </DialogHeader>
                    {selectedSlot && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4" />
                                <span>
                                    {format(parseISO(selectedSlot.start), 'EEEE, MMMM d, yyyy')} at{' '}
                                    {format(parseISO(selectedSlot.start), 'HH:mm')}
                                </span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Session Duration
                                </label>
                                <Select value={bookingDuration.toString()} onValueChange={(value) => setBookingDuration(parseInt(value))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="60">60 minutes</SelectItem>
                                        <SelectItem value="90">90 minutes</SelectItem>
                                        <SelectItem value="120">120 minutes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex gap-2 pt-4">
                                <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => setShowBookingModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    className="flex-1"
                                    onClick={bookTimeSlot}
                                >
                                    Select Time
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherCalendar;