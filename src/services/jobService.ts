// src/services/jobService.ts
// Job Service - handles all job-related API calls

import apiClient, { ApiResponse, handleApiError } from '../lib/api';

/**
 * Job Type Definitions
 */
export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
  experienceLevel: 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  visaSponsorship: {
    h1b: boolean;
    opt: boolean;
    stemOpt: boolean;
  };
  source: string;
  sourceJobId: string;
  sourceUrl: string;
  applicationUrl?: string;
  skillsRequired: string[];
  industryTags: string[];
  postedDate: string;
  expiryDate?: string;
  isActive: boolean;
  isFeatured: boolean;
  isUniversityJob?: boolean;
  universityName?: string;
  isCampusExclusive?: boolean;
  matchScore?: number;
  isBookmarked?: boolean;
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  remote?: boolean;
  employmentType?: string;
  visaSponsorship?: 'h1b' | 'opt' | 'stemOpt';
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  datePosted?: string;
  page?: number;
  limit?: number;
}

export interface JobSearchResponse {
  jobs: Job[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface BookmarkedJobsResponse {
  bookmarkedJobs: Array<{
    _id: string;
    jobId: Job;
    bookmarkedAt: string;
  }>;
}

/**
 * Job Service
 */
class JobService {
  /**
   * Search for jobs with filters
   */
  async searchJobs(filters: JobSearchFilters = {}): Promise<JobSearchResponse> {
    try {
      const params = new URLSearchParams();

      // Backend expects 'keywords' not 'query'
      if (filters.query) params.append('keywords', filters.query);
      if (filters.location) params.append('location', filters.location);
      if (filters.remote !== undefined) params.append('remote', String(filters.remote));
      if (filters.employmentType) params.append('employmentType', filters.employmentType);

      // Visa sponsorship: backend expects individual boolean params (h1b, opt, stemOpt)
      if (filters.visaSponsorship === 'h1b') {
        params.append('h1b', 'true');
      } else if (filters.visaSponsorship === 'opt') {
        params.append('opt', 'true');
      } else if (filters.visaSponsorship === 'stemOpt') {
        params.append('stemOpt', 'true');
      }

      if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
      if (filters.salaryMin) params.append('salaryMin', String(filters.salaryMin));
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const response = await apiClient.get<ApiResponse<any>>(
        `/api/jobs/search?${params.toString()}`
      );

      if (response.data.success && response.data.data) {
        // Backend returns: { jobs, pagination: { currentPage, totalPages, totalJobs, jobsPerPage } }
        // Frontend expects: { jobs, pagination: { total, page, pages, limit } }
        return {
          jobs: response.data.data.jobs,
          pagination: {
            total: response.data.data.pagination.totalJobs,
            page: response.data.data.pagination.currentPage,
            pages: response.data.data.pagination.totalPages,
            limit: response.data.data.pagination.jobsPerPage,
          }
        };
      }

      throw new Error(response.data.message || 'Failed to search jobs');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get job by ID
   */
  async getJobById(jobId: string): Promise<Job> {
    try {
      const response = await apiClient.get<ApiResponse<{ job: Job }>>(
        `/api/jobs/${jobId}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data.job;
      }

      throw new Error(response.data.message || 'Failed to get job details');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Bookmark a job
   */
  async bookmarkJob(jobId: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse>(
        `/api/jobs/${jobId}/bookmark`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to bookmark job');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Unbookmark a job
   */
  async unbookmarkJob(jobId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse>(
        `/api/jobs/${jobId}/bookmark`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to unbookmark job');
      }
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get bookmarked jobs
   */
  async getBookmarkedJobs(): Promise<Job[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ jobs: Job[]; totalBookmarks: number }>>(
        '/api/jobs/bookmarked/list'
      );

      if (response.data.success && response.data.data) {
        // Backend returns jobs array directly
        return response.data.data.jobs.map(job => ({
          ...job,
          isBookmarked: true
        }));
      }

      throw new Error(response.data.message || 'Failed to get bookmarked jobs');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get recommended jobs based on user profile
   */
  async getRecommendedJobs(limit: number = 10): Promise<Job[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ jobs: Job[] }>>(
        `/api/jobs/recommended?limit=${limit}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data.jobs;
      }

      throw new Error(response.data.message || 'Failed to get recommended jobs');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get university jobs (Handshake, LinkedIn internships, entry-level)
   */
  async getUniversityJobs(filters: {
    page?: number;
    limit?: number;
    keywords?: string;
    location?: string;
    employmentType?: string;
  } = {}): Promise<{
    jobs: Job[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    stats: {
      total: number;
      handshake: number;
      linkedin: number;
      other: number;
    };
  }> {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.keywords) params.append('keywords', filters.keywords);
      if (filters.location) params.append('location', filters.location);
      if (filters.employmentType) params.append('employmentType', filters.employmentType);

      const response = await apiClient.get<ApiResponse<{
        jobs: Job[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          pages: number;
        };
        stats: {
          total: number;
          handshake: number;
          linkedin: number;
          other: number;
        };
      }>>(`/api/jobs/university?${params.toString()}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to get university jobs');
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

// Export singleton instance
export const jobService = new JobService();
export default jobService;
