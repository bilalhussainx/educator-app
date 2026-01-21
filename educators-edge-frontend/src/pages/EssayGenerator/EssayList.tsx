/**
 * Essay List Component
 *
 * Displays grid of user's essays with filtering and search
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import essayService, { Essay, EssayStats } from '../../services/essayService';
import './EssayList.css';

type FilterStatus = 'all' | 'complete' | 'processing' | 'failed';

export const EssayList: React.FC = () => {
  const navigate = useNavigate();

  const [essays, setEssays] = useState<Essay[]>([]);
  const [filteredEssays, setFilteredEssays] = useState<Essay[]>([]);
  const [stats, setStats] = useState<EssayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEssays();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [essays, filterStatus, searchQuery]);

  const loadEssays = async () => {
    try {
      setLoading(true);
      const essaysData = await essayService.getMyEssays();
      setEssays(essaysData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load essays:', err);
      setError(err.message || 'Failed to load essays');
    } finally {
      setLoading(false);
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

  const applyFilters = () => {
    let filtered = [...essays];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(essay => essay.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(essay =>
        essay.university.toLowerCase().includes(query) ||
        essay.prompt.toLowerCase().includes(query)
      );
    }

    setFilteredEssays(filtered);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      complete: { label: 'Complete', className: 'status-complete' },
      processing: { label: 'Processing', className: 'status-processing' },
      failed: { label: 'Failed', className: 'status-failed' }
    };

    const badge = badges[status as keyof typeof badges] || badges.complete;

    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="essay-list">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading essays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="essay-list">
      <div className="essay-list-header">
        <div className="header-title">
          <h1>My Essays</h1>
          <p className="subtitle">View and manage your generated essays</p>
        </div>

        {stats && (
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{stats.stats.total}</div>
              <div className="stat-label">Total Essays</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {stats.stats.avgQuality > 0 ? stats.stats.avgQuality.toFixed(1) : 'N/A'}
              </div>
              <div className="stat-label">Avg Quality</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {stats.quota.subscription_tier === 'free'
                  ? `${stats.quota.remaining}/2`
                  : '∞'}
              </div>
              <div className="stat-label">Remaining</div>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={() => navigate('/dashboard/essay-generator')}
        >
          + Generate New Essay
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="essay-list-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search essays by university or prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'filter-active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({essays.length})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'complete' ? 'filter-active' : ''}`}
            onClick={() => setFilterStatus('complete')}
          >
            Complete ({essays.filter(e => e.status === 'complete').length})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'processing' ? 'filter-active' : ''}`}
            onClick={() => setFilterStatus('processing')}
          >
            Processing ({essays.filter(e => e.status === 'processing').length})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'failed' ? 'filter-active' : ''}`}
            onClick={() => setFilterStatus('failed')}
          >
            Failed ({essays.filter(e => e.status === 'failed').length})
          </button>
        </div>
      </div>

      {filteredEssays.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>No Essays Found</h2>
          <p>
            {essays.length === 0
              ? "You haven't generated any essays yet. Start by creating your first essay!"
              : 'No essays match your search criteria. Try adjusting your filters.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/dashboard/essay-generator')}
          >
            Generate Your First Essay
          </button>
        </div>
      ) : (
        <div className="essays-grid">
          {filteredEssays.map((essay) => (
            <div
              key={essay._id}
              className="essay-card"
              onClick={() => navigate(`/dashboard/essays/${essay._id}`)}
            >
              <div className="essay-card-header">
                <h3 className="essay-university">{essay.university}</h3>
                {getStatusBadge(essay.status)}
              </div>

              <p className="essay-prompt">
                {truncateText(essay.prompt, 120)}
              </p>

              <div className="essay-card-footer">
                <div className="essay-meta">
                  {essay.actualWordCount && (
                    <span className="meta-item">
                      {essay.actualWordCount} words
                    </span>
                  )}
                  {essay.qualityScore && (
                    <span className="meta-item quality-score">
                      ⭐ {essay.qualityScore.toFixed(1)}/10
                    </span>
                  )}
                </div>
                <div className="essay-date">
                  {new Date(essay.createdAt).toLocaleDateString()}
                </div>
              </div>

              {essay.status === 'complete' && (
                <div className="essay-card-hover">
                  <span>View Essay →</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EssayList;
