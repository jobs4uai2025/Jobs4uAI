import axios, { AxiosError } from 'axios';
import logger from '../../utils/logger';

const HANDSHAKE_BASE_URL = 'https://api.joinhandshake.com/edu/v1';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface HandshakeJob {
  id: string;
  title: string;
  employer?: {
    name: string;
  };
  location?: {
    name: string;
    city?: string;
    state?: string;
    country?: string;
  };
  description?: string;
  salary_range?: {
    min: number;
    max: number;
    currency?: string;
  };
  remote?: boolean;
  job_type?: string;
  created_at?: string;
  application_url?: string;
  campus_exclusive?: boolean;
  university?: {
    name: string;
  };
  experience_level?: string;
  skills?: string[];
  employment_type?: string;
}

interface HandshakeResponse {
  jobs: HandshakeJob[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

interface TransformedJob {
  sourceJobId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  remote: boolean;
  employmentType: string;
  postedDate: Date;
  url: string;
  isCampusExclusive?: boolean;
  universityName?: string;
  experienceLevel?: string;
  skills?: string[];
}

let cache: {
  data: TransformedJob[] | null;
  timestamp: number | null;
} = {
  data: null,
  timestamp: null,
};

/**
 * Fetch jobs from Handshake EDU API
 * @param filters - Filter parameters for job search
 * @returns Promise of transformed jobs
 */
export const fetchHandshakeJobs = async (
  filters: Record<string, any> = {}
): Promise<TransformedJob[]> => {
  // Check if API key exists
  if (!process.env.HANDSHAKE_API_KEY) {
    logger.warn('⚠️  Handshake API key not configured, using mock data');
    return getMockUniversityJobs();
  }

  // Check cache
  const now = Date.now();
  if (cache.data && cache.timestamp && now - cache.timestamp < CACHE_DURATION) {
    logger.info('✓ Returning cached Handshake jobs');
    return cache.data;
  }

  try {
    const response = await axios.get<HandshakeResponse>(
      `${HANDSHAKE_BASE_URL}/jobs`,
      {
        headers: {
          Authorization: `Bearer ${process.env.HANDSHAKE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          per_page: 100,
          ...filters,
        },
        timeout: 10000,
      }
    );

    const transformedJobs = transformHandshakeJobs(response.data);

    // Update cache
    cache = {
      data: transformedJobs,
      timestamp: now,
    };

    logger.info(
      `✅ Successfully fetched ${transformedJobs.length} jobs from Handshake`
    );
    return transformedJobs;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error(
        `❌ Handshake API error: ${axiosError.message}`,
        axiosError.response?.data
      );
    } else {
      logger.error('❌ Handshake API error:', error);
    }

    // Fallback to mock data on error
    logger.info('Falling back to mock university jobs');
    return getMockUniversityJobs();
  }
};

/**
 * Transform Handshake API response to our job schema
 */
const transformHandshakeJobs = (
  data: HandshakeResponse
): TransformedJob[] => {
  if (!data || !data.jobs) {
    logger.warn('No jobs found in Handshake response');
    return [];
  }

  return data.jobs.map((job) => {
    // Build location string
    let location = 'Not specified';
    if (job.location) {
      const parts = [
        job.location.city,
        job.location.state,
        job.location.country,
      ].filter(Boolean);
      location = parts.length > 0 ? parts.join(', ') : job.location.name || location;
    }

    // Map job type
    const employmentType = mapJobType(job.job_type || job.employment_type);

    return {
      sourceJobId: job.id,
      source: 'HANDSHAKE',
      title: job.title,
      company: job.employer?.name || 'Unknown',
      location,
      description: job.description || '',
      salaryMin: job.salary_range?.min,
      salaryMax: job.salary_range?.max,
      salaryCurrency: job.salary_range?.currency || 'USD',
      remote: job.remote || false,
      employmentType,
      postedDate: job.created_at ? new Date(job.created_at) : new Date(),
      url: job.application_url || '',
      isCampusExclusive: job.campus_exclusive || false,
      universityName: job.university?.name,
      experienceLevel: mapExperienceLevel(job.experience_level),
      skills: job.skills || [],
    };
  });
};

/**
 * Map Handshake job type to our standard types
 */
const mapJobType = (jobType?: string): string => {
  if (!jobType) return 'full-time';

  const type = jobType.toLowerCase();
  if (type.includes('intern')) return 'internship';
  if (type.includes('part')) return 'part-time';
  if (type.includes('contract')) return 'contract';
  if (type.includes('full')) return 'full-time';

  return 'full-time';
};

/**
 * Map experience level to standard format
 */
const mapExperienceLevel = (level?: string): string => {
  if (!level) return 'entry';

  const normalized = level.toLowerCase();
  if (normalized.includes('entry') || normalized.includes('junior'))
    return 'entry';
  if (normalized.includes('mid') || normalized.includes('intermediate'))
    return 'mid';
  if (normalized.includes('senior') || normalized.includes('lead'))
    return 'senior';

  return 'entry';
};

/**
 * Get mock university jobs when API is unavailable
 */
const getMockUniversityJobs = (): TransformedJob[] => {
  const mockJobs: TransformedJob[] = [
    {
      sourceJobId: 'mock-handshake-1',
      source: 'HANDSHAKE-MOCK',
      title: 'Software Engineering Intern',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description:
        'Great internship opportunity for students. Join our team and work on cutting-edge technology projects. Requirements: Computer Science major, proficiency in JavaScript/TypeScript, React, Node.js.',
      salaryMin: 25,
      salaryMax: 35,
      salaryCurrency: 'USD',
      remote: false,
      employmentType: 'internship',
      postedDate: new Date(),
      url: 'https://example.com/jobs/1',
      isCampusExclusive: true,
      universityName: 'Stanford University',
      experienceLevel: 'entry',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    },
    {
      sourceJobId: 'mock-handshake-2',
      source: 'HANDSHAKE-MOCK',
      title: 'Data Science Intern',
      company: 'Analytics Inc',
      location: 'Remote',
      description:
        'Work with our data science team to analyze large datasets and build predictive models. Perfect for students with strong Python and statistics background.',
      salaryMin: 30,
      salaryMax: 40,
      salaryCurrency: 'USD',
      remote: true,
      employmentType: 'internship',
      postedDate: new Date(),
      url: 'https://example.com/jobs/2',
      isCampusExclusive: true,
      universityName: 'MIT',
      experienceLevel: 'entry',
      skills: ['Python', 'Machine Learning', 'Statistics', 'SQL'],
    },
    {
      sourceJobId: 'mock-handshake-3',
      source: 'HANDSHAKE-MOCK',
      title: 'Product Management Intern',
      company: 'StartupXYZ',
      location: 'New York, NY',
      description:
        'Join our product team and help shape the future of our platform. Great opportunity to learn product management skills and work cross-functionally.',
      salaryMin: 28,
      salaryMax: 38,
      salaryCurrency: 'USD',
      remote: false,
      employmentType: 'internship',
      postedDate: new Date(),
      url: 'https://example.com/jobs/3',
      isCampusExclusive: true,
      universityName: 'Harvard University',
      experienceLevel: 'entry',
      skills: ['Product Management', 'Agile', 'User Research'],
    },
    {
      sourceJobId: 'mock-handshake-4',
      source: 'HANDSHAKE-MOCK',
      title: 'UX/UI Design Intern',
      company: 'Design Studio',
      location: 'Austin, TX',
      description:
        'Work alongside experienced designers to create beautiful and intuitive user interfaces. Portfolio required.',
      salaryMin: 22,
      salaryMax: 32,
      salaryCurrency: 'USD',
      remote: false,
      employmentType: 'internship',
      postedDate: new Date(),
      url: 'https://example.com/jobs/4',
      isCampusExclusive: true,
      universityName: 'University of Texas',
      experienceLevel: 'entry',
      skills: ['Figma', 'Adobe XD', 'UI Design', 'UX Research'],
    },
    {
      sourceJobId: 'mock-handshake-5',
      source: 'HANDSHAKE-MOCK',
      title: 'Full Stack Developer - New Grad',
      company: 'Enterprise Solutions',
      location: 'Seattle, WA',
      description:
        'Full-time position for recent graduates. Build scalable web applications using modern technologies. H1B sponsorship available.',
      salaryMin: 90,
      salaryMax: 120,
      salaryCurrency: 'USD',
      remote: false,
      employmentType: 'full-time',
      postedDate: new Date(),
      url: 'https://example.com/jobs/5',
      isCampusExclusive: true,
      universityName: 'University of Washington',
      experienceLevel: 'entry',
      skills: [
        'JavaScript',
        'React',
        'Node.js',
        'PostgreSQL',
        'AWS',
      ],
    },
  ];

  return mockJobs;
};

export default {
  fetchHandshakeJobs,
};
