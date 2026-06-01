/**
 * Admin Routes
 * 
 * This file defines admin-level API routes for:
 * - Worker verification (approve/reject)
 * - Owner verification (approve/reject)
 * - User management
 * - Platform statistics
 * 
 * Note: In production, add proper admin authentication middleware
 */

const express = require('express');
const router = express.Router();

// Import models
const Owner = require('../models/Owner');
const Worker = require('../models/Worker');
const WorkPosting = require('../models/WorkPosting');
const Review = require('../models/Review');

// Import middleware
const { auth, requireRole } = require('../middleware/auth');
const { sendSuccess, sendError, sendValidationError, sendNotFoundError, asyncHandler } = require('../middleware/errorHandler');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verify user owns the posting
 */
const isPostingOwner = async (postingId, userId) => {
    const posting = await WorkPosting.findById(postingId);
    return posting && posting.ownerId.toString() === userId.toString();
};

// ============================================
// ADMIN MIDDLEWARE (Placeholder - add real admin auth in production)
// ============================================

// In production, create proper admin middleware:
// const adminAuth = require('./middleware/adminAuth');

// For now, we'll use a simple check - in production, use proper JWT-based admin auth
const adminAuth = async (req, res, next) => {
    // Skip for demo - in production, verify admin role from JWT
    // req.userRole should be 'admin'
    next();
};

// ============================================
// WORKER VERIFICATION ROUTES
// ============================================

// ============================================
// ROUTE: Get All Pending Workers
// METHOD: GET /api/admin/workers/pending
// ============================================

/**
 * Get all workers pending verification
 */
router.get('/workers/pending', adminAuth, asyncHandler(async (req, res) => {
    const workers = await Worker.find({ verificationStatus: 'pending' })
        .select('-password')
        .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'Pending workers retrieved', {
        count: workers.length,
        workers: workers.map(w => w.getPublicProfile())
    });
}));

// ============================================
// ROUTE: Get All Workers
// METHOD: GET /api/admin/workers
// ============================================

/**
 * Get all workers with filters
 */
router.get('/workers', adminAuth, asyncHandler(async (req, res) => {
    const { status, workType, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status) {
        query.verificationStatus = status;
    }
    
    if (workType) {
        query.workType = workType;
    }

    const workers = await Worker.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Worker.countDocuments(query);

    sendSuccess(res, 200, 'Workers retrieved', {
        count: workers.length,
        workers: workers.map(w => w.getPublicProfile()),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ============================================
// ROUTE: Approve Worker
// METHOD: PUT /api/admin/workers/:id/approve
// ============================================

/**
 * Approve a worker's verification
 */
router.put('/workers/:id/approve', adminAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const worker = await Worker.findById(id);
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    if (worker.verificationStatus === 'approved') {
        return sendError(res, 400, 'Already approved', 'Worker is already verified');
    }

    worker.verificationStatus = 'approved';
    worker.verificationNotes = notes || 'Approved by admin';
    
    await worker.save();

    sendSuccess(res, 200, 'Worker approved successfully', {
        worker: worker.getPublicProfile()
    });
}));

// ============================================
// ROUTE: Reject Worker
// METHOD: PUT /api/admin/workers/:id/reject
// ============================================

/**
 * Reject a worker's verification
 */
router.put('/workers/:id/reject', adminAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
        return sendValidationError(res, 'Rejection reason is required');
    }

    const worker = await Worker.findById(id);
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    if (worker.verificationStatus === 'rejected') {
        return sendError(res, 400, 'Already rejected', 'Worker is already rejected');
    }

    worker.verificationStatus = 'rejected';
    worker.verificationNotes = notes;
    
    await worker.save();

    sendSuccess(res, 200, 'Worker rejected', {
        worker: worker.getPublicProfile()
    });
}));

// ============================================
// ROUTE: Get Worker Details (for verification review)
// METHOD: GET /api/admin/workers/:id
// ============================================

/**
 * Get full worker details for admin review
 */
router.get('/workers/:id', adminAuth, asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.params.id).select('-password');
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    sendSuccess(res, 200, 'Worker details retrieved', {
        worker: worker.getFullProfile()
    });
}));

// ============================================
// OWNER VERIFICATION ROUTES
// ============================================

// ============================================
// ROUTE: Get All Pending Owners
// METHOD: GET /api/admin/owners/pending
// ============================================

/**
 * Get all owners pending verification
 */
router.get('/owners/pending', adminAuth, asyncHandler(async (req, res) => {
    const owners = await Owner.find({ verificationStatus: 'pending' })
        .select('-password')
        .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'Pending owners retrieved', {
        count: owners.length,
        owners: owners.map(o => o.getPublicProfile())
    });
}));

// ============================================
// ROUTE: Get All Owners
// METHOD: GET /api/admin/owners
// ============================================

/**
 * Get all owners with filters
 */
router.get('/owners', adminAuth, asyncHandler(async (req, res) => {
    const { status, city, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status) {
        query.verificationStatus = status;
    }
    
    if (city) {
        query.city = { $regex: city, $options: 'i' };
    }

    const owners = await Owner.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Owner.countDocuments(query);

    sendSuccess(res, 200, 'Owners retrieved', {
        count: owners.length,
        owners: owners.map(o => o.getPublicProfile()),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ============================================
// ROUTE: Approve Owner
// METHOD: PUT /api/admin/owners/:id/approve
// ============================================

/**
 * Approve an owner's verification
 */
router.put('/owners/:id/approve', adminAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    const owner = await Owner.findById(id);
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    if (owner.verificationStatus === 'approved') {
        return sendError(res, 400, 'Already approved', 'Owner is already verified');
    }

    owner.verificationStatus = 'approved';
    owner.verificationNotes = notes || 'Approved by admin';
    
    await owner.save();

    sendSuccess(res, 200, 'Owner approved successfully', {
        owner: owner.getPublicProfile()
    });
}));

// ============================================
// ROUTE: Reject Owner
// METHOD: PUT /api/admin/owners/:id/reject
// ============================================

/**
 * Reject an owner's verification
 */
router.put('/owners/:id/reject', adminAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
        return sendValidationError(res, 'Rejection reason is required');
    }

    const owner = await Owner.findById(id);
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    if (owner.verificationStatus === 'rejected') {
        return sendError(res, 400, 'Already rejected', 'Owner is already rejected');
    }

    owner.verificationStatus = 'rejected';
    owner.verificationNotes = notes;
    
    await owner.save();

    sendSuccess(res, 200, 'Owner rejected', {
        owner: owner.getPublicProfile()
    });
}));

// ============================================
// ROUTE: Get Owner Details (for verification review)
// METHOD: GET /api/admin/owners/:id
// ============================================

/**
 * Get full owner details for admin review
 */
router.get('/owners/:id', adminAuth, asyncHandler(async (req, res) => {
    const owner = await Owner.findById(req.params.id).select('-password');
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    sendSuccess(res, 200, 'Owner details retrieved', {
        owner: owner.getFullProfile()
    });
}));

// ============================================
// STATISTICS ROUTES
// ============================================
// ============================================
// ROUTE: Get Platform Statistics
// METHOD: GET /api/admin/stats
// ============================================

/**
 * Get platform statistics
 */
router.get('/stats', adminAuth, asyncHandler(async (req, res) => {
    const [
        totalOwners,
        verifiedOwners,
        pendingOwners,
        rejectedOwners,
        totalWorkers,
        verifiedWorkers,
        pendingWorkers,
        rejectedWorkers,
        totalWorkPostings,
        activePostings,
        totalReviews
    ] = await Promise.all([
        Owner.countDocuments(),
        Owner.countDocuments({ verificationStatus: 'approved' }),
        Owner.countDocuments({ verificationStatus: 'pending' }),
        Owner.countDocuments({ verificationStatus: 'rejected' }),
        Worker.countDocuments(),
        Worker.countDocuments({ verificationStatus: 'approved' }),
        Worker.countDocuments({ verificationStatus: 'pending' }),
        Worker.countDocuments({ verificationStatus: 'rejected' }),
        WorkPosting.countDocuments(),
        WorkPosting.countDocuments({ status: 'active' }),
        Review.countDocuments()
    ]);

    sendSuccess(res, 200, 'Platform statistics', {
        owners: {
            total: totalOwners,
            verified: verifiedOwners,
            pending: pendingOwners,
            rejected: rejectedOwners
        },
        workers: {
            total: totalWorkers,
            verified: verifiedWorkers,
            pending: pendingWorkers,
            rejected: rejectedWorkers
        },
        workPostings: {
            total: totalWorkPostings,
            active: activePostings
        },
        reviews: {
            total: totalReviews
        }
    });
}));

// ============================================
// ROUTE: Get Work Posting by ID (for admin review)
// METHOD: GET /api/admin/works/:id
// ============================================

/**
 * Get work posting details for admin
 */
router.get('/works/:id', adminAuth, asyncHandler(async (req, res) => {
    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    sendSuccess(res, 200, 'Work posting retrieved', {
        posting: posting.getDataWithApplicants()
    });
}));

module.exports = router;
