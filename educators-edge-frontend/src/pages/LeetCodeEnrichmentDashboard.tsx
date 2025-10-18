/**
 * =================================================================
 * LEETCODE ENRICHMENT DASHBOARD
 * =================================================================
 * Admin dashboard to view and manage problem enrichment
 * Shows which problems need enrichment and their status
 * =================================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LeetCodeEnrichmentDashboard.css';

interface EnrichmentStats {
  total: number;
  enriched: number;
  pending: number;
  percentage: number;
  recentEnrichments: Array<{
    problem_number: string;
    problem_title: string;
    created_at: string;
  }>;
}

interface ProblemStatus {
  problemNumber: string;
  title: string;
  completeness: number;
  missingFields: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'not_enriched' | 'incomplete' | 'complete';
  courses?: Array<{
    courseId: string;
    courseTitle: string;
    moduleName: string;
  }>;
}

const LeetCodeEnrichmentDashboard: React.FC = () => {
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [problems, setProblems] = useState<ProblemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [enriching, setEnriching] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch stats and problems in parallel
      const [statsResponse, problemsResponse] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/leetcode/enrichment/stats`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/api/leetcode/enrichment/needed?limit=100`, config)
      ]);

      setStats(statsResponse.data);
      setProblems(problemsResponse.data.problems);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch enrichment data');
      console.error('Error fetching enrichment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const enrichProblem = async (problemNumber: string) => {
    try {
      setEnriching(problemNumber);
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/leetcode/enrichment/enrich/${problemNumber}`,
        {},
        config
      );

      if (response.data.success) {
        // Refresh the data to show updated status
        await fetchData();
        alert(`✅ Successfully enriched problem ${problemNumber}!`);
      }
    } catch (err: any) {
      console.error('Error enriching problem:', err);
      alert(`❌ Failed to enrich problem ${problemNumber}: ${err.response?.data?.error || err.message}`);
    } finally {
      setEnriching(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#f44336';
      case 'MEDIUM': return '#ff9800';
      case 'LOW': return '#4caf50';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_enriched': return '#f44336';
      case 'incomplete': return '#ff9800';
      case 'complete': return '#4caf50';
      default: return '#666';
    }
  };

  const filteredProblems = problems.filter(problem => {
    const matchesFilter = filter === 'all' || problem.priority === filter;
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         problem.problemNumber.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="enrichment-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading enrichment data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enrichment-dashboard-error">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="leetcode-enrichment-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🤖 LeetCode Problem Enrichment</h1>
          <p>Manage Claude AI enrichment for all LeetCode problems</p>
        </div>
        <button className="refresh-button" onClick={fetchData}>
          🔄 Refresh
        </button>
      </header>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Problems</div>
            </div>
          </div>

          <div className="stat-card enriched">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.enriched}</div>
              <div className="stat-label">Enriched</div>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>

          <div className="stat-card percentage">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{stats.percentage}%</div>
              <div className="stat-label">Complete</div>
            </div>
            <div className="progress-ring">
              <svg width="80" height="80">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="#e0e0e0"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="#667eea"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - stats.percentage / 100)}`}
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Recent Enrichments */}
      {stats && stats.recentEnrichments.length > 0 && (
        <div className="recent-enrichments">
          <h3>📋 Recent Enrichments</h3>
          <div className="recent-list">
            {stats.recentEnrichments.map((item, index) => (
              <div key={index} className="recent-item">
                <span className="recent-number">#{item.problem_number}</span>
                <span className="recent-title">{item.problem_title}</span>
                <span className="recent-time">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Problems Needing Enrichment */}
      <div className="problems-section">
        <div className="section-header">
          <h2>🔍 Problems Needing Enrichment</h2>
          <p>{problems.length} problems require attention</p>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({problems.length})
            </button>
            <button
              className={`filter-btn high ${filter === 'HIGH' ? 'active' : ''}`}
              onClick={() => setFilter('HIGH')}
            >
              🔴 High ({problems.filter(p => p.priority === 'HIGH').length})
            </button>
            <button
              className={`filter-btn medium ${filter === 'MEDIUM' ? 'active' : ''}`}
              onClick={() => setFilter('MEDIUM')}
            >
              🟡 Medium ({problems.filter(p => p.priority === 'MEDIUM').length})
            </button>
            <button
              className={`filter-btn low ${filter === 'LOW' ? 'active' : ''}`}
              onClick={() => setFilter('LOW')}
            >
              🟢 Low ({problems.filter(p => p.priority === 'LOW').length})
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        {/* Problems Table */}
        <div className="problems-table">
          <table>
            <thead>
              <tr>
                <th>Problem</th>
                <th>Title</th>
                <th>Courses</th>
                <th>Completeness</th>
                <th>Missing Fields</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-message">
                    {searchTerm ? 'No problems match your search' : 'All problems are enriched! 🎉'}
                  </td>
                </tr>
              ) : (
                filteredProblems.map((problem) => (
                  <tr key={problem.problemNumber}>
                    <td className="problem-number">#{problem.problemNumber}</td>
                    <td className="problem-title">{problem.title}</td>
                    <td className="courses-cell">
                      {problem.courses && problem.courses.length > 0 ? (
                        <div className="courses-list">
                          {problem.courses.map((course, idx) => (
                            <div key={idx} className="course-tag" title={`${course.courseTitle} - ${course.moduleName}`}>
                              📚 {course.courseTitle.substring(0, 30)}{course.courseTitle.length > 30 ? '...' : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-courses">Not in any course</span>
                      )}
                    </td>
                    <td className="completeness">
                      <div className="completeness-bar">
                        <div
                          className="completeness-fill"
                          style={{
                            width: `${problem.completeness}%`,
                            background: problem.completeness < 50 ? '#f44336' :
                                       problem.completeness < 75 ? '#ff9800' : '#4caf50'
                          }}
                        ></div>
                      </div>
                      <span className="completeness-text">{problem.completeness}%</span>
                    </td>
                    <td className="missing-fields">
                      <div className="fields-container">
                        {problem.missingFields.map((field, idx) => (
                          <span key={idx} className="field-tag">{field}</span>
                        ))}
                      </div>
                    </td>
                    <td className="priority">
                      <span
                        className="priority-badge"
                        style={{ background: getPriorityColor(problem.priority) }}
                      >
                        {problem.priority}
                      </span>
                    </td>
                    <td className="status">
                      <span
                        className="status-badge"
                        style={{ background: getStatusColor(problem.status) }}
                      >
                        {problem.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => enrichProblem(problem.problemNumber)}
                        disabled={enriching === problem.problemNumber}
                        className="enrich-btn"
                        title={`Enrich problem ${problem.problemNumber} with Claude AI`}
                      >
                        {enriching === problem.problemNumber ? '⏳ Enriching...' : '🤖 Enrich Now'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLI Instructions */}
      <div className="cli-instructions">
        <h3>💻 Enrich Problems via CLI</h3>
        <div className="instruction-grid">
          <div className="instruction-card">
            <h4>Single Problem</h4>
            <code>npm run leetcode:enrich 0001</code>
          </div>
          <div className="instruction-card">
            <h4>Batch Enrich</h4>
            <code>npm run leetcode:batch</code>
          </div>
          <div className="instruction-card">
            <h4>Check Priority</h4>
            <code>npm run leetcode:priority</code>
          </div>
          <div className="instruction-card">
            <h4>Run Tests</h4>
            <code>npm run leetcode:test</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeetCodeEnrichmentDashboard;
