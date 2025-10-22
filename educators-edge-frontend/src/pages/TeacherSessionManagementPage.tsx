import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import TeacherSessionDashboard from '../components/TeacherSessionDashboard';

const TeacherSessionManagementPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard')}
                        className="mb-4 text-slate-300 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                            Session Management
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Manage your incoming session requests and scheduled sessions
                        </p>
                    </div>
                </div>

                {/* Teacher Session Dashboard Component */}
                <TeacherSessionDashboard />
            </div>
        </div>
    );
};

export default TeacherSessionManagementPage;
