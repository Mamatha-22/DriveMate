/**
 * DriveMate Backend Server
 * 
 * This is the main entry point for the backend API.
 * It sets up Express server, connects to MongoDB, and defines all API routes.
 */

// Load environment variables early
require('dotenv').config();

// ============================================
// IMPORT REQUIRED MODULES
// ============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const logger = require('./config/logger');

// ============================================
// INITIALIZE EXPRESS APP
// ============================================
const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================

// Set security HTTP headers
app.use(helmet());

// Enable CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Request logging (Production)
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting to prevent brute force/DoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// gzip compression
app.use(compression());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// MONGODB CONNECTION
// ============================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/drivemate';

mongoose.connect(MONGODB_URI)
    .then(() => {
        logger.info('✅ MongoDB connected successfully!');
    })
    .catch((error) => {
        logger.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('📡 MongoDB disconnected');
});

// ============================================
// API ROUTES (VERSIONING)
// ============================================

// Import route files
const ownerRoutes = require('./routes/ownerRoutes');
const workerRoutes = require('./routes/workerRoutes');
const workRoutes = require('./routes/workRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Use routes with versioning
const API_VERSION = '/api/v1';

app.use(`${API_VERSION}/owners`, ownerRoutes);
app.use(`${API_VERSION}/workers`, workerRoutes);
app.use(`${API_VERSION}/works`, workRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/admin`, adminRoutes);

// Backward compatibility (optional, can be phased out)
app.use('/api/owners', ownerRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/works', workRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// SYSTEM ROUTES
// ============================================

/**
 * Health Check API
 */
app.get('/health', async (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const status = (dbState === 'connected') ? 200 : 503;
    
    res.status(status).json({
        status: dbState === 'connected' ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        database: {
            status: dbState
        }
    });
});

/**
 * API Root
 */
app.get('/api', (req, res) => {
    res.json({
        name: 'DriveMate API',
        version: '1.1.0',
        docs: `${API_VERSION}/docs`,
        endpoints: {
            v1: `${API_VERSION}`
        }
    });
});

// ============================================
// ERROR HANDLING
// ============================================

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Catch 404
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 DriveMate Backend Server Started on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    logger.info(`📡 API Version: ${API_VERSION}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = app;
