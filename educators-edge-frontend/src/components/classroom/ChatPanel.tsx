import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Send } from 'lucide-react';

interface Message {
    from: string;
    text: string;
    timestamp: string;
}

interface ChatPanelProps {
    messages: Message[];
    currentUserId: string | null;
    chattingWithUsername: string;
    onSendMessage: (text: string) => void;
    onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, currentUserId, chattingWithUsername, onSendMessage, onClose }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <Card className="fixed bottom-4 right-4 w-96 h-[500px] flex flex-col shadow-2xl z-50">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                <CardTitle className="text-lg">Chat with {chattingWithUsername}</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </CardHeader>
            <CardContent className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.from === currentUserId ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs p-3 rounded-2xl ${msg.from === currentUserId ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </CardContent>
            <div className="p-4 border-t">
                <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </Card>
    );
};