/**
 * Error Handling Middleware
 * 
 * This middleware provides centralized error handling for the API.
 * It catches all errors and returns consistent JSON responses.
 */

// ============================================
// SUCCESS RESPONSE HELPER
// ============================================

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {any} data - Data to return (optional)
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = {
        success: true,
        message: message
    };

    if (data !== null) {
        response.data = data;
    }

    res.status(statusCode).json(response);
};

/**
 * Send a success response with pagination
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {any} data - Data array
 * @param {number} count - Total count
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 */
const sendPaginatedSuccess = (res, statusCode = 200, message = 'Success', data = [], count = 0, page = 1, totalPages = 1) => {
    res.status(statusCode).json({
        success: true,
        message: message,
        data: data,
        pagination: {
            count: count,
            page: page,
            totalPages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    });
};

// ============================================
// ERROR RESPONSE HELPER
// ============================================

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error type/category
 * @param {string} message - Error message
 * @param {any} details - Additional error details (optional)
 */
const sendError = (res, statusCode = 500, error = 'Server Error', message = 'An error occurred', details = null) => {
    const response = {
        success: false,
        error: error,
        message: message
    };

    if (details !== null) {
        response.details = details;
    }

    res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors object
 */
const sendValidationError = (res, message = 'Validation failed', errors = {}) => {
    res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: message,
        errors: errors
    });
};

/**
 * Send an authentication error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendAuthError = (res, message = 'Authentication required') => {
    res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: message
    });
};

/**
 * Send an authorization error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendForbiddenError = (res, message = 'Access denied') => {
    res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: message
    });
};

/**
 * Send a not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (e.g., 'Owner', 'Work Posting')
 */
const sendNotFoundError = (res, resource = 'Resource') => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `${resource} not found`
    });
};

/**
 * Send a conflict error response (e.g., duplicate entry)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendConflictError = (res, message = 'Resource already exists') => {
    res.status(409).json({
        success: false,
        error: 'Conflict',
        message: message
    });
};

// ============================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================

/**
 * Global error handler middleware
 * This catches all unhandled errors in the application.
 */
const errorHandler = (err, req, res, next) => {
    // Log the error for debugging
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Default values
    let statusCode = 500;
    let error = 'Server Error';
    let message = 'An unexpected error occurred';
    let details = null;

    // Handle different error types
    if (err.name === 'ValidationError') {
        // Mongoose validation error
        statusCode = 400;
        error = 'Validation Error';
        message = 'Input validation failed';
        
        // Extract validation messages
        const validationErrors = {};
        for (const field in err.errors) {
            validationErrors[field] = err.errors[field].message;
        }
        details = validationErrors;

    } else if (err.code === 11000) {
        // MongoDB duplicate key error
        statusCode = 409;
        error = 'Duplicate Entry';
        
        // Extract which field caused the duplicate
        const field = Object.keys(err.keyPattern)[0];
        message = `${field} already exists`;
        
    } else if (err.name === 'CastError') {
        // Invalid MongoDB ObjectId
        statusCode = 400;
        error = 'Invalid ID';
        message = 'The provided ID format is invalid';
        
    } else if (err.name === 'JsonWebTokenError') {
        // Invalid JWT token
        statusCode = 401;
        error = 'Invalid Token';
        message = 'The authentication token is invalid';
        
    } else if (err.name === 'TokenExpiredError') {
        // Expired JWT token
        statusCode = 401;
        error = 'Token Expired';
        message = 'The authentication token has expired';
        
    } else if (err.name === 'MulterError') {
        // File upload errors
        statusCode = 400;
        error = 'File Upload Error';
        
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File is too large. Maximum size is 5MB.';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Maximum is 5 files.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field';
                break;
            default:
                message = err.message;
        }
        
    } else if (err.statusCode) {
        // Custom error with status code
        statusCode = err.statusCode;
        error = err.error || 'Error';
        message = err.message;
        
    } else if (err.message) {
        // Check for specific error messages
        if (err.message.includes('not found')) {
            statusCode = 404;
            error = 'Not Found';
        } else if (err.message.includes('Unauthorized') || err.message.includes('authentication')) {
            statusCode = 401;
            error = 'Unauthorized';
        }
    }

    // Send error response
    const response = {
        success: false,
        error: error,
        message: message
    };

    // Include details in development mode
    if (process.env.NODE_ENV === 'development' && details) {
        response.details = details;
        response.stack = err.stack;
    } else if (details) {
        response.details = details;
    }

    res.status(statusCode).json(response);
};

// ============================================
// 404 HANDLER
// ============================================

/**
 * Handle undefined routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`,
        suggestion: 'Please check the API endpoint URL'
    });
};

// ============================================
// ASYNC HANDLER WRAPPER
// ============================================

/**
 * Wrap async route handlers to catch errors
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Export all functions
module.exports = {
    sendSuccess,
    sendPaginatedSuccess,
    sendError,
    sendValidationError,
    sendAuthError,
    sendForbiddenError,
    sendNotFoundError,
    sendConflictError,
    errorHandler,
    notFoundHandler,
    asyncHandler
};
