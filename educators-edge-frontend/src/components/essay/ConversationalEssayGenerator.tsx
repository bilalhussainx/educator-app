/**
 * Premium Conversational Essay Generator
 *
 * A 0.1% UI/UX ChatGPT-style interface for college essay generation
 * Features: 6-Agent visualization, critique review, essay refinement workflow
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Sparkles, Copy, Download, Loader2, FileText, User,
  CheckCircle2, Circle, RefreshCw, ChevronDown, ChevronUp,
  Zap, Brain, Search, Lightbulb, PenTool, Target, Star,
  Clock, BarChart3, Bookmark, History, Plus, MessageSquare,
  FileDown, Trash2, X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import essayService from '../../services/essayService';
import type { Essay } from '../../services/essayService';
import './ConversationalEssayGenerator.css';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  essayId?: string;
  essay?: Essay;
  isGenerating?: boolean;
  agentProgress?: AgentProgress;
  type?: 'text' | 'essay' | 'critique' | 'refinement-prompt';
}

interface AgentProgress {
  currentAgent: number;
  agents: AgentStep[];
}

interface AgentStep {
  name: string;
  icon: string;
  status: 'pending' | 'active' | 'complete';
  description: string;
}

interface ConversationThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  university?: string;
  versions: EssayVersion[];
}

interface EssayVersion {
  version: number;
  essay: Essay;
  timestamp: Date;
}

interface SamplePrompt {
  title: string;
  subtitle: string;
  profile: string;
  prompt: string;
  university: string;
  wordCount: number;
  icon: string;
}

// Sample prompts with icons
const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    title: "Tech Innovator",
    subtitle: "MIT - Computer Science",
    icon: "code",
    profile: "Sarah Chen - ML climate app developer, robotics team lead, 1520 SAT",
    prompt: `I'm Sarah Chen, a high school senior passionate about computer science and environmental sustainability. I built a machine learning app that predicts local climate patterns using historical weather data, which is now used by my school's environmental club. I also led my robotics team to the national championships where we designed an autonomous robot for waste sorting.

My background: Grew up in San Francisco, first-generation Chinese-American, parents run a small tech startup. I've been coding since age 12 and taught myself Python, JavaScript, and TensorFlow.

University: MIT
Essay Prompt: "Describe the world you come from — for example, your family, community or school — and tell us how your world has shaped your dreams and aspirations."
Word Count: 650 words

Please generate a compelling college essay that connects my technical skills with environmental passion, shows authentic voice and personal growth, and demonstrates fit with MIT's collaborative culture.`,
    university: "MIT",
    wordCount: 650
  },
  {
    title: "Future Physician",
    subtitle: "Stanford - Pre-Med",
    icon: "heart",
    profile: "James Washington - Biomedical researcher, health equity advocate, track captain",
    prompt: `I'm James Washington, aspiring doctor and researcher from Detroit. Last summer, I interned at a biomedical research lab studying sickle cell disease, which disproportionately affects Black communities like mine. The experience opened my eyes to health disparities.

I founded "Health Literacy Detroit" - a program where I train high school students to educate families about preventive care. We've reached over 300 families. I'm also captain of my track team, running the 400m hurdles.

My background: Raised by my grandmother, a retired nurse who inspires my interest in medicine. I've volunteered at Detroit Medical Center for 3 years and shadow Dr. Martinez in the ER.

University: Stanford
Essay Prompt: "Tell us about something that is meaningful to you, and why?"
Word Count: 650 words

Please generate a powerful essay that connects personal experience with health advocacy, shows leadership and community impact, and demonstrates intellectual curiosity in medicine.`,
    university: "Stanford",
    wordCount: 650
  },
  {
    title: "Literary Voice",
    subtitle: "Yale - Humanities",
    icon: "book",
    profile: "Maria Rodriguez - Published poet, literary magazine founder, debate champion",
    prompt: `I'm Maria Rodriguez, a bilingual poet and social justice advocate from El Paso, Texas. I've published poetry in three literary journals exploring themes of border identity and belonging. I founded "Voces" - our school's first bilingual literary magazine showcasing Latinx student voices.

I'm also a Lincoln-Douglas debate champion, competing at nationals. On weekends, I volunteer teaching English to recent immigrants at our community center, helping them prepare for citizenship tests.

My background: Daughter of Mexican immigrants, grew up speaking Spanish at home and English at school. This dual identity deeply influences my writing. My mother cleans houses; my father works construction. I'm the first in my family pursuing college.

University: Yale
Essay Prompt: "What is it about Yale that has led you to apply?"
Word Count: 650 words

Please craft an essay that showcases my love for language and literature, demonstrates commitment to amplifying marginalized voices, and shows fit with Yale's humanities programs.`,
    university: "Yale",
    wordCount: 650
  },
  {
    title: "Engineering Mind",
    subtitle: "Carnegie Mellon",
    icon: "cpu",
    profile: "Alex Kim - Prosthetic hand inventor, ISEF finalist, tech education nonprofit founder",
    prompt: `I'm Alex Kim, a maker and engineer from Seattle. At 15, I designed a low-cost 3D-printed prosthetic hand after meeting my neighbor who lost her hand in an accident but couldn't afford a prosthetic. My design costs $50 compared to $50,000 for traditional ones. I was an Intel ISEF finalist for this project.

I founded "Code for Change" - teaching coding and robotics to middle schoolers in low-income schools. We've trained 200+ students, and several have gone on to compete in robotics competitions.

My background: Korean-American, parents are both engineers at Boeing. I've always been curious about how things work - I took apart (and successfully reassembled) our toaster at age 8.

University: Carnegie Mellon
Essay Prompt: "Most students choose their intended major or area of study based on a passion or inspiration that's developed over time – what passion or inspiration led you to choose this area of study?"
Word Count: 650 words

Please generate an engineering-focused essay that shows problem-solving and innovation, demonstrates social impact through technology, and reflects genuine engineering curiosity.`,
    university: "Carnegie Mellon",
    wordCount: 650
  },
  {
    title: "Business Leader",
    subtitle: "UPenn Wharton",
    icon: "trending-up",
    profile: "David Okonkwo - E-commerce founder ($50K revenue), investment club president",
    prompt: `I'm David Okonkwo, a Nigerian-American entrepreneur from Houston. At 16, I founded "AfroThreads" - an e-commerce platform connecting African artisans directly with US consumers, cutting out middlemen. We've generated $50K in revenue and directly benefited 30 artisan families.

I'm president of our school's investment club, managing a $10K portfolio (up 15% this year). Last summer, I interned with Congressman Green's office, researching small business economic policy in underserved communities.

My background: Parents immigrated from Lagos, Nigeria. My father runs a small import business, and watching him navigate economic challenges inspired my interest in entrepreneurship and economic development.

University: UPenn Wharton
Essay Prompt: "How do you envision the Program in Economics preparing you to make an impact that is important to you?"
Word Count: 650 words

Please write a business-focused essay that demonstrates entrepreneurial mindset and execution, shows understanding of economics and markets, and emphasizes social impact through business.`,
    university: "UPenn",
    wordCount: 650
  }
];

// Agent configuration
const AGENTS: Omit<AgentStep, 'status'>[] = [
  { name: 'Profile Analyst', icon: 'user', description: 'Analyzing your unique story and strengths' },
  { name: 'University Expert', icon: 'search', description: 'Researching what the university values' },
  { name: 'Creative Strategist', icon: 'lightbulb', description: 'Brainstorming compelling angles' },
  { name: 'Structure Architect', icon: 'layout', description: 'Crafting the perfect outline' },
  { name: 'Master Writer', icon: 'pen', description: 'Drafting your narrative' },
  { name: 'Quality Critic', icon: 'target', description: 'Polishing to perfection' }
];

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// LocalStorage key for persisting conversations
const STORAGE_KEY = 'essaymentor_conversations';

// Helper to serialize threads for storage (handle Date objects)
const serializeThreads = (threads: ConversationThread[]): string => {
  return JSON.stringify(threads, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
};

// Helper to deserialize threads from storage (restore Date objects)
const deserializeThreads = (json: string): ConversationThread[] => {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  });
};

export const ConversationalEssayGenerator: React.FC = () => {
  // State - initialize from localStorage if available
  const [threads, setThreads] = useState<ConversationThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = deserializeThreads(saved);
        console.log('[EssayMentor] Loaded', parsed.length, 'conversations from storage');
        return parsed;
      }
    } catch (error) {
      console.error('[EssayMentor] Failed to load conversations:', error);
    }
    return [];
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_active');
      return saved || null;
    } catch {
      return null;
    }
  });

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [expandedCritique, setExpandedCritique] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    try {
      // Don't save if there's an active generation (incomplete data)
      const hasGenerating = threads.some(t => t.messages.some(m => m.isGenerating));
      if (!hasGenerating && threads.length > 0) {
        localStorage.setItem(STORAGE_KEY, serializeThreads(threads));
        console.log('[EssayMentor] Saved', threads.length, 'conversations to storage');
      }
    } catch (error) {
      console.error('[EssayMentor] Failed to save conversations:', error);
    }
  }, [threads]);

  // Save active thread ID
  useEffect(() => {
    try {
      if (activeThreadId) {
        localStorage.setItem(STORAGE_KEY + '_active', activeThreadId);
      } else {
        localStorage.removeItem(STORAGE_KEY + '_active');
      }
    } catch (error) {
      console.error('[EssayMentor] Failed to save active thread:', error);
    }
  }, [activeThreadId]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const agentProgressRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Get active thread
  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  // Smart scroll - only scroll on new messages, not during progress updates
  useEffect(() => {
    const messageCount = messages.length;
    const hasGeneratingMessage = messages.some(m => m.isGenerating);

    // Only scroll if message count changed (new message added)
    if (messageCount !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messageCount;

      if (hasGeneratingMessage && agentProgressRef.current) {
        // Scroll to show agent progress at the top of view
        agentProgressRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Scroll to bottom for completed messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Create new thread
  const createNewThread = useCallback(() => {
    const newThread: ConversationThread = {
      id: generateId(),
      title: 'New Essay',
      messages: [],
      createdAt: new Date(),
      versions: []
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setInput('');
  }, []);

  // Delete a thread
  const deleteThread = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the thread
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
  }, [activeThreadId]);

  // Clear all conversations
  const clearAllThreads = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      setThreads([]);
      setActiveThreadId(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY + '_active');
    }
  }, []);

  // Extract prompt details
  const extractPromptDetails = (prompt: string) => {
    const universityMatch = prompt.match(/University:\s*([^\n]+)/i);
    const university = universityMatch ? universityMatch[1].trim() : 'MIT';

    const wordCountMatch = prompt.match(/Word Count:\s*(\d+)/i);
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 650;

    return { university, wordCount };
  };

  // Handle sample prompt click
  const handleSamplePrompt = (sample: SamplePrompt) => {
    // Create new thread if none exists
    if (!activeThreadId) {
      const newThread: ConversationThread = {
        id: generateId(),
        title: sample.title,
        messages: [],
        createdAt: new Date(),
        university: sample.university,
        versions: []
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
    }
    setInput(sample.prompt);
    textareaRef.current?.focus();
  };

  // Generate essay
  const handleGenerate = async (customPrompt?: string) => {
    const promptText = customPrompt || input;
    if (!promptText.trim() || isGenerating) return;

    // Create thread if needed
    let threadId = activeThreadId;
    if (!threadId) {
      const { university } = extractPromptDetails(promptText);
      const newThread: ConversationThread = {
        id: generateId(),
        title: `${university} Essay`,
        messages: [],
        createdAt: new Date(),
        university,
        versions: []
      };
      setThreads(prev => [newThread, ...prev]);
      threadId = newThread.id;
      setActiveThreadId(threadId);
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: promptText,
      timestamp: new Date(),
      type: 'text'
    };

    // Initialize agent progress
    const initialProgress: AgentProgress = {
      currentAgent: 0,
      agents: AGENTS.map((a, i) => ({ ...a, status: i === 0 ? 'active' : 'pending' as const }))
    };

    // Add generating message
    const generatingMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isGenerating: true,
      agentProgress: initialProgress,
      type: 'text'
    };

    setThreads(prev => prev.map(t =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, userMessage, generatingMessage] }
        : t
    ));
    setInput('');
    setIsGenerating(true);

    try {
      const { university, wordCount } = extractPromptDetails(promptText);

      // Update thread title
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, title: `${university} Essay`, university } : t
      ));

      // Generate essay
      const response = await essayService.generate({
        prompt: promptText,
        university,
        wordCount,
        studentProfile: {
          name: 'Student',
          background: promptText.substring(0, 500),
          experiences: []
        }
      });

      // Poll with progress updates
      const essay = await essayService.pollUntilComplete(
        response.essay_id,
        (status, attempts) => {
          // Calculate which agent is active based on attempts
          const agentIndex = Math.min(Math.floor(attempts / 10), 5);

          setThreads(prev => prev.map(t => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              messages: t.messages.map(m => {
                if (!m.isGenerating) return m;
                return {
                  ...m,
                  agentProgress: {
                    currentAgent: agentIndex,
                    agents: AGENTS.map((a, i) => ({
                      ...a,
                      status: i < agentIndex ? 'complete' : i === agentIndex ? 'active' : 'pending'
                    }))
                  }
                };
              })
            };
          }));
        }
      );

      // Create essay message
      const essayMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: essay.essayText || '',
        timestamp: new Date(),
        essayId: essay._id,
        essay,
        type: 'essay'
      };

      // Create critique message if available
      const critiqueMessage: Message | null = essay.critique ? {
        id: generateId(),
        role: 'assistant',
        content: essay.critique,
        timestamp: new Date(),
        essay,
        type: 'critique'
      } : null;

      // Update thread with final messages
      setThreads(prev => prev.map(t => {
        if (t.id !== threadId) return t;

        const newMessages = t.messages.filter(m => !m.isGenerating);
        newMessages.push(essayMessage);
        if (critiqueMessage) newMessages.push(critiqueMessage);

        const newVersion: EssayVersion = {
          version: t.versions.length + 1,
          essay,
          timestamp: new Date()
        };

        return {
          ...t,
          messages: newMessages,
          versions: [...t.versions, newVersion]
        };
      }));

    } catch (error: any) {
      // Handle error
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Generation failed: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
        type: 'text'
      };

      setThreads(prev => prev.map(t => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: [...t.messages.filter(m => !m.isGenerating), errorMessage]
        };
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Refine essay based on critique
  const handleRefineEssay = async (originalEssay: Essay, critique: string) => {
    if (!activeThreadId || isGenerating) return;

    const refinementPrompt = `Please refine and improve this essay based on the critique feedback:

ORIGINAL ESSAY:
${originalEssay.essayText}

CRITIQUE TO ADDRESS:
${critique}

University: ${originalEssay.university}
Word Count: ${originalEssay.wordCount} words

Please generate an improved version that addresses all the feedback while maintaining the authentic student voice. Focus on:
1. Fixing all weaknesses mentioned in the critique
2. Enhancing the strengths
3. Improving flow and transitions
4. Making the essay more compelling and memorable`;

    await handleGenerate(refinementPrompt);
  };

  // Copy to clipboard
  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download essay as text
  const handleDownloadTxt = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download essay as styled PDF
  const handleDownloadPdf = (essay: Essay) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Colors
    const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
    const textColor: [number, number, number] = [30, 41, 59]; // Dark slate
    const mutedColor: [number, number, number] = [100, 116, 139]; // Muted

    // Header with gradient effect (simulated with rectangle)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('College Application Essay', margin, 18);

    // University subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${essay.university || 'University'} Application`, margin, 28);

    // Quality badge on right
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 30, 10, 30, 15, 3, 3, 'F');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${essay.qualityScore?.toFixed(1) || '8.5'}/10`, pageWidth - margin - 15, 19, { align: 'center' });

    yPosition = 50;

    // Metadata line
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const metadata = `Word Count: ${essay.actualWordCount || 'N/A'} | Generated: ${new Date().toLocaleDateString()} | Powered by EssayMentor AI`;
    doc.text(metadata, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 15;

    // Divider line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 15;

    // Essay content
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(11);
    doc.setFont('times', 'normal');

    const essayText = essay.essayText || '';
    const paragraphs = essayText.split('\n\n').filter(p => p.trim());

    paragraphs.forEach((paragraph, index) => {
      // Check if we need a new page
      const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
      const textHeight = lines.length * 6;

      if (yPosition + textHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Add paragraph with proper line spacing
      doc.text(lines, margin, yPosition);
      yPosition += textHeight + 8; // Add spacing between paragraphs
    });

    // Footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by EssayMentor AI - 6-Agent College Essay Generator', pageWidth / 2, footerY, { align: 'center' });

    // Save the PDF
    const filename = `${essay.university || 'Essay'}-Application-Essay.pdf`;
    doc.save(filename);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Render agent progress
  const renderAgentProgress = (progress: AgentProgress) => (
    <div className="agent-progress" ref={agentProgressRef}>
      <div className="agent-progress-header">
        <Sparkles className="sparkle-icon" size={18} />
        <span>6-Agent System Working</span>
      </div>
      <div className="agent-steps">
        {progress.agents.map((agent, idx) => (
          <div
            key={idx}
            className={`agent-step ${agent.status}`}
          >
            <div className="agent-step-indicator">
              {agent.status === 'complete' ? (
                <CheckCircle2 size={18} className="check-icon" />
              ) : agent.status === 'active' ? (
                <div className="pulse-ring">
                  <Loader2 size={18} className="spinning" />
                </div>
              ) : (
                <Circle size={18} className="pending-icon" />
              )}
            </div>
            <div className="agent-step-content">
              <div className="agent-step-name">{agent.name}</div>
              <div className="agent-step-desc">{agent.description}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="agent-progress-footer">
        <Clock size={14} />
        <span>Estimated time: 60-90 seconds</span>
      </div>
    </div>
  );

  // Render critique sections
  const renderCritique = (critique: string, essay: Essay, messageId: string) => {
    const isExpanded = expandedCritique === messageId;

    // Parse critique sections
    const sections = {
      score: essay.qualityScore || 0,
      strengths: critique.match(/\*\*STRENGTHS\*\*([\s\S]*?)(?=\*\*|$)/i)?.[1]?.trim() || '',
      improvements: critique.match(/\*\*AREAS FOR IMPROVEMENT\*\*([\s\S]*?)(?=\*\*|$)/i)?.[1]?.trim() || '',
      analysis: critique.match(/\*\*.*?SPECIFIC ANALYSIS\*\*([\s\S]*?)(?=\*\*|$)/i)?.[1]?.trim() || '',
      authenticity: critique.match(/\*\*AUTHENTICITY CHECK\*\*([\s\S]*?)(?=\*\*|$)/i)?.[1]?.trim() || '',
      lineEdits: critique.match(/\*\*SPECIFIC LINE EDITS\*\*([\s\S]*?)(?=\*\*|$)/i)?.[1]?.trim() || ''
    };

    return (
      <div className="critique-container">
        <div className="critique-header" onClick={() => setExpandedCritique(isExpanded ? null : messageId)}>
          <div className="critique-header-left">
            <Target size={20} className="critique-icon" />
            <span className="critique-title">Essay Critique & Analysis</span>
          </div>
          <div className="critique-header-right">
            <div className={`quality-badge score-${Math.floor(sections.score)}`}>
              <Star size={14} />
              <span>{sections.score.toFixed(1)}/10</span>
            </div>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        {isExpanded && (
          <div className="critique-body">
            {sections.strengths && (
              <div className="critique-section strengths">
                <h4><CheckCircle2 size={16} /> Strengths</h4>
                <div className="critique-content">{sections.strengths}</div>
              </div>
            )}

            {sections.improvements && (
              <div className="critique-section improvements">
                <h4><Lightbulb size={16} /> Areas for Improvement</h4>
                <div className="critique-content">{sections.improvements}</div>
              </div>
            )}

            {sections.analysis && (
              <div className="critique-section analysis">
                <h4><Search size={16} /> University-Specific Analysis</h4>
                <div className="critique-content">{sections.analysis}</div>
              </div>
            )}

            {sections.authenticity && (
              <div className="critique-section authenticity">
                <h4><User size={16} /> Authenticity Check</h4>
                <div className="critique-content">{sections.authenticity}</div>
              </div>
            )}

            {sections.lineEdits && (
              <div className="critique-section line-edits">
                <h4><PenTool size={16} /> Specific Line Edits</h4>
                <div className="critique-content">{sections.lineEdits}</div>
              </div>
            )}

            <button
              className="refine-button"
              onClick={() => handleRefineEssay(essay, critique)}
              disabled={isGenerating}
            >
              <RefreshCw size={18} />
              <span>Refine Essay Based on Critique</span>
              <Sparkles size={16} className="refine-sparkle" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render essay card
  const renderEssayCard = (message: Message) => {
    if (!message.essay) return null;
    const essay = message.essay;
    const version = activeThread?.versions.findIndex(v => v.essay._id === essay._id) ?? 0;

    return (
      <div className="essay-card">
        <div className="essay-card-header">
          <div className="essay-card-title">
            <FileText size={20} />
            <span>Generated Essay</span>
            {version >= 0 && (
              <span className="version-badge">v{version + 1}</span>
            )}
          </div>
          <div className="essay-card-meta">
            <span className="meta-item">
              <BarChart3 size={14} />
              {essay.actualWordCount} words
            </span>
            <span className="meta-item">
              <Clock size={14} />
              {essay.generationTime}s
            </span>
            <span className={`meta-item quality quality-${Math.floor(essay.qualityScore || 0)}`}>
              <Star size={14} />
              {essay.qualityScore?.toFixed(1)}/10
            </span>
          </div>
        </div>

        <div className="essay-card-content">
          <div className="essay-text">{message.content}</div>
        </div>

        <div className="essay-card-actions">
          <button
            className={`action-btn ${copiedId === message.id ? 'copied' : ''}`}
            onClick={() => handleCopy(message.content, message.id)}
          >
            {copiedId === message.id ? (
              <>
                <CheckCircle2 size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            className="action-btn pdf-btn"
            onClick={() => handleDownloadPdf(essay)}
          >
            <FileDown size={16} />
            <span>PDF</span>
          </button>
          <button
            className="action-btn"
            onClick={() => handleDownloadTxt(message.content, `${essay.university}-essay-v${version + 1}.txt`)}
          >
            <Download size={16} />
            <span>TXT</span>
          </button>
          <button className="action-btn">
            <Bookmark size={16} />
            <span>Save</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="premium-essay-generator">
      {/* Sidebar */}
      <aside className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewThread}>
            <Plus size={18} />
            <span>New Essay</span>
          </button>
        </div>

        <div className="sidebar-threads">
          {threads.length === 0 ? (
            <div className="no-threads">
              <p>No essays yet</p>
              <p className="no-threads-hint">Click "New Essay" or select a sample prompt to start</p>
            </div>
          ) : (
            threads.map(thread => (
              <div
                key={thread.id}
                className={`thread-item ${thread.id === activeThreadId ? 'active' : ''}`}
                onClick={() => setActiveThreadId(thread.id)}
              >
                <MessageSquare size={16} />
                <span className="thread-title">{thread.title}</span>
                {thread.versions.length > 0 && (
                  <span className="thread-versions">v{thread.versions.length}</span>
                )}
                <button
                  className="thread-delete"
                  onClick={(e) => deleteThread(thread.id, e)}
                  title="Delete conversation"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {activeThread && activeThread.versions.length > 1 && (
          <div className="version-history">
            <div className="version-history-header">
              <History size={16} />
              <span>Version History</span>
            </div>
            {activeThread.versions.map((v, idx) => (
              <div key={idx} className="version-item">
                <span>Version {v.version}</span>
                <span className="version-score">{v.essay.qualityScore?.toFixed(1)}/10</span>
              </div>
            ))}
          </div>
        )}

        {threads.length > 0 && (
          <div className="sidebar-footer">
            <button className="clear-all-btn" onClick={clearAllThreads}>
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="chat-header">
          <div className="header-brand">
            <div className="brand-icon">
              <Sparkles size={24} />
            </div>
            <div className="brand-text">
              <h1>EssayMentor AI</h1>
              <p>6-Agent College Essay Generator</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <Zap size={16} />
              <span>Claude Sonnet 4</span>
            </div>
            <div className="stat-item">
              <Star size={16} />
              <span>9.5/10 Quality</span>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">
                <Sparkles size={48} />
              </div>
              <h2>Create Your Perfect College Essay</h2>
              <p>Our 6-agent AI system crafts personalized, high-quality essays that stand out to admissions officers.</p>

              <div className="sample-prompts">
                <h3>Start with a sample profile:</h3>
                <div className="prompts-grid">
                  {SAMPLE_PROMPTS.map((sample, idx) => (
                    <button
                      key={idx}
                      className="prompt-card"
                      onClick={() => handleSamplePrompt(sample)}
                      disabled={isGenerating}
                    >
                      <div className="prompt-card-icon">
                        {sample.icon === 'code' && <Brain size={24} />}
                        {sample.icon === 'heart' && <Zap size={24} />}
                        {sample.icon === 'book' && <FileText size={24} />}
                        {sample.icon === 'cpu' && <Lightbulb size={24} />}
                        {sample.icon === 'trending-up' && <BarChart3 size={24} />}
                      </div>
                      <div className="prompt-card-content">
                        <div className="prompt-card-title">{sample.title}</div>
                        <div className="prompt-card-subtitle">{sample.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.role} ${message.type || 'text'}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? (
                      <User size={20} />
                    ) : (
                      <Sparkles size={20} />
                    )}
                  </div>

                  <div className="message-body">
                    {message.isGenerating && message.agentProgress ? (
                      renderAgentProgress(message.agentProgress)
                    ) : message.type === 'essay' ? (
                      renderEssayCard(message)
                    ) : message.type === 'critique' && message.essay ? (
                      renderCritique(message.content, message.essay, message.id)
                    ) : (
                      <div className="message-text">{message.content}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area" ref={inputContainerRef}>
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe yourself, your experiences, target university, and essay prompt..."
              disabled={isGenerating}
              rows={1}
            />
            <button
              className={`send-btn ${isGenerating ? 'generating' : ''}`}
              onClick={() => handleGenerate()}
              disabled={!input.trim() || isGenerating}
            >
              {isGenerating ? (
                <Loader2 size={20} className="spinning" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <div className="input-footer">
            <span>Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConversationalEssayGenerator;
