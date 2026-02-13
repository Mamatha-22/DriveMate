/**
 * WorkPosting Model
 * 
 * This defines the schema for work/job postings created by vehicle owners.
 * Workers can view and apply to these postings.
 */

const mongoose = require('mongoose');

// ============================================
// WORK POSTING SCHEMA DEFINITION
// ============================================

const workPostingSchema = new mongoose.Schema({
    // Reference to the owner who posted this work
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Owner',
        required: [true, 'Owner ID is required']
    },
    
    // Owner's name (denormalized for easier querying)
    ownerName: {
        type: String,
        required: true
    },
    
    // Owner's phone (denormalized for contact display)
    ownerPhone: {
        type: String,
        required: true
    },
    
    // Owner's city (denormalized)
    ownerCity: {
        type: String,
        required: true
    },
    
    // Type of vehicle
    vehicleType: {
        type: String,
        required: [true, 'Vehicle type is required'],
        enum: {
            values: ['bus', 'lorry', 'tempo', 'van', 'truck'],
            message: '{VALUE} is not a valid vehicle type'
        }
    },
    
    // Type of worker needed
    workerType: {
        type: String,
        required: [true, 'Worker type is required'],
        enum: {
            values: ['driver', 'helper', 'loader'],
            message: '{VALUE} is not a valid worker type'
        }
    },
    
    // Work location
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    
    // Duration of work
    duration: {
        type: String,
        required: [true, 'Duration is required'],
        enum: ['Full Time', 'Part Time', 'Temporary', 'Project Basis']
    },
    
    // Salary/wage (optional, for transparency)
    salary: {
        type: String,
        default: 'Negotiable'
    },
    
    // Job description
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    
    // ============================================
    // APPLICANT TRACKING
    // ============================================
    
    // Array of applicants with their status
    applicants: [{
        // Reference to the worker
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Worker',
            required: true
        },
        // Worker's name (denormalized)
        workerName: String,
        // Worker's phone (denormalized)
        workerPhone: String,
        // Worker's work type (denormalized)
        workerWorkType: String,
        // When the worker applied
        appliedAt: {
            type: Date,
            default: Date.now
        },
        // Application status: 'pending' | 'accepted' | 'rejected'
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        // Owner's notes on the applicant
        notes: {
            type: String,
            default: ''
        }
    }],
    
    // ============================================
    // WORK STATUS
    // ============================================
    
    // Work posting status
    status: {
        type: String,
        enum: ['active', 'closed', 'filled'],
        default: 'active'
    },
    
    // When the work is expected to start
    startDate: {
        type: Date,
        default: null
    },
    
    // When the work was completed (if applicable)
    completedAt: {
        type: Date,
        default: null
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
workPostingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// ============================================
// INDEXES
// ============================================

// Index on ownerId for fetching owner's postings
workPostingSchema.index({ ownerId: 1, createdAt: -1 });

// Index on status for active/closed filters
workPostingSchema.index({ status: 1, createdAt: -1 });

// Index on workerType for worker searches
workPostingSchema.index({ workerType: 1, status: 1 });

// Index on location for geographic searches
workPostingSchema.index({ location: 1, status: 1 });

// Compound index for efficient queries
workPostingSchema.index({ status: 1, workerType: 1, location: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * Get count of pending applications
 */
workPostingSchema.virtual('pendingApplicationsCount').get(function() {
    return this.applicants.filter(a => a.status === 'pending').length;
});

/**
 * Get count of accepted applications
 */
workPostingSchema.virtual('acceptedApplicationsCount').get(function() {
    return this.applicants.filter(a => a.status === 'accepted').length;
});

/**
 * Get all applicant worker IDs (for backward compatibility)
 */
workPostingSchema.virtual('applicantIds').get(function() {
    return this.applicants.map(a => a.workerId);
});

// Ensure virtuals are included in JSON output
workPostingSchema.set('toJSON', { virtuals: true });
workPostingSchema.set('toObject', { virtuals: true });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if a specific worker has applied
 */
workPostingSchema.methods.hasApplied = function(workerId) {
    return this.applicants.some(a => a.workerId.toString() === workerId.toString());
};

/**
 * Get applicant's info by worker ID
 */
workPostingSchema.methods.getApplicant = function(workerId) {
    return this.applicants.find(a => a.workerId.toString() === workerId.toString());
};

/**
 * Add a new applicant
 */
workPostingSchema.methods.addApplicant = async function(worker) {
    // Check if already applied
    if (this.hasApplied(worker._id)) {
        throw new Error('Worker has already applied');
    }
    
    // Add to applicants array
    this.applicants.push({
        workerId: worker._id,
        workerName: worker.name,
        workerPhone: worker.phone,
        workerWorkType: worker.workType,
        appliedAt: new Date(),
        status: 'pending'
    });
    
    await this.save();
    return this;
};

/**
 * Update applicant's status
 */
workPostingSchema.methods.updateApplicantStatus = async function(workerId, status, notes = '') {
    const applicant = this.applicants.find(a => a.workerId.toString() === workerId.toString());
    
    if (!applicant) {
        throw new Error('Applicant not found');
    }
    
    applicant.status = status;
    applicant.notes = notes;
    
    // If accepted, check if we should auto-close the posting
    if (status === 'accepted') {
        this.status = 'filled';
        this.completedAt = new Date();
    }
    
    await this.save();
    return applicant;
};

/**
 * Remove an applicant
 */
workPostingSchema.methods.removeApplicant = async function(workerId) {
    this.applicants = this.applicants.filter(a => a.workerId.toString() !== workerId.toString());
    await this.save();
    return this;
};

/**
 * Get public data (without internal IDs)
 */
workPostingSchema.methods.getPublicData = function() {
    return {
        id: this._id,
        ownerName: this.ownerName,
        ownerPhone: this.ownerPhone,
        ownerCity: this.ownerCity,
        vehicleType: this.vehicleType,
        workerType: this.workerType,
        location: this.location,
        duration: this.duration,
        salary: this.salary,
        description: this.description,
        applicantCount: this.applicants.length,
        pendingApplicationsCount: this.applicants.filter(a => a.status === 'pending').length,
        acceptedApplicationsCount: this.applicants.filter(a => a.status === 'accepted').length,
        status: this.status,
        startDate: this.startDate,
        createdAt: this.createdAt
    };
};

/**
 * Get data with applicant details (for owner)
 */
workPostingSchema.methods.getDataWithApplicants = function() {
    const data = this.getPublicData();
    data.applicants = this.applicants.map(a => ({
        workerId: a.workerId,
        workerName: a.workerName,
        workerPhone: a.workerPhone,
        workerWorkType: a.workerWorkType,
        appliedAt: a.appliedAt,
        status: a.status,
        notes: a.notes
    }));
    return data;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find by owner
 */
workPostingSchema.statics.findByOwner = function(ownerId) {
    return this.find({ ownerId: ownerId }).sort({ createdAt: -1 });
};

/**
 * Find active postings
 */
workPostingSchema.statics.findActive = function() {
    return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

/**
 * Find by work type
 */
workPostingSchema.statics.findByWorkerType = function(workerType) {
    return this.find({ 
        workerType: workerType,
        status: 'active'
    }).sort({ createdAt: -1 });
};

/**
 * Find by location
 */
workPostingSchema.statics.findByLocation = function(location) {
    return this.find({ 
        location: { $regex: location, $options: 'i' },
        status: 'active'
    }).sort({ createdAt: -1 });
};

/**
 * Find postings worker hasn't applied to
 */
workPostingSchema.statics.findAvailableForWorker = function(workerId) {
    return this.find({
        status: 'active',
        'applicants.workerId': { $ne: workerId }
    }).sort({ createdAt: -1 });
};

/**
 * Find postings worker has applied to
 */
workPostingSchema.statics.findAppliedByWorker = function(workerId) {
    return this.find({
        'applicants.workerId': workerId
    }).sort({ createdAt: -1 });
};

/**
 * Search postings
 */
workPostingSchema.statics.search = function(searchTerm) {
    return this.find({
        status: 'active',
        $or: [
            { location: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { ownerName: { $regex: searchTerm, $options: 'i' } }
        ]
    }).sort({ createdAt: -1 });
};

/**
 * Get recent postings
 */
workPostingSchema.statics.findRecent = function(limit = 10) {
    return this.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// ============================================
// CREATE AND EXPORT MODEL
// ============================================

const WorkPosting = mongoose.model('WorkPosting', workPostingSchema);

module.exports = WorkPosting;
