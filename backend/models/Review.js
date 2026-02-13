/**
 * Review Model
 * 
 * This defines the schema for storing reviews/ratings between owners and workers.
 * Owners can rate workers, and workers can rate owners after job completion.
 */

const mongoose = require('mongoose');

// ============================================
// REVIEW SCHEMA DEFINITION
// ============================================

const reviewSchema = new mongoose.Schema({
    // Reference to the work posting (optional, for context)
    workPostingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkPosting',
        default: null
    },
    
    // Who is giving the review
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Reviewer ID is required'],
        refPath: 'reviewerModel' // Dynamically reference Owner or Worker
    },
    
    // Reviewer model type
    reviewerModel: {
        type: String,
        required: true,
        enum: ['Owner', 'Worker']
    },
    
    // Reviewer name (denormalized for display)
    reviewerName: {
        type: String,
        required: true
    },
    
    // Who is receiving the review
    revieweeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Reviewee ID is required'],
        refPath: 'revieweeModel' // Dynamically reference Owner or Worker
    },
    
    // Reviewee model type
    revieweeModel: {
        type: String,
        required: true,
        enum: ['Owner', 'Worker']
    },
    
    // Reviewee name (denormalized for display)
    revieweeName: {
        type: String,
        required: true
    },
    
    // Rating (1-5 stars)
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    
    // Review comment
    comment: {
        type: String,
        maxlength: [500, 'Comment cannot exceed 500 characters'],
        default: ''
    },
    
    // Work type (optional, for context)
    workType: {
        type: String,
        default: ''
    },
    
    // Review status
    isPublished: {
        type: Boolean,
        default: true
    },
    
    // Timestamps
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
// MIDDLEWARE
// ============================================

// Update the updatedAt field before saving
reviewSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// ============================================
// INDEXES
// ============================================

// Index for finding reviews given by a user
reviewSchema.index({ reviewerId: 1, createdAt: -1 });

// Index for finding reviews received by a user
reviewSchema.index({ revieweeId: 1, createdAt: -1 });

// Compound index for review between specific users
reviewSchema.index({ reviewerId: 1, revieweeId: 1 });

// Index for work posting reviews
reviewSchema.index({ workPostingId: 1 });

// Index for filtering by rating
reviewSchema.index({ rating: -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find all reviews received by a user
 */
reviewSchema.statics.findByReviewee = function(revieweeId) {
    return this.find({ revieweeId: revieweeId, isPublished: true })
        .sort({ createdAt: -1 });
};

/**
 * Find all reviews given by a user
 */
reviewSchema.statics.findByReviewer = function(reviewerId) {
    return this.find({ reviewerId: reviewerId })
        .sort({ createdAt: -1 });
};

/**
 * Find review between specific users (for a specific work)
 */
reviewSchema.statics.findBetweenUsers = function(reviewerId, revieweeId, workPostingId = null) {
    const query = {
        reviewerId: reviewerId,
        revieweeId: revieweeId
    };
    
    if (workPostingId) {
        query.workPostingId = workPostingId;
    }
    
    return this.findOne(query);
};

/**
 * Check if user already reviewed another user for a work posting
 */
reviewSchema.statics.hasReviewed = async function(reviewerId, revieweeId, workPostingId = null) {
    const query = {
        reviewerId: reviewerId,
        revieweeId: revieweeId
    };
    
    if (workPostingId) {
        query.workPostingId = workPostingId;
    }
    
    const review = await this.findOne(query);
    return !!review;
};

/**
 * Calculate average rating for a user
 */
reviewSchema.statics.calculateAverageRating = async function(revieweeId) {
    const result = await this.aggregate([
        { $match: { revieweeId: mongoose.Types.ObjectId(revieweeId), isPublished: true } },
        { $group: { 
            _id: '$revieweeId',
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
        }}
    ]);
    
    if (result.length > 0) {
        return {
            averageRating: Math.round(result[0].averageRating * 10) / 10,
            totalReviews: result[0].totalReviews
        };
    }
    
    return { averageRating: 0, totalReviews: 0 };
};

/**
 * Get rating distribution for a user
 */
reviewSchema.statics.getRatingDistribution = async function(revieweeId) {
    const distribution = await this.aggregate([
        { $match: { revieweeId: mongoose.Types.ObjectId(revieweeId), isPublished: true } },
        { $group: {
            _id: '$rating',
            count: { $sum: 1 }
        }},
        { $sort: { _id: -1 } }
    ]);
    
    // Format as object
    const result = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distribution.forEach(d => {
        result[d._id] = d.count;
    });
    
    return result;
};

/**
 * Get recent reviews for a user
 */
reviewSchema.statics.getRecentReviews = function(revieweeId, limit = 5) {
    return this.find({ revieweeId: revieweeId, isPublished: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('reviewerId', 'name photo');
};

/**
 * Get reviews by work type
 */
reviewSchema.statics.getByWorkType = function(workType) {
    return this.find({ workType: workType, isPublished: true })
        .sort({ createdAt: -1 });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get public data (for API response)
 */
reviewSchema.methods.getPublicData = function() {
    return {
        id: this._id,
        workPostingId: this.workPostingId,
        reviewer: {
            id: this.reviewerId,
            name: this.reviewerName
        },
        reviewee: {
            id: this.revieweeId,
            name: this.revieweeName
        },
        rating: this.rating,
        comment: this.comment,
        workType: this.workType,
        createdAt: this.createdAt
    };
};

/**
 * Get formatted review with relative time
 */
reviewSchema.methods.getFormattedData = function() {
    const data = this.getPublicData();
    
    // Add relative time (simple version)
    const now = new Date();
    const diffMs = now - this.createdAt;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        data.timeAgo = 'Today';
    } else if (diffDays === 1) {
        data.timeAgo = 'Yesterday';
    } else if (diffDays < 7) {
        data.timeAgo = `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        data.timeAgo = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
        data.timeAgo = `${Math.floor(diffDays / 30)} months ago`;
    }
    
    return data;
};

/**
 * Check if review can be edited
 */
reviewSchema.methods.canEdit = function() {
    // Allow editing within 24 hours of creation
    const now = new Date();
    const diffMs = now - this.createdAt;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24;
};

// ============================================
// CREATE AND EXPORT MODEL
// ============================================

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
