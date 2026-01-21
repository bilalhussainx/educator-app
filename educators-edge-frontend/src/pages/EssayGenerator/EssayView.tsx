/**
 * Essay View Component
 *
 * Displays generated essay with tabs for Essay and Critique
 * Includes download and copy functionality
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import essayService, { Essay } from '../../services/essayService';
import './EssayView.css';

type Tab = 'essay' | 'critique';

export const EssayView: React.FC = () => {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();

  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('essay');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    loadEssay();
  }, [essayId]);

  const loadEssay = async () => {
    if (!essayId) {
      setError('No essay ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const essayData = await essayService.getEssay(essayId);
      setEssay(essayData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load essay:', err);
      setError(err.message || 'Failed to load essay');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownload = (text: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getQualityBadge = (score?: number) => {
    if (!score) return null;

    let className = 'quality-badge';
    let label = '';

    if (score >= 9) {
      className += ' quality-excellent';
      label = 'Excellent';
    } else if (score >= 8) {
      className += ' quality-good';
      label = 'Good';
    } else if (score >= 7) {
      className += ' quality-acceptable';
      label = 'Acceptable';
    } else {
      className += ' quality-needs-work';
      label = 'Needs Work';
    }

    return (
      <div className={className}>
        <span className="quality-score">{score.toFixed(1)}/10</span>
        <span className="quality-label">{label}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="essay-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading essay...</p>
        </div>
      </div>
    );
  }

  if (error || !essay) {
    return (
      <div className="essay-view">
        <div className="error-container">
          <h2>Error Loading Essay</h2>
          <p>{error || 'Essay not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/essays')}>
            Back to Essays
          </button>
        </div>
      </div>
    );
  }

  if (essay.status === 'processing') {
    return (
      <div className="essay-view">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Generation in Progress</h2>
          <p>Your essay is being generated. This typically takes 60-90 seconds.</p>
          <button className="btn btn-secondary" onClick={loadEssay}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (essay.status === 'failed') {
    return (
      <div className="essay-view">
        <div className="error-container">
          <h2>Generation Failed</h2>
          <p>{essay.error || 'Essay generation failed. Please try again.'}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => navigate('/dashboard/essay-generator')}>
              Try Again
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard/essays')}>
              Back to Essays
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="essay-view">
      <div className="essay-view-header">
        <button className="btn-back" onClick={() => navigate('/dashboard/essays')}>
          ← Back to Essays
        </button>

        <div className="essay-meta">
          <h1>{essay.university}</h1>
          <div className="essay-stats">
            <span className="stat">
              <strong>Word Count:</strong> {essay.actualWordCount || 0}
            </span>
            {essay.generationTime && (
              <span className="stat">
                <strong>Generated in:</strong> {essay.generationTime}s
              </span>
            )}
            {essay.qualityScore && getQualityBadge(essay.qualityScore)}
          </div>
        </div>

        <div className="essay-actions">
          <button
            className="btn btn-secondary"
            onClick={() => handleCopy(activeTab === 'essay' ? essay.essayText || '' : essay.critique || '')}
          >
            {copySuccess ? '✓ Copied!' : 'Copy'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleDownload(
              activeTab === 'essay' ? essay.essayText || '' : essay.critique || '',
              `${essay.university}-${activeTab}-${Date.now()}.txt`
            )}
          >
            Download
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/dashboard/essay-generator')}
          >
            Generate New Essay
          </button>
        </div>
      </div>

      <div className="essay-tabs">
        <button
          className={`tab ${activeTab === 'essay' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('essay')}
        >
          Essay
        </button>
        <button
          className={`tab ${activeTab === 'critique' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('critique')}
        >
          Critique & Feedback
        </button>
      </div>

      <div className="essay-content-container">
        {activeTab === 'essay' && (
          <div className="essay-content">
            <div className="prompt-section">
              <h3>Prompt</h3>
              <p className="prompt-text">{essay.prompt}</p>
            </div>

            <div className="essay-text">
              {essay.essayText?.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'critique' && (
          <div className="critique-content">
            <div className="critique-header">
              <h3>AI Critique & Feedback</h3>
              {essay.qualityScore && (
                <div className="critique-score">
                  <span className="score-value">{essay.qualityScore.toFixed(1)}</span>
                  <span className="score-label">/10</span>
                </div>
              )}
            </div>

            <div className="critique-text">
              {essay.critique?.split('\n\n').map((section, index) => (
                <div key={index} className="critique-section">
                  {section.split('\n').map((line, lineIndex) => (
                    <p key={lineIndex}>{line}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="essay-footer">
        <p className="timestamp">
          Generated on {new Date(essay.createdAt).toLocaleDateString()} at{' '}
          {new Date(essay.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default EssayView;
