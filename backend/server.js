/**
 * DriveMate Backend Server
 * 
 * This is the main entry point for the backend API.
 * It sets up Express server, connects to MongoDB, and defines all API routes.
 * 
 * Run this file to start the backend server.
 */

// ============================================
// IMPORT REQUIRED MODULES
// ============================================
const express = require('express');           // Express web framework
const mongoose = require('mongoose');         // MongoDB object modeling
const cors = require('cors');                 // Cross-origin resource sharing
const path = require('path');                 // File path utilities

// ============================================
// INITIALIZE EXPRESS APP
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE (Functions that run before routes)
// ============================================

// Parse JSON bodies from POST requests
app.use(express.json());

// Parse URL-encoded bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Enable CORS - allows frontend to communicate with backend
app.use(cors());

// Serve uploaded files statically
// This makes files in the 'uploads' folder accessible via URL
// e.g., http://localhost:3000/uploads/profiles/photo.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// MONGODB CONNECTION
// ============================================

// MongoDB connection string
// For local MongoDB: 'mongodb://localhost:27017/drivemate'
// For MongoDB Atlas (cloud): 'mongodb+srv://username:password@cluster.mongodb.net/drivemate'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/drivemate';

/**
 * Connect to MongoDB database
 */
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully!');
        console.log(`📁 Database: drivemate`);
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('💡 Make sure MongoDB is running or check your connection string');
    });

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
    console.log('📡 Connected to MongoDB server');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('📡 MongoDB disconnected');
});

// ============================================
// IMPORT ROUTES
// ============================================

// Import route files - these define our API endpoints
const ownerRoutes = require('./routes/ownerRoutes');
const workerRoutes = require('./routes/workerRoutes');
const workRoutes = require('./routes/workRoutes');

// ============================================
// USE ROUTES (Define API Endpoints)
// ============================================

// All owner-related routes will be at /api/owners
app.use('/api/owners', ownerRoutes);

// All worker-related routes will be at /api/workers
app.use('/api/workers', workerRoutes);

// All work posting routes will be at /api/works
app.use('/api/works', workRoutes);

// ============================================
// API TEST ROUTE
// ============================================

/**
 * GET /api/test
 * Simple test route to verify backend is running
 */
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'DriveMate API is running!',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// HEALTH CHECK ROUTE
// ============================================

/**
 * GET /api/health
 * Check if server and database are healthy
 */
app.get('/api/health', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        res.json({
            server: 'running',
            database: dbState,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API DOCUMENTATION ROUTE
// ============================================

/**
 * GET /api
 * API documentation - shows all available endpoints
 */
app.get('/api', (req, res) => {
    res.json({
        name: 'DriveMate API',
        version: '1.0.0',
        description: 'Backend API for DriveMate worker-owner matching platform',
        endpoints: {
            owners: {
                'POST /api/owners/register': 'Register a new owner',
                'POST /api/owners/login': 'Login owner (returns JWT token)',
                'GET /api/owners': 'Get all owners (with filters)',
                'GET /api/owners/:id': 'Get owner profile',
                'GET /api/owners/me': 'Get current owner profile (auth required)',
                'PUT /api/owners/me': 'Update current owner profile (auth required)',
                'POST /api/owners/me/verify': 'Upload verification documents (auth required)',
                'POST /api/owners/me/reviews/:workerId': 'Rate a worker (auth required)',
                'GET /api/owners/me/reviews': 'Get reviews given by owner (auth required)',
                'GET /api/owners/me/reviews/received': 'Get reviews received by owner (auth required)'
            },
            workers: {
                'POST /api/workers/register': 'Register a new worker',
                'POST /api/workers/login': 'Login worker (returns JWT token)',
                'GET /api/workers': 'Get all workers (with filters)',
                'GET /api/workers/:id': 'Get worker profile',
                'GET /api/workers/me': 'Get current worker profile (auth required)',
                'PUT /api/workers/me': 'Update current worker profile (auth required)',
                'POST /api/workers/me/verify': 'Upload verification documents (auth required)',
                'POST /api/workers/me/reviews/:ownerId': 'Rate an owner (auth required)',
                'GET /api/workers/me/reviews': 'Get reviews given by worker (auth required)',
                'GET /api/workers/me/reviews/received': 'Get reviews received by worker (auth required)'
            },
            works: {
                'GET /api/works': 'Get all active work postings',
                'GET /api/works/recent': 'Get recent work postings',
                'GET /api/works/:id': 'Get single work posting',
                'POST /api/works': 'Create work posting (owner only, auth required)',
                'PUT /api/works/:id': 'Update work posting (owner only, auth required)',
                'DELETE /api/works/:id': 'Delete work posting (owner only, auth required)',
                'GET /api/works/available': 'Get available work for worker (auth required)',
                'GET /api/works/applied': 'Get work applied by worker (auth required)',
                'POST /api/works/:id/apply': 'Apply for work (worker only, auth required)',
                'DELETE /api/works/:id/apply': 'Withdraw application (worker only, auth required)',
                'GET /api/works/my-postings': 'Get my work postings (owner only, auth required)',
                'GET /api/works/:id/applicants': 'Get applicants for posting (owner only, auth required)',
                'PUT /api/works/:id/applicants/:workerId': 'Accept/reject applicant (owner only, auth required)',
                'PUT /api/works/:id/close': 'Close work posting (owner only, auth required)',
                'PUT /api/works/:id/reopen': 'Reopen work posting (owner only, auth required)'
            },
            uploads: {
                'GET /uploads/profiles': 'Access profile photos',
                'GET /uploads/documents': 'Access uploaded documents'
            }
        },
        authentication: {
            type: 'JWT (Bearer Token)',
            header: 'Authorization: Bearer <token>',
            note: 'Add JWT token to Authorization header for protected routes'
        },
        timestamp: new Date().toISOString()
    });
});

// ============================================
// 404 HANDLER (Catch undefined routes)
// ============================================

app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.url}`,
        suggestion: 'Check the API documentation at GET /api'
    });
});

// ============================================
// ERROR HANDLER (Global error middleware)
// ============================================

// Import error handler middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Use error handler middleware
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

/**
 * Start the Express server on specified PORT
 */
app.listen(PORT, () => {
    console.log('🚀 DriveMate Backend Server Started!');
    console.log(`📡 Server running at http://localhost:${PORT}`);
    console.log(`🧪 Test API at http://localhost:${PORT}/api/test`);
    console.log(`📖 API Docs at http://localhost:${PORT}/api`);
    console.log('\n📝 Available API endpoints:');
    console.log('   POST /api/owners/register   - Register owner');
    console.log('   POST /api/owners/login     - Login owner');
    console.log('   POST /api/workers/register  - Register worker');
    console.log('   POST /api/workers/login    - Login worker');
    console.log('   GET  /api/works            - Get all work postings');
    console.log('   POST /api/works            - Create work posting (auth required)');
    console.log('\n💡 Press Ctrl+C to stop the server');
});

// Export app for testing purposes
module.exports = app;
