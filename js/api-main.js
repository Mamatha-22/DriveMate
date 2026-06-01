/**
 * DriveMate - API Integration JavaScript
 * 
 * This file connects the frontend to the Node.js + Express + MongoDB backend
 * using fetch() API calls.
 * 
 * Backend Base URL: http://localhost:8080/api
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:8080/api';


// ============================================
// Utility Functions
// ============================================

// Get element by ID - helper function to reduce repetition
function getElement(id) {
    return document.getElementById(id);
}

// Show modal - displays a modal popup
function showModal(modalId) {
    const modal = getElement(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Hide modal - hides a modal popup
function hideModal(modalId) {
    const modal = getElement(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Show alert - displays a temporary alert message
// containerId: ID of the container to show alert in
// message: The message to display
// type: 'success' or 'error' to change alert styling
function showAlert(containerId, message, type = 'success') {
    const container = getElement(containerId);
    if (container) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        container.insertBefore(alert, container.firstChild);
        
        // Remove alert after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Save data to localStorage as JSON string
function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Get data from localStorage and parse as JSON
function getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Remove data from localStorage
function removeFromStorage(key) {
    localStorage.removeItem(key);
}

// Check if user is logged in by checking localStorage
function isLoggedIn(userType) {
    return getFromStorage(`drivemate_${userType}_loggedin`);
}

// Set login status and store user data
function setLoginStatus(userType, userData) {
    saveToStorage(`drivemate_${userType}_loggedin`, userData);
}

// Logout user - clears storage and redirects to home
function logout(userType) {
    // Clear all DriveMate related storage
    removeFromStorage(`drivemate_${userType}_loggedin`);
    removeFromStorage('drivemate_token');
    window.location.href = 'index.html';
}

// Generate unique ID based on timestamp and random number
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date for display (e.g., "Jan 15, 2024")
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}


// ============================================
// Image Handling Functions
// ============================================

// Handle file upload and convert image to base64 string
// Returns a Promise that resolves with the base64 string
function handleImageUpload(fileInput) {
    return new Promise((resolve, reject) => {
        const file = fileInput.files[0];
        if (!file) {
            resolve(null);
            return;
        }
        
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            reject(new Error('Please select a valid image file'));
            return;
        }
        
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            reject(new Error('Image size should be less than 2MB'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = (e) => {
            reject(new Error('Error reading file'));
        };
        reader.readAsDataURL(file);
    });
}

// Create a placeholder image with initials (e.g., "JD" for "John Doe")
function createPlaceholderImage(initials, size = 100) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw blue background
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, 0, size, size);
    
    // Draw white text in center
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size/2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size/2, size/2);
    
    return canvas.toDataURL();
}


// ============================================
// API Functions - Core
// ============================================

/**
 * Generic API request function
 * Makes HTTP requests to the backend API
 * 
 * @param {string} endpoint - API endpoint (e.g., '/owners/login')
 * @param {string} method - HTTP method ('GET', 'POST', 'DELETE', etc.)
 * @param {object|null} body - Request body data (will be JSON stringified)
 * @returns {object} - Response data with success property
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Add JWT token to Authorization header if it exists
        // This authenticates the user for protected routes
        const token = localStorage.getItem('drivemate_token');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Add body for POST, PUT, DELETE requests
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        // Make the API call
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: 'Network error',
            message: 'Could not connect to server. Please check your internet connection.'
        };
    }
}


// ============================================
// Owner API Functions
// ============================================

/**
 * Register a new owner
 * @param {object} formData - Owner registration data
 * @returns {object} - API response
 */
async function registerOwner(formData) {
    const response = await apiRequest('/owners/register', 'POST', formData);
    return response;
}

/**
 * Login an owner
 * @param {string} phone - Owner's phone number
 * @returns {object} - API response with token and user data
 */
async function loginOwner(phone) {
    const response = await apiRequest('/owners/login', 'POST', { phone });
    return response;
}

// ============================================
// OTP Authentication Functions
// ============================================

/**
 * Send OTP to phone number for verification
 * @param {string} phone - Phone number
 * @param {string} userType - 'owner' or 'worker'
 * @param {string} purpose - 'registration' or 'login'
 * @returns {object} - API response
 */
async function sendOTP(phone, userType, purpose) {
    const response = await apiRequest('/auth/send-otp', 'POST', {
        phone: phone,
        userType: userType,
        purpose: purpose
    });
    return response;
}

/**
 * Verify OTP and complete authentication
 * @param {string} phone - Phone number
 * @param {string} otp - 6-digit OTP
 * @param {string} userType - 'owner' or 'worker'
 * @param {string} purpose - 'registration' or 'login'
 * @param {object} additionalData - Additional data for registration (name, password, etc.)
 * @returns {object} - API response with token and user data
 */
async function verifyOTP(phone, otp, userType, purpose, additionalData = {}) {
    const response = await apiRequest('/auth/verify-otp', 'POST', {
        phone: phone,
        otp: otp,
        userType: userType,
        purpose: purpose,
        ...additionalData
    });
    return response;
}

/**
 * Resend OTP if previous one expired
 * @param {string} phone - Phone number
 * @param {string} userType - 'owner' or 'worker'
 * @param {string} purpose - 'registration' or 'login'
 * @returns {object} - API response
 */
async function resendOTP(phone, userType, purpose) {
    const response = await apiRequest('/auth/resend-otp', 'POST', {
        phone: phone,
        userType: userType,
        purpose: purpose
    });
    return response;
}

/**
 * Check if phone is available for registration
 * @param {string} phone - Phone number
 * @param {string} userType - 'owner' or 'worker'
 * @returns {object} - API response with availability status
 */
async function checkPhoneAvailability(phone, userType) {
    const response = await apiRequest('/auth/check-phone', 'POST', {
        phone: phone,
        userType: userType
    });
    return response;
}

/**
 * Get owner profile by ID
 * @param {string} ownerId - Owner's ID
 * @returns {object} - API response with owner data
 */
async function getOwnerProfile(ownerId) {
    const response = await apiRequest(`/owners/${ownerId}`);
    return response;
}


// ============================================
// Worker API Functions
// ============================================

/**
 * Register a new worker
 * @param {object} formData - Worker registration data
 * @returns {object} - API response
 */
async function registerWorker(formData) {
    const response = await apiRequest('/workers/register', 'POST', formData);
    return response;
}

/**
 * Login a worker
 * @param {string} phone - Worker's phone number
 * @returns {object} - API response with token and user data
 */
async function loginWorker(phone) {
    const response = await apiRequest('/workers/login', 'POST', { phone });
    return response;
}

/**
 * Get all workers with optional filters
 * @param {object} filters - Filter parameters (workType, location, verified)
 * @returns {object} - API response with array of workers
 */
async function getWorkers(filters = {}) {
    let endpoint = '/workers';
    const params = new URLSearchParams();
    
    if (filters.workType) params.append('workType', filters.workType);
    if (filters.location) params.append('location', filters.location);
    if (filters.verified) params.append('verified', 'true');
    
    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }
    
    const response = await apiRequest(endpoint);
    return response;
}


// ============================================
// Work Posting API Functions
// ============================================

/**
 * Create a new work posting
 * @param {object} data - Work posting data
 * @returns {object} - API response with created work posting
 */
async function createWorkPosting(data) {
    const response = await apiRequest('/works', 'POST', data);
    return response;
}

/**
 * Get all work postings with optional filters
 * @param {object} filters - Filter parameters (workerType, search)
 * @returns {object} - API response with array of work postings
 */
async function getWorkPostings(filters = {}) {
    let endpoint = '/works';
    const params = new URLSearchParams();
    
    if (filters.workerType) params.append('workerType', filters.workerType);
    if (filters.search) params.append('search', filters.search);
    
    if (params.toString()) {
        endpoint += `?${params.toString()}`;
    }
    
    const response = await apiRequest(endpoint);
    return response;
}

/**
 * Get work postings created by a specific owner
 * @param {string} ownerId - Owner's ID
 * @returns {object} - API response with array of work postings
 */
async function getOwnerWorkPostings(ownerId) {
    const response = await apiRequest(`/works/owner/${ownerId}`);
    return response;
}

/**
 * Get available work postings for a worker (excluding already applied)
 * @param {string} workerId - Worker's ID
 * @returns {object} - API response with array of work postings
 */
async function getAvailableWork(workerId) {
    const response = await apiRequest(`/works/available/${workerId}`);
    return response;
}

/**
 * Get work postings a worker has applied to
 * @param {string} workerId - Worker's ID
 * @returns {object} - API response with array of applied work postings
 */
async function getAppliedWork(workerId) {
    const response = await apiRequest(`/works/applied/${workerId}`);
    return response;
}

/**
 * Apply for a work posting
 * @param {string} workId - Work posting ID
 * @param {string} workerId - Worker's ID
 * @returns {object} - API response
 */
async function applyForWork(workId, workerId) {
    const response = await apiRequest(`/works/${workId}/apply`, 'POST', { workerId });
    return response;
}

/**
 * Delete a work posting
 * @param {string} workId - Work posting ID to delete
 * @returns {object} - API response
 */
async function deleteWorkPosting(workId) {
    const response = await apiRequest(`/works/${workId}`, 'DELETE');
    return response;
}


// ============================================
// Form Event Handlers - Owner Authentication
// ============================================

/**
 * Handle owner registration form submission
 * Uses OTP-based registration flow:
 * 1. Send OTP to phone
 * 2. Verify OTP and complete registration
 */
async function registerOwnerHandler(event) {
    event.preventDefault();
    
    // Get form elements
    const name = getElement('ownerName').value;
    const phone = getElement('ownerPhoneReg').value;
    const city = getElement('ownerCity').value;
    const phoneInput = getElement('ownerPhoneReg');
    const registerBtn = getElement('register-btn');
    
    // Validate phone number
    if (!phone || phone.length !== 10) {
        showAlert('auth-message', 'Please enter a valid 10-digit phone number.', 'error');
        return;
    }
    
    // Get password from user (required for registration)
    const password = prompt('Please create a password for your account (min 6 characters):');
    if (!password || password.length < 6) {
        showAlert('auth-message', 'Password must be at least 6 characters.', 'error');
        return;
    }
    
    // Store form data for OTP verification
    window.ownerRegisterData = {
        name: name,
        phone: phone,
        password: password,
        city: city
    };
    
    // Handle optional photo upload
    let photoData = null;
    const photoInput = getElement('ownerPhoto');
    if (photoInput && photoInput.files[0]) {
        try {
            photoData = await handleImageUpload(photoInput);
            window.ownerRegisterData.photo = photoData;
        } catch (error) {
            showAlert('auth-message', error.message, 'error');
            return;
        }
    }
    
    // Disable button and show loading
    registerBtn.disabled = true;
    registerBtn.textContent = 'Sending OTP...';
    phoneInput.disabled = true;
    
    try {
        // Step 1: Send OTP to phone number
        const sendResponse = await sendOTP(phone, 'owner', 'registration');
        
        if (!sendResponse.success) {
            // Re-enable inputs on failure
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register';
            phoneInput.disabled = false;
            showAlert('auth-message', sendResponse.message || 'Failed to send OTP. Please try again.', 'error');
            return;
        }
        
        // Step 2: Show OTP input UI on success
        showAlert('auth-message', 'OTP sent successfully! Please enter the 6-digit code.', 'success');
        showRegisterOTP();
        
        // Focus on OTP input
        setTimeout(() => {
            const otpInput = getElement('ownerRegisterOTP');
            if (otpInput) otpInput.focus();
        }, 100);
        
    } catch (error) {
        // Re-enable inputs on error
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register';
        phoneInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Registration error:', error);
    }
}

/**
 * Handle owner OTP verification for registration
 */
async function verifyOwnerRegisterOTP(event) {
    event.preventDefault();
    
    const otp = getElement('ownerRegisterOTP').value;
    const verifyBtn = getElement('verify-register-btn');
    const resendBtn = getElement('resend-register-btn');
    const otpInput = getElement('ownerRegisterOTP');
    
    if (!otp || otp.length !== 6) {
        showAlert('auth-message', 'Please enter a valid 6-digit OTP.', 'error');
        return;
    }
    
    // Disable inputs and show loading
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    resendBtn.disabled = true;
    otpInput.disabled = true;
    
    try {
        const registerData = window.ownerRegisterData || {};
        
        const verifyResponse = await verifyOTP(
            registerData.phone, 
            otp, 
            'owner', 
            'registration', 
            {
                name: registerData.name,
                password: registerData.password,
                city: registerData.city,
                photo: registerData.photo
            }
        );
        
        if (verifyResponse.success) {
            // Store JWT token in localStorage
            if (verifyResponse.token) {
                localStorage.setItem('drivemate_token', verifyResponse.token);
            }
            
            // Store user data in localStorage
            setLoginStatus('owner', verifyResponse.user);
            
            showAlert('auth-message', 'Registration successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'owner-dashboard.html';
            }, 1500);
        } else {
            // Re-enable inputs on failure
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Register';
            resendBtn.disabled = false;
            otpInput.disabled = false;
            showAlert('auth-message', verifyResponse.message || 'OTP verification failed. Please try again.', 'error');
        }
    } catch (error) {
        // Re-enable inputs on error
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Register';
        resendBtn.disabled = false;
        otpInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Verification error:', error);
    }
}

/**
 * Handle resend OTP for owner registration
 */
async function resendOwnerRegisterOTP() {
    const registerData = window.ownerRegisterData;
    if (!registerData || !registerData.phone) {
        showAlert('auth-message', 'Session expired. Please register again.', 'error');
        showRegister();
        return;
    }
    
    const resendBtn = getElement('resend-register-btn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
    
    try {
        const sendResponse = await sendOTP(registerData.phone, 'owner', 'registration');
        
        if (sendResponse.success) {
            showAlert('auth-message', 'OTP resent successfully!', 'success');
            resendBtn.textContent = 'Resend OTP';
            resendBtn.disabled = false;
        } else {
            showAlert('auth-message', sendResponse.message || 'Failed to resend OTP.', 'error');
            resendBtn.disabled = false;
        }
    } catch (error) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
    }
}

/**
 * Handle owner login form submission
 * Uses OTP-based login flow:
 * 1. Send OTP to phone
 * 2. Verify OTP and complete login
 */
async function loginOwnerHandler(event) {
    event.preventDefault();
    
    const phone = getElement('ownerPhone').value;
    const phoneInput = getElement('ownerPhone');
    const loginBtn = getElement('login-btn');
    
    // Validate phone number
    if (!phone || phone.length !== 10) {
        showAlert('auth-message', 'Please enter a valid 10-digit phone number.', 'error');
        return;
    }
    
    // Store phone for OTP verification
    window.ownerLoginPhone = phone;
    
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.textContent = 'Sending OTP...';
    phoneInput.disabled = true;
    
    try {
        // Step 1: Send OTP to phone number
        const sendResponse = await sendOTP(phone, 'owner', 'login');
        
        if (!sendResponse.success) {
            // Re-enable inputs on failure
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            phoneInput.disabled = false;
            showAlert('auth-message', sendResponse.message || 'Failed to send OTP. Please try again.', 'error');
            return;
        }
        
        // Step 2: Show OTP input UI on success
        showAlert('auth-message', 'OTP sent successfully! Please enter the 6-digit code.', 'success');
        showLoginOTP();
        
        // Focus on OTP input
        setTimeout(() => {
            const otpInput = getElement('ownerLoginOTP');
            if (otpInput) otpInput.focus();
        }, 100);
        
    } catch (error) {
        // Re-enable inputs on error
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
        phoneInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

/**
 * Handle owner OTP verification for login
 */
async function verifyOwnerLoginOTP(event) {
    event.preventDefault();
    
    const otp = getElement('ownerLoginOTP').value;
    const verifyBtn = getElement('verify-login-btn');
    const resendBtn = getElement('resend-login-btn');
    const otpInput = getElement('ownerLoginOTP');
    
    if (!otp || otp.length !== 6) {
        showAlert('auth-message', 'Please enter a valid 6-digit OTP.', 'error');
        return;
    }
    
    // Disable inputs and show loading
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    resendBtn.disabled = true;
    otpInput.disabled = true;
    
    try {
        const phone = window.ownerLoginPhone;
        
        const verifyResponse = await verifyOTP(phone, otp, 'owner', 'login');
        
        if (verifyResponse.success) {
            // Store JWT token in localStorage
            if (verifyResponse.token) {
                localStorage.setItem('drivemate_token', verifyResponse.token);
            }
            
            // Store user data in localStorage
            setLoginStatus('owner', verifyResponse.user);
            
            showAlert('auth-message', 'Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'owner-dashboard.html';
            }, 1500);
        } else {
            // Re-enable inputs on failure
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Login';
            resendBtn.disabled = false;
            otpInput.disabled = false;
            showAlert('auth-message', verifyResponse.message || 'OTP verification failed. Please try again.', 'error');
        }
    } catch (error) {
        // Re-enable inputs on error
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Login';
        resendBtn.disabled = false;
        otpInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Verification error:', error);
    }
}

/**
 * Handle resend OTP for owner login
 */
async function resendOwnerLoginOTP() {
    const phone = window.ownerLoginPhone;
    if (!phone) {
        showAlert('auth-message', 'Session expired. Please login again.', 'error');
        showLogin();
        return;
    }
    
    const resendBtn = getElement('resend-login-btn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
    
    try {
        const sendResponse = await sendOTP(phone, 'owner', 'login');
        
        if (sendResponse.success) {
            showAlert('auth-message', 'OTP resent successfully!', 'success');
            resendBtn.textContent = 'Resend OTP';
            resendBtn.disabled = false;
        } else {
            showAlert('auth-message', sendResponse.message || 'Failed to resend OTP.', 'error');
            resendBtn.disabled = false;
        }
    } catch (error) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
    }
}


// ============================================
// Form Event Handlers - Worker Authentication
// ============================================

/**
 * Handle worker registration form submission
 * Uses OTP-based registration flow:
 * 1. Send OTP to phone
 * 2. Verify OTP and complete registration
 */
async function registerWorkerHandler(event) {
    event.preventDefault();
    
    // Get form data from input fields
    const name = getElement('workerName').value;
    const phone = getElement('workerPhoneReg').value;
    const workType = getElement('workerType').value;
    const experience = getElement('workerExperience').value;
    const location = getElement('workerLocation').value;
    const phoneInput = getElement('workerPhoneReg');
    const registerBtn = getElement('register-btn');
    
    // Validate phone number
    if (!phone || phone.length !== 10) {
        showAlert('auth-message', 'Please enter a valid 10-digit phone number.', 'error');
        return;
    }
    
    // Get password from user (required for registration)
    const password = prompt('Please create a password for your account (min 6 characters):');
    if (!password || password.length < 6) {
        showAlert('auth-message', 'Password must be at least 6 characters.', 'error');
        return;
    }
    
    // Store form data for OTP verification
    window.workerRegisterData = {
        name: name,
        phone: phone,
        password: password,
        workType: workType,
        experience: experience,
        location: location
    };
    
    // Handle optional photo upload
    let photoData = null;
    const photoInput = getElement('workerPhoto');
    if (photoInput && photoInput.files[0]) {
        try {
            photoData = await handleImageUpload(photoInput);
            window.workerRegisterData.photo = photoData;
        } catch (error) {
            showAlert('auth-message', error.message, 'error');
            return;
        }
    }
    
    // Disable button and show loading
    registerBtn.disabled = true;
    registerBtn.textContent = 'Sending OTP...';
    phoneInput.disabled = true;
    
    try {
        // Step 1: Send OTP to phone number
        const sendResponse = await sendOTP(phone, 'worker', 'registration');
        
        if (!sendResponse.success) {
            // Re-enable inputs on failure
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register';
            phoneInput.disabled = false;
            showAlert('auth-message', sendResponse.message || 'Failed to send OTP. Please try again.', 'error');
            return;
        }
        
        // Step 2: Show OTP input UI on success
        showAlert('auth-message', 'OTP sent successfully! Please enter the 6-digit code.', 'success');
        showRegisterOTP();
        
        // Focus on OTP input
        setTimeout(() => {
            const otpInput = getElement('workerRegisterOTP');
            if (otpInput) otpInput.focus();
        }, 100);
        
    } catch (error) {
        // Re-enable inputs on error
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register';
        phoneInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Registration error:', error);
    }
}

/**
 * Handle worker OTP verification for registration
 */
async function verifyWorkerRegisterOTP(event) {
    event.preventDefault();
    
    const otp = getElement('workerRegisterOTP').value;
    const verifyBtn = getElement('verify-register-btn');
    const resendBtn = getElement('resend-register-btn');
    const otpInput = getElement('workerRegisterOTP');
    
    if (!otp || otp.length !== 6) {
        showAlert('auth-message', 'Please enter a valid 6-digit OTP.', 'error');
        return;
    }
    
    // Disable inputs and show loading
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    resendBtn.disabled = true;
    otpInput.disabled = true;
    
    try {
        const registerData = window.workerRegisterData || {};
        
        const verifyResponse = await verifyOTP(
            registerData.phone, 
            otp, 
            'worker', 
            'registration', 
            {
                name: registerData.name,
                password: registerData.password,
                workType: registerData.workType,
                experience: registerData.experience,
                location: registerData.location,
                photo: registerData.photo
            }
        );
        
        if (verifyResponse.success) {
            // Store JWT token in localStorage
            if (verifyResponse.token) {
                localStorage.setItem('drivemate_token', verifyResponse.token);
            }
            
            // Store user data in localStorage
            setLoginStatus('worker', verifyResponse.user);
            
            showAlert('auth-message', 'Registration successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'worker-dashboard.html';
            }, 1500);
        } else {
            // Re-enable inputs on failure
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Register';
            resendBtn.disabled = false;
            otpInput.disabled = false;
            showAlert('auth-message', verifyResponse.message || 'OTP verification failed. Please try again.', 'error');
        }
    } catch (error) {
        // Re-enable inputs on error
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Register';
        resendBtn.disabled = false;
        otpInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Verification error:', error);
    }
}

/**
 * Handle resend OTP for worker registration
 */
async function resendWorkerRegisterOTP() {
    const registerData = window.workerRegisterData;
    if (!registerData || !registerData.phone) {
        showAlert('auth-message', 'Session expired. Please register again.', 'error');
        showRegister();
        return;
    }
    
    const resendBtn = getElement('resend-register-btn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
    
    try {
        const sendResponse = await sendOTP(registerData.phone, 'worker', 'registration');
        
        if (sendResponse.success) {
            showAlert('auth-message', 'OTP resent successfully!', 'success');
            resendBtn.textContent = 'Resend OTP';
            resendBtn.disabled = false;
        } else {
            showAlert('auth-message', sendResponse.message || 'Failed to resend OTP.', 'error');
            resendBtn.disabled = false;
        }
    } catch (error) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
    }
}

/**
 * Handle worker login form submission
 * Uses OTP-based login flow:
 * 1. Send OTP to phone
 * 2. Verify OTP and complete login
 */
async function loginWorkerHandler(event) {
    event.preventDefault();
    
    const phone = getElement('workerPhone').value;
    const phoneInput = getElement('workerPhone');
    const loginBtn = getElement('login-btn');
    
    // Validate phone number
    if (!phone || phone.length !== 10) {
        showAlert('auth-message', 'Please enter a valid 10-digit phone number.', 'error');
        return;
    }
    
    // Store phone for OTP verification
    window.workerLoginPhone = phone;
    
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.textContent = 'Sending OTP...';
    phoneInput.disabled = true;
    
    try {
        // Step 1: Send OTP to phone number
        const sendResponse = await sendOTP(phone, 'worker', 'login');
        
        if (!sendResponse.success) {
            // Re-enable inputs on failure
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
            phoneInput.disabled = false;
            showAlert('auth-message', sendResponse.message || 'Failed to send OTP. Please try again.', 'error');
            return;
        }
        
        // Step 2: Show OTP input UI on success
        showAlert('auth-message', 'OTP sent successfully! Please enter the 6-digit code.', 'success');
        showLoginOTP();
        
        // Focus on OTP input
        setTimeout(() => {
            const otpInput = getElement('workerLoginOTP');
            if (otpInput) otpInput.focus();
        }, 100);
        
    } catch (error) {
        // Re-enable inputs on error
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
        phoneInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

/**
 * Handle worker OTP verification for login
 */
async function verifyWorkerLoginOTP(event) {
    event.preventDefault();
    
    const otp = getElement('workerLoginOTP').value;
    const verifyBtn = getElement('verify-login-btn');
    const resendBtn = getElement('resend-login-btn');
    const otpInput = getElement('workerLoginOTP');
    
    if (!otp || otp.length !== 6) {
        showAlert('auth-message', 'Please enter a valid 6-digit OTP.', 'error');
        return;
    }
    
    // Disable inputs and show loading
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    resendBtn.disabled = true;
    otpInput.disabled = true;
    
    try {
        const phone = window.workerLoginPhone;
        
        const verifyResponse = await verifyOTP(phone, otp, 'worker', 'login');
        
        if (verifyResponse.success) {
            // Store JWT token in localStorage
            if (verifyResponse.token) {
                localStorage.setItem('drivemate_token', verifyResponse.token);
            }
            
            // Store user data in localStorage
            setLoginStatus('worker', verifyResponse.user);
            
            showAlert('auth-message', 'Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'worker-dashboard.html';
            }, 1500);
        } else {
            // Re-enable inputs on failure
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Login';
            resendBtn.disabled = false;
            otpInput.disabled = false;
            showAlert('auth-message', verifyResponse.message || 'OTP verification failed. Please try again.', 'error');
        }
    } catch (error) {
        // Re-enable inputs on error
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Login';
        resendBtn.disabled = false;
        otpInput.disabled = false;
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
        console.error('Verification error:', error);
    }
}

/**
 * Handle resend OTP for worker login
 */
async function resendWorkerLoginOTP() {
    const phone = window.workerLoginPhone;
    if (!phone) {
        showAlert('auth-message', 'Session expired. Please login again.', 'error');
        showLogin();
        return;
    }
    
    const resendBtn = getElement('resend-login-btn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
    
    try {
        const sendResponse = await sendOTP(phone, 'worker', 'login');
        
        if (sendResponse.success) {
            showAlert('auth-message', 'OTP resent successfully!', 'success');
            resendBtn.textContent = 'Resend OTP';
            resendBtn.disabled = false;
        } else {
            showAlert('auth-message', sendResponse.message || 'Failed to resend OTP.', 'error');
            resendBtn.disabled = false;
        }
    } catch (error) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
        showAlert('auth-message', 'An error occurred. Please try again.', 'error');
    }
}


// ============================================
// Dashboard Functions
// ============================================

/**
 * Check if user is authenticated, redirect to login if not
 * @param {string} userType - 'owner' or 'worker'
 * @returns {object|null} - User data if logged in, null if not
 */
function requireAuth(userType) {
    const user = isLoggedIn(userType);
    if (!user) {
        window.location.href = `${userType}-login.html`;
        return null;
    }
    return user;
}

/**
 * Render the owner dashboard with user info, work postings, and workers
 */
async function renderOwnerDashboard() {
    const owner = requireAuth('owner');
    if (!owner) return;
    
    // Update user info in header
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => el.textContent = owner.name);
    
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(el => {
        el.src = owner.photo || createPlaceholderImage(owner.name.substring(0, 2).toUpperCase());
        el.alt = owner.name;
    });
    
    // Render work postings and available workers
    await renderOwnerWorkPostings();
    await renderAvailableWorkers();
}

/**
 * Render the worker dashboard with profile, available work, and applied work
 */
async function renderWorkerDashboard() {
    const worker = requireAuth('worker');
    if (!worker) return;
    
    // Update user info in header
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => el.textContent = worker.name);
    
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(el => {
        el.src = worker.photo || createPlaceholderImage(worker.name.substring(0, 2).toUpperCase());
        el.alt = worker.name;
    });
    
    // Render profile, available work, and applied work
    await renderWorkerProfile();
    await renderAvailableWork();
    await renderAppliedWork();
}


// ============================================
// Dashboard Render Functions
// ============================================

/**
 * Render work postings created by the logged-in owner
 */
async function renderOwnerWorkPostings() {
    const owner = isLoggedIn('owner');
    const container = getElement('work-postings-list');
    
    if (!container) return;
    
    // Show loading indicator
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading work postings...</p></div>';
    
    try {
        const response = await getOwnerWorkPostings(owner.id);
        
        if (!response.success) {
            container.innerHTML = '<p>Error loading work postings. Please refresh the page.</p>';
            return;
        }
        
        const postings = response.data || [];
        
        if (postings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <h3>No Work Postings Yet</h3>
                    <p>Post your first work requirement to find workers</p>
                    <button class="btn btn-primary mt-20" onclick="showModal('post-work-modal')">Post Work</button>
                </div>
            `;
            return;
        }
        
        // Render each work posting as a card
        container.innerHTML = postings.map(posting => `
            <div class="card">
                <div class="card-header">
                    <h3>${posting.vehicleType.charAt(0).toUpperCase() + posting.vehicleType.slice(1)} - ${posting.workerType.charAt(0).toUpperCase() + posting.workerType.slice(1)}</h3>
                    <span class="status-badge status-pending">${posting.status || 'Active'}</span>
                </div>
                <div class="card-body">
                    <p><span class="label">Location:</span> ${posting.location}</p>
                    <p><span class="label">Duration:</span> ${posting.duration}</p>
                    <p><span class="label">Description:</span> ${posting.description || 'N/A'}</p>
                    <p><span class="label">Posted:</span> ${formatDate(posting.createdAt)}</p>
                    <p><span class="label">Applicants:</span> ${posting.applicantCount || 0}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-small btn-outline" onclick="viewApplicants('${posting._id}')">View Applicants</button>
                    <button class="btn btn-small btn-secondary" onclick="deleteWorkPostingHandler('${posting._id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error rendering work postings:', error);
        container.innerHTML = '<p>Error loading work postings. Please try again.</p>';
    }
}

/**
 * Render available workers for the owner to browse
 */
async function renderAvailableWorkers() {
    const container = getElement('available-workers-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading workers...</p></div>';
    
    try {
        const response = await getWorkers({ verified: true });
        
        if (!response.success) {
            container.innerHTML = '<p>Error loading workers. Please refresh the page.</p>';
            return;
        }
        
        const workers = response.data || [];
        
        if (workers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Workers Found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }
        
        // Render each worker as a card
        container.innerHTML = workers.map(worker => `
            <div class="card">
                <div class="card-header">
                    <h3>${worker.name}</h3>
                    <span class="status-badge ${worker.verified ? 'status-verified' : 'status-unverified'}">
                        ${worker.verified ? 'Verified' : 'Not Verified'}
                    </span>
                </div>
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${worker.photo || createPlaceholderImage(worker.name.substring(0, 2).toUpperCase())}" alt="${worker.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <p><span class="label">Work Type:</span> ${worker.workType.charAt(0).toUpperCase() + worker.workType.slice(1)}</p>
                            <p><span class="label">Experience:</span> ${worker.experience} years</p>
                            <p><span class="label">Location:</span> ${worker.location}</p>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-small btn-success" onclick="contactWorker('${worker.phone}')">Contact Worker</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error rendering workers:', error);
        container.innerHTML = '<p>Error loading workers. Please try again.</p>';
    }
}

/**
 * Render worker profile information
 */
async function renderWorkerProfile() {
    const worker = isLoggedIn('worker');
    const container = getElement('worker-profile');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                    <img src="${worker.photo || createPlaceholderImage(worker.name.substring(0, 2).toUpperCase())}" alt="${worker.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h3>${worker.name}</h3>
                        <p><span class="label">Phone:</span> ${worker.phone}</p>
                        <p><span class="label">Location:</span> ${worker.location}</p>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <p class="label">Work Type</p>
                        <p>${worker.workType.charAt(0).toUpperCase() + worker.workType.slice(1)}</p>
                    </div>
                    <div>
                        <p class="label">Experience</p>
                        <p>${worker.experience} years</p>
                    </div>
                    <div>
                        <p class="label">Verification Status</p>
                        <p>${worker.verified ? 'Verified' : 'Not Verified'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render available work postings for workers to apply to
 */
async function renderAvailableWork() {
    const worker = isLoggedIn('worker');
    const container = getElement('available-work-list');
    const messageContainer = getElement('work-list-message');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading available work...</p></div>';
    
    try {
        // Get both all work postings and exclude already applied
        const response = await getWorkPostings({});
        
        if (!response.success) {
            container.innerHTML = '<p>Error loading work. Please refresh the page.</p>';
            return;
        }
        
        let workPostings = response.data || [];
        
        // Filter out work the worker has already applied to
        if (worker) {
            const appliedResponse = getAppliedWork(worker.id);
            // If API returns applied work, filter those out
        }
        
        if (workPostings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Work Available</h3>
                    <p>Check back later for new opportunities</p>
                </div>
            `;
            return;
        }
        
        // Render each work posting as a card
        container.innerHTML = workPostings.map(work => `
            <div class="card">
                <div class="card-header">
                    <h3>${work.vehicleType.charAt(0).toUpperCase() + work.vehicleType.slice(1)} - ${work.workerType.charAt(0).toUpperCase() + work.workerType.slice(1)}</h3>
                    <span class="status-badge status-verified">Available</span>
                </div>
                <div class="card-body">
                    <p><span class="label">Owner:</span> ${work.ownerName}</p>
                    <p><span class="label">Location:</span> ${work.location}</p>
                    <p><span class="label">Duration:</span> ${work.duration}</p>
                    <p><span class="label">Description:</span> ${work.description || 'N/A'}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-small btn-primary" onclick="applyForWorkHandler('${work._id}')">Apply Now</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error rendering available work:', error);
        container.innerHTML = '<p>Error loading work. Please try again.</p>';
    }
}

/**
 * Render work postings the worker has applied to
 */
async function renderAppliedWork() {
    const worker = isLoggedIn('worker');
    const container = getElement('applied-work-list');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading your applications...</p></div>';
    
    try {
        const response = await getAppliedWork(worker.id);
        
        if (!response.success) {
            container.innerHTML = '<p>Error loading applications. Please refresh the page.</p>';
            return;
        }
        
        const appliedWork = response.data || [];
        
        if (appliedWork.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <h3>No Applications Yet</h3>
                    <p>Apply for work to see your applications here</p>
                </div>
            `;
            return;
        }
        
        // Render each applied work as a card
        container.innerHTML = appliedWork.map(work => `
            <div class="card">
                <div class="card-header">
                    <h3>${work.vehicleType.charAt(0).toUpperCase() + work.vehicleType.slice(1)} - ${work.workerType.charAt(0).toUpperCase() + work.workerType.slice(1)}</h3>
                    <span class="status-badge status-verified">Applied</span>
                </div>
                <div class="card-body">
                    <p><span class="label">Owner:</span> ${work.ownerName}</p>
                    <p><span class="label">Location:</span> ${work.location}</p>
                    <p><span class="label">Duration:</span> ${work.duration}</p>
                    <p><span class="label">Posted:</span> ${formatDate(work.createdAt)}</p>
                    <div class="contact-display">
                        <p class="label">Contact Owner:</p>
                        <p class="phone">${work.ownerPhone}</p>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-small btn-success" onclick="contactOwner('${work.ownerPhone}')">Call Owner</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error rendering applied work:', error);
        container.innerHTML = '<p>Error loading applications. Please try again.</p>';
    }
}


// ============================================
// Work Posting Functions
// ============================================

/**
 * Handle new work posting form submission
 */
async function postWorkHandler(event) {
    event.preventDefault();
    
    const owner = isLoggedIn('owner');
    if (!owner) {
        showAlert('work-message', 'Please login first', 'error');
        return;
    }
    
    const formData = {
        ownerId: owner._id || owner.id,
        ownerName: owner.name,
        ownerPhone: owner.phone,
        vehicleType: getElement('vehicleType').value,
        workerType: getElement('workerType').value,
        location: getElement('workLocation').value,
        duration: getElement('workDuration').value,
        description: getElement('workDescription').value
    };
    
    try {
        const response = await createWorkPosting(formData);
        
        if (response.success) {
            hideModal('post-work-modal');
            showAlert('dashboard-message', 'Work posted successfully!', 'success');
            
            // Reset form
            getElement('post-work-form').reset();
            
            // Refresh work postings
            await renderOwnerWorkPostings();
        } else {
            showAlert('work-message', response.message || 'Failed to post work. Please try again.', 'error');
        }
    } catch (error) {
        showAlert('work-message', 'An error occurred. Please try again.', 'error');
        console.error('Post work error:', error);
    }
}

/**
 * Delete a work posting
 */
async function deleteWorkPostingHandler(workId) {
    if (!confirm('Are you sure you want to delete this work posting?')) {
        return;
    }
    
    try {
        const response = await deleteWorkPosting(workId);
        
        if (response.success) {
            showAlert('dashboard-message', 'Work posting deleted successfully', 'success');
            await renderOwnerWorkPostings();
        } else {
            showAlert('dashboard-message', response.message || 'Failed to delete. Please try again.', 'error');
        }
    } catch (error) {
        showAlert('dashboard-message', 'An error occurred. Please try again.', 'error');
        console.error('Delete work error:', error);
    }
}

/**
 * View applicants for a work posting
 */
function viewApplicants(workId) {
    showModal('applicants-modal');
    document.getElementById('applicants-list').innerHTML = '<p>Applicant details would be loaded here</p>';
}


// ============================================
// Worker Action Functions
// ============================================

/**
 * Apply for a work posting
 */
async function applyForWorkHandler(workId) {
    const worker = isLoggedIn('worker');
    if (!worker) {
        showAlert('work-list-message', 'Please login first to apply', 'error');
        return;
    }
    
    try {
        const response = await applyForWork(workId, worker._id || worker.id);
        
        if (response.success) {
            showAlert('work-list-message', response.message || 'Application submitted successfully!', 'success');
            
            // Refresh work lists
            await renderAvailableWork();
            await renderAppliedWork();
        } else {
            showAlert('work-list-message', response.message || 'Failed to apply. Please try again.', 'error');
        }
    } catch (error) {
        showAlert('work-list-message', 'An error occurred. Please try again.', 'error');
        console.error('Apply work error:', error);
    }
}

/**
 * Contact a worker (from owner dashboard)
 */
function contactWorker(phone) {
    showAlert('dashboard-message', `Calling ${phone}...`, 'success');
    window.location.href = `tel:${phone}`;
}

/**
 * Contact an owner (from worker dashboard)
 */
function contactOwner(phone) {
    window.location.href = `tel:${phone}`;
}


// ============================================
// Tab Functions
// ============================================

/**
 * Switch between dashboard tabs
 */
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to selected content
    const selectedContent = getElement(`${tabName}-tab`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
}


// ============================================
// Search and Filter Functions
// ============================================

/**
 * Search and filter workers
 */
async function searchWorkers() {
    const searchTerm = getElement('worker-search').value.toLowerCase();
    const workerType = getElement('worker-type-filter').value;
    
    const filters = {};
    
    if (searchTerm) {
        filters.location = searchTerm;
    }
    if (workerType) {
        filters.workType = workerType;
    }
    
    const response = await getWorkers(filters);
    
    if (response.success) {
        renderFilteredWorkers(response.data);
    }
}

/**
 * Render filtered workers list
 */
function renderFilteredWorkers(workers) {
    const container = getElement('available-workers-list');
    if (!container) return;
    
    if (!workers || workers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Workers Found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = workers.map(worker => `
        <div class="card">
            <div class="card-header">
                <h3>${worker.name}</h3>
                <span class="status-badge ${worker.verified ? 'status-verified' : 'status-unverified'}">
                    ${worker.verified ? 'Verified' : 'Not Verified'}
                </span>
            </div>
            <div class="card-body">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <img src="${worker.photo || createPlaceholderImage(worker.name.substring(0, 2).toUpperCase())}" alt="${worker.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <p><span class="label">Work Type:</span> ${worker.workType.charAt(0).toUpperCase() + worker.workType.slice(1)}</p>
                        <p><span class="label">Experience:</span> ${worker.experience} years</p>
                        <p><span class="label">Location:</span> ${worker.location}</p>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-success" onclick="contactWorker('${worker.phone}')">Contact Worker</button>
            </div>
        </div>
    `).join('');
}

/**
 * Search and filter available work
 */
async function searchWork() {
    const searchTerm = getElement('work-search').value.toLowerCase();
    const workType = getElement('work-type-filter').value;
    
    const filters = {};
    
    if (searchTerm) {
        filters.search = searchTerm;
    }
    if (workType) {
        filters.workerType = workType;
    }
    
    const response = await getWorkPostings(filters);
    
    if (response.success) {
        renderFilteredWork(response.data);
    }
}

/**
 * Render filtered work list
 */
function renderFilteredWork(workPostings) {
    const container = getElement('available-work-list');
    if (!container) return;
    
    if (!workPostings || workPostings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Work Found</h3>
                <p>Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = workPostings.map(work => `
        <div class="card">
            <div class="card-header">
                <h3>${work.vehicleType.charAt(0).toUpperCase() + work.vehicleType.slice(1)} - ${work.workerType.charAt(0).toUpperCase() + work.workerType.slice(1)}</h3>
                <span class="status-badge status-verified">Available</span>
            </div>
            <div class="card-body">
                <p><span class="label">Owner:</span> ${work.ownerName}</p>
                <p><span class="label">Location:</span> ${work.location}</p>
                <p><span class="label">Duration:</span> ${work.duration}</p>
                <p><span class="label">Description:</span> ${work.description || 'N/A'}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="applyForWorkHandler('${work._id}')">Apply Now</button>
            </div>
        </div>
    `).join('');
}


// ============================================
// Initialization - Event Listeners
// ============================================

/**
 * This runs when the page finishes loading
 * Sets up all form submissions, search inputs, and dashboard rendering
 */
document.addEventListener('DOMContentLoaded', function() {
    // ===== Form Event Listeners =====
    
    // Owner registration form
    const ownerRegisterForm = getElement('owner-register-form');
    if (ownerRegisterForm) {
        ownerRegisterForm.addEventListener('submit', registerOwnerHandler);
    }
    
    // Owner login form
    const ownerLoginForm = getElement('owner-login-form');
    if (ownerLoginForm) {
        ownerLoginForm.addEventListener('submit', loginOwnerHandler);
    }
    
    // Worker registration form
    const workerRegisterForm = getElement('worker-register-form');
    if (workerRegisterForm) {
        workerRegisterForm.addEventListener('submit', registerWorkerHandler);
    }
    
    // Worker login form
    const workerLoginForm = getElement('worker-login-form');
    if (workerLoginForm) {
        workerLoginForm.addEventListener('submit', loginWorkerHandler);
    }
    
    // Post work form
    const postWorkForm = getElement('post-work-form');
    if (postWorkForm) {
        postWorkForm.addEventListener('submit', postWorkHandler);
    }
    
    // ===== Modal Close Buttons =====
    
    // Close modal when X button is clicked
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close modal when clicking outside (on the background)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // ===== Search and Filter Inputs =====
    
    // Worker search
    const workerSearch = getElement('worker-search');
    if (workerSearch) {
        workerSearch.addEventListener('input', searchWorkers);
    }
    
    // Worker type filter
    const workerTypeFilter = getElement('worker-type-filter');
    if (workerTypeFilter) {
        workerTypeFilter.addEventListener('change', searchWorkers);
    }
    
    // Work search
    const workSearch = getElement('work-search');
    if (workSearch) {
        workSearch.addEventListener('input', searchWork);
    }
    
    // Work type filter
    const workTypeFilter = getElement('work-type-filter');
    if (workTypeFilter) {
        workTypeFilter.addEventListener('change', searchWork);
    }
    
    // ===== Dashboard Rendering =====
    
    // Render owner dashboard if on that page
    if (getElement('owner-dashboard')) {
        renderOwnerDashboard();
    }
    
    // Render worker dashboard if on that page
    if (getElement('worker-dashboard')) {
        renderWorkerDashboard();
    }
    
    // ===== Logout Buttons =====
    
    // Handle logout button clicks
    document.querySelectorAll('.logout-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userType = this.dataset.userType;
            logout(userType);
        });
    });
});
