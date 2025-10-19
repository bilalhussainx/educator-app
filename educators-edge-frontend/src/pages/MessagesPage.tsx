import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search, MessageSquare, User, Clock, CheckCheck } from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

interface Message {
    id: string;
    from_user_id: string;
    to_user_id: string;
    message: string;
    created_at: string;
    read_at: string | null;
    is_read: boolean;
    from_username: string;
    from_display_name: string;
    to_username: string;
    to_display_name: string;
    session_id?: string;
    session_type?: string;
    session_description?: string;
}

interface Conversation {
    other_user_id: string;
    other_username: string;
    other_display_name: string;
    last_message_time: string;
    message_count: number;
    last_message: string;
}

const MessagesPage: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation.other_user_id);
        }
    }, [selectedConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchCurrentUser = async () => {
        try {
            const response = await apiClient.get('/api/users/me');
            setCurrentUserId(response.data.id);
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
    };

    const fetchConversations = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/api/messages/conversations');
            if (response.data.success) {
                setConversations(response.data.conversations || []);
            }
        } catch (error: any) {
            console.error('Error fetching conversations:', error);
            toast.error(error.response?.data?.error || 'Failed to load conversations');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (otherUserId: string) => {
        try {
            const response = await apiClient.get(`/api/messages?with_user_id=${otherUserId}`);
            if (response.data.success) {
                const sortedMessages = (response.data.messages || []).sort(
                    (a: Message, b: Message) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setMessages(sortedMessages);

                // Mark unread messages as read
                const unreadMessages = sortedMessages.filter(
                    (msg: Message) => msg.to_user_id === currentUserId && !msg.is_read
                );

                unreadMessages.forEach((msg: Message) => {
                    markAsRead(msg.id);
                });
            }
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            toast.error(error.response?.data?.error || 'Failed to load messages');
        }
    };

    const markAsRead = async (messageId: string) => {
        try {
            await apiClient.put(`/api/messages/${messageId}/read`);
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedConversation) {
            return;
        }

        try {
            const response = await apiClient.post('/api/messages', {
                to_user_id: selectedConversation.other_user_id,
                message: newMessage.trim()
            });

            if (response.data.success) {
                setNewMessage('');
                // Refresh messages
                await fetchMessages(selectedConversation.other_user_id);
                // Refresh conversations list to update last message
                await fetchConversations();
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error(error.response?.data?.error || 'Failed to send message');
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const filteredConversations = conversations.filter(conv =>
        conv.other_display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.other_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Messages</h1>
                    <p className="text-slate-400">Connect with mentors, teachers, and fellow students</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                    {/* Conversations List */}
                    <Card className="lg:col-span-1 bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Conversations
                            </CardTitle>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[calc(100vh-350px)]">
                                {isLoading ? (
                                    <div className="p-4 text-center text-slate-400">Loading...</div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400">
                                        {searchQuery ? 'No conversations found' : 'No messages yet'}
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <div
                                            key={conv.other_user_id}
                                            onClick={() => setSelectedConversation(conv)}
                                            className={`p-4 cursor-pointer border-b border-slate-800 hover:bg-slate-800 transition-colors ${
                                                selectedConversation?.other_user_id === conv.other_user_id
                                                    ? 'bg-slate-800'
                                                    : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-semibold text-white truncate">
                                                            {conv.other_display_name || conv.other_username}
                                                        </h3>
                                                        <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                                                            {formatTime(conv.last_message_time)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 truncate">
                                                        {conv.last_message}
                                                    </p>
                                                    <Badge variant="secondary" className="mt-1 text-xs">
                                                        {conv.message_count} messages
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Messages View */}
                    <Card className="lg:col-span-2 bg-slate-900 border-slate-800 flex flex-col">
                        {selectedConversation ? (
                            <>
                                <CardHeader className="border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl text-white">
                                                {selectedConversation.other_display_name || selectedConversation.other_username}
                                            </CardTitle>
                                            <p className="text-sm text-slate-400">
                                                @{selectedConversation.other_username}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow p-4 overflow-hidden">
                                    <ScrollArea className="h-full pr-4">
                                        <div className="space-y-4">
                                            {messages.map((msg) => {
                                                const isFromCurrentUser = msg.from_user_id === currentUserId;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div
                                                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                                                isFromCurrentUser
                                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                                    : 'bg-slate-800 text-white rounded-bl-none'
                                                            }`}
                                                        >
                                                            <p className="text-sm break-words">{msg.message}</p>
                                                            <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{formatTime(msg.created_at)}</span>
                                                                {isFromCurrentUser && msg.is_read && (
                                                                    <CheckCheck className="h-3 w-3 ml-1" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                                <div className="p-4 border-t border-slate-800">
                                    <form onSubmit={sendMessage} className="flex gap-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type your message..."
                                            className="flex-grow bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                            autoComplete="off"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            disabled={!newMessage.trim()}
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-grow flex items-center justify-center">
                                <div className="text-center text-slate-400">
                                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Select a conversation to start messaging</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MessagesPage;
