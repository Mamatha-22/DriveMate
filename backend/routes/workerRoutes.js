/**
 * Worker Routes
 * 
 * This file defines all API routes for worker operations.
 * Routes handle worker registration, login, profile management, and verification.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Worker = require('../models/Worker');
const Review = require('../models/Review');

// Import middleware
const { auth, generateToken } = require('../middleware/auth');
const { sendSuccess, sendError, sendValidationError, sendNotFoundError, asyncHandler } = require('../middleware/errorHandler');

// Import upload config
const { profileUpload, aadhaarUpload, drivingLicenseUpload, verificationUpload } = require('../config/upload');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate phone number format (10 digits)
 */
const validatePhone = (phone) => {
    return /^\d{10}$/.test(phone);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
    return password.length >= 6;
};

/**
 * Validate work type
 */
const validateWorkType = (workType) => {
    return ['driver', 'helper', 'loader'].includes(workType);
};

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// ============================================
// ROUTE: Register Worker
// METHOD: POST /api/workers/register
// ============================================

/**
 * Register a new worker
 * Expected body: { name, phone, password, workType, experience, location, photo }
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { name, phone, password, workType, experience, location, photo } = req.body;

    // Validation
    const errors = {};
    if (!name || name.trim() === '') {
        errors.name = 'Name is required';
    }
    if (!phone) {
        errors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
        errors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!password) {
        errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
        errors.password = 'Password must be at least 6 characters';
    }
    if (!workType) {
        errors.workType = 'Work type is required';
    } else if (!validateWorkType(workType)) {
        errors.workType = 'Invalid work type';
    }
    if (!experience && experience !== 0) {
        errors.experience = 'Experience is required';
    } else if (isNaN(experience) || experience < 0 || experience > 50) {
        errors.experience = 'Please enter valid experience (0-50 years)';
    }
    if (!location || location.trim() === '') {
        errors.location = 'Location is required';
    }

    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, 'Please fill all required fields correctly', errors);
    }

    // Check if phone number already exists
    const existingWorker = await Worker.findByPhone(phone);
    if (existingWorker) {
        return sendError(res, 409, 'Phone already registered', 'This phone number is already used by another worker');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new worker document
    const worker = new Worker({
        name,
        phone,
        password: hashedPassword,
        workType,
        experience: parseInt(experience),
        location,
        photo: photo || null,
        verificationStatus: 'pending',
        verified: false
    });

    // Save to database
    await worker.save();

    // Generate JWT token
    const token = generateToken(worker);

    // Send success response
    sendSuccess(res, 201, 'Worker registered successfully', {
        worker: worker.getPublicProfile(),
        token: token
    });
}));

// ============================================
// ROUTE: Login Worker
// METHOD: POST /api/workers/login
// ============================================

/**
 * Login worker by phone and password
 * Expected body: { phone, password }
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { phone, password } = req.body;

    // Validation
    const errors = {};
    if (!phone) {
        errors.phone = 'Phone number is required';
    }
    if (!password) {
        errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, 'Please provide login credentials', errors);
    }

    // Find worker by phone (include password for comparison)
    const worker = await Worker.findByPhoneWithPassword(phone);

    if (!worker) {
        return sendError(res, 401, 'Invalid credentials', 'No account found with this phone number');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) {
        return sendError(res, 401, 'Invalid credentials', 'Incorrect password');
    }

    // Generate JWT token
    const token = generateToken(worker);

    // Send success response
    sendSuccess(res, 200, 'Login successful', {
        worker: worker.getPublicProfile(),
        token: token
    });
}));

// ============================================
// ROUTE: Get All Workers (Public)
// METHOD: GET /api/workers
// ============================================

/**
 * Get all workers with optional filters
 * Query params: ?workType=driver&location=Mumbai&verified=true
 */
router.get('/', asyncHandler(async (req, res) => {
    const { workType, location, verified, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (workType) {
        query.workType = workType;
    }
    
    if (location) {
        query.location = { $regex: location, $options: 'i' };
    }
    
    if (verified === 'true') {
        query.verificationStatus = 'approved';
    }

    const workers = await Worker.find(query)
        .select('-password')
        .sort({ averageRating: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Worker.countDocuments(query);

    sendSuccess(res, 200, 'Workers retrieved successfully', {
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
// ROUTE: Get Top Rated Workers
// METHOD: GET /api/workers/top-rated
// ============================================

/**
 * Get top-rated workers
 * Query params: ?limit=10&workType=driver
 */
router.get('/top-rated', asyncHandler(async (req, res) => {
    const { limit = 10, workType } = req.query;
    
    let workers;
    
    if (workType) {
        workers = await Worker.findVerifiedByWorkTypeAndLocation(workType, '')
            .sort({ averageRating: -1 })
            .limit(parseInt(limit));
    } else {
        workers = await Worker.findTopRated(parseInt(limit));
    }

    sendSuccess(res, 200, 'Top rated workers', {
        count: workers.length,
        workers: workers.map(w => w.getPublicProfile())
    });
}));

// ============================================
// ROUTE: Get Single Worker Profile
// METHOD: GET /api/workers/:id
// ============================================

/**
 * Get worker profile by ID (public view)
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.params.id).select('-password');
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    // Get recent reviews
    const reviews = await Review.getRecentReviews(req.params.id, 5);

    sendSuccess(res, 200, 'Worker profile retrieved', {
        worker: worker.getFormattedProfile(),
        recentReviews: reviews.map(r => r.getFormattedData())
    });
}));

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// All routes below require authentication via JWT token

// ============================================
// ROUTE: Get My Profile
// METHOD: GET /api/workers/me
// ============================================

/**
 * Get current worker's full profile
 */
router.get('/me', auth, asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.userId);
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    sendSuccess(res, 200, 'Profile retrieved', worker.getFullProfile());
}));

// ============================================
// ROUTE: Update My Profile
// METHOD: PUT /api/workers/me
// ============================================

/**
 * Update current worker's profile
 */
router.put('/me', auth, asyncHandler(async (req, res) => {
    const { name, workType, experience, location, photo } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (workType) updateData.workType = workType;
    if (experience !== undefined) updateData.experience = parseInt(experience);
    if (location) updateData.location = location;
    if (photo !== undefined) updateData.photo = photo;

    const worker = await Worker.findByIdAndUpdate(
        req.userId,
        updateData,
        { new: true, runValidators: true }
    ).select('-password');

    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    sendSuccess(res, 200, 'Profile updated successfully', worker.getFormattedProfile());
}));

// ============================================
// ROUTE: Change Password
// METHOD: PUT /api/workers/me/password
// ============================================

/**
 * Change current worker's password
 */
router.put('/me/password', auth, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return sendValidationError(res, 'Please provide current and new password');
    }

    if (newPassword.length < 6) {
        return sendError(res, 400, 'Invalid password', 'New password must be at least 6 characters');
    }

    const worker = await Worker.findById(req.userId).select('+password');
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    const isMatch = await bcrypt.compare(currentPassword, worker.password);
    if (!isMatch) {
        return sendError(res, 401, 'Invalid password', 'Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    worker.password = await bcrypt.hash(newPassword, salt);
    
    await worker.save();

    sendSuccess(res, 200, 'Password changed successfully');
}));

// ============================================
// VERIFICATION ROUTES
// ============================================

// ============================================
// ROUTE: Upload Verification Documents
// METHOD: POST /api/workers/me/verify
// ============================================

/**
 * Upload Aadhaar, driving license, and profile photo for verification
 * Note: Drivers must upload driving license
 */
router.post('/me/verify', auth, verificationUpload, asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.userId);
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    if (worker.verificationStatus === 'approved') {
        return sendError(res, 400, 'Already verified', 'Your account is already verified');
    }

    const updateData = {
        verificationStatus: 'pending'
    };

    if (req.files) {
        if (req.files.aadhaar && req.files.aadhaar[0]) {
            updateData.aadhaarPhoto = `/uploads/aadhaar/${req.files.aadhaar[0].filename}`;
        }
        if (req.files.drivingLicense && req.files.drivingLicense[0]) {
            updateData.drivingLicense = `/uploads/driving-license/${req.files.drivingLicense[0].filename}`;
        }
        if (req.files.photo && req.files.photo[0]) {
            updateData.photo = `/uploads/profiles/${req.files.photo[0].filename}`;
        }
    }

    // Validation: Aadhaar is required for all
    if (!updateData.aadhaarPhoto && !worker.aadhaarPhoto) {
        return sendError(res, 400, 'Aadhaar required', 'Please upload your Aadhaar card for verification');
    }

    // Validation: Drivers must have driving license
    if (worker.workType === 'driver' && !updateData.drivingLicense && !worker.drivingLicense) {
        return sendError(res, 400, 'Driving license required', 'Drivers must upload their driving license');
    }

    await Worker.findByIdAndUpdate(req.userId, updateData);

    const updatedWorker = await Worker.findById(req.userId);

    sendSuccess(res, 200, 'Verification documents uploaded successfully', {
        verificationStatus: updatedWorker.verificationStatus,
        aadhaarUploaded: !!updateData.aadhaarPhoto,
        drivingLicenseUploaded: !!updateData.drivingLicense,
        documentsPending: worker.workType === 'driver' && !updateData.drivingLicense
    });
}));

// ============================================
// ROUTE: Upload Profile Photo
// METHOD: POST /api/workers/me/photo
// ============================================

/**
 * Upload/update profile photo
 */
router.post('/me/photo', auth, profileUpload.single('photo'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return sendError(res, 400, 'No file', 'Please upload a profile photo');
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    await Worker.findByIdAndUpdate(req.userId, { photo: photoUrl });

    sendSuccess(res, 200, 'Profile photo uploaded successfully', {
        photo: photoUrl
    });
}));

// ============================================
// RATING & REVIEW ROUTES
// ============================================

// ============================================
// ROUTE: Rate an Owner
// METHOD: POST /api/workers/me/reviews/:ownerId
// ============================================

/**
 * Rate and review an owner after job completion
 * Expected body: { rating, comment, workPostingId (optional) }
 */
router.post('/me/reviews/:ownerId', auth, asyncHandler(async (req, res) => {
    const { rating, comment, workPostingId } = req.body;
    const ownerId = req.params.ownerId;

    if (!rating || rating < 1 || rating > 5) {
        return sendValidationError(res, 'Please provide a valid rating (1-5)');
    }

    const worker = await Worker.findById(req.userId);
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    const Owner = require('../models/Owner');
    const owner = await Owner.findById(ownerId);
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    // Check if already reviewed
    const existingReview = await Review.findBetweenUsers(
        req.userId, 
        ownerId, 
        workPostingId || null
    );

    if (existingReview) {
        return sendError(res, 409, 'Already reviewed', 'You have already rated this owner for this work');
    }

    const review = new Review({
        workPostingId: workPostingId || null,
        reviewerId: worker._id,
        reviewerModel: 'Worker',
        reviewerName: worker.name,
        revieweeId: owner._id,
        revieweeModel: 'Owner',
        revieweeName: owner.name,
        rating: rating,
        comment: comment || '',
        workType: worker.workType
    });

    await review.save();
    await owner.updateRating(rating);

    sendSuccess(res, 201, 'Review submitted successfully', {
        review: review.getPublicData(),
        newAverageRating: owner.averageRating
    });
}));

// ============================================
// ROUTE: Get My Reviews (given by me)
// METHOD: GET /api/workers/me/reviews
// ============================================

/**
 * Get all reviews given by the current worker
 */
router.get('/me/reviews', auth, asyncHandler(async (req, res) => {
    const reviews = await Review.findByReviewer(req.userId);
    
    sendSuccess(res, 200, 'Reviews retrieved', {
        count: reviews.length,
        reviews: reviews.map(r => r.getPublicData())
    });
}));

// ============================================
// ROUTE: Get Reviews Received
// METHOD: GET /api/workers/me/reviews/received
// ============================================

/**
 * Get all reviews received by the current worker
 */
router.get('/me/reviews/received', auth, asyncHandler(async (req, res) => {
    const worker = await Worker.findById(req.userId);
    
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    const reviews = await Review.findByReviewee(req.userId);
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        distribution[r.rating]++;
    });

    sendSuccess(res, 200, 'Reviews retrieved', {
        averageRating: worker.averageRating,
        totalReviews: worker.totalReviews,
        distribution: distribution,
        reviews: reviews.map(r => r.getFormattedData())
    });
}));

// Export router
module.exports = router;
