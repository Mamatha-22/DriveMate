const ActivityLog = require('../models/ActivityLog');

/**
 * Log a user activity
 * @param {Object} options - { userId, userType, action, description, req, metadata }
 */
const logActivity = async ({ userId, userType, action, description, req, metadata = {} }) => {
    try {
        await ActivityLog.create({
            userId,
            userModel: userType,
            action,
            description,
            ipAddress: req ? (req.ip || req.connection?.remoteAddress) : 'system',
            userAgent: req ? req.get('User-Agent') : 'system',
            metadata
        });
    } catch (error) {
        // Don't crash the app for logging failures, but log the error
        console.error('Failed to log activity:', error.message);
    }
};

module.exports = {
    logActivity
};
