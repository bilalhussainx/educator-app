/**
 * Student Profile Setup Component
 *
 * Collects comprehensive student background information to personalize
 * essay writing and provide context for AI agents.
 *
 * Features:
 * - Sample profile templates for common student scenarios
 * - Custom profile creation
 * - Activity and experience management
 * - Family/background context collection
 */

import React, { useState } from 'react';
import {
  User,
  Briefcase,
  GraduationCap,
  Heart,
  Users,
  Trophy,
  Lightbulb,
  Globe,
  Book,
  Music,
  Code,
  Palette,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Plus,
  X,
  Star,
  Clock,
  Home,
  DollarSign,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Sample profile templates
export const SAMPLE_PROFILES = [
  {
    id: 'first-gen',
    name: 'First-Generation College Student',
    icon: GraduationCap,
    color: 'violet',
    description: 'First in family to attend college, navigating higher education without family guidance',
    profile: {
      background: {
        firstGeneration: true,
        familyEducation: 'Neither parent attended college',
        challenges: ['No college guidance at home', 'Learning application process independently', 'Balancing family expectations']
      },
      activities: [
        { name: 'College prep mentorship program', role: 'Mentee then Mentor', years: 2, impact: 'Helped 5 younger students apply to college' },
        { name: 'Part-time job', role: 'Retail Associate', years: 3, impact: 'Contributing to family income while maintaining grades' }
      ],
      strengths: ['Resilience', 'Self-motivation', 'Resourcefulness'],
      uniqueAspects: ['Breaking generational barriers', 'Creating path for siblings']
    }
  },
  {
    id: 'working-student',
    name: 'Working Student',
    icon: Briefcase,
    color: 'amber',
    description: 'Balancing part-time or full-time work with academic responsibilities',
    profile: {
      background: {
        workSituation: 'Part-time employment (20+ hours/week)',
        financialResponsibility: 'Contributing to family expenses',
        challenges: ['Time management', 'Physical exhaustion', 'Missing extracurriculars']
      },
      activities: [
        { name: 'Restaurant Server', role: 'Server/Shift Lead', years: 2, impact: 'Developed customer service and leadership skills' },
        { name: 'Academic Honor Society', role: 'Member', years: 1, impact: 'Maintained 3.8 GPA despite work schedule' }
      ],
      strengths: ['Time management', 'Responsibility', 'Work ethic', 'Maturity'],
      uniqueAspects: ['Understanding value of education through sacrifice', 'Real-world experience']
    }
  },
  {
    id: 'athlete',
    name: 'Student Athlete',
    icon: Trophy,
    color: 'emerald',
    description: 'Competitive athlete balancing sports and academics',
    profile: {
      background: {
        sport: 'Varsity Sport',
        competitionLevel: 'Regional/State level',
        timeCommitment: '15-25 hours/week including practice and games'
      },
      activities: [
        { name: 'Varsity Sports Team', role: 'Team Captain', years: 4, impact: 'Led team to regional championships' },
        { name: 'Youth Sports Coaching', role: 'Volunteer Coach', years: 2, impact: 'Mentored 15 young athletes' }
      ],
      strengths: ['Discipline', 'Teamwork', 'Leadership', 'Perseverance'],
      uniqueAspects: ['Lessons learned from both victory and defeat', 'Team dynamics and individual growth']
    }
  },
  {
    id: 'immigrant',
    name: 'Immigrant/International Background',
    icon: Globe,
    color: 'blue',
    description: 'Navigating between cultures while building identity',
    profile: {
      background: {
        immigrationStory: 'Family immigrated for better opportunities',
        culturalBackground: 'Multicultural upbringing',
        languages: ['English', 'Heritage language'],
        challenges: ['Cultural identity', 'Language barriers', 'Adapting to new system']
      },
      activities: [
        { name: 'Cultural Club', role: 'President', years: 2, impact: 'Organized cultural awareness events' },
        { name: 'ESL Tutoring', role: 'Volunteer Tutor', years: 1, impact: 'Helped new immigrant families' }
      ],
      strengths: ['Adaptability', 'Bilingual/Multilingual', 'Cultural awareness', 'Resilience'],
      uniqueAspects: ['Bridge between cultures', 'Unique perspective on American dream']
    }
  },
  {
    id: 'caregiver',
    name: 'Family Caregiver',
    icon: Heart,
    color: 'rose',
    description: 'Taking care of family members while pursuing education',
    profile: {
      background: {
        caregivingRole: 'Primary caregiver for family member',
        responsibilities: ['Medical appointments', 'Daily care', 'Household management'],
        challenges: ['Limited free time', 'Emotional stress', 'Missing school events']
      },
      activities: [
        { name: 'Family Caregiving', role: 'Primary Caregiver', years: 3, impact: 'Managing care for chronically ill parent' },
        { name: 'Support Group Leadership', role: 'Teen Caregiver Support', years: 1, impact: 'Created peer support network' }
      ],
      strengths: ['Empathy', 'Responsibility', 'Medical knowledge', 'Emotional intelligence'],
      uniqueAspects: ['Premature maturity', 'Understanding healthcare system', 'Compassion through experience']
    }
  },
  {
    id: 'entrepreneur',
    name: 'Young Entrepreneur',
    icon: Lightbulb,
    color: 'orange',
    description: 'Started a business or significant project while in school',
    profile: {
      background: {
        venture: 'Started own business/project',
        motivation: 'Solving a problem in community',
        skills: ['Business acumen', 'Innovation', 'Risk-taking']
      },
      activities: [
        { name: 'Student Business', role: 'Founder/CEO', years: 2, impact: 'Generated $5k+ revenue, employed 3 classmates' },
        { name: 'Business Club', role: 'Vice President', years: 1, impact: 'Organized entrepreneurship workshops' }
      ],
      strengths: ['Innovation', 'Leadership', 'Problem-solving', 'Initiative'],
      uniqueAspects: ['Learning through failure', 'Creating value for others']
    }
  },
  {
    id: 'artist',
    name: 'Creative/Artist',
    icon: Palette,
    color: 'pink',
    description: 'Passionate about arts, music, writing, or creative expression',
    profile: {
      background: {
        artForm: 'Visual arts, music, writing, or performance',
        dedication: 'Years of practice and development',
        expression: 'Art as means of communication and identity'
      },
      activities: [
        { name: 'Art/Music Program', role: 'Lead Performer/Artist', years: 4, impact: 'Solo exhibitions/performances' },
        { name: 'Community Arts', role: 'Teaching Artist', years: 1, impact: 'Art classes for underprivileged youth' }
      ],
      strengths: ['Creativity', 'Discipline', 'Emotional expression', 'Unique perspective'],
      uniqueAspects: ['Art as healing', 'Creative problem-solving', 'Vulnerability in expression']
    }
  },
  {
    id: 'stem',
    name: 'STEM Enthusiast',
    icon: Code,
    color: 'cyan',
    description: 'Passionate about science, technology, engineering, or math',
    profile: {
      background: {
        focus: 'Technology/Science/Engineering/Math',
        projects: 'Independent research or technical projects',
        competitions: 'Science fairs, hackathons, olympiads'
      },
      activities: [
        { name: 'Robotics Club', role: 'Team Lead', years: 3, impact: 'Built competition robot, won regional' },
        { name: 'Research Internship', role: 'Research Assistant', years: 1, impact: 'Co-authored research paper' }
      ],
      strengths: ['Analytical thinking', 'Technical skills', 'Innovation', 'Persistence'],
      uniqueAspects: ['Solving real-world problems', 'Curiosity-driven learning']
    }
  }
];

interface Activity {
  name: string;
  role: string;
  years: number;
  impact: string;
  hoursPerWeek?: number;
}

interface StudentProfile {
  // Basic Info
  name: string;
  grade: string;
  school: string;
  intendedMajor?: string;

  // Background
  background: {
    firstGeneration?: boolean;
    familyEducation?: string;
    financialSituation?: string;
    immigrationBackground?: string;
    languages?: string[];
    familyResponsibilities?: string;
    challenges?: string[];
    uniqueCircumstances?: string;
  };

  // Activities & Experiences
  activities: Activity[];

  // Personal
  strengths: string[];
  weaknesses?: string[];
  values: string[];
  passions: string[];
  goals: string[];

  // Essay-specific
  uniqueAspects: string[];
  significantExperiences: string[];
  transformativeMoments?: string[];
}

interface StudentProfileSetupProps {
  onComplete: (profile: StudentProfile) => void;
  onSkip?: () => void;
  initialProfile?: Partial<StudentProfile>;
}

const StudentProfileSetup: React.FC<StudentProfileSetupProps> = ({
  onComplete,
  onSkip,
  initialProfile
}) => {
  const [step, setStep] = useState<'templates' | 'basic' | 'background' | 'activities' | 'personal' | 'review'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [profile, setProfile] = useState<Partial<StudentProfile>>(initialProfile || {
    activities: [],
    strengths: [],
    values: [],
    passions: [],
    goals: [],
    uniqueAspects: [],
    significantExperiences: [],
    background: {}
  });

  // Activity form state
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({});
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Tag input states
  const [strengthInput, setStrengthInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [passionInput, setPassionInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  const handleTemplateSelect = (templateId: string) => {
    const template = SAMPLE_PROFILES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setProfile(prev => ({
        ...prev,
        ...template.profile,
        background: { ...prev.background, ...template.profile.background },
        activities: template.profile.activities || [],
        strengths: template.profile.strengths || [],
        uniqueAspects: template.profile.uniqueAspects || []
      }));
    }
  };

  const handleCustomProfile = () => {
    setSelectedTemplate('custom');
    setStep('basic');
  };

  const addActivity = () => {
    if (newActivity.name && newActivity.role) {
      setProfile(prev => ({
        ...prev,
        activities: [...(prev.activities || []), newActivity as Activity]
      }));
      setNewActivity({});
      setShowActivityForm(false);
    }
  };

  const removeActivity = (index: number) => {
    setProfile(prev => ({
      ...prev,
      activities: prev.activities?.filter((_, i) => i !== index) || []
    }));
  };

  const addTag = (field: 'strengths' | 'values' | 'passions' | 'goals', value: string) => {
    if (value.trim()) {
      setProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));
    }
  };

  const removeTag = (field: 'strengths' | 'values' | 'passions' | 'goals', index: number) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || []
    }));
  };

  const getStepProgress = () => {
    const steps = ['templates', 'basic', 'background', 'activities', 'personal', 'review'];
    return ((steps.indexOf(step) + 1) / steps.length) * 100;
  };

  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Your background and experiences will help us create more personalized and authentic essay suggestions.
          Choose a template that resonates with you or create a custom profile.
        </p>
      </div>

      {/* Sample Profile Templates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SAMPLE_PROFILES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;

          return (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md
                ${isSelected
                  ? `border-${template.color}-500 bg-${template.color}-50 shadow-lg`
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              {isSelected && (
                <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-${template.color}-500 flex items-center justify-center`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`w-10 h-10 rounded-lg bg-${template.color}-100 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${template.color}-600`} />
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-1">{template.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
            </button>
          );
        })}
      </div>

      {/* Custom Profile Option */}
      <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Create Custom Profile</h3>
              <p className="text-sm text-gray-500">Build your profile from scratch with your unique story</p>
            </div>
          </div>
          <button
            onClick={handleCustomProfile}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Start Custom
          </button>
        </div>
      </div>

      {/* Continue with Template */}
      {selectedTemplate && selectedTemplate !== 'custom' && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setStep('basic')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-lg transition-all"
          >
            Continue with Template
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Skip Option */}
      {onSkip && (
        <div className="text-center mt-4">
          <button
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
        <p className="text-gray-500">Let's start with some basic details</p>
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={profile.name || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            placeholder="Enter your name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade/Year</label>
            <select
              value={profile.grade || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, grade: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="">Select grade</option>
              <option value="9">9th Grade (Freshman)</option>
              <option value="10">10th Grade (Sophomore)</option>
              <option value="11">11th Grade (Junior)</option>
              <option value="12">12th Grade (Senior)</option>
              <option value="gap">Gap Year</option>
              <option value="transfer">Transfer Student</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
            <select
              value={profile.school || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, school: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="">Select type</option>
              <option value="public">Public School</option>
              <option value="private">Private School</option>
              <option value="charter">Charter School</option>
              <option value="homeschool">Homeschool</option>
              <option value="international">International School</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intended Major (if known)</label>
          <input
            type="text"
            value={profile.intendedMajor || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, intendedMajor: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            placeholder="e.g., Computer Science, Pre-Med, Undecided"
          />
        </div>
      </div>
    </div>
  );

  const renderBackground = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Background</h2>
        <p className="text-gray-500">Help us understand your unique circumstances</p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* First Generation */}
        <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.background?.firstGeneration || false}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                background: { ...prev.background, firstGeneration: e.target.checked }
              }))}
              className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500"
            />
            <div>
              <span className="font-medium text-gray-900">First-Generation College Student</span>
              <p className="text-sm text-gray-500">Neither parent has a 4-year college degree</p>
            </div>
          </label>
        </div>

        {/* Financial Situation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Financial Circumstances (optional)
          </label>
          <select
            value={profile.background?.financialSituation || ''}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              background: { ...prev.background, financialSituation: e.target.value }
            }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Prefer not to say</option>
            <option value="low-income">Low-income / Free/Reduced lunch eligible</option>
            <option value="working-class">Working class</option>
            <option value="middle-class">Middle class</option>
            <option value="comfortable">Financially comfortable</option>
          </select>
        </div>

        {/* Family Responsibilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Home className="w-4 h-4 inline mr-1" />
            Family Responsibilities
          </label>
          <textarea
            value={profile.background?.familyResponsibilities || ''}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              background: { ...prev.background, familyResponsibilities: e.target.value }
            }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 resize-none"
            rows={3}
            placeholder="e.g., Taking care of younger siblings, helping with family business, caregiving for family member..."
          />
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4 inline mr-1" />
            Languages Spoken
          </label>
          <input
            type="text"
            value={profile.background?.languages?.join(', ') || ''}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              background: { ...prev.background, languages: e.target.value.split(',').map(l => l.trim()).filter(Boolean) }
            }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
            placeholder="e.g., English, Spanish, Mandarin"
          />
        </div>

        {/* Unique Circumstances */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Star className="w-4 h-4 inline mr-1" />
            Unique Circumstances
          </label>
          <textarea
            value={profile.background?.uniqueCircumstances || ''}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              background: { ...prev.background, uniqueCircumstances: e.target.value }
            }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 resize-none"
            rows={4}
            placeholder="Share anything unique about your situation that has shaped who you are... (immigration story, health challenges, unusual living situation, etc.)"
          />
        </div>
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Activities & Experiences</h2>
        <p className="text-gray-500">Add your extracurriculars, work, and meaningful experiences</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Existing Activities */}
        <div className="space-y-3 mb-6">
          {profile.activities?.map((activity, index) => (
            <div key={index} className="p-4 bg-white rounded-xl border border-gray-200 flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{activity.name}</h4>
                <p className="text-sm text-gray-600">{activity.role} • {activity.years} year(s)</p>
                {activity.impact && (
                  <p className="text-sm text-violet-600 mt-1">{activity.impact}</p>
                )}
              </div>
              <button
                onClick={() => removeActivity(index)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Activity Form */}
        {showActivityForm ? (
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                <input
                  type="text"
                  value={newActivity.name || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., Debate Club, Part-time Job"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
                <input
                  type="text"
                  value={newActivity.role || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., President, Team Member"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years Involved</label>
                <select
                  value={newActivity.years || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, years: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4+ years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours/Week</label>
                <input
                  type="number"
                  value={newActivity.hoursPerWeek || ''}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, hoursPerWeek: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impact/Achievement</label>
              <textarea
                value={newActivity.impact || ''}
                onChange={(e) => setNewActivity(prev => ({ ...prev, impact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 resize-none"
                rows={2}
                placeholder="What did you achieve or contribute?"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowActivityForm(false); setNewActivity({}); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addActivity}
                disabled={!newActivity.name || !newActivity.role}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                Add Activity
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowActivityForm(true)}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Activity
          </button>
        )}
      </div>
    </div>
  );

  const renderPersonal = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Qualities</h2>
        <p className="text-gray-500">What makes you, you?</p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Strengths */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Award className="w-4 h-4 inline mr-1" />
            Your Strengths
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.strengths?.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                {s}
                <button onClick={() => removeTag('strengths', i)} className="hover:text-emerald-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={strengthInput}
              onChange={(e) => setStrengthInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('strengths', strengthInput);
                  setStrengthInput('');
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., Leadership, Empathy, Problem-solving"
            />
            <button
              onClick={() => { addTag('strengths', strengthInput); setStrengthInput(''); }}
              className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Values */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Heart className="w-4 h-4 inline mr-1" />
            Your Core Values
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.values?.map((v, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm">
                {v}
                <button onClick={() => removeTag('values', i)} className="hover:text-rose-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('values', valueInput);
                  setValueInput('');
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., Integrity, Family, Education"
            />
            <button
              onClick={() => { addTag('values', valueInput); setValueInput(''); }}
              className="px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Passions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Your Passions
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.passions?.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                {p}
                <button onClick={() => removeTag('passions', i)} className="hover:text-amber-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={passionInput}
              onChange={(e) => setPassionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('passions', passionInput);
                  setPassionInput('');
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., Music, Social Justice, Technology"
            />
            <button
              onClick={() => { addTag('passions', passionInput); setPassionInput(''); }}
              className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <GraduationCap className="w-4 h-4 inline mr-1" />
            Future Goals
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.goals?.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {g}
                <button onClick={() => removeTag('goals', i)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag('goals', goalInput);
                  setGoalInput('');
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
              placeholder="e.g., Become a doctor, Start a nonprofit"
            />
            <button
              onClick={() => { addTag('goals', goalInput); setGoalInput(''); }}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Significant Experiences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Lightbulb className="w-4 h-4 inline mr-1" />
            Most Significant Experiences
          </label>
          <textarea
            value={profile.significantExperiences?.join('\n') || ''}
            onChange={(e) => setProfile(prev => ({
              ...prev,
              significantExperiences: e.target.value.split('\n').filter(Boolean)
            }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 resize-none"
            rows={4}
            placeholder="List experiences that shaped who you are (one per line)&#10;e.g., Moving to a new country at age 10&#10;Overcoming a learning disability&#10;Losing a loved one"
          />
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Summary</h2>
        <p className="text-gray-500">Review your profile before continuing</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Basic Info Card */}
        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-violet-600" />
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{profile.name || 'Not provided'}</span></div>
            <div><span className="text-gray-500">Grade:</span> <span className="font-medium">{profile.grade || 'Not provided'}</span></div>
            <div><span className="text-gray-500">School:</span> <span className="font-medium">{profile.school || 'Not provided'}</span></div>
            <div><span className="text-gray-500">Intended Major:</span> <span className="font-medium">{profile.intendedMajor || 'Undecided'}</span></div>
          </div>
        </div>

        {/* Background Card */}
        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-amber-600" />
            Background
          </h3>
          <div className="space-y-2 text-sm">
            {profile.background?.firstGeneration && (
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-violet-600" />
                <span>First-Generation College Student</span>
              </div>
            )}
            {profile.background?.languages && profile.background.languages.length > 0 && (
              <div><span className="text-gray-500">Languages:</span> {profile.background.languages.join(', ')}</div>
            )}
            {profile.background?.uniqueCircumstances && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600 italic">{profile.background.uniqueCircumstances}</p>
              </div>
            )}
          </div>
        </div>

        {/* Activities Card */}
        {profile.activities && profile.activities.length > 0 && (
          <div className="p-6 bg-white rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              Activities ({profile.activities.length})
            </h3>
            <div className="space-y-3">
              {profile.activities.map((activity, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{activity.name}</p>
                    <p className="text-sm text-gray-500">{activity.role} • {activity.years} year(s)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qualities Card */}
        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Personal Qualities
          </h3>
          <div className="space-y-3">
            {profile.strengths && profile.strengths.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Strengths: </span>
                <span className="text-sm">{profile.strengths.join(', ')}</span>
              </div>
            )}
            {profile.values && profile.values.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Values: </span>
                <span className="text-sm">{profile.values.join(', ')}</span>
              </div>
            )}
            {profile.passions && profile.passions.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Passions: </span>
                <span className="text-sm">{profile.passions.join(', ')}</span>
              </div>
            )}
            {profile.goals && profile.goals.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Goals: </span>
                <span className="text-sm">{profile.goals.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const steps = ['templates', 'basic', 'background', 'activities', 'personal', 'review'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Progress Bar */}
      {step !== 'templates' && (
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Step {currentStepIndex} of {steps.length - 1}</span>
            <span className="text-sm text-gray-500">{Math.round(getStepProgress())}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'templates' && renderTemplates()}
            {step === 'basic' && renderBasicInfo()}
            {step === 'background' && renderBackground()}
            {step === 'activities' && renderActivities()}
            {step === 'personal' && renderPersonal()}
            {step === 'review' && renderReview()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step !== 'templates' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={() => setStep(steps[currentStepIndex - 1] as any)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {step === 'review' ? (
              <button
                onClick={() => onComplete(profile as StudentProfile)}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-lg transition-all"
              >
                <Check className="w-5 h-5" />
                Complete Profile
              </button>
            ) : (
              <button
                onClick={() => setStep(steps[currentStepIndex + 1] as any)}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfileSetup;
