/**
 * Work Posting Routes
 * 
 * This file defines all API routes for work/job postings.
 * Owners can create and manage postings, workers can view and apply.
 */

const express = require('express');
const router = express.Router();
const WorkPosting = require('../models/WorkPosting');
const Worker = require('../models/Worker');
const Owner = require('../models/Owner');

// Import middleware
const { auth, requireRole } = require('../middleware/auth');
const { sendSuccess, sendError, sendValidationError, sendNotFoundError, asyncHandler } = require('../middleware/errorHandler');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate vehicle type
 */
const validateVehicleType = (vehicleType) => {
    return ['bus', 'lorry', 'tempo', 'van', 'truck'].includes(vehicleType);
};

/**
 * Validate worker type
 */
const validateWorkerType = (workerType) => {
    return ['driver', 'helper', 'loader'].includes(workerType);
};

/**
 * Validate duration
 */
const validateDuration = (duration) => {
    return ['Full Time', 'Part Time', 'Temporary', 'Project Basis'].includes(duration);
};

/**
 * Check if user is verified
 */
const isVerified = async (userId, userType) => {
    const Model = userType === 'owner' ? Owner : Worker;
    const user = await Model.findById(userId);
    return user && user.verificationStatus === 'approved';
};

// ============================================
// PUBLIC ROUTES (No authentication required for viewing)
// ============================================

// ============================================
// ROUTE: Get All Work Postings
// METHOD: GET /api/works
// ============================================

/**
 * Get all active work postings
 * Query params: ?workerType=driver&location=Mumbai&vehicleType=truck
 */
router.get('/', asyncHandler(async (req, res) => {
    const { workerType, location, vehicleType, search, page = 1, limit = 20 } = req.query;
    
    let postings;
    let query = { status: 'active' };

    if (workerType) {
        query.workerType = workerType;
    }

    if (location) {
        query.location = { $regex: location, $options: 'i' };
    }

    if (vehicleType) {
        query.vehicleType = vehicleType;
    }

    if (search) {
        query.$or = [
            { location: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { ownerName: { $regex: search, $options: 'i' } }
        ];
    }

    postings = await WorkPosting.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await WorkPosting.countDocuments(query);

    sendSuccess(res, 200, 'Work postings retrieved', {
        count: postings.length,
        postings: postings.map(post => post.getPublicData()),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ============================================
// ROUTE: Get Recent Work Postings
// METHOD: GET /api/works/recent
// ============================================

/**
 * Get recent work postings (for homepage)
 * Query params: ?limit=10
 */
router.get('/recent', asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    
    const postings = await WorkPosting.findRecent(parseInt(limit));

    sendSuccess(res, 200, 'Recent postings', {
        count: postings.length,
        postings: postings.map(post => post.getPublicData())
    });
}));

// ============================================
// ROUTE: Get Single Work Posting
// METHOD: GET /api/works/:id
// ============================================

/**
 * Get details of a specific work posting
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    // Check if user has applied (if authenticated)
    let hasApplied = false;
    let applicantStatus = null;

    sendSuccess(res, 200, 'Work posting retrieved', {
        posting: posting.getPublicData(),
        hasApplied: hasApplied,
        applicantStatus: applicantStatus
    });
}));

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// ============================================
// ROUTE: Create Work Posting
// METHOD: POST /api/works
// ============================================

/**
 * Create a new work posting (Owner only, must be verified)
 * Expected body: { vehicleType, workerType, location, duration, description, salary, startDate }
 */
router.post('/', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const { 
        vehicleType, 
        workerType, 
        location, 
        duration, 
        description,
        salary,
        startDate 
    } = req.body;

    // Validation
    const errors = {};
    if (!vehicleType) {
        errors.vehicleType = 'Vehicle type is required';
    } else if (!validateVehicleType(vehicleType)) {
        errors.vehicleType = 'Invalid vehicle type';
    }

    if (!workerType) {
        errors.workerType = 'Worker type is required';
    } else if (!validateWorkerType(workerType)) {
        errors.workerType = 'Invalid worker type';
    }

    if (!location || location.trim() === '') {
        errors.location = 'Location is required';
    }

    if (!duration) {
        errors.duration = 'Duration is required';
    } else if (!validateDuration(duration)) {
        errors.duration = 'Invalid duration';
    }

    if (!description || description.trim() === '') {
        errors.description = 'Description is required';
    } else if (description.length < 20) {
        errors.description = 'Description must be at least 20 characters';
    } else if (description.length > 1000) {
        errors.description = 'Description cannot exceed 1000 characters';
    }

    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, 'Please fill all required fields correctly', errors);
    }

    // Check if owner is verified
    const owner = await Owner.findById(req.userId);
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    if (owner.verificationStatus !== 'approved') {
        return sendError(res, 403, 'Not verified', 'You must be verified to post work. Please upload your documents for verification.');
    }

    // Create new work posting
    const workPosting = new WorkPosting({
        ownerId: owner._id,
        ownerName: owner.name,
        ownerPhone: owner.phone,
        ownerCity: owner.city,
        vehicleType,
        workerType,
        location,
        duration,
        description,
        salary: salary || 'Negotiable',
        startDate: startDate || null,
        applicants: [],
        status: 'active'
    });

    await workPosting.save();

    sendSuccess(res, 201, 'Work posting created successfully', {
        posting: workPosting.getPublicData()
    });
}));

// ============================================
// WORKER ROUTES (Authentication required)
// ============================================

// ============================================
// ROUTE: Get Available Work for Worker
// METHOD: GET /api/works/available
// ============================================

/**
 * Get work postings that worker hasn't applied to yet
 * Query params: ?workerType=driver&location=Mumbai
 */
router.get('/available', auth, requireRole(['worker']), asyncHandler(async (req, res) => {
    const { workerType, location, page = 1, limit = 20 } = req.query;

    // Check if worker is verified
    const worker = await Worker.findById(req.userId);
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    if (worker.verificationStatus !== 'approved') {
        return sendError(res, 403, 'Not verified', 'You must be verified to apply for work');
    }

    let query = {
        status: 'active',
        'applicants.workerId': { $ne: req.userId }
    };

    // Filter by worker's type if not specified
    const typeToSearch = workerType || worker.workType;
    if (typeToSearch) {
        query.workerType = typeToSearch;
    }

    if (location) {
        query.location = { $regex: location, $options: 'i' };
    }

    const postings = await WorkPosting.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await WorkPosting.countDocuments(query);

    sendSuccess(res, 200, 'Available work postings', {
        count: postings.length,
        postings: postings.map(post => post.getPublicData()),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ============================================
// ROUTE: Get Work Applied by Worker
// METHOD: GET /api/works/applied
// ============================================

/**
 * Get work postings that worker has applied to
 */
router.get('/applied', auth, requireRole(['worker']), asyncHandler(async (req, res) => {
    const postings = await WorkPosting.findAppliedByWorker(req.userId);

    // Add applicant's status to each posting
    const postingsWithStatus = postings.map(post => {
        const postData = post.getPublicData();
        const applicant = post.getApplicant(req.userId);
        postData.myApplicationStatus = applicant ? applicant.status : 'pending';
        return postData;
    });

    sendSuccess(res, 200, 'Applied work postings', {
        count: postingsWithStatus.length,
        postings: postingsWithStatus
    });
}));

// ============================================
// ROUTE: Apply for Work
// METHOD: POST /api/works/:id/apply
// ============================================

/**
 * Worker applies for a work posting
 */
router.post('/:id/apply', auth, requireRole(['worker']), asyncHandler(async (req, res) => {
    const postingId = req.params.id;

    // Check if worker is verified
    const worker = await Worker.findById(req.userId);
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    if (worker.verificationStatus !== 'approved') {
        return sendError(res, 403, 'Not verified', 'You must be verified to apply for work');
    }

    // Find the work posting
    const posting = await WorkPosting.findById(postingId);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    // Check if posting is still active
    if (posting.status !== 'active') {
        return sendError(res, 400, 'Posting closed', 'This work posting is no longer accepting applications');
    }

    // Check if worker has already applied
    if (posting.hasApplied(req.userId)) {
        return sendError(res, 409, 'Already applied', 'You have already applied for this work');
    }

    // Add worker to applicants
    await posting.addApplicant(worker);

    sendSuccess(res, 200, 'Application submitted successfully! The owner will contact you.', {
        postingId: posting._id,
        ownerPhone: posting.ownerPhone,
        applicantStatus: 'pending'
    });
}));

// ============================================
// ROUTE: Withdraw Application
// METHOD: DELETE /api/works/:id/apply
// ============================================

/**
 * Worker withdraws their application
 */
router.delete('/:id/apply', auth, requireRole(['worker']), asyncHandler(async (req, res) => {
    const postingId = req.params.id;

    const posting = await WorkPosting.findById(postingId);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    // Check if worker has applied
    if (!posting.hasApplied(req.userId)) {
        return sendError(res, 400, 'Not applied', 'You have not applied for this work');
    }

    // Check if already accepted
    const applicant = posting.getApplicant(req.userId);
    if (applicant && applicant.status === 'accepted') {
        return sendError(res, 400, 'Cannot withdraw', 'Cannot withdraw an accepted application. Please contact the owner.');
    }

    await posting.removeApplicant(req.userId);

    sendSuccess(res, 200, 'Application withdrawn successfully');
}));

// ============================================
// OWNER ROUTES (Authentication required)
// ============================================

// ============================================
// ROUTE: Get My Work Postings
// METHOD: GET /api/works/my-postings
// ============================================

/**
 * Get all work postings by the current owner
 * Query params: ?status=active&page=1
 */
router.get('/my-postings', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { ownerId: req.userId };
    if (status) {
        query.status = status;
    }

    const postings = await WorkPosting.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const postingsWithApplicants = postings.map(post => post.getDataWithApplicants());

    const total = await WorkPosting.countDocuments(query);

    sendSuccess(res, 200, 'Your work postings', {
        count: postingsWithApplicants.length,
        postings: postingsWithApplicants,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ============================================
// ROUTE: Get Applicants for a Posting
// METHOD: GET /api/works/:id/applicants
// ============================================

/**
 * Get all applicants for a specific work posting (owner only)
 */
router.get('/:id/applicants', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    // Verify owner owns this posting
    if (posting.ownerId.toString() !== req.userId) {
        return sendError(res, 403, 'Access denied', 'You can only view applicants for your own postings');
    }

    const applicantDetails = posting.applicants.map(a => ({
        workerId: a.workerId,
        workerName: a.workerName,
        workerPhone: a.workerPhone,
        workerWorkType: a.workerWorkType,
        appliedAt: a.appliedAt,
        status: a.status,
        notes: a.notes
    }));

    // Group by status
    const grouped = {
        pending: applicantDetails.filter(a => a.status === 'pending'),
        accepted: applicantDetails.filter(a => a.status === 'accepted'),
        rejected: applicantDetails.filter(a => a.status === 'rejected')
    };

    sendSuccess(res, 200, 'Applicants retrieved', {
        postingId: posting._id,
        totalApplicants: applicantDetails.length,
        applicants: applicantDetails,
        grouped: grouped
    });
}));

// ============================================
// ROUTE: Update Applicant Status
// METHOD: PUT /api/works/:id/applicants/:workerId
// ============================================

/**
 * Owner accepts or rejects an applicant
 * Expected body: { status: 'accepted' | 'rejected', notes }
 */
router.put('/:id/applicants/:workerId', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const { id: postingId, workerId } = req.params;

    if (!['accepted', 'rejected'].includes(status)) {
        return sendValidationError(res, 'Status must be accepted or rejected');
    }

    const posting = await WorkPosting.findById(postingId);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    // Verify owner owns this posting
    if (posting.ownerId.toString() !== req.userId) {
        return sendError(res, 403, 'Access denied', 'You can only manage applicants for your own postings');
    }

    // Check if applicant exists
    const applicant = posting.getApplicant(workerId);
    if (!applicant) {
        return sendNotFoundError(res, 'Applicant');
    }

    await posting.updateApplicantStatus(workerId, status, notes || '');

    sendSuccess(res, 200, `Applicant ${status} successfully`, {
        workerId: workerId,
        status: status,
        notes: notes || ''
    });
}));

// ============================================
// ROUTE: Close Work Posting
// METHOD: PUT /api/works/:id/close
// ============================================

/**
 * Close a work posting (no more applications)
 */
router.put('/:id/close', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    if (posting.ownerId.toString() !== req.userId) {
        return sendError(res, 403, 'Access denied', 'You can only close your own postings');
    }

    posting.status = 'closed';
    await posting.save();

    sendSuccess(res, 200, 'Work posting closed successfully', {
        posting: posting.getPublicData()
    });
}));

// ============================================
// ROUTE: Reopen Work Posting
// METHOD: PUT /api/works/:id/reopen
// ============================================

/**
 * Reopen a closed work posting
 */
router.put('/:id/reopen', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    if (posting.ownerId.toString() !== req.userId) {
        return sendError(res, 403, 'Access denied', 'You can only reopen your own postings');
    }

    posting.status = 'active';
    await posting.save();

    sendSuccess(res, 200, 'Work posting reopened successfully', {
        posting: posting.getPublicData()
    });
}));

// ============================================
// ROUTE: Update Work Posting
// METHOD: PUT /api/works/:id
// ============================================

/**
 * Update a work posting (only if no accepted applicants)
 */
router.put('/:id', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const { location, duration, description, salary, startDate } = req.body;

    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    if (posting.ownerId.toString() !== req.userId) {
        return sendError(res, 403, 'Access denied', 'You can only update your own postings');
    }

    // Check if posting has accepted applicants
    const hasAccepted = posting.applicants.some(a => a.status === 'accepted');
    if (hasAccepted) {
        return sendError(res, 400, 'Cannot update', 'Cannot update posting with accepted applicants');
    }

    const updateData = {};
    if (location) updateData.location = location;
    if (duration) updateData.duration = duration;
    if (description) updateData.description = description;
    if (salary !== undefined) updateData.salary = salary;
    if (startDate !== undefined) updateData.startDate = startDate;

    const updatedPosting = await WorkPosting.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    sendSuccess(res, 200, 'Work posting updated successfully', {
        posting: updatedPosting.getPublicData()
    });
}));

// ============================================
// ROUTE: Delete Work Posting
// METHOD: DELETE /api/works/:id
// ============================================

/**
 * Delete a work posting (only if no accepted applicants)
 */
router.delete('/:id', auth, requireRole(['owner']), asyncHandler(async (req, res) => {
    const posting = await WorkPosting.findById(req.params.id);
    
    if (!posting) {
        return sendNotFoundError(res, 'Work posting');
    }

    if (posting.ownerId.toString() !== req.userId) {
        return sendError(res, 403, 'Access denied', 'You can only delete your own postings');
    }

    // Check if posting has accepted applicants
    const hasAccepted = posting.applicants.some(a => a.status === 'accepted');
    if (hasAccepted) {
        return sendError(res, 400, 'Cannot delete', 'Cannot delete posting with accepted applicants. Please close it instead.');
    }

    await WorkPosting.findByIdAndDelete(req.params.id);

    sendSuccess(res, 200, 'Work posting deleted successfully');
}));

// Export router
module.exports = router;
