/**
 * Worker Model
 * 
 * This defines the schema/structure for storing worker data in MongoDB.
 * Workers include drivers, helpers, and loaders.
 */

const mongoose = require('mongoose');

// ============================================
// WORKER SCHEMA DEFINITION
// ============================================

const workerSchema = new mongoose.Schema({
    // Worker's full name
    name: {
        type: String,
        required: [true, 'Worker name is required'],
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
    
    // Phone verification status (OTP-based)
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    
    // Type of work the worker does
    workType: {
        type: String,
        required: [true, 'Work type is required'],
        enum: {
            values: ['driver', 'helper', 'loader'],
            message: '{VALUE} is not a valid work type'
        }
    },
    
    // Years of experience
    experience: {
        type: Number,
        required: [true, 'Experience is required'],
        min: [0, 'Experience cannot be negative'],
        max: [50, 'Experience cannot exceed 50 years']
    },
    
    // Current location/city
    location: {
        type: String,
        required: [true, 'Location is required'],
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
    
    // Driving license URL (for verification, required for drivers)
    drivingLicense: {
        type: String,
        default: null
    },
    
    // Admin notes on verification
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
    
    // Soft delete field
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Automatically manage createdAt and updatedAt
});

// ============================================
// MIDDLEWARE (Hooks)
// ============================================

// Query middleware to exclude soft-deleted records by default
workerSchema.pre(/^find/, function(next) {
    this.find({ deletedAt: null });
    next();
});

// ============================================
// INDEXES (For faster queries)
// ============================================

// Index on workType for filtering workers
workerSchema.index({ workType: 1 });

// Index on location for location-based searches
workerSchema.index({ location: 1 });

// Index on verificationStatus for admin filters
workerSchema.index({ verificationStatus: 1 });

// Compound index for efficient queries
workerSchema.index({ workType: 1, location: 1, verificationStatus: 1 });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if password matches (for login)
 */
workerSchema.methods.comparePassword = async function(candidatePassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get public profile (without sensitive data)
 */
workerSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        name: this.name,
        phone: this.phone,
        workType: this.workType,
        experience: this.experience,
        location: this.location,
        photo: this.photo,
        verificationStatus: this.verificationStatus,
        verified: this.verificationStatus === 'approved',
        averageRating: this.averageRating,
        totalReviews: this.totalReviews,
        createdAt: this.createdAt
    };
};

/**
 * Get formatted profile with readable fields
 */
workerSchema.methods.getFormattedProfile = function() {
    const profile = this.getPublicProfile();
    profile.workTypeFormatted = this.workType.charAt(0).toUpperCase() + this.workType.slice(1);
    profile.experienceText = `${this.experience} year${this.experience !== 1 ? 's' : ''}`;
    return profile;
};

/**
 * Get full profile (for authenticated user)
 */
workerSchema.methods.getFullProfile = function() {
    return {
        id: this._id,
        name: this.name,
        phone: this.phone,
        workType: this.workType,
        experience: this.experience,
        location: this.location,
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
 * Check if user can apply for work (must be verified)
 */
workerSchema.methods.canApplyForWork = function() {
    return this.verificationStatus === 'approved';
};

/**
 * Update average rating after a new review
 */
workerSchema.methods.updateRating = async function(newRating) {
    const newAverage = ((this.averageRating * this.totalReviews) + newRating) / (this.totalReviews + 1);
    this.averageRating = Math.round(newAverage * 10) / 10;
    this.totalReviews += 1;
    await this.save();
    return this.averageRating;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find worker by phone number
 */
workerSchema.statics.findByPhone = function(phone) {
    return this.findOne({ phone: phone });
};

/**
 * Find worker by phone (with password included)
 */
workerSchema.statics.findByPhoneWithPassword = function(phone) {
    return this.findOne({ phone: phone }).select('+password');
};

/**
 * Check if phone exists
 */
workerSchema.statics.phoneExists = async function(phone) {
    const worker = await this.findOne({ phone: phone });
    return !!worker;
};

/**
 * Find workers by work type
 */
workerSchema.statics.findByWorkType = function(workType) {
    return this.find({ workType: workType });
};

/**
 * Find workers by location
 */
workerSchema.statics.findByLocation = function(location) {
    return this.find({ location: { $regex: location, $options: 'i' } });
};

/**
 * Find verified workers in a location for a specific work type
 */
workerSchema.statics.findVerifiedByWorkTypeAndLocation = function(workType, location) {
    return this.find({
        workType: workType,
        location: { $regex: location, $options: 'i' },
        verificationStatus: 'approved'
    });
};

/**
 * Find workers with filters
 */
workerSchema.statics.findWithFilters = function(filters) {
    const query = {};
    
    if (filters.workType) {
        query.workType = filters.workType;
    }
    
    if (filters.location) {
        query.location = { $regex: filters.location, $options: 'i' };
    }
    
    if (filters.verified === 'true') {
        query.verificationStatus = 'approved';
    } else if (filters.verified === 'false') {
        query.verificationStatus = { $ne: 'approved' };
    }
    
    if (filters.verificationStatus) {
        query.verificationStatus = filters.verificationStatus;
    }
    
    return this.find(query);
};

/**
 * Find workers by verification status (for admin)
 */
workerSchema.statics.findByVerificationStatus = function(status) {
    return this.find({ verificationStatus: status });
};

/**
 * Get top-rated workers
 */
workerSchema.statics.findTopRated = function(limit = 10) {
    return this.find({ verificationStatus: 'approved' })
        .sort({ averageRating: -1, totalReviews: -1 })
        .limit(limit);
};

// ============================================
// CREATE AND EXPORT MODEL
// ============================================

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
