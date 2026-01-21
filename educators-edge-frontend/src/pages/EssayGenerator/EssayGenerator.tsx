/**
 * Essay Generator Component
 *
 * Main interface for generating college essays using EssayMentor AI
 * Includes form, validation, and real-time progress tracking
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import essayService, { GenerateEssayRequest, EssayStats } from '../../services/essayService';
import './EssayGenerator.css';

interface FormData {
  prompt: string;
  university: string;
  wordCount: number;
  studentName: string;
  studentBackground: string;
  studentExperiences: string;
}

export const EssayGenerator: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    university: '',
    wordCount: 650,
    studentName: '',
    studentBackground: '',
    studentExperiences: ''
  });

  // UI state
  const [universities, setUniversities] = useState<string[]>([]);
  const [stats, setStats] = useState<EssayStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ status: '', attempts: 0 });
  const [error, setError] = useState<string | null>(null);

  // Load universities and stats on mount
  useEffect(() => {
    loadUniversities();
    loadStats();
  }, []);

  const loadUniversities = async () => {
    try {
      const unis = await essayService.getUniversities();
      setUniversities(unis);
    } catch (err: any) {
      console.error('Failed to load universities:', err);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await essayService.getStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'wordCount' ? parseInt(value) || 650 : value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.prompt.trim()) {
      return 'Please enter an essay prompt';
    }
    if (!formData.university) {
      return 'Please select a university';
    }
    if (formData.wordCount < 250 || formData.wordCount > 1000) {
      return 'Word count must be between 250 and 1000';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check quota
    if (stats && !stats.quota.can_generate) {
      setError(stats.quota.message);
      return;
    }

    setGenerating(true);
    setLoading(true);

    try {
      // Parse experiences
      const experiences = formData.studentExperiences
        .split('\n')
        .filter(exp => exp.trim())
        .map(exp => exp.trim());

      // Prepare request
      const request: GenerateEssayRequest = {
        prompt: formData.prompt,
        university: formData.university,
        wordCount: formData.wordCount,
        studentProfile: {
          name: formData.studentName || 'Anonymous',
          background: formData.studentBackground,
          experiences: experiences
        }
      };

      // Start generation
      const response = await essayService.generate(request);
      const essayId = response.essay_id;

      console.log('Essay generation started:', essayId);
      setProgress({ status: 'Starting generation...', attempts: 0 });

      // Poll until complete
      await essayService.pollUntilComplete(
        essayId,
        (status, attempts) => {
          setProgress({
            status: status === 'processing' ? 'Generating essay...' : status,
            attempts
          });
        }
      );

      // Navigate to essay view
      navigate(`/dashboard/essays/${essayId}`);

    } catch (err: any) {
      console.error('Essay generation error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      const errorMsg = err.message || 'Failed to generate essay';
      setError(`❌ Error: ${errorMsg}. Please try again.`);
      setGenerating(false);
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = stats?.quota.can_generate ?? true;
  const remaining = stats?.quota.remaining ?? 2;

  return (
    <div className="essay-generator">
      <div className="essay-generator-header">
        <h1>Essay Generator</h1>
        <p className="subtitle">Powered by EssayMentor AI - 6-Agent System</p>

        {stats && (
          <div className="quota-info">
            <div className={`quota-badge ${!canGenerate ? 'quota-exceeded' : ''}`}>
              {stats.quota.subscription_tier === 'free' ? (
                <>
                  <span className="quota-label">Free Tier:</span>
                  <span className="quota-value">
                    {remaining} essay{remaining !== 1 ? 's' : ''} remaining
                  </span>
                </>
              ) : (
                <>
                  <span className="quota-label">{stats.quota.subscription_tier} Plan:</span>
                  <span className="quota-value">Unlimited</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {generating ? (
        <div className="generation-progress">
          <div className="progress-card">
            <div className="progress-spinner"></div>
            <h2>Generating Your Essay</h2>
            <p className="progress-status">{progress.status}</p>
            <p className="progress-detail">
              This typically takes 60-90 seconds. Our 6-agent system is:
            </p>
            <ul className="agent-list">
              <li>✓ Analyzing your profile</li>
              <li>✓ Researching {formData.university}</li>
              <li>✓ Brainstorming unique angles</li>
              <li>✓ Creating detailed outline</li>
              <li>✓ Drafting compelling essay</li>
              <li>✓ Critiquing and refining</li>
            </ul>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((progress.attempts / 150) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="progress-time">Please wait... (~{Math.max(0, 5 - Math.floor(progress.attempts / 30))} minutes remaining)</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="essay-form">
          <div className="form-section">
            <h2>Essay Details</h2>

            <div className="form-group">
              <label htmlFor="prompt">
                Essay Prompt <span className="required">*</span>
              </label>
              <textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleInputChange}
                placeholder="Enter the essay prompt or question..."
                rows={4}
                required
                disabled={loading}
              />
              <span className="form-hint">
                Paste the complete essay prompt from your application
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="university">
                  University <span className="required">*</span>
                </label>
                <select
                  id="university"
                  name="university"
                  value={formData.university}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value="">Select university...</option>
                  {universities.map(uni => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="wordCount">
                  Word Count <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="wordCount"
                  name="wordCount"
                  value={formData.wordCount}
                  onChange={handleInputChange}
                  min={250}
                  max={1000}
                  required
                  disabled={loading}
                />
                <span className="form-hint">250-1000 words</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Student Profile (Optional)</h2>
            <p className="section-subtitle">
              Help us personalize your essay by sharing more about yourself
            </p>

            <div className="form-group">
              <label htmlFor="studentName">Your Name</label>
              <input
                type="text"
                id="studentName"
                name="studentName"
                value={formData.studentName}
                onChange={handleInputChange}
                placeholder="Enter your name..."
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="studentBackground">Background</label>
              <textarea
                id="studentBackground"
                name="studentBackground"
                value={formData.studentBackground}
                onChange={handleInputChange}
                placeholder="Briefly describe your background, interests, and aspirations..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="studentExperiences">Key Experiences</label>
              <textarea
                id="studentExperiences"
                name="studentExperiences"
                value={formData.studentExperiences}
                onChange={handleInputChange}
                placeholder="List your key experiences, activities, or achievements (one per line)"
                rows={4}
                disabled={loading}
              />
              <span className="form-hint">
                Enter one experience per line
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard/essays')}
              className="btn btn-secondary"
              disabled={loading}
            >
              View My Essays
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !canGenerate}
            >
              {loading ? 'Generating...' : 'Generate Essay'}
            </button>
          </div>

          {!canGenerate && (
            <div className="upgrade-prompt">
              <p>
                You've reached your essay limit. Upgrade to generate unlimited essays!
              </p>
              <button className="btn btn-upgrade">
                Upgrade to Premium
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default EssayGenerator;
