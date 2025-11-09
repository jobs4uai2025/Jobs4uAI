import axios, { AxiosError } from 'axios';
import logger from '../../utils/logger';

const RAPIDAPI_HOST = 'linkedin-job-search-api.p.rapidapi.com';
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}`;

interface LinkedInJob {
  id: string;
  title: string;
  organization: string;
  organization_logo?: string;
  locations_derived?: string[];
  date_posted: string;
  employment_type?: string[];
  url: string;
  description_text?: string;
  external_apply_url?: string;
  salary_raw?: any;
  seniority?: string;
  remote_derived?: boolean;
  countries_derived?: string[];
}

interface LinkedInApiResponse {
  status: string;
  request_id: string;
  data: LinkedInJob[];
}

interface TransformedJob {
  sourceJobId: string;
  source: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  remote: boolean;
  employmentType: string;
  postedDate: Date;
  applicationUrl: string;
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

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Fetch jobs from LinkedIn via RapidAPI
 */
export const fetchLinkedInJobs = async (
  keywords: string = 'software engineer intern',
  location: string = 'United States',
  options: {
    datePosted?: 'anyTime' | 'pastWeek' | 'pastMonth' | 'past24Hours';
    jobType?: string; // F, P, C, T, I (Full-time, Part-time, Contract, Temporary, Internship)
    experienceLevel?: string;
    onsiteRemote?: string;
  } = {}
): Promise<TransformedJob[]> => {
  // Check if API key exists
  if (!process.env.RAPIDAPI_KEY) {
    logger.warn('⚠️  LinkedIn RapidAPI key not configured, using mock data');
    return getMockLinkedInJobs();
  }

  // Check cache
  const now = Date.now();
  const cacheKey = `${keywords}-${location}`;
  if (cache.data && cache.timestamp && now - cache.timestamp < CACHE_DURATION) {
    logger.info('✓ Returning cached LinkedIn jobs');
    return cache.data;
  }

  try {
    logger.info(`Fetching LinkedIn jobs from last 24 hours with location filter: ${location}`);

    // This API returns an array directly, not an object with a data property
    const response = await axios.get<LinkedInJob[]>(`${RAPIDAPI_URL}/active-jb-24h`, {
      params: {
        offset: 0,
        description_type: 'text',
        location_filter: location, // Filter at API level for efficiency
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      timeout: 15000,
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      logger.warn('No jobs returned from LinkedIn API');
      return [];
    }

    logger.info(`📥 Received ${response.data.length} jobs from LinkedIn API`);

    const transformedJobs = transformLinkedInJobs(response.data);

    // Update cache
    cache = {
      data: transformedJobs,
      timestamp: now,
    };

    logger.info(
      `✅ Successfully fetched ${transformedJobs.length} LinkedIn jobs`
    );
    return transformedJobs;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error(
        `❌ LinkedIn API error: ${axiosError.message}`,
        axiosError.response?.data
      );
    } else {
      logger.error('❌ LinkedIn API error:', error);
    }

    // Fallback to mock data on error
    logger.info('Falling back to mock LinkedIn jobs');
    return getMockLinkedInJobs();
  }
};

/**
 * Fetch LinkedIn jobs from last 24 hours with multiple location filters
 * Makes multiple API calls to get maximum coverage across USA
 */
export const fetchLinkedInMultiple = async (): Promise<TransformedJob[]> => {
  logger.info('Fetching LinkedIn jobs with multiple location filters...');

  if (!process.env.RAPIDAPI_KEY) {
    logger.warn('⚠️  LinkedIn RapidAPI key not configured, using mock data');
    return getMockLinkedInJobs();
  }

  try {
    // Define multiple location filters to maximize job coverage
    const locationFilters = [
      'United States', // General USA jobs
      'New York OR San Francisco OR Seattle OR Austin OR Boston', // Tech hubs
      'Chicago OR Denver OR Los Angeles OR San Diego OR Portland', // Other major cities
      'Remote', // Remote-only positions
    ];

    const allJobs: TransformedJob[] = [];
    const seenJobIds = new Set<string>();

    // Make parallel API calls for each location filter
    logger.info(`Making ${locationFilters.length} API calls with different location filters...`);

    for (const location of locationFilters) {
      try {
        logger.info(`Fetching jobs for: ${location}`);

        const response = await axios.get<LinkedInJob[]>(`${RAPIDAPI_URL}/active-jb-24h`, {
          params: {
            offset: 0,
            description_type: 'text',
            location_filter: location,
          },
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST,
          },
          timeout: 15000,
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          logger.info(`📥 Received ${response.data.length} jobs for "${location}"`);

          const transformedJobs = transformLinkedInJobs(response.data);

          // Deduplicate jobs based on sourceJobId
          let newJobs = 0;
          transformedJobs.forEach(job => {
            if (!seenJobIds.has(job.sourceJobId)) {
              seenJobIds.add(job.sourceJobId);
              allJobs.push(job);
              newJobs++;
            }
          });

          logger.info(`✅ Added ${newJobs} unique jobs from "${location}" (${transformedJobs.length - newJobs} duplicates skipped)`);
        } else {
          logger.warn(`No jobs returned for "${location}"`);
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Error fetching jobs for "${location}":`, error);
        // Continue with next location filter even if one fails
      }
    }

    logger.info(`✅ Total unique LinkedIn jobs fetched: ${allJobs.length}`);
    return allJobs;

  } catch (error) {
    logger.error('Error in fetchLinkedInMultiple:', error);
    return getMockLinkedInJobs();
  }
};

/**
 * Transform LinkedIn API response to our job schema
 */
const transformLinkedInJobs = (data: LinkedInJob[]): TransformedJob[] => {
  return data.map((job) => {
    const employmentType = mapJobType(job.employment_type?.[0]);
    const experienceLevel = mapExperienceLevel(job.seniority);

    return {
      sourceJobId: job.id,
      source: 'LINKEDIN',
      title: job.title,
      company: job.organization,
      companyLogo: job.organization_logo,
      location: job.locations_derived?.[0] || 'Remote',
      description: job.description_text || 'No description available',
      salaryMin: job.salary_raw?.min,
      salaryMax: job.salary_raw?.max,
      salaryCurrency: job.salary_raw?.currency || 'USD',
      remote: job.remote_derived || false,
      employmentType,
      postedDate: parsePostedDate(job.date_posted),
      applicationUrl: job.external_apply_url || job.url,
      experienceLevel,
      skills: [], // LinkedIn API might not provide skills directly
    };
  });
};

/**
 * Map LinkedIn job type to our standard types
 */
const mapJobType = (jobType?: string): string => {
  if (!jobType) return 'FULL_TIME';

  const type = jobType.toUpperCase();
  if (type.includes('INTERN')) return 'INTERNSHIP';
  if (type.includes('PART')) return 'PART_TIME';
  if (type.includes('CONTRACT')) return 'CONTRACT';
  if (type.includes('TEMP')) return 'TEMPORARY';
  if (type.includes('FULL') || type === 'F') return 'FULL_TIME';
  if (type === 'I') return 'INTERNSHIP';
  if (type === 'P') return 'PART_TIME';
  if (type === 'C') return 'CONTRACT';

  return 'FULL_TIME';
};

/**
 * Map experience level to standard format
 */
const mapExperienceLevel = (level?: string): string => {
  if (!level) return 'ENTRY';

  const normalized = level.toLowerCase();
  if (
    normalized.includes('entry') ||
    normalized.includes('junior') ||
    normalized === '1'
  )
    return 'ENTRY';
  if (
    normalized.includes('mid') ||
    normalized.includes('associate') ||
    normalized === '2'
  )
    return 'MID';
  if (
    normalized.includes('senior') ||
    normalized.includes('lead') ||
    normalized === '3' ||
    normalized === '4'
  )
    return 'SENIOR';
  if (normalized.includes('executive') || normalized === '5') return 'EXECUTIVE';

  return 'ENTRY';
};

/**
 * Parse LinkedIn posted time to Date
 */
const parsePostedDate = (postedTime: string): Date => {
  const now = new Date();

  if (!postedTime) return now;

  // Try parsing as ISO date first
  const isoDate = new Date(postedTime);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // LinkedIn returns relative time like "2 days ago", "1 week ago"
  const match = postedTime.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'minute':
        return new Date(now.getTime() - value * 60 * 1000);
      case 'hour':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
    }
  }

  return now;
};

/**
 * Get mock LinkedIn jobs when API is unavailable
 */
const getMockLinkedInJobs = (): TransformedJob[] => {
  const mockJobs: TransformedJob[] = [
    {
      sourceJobId: 'mock-linkedin-1',
      source: 'LINKEDIN-MOCK',
      title: 'Software Engineering Intern - Summer 2025',
      company: 'Microsoft',
      location: 'Redmond, WA',
      description:
        'Join our team as a Software Engineering Intern. Work on real projects that impact millions of users. Requirements: CS major, proficiency in C#, Java, or Python.',
      salaryMin: 30,
      salaryMax: 45,
      salaryCurrency: 'USD',
      remote: false,
      employmentType: 'INTERNSHIP',
      postedDate: new Date(),
      applicationUrl: 'https://example.com/jobs/1',
      experienceLevel: 'ENTRY',
      skills: ['C#', 'Java', 'Python', 'Azure'],
    },
    {
      sourceJobId: 'mock-linkedin-2',
      source: 'LINKEDIN-MOCK',
      title: 'Product Management Intern',
      company: 'Google',
      location: 'Mountain View, CA',
      description:
        'Work alongside experienced Product Managers to define product strategy and roadmap. Perfect for MBA or CS students with strong analytical skills.',
      salaryMin: 35,
      salaryMax: 50,
      salaryCurrency: 'USD',
      remote: false,
      employmentType: 'INTERNSHIP',
      postedDate: new Date(),
      applicationUrl: 'https://example.com/jobs/2',
      experienceLevel: 'ENTRY',
      skills: ['Product Management', 'SQL', 'Analytics'],
    },
    {
      sourceJobId: 'mock-linkedin-3',
      source: 'LINKEDIN-MOCK',
      title: 'Frontend Developer - Remote',
      company: 'Shopify',
      location: 'Remote',
      description:
        'Build beautiful, performant user interfaces for our e-commerce platform. Work with React, TypeScript, and modern web technologies.',
      salaryMin: 80,
      salaryMax: 120,
      salaryCurrency: 'USD',
      remote: true,
      employmentType: 'FULL_TIME',
      postedDate: new Date(),
      applicationUrl: 'https://example.com/jobs/3',
      experienceLevel: 'ENTRY',
      skills: ['React', 'TypeScript', 'CSS', 'GraphQL'],
    },
  ];

  return mockJobs;
};

export default {
  fetchLinkedInJobs,
  fetchLinkedInMultiple,
};
