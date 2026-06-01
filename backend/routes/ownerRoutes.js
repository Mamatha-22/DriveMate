/**
 * Owner Routes
 * 
 * This file defines all API routes for vehicle owner operations.
 * Routes handle owner registration, login, profile management, and verification.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Owner = require('../models/Owner');
const Review = require('../models/Review');

// Import middleware and services
const authService = require('../services/authService');
const { auth, generateToken, requireRole } = require('../middleware/auth');
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

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// ============================================
// ROUTE: Register Owner
// METHOD: POST /api/owners/register
// ============================================

/**
 * Register a new vehicle owner
 * Expected body: { name, phone, password, city, photo }
 */
router.post('/register', asyncHandler(async (req, res) => {
    // Extract data from request body
    const { name, phone, password, city, photo } = req.body;

    // Validation: Check if all required fields are present
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
    if (!city || city.trim() === '') {
        errors.city = 'City is required';
    }

    if (Object.keys(errors).length > 0) {
        return sendValidationError(res, 'Please fill all required fields correctly', errors);
    }

    // Check if phone number already exists
    const existingOwner = await Owner.findByPhone(phone);
    if (existingOwner) {
        return sendError(res, 409, 'Phone already registered', 'This phone number is already used by another owner');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new owner document
    const owner = new Owner({
        name,
        phone,
        password: hashedPassword,
        city,
        photo: photo || null,
        verificationStatus: 'pending',
        verified: false
    });

    // Save to database
    await owner.save();

    // Generate tokens using authService
    const { accessToken, refreshToken } = await authService.loginUser(owner, 'Owner');

    // Send success response
    sendSuccess(res, 201, 'Owner registered successfully', {
        owner: owner.getPublicProfile(),
        token: accessToken,
        refreshToken: refreshToken
    });
}));

// ============================================
// ROUTE: Login Owner
// METHOD: POST /api/owners/login
// ============================================

/**
 * Login owner by phone and password
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

    // Find owner by phone (include password for comparison)
    const owner = await Owner.findByPhoneWithPassword(phone);

    if (!owner) {
        return sendError(res, 401, 'Invalid credentials', 'No account found with this phone number');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
        return sendError(res, 401, 'Invalid credentials', 'Incorrect password');
    }

    // Generate tokens using authService
    const { accessToken, refreshToken } = await authService.loginUser(owner, 'Owner');

    // Send success response
    sendSuccess(res, 200, 'Login successful', {
        owner: owner.getPublicProfile(),
        token: accessToken,
        refreshToken: refreshToken
    });
}));

// ============================================
// ROUTE: Get All Owners (Public - for browsing)
// METHOD: GET /api/owners
// ============================================

/**
 * Get all verified owners with optional filters
 * Query params: ?city=Mumbai&verified=true
 */
router.get('/', asyncHandler(async (req, res) => {
    const { city, verified } = req.query;
    
    const query = {};
    
    if (city) {
        query.city = { $regex: city, $options: 'i' };
    }
    
    if (verified === 'true') {
        query.verificationStatus = 'approved';
    }

    const owners = await Owner.find(query).select('-password');
    
    sendSuccess(res, 200, 'Owners retrieved successfully', {
        count: owners.length,
        owners: owners.map(o => o.getPublicProfile())
    });
}));

// ============================================
// ROUTE: Get Single Owner Profile
// METHOD: GET /api/owners/:id
// ============================================

/**
 * Get owner profile by ID (public view)
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const owner = await Owner.findById(req.params.id).select('-password');
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    sendSuccess(res, 200, 'Owner profile retrieved', owner.getPublicProfile());
}));

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// All routes below require authentication via JWT token

// ============================================
// ROUTE: Get My Profile
// METHOD: GET /api/owners/me
// ============================================

/**
 * Get current owner's full profile
 */
router.get('/me', auth, asyncHandler(async (req, res) => {
    const owner = await Owner.findById(req.userId);
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    sendSuccess(res, 200, 'Profile retrieved', owner.getFullProfile());
}));

// ============================================
// ROUTE: Update My Profile
// METHOD: PUT /api/owners/me
// ============================================

/**
 * Update current owner's profile
 */
router.put('/me', auth, asyncHandler(async (req, res) => {
    const { name, city, photo } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (city) updateData.city = city;
    if (photo !== undefined) updateData.photo = photo;

    const owner = await Owner.findByIdAndUpdate(
        req.userId,
        updateData,
        { new: true, runValidators: true }
    ).select('-password');

    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    sendSuccess(res, 200, 'Profile updated successfully', owner.getFullProfile());
}));

// ============================================
// ROUTE: Change Password
// METHOD: PUT /api/owners/me/password
// ============================================

/**
 * Change current owner's password
 */
router.put('/me/password', auth, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
        return sendValidationError(res, 'Please provide current and new password');
    }

    if (newPassword.length < 6) {
        return sendError(res, 400, 'Invalid password', 'New password must be at least 6 characters');
    }

    // Get owner with password
    const owner = await Owner.findById(req.userId).select('+password');
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, owner.password);
    if (!isMatch) {
        return sendError(res, 401, 'Invalid password', 'Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    owner.password = await bcrypt.hash(newPassword, salt);
    
    await owner.save();

    sendSuccess(res, 200, 'Password changed successfully');
}));

// ============================================
// VERIFICATION ROUTES
// ============================================

// ============================================
// ROUTE: Upload Verification Documents
// METHOD: POST /api/owners/me/verify
// ============================================

/**
 * Upload Aadhaar, driving license, and profile photo for verification
 * Uses multer for file handling
 */
router.post('/me/verify', auth, verificationUpload, asyncHandler(async (req, res) => {
    const owner = await Owner.findById(req.userId);
    
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    // Check if already verified
    if (owner.verificationStatus === 'approved') {
        return sendError(res, 400, 'Already verified', 'Your account is already verified');
    }

    // Build update data
    const updateData = {
        verificationStatus: 'pending'
    };

    // Handle file uploads
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

    // Check if at least Aadhaar is uploaded
    if (!updateData.aadhaarPhoto && !owner.aadhaarPhoto) {
        return sendError(res, 400, 'Documents required', 'Please upload at least your Aadhaar card for verification');
    }

    // Update owner
    await Owner.findByIdAndUpdate(req.userId, updateData);

    // Get updated owner
    const updatedOwner = await Owner.findById(req.userId);

    sendSuccess(res, 200, 'Verification documents uploaded successfully', {
        verificationStatus: updatedOwner.verificationStatus,
        aadhaarUploaded: !!updateData.aadhaarPhoto,
        drivingLicenseUploaded: !!updateData.drivingLicense
    });
}));

// ============================================
// ROUTE: Upload Profile Photo
// METHOD: POST /api/owners/me/photo
// ============================================

/**
 * Upload/update profile photo
 */
router.post('/me/photo', auth, profileUpload.single('photo'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return sendError(res, 400, 'No file', 'Please upload a profile photo');
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    await Owner.findByIdAndUpdate(req.userId, { photo: photoUrl });

    sendSuccess(res, 200, 'Profile photo uploaded successfully', {
        photo: photoUrl
    });
}));

// ============================================
// RATING & REVIEW ROUTES
// ============================================

// ============================================
// ROUTE: Rate a Worker
// METHOD: POST /api/owners/me/reviews/:workerId
// ============================================

/**
 * Rate and review a worker after job completion
 * Expected body: { rating, comment, workPostingId (optional) }
 */
router.post('/me/reviews/:workerId', auth, asyncHandler(async (req, res) => {
    const { rating, comment, workPostingId } = req.body;
    const workerId = req.params.workerId;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
        return sendValidationError(res, 'Please provide a valid rating (1-5)');
    }

    // Get owner
    const owner = await Owner.findById(req.userId);
    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    // Get worker
    const Worker = require('../models/Worker');
    const worker = await Worker.findById(workerId);
    if (!worker) {
        return sendNotFoundError(res, 'Worker');
    }

    // Check if already reviewed
    const existingReview = await Review.findBetweenUsers(
        req.userId, 
        workerId, 
        workPostingId || null
    );

    if (existingReview) {
        return sendError(res, 409, 'Already reviewed', 'You have already rated this worker for this work');
    }

    // Create review
    const review = new Review({
        workPostingId: workPostingId || null,
        reviewerId: owner._id,
        reviewerModel: 'Owner',
        reviewerName: owner.name,
        revieweeId: worker._id,
        revieweeModel: 'Worker',
        revieweeName: worker.name,
        rating: rating,
        comment: comment || '',
        workType: worker.workType
    });

    await review.save();

    // Update worker's average rating
    await worker.updateRating(rating);

    sendSuccess(res, 201, 'Review submitted successfully', {
        review: review.getPublicData(),
        newAverageRating: worker.averageRating
    });
}));

// ============================================
// ROUTE: Get My Reviews (given by me)
// METHOD: GET /api/owners/me/reviews
// ============================================

/**
 * Get all reviews given by the current owner
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
// METHOD: GET /api/owners/me/reviews/received
// ============================================

/**
 * Get all reviews received by the current owner
 */
router.get('/me/reviews/received', auth, asyncHandler(async (req, res) => {
    const reviews = await Review.findByReviewee(req.userId);
    
    // Calculate rating distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        distribution[r.rating]++;
    });

    sendSuccess(res, 200, 'Reviews retrieved', {
        averageRating: owner.averageRating,
        totalReviews: owner.totalReviews,
        distribution: distribution,
        reviews: reviews.map(r => r.getFormattedData())
    });
}));

// ============================================
// ADMIN ROUTES (For admin panel - would need admin role check in production)
// ============================================

// ============================================
// ROUTE: Get All Owners (Admin)
// METHOD: GET /api/owners/admin/all
// ============================================

/**
 * Get all owners with verification status (for admin)
 */
router.get('/admin/all', auth, asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) {
        query.verificationStatus = status;
    }

    const owners = await Owner.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Owner.countDocuments(query);

    sendSuccess(res, 200, 'Owners retrieved', {
        owners: owners.map(o => o.getFullProfile()),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            pages: Math.ceil(total / limit)
        }
    });
}));

// ============================================
// ROUTE: Verify/Reject Owner (Admin)
// METHOD: PUT /api/owners/admin/:id/verify
// ============================================

/**
 * Approve or reject owner's verification (admin function)
 * Expected body: { status: 'approved' | 'rejected', notes }
 */
router.put('/admin/:id/verify', auth, asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return sendValidationError(res, 'Status must be approved or rejected');
    }

    const owner = await Owner.findByIdAndUpdate(
        req.params.id,
        { 
            verificationStatus: status,
            verificationNotes: notes || ''
        },
        { new: true }
    ).select('-password');

    if (!owner) {
        return sendNotFoundError(res, 'Owner');
    }

    sendSuccess(res, 200, `Owner ${status} successfully`, owner.getFullProfile());
}));

// Export router
module.exports = router;
