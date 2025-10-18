/**
 * =================================================================
 * LEETCODE ENRICHMENT LOADER COMPONENT
 * =================================================================
 * Shows a beautiful loading screen while Claude AI enriches a problem
 * =================================================================
 */

import React, { useEffect, useState } from 'react';
import './LeetCodeEnrichmentLoader.css';

interface EnrichmentLoaderProps {
  problemNumber?: string;
  problemTitle?: string;
  onComplete?: () => void;
  estimatedTime?: number; // in seconds
}

const LeetCodeEnrichmentLoader: React.FC<EnrichmentLoaderProps> = ({
  problemNumber,
  problemTitle,
  onComplete,
  estimatedTime = 15
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');

  const enrichmentSteps = [
    { icon: '🤖', text: 'Analyzing problem structure...', duration: 2 },
    { icon: '📝', text: 'Generating comprehensive description...', duration: 4 },
    { icon: '🧪', text: 'Creating realistic test cases...', duration: 3 },
    { icon: '📚', text: 'Adding examples and explanations...', duration: 2 },
    { icon: '⚡', text: 'Defining constraints...', duration: 2 },
    { icon: '💡', text: 'Crafting helpful hints...', duration: 2 },
    { icon: '📊', text: 'Analyzing time & space complexity...', duration: 2 },
    { icon: '💾', text: 'Saving enriched data...', duration: 1 }
  ];

  // Animated dots effect
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  // Progress bar animation
  useEffect(() => {
    const totalSteps = enrichmentSteps.length;
    const stepDuration = (estimatedTime * 1000) / totalSteps;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          if (onComplete) {
            setTimeout(onComplete, 500);
          }
          return 100;
        }
        return Math.min(prev + (100 / totalSteps), 100);
      });
    }, stepDuration);

    return () => clearInterval(progressInterval);
  }, [estimatedTime, onComplete]);

  // Step animation
  useEffect(() => {
    const totalSteps = enrichmentSteps.length;
    const stepDuration = (estimatedTime * 1000) / totalSteps;

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= totalSteps - 1) {
          clearInterval(stepInterval);
          return totalSteps - 1;
        }
        return prev + 1;
      });
    }, stepDuration);

    return () => clearInterval(stepInterval);
  }, [estimatedTime]);

  return (
    <div className="leetcode-enrichment-loader-overlay">
      <div className="leetcode-enrichment-loader-container">
        {/* Header */}
        <div className="enrichment-loader-header">
          <div className="claude-ai-badge">
            <span className="claude-icon">🤖</span>
            <span className="claude-text">Claude AI</span>
            <span className="claude-model">Haiku 3.5</span>
          </div>
          <h2 className="enrichment-title">Enriching Problem{dots}</h2>
        </div>

        {/* Problem Info */}
        {(problemNumber || problemTitle) && (
          <div className="enrichment-problem-info">
            {problemNumber && (
              <span className="problem-number">#{problemNumber}</span>
            )}
            {problemTitle && (
              <span className="problem-title">{problemTitle}</span>
            )}
          </div>
        )}

        {/* Main Animation */}
        <div className="enrichment-animation">
          <div className="ai-brain">
            <div className="brain-pulse"></div>
            <div className="brain-icon">🧠</div>
          </div>

          <div className="enrichment-waves">
            <div className="wave wave-1"></div>
            <div className="wave wave-2"></div>
            <div className="wave wave-3"></div>
          </div>
        </div>

        {/* Current Step */}
        <div className="enrichment-steps">
          {enrichmentSteps.map((step, index) => (
            <div
              key={index}
              className={`enrichment-step ${
                index === currentStep ? 'active' :
                index < currentStep ? 'completed' : 'pending'
              }`}
            >
              <span className="step-icon">{step.icon}</span>
              <span className="step-text">{step.text}</span>
              {index === currentStep && (
                <span className="step-spinner">⏳</span>
              )}
              {index < currentStep && (
                <span className="step-check">✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="enrichment-progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="progress-shimmer"></div>
            </div>
          </div>
          <div className="progress-text">
            {Math.round(progress)}% Complete
          </div>
        </div>

        {/* Info Footer */}
        <div className="enrichment-footer">
          <div className="enrichment-info">
            <span className="info-icon">ℹ️</span>
            <span className="info-text">
              Adding comprehensive details to enhance your learning experience
            </span>
          </div>
          <div className="enrichment-details">
            <div className="detail-item">
              <span className="detail-icon">📝</span>
              <span className="detail-label">Description</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">🧪</span>
              <span className="detail-label">Test Cases</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">📚</span>
              <span className="detail-label">Examples</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">💡</span>
              <span className="detail-label">Hints</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">📊</span>
              <span className="detail-label">Complexity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeetCodeEnrichmentLoader;
