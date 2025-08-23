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
import {
    Home,
    Compass,
    RadioTower,
    LogOut
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

    const handleLogout = () => {
        // This logic is now centralized in the sidebar
        localStorage.removeItem('authToken');
        setUser(null);
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: Home, label: 'Dashboard' },
        { path: '/courses/discover', icon: Compass, label: 'Discover Courses' },
    ];

    return (
        <>
            {/* The LiveSessionModal is rendered here but is hidden by default.
                It's part of the sidebar's structure because the sidebar controls it. */}
            <LiveSessionModal 
                user={user} 
                isOpen={isSessionModalOpen} 
                onClose={() => setIsSessionModalOpen(false)} 
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
                                            "h-10 w-10 p-0 rounded-lg hover:bg-slate-700",
                                            location.pathname.startsWith(item.path) && "bg-cyan-500/10 text-cyan-300"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                                    <p>{item.label}</p>
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