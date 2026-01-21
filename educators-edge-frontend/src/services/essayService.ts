/**
 * Essay Service
 *
 * Frontend service for interacting with the Essay Mentor AI API
 * Handles essay generation, retrieval, and polling
 */

import axios, { AxiosInstance } from 'axios';

// Use relative URL to leverage Vite proxy (avoids CORS issues)
// In development: /api proxies to localhost:10000/api
// In production: Use VITE_API_URL
const API_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  : ''; // Empty string = relative URL, uses Vite proxy

// Debug logging for API URL
console.log('[Essay Service] Mode:', import.meta.env.MODE);
console.log('[Essay Service] API_URL:', API_URL || '(using proxy)');
console.log('[Essay Service] Base URL will be:', `${API_URL}/api/essays`);

interface StudentProfile {
  name?: string;
  background?: string;
  experiences?: string[];
  satVerbal?: number;
  voiceCharacteristics?: any;
}

interface GenerateEssayRequest {
  prompt: string;
  university: string;
  studentProfile?: StudentProfile;
  wordCount?: number;
}

interface GenerateEssayResponse {
  essay_id: string;
  status: string;
  message: string;
  estimated_time_seconds?: number;
}

interface Essay {
  _id: string;
  userId: string;
  prompt: string;
  university: string;
  essayType: string;
  wordCount: number;
  actualWordCount?: number;
  status: 'processing' | 'complete' | 'failed';
  essayText?: string;
  critique?: string;
  qualityScore?: number;
  generationTime?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  studentProfile?: StudentProfile;
}

interface EssayStats {
  stats: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    avgQuality: number;
    avgGenerationTime: number;
  };
  quota: {
    subscription_tier: string;
    free_essays_used: number;
    essays_generated: number;
    can_generate: boolean;
    remaining: number;
    message: string;
  };
}

class EssayService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api/essays`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = this.getToken();
      console.log('[Essay Service] Making request to:', config.url);
      console.log('[Essay Service] Full URL:', config.baseURL + config.url);
      console.log('[Essay Service] Token present:', !!token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Log responses for debugging
    this.api.interceptors.response.use(
      (response) => {
        console.log('[Essay Service] Response from:', response.config.url);
        console.log('[Essay Service] Response status:', response.status);
        return response;
      },
      (error) => {
        console.error('[Essay Service] Request failed:', error.config?.url);
        console.error('[Essay Service] Error response:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate a new essay
   */
  async generate(data: GenerateEssayRequest): Promise<GenerateEssayResponse> {
    try {
      const response = await this.api.post('/generate', data);
      return response.data;
    } catch (error: any) {
      console.error('[Essay Service] Generate error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get essay by ID
   */
  async getEssay(essayId: string): Promise<Essay> {
    try {
      const response = await this.api.get(`/${essayId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Essay Service] Get essay error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all essays for current user
   */
  async getMyEssays(): Promise<Essay[]> {
    try {
      const response = await this.api.get('/');
      return response.data.essays;
    } catch (error: any) {
      console.error('[Essay Service] Get essays error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get essay statistics
   */
  async getStats(): Promise<EssayStats> {
    try {
      const response = await this.api.get('/stats');
      return response.data;
    } catch (error: any) {
      console.error('[Essay Service] Get stats error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get list of supported universities
   */
  async getUniversities(): Promise<string[]> {
    try {
      const response = await this.api.get('/universities');
      return response.data.universities;
    } catch (error: any) {
      console.error('[Essay Service] Get universities error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete an essay
   */
  async deleteEssay(essayId: string): Promise<void> {
    try {
      await this.api.delete(`/${essayId}`);
    } catch (error: any) {
      console.error('[Essay Service] Delete essay error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Poll essay until complete
   * Polls every 2 seconds until essay generation is complete or timeout
   */
  async pollUntilComplete(
    essayId: string,
    onProgress?: (status: string, attempts: number, essay?: Essay) => void
  ): Promise<Essay> {
    const maxAttempts = 300; // 10 minutes max (300 * 2 seconds)
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;

        try {
          const essay = await this.getEssay(essayId);

          if (onProgress) {
            onProgress(essay.status, attempts, essay);
          }

          if (essay.status === 'complete') {
            clearInterval(interval);
            resolve(essay);
          } else if (essay.status === 'failed') {
            clearInterval(interval);
            reject(new Error(essay.error || 'Essay generation failed'));
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Timeout: Essay generation took too long (10+ minutes)'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds
    });
  }

  /**
   * Test Python connection (for debugging)
   */
  async testConnection(): Promise<any> {
    try {
      const response = await this.api.get('/test-connection');
      return response.data;
    } catch (error: any) {
      console.error('[Essay Service] Test connection error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get auth token from localStorage
   */
  private getToken(): string | null {
    // App stores token as 'authToken', not 'token'
    return localStorage.getItem('authToken');
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    console.error('[Essay Service] Full error:', error);

    if (error.response) {
      // Server responded with error
      console.error('[Essay Service] Response status:', error.response.status);
      console.error('[Essay Service] Response data:', error.response.data);
      const message = error.response.data?.message || error.response.data?.error || `Server error (${error.response.status})`;
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      console.error('[Essay Service] No response received');
      return new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      console.error('[Essay Service] Request setup error:', error.message);
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new EssayService();
export type { Essay, EssayStats, StudentProfile, GenerateEssayRequest, GenerateEssayResponse };
