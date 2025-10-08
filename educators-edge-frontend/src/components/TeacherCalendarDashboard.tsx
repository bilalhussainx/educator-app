import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Calendar, 
    Clock, 
    Plus, 
    Edit, 
    Trash2, 
    Settings, 
    Save, 
    Eye,
    EyeOff,
    Users 
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';
import TeacherCalendar from './TeacherCalendar';

interface AvailabilitySlot {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    session_duration: number;
    buffer_time: number;
    timezone: string;
}

interface CalendarSettings {
    timezone: string;
    min_notice_hours: number;
    max_advance_days: number;
    default_session_duration: number;
    auto_accept_bookings: boolean;
    calendar_color: string;
    booking_instructions?: string;
    cancellation_policy?: string;
    is_calendar_public: boolean;
}

const TeacherCalendarDashboard: React.FC = () => {
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
    const [settings, setSettings] = useState<CalendarSettings>({
        timezone: 'UTC',
        min_notice_hours: 24,
        max_advance_days: 30,
        default_session_duration: 60,
        auto_accept_bookings: false,
        calendar_color: '#3B82F6',
        is_calendar_public: true
    });
    const [loading, setLoading] = useState(true);
    const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timezones = [
        'America/New_York',
        'America/Chicago', 
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'UTC'
    ];

    useEffect(() => {
        fetchCalendarData();
        fetchSettings();
    }, []);

    const fetchCalendarData = async () => {
        try {
            // Get current user ID from token or context
            const userResponse = await apiClient.get('/api/users/profile');
            const userId = userResponse.data.user?.id;

            if (!userId) {
                toast.error('User not found');
                return;
            }

            const response = await apiClient.get(`/api/calendar/teacher/${userId}/availability`);
            if (response.data.success) {
                setAvailability(response.data.availability || []);
            }
        } catch (error) {
            console.error('Failed to fetch calendar data:', error);
            toast.error('Failed to load calendar');
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await apiClient.get('/api/calendar/settings');
            if (response.data.success && response.data.settings) {
                setSettings({
                    timezone: response.data.settings.timezone || 'UTC',
                    min_notice_hours: response.data.settings.min_notice_hours || 24,
                    max_advance_days: response.data.settings.max_advance_days || 30,
                    default_session_duration: response.data.settings.default_session_duration || 60,
                    auto_accept_bookings: response.data.settings.auto_accept_bookings || false,
                    calendar_color: response.data.settings.calendar_color || '#3B82F6',
                    booking_instructions: response.data.settings.booking_instructions || '',
                    cancellation_policy: response.data.settings.cancellation_policy || '',
                    is_calendar_public: response.data.settings.is_calendar_public !== false
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveAvailability = async () => {
        try {
            const response = await apiClient.post('/api/calendar/availability', {
                schedule: availability.map(slot => ({
                    dayOfWeek: slot.day_of_week,
                    startTime: slot.start_time,
                    endTime: slot.end_time,
                    sessionDuration: slot.session_duration,
                    bufferTime: slot.buffer_time,
                    timezone: slot.timezone
                }))
            });

            if (response.data.success) {
                toast.success('Availability saved successfully!');
                fetchCalendarData();
            }
        } catch (error) {
            console.error('Failed to save availability:', error);
            toast.error('Failed to save availability');
        }
    };

    const saveSettings = async () => {
        try {
            const response = await apiClient.put('/api/calendar/settings', {
                timezone: settings.timezone,
                minNoticeHours: settings.min_notice_hours,
                maxAdvanceDays: settings.max_advance_days,
                defaultSessionDuration: settings.default_session_duration,
                autoAcceptBookings: settings.auto_accept_bookings,
                calendarColor: settings.calendar_color,
                bookingInstructions: settings.booking_instructions,
                cancellationPolicy: settings.cancellation_policy,
                isCalendarPublic: settings.is_calendar_public
            });

            if (response.data.success) {
                toast.success('Settings saved successfully!');
                setShowSettingsModal(false);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save settings');
        }
    };

    const addOrUpdateAvailabilitySlot = (slot: AvailabilitySlot) => {
        if (editingSlot) {
            setAvailability(prev => 
                prev.map(s => s === editingSlot ? slot : s)
            );
        } else {
            setAvailability(prev => [...prev, slot]);
        }
        setShowAvailabilityModal(false);
        setEditingSlot(null);
    };

    const deleteAvailabilitySlot = (slot: AvailabilitySlot) => {
        setAvailability(prev => prev.filter(s => s !== slot));
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading calendar dashboard...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Calendar Management
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSettingsModal(true)}
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditingSlot(null);
                                    setShowAvailabilityModal(true);
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Availability
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            {settings.is_calendar_public ? (
                                <>
                                    <Eye className="h-4 w-4 text-green-600" />
                                    <span>Public calendar</span>
                                </>
                            ) : (
                                <>
                                    <EyeOff className="h-4 w-4 text-gray-600" />
                                    <span>Private calendar</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{availability.length} availability slots</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Availability Settings */}
                        <div>
                            <h3 className="font-semibold mb-4">Weekly Availability</h3>
                            <div className="space-y-3">
                                {availability.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No availability set</p>
                                        <Button
                                            className="mt-2"
                                            onClick={() => setShowAvailabilityModal(true)}
                                        >
                                            Add Your First Availability
                                        </Button>
                                    </div>
                                ) : (
                                    availability.map((slot, index) => (
                                        <Card key={index} className="bg-slate-50">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">
                                                            {dayNames[slot.day_of_week]}
                                                        </div>
                                                        <div className="text-sm text-slate-600">
                                                            {slot.start_time} - {slot.end_time}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {slot.session_duration}min sessions, {slot.buffer_time}min buffer
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingSlot(slot);
                                                                setShowAvailabilityModal(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => deleteAvailabilitySlot(slot)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                            
                            {availability.length > 0 && (
                                <Button
                                    className="w-full mt-4"
                                    onClick={saveAvailability}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Availability
                                </Button>
                            )}
                        </div>

                        {/* Calendar Preview */}
                        <div>
                            <h3 className="font-semibold mb-4">Calendar Preview</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <TeacherCalendar 
                                    teacherId="current" // Will be replaced with actual user ID
                                    isOwnCalendar={true}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Availability Modal */}
            <AvailabilityModal
                isOpen={showAvailabilityModal}
                onClose={() => {
                    setShowAvailabilityModal(false);
                    setEditingSlot(null);
                }}
                onSave={addOrUpdateAvailabilitySlot}
                editingSlot={editingSlot}
                timezone={settings.timezone}
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                settings={settings}
                onSettingsChange={setSettings}
                onSave={saveSettings}
                timezones={timezones}
            />
        </div>
    );
};

// Sub-components for modals
const AvailabilityModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (slot: AvailabilitySlot) => void;
    editingSlot: AvailabilitySlot | null;
    timezone: string;
}> = ({ isOpen, onClose, onSave, editingSlot, timezone }) => {
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [sessionDuration, setSessionDuration] = useState(60);
    const [bufferTime, setBufferTime] = useState(15);

    useEffect(() => {
        if (editingSlot) {
            setDayOfWeek(editingSlot.day_of_week);
            setStartTime(editingSlot.start_time);
            setEndTime(editingSlot.end_time);
            setSessionDuration(editingSlot.session_duration);
            setBufferTime(editingSlot.buffer_time);
        } else {
            // Reset form
            setDayOfWeek(1);
            setStartTime('09:00');
            setEndTime('17:00');
            setSessionDuration(60);
            setBufferTime(15);
        }
    }, [editingSlot, isOpen]);

    const handleSave = () => {
        if (startTime >= endTime) {
            toast.error('End time must be after start time');
            return;
        }

        onSave({
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            session_duration: sessionDuration,
            buffer_time: bufferTime,
            timezone
        });
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editingSlot ? 'Edit Availability' : 'Add Availability'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Day of Week</Label>
                        <Select value={dayOfWeek.toString()} onValueChange={(value) => setDayOfWeek(parseInt(value))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {dayNames.map((day, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                        {day}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Start Time</Label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>End Time</Label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Session Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={sessionDuration}
                                onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                                min="15"
                                max="240"
                            />
                        </div>
                        <div>
                            <Label>Buffer Time (minutes)</Label>
                            <Input
                                type="number"
                                value={bufferTime}
                                onChange={(e) => setBufferTime(parseInt(e.target.value))}
                                min="0"
                                max="60"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="flex-1">
                            {editingSlot ? 'Update' : 'Add'} Availability
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: CalendarSettings;
    onSettingsChange: (settings: CalendarSettings) => void;
    onSave: () => void;
    timezones: string[];
}> = ({ isOpen, onClose, settings, onSettingsChange, onSave, timezones }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Calendar Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Timezone</Label>
                            <Select 
                                value={settings.timezone} 
                                onValueChange={(value) => onSettingsChange({ ...settings, timezone: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {timezones.map((tz) => (
                                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Default Session Duration (minutes)</Label>
                            <Input
                                type="number"
                                value={settings.default_session_duration}
                                onChange={(e) => onSettingsChange({ 
                                    ...settings, 
                                    default_session_duration: parseInt(e.target.value) 
                                })}
                                min="15"
                                max="240"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Minimum Notice (hours)</Label>
                            <Input
                                type="number"
                                value={settings.min_notice_hours}
                                onChange={(e) => onSettingsChange({ 
                                    ...settings, 
                                    min_notice_hours: parseInt(e.target.value) 
                                })}
                                min="1"
                                max="168"
                            />
                        </div>
                        <div>
                            <Label>Maximum Advance Booking (days)</Label>
                            <Input
                                type="number"
                                value={settings.max_advance_days}
                                onChange={(e) => onSettingsChange({ 
                                    ...settings, 
                                    max_advance_days: parseInt(e.target.value) 
                                })}
                                min="1"
                                max="365"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={settings.auto_accept_bookings}
                                onCheckedChange={(checked) => onSettingsChange({ 
                                    ...settings, 
                                    auto_accept_bookings: checked 
                                })}
                            />
                            <Label>Auto-accept booking requests</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={settings.is_calendar_public}
                                onCheckedChange={(checked) => onSettingsChange({ 
                                    ...settings, 
                                    is_calendar_public: checked 
                                })}
                            />
                            <Label>Make calendar public (students can see availability)</Label>
                        </div>
                    </div>

                    <div>
                        <Label>Booking Instructions (Optional)</Label>
                        <Textarea
                            value={settings.booking_instructions || ''}
                            onChange={(e) => onSettingsChange({ 
                                ...settings, 
                                booking_instructions: e.target.value 
                            })}
                            placeholder="Instructions for students when booking sessions..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label>Cancellation Policy (Optional)</Label>
                        <Textarea
                            value={settings.cancellation_policy || ''}
                            onChange={(e) => onSettingsChange({ 
                                ...settings, 
                                cancellation_policy: e.target.value 
                            })}
                            placeholder="Your cancellation policy..."
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={onSave} className="flex-1">
                            <Save className="h-4 w-4 mr-2" />
                            Save Settings
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TeacherCalendarDashboard;