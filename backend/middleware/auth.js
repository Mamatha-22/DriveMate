/**
 * Authentication Middleware
 * 
 * This middleware handles JWT token verification for protected routes.
 * It ensures only authenticated users can access certain API endpoints.
 */

// Import JWT library for token operations
const jwt = require('jsonwebtoken');

// JWT secret key - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'drivemate_jwt_secret_key_2024';

/**
 * Verify JWT Token Middleware
 * 
 * This function checks if the request has a valid JWT token in the Authorization header.
 * If valid, it adds the user data to req.user; otherwise, it returns an error.
 */
const auth = async (req, res, next) => {
    try {
        // Get token from Authorization header
        // Format: "Bearer <token>"
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
                message: 'Please provide a valid authentication token'
            });
        }

        // Check if token has "Bearer" prefix
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format',
                message: 'Token must be in format: Bearer <token>'
            });
        }

        // Extract token from "Bearer <token>"
        const token = authHeader.replace('Bearer ', '');

        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Add user data to request object
        req.user = decoded;
        req.userId = decoded.id;
        req.userRole = decoded.role;

        // Continue to the next middleware/route
        next();

    } catch (error) {
        // Handle different JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'The provided token is invalid'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                message: 'Your authentication token has expired. Please login again.'
            });
        }

        // Generic error
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            message: 'Failed to authenticate user'
        });
    }
};

/**
 * Generate JWT Token
 * 
 * Helper function to generate a JWT token for a user.
 * @param {Object} user - User object containing id, role, and other data
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    // Create token payload
    const payload = {
        id: user._id || user.id,
        role: user.role,
        phone: user.phone,
        name: user.name
    };

    // Sign and return token (expires in 7 days)
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Optional Auth Middleware
 * 
 * Similar to auth(), but doesn't fail if no token is provided.
 * Useful for routes that can work with or without authentication.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            req.userId = decoded.id;
            req.userRole = decoded.role;
        }

        next();
    } catch (error) {
        // Don't fail - just continue without auth
        next();
    }
};

/**
 * Role-Based Access Control Middleware
 * 
 * Factory function that creates middleware to check user roles.
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // First, check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
                message: 'Please login to access this resource'
            });
        }

        // Check if user's role is allowed
        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: `This action is only available for ${allowedRoles.join(' or ')} accounts`
            });
        }

        next();
    };
};

module.exports = {
    auth,
    generateToken,
    optionalAuth,
    requireRole,
    JWT_SECRET
};
