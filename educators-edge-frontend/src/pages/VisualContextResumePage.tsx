/**
 * Visual Context Resume Page
 * Main page for the Visual Context Resume System
 */

import React from 'react';
import { VisualContextResumeEditor } from '../components/resume/VisualContextResumeEditor';

const VisualContextResumePage: React.FC = () => {
  const userId = localStorage.getItem('userId') || 'guest';

  const handleAnalysisComplete = (analysis: any) => {
    console.log('Analysis complete:', analysis);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <VisualContextResumeEditor
        userId={userId}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </div>
  );
};

export default VisualContextResumePage;
