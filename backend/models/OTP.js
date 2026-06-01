/**
 * OTP Model
 * 
 * This schema stores One-Time Password (OTP) records for phone verification.
 * OTPs are used to verify phone numbers during registration and login.
 * 
 * Features:
 * - OTP generation with expiry (5 minutes)
 * - Rate limiting (max 5 OTPs per phone per day)
 * - Tracking verification attempts
 */

const mongoose = require('mongoose');

// ============================================
// OTP SCHEMA DEFINITION
// ============================================

const otpSchema = new mongoose.Schema({
    // Phone number to verify
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        index: true
    },
    
    // The OTP code (hashed for security)
    otp: {
        type: String,
        required: [true, 'OTP is required']
    },
    
    // Type of OTP (registration, login, password_reset)
    purpose: {
        type: String,
        required: true,
        enum: ['registration', 'login', 'password_reset'],
        default: 'registration'
    },
    
    // User type (owner, worker)
    userType: {
        type: String,
        enum: ['owner', 'worker'],
        required: true
    },
    
    // Whether the OTP has been used
    verified: {
        type: Boolean,
        default: false
    },
    
    // When the OTP expires
    expiresAt: {
        type: Date,
        required: true
    },
    
    // Number of verification attempts (max 3)
    attempts: {
        type: Number,
        default: 0,
        max: 3
    },
    
    // When the OTP was verified
    verifiedAt: {
        type: Date,
        default: null
    },
    
    // IP address of request (for security tracking)
    ipAddress: {
        type: String,
        default: null
    },
    
    // User agent (for security tracking)
    userAgent: {
        type: String,
        default: null
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// MIDDLEWARE
// ============================================

// TTL index - auto-delete documents after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries
otpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate a secure OTP
 * @returns {string} 6-digit OTP
 */
otpSchema.statics.generateOTP = function() {
    // Generate a 6-digit numeric OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Find valid OTP for verification
 * @param {string} phone - Phone number
 * @param {string} purpose - OTP purpose
 * @returns {Object} Valid OTP document
 */
otpSchema.statics.findValidOTP = function(phone, purpose) {
    return this.findOne({
        phone: phone,
        purpose: purpose,
        verified: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 3 }
    }).sort({ createdAt: -1 });
};

/**
 * Get OTP count for a phone today (for rate limiting)
 * @param {string} phone - Phone number
 * @returns {number} Count of OTPs sent today
 */
otpSchema.statics.getTodayCount = async function(phone) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    return this.countDocuments({
        phone: phone,
        createdAt: { $gte: startOfDay }
    });
};

/**
 * Clean up old OTPs for a phone (keep only latest)
 */
otpSchema.statics.cleanupOldOTPs = async function(phone, purpose) {
    // Keep only the 5 most recent OTPs
    const oldOTPs = await this.find({ phone, purpose })
        .sort({ createdAt: -1 })
        .skip(5);
    
    if (oldOTPs.length > 0) {
        const idsToDelete = oldOTPs.map(otp => otp._id);
        await this.deleteMany({ _id: { $in: idsToDelete } });
    }
};

/**
 * Hash OTP for storage (simple hash for demo - use bcrypt in production)
 */
otpSchema.statics.hashOTP = function(otp) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(otp + process.env.OTP_SECRET || 'drivemate_otp_secret');
    return hash.digest('hex').substring(0, 6);
};

/**
 * Verify OTP against stored hash
 */
otpSchema.statics.verifyOTP = function(otp, storedOTP) {
    const hashedInput = this.hashOTP(otp);
    return hashedInput === storedOTP;
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if OTP is valid (not expired, not used, within attempt limit)
 */
otpSchema.methods.isValid = function() {
    return !this.verified && 
           this.expiresAt > new Date() && 
           this.attempts < 3;
};

/**
 * Mark OTP as verified
 */
otpSchema.methods.markAsVerified = async function() {
    this.verified = true;
    this.verifiedAt = new Date();
    await this.save();
    return this;
};

/**
 * Increment attempt count
 */
otpSchema.methods.incrementAttempts = async function() {
    this.attempts += 1;
    await this.save();
    return this;
};

// ============================================
// CREATE AND EXPORT MODEL
// ============================================

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
