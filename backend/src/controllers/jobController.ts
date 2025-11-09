// backend/src/controllers/jobController.ts
// Complete Job Controller - Phase 2 (Fixed All Issues)

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job';
import User from '../models/User';
import Application from '../models/Application';
import jobAggregator from '../services/jobAggregator';
import dailyJobRefreshService from '../jobs/dailyJobRefresh';
import jobCleanupService from '../services/jobCleanup';
import visaDetectionService from '../services/visaDetection';
import logger from '../utils/logger';
import universityJobScraper from '../services/universityJobScraper';
import recommendationService from '../services/recommendationService';

// ==================== PHASE 1 & 2 CHUNK 1-2 METHODS ====================

/**
 * GET /api/jobs
 * Search jobs with filters - OPTIMIZED
 */
export const searchJobs = async (req: Request, res: Response) => {
  try {
    const {
      keywords,
      location,
      remote,
      h1b,
      opt,
      stemOpt,
      employmentType,
      skills,
      source,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Use aggregation pipeline for better performance and relevance scoring
    const pipeline: any[] = [];

    // Match stage - basic filters
    const matchStage: any = { isActive: true };

    // Location filter (still use regex for flexibility)
    if (location) {
      matchStage.location = { $regex: location, $options: 'i' };
    }

    // Remote filter
    if (remote === 'true') {
      matchStage.remote = true;
    }

    // Visa sponsorship filters
    if (h1b === 'true') {
      matchStage['visaSponsorship.h1b'] = true;
    }
    if (opt === 'true') {
      matchStage['visaSponsorship.opt'] = true;
    }
    if (stemOpt === 'true') {
      matchStage['visaSponsorship.stemOpt'] = true;
    }

    // Employment type filter
    if (employmentType) {
      matchStage.employmentType = employmentType.toString().toUpperCase();
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.toString().split(',');
      matchStage.skillsRequired = { $in: skillsArray };
    }

    // Source filter
    if (source) {
      matchStage.source = source.toString().toUpperCase();
    }

    // Keyword search with scoring
    if (keywords) {
      // Use text search if available, otherwise regex
      const keywordStr = keywords.toString();

      // Try text search first (requires index)
      try {
        matchStage.$text = { $search: keywordStr };
        pipeline.push({ $match: matchStage });

        // Add text score for sorting
        pipeline.push({
          $addFields: {
            searchScore: { $meta: 'textScore' }
          }
        });
      } catch (error) {
        // Fallback to regex if text index doesn't exist
        matchStage.$or = [
          { title: { $regex: keywordStr, $options: 'i' } },
          { description: { $regex: keywordStr, $options: 'i' } },
          { company: { $regex: keywordStr, $options: 'i' } }
        ];
        pipeline.push({ $match: matchStage });

        // Add manual scoring based on title match
        pipeline.push({
          $addFields: {
            searchScore: {
              $cond: {
                if: { $regexMatch: { input: '$title', regex: keywordStr, options: 'i' } },
                then: 10, // Higher score for title match
                else: 1   // Lower score for description match
              }
            }
          }
        });
      }
    } else {
      pipeline.push({ $match: matchStage });
      pipeline.push({
        $addFields: {
          searchScore: 0
        }
      });
    }

    // Project stage - limit description size and select only needed fields
    pipeline.push({
      $project: {
        title: 1,
        company: 1,
        location: 1,
        description: { $substrCP: ['$description', 0, 500] }, // Limit to 500 chars for list view (UTF-8 safe)
        fullDescription: '$description', // Keep full for detail view
        employmentType: 1,
        experienceLevel: 1,
        remote: 1,
        salaryMin: 1,
        salaryMax: 1,
        salaryCurrency: 1,
        visaSponsorship: 1,
        source: 1,
        sourceJobId: 1,
        sourceUrl: 1,
        skillsRequired: 1,
        industryTags: 1,
        postedDate: 1,
        expiryDate: 1,
        isActive: 1,
        isFeatured: 1,
        matchScore: 1,
        searchScore: 1,
        isUniversityJob: 1,
        universityName: 1,
        isCampusExclusive: 1,
        applicationUrl: 1
      }
    });

    // Sort stage - by relevance first, then by date
    if (keywords) {
      pipeline.push({
        $sort: { searchScore: -1, postedDate: -1 }
      });
    } else {
      pipeline.push({
        $sort: { postedDate: -1 }
      });
    }

    // Facet stage - get both results and count in one query
    pipeline.push({
      $facet: {
        jobs: [
          { $skip: skip },
          { $limit: limitNum }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });

    // Execute aggregation
    const result = await Job.aggregate(pipeline);

    const jobs = result[0]?.jobs || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;

    logger.info(`Job search completed: ${jobs.length} results from ${totalCount} total`, {
      keywords,
      location,
      filters: { remote, h1b, opt, stemOpt, employmentType },
      page: pageNum
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalJobs: totalCount,
          jobsPerPage: limitNum
        }
      }
    });
  } catch (error) {
    logger.error('Error searching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching jobs'
    });
  }
};

/**
 * GET /api/jobs/stats
 * Get job statistics by source
 */
export const getJobStats = async (req: Request, res: Response) => {
  try {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          h1bCount: {
            $sum: { $cond: ['$visaSponsorship.h1b', 1, 0] }
          },
          optCount: {
            $sum: { $cond: ['$visaSponsorship.opt', 1, 0] }
          },
          remoteCount: {
            $sum: { $cond: ['$remote', 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        bySource: stats
      }
    });
  } catch (error) {
    logger.error('Error getting job stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting job statistics'
    });
  }
};

/**
 * GET /api/jobs/:id
 * Get single job details
 */
export const getJobById = async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error('Error getting job:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting job details'
    });
  }
};

/**
 * POST /api/jobs/:id/bookmark
 * Bookmark or unbookmark a job (requires authentication)
 */
export const bookmarkJob = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Convert jobId to ObjectId for comparison
    const jobObjectId = new mongoose.Types.ObjectId(jobId);

    // Check if already bookmarked
    const bookmarkIndex = user.bookmarkedJobs.findIndex(
      (id: any) => id.toString() === jobId
    );
    let action: string;

    if (bookmarkIndex > -1) {
      // Remove bookmark
      user.bookmarkedJobs.splice(bookmarkIndex, 1);
      action = 'removed';
    } else {
      // Add bookmark
      user.bookmarkedJobs.push(jobObjectId as any);
      action = 'added';
    }

    await user.save();

    res.json({
      success: true,
      message: `Job ${action} ${action === 'added' ? 'to' : 'from'} bookmarks`,
      data: {
        bookmarked: action === 'added',
        totalBookmarks: user.bookmarkedJobs.length
      }
    });
  } catch (error) {
    logger.error('Error bookmarking job:', error);
    res.status(500).json({
      success: false,
      message: 'Error bookmarking job'
    });
  }
};

/**
 * GET /api/jobs/bookmarked/list
 * Get user's bookmarked jobs (requires authentication)
 */
export const getBookmarkedJobs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findById(userId).populate('bookmarkedJobs');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        jobs: user.bookmarkedJobs,
        totalBookmarks: user.bookmarkedJobs.length
      }
    });
  } catch (error) {
    logger.error('Error getting bookmarked jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting bookmarked jobs'
    });
  }
};

/**
 * POST /api/jobs/aggregate
 * Manually trigger job aggregation (requires authentication)
 */
export const triggerJobAggregation = async (req: Request, res: Response) => {
  try {
    logger.info(`Job aggregation triggered by user: ${req.user?.email}`);

    // Call the correct method from your jobAggregator
    const result = await jobAggregator.aggregateJobs();

    res.json({
      success: true,
      message: 'Job aggregation completed',
      data: {
        totalJobs: result,
        message: `Successfully aggregated ${result} jobs`
      }
    });
  } catch (error) {
    logger.error('Error during job aggregation:', error);
    res.status(500).json({
      success: false,
      message: 'Error during job aggregation'
    });
  }
};

// ==================== PHASE 2 CHUNK 3 - NEW METHODS ====================

/**
 * GET /api/jobs/system/refresh-stats
 * Get last job refresh statistics
 */
export const getRefreshStats = async (req: Request, res: Response) => {
  try {
    const stats = dailyJobRefreshService.getLastRefreshStats();
    const isRunning = dailyJobRefreshService.isRefreshRunning();
    const nextRun = dailyJobRefreshService.getNextScheduledRun();

    res.json({
      success: true,
      data: {
        lastRefresh: stats,
        isRunning,
        nextScheduledRun: nextRun,
        enabled: process.env.ENABLE_DAILY_JOB_REFRESH === 'true',
        cronSchedule: process.env.JOB_REFRESH_CRON || '0 2 * * *'
      }
    });
  } catch (error) {
    logger.error('Error getting refresh stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting refresh statistics'
    });
  }
};

/**
 * POST /api/jobs/system/refresh
 * Manually trigger job refresh (admin/authenticated)
 */
export const triggerManualRefresh = async (req: Request, res: Response) => {
  try {
    logger.info(`Manual refresh triggered by user: ${req.user?.email}`);

    // Check if already running
    if (dailyJobRefreshService.isRefreshRunning()) {
      return res.status(409).json({
        success: false,
        message: 'Job refresh is already in progress'
      });
    }

    // Start refresh asynchronously
    dailyJobRefreshService.triggerManualRefresh().catch(error => {
      logger.error('Manual refresh failed:', error);
    });

    res.json({
      success: true,
      message: 'Job refresh started. Check /api/jobs/system/refresh-stats for progress.'
    });
  } catch (error) {
    logger.error('Error triggering manual refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering job refresh'
    });
  }
};

/**
 * POST /api/jobs/system/cleanup
 * Manually trigger cleanup (admin only)
 */
export const triggerCleanup = async (req: Request, res: Response) => {
  try {
    logger.info(`Manual cleanup triggered by user: ${req.user?.email}`);

    const result = await jobCleanupService.performFullCleanup();

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup operation'
    });
  }
};

/**
 * GET /api/jobs/system/cleanup-stats
 * Get cleanup statistics
 */
export const getCleanupStats = async (req: Request, res: Response) => {
  try {
    const stats = await jobCleanupService.getCleanupStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cleanup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cleanup statistics'
    });
  }
};

/**
 * POST /api/jobs/:id/analyze-visa
 * Analyze visa sponsorship for a specific job
 */
export const analyzeJobVisa = async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const visaAnalysis = visaDetectionService.detectVisaSponsorship(
      job.title,
      job.description,
      job.company
    );

    // Optionally update the job with new analysis
    if (req.query.update === 'true') {
      job.visaSponsorship.h1b = visaAnalysis.h1b;
      job.visaSponsorship.opt = visaAnalysis.opt;
      job.visaSponsorship.stemOpt = visaAnalysis.stemOpt;
      await job.save();
    }

    res.json({
      success: true,
      data: {
        jobId: job._id,
        title: job.title,
        company: job.company,
        currentVisa: job.visaSponsorship,
        analysis: visaAnalysis
      }
    });
  } catch (error) {
    logger.error('Error analyzing job visa:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing visa sponsorship'
    });
  }
};

/**
 * POST /api/jobs/batch/analyze-visa
 * Batch analyze visa sponsorship for all jobs
 */
export const batchAnalyzeVisa = async (req: Request, res: Response) => {
  try {
    const { limit = 100, source } = req.query;

    // Build query
    const query: any = {};
    if (source) {
      query.source = source.toString().toUpperCase();
    }

    // Get jobs to analyze
    const jobs = await Job.find(query)
      .limit(Number(limit))
      .select('title description company visaSponsorship');

    logger.info(`Analyzing ${jobs.length} jobs for visa sponsorship`);

    let updated = 0;
    const results = [];

    for (const job of jobs) {
      const analysis = visaDetectionService.detectVisaSponsorship(
        job.title,
        job.description,
        job.company
      );

      // Update if different
      if (
        job.visaSponsorship.h1b !== analysis.h1b ||
        job.visaSponsorship.opt !== analysis.opt ||
        job.visaSponsorship.stemOpt !== analysis.stemOpt
      ) {
        job.visaSponsorship.h1b = analysis.h1b;
        job.visaSponsorship.opt = analysis.opt;
        job.visaSponsorship.stemOpt = analysis.stemOpt;
        await job.save();
        updated++;
      }

      results.push({
        jobId: job._id,
        title: job.title,
        company: job.company,
        confidence: analysis.confidence,
        detected: analysis
      });
    }

    res.json({
      success: true,
      message: `Analyzed ${jobs.length} jobs, updated ${updated}`,
      data: {
        totalAnalyzed: jobs.length,
        totalUpdated: updated,
        results
      }
    });
  } catch (error) {
    logger.error('Error in batch visa analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error during batch visa analysis'
    });
  }
};

/**
 * GET /api/jobs/system/health
 * Get job system health status
 */
export const getJobSystemHealth = async (req: Request, res: Response) => {
  try {
    const [
      totalJobs,
      activeJobs,
      jobsBySource,
      refreshStats,
      cleanupStats
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ isActive: true }),
      Job.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      dailyJobRefreshService.getLastRefreshStats(),
      jobCleanupService.getCleanupStats()
    ]);

    const sourceMap = jobsBySource.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as { [source: string]: number });

    res.json({
      success: true,
      data: {
        status: 'healthy',
        jobs: {
          total: totalJobs,
          active: activeJobs,
          inactive: totalJobs - activeJobs,
          bySource: sourceMap
        },
        lastRefresh: refreshStats,
        cleanupStats,
        cron: {
          enabled: process.env.ENABLE_DAILY_JOB_REFRESH === 'true',
          schedule: process.env.JOB_REFRESH_CRON || '0 2 * * *',
          nextRun: dailyJobRefreshService.getNextScheduledRun()
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting job system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting system health'
    });
  }
};


export const triggerUniversityScrape = async (req: Request, res: Response) => {
  try {
    logger.info(`University job scraping triggered by user: ${req.user?.email}`);

    const result = await universityJobScraper.scrapeAllUniversities();

    res.json({
      success: true,
      message: 'University job scraping completed',
      data: result
    });
  } catch (error) {
    logger.error('Error during university job scraping:', error);
    res.status(500).json({
      success: false,
      message: 'Error during university job scraping'
    });
  }
};

/**
 * GET /api/jobs/saved/organized
 * Get saved jobs organized by status (Applied, Interested, Not Interested)
 * @access Private
 */
export const getOrganizedSavedJobs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user with bookmarked jobs
    const user = await User.findById(userId).populate('bookmarkedJobs');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all applications for this user
    const applications = await Application.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    });

    // Create a map of jobId -> application status
    const applicationMap = new Map();
    applications.forEach(app => {
      applicationMap.set(app.jobId.toString(), app.status);
    });

    // Organize saved jobs
    const organized = {
      applied: [] as any[],
      interested: [] as any[],
      notInterested: [] as any[]
    };

    user.bookmarkedJobs.forEach((job: any) => {
      const jobId = job._id.toString();
      const appStatus = applicationMap.get(jobId);

      if (appStatus && appStatus !== 'SAVED') {
        organized.applied.push({
          ...job.toObject(),
          applicationStatus: appStatus
        });
      } else {
        // For jobs without applications, consider them "interested"
        organized.interested.push(job);
      }
    });

    logger.info('Organized saved jobs retrieved', { 
      userId,
      applied: organized.applied.length,
      interested: organized.interested.length
    });

    res.json({
      success: true,
      data: {
        applied: organized.applied,
        interested: organized.interested,
        notInterested: organized.notInterested,
        counts: {
          applied: organized.applied.length,
          interested: organized.interested.length,
          notInterested: organized.notInterested.length,
          total: user.bookmarkedJobs.length
        }
      }
    });
  } catch (error: any) {
    logger.error('Error getting organized saved jobs', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error retrieving organized saved jobs'
    });
  }
};

/**
 * POST /api/jobs/saved/bulk-remove
 * Remove multiple saved jobs at once
 * @access Private
 */
export const bulkRemoveSavedJobs = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { jobIds } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Job IDs array is required'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove jobs from bookmarks
    const initialCount = user.bookmarkedJobs.length;
    user.bookmarkedJobs = user.bookmarkedJobs.filter(
      (id: any) => !jobIds.includes(id.toString())
    );
    const removedCount = initialCount - user.bookmarkedJobs.length;

    await user.save();

    logger.info('Bulk removed saved jobs', { 
      userId,
      removedCount
    });

    res.json({
      success: true,
      message: `${removedCount} job(s) removed from saved jobs`,
      data: {
        removedCount,
        remainingCount: user.bookmarkedJobs.length
      }
    });
  } catch (error: any) {
    logger.error('Error bulk removing saved jobs', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error removing saved jobs'
    });
  }
};

/**
 * GET /api/jobs/saved/analytics
 * Get analytics on saved jobs
 * @access Private
 */
export const getSavedJobsAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user with bookmarked jobs
    const user = await User.findById(userId).populate('bookmarkedJobs');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const savedJobs = user.bookmarkedJobs as any[];

    if (savedJobs.length === 0) {
      return res.json({
        success: true,
        data: {
          totalSaved: 0,
          analytics: null
        }
      });
    }

    // Analyze saved jobs
    const analytics = {
      totalSaved: savedJobs.length,
      byEmploymentType: {} as Record<string, number>,
      byLocation: {} as Record<string, number>,
      byExperienceLevel: {} as Record<string, number>,
      visaSponsorshipStats: {
        h1b: 0,
        opt: 0,
        stemOpt: 0
      },
      salaryRange: {
        min: Infinity,
        max: -Infinity,
        average: 0
      },
      topCompanies: [] as { company: string; count: number }[],
      remoteJobs: 0
    };

    const companiesMap = new Map<string, number>();
    let salarySum = 0;
    let salaryCount = 0;

    savedJobs.forEach((job: any) => {
      // Employment type
      analytics.byEmploymentType[job.employmentType] = 
        (analytics.byEmploymentType[job.employmentType] || 0) + 1;

      // Location
      const location = job.location || 'Unknown';
      analytics.byLocation[location] = (analytics.byLocation[location] || 0) + 1;

      // Experience level
      analytics.byExperienceLevel[job.experienceLevel] = 
        (analytics.byExperienceLevel[job.experienceLevel] || 0) + 1;

      // Visa sponsorship
      if (job.visaSponsorship?.h1b) analytics.visaSponsorshipStats.h1b++;
      if (job.visaSponsorship?.opt) analytics.visaSponsorshipStats.opt++;
      if (job.visaSponsorship?.stemOpt) analytics.visaSponsorshipStats.stemOpt++;

      // Salary
      if (job.salaryMin && job.salaryMax) {
        const avgSalary = (job.salaryMin + job.salaryMax) / 2;
        salarySum += avgSalary;
        salaryCount++;
        analytics.salaryRange.min = Math.min(analytics.salaryRange.min, job.salaryMin);
        analytics.salaryRange.max = Math.max(analytics.salaryRange.max, job.salaryMax);
      }

      // Companies
      companiesMap.set(job.company, (companiesMap.get(job.company) || 0) + 1);

      // Remote
      if (job.remote) analytics.remoteJobs++;
    });

    // Calculate average salary
    analytics.salaryRange.average = salaryCount > 0 
      ? Math.round(salarySum / salaryCount) 
      : 0;

    // Reset min/max if no salaries found
    if (analytics.salaryRange.min === Infinity) {
      analytics.salaryRange.min = 0;
    }
    if (analytics.salaryRange.max === -Infinity) {
      analytics.salaryRange.max = 0;
    }

    // Top companies
    analytics.topCompanies = Array.from(companiesMap.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    logger.info('Saved jobs analytics calculated', { userId });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    logger.error('Error calculating saved jobs analytics', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error calculating analytics'
    });
  }
};

/**
 * GET /api/jobs/recommendations/personalized
 * Get personalized job recommendations
 * @access Private
 */
export const getPersonalizedRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    logger.info('Getting personalized recommendations', { userId, limit });

    const recommendations = await recommendationService.getPersonalizedRecommendations(userId, limit);

    logger.info('Personalized recommendations retrieved', { 
      userId, 
      count: recommendations.length 
    });

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      },
      message: 'Personalized recommendations retrieved successfully'
    });
  } catch (error: any) {
    logger.error('Error getting personalized recommendations', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error retrieving recommendations'
    });
  }
};

/**
 * GET /api/jobs/recommendations/daily
 * Get daily top picks
 * @access Private
 */
export const getDailyRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    logger.info('Getting daily recommendations', { userId });

    const recommendations = await recommendationService.getDailyRecommendations(userId);

    logger.info('Daily recommendations retrieved', { 
      userId, 
      count: recommendations.length 
    });

    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        date: new Date().toISOString().split('T')[0]
      },
      message: 'Daily recommendations retrieved successfully'
    });
  } catch (error: any) {
    logger.error('Error getting daily recommendations', {
      userId: req.user?.userId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error retrieving daily recommendations'
    });
  }
};

/**
 * GET /api/jobs/:id/match-score
 * Get match score for a specific job
 * @access Private
 */
export const getJobMatchScore = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    logger.info('Calculating job match score', { userId, jobId });

    const match = await recommendationService.getJobMatchBreakdown(userId, jobId);

    logger.info('Job match score calculated', { userId, jobId });

    res.json({
      success: true,
      data: {
        jobId,
        matchScore: match.matchScore,
        matchReasons: match.matchReasons
      },
      message: 'Match score calculated successfully'
    });
  } catch (error: any) {
    logger.error('Error calculating job match score', {
      userId: req.user?.userId,
      jobId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error calculating match score'
    });
  }
};

/**
 * GET /api/jobs/:id/match-breakdown
 * Get detailed match breakdown for a specific job
 * @access Private
 */
export const getJobMatchBreakdown = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const jobId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    logger.info('Getting job match breakdown', { userId, jobId });

    const match = await recommendationService.getJobMatchBreakdown(userId, jobId);

    logger.info('Job match breakdown retrieved', { userId, jobId });

    res.json({
      success: true,
      data: match,
      message: 'Match breakdown retrieved successfully'
    });
  } catch (error: any) {
    logger.error('Error getting job match breakdown', {
      userId: req.user?.userId,
      jobId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error retrieving match breakdown'
    });
  }
};

/**
 * GET /api/jobs/:id/similar
 * Get similar jobs
 * @access Public
 */
export const getSimilarJobs = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    logger.info('Getting similar jobs', { jobId, limit });

    const similarJobs = await recommendationService.getSimilarJobs(jobId, limit);

    logger.info('Similar jobs retrieved', { jobId, count: similarJobs.length });

    res.json({
      success: true,
      data: {
        jobs: similarJobs,
        count: similarJobs.length
      },
      message: 'Similar jobs retrieved successfully'
    });
  } catch (error: any) {
    logger.error('Error getting similar jobs', {
      jobId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Error retrieving similar jobs'
    });
  }
};
/**
 * GET /api/jobs/university
 * Get jobs specifically for university students (Handshake, LinkedIn internships, entry-level)
 */
export const getUniversityJobs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      keywords,
      location,
      employmentType,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build match query for university-relevant jobs
    const matchQuery: any = {
      isActive: true,
      $or: [
        // Handshake jobs (all are university-focused)
        { source: { $in: ['HANDSHAKE', 'HANDSHAKE-MOCK'] } },
        
        // LinkedIn/other sources: internships and entry-level
        {
          $and: [
            { source: { $in: ['LINKEDIN', 'LINKEDIN-MOCK', 'REMOTEOK', 'USAJOBS', 'ARBEITNOW', 'CAREERJET', 'JOOBLE'] } },
            {
              $or: [
                { employmentType: 'INTERNSHIP' },
                { experienceLevel: 'ENTRY' },
                { title: { $regex: /intern|internship|entry level|new grad|graduate|junior/i } },
                { isCampusExclusive: true },
              ],
            },
          ],
        },
      ],
    };

    // Add additional filters
    if (keywords) {
      matchQuery.$text = { $search: keywords as string };
    }

    if (location) {
      matchQuery.location = { $regex: location as string, $options: 'i' };
    }

    if (employmentType) {
      matchQuery.employmentType = (employmentType as string).toUpperCase();
    }

    // Execute query with pagination
    const [jobs, total] = await Promise.all([
      Job.find(matchQuery)
        .sort({ postedDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Job.countDocuments(matchQuery),
    ]);

    // Calculate source breakdown stats
    const sourceBreakdown = await Job.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);

    const stats = {
      total,
      handshake: 0,
      linkedin: 0,
      other: 0,
    };

    sourceBreakdown.forEach((item: any) => {
      if (item._id.includes('HANDSHAKE')) {
        stats.handshake += item.count;
      } else if (item._id.includes('LINKEDIN')) {
        stats.linkedin += item.count;
      } else {
        stats.other += item.count;
      }
    });

    logger.info('University jobs retrieved', {
      total: jobs.length,
      page: pageNum,
      stats,
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        stats,
      },
    });
  } catch (error: any) {
    logger.error('Error getting university jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching university jobs',
    });
  }
};
