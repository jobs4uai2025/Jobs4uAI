import express from 'express';
import * as jobController from '../controllers/jobController';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// ==================== ROUTE ORDER: SPECIFIC BEFORE PARAMETERIZED ====================

// ==================== SPECIFIC ROUTES FIRST ====================

/**
 * @route   GET /api/jobs/search
 * @desc    Search jobs with filters
 * @access  Public
 */
router.get('/search', jobController.searchJobs);

/**
 * @route   GET /api/jobs/bookmarked/list
 * @desc    Get user's bookmarked jobs
 * @access  Private
 */
router.get('/bookmarked/list', authenticateToken, jobController.getBookmarkedJobs);

/**
 * @route   GET /api/jobs/system/refresh-stats
 * @desc    Get job refresh statistics
 * @access  Public
 */
router.get('/system/refresh-stats', jobController.getRefreshStats);

/**
 * @route   GET /api/jobs/system/cleanup-stats
 * @desc    Get cleanup statistics
 * @access  Public
 */
router.get('/system/cleanup-stats', jobController.getCleanupStats);

/**
 * @route   GET /api/jobs/stats
 * @desc    Get job statistics
 * @access  Public
 */
router.get('/stats', jobController.getJobStats);

/**
 * @route   POST /api/jobs/system/refresh
 * @desc    Manually trigger job refresh
 * @access  Private
 */
router.post('/system/refresh', authenticateToken, jobController.triggerManualRefresh);

/**
 * @route   POST /api/jobs/system/cleanup
 * @desc    Manually trigger cleanup
 * @access  Private
 */
router.post('/system/cleanup', authenticateToken, jobController.triggerCleanup);

/**
 * @route   POST /api/jobs/aggregate
 * @desc    Manually trigger job aggregation
 * @access  Private
 */
router.post('/aggregate', authenticateToken, jobController.triggerJobAggregation);

/**
 * @route   GET /api/jobs/university
 * @desc    Get jobs for university students (internships, entry-level)
 * @access  Public
 */
router.get('/university', jobController.getUniversityJobs);

/**
 * @route   GET /api/jobs/recommendations/personalized
 * @desc    Get personalized job recommendations
 * @access  Private
 */
router.get('/recommendations/personalized', authenticateToken, jobController.getPersonalizedRecommendations);

/**
 * @route   GET /api/jobs/recommendations/daily
 * @desc    Get daily top picks
 * @access  Private
 */
router.get('/recommendations/daily', authenticateToken, jobController.getDailyRecommendations);

/**
 * @route   GET /api/jobs/saved/organized
 * @desc    Get saved jobs organized by status
 * @access  Private
 */
router.get('/saved/organized', authenticateToken, jobController.getOrganizedSavedJobs);

/**
 * @route   GET /api/jobs/saved/analytics
 * @desc    Get analytics on saved jobs
 * @access  Private
 */
router.get('/saved/analytics', authenticateToken, jobController.getSavedJobsAnalytics);

/**
 * @route   POST /api/jobs/saved/bulk-remove
 * @desc    Remove multiple saved jobs at once
 * @access  Private
 */
router.post('/saved/bulk-remove', authenticateToken, jobController.bulkRemoveSavedJobs);

// ==================== PARAMETERIZED ROUTES (MUST COME LAST) ====================

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Public
 */
router.get('/:id', jobController.getJobById);

/**
 * @route   POST /api/jobs/:id/bookmark
 * @desc    Bookmark or unbookmark a job (toggle)
 * @access  Private
 */
router.post('/:id/bookmark', authenticateToken, jobController.bookmarkJob);

/**
 * @route   POST /api/jobs/:id/analyze-visa
 * @desc    Analyze visa sponsorship for a specific job
 * @access  Public
 */
router.post('/:id/analyze-visa', jobController.analyzeJobVisa);

/**
 * @route   GET /api/jobs/:id/match-score
 * @desc    Get match score for a specific job
 * @access  Private
 */
router.get('/:id/match-score', authenticateToken, jobController.getJobMatchScore);

/**
 * @route   GET /api/jobs/:id/match-breakdown
 * @desc    Get detailed match breakdown for a specific job
 * @access  Private
 */
router.get('/:id/match-breakdown', authenticateToken, jobController.getJobMatchBreakdown);

/**
 * @route   GET /api/jobs/:id/similar
 * @desc    Get similar jobs
 * @access  Public
 */
router.get('/:id/similar', jobController.getSimilarJobs);

export default router;