/**
 * Authentication Routes
 * 
 * This file handles OTP-based phone verification and authentication.
 * Routes include:
 * - POST /api/auth/send-otp: Send OTP to phone number
 * - POST /api/auth/verify-otp: Verify OTP and get access
 * - POST /api/auth/resend-otp: Resend OTP if expired
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Import models
const Owner = require('../models/Owner');
const Worker = require('../models/Worker');
const OTP = require('../models/OTP');

// Import services
const authService = require('../services/authService');
const activityService = require('../services/activityService');

// Import middleware
const { auth, generateToken } = require('../middleware/auth');
const { sendSuccess, sendError, sendValidationError, sendNotFoundError, asyncHandler } = require('../middleware/errorHandler');

// ============================================
// CONSTANTS
// ============================================

const OTP_EXPIRY_MINUTES = 5; // OTP valid for 5 minutes
const MAX_OTP_PER_DAY = 5; // Max 5 OTPs per phone per day
const MAX_VERIFICATION_ATTEMPTS = 3;

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
 * Hash OTP for secure storage
 */
const hashOTP = (otp) => {
    const secret = process.env.OTP_SECRET || 'drivemate_otp_secret_2024';
    const hash = crypto.createHash('sha256');
    hash.update(otp + secret);
    return hash.digest('hex').substring(0, 6);
};

/**
 * Get user model based on user type
 */
const getUserModel = (userType) => {
    return userType === 'owner' ? Owner : Worker;
};

/**
 * Check if user exists based on user type
 */
const findUserByPhone = async (phone, userType) => {
    const Model = getUserModel(userType);
    return Model.findByPhone(phone);
};

/**
 * Mock OTP sender (in production, integrate with SMS provider like Twilio)
 * This simulates sending OTP via SMS
 */
const sendOTPViaSMS = async (phone, otp) => {
    // In production, integrate with SMS provider:
    // - Twilio
    // - Nexmo
    // - AWS SNS
    // - etc.
    
    // For demo purposes, log the OTP
    console.log(`📱 OTP for ${phone}: ${otp}`);
    console.log(`   (In production, this would be sent via SMS)`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return { success: true, message: 'OTP sent successfully' };
};

// ============================================
// OTP ROUTES
// ============================================

// ============================================
// ROUTE: Send OTP
// METHOD: POST /api/auth/send-otp
// ============================================

/**
 * Send OTP to phone number
 * Body: { phone, userType (owner/worker), purpose (registration/login) }
 */
router.post('/send-otp', asyncHandler(async (req, res) => {
    try {
        const { phone, userType, purpose } = req.body;

        // Validation - check required fields
        const errors = {};
        if (!phone) {
            errors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(phone)) {
            errors.phone = 'Please enter a valid 10-digit phone number';
        }
        
        if (!userType) {
            errors.userType = 'User type is required';
        } else if (!['owner', 'worker'].includes(userType)) {
            errors.userType = 'Invalid user type. Must be "owner" or "worker"';
        }
        
        if (!purpose) {
            errors.purpose = 'Purpose is required';
        } else if (!['registration', 'login'].includes(purpose)) {
            errors.purpose = 'Invalid purpose. Must be "registration" or "login"';
        }

        if (Object.keys(errors).length > 0) {
            return sendValidationError(res, 'Please provide valid details', errors);
        }

        // Check rate limit (max 5 OTPs per day)
        const todayCount = await OTP.getTodayCount(phone);
        if (todayCount >= MAX_OTP_PER_DAY) {
            return sendError(res, 429, 'Rate limit exceeded', 
                `Maximum ${MAX_OTP_PER_DAY} OTPs can be sent per day. Please try again tomorrow.`);
        }

        // For registration: check if phone already exists
        if (purpose === 'registration') {
            const existingUser = await findUserByPhone(phone, userType);
            if (existingUser) {
                return sendError(res, 409, 'Phone already registered', 
                    'This phone number is already registered. Please login or use a different number.');
            }
        }

        // For login: check if user exists
        if (purpose === 'login') {
            const existingUser = await findUserByPhone(phone, userType);
            if (!existingUser) {
                return sendError(res, 404, 'User not found', 
                    'No account found with this phone number. Please register first.');
            }
        }

        // Generate OTP
        const otp = OTP.generateOTP();
        const hashedOTP = hashOTP(otp);
        
        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

        // Clean up old OTPs for this phone
        await OTP.cleanupOldOTPs(phone, purpose);

        // Create new OTP record
        const otpRecord = new OTP({
            phone,
            otp: hashedOTP,
            purpose,
            userType,
            expiresAt,
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });

        await otpRecord.save();

        // Send OTP (mock in development)
        await sendOTPViaSMS(phone, otp);

        // Return success (don't reveal the OTP in response for security)
        sendSuccess(res, 200, `OTP sent to ${phone}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`, {
            phone: phone,
            expiresIn: OTP_EXPIRY_MINUTES * 60, // in seconds
            attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
            // NOTE: In production, remove this debug info
            _debug: process.env.NODE_ENV !== 'production' ? { otp: otp } : undefined
        });
    } catch (error) {
        console.error('Send OTP Error:', error);
        return sendError(res, 500, 'Server error', 'Failed to send OTP. Please try again later.');
    }
}));

// ============================================
// ROUTE: Verify OTP
// METHOD: POST /api/auth/verify-otp
// ============================================

/**
 * Verify OTP and complete authentication
 * Body: { phone, userType, otp, purpose }
 */
router.post('/verify-otp', asyncHandler(async (req, res) => {
    try {
        const { phone, userType, otp, purpose } = req.body;

        // Validation - check required fields
        const errors = {};
        if (!phone) {
            errors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(phone)) {
            errors.phone = 'Please enter a valid 10-digit phone number';
        }
        
        if (!userType) {
            errors.userType = 'User type is required';
        } else if (!['owner', 'worker'].includes(userType)) {
            errors.userType = 'Invalid user type. Must be "owner" or "worker"';
        }
        
        if (!otp) {
            errors.otp = 'OTP is required';
        } else if (!/^\d{6}$/.test(otp)) {
            errors.otp = 'Please enter a valid 6-digit OTP';
        }
        
        if (!purpose) {
            errors.purpose = 'Purpose is required';
        } else if (!['registration', 'login'].includes(purpose)) {
            errors.purpose = 'Invalid purpose. Must be "registration" or "login"';
        }

        if (Object.keys(errors).length > 0) {
            return sendValidationError(res, 'Please provide valid details', errors);
        }

        // Find valid OTP record
        const otpRecord = await OTP.findValidOTP(phone, purpose);
        
        if (!otpRecord) {
            return sendError(res, 400, 'Invalid or expired OTP', 
                'OTP not found or has expired. Please request a new OTP.');
        }

        // Verify OTP
        const hashedInput = hashOTP(otp);
        
        if (hashedInput !== otpRecord.otp) {
            // Increment attempts
            await otpRecord.incrementAttempts();
            
            const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - otpRecord.attempts;
            
            if (remainingAttempts <= 0) {
                return sendError(res, 400, 'Too many attempts', 
                    'Maximum verification attempts exceeded. Please request a new OTP.');
            }
            
            return sendError(res, 400, 'Invalid OTP', 
                `Incorrect OTP. You have ${remainingAttempts} attempt(s) remaining.`);
        }

        // OTP verified successfully
        await otpRecord.markAsVerified();

        // For registration: create new user
        let user;
        let isNewUser = false;
        
        if (purpose === 'registration') {
            const { name, password, city, workType, experience, location } = req.body;
            
            // Additional validation for registration
            if (!name) {
                errors.name = 'Name is required for registration';
            }
            if (!password) {
                errors.password = 'Password is required for registration';
            }
            if (userType === 'owner' && !city) {
                errors.city = 'City is required for owner registration';
            }
            if (userType === 'worker' && !workType) {
                errors.workType = 'Work type is required for worker registration';
            }
            
            if (Object.keys(errors).length > 0) {
                return sendValidationError(res, 'Registration details required', errors);
            }
            
            const Model = getUserModel(userType);
            const bcrypt = require('bcryptjs');
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Create user based on type
            if (userType === 'owner') {
                user = new Owner({
                    name,
                    phone,
                    password: hashedPassword,
                    city,
                    verificationStatus: 'pending',
                    isPhoneVerified: true
                });
            } else {
                user = new Worker({
                    name,
                    phone,
                    password: hashedPassword,
                    workType,
                    experience: parseInt(experience) || 0,
                    location: location || '',
                    verificationStatus: 'pending',
                    isPhoneVerified: true
                });
            }
            
            await user.save();
            isNewUser = true;
        } else {
            // For login: find existing user
            user = await findUserByPhone(phone, userType);
            
            if (!user) {
                return sendError(res, 404, 'User not found', 'User not found');
            }
            
            // Check if phone is verified
            if (!user.isPhoneVerified) {
                // Update phone verification status
                user.isPhoneVerified = true;
                await user.save();
            }
        }

        // Generate tokens using authService
        const { accessToken, refreshToken } = await authService.loginUser(
            user, 
            userType.charAt(0).toUpperCase() + userType.slice(1)
        );
        
        // Return user data and tokens
        const userData = user.getPublicProfile();
        
        // Log activity
        await activityService.logActivity({
            userId: user._id,
            userType: userType.charAt(0).toUpperCase() + userType.slice(1),
            action: isNewUser ? 'REGISTRATION' : 'LOGIN',
            description: `${userType} ${isNewUser ? 'registered' : 'logged in'} via OTP`,
            req
        });
        
        sendSuccess(res, 200, isNewUser ? 'Registration successful!' : 'Login successful!', {
            user: userData,
            token: accessToken,
            refreshToken: refreshToken,
            isPhoneVerified: true
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        return sendError(res, 500, 'Server error', 'Failed to verify OTP. Please try again later.');
    }
}));

// ============================================
// ROUTE: Resend OTP
// METHOD: POST /api/auth/resend-otp
// ============================================

/**
 * Resend OTP if previous one expired or wasn't received
 * Body: { phone, userType, purpose }
 */
router.post('/resend-otp', asyncHandler(async (req, res) => {
    try {
        const { phone, userType, purpose } = req.body;

        // Validation - check required fields
        if (!phone || !/^\d{10}$/.test(phone)) {
            return sendValidationError(res, 'Please provide a valid phone number');
        }
        
        if (!userType || !['owner', 'worker'].includes(userType)) {
            return sendValidationError(res, 'Please provide a valid user type ("owner" or "worker")');
        }

        if (!purpose || !['registration', 'login'].includes(purpose)) {
            return sendValidationError(res, 'Please provide a valid purpose ("registration" or "login")');
        }

        // Check rate limit
        const todayCount = await OTP.getTodayCount(phone);
        if (todayCount >= MAX_OTP_PER_DAY) {
            return sendError(res, 429, 'Rate limit exceeded', 
                `Maximum ${MAX_OTP_PER_DAY} OTPs can be sent per day.`);
        }

        // For login: check if user exists
        if (purpose === 'login') {
            const existingUser = await findUserByPhone(phone, userType);
            if (!existingUser) {
                return sendError(res, 404, 'User not found', 'No account found with this phone number.');
            }
        }

        // Check if there's a recent unexpired OTP
        const recentOTP = await OTP.findValidOTP(phone, purpose);
        
        if (recentOTP) {
            // Calculate remaining time
            const remainingTime = Math.ceil((recentOTP.expiresAt - new Date()) / 1000);
            
            if (remainingTime > 0) {
                return sendError(res, 400, 'OTP still valid', 
                    `Please wait ${remainingTime} seconds before requesting a new OTP.`);
            }
        }

        // Generate new OTP
        const otp = OTP.generateOTP();
        const hashedOTP = hashOTP(otp);
        
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

        // Clean up old OTPs
        await OTP.cleanupOldOTPs(phone, purpose);

        // Create new OTP record
        const otpRecord = new OTP({
            phone,
            otp: hashedOTP,
            purpose: purpose || 'registration',
            userType,
            expiresAt,
            ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
        });

        await otpRecord.save();

        // Send OTP
        await sendOTPViaSMS(phone, otp);

        sendSuccess(res, 200, `New OTP sent to ${phone}`, {
            phone: phone,
            expiresIn: OTP_EXPIRY_MINUTES * 60,
            // NOTE: In production, remove this debug info
            _debug: process.env.NODE_ENV !== 'production' ? { otp: otp } : undefined
        });
    } catch (error) {
        console.error('Resend OTP Error:', error);
        return sendError(res, 500, 'Server error', 'Failed to resend OTP. Please try again later.');
    }
}));

// ============================================
// ROUTE: Check Phone Availability
// METHOD: POST /api/auth/check-phone
// ============================================

/**
 * Check if a phone number is available for registration
 * Body: { phone, userType }
 */
router.post('/check-phone', asyncHandler(async (req, res) => {
    try {
        const { phone, userType } = req.body;

        // Validation - check required fields
        if (!phone || !/^\d{10}$/.test(phone)) {
            return sendValidationError(res, 'Please provide a valid phone number');
        }
        
        if (!userType || !['owner', 'worker'].includes(userType)) {
            return sendValidationError(res, 'Please provide a valid user type ("owner" or "worker")');
        }

        // Check if user exists
        const existingUser = await findUserByPhone(phone, userType);

        sendSuccess(res, 200, 'Phone availability checked', {
            phone: phone,
            available: !existingUser,
            registered: !!existingUser
        });
    } catch (error) {
        console.error('Check Phone Error:', error);
        return sendError(res, 500, 'Server error', 'Failed to check phone availability. Please try again later.');
    }
}));

// ============================================
// ROUTE: Refresh Token
// METHOD: POST /api/auth/refresh-token
// ============================================

/**
 * Get a new access token using a refresh token
 * Body: { refreshToken }
 */
router.post('/refresh-token', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return sendError(res, 400, 'Refresh token required', 'Please provide a refresh token');
    }

    const newAccessToken = await authService.refreshAccessToken(refreshToken);

    if (!newAccessToken) {
        return sendError(res, 401, 'Invalid refresh token', 'The refresh token is invalid or has expired. Please login again.');
    }

    sendSuccess(res, 200, 'Token refreshed successfully', {
        token: newAccessToken
    });
}));

// ============================================
// ROUTE: Logout
// METHOD: POST /api/auth/logout
// ============================================

/**
 * Logout user by invalidating the refresh token
 * Body: { refreshToken }
 */
router.post('/logout', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        await authService.logoutUser(refreshToken);
    }

    sendSuccess(res, 200, 'Logged out successfully');
}));

module.exports = router;
