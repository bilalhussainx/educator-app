// src/components/layout/AppLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { User } from '@/types/index.ts'; // Ensure this path is correct

interface AppLayoutProps {
    user: User | null;
    setUser: (user: User | null) => void;
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ user, setUser, children }) => {
    return (
        <div className="min-h-screen w-full bg-[#0a091a] text-white font-sans flex">
            {/* Background decorative grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <Sidebar user={user} setUser={setUser} />
            
            <main className="flex-1 overflow-y-auto">
                {/* Header (can be added here later if needed) */}
                <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};