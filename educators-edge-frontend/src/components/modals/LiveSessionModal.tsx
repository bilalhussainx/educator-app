// src/components/modals/LiveSessionModal.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioTower, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveSessionModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ user, isOpen, onClose }) => {
    const [joinSessionId, setJoinSessionId] = useState('');
    const navigate = useNavigate();

    const handleCreateSession = () => {
        onClose(); // Close the modal before navigating
        navigate(`/session/${crypto.randomUUID()}`);
    };
    
    const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (joinSessionId.trim()) {
            onClose(); // Close the modal before navigating
            navigate(`/session/${joinSessionId.trim()}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-cyan-300 text-2xl">
                        <RadioTower /> Live Session
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Instantly start or join a real-time instruction session.
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                    {/* Teacher-specific action */}
                    {user?.role === 'teacher' && (
                        <>
                            <Button onClick={handleCreateSession} className="w-full text-lg py-6 mb-6 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                                <PlusCircle className="mr-2 h-5 w-5" /> Create New Session
                            </Button>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-900 px-2 text-slate-500">Or Join a Session</span>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Join session form for everyone */}
                    <form onSubmit={handleJoinSession} className="flex gap-2">
                        <Input 
                            type="text" 
                            value={joinSessionId} 
                            onChange={(e) => setJoinSessionId(e.target.value)} 
                            placeholder="Enter Session ID..." 
                            required 
                            className="bg-slate-800 border-slate-600 focus:border-cyan-400 h-12 text-base" 
                        />
                        <Button type="submit" className="h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold">
                            Join
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};