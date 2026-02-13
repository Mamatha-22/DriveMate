/**
 * Owner Model
 * 
 * This defines the schema/structure for storing vehicle owner data in MongoDB.
 * Mongoose schemas define what fields data has and their data types.
 */

const mongoose = require('mongoose');

// ============================================
// OWNER SCHEMA DEFINITION
// ============================================

const ownerSchema = new mongoose.Schema({
    // Business or owner name
    name: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    
    // Phone number (unique identifier for login)
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: [true, 'This phone number is already registered'],
        trim: true,
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    
    // Password for authentication (hashed)
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    
    // City where owner operates
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    
    // Profile photo (stored as URL or base64)
    photo: {
        type: String,
        default: null
    },
    
    // ============================================
    // VERIFICATION FIELDS
    // ============================================
    
    // Verification status: 'pending' | 'approved' | 'rejected'
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    
    // Aadhaar card URL (for verification)
    aadhaarPhoto: {
        type: String,
        default: null
    },
    
    // Driving license URL (for verification)
    drivingLicense: {
        type: String,
        default: null
    },
    
    // Admin notes on verification (for internal use)
    verificationNotes: {
        type: String,
        default: ''
    },
    
    // ============================================
    // RATING FIELDS
    // ============================================
    
    // Average rating (calculated from reviews)
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    
    // Total number of reviews received
    totalReviews: {
        type: Number,
        default: 0
    },
    
    // Timestamps for tracking creation and updates
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ============================================
// MIDDLEWARE (Pre-save hook)
// ============================================

// Update the updatedAt field before saving
ownerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// ============================================
// INDEXES (For faster queries)
// ============================================

// Index on phone for login lookups
ownerSchema.index({ phone: 1 });

// Index on city for location-based searches
ownerSchema.index({ city: 1 });

// Index on verificationStatus for admin filters
ownerSchema.index({ verificationStatus: 1 });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if password matches (for login)
 * @param {string} candidatePassword - Password to check
 * @returns {boolean} True if password matches
 */
ownerSchema.methods.comparePassword = async function(candidatePassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get public profile (without sensitive data)
 */
ownerSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        name: this.name,
        phone: this.phone,
        city: this.city,
        photo: this.photo,
        verificationStatus: this.verificationStatus,
        verified: this.verificationStatus === 'approved',
        averageRating: this.averageRating,
        totalReviews: this.totalReviews,
        createdAt: this.createdAt
    };
};

/**
 * Get full profile (for authenticated user)
 */
ownerSchema.methods.getFullProfile = function() {
    return {
        id: this._id,
        name: this.name,
        phone: this.phone,
        city: this.city,
        photo: this.photo,
        verificationStatus: this.verificationStatus,
        verified: this.verificationStatus === 'approved',
        aadhaarPhoto: this.aadhaarPhoto,
        drivingLicense: this.drivingLicense,
        averageRating: this.averageRating,
        totalReviews: this.totalReviews,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

/**
 * Check if user can post work (must be verified)
 */
ownerSchema.methods.canPostWork = function() {
    return this.verificationStatus === 'approved';
};

/**
 * Update average rating after a new review
 */
ownerSchema.methods.updateRating = async function(newRating) {
    // Calculate new average
    const newAverage = ((this.averageRating * this.totalReviews) + newRating) / (this.totalReviews + 1);
    
    this.averageRating = Math.round(newAverage * 10) / 10; // Round to 1 decimal
    this.totalReviews += 1;
    
    await this.save();
    return this.averageRating;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find owner by phone number
 */
ownerSchema.statics.findByPhone = function(phone) {
    return this.findOne({ phone: phone });
};

/**
 * Find owner by phone (with password included)
 */
ownerSchema.statics.findByPhoneWithPassword = function(phone) {
    return this.findOne({ phone: phone }).select('+password');
};

/**
 * Check if phone exists
 */
ownerSchema.statics.phoneExists = async function(phone) {
    const owner = await this.findOne({ phone: phone });
    return !!owner;
};

/**
 * Find owners by verification status (for admin)
 */
ownerSchema.statics.findByVerificationStatus = function(status) {
    return this.find({ verificationStatus: status });
};

/**
 * Find verified owners in a city
 */
ownerSchema.statics.findVerifiedInCity = function(city) {
    return this.find({ 
        city: { $regex: city, $options: 'i' },
        verificationStatus: 'approved'
    });
};

// ============================================
// CREATE AND EXPORT MODEL
// ============================================

// Create Owner model from schema
const Owner = mongoose.model('Owner', ownerSchema);

// Export for use in routes
module.exports = Owner;
