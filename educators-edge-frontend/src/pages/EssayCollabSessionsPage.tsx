/**
 * Essay Collaboration Sessions Page
 *
 * Page for teachers to view and create essay collaboration sessions.
 */

import React from 'react';
import { CreateEssayCollabSession } from '@/components/essayCollab';

const EssayCollabSessionsPage: React.FC = () => {
  return <CreateEssayCollabSession showExistingSessions={true} />;
};

export default EssayCollabSessionsPage;
