/*
 * =================================================================
 * FOLDER: src/components/layout/
 * FILE:   Sidebar.tsx (Final, Complete Implementation)
 * =================================================================
 * DESCRIPTION: This is the persistent global navigation sidebar for the
 * CoreZenith application shell. It provides access to main pages and
 * contains the global trigger for the Live Session modal.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LiveSessionModal } from '../modals/LiveSessionModal';
import { EssayCollabModal } from '../modals/EssayCollabModal';
import {
    Home,
    Compass,
    RadioTower,
    LogOut,
    Sparkles,
    Calendar,
    Users,
    Code,
    Trophy,
    Activity,
    PlusCircle,
    BookOpen,
    Edit3,
    FileText,
    Brain,
    Database,
    MessageSquare,
    CalendarCheck,
    PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
    user: User | null;
    setUser: (user: User | null) => void;
}

const CoreZenithLogo = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({ user, setUser }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // State to control the Live Session modal's visibility
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    // State to control the Essay Collab modal's visibility
    const [isEssayCollabModalOpen, setIsEssayCollabModalOpen] = useState(false);

    const handleLogout = () => {
        // This logic is now centralized in the sidebar
        localStorage.removeItem('authToken');
        setUser(null);
        navigate('/login');
    };

    // Dynamic nav items based on user role
    const getNavItems = () => {
        const baseItems = [
            { path: '/dashboard', icon: Home, label: user?.role === 'teacher' ? 'Teaching Hub' : 'Career Launchpad' },
        ];

        if (user?.role === 'teacher') {
            return [
                ...baseItems,
                { path: '/courses/discover', icon: Compass, label: '🎓 Learn - Discover Courses' },
                { path: '/courses/new', icon: PlusCircle, label: '📚 Create - New Course', teacher: true },
                { path: '/admin/leetcode-enrichment', icon: Database, label: '🤖 LeetCode Enrichment', teacher: true },
                { path: '/messages', icon: MessageSquare, label: '💬 Messages' },
                { path: '/teacher/sessions', icon: CalendarCheck, label: '📅 Session Hub', teacher: true },
                { path: '/session-documents', icon: FileText, label: '📄 Manage - Session Documents' },
                { path: '/ai-writing-assistant', icon: Brain, label: '🤖 AI Writing Assistant' },
                { path: '/trading-terminal', icon: Activity, label: '🔨 Build - Trading Terminal' },
                { path: '/trust-graph', icon: Users, label: '🤝 Connect - Trust Graph' },
                { path: '/solved-problems', icon: Sparkles, label: '🏆 Prove - Achievements' },
            ];
        } else {
            return [
                ...baseItems,
                // NEW ORDER: Trust Graph first, then LeetCode/Courses, then Sessions
                { path: '/trust-graph', icon: Users, label: '🤝 Connect - Trust Graph' },
                { path: '/leetcode', icon: Trophy, label: '🔨 Build - LeetCode' },
                { path: '/courses/discover', icon: Compass, label: '🎓 Learn - Discover Courses' },
                { path: '/messages', icon: MessageSquare, label: '💬 Messages' },
                { path: '/ascent-ide', icon: Code, label: '🔨 Build - IDE Projects' },
                { path: '/session-documents', icon: FileText, label: '📄 Manage - Session Documents' },
                { path: '/ai-writing-assistant', icon: Brain, label: '🤖 AI Writing Assistant' },
                { path: '/trading-terminal', icon: Activity, label: '🔨 Build - Trading Terminal' },
                { path: '/solved-problems', icon: Sparkles, label: '🏆 Prove - Achievements' },
                { path: '/talent-crucible', icon: Sparkles, label: '🏆 Prove - Certifications', premium: true },
            ];
        }
    };

    const navItems = getNavItems();

    return (
        <>
            {/* The LiveSessionModal is rendered here but is hidden by default.
                It's part of the sidebar's structure because the sidebar controls it. */}
            <LiveSessionModal
                user={user}
                isOpen={isSessionModalOpen}
                onClose={() => setIsSessionModalOpen(false)}
            />
            <EssayCollabModal
                user={user}
                isOpen={isEssayCollabModalOpen}
                onClose={() => setIsEssayCollabModalOpen(false)}
            />
            
            <aside className="relative z-20 flex h-screen w-16 flex-col items-center border-r border-slate-800 bg-slate-950/40 backdrop-blur-xl py-4">
                <div className="p-2 mb-4">
                    <CoreZenithLogo />
                </div>

                <TooltipProvider delayDuration={0}>
                    <nav className="flex flex-col items-center gap-2">
                        {navItems.map(item => (
                            <Tooltip key={item.path}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        onClick={() => navigate(item.path)}
                                        className={cn(
                                            "h-10 w-10 p-0 rounded-lg hover:bg-slate-700 relative",
                                            location.pathname.startsWith(item.path) && "bg-cyan-500/10 text-cyan-300",
                                            item.premium && "bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20",
                                            item.teacher && "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-5 w-5",
                                            item.premium && "text-purple-400",
                                            item.teacher && "text-emerald-400"
                                        )} />
                                        {item.premium && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" />
                                        )}
                                        {item.teacher && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-pulse" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                                    <p>{item.label} {item.premium && '✨'} {item.teacher && '👨‍🏫'}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                         {/* Live Session Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsSessionModalOpen(true)} // This opens the modal
                                    className="h-10 w-10 p-0 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-cyan-300"
                                >
                                    <RadioTower className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                                <p>Live Session</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* AI Essay Collaboration Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsEssayCollabModalOpen(true)}
                                    className="h-10 w-10 p-0 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-purple-300 relative"
                                >
                                    <PenTool className="h-5 w-5" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                                <p>{user?.role === 'teacher' ? '✨ AI Essay Collab' : '📝 Join Essay Session'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </nav>
                </TooltipProvider>

                <div className="mt-auto flex flex-col items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" onClick={handleLogout} className="h-10 w-10 p-0 rounded-lg hover:bg-slate-700">
                                    <LogOut className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                                <p>Logout</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </aside>
        </>
    );
};
// // src/components/layout/Sidebar.tsx (Corrected)
// import React from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { User } from '@/types/index.ts';
// import { Button } from "@/components/ui/button";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import {
//     Home, Compass, Target, User as UserIcon, Settings, LogOut
// } from 'lucide-react';
// import { cn } from '@/lib/utils';

// interface SidebarProps {
//     user: User | null;
//     setUser: (user: User | null) => void;
// }

// const CoreZenithLogo = () => (
//     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400">
//         <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
//     </svg>
// );

// // --- KEY FIX: Use 'export const' instead of 'export default' ---
// // This makes it a named export, which matches the import statement in AppLayout.tsx.
// export const Sidebar: React.FC<SidebarProps> = ({ user, setUser }) => {
//     const navigate = useNavigate();
//     const location = useLocation();

//     const handleLogout = () => {
//         localStorage.removeItem('authToken');
//         setUser(null);
//         navigate('/login');
//     };

//     const navItems = [
//         { path: '/dashboard', icon: Home, label: 'Dashboard' },
//         { path: '/courses/discover', icon: Compass, label: 'Discover Courses' },
//     ];

//     return (
//         <aside className="relative z-20 flex h-screen w-16 flex-col items-center border-r border-slate-800 bg-slate-950/40 backdrop-blur-xl py-4">
//             <div className="p-2 mb-4">
//                 <CoreZenithLogo />
//             </div>
//             <TooltipProvider delayDuration={0}>
//                 <nav className="flex flex-col items-center gap-2">
//                     {navItems.map(item => (
//                         <Tooltip key={item.path}>
//                             <TooltipTrigger asChild>
//                                 <Button
//                                     variant="ghost"
//                                     onClick={() => navigate(item.path)}
//                                     className={cn(
//                                         "h-10 w-10 p-0 rounded-lg hover:bg-slate-700",
//                                         location.pathname === item.path && "bg-cyan-500/10 text-cyan-300"
//                                     )}
//                                 >
//                                     <item.icon className="h-5 w-5" />
//                                 </Button>
//                             </TooltipTrigger>
//                             <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
//                                 <p>{item.label}</p>
//                             </TooltipContent>
//                         </Tooltip>
//                     ))}
//                 </nav>
//             </TooltipProvider>

//             <div className="mt-auto flex flex-col items-center gap-2">
//                 <TooltipProvider delayDuration={0}>
//                      <Tooltip>
//                         <TooltipTrigger asChild>
//                             <Button variant="ghost" onClick={handleLogout} className="h-10 w-10 p-0 rounded-lg hover:bg-slate-700">
//                                 <LogOut className="h-5 w-5" />
//                             </Button>
//                         </TooltipTrigger>
//                         <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
//                             <p>Logout</p>
//                         </TooltipContent>
//                     </Tooltip>
//                 </TooltipProvider>
//             </div>
//         </aside>
//     );
// };