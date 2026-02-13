/**
 * Multer File Upload Configuration
 * 
 * This configures file uploads for verification documents (Aadhaar, DL, etc.)
 * and profile photos.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// ENSURE UPLOAD DIRECTORIES EXIST
// ============================================

// Base upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Create directories if they don't exist
const directories = [
    UPLOAD_DIR,
    path.join(UPLOAD_DIR, 'profiles'),
    path.join(UPLOAD_DIR, 'documents'),
    path.join(UPLOAD_DIR, 'aadhaar'),
    path.join(UPLOAD_DIR, 'driving-license')
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================
// FILE STORAGE CONFIGURATION
// ============================================

// Configure storage for profile photos
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(UPLOAD_DIR, 'profiles'));
    },
    filename: (req, file, cb) => {
        // Generate unique filename: fieldname-timestamp-extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for Aadhaar documents
const aadhaarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(UPLOAD_DIR, 'aadhaar'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `aadhaar-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for driving license
const drivingLicenseStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(UPLOAD_DIR, 'driving-license'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `dl-${uniqueSuffix}${ext}`);
    }
});

// Configure storage for general documents
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(UPLOAD_DIR, 'documents'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `doc-${uniqueSuffix}${ext}`);
    }
});

// ============================================
// FILE FILTER FUNCTIONS
// ============================================

/**
 * Filter for image files only (for profile photos)
 */
const imageFileFilter = (req, file, cb) => {
    // Allowed image types
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
};

/**
 * Filter for document files (PDF, images)
 */
const documentFileFilter = (req, file, cb) => {
    // Allowed types for documents
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Only document files (JPEG, PNG, PDF) are allowed'));
};

/**
 * Filter for any file type
 */
const anyFileFilter = (req, file, cb) => {
    cb(null, true);
};

// ============================================
// MULTER INSTANCES
// ============================================

// Profile photo upload (max 2MB)
const profileUpload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: imageFileFilter
});

// Aadhaar document upload (max 5MB)
const aadhaarUpload = multer({
    storage: aadhaarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: documentFileFilter
});

// Driving license upload (max 5MB)
const drivingLicenseUpload = multer({
    storage: drivingLicenseStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: documentFileFilter
});

// General document upload (max 5MB)
const documentUpload = multer({
    storage: documentStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: anyFileFilter
});

// Multiple file upload for verification (Aadhaar + DL)
const verificationUpload = multer({
    storage: aadhaarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: documentFileFilter
}).fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
]);

// ============================================
// EXPORT CONFIGURATIONS
// ============================================

module.exports = {
    // Multer instances
    profileUpload,
    aadhaarUpload,
    drivingLicenseUpload,
    documentUpload,
    verificationUpload,
    
    // Storage paths
    UPLOAD_DIR,
    PROFILES_DIR: path.join(UPLOAD_DIR, 'profiles'),
    DOCUMENTS_DIR: path.join(UPLOAD_DIR, 'documents'),
    AADHAAR_DIR: path.join(UPLOAD_DIR, 'aadhaar'),
    DRIVING_LICENSE_DIR: path.join(UPLOAD_DIR, 'driving-license'),
    
    // Helper function to get file URL
    getFileUrl: (filename) => {
        return `/uploads/${filename}`;
    },
    
    // Helper function to delete a file
    deleteFile: (filepath) => {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        return false;
    }
};
