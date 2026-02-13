/**
 * DriveMate - Main JavaScript (Backend Connected Version)
 * 
 * This version connects to the Node.js + Express + MongoDB backend
 * instead of using localStorage.
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:3000/api';

// ============================================
// Utility Functions
// ============================================

// Get element by ID
function getElement(id) {
    return document.getElementById(id);
}

// Show modal
function showModal(modalId) {
    const modal = getElement(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Hide modal
function hideModal(modalId) {
    const modal = getElement(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Show alert
function showAlert(containerId, message, type = 'success') {
    const container = getElement(containerId);
    if (container) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Save to localStorage
function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Get from localStorage
function getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Remove from localStorage
function removeFromStorage(key) {
    localStorage.removeItem(key);
}

// Check if user is logged in
function isLoggedIn(userType) {
    return getFromStorage(`drivemate_${userType}_loggedin`);
}

// Set login status
function setLoginStatus(userType, userData) {
    saveToStorage(`drivemate_${userType}_loggedin`, userData);
}

// Logout user
function logout(userType) {
    removeFromStorage(`drivemate_${userType}_loggedin`);
    window.location.href = 'index.html';
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ============================================
// API Functions
// ============================================

// Generic API request function
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: 'Network error',
            message: 'Could not connect to server'
        };
    }
}

// ============================================
// Owner API Functions
// ============================================

// Register owner
async function registerOwner(formData) {
    const response = await apiRequest('/owners/register', 'POST', formData);
    return response;
}

// Login owner
async function loginOwner(phone) {
    const response = await apiRequest('/owners/login', 'POST', { phone });
    return response;
}

// Get owner profile
async function getOwnerProfile(ownerId) {
    const response = await apiRequest(`/owners/${ownerId}`);
    return response;
}

// ============================================
// Worker API Functions
// ============================================

// Register worker
async function registerWorker(formData) {
    const response = await apiRequest('/workers/register', 'POST', formData);
    return response;
}

// Login worker
async function loginWorker(phone) {
    const response = await apiRequest('/workers/login', 'POST', { phone });
    return response;
}

// Get all workers (with filters)
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

// Create work posting
async function createWorkPosting(data) {
    const response = await apiRequest('/works', 'POST', data);
    return response;
}

// Get all work postings
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

// Get work postings by owner
async function getOwnerWorkPostings(ownerId) {
    const response = await apiRequest(`/works/owner/${ownerId}`);
    return response;
}

// Get available work for worker
async function getAvailableWork(workerId) {
    const response = await apiRequest(`/works/available/${workerId}`);
    return response;
}

// Get applied work by worker
async function getAppliedWork(workerId) {
    const response = await apiRequest(`/works/applied/${workerId}`);
    return response;
}

// Apply for work
async function applyForWork(workId, workerId) {
    const response = await apiRequest(`/works/${workId}/apply`, 'POST', { workerId });
    return response;
}

// Delete work posting
async function deleteWorkPosting(workId) {
    const response = await apiRequest(`/works/${workId}`, 'DELETE');
    return response;
}

// ============================================
// Image Handling
// ============================================

// Handle file upload and return base64 string
function handleImageUpload(fileInput) {
    return new Promise((resolve, reject) => {
        const file = fileInput.files[0];
        if (!file) {
            resolve(null);
            return;
        }
        
        // Check file type
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

// Create placeholder image
function createPlaceholderImage(initials, size = 100) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, 0, size, size);
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size/2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size/2, size/2);
    
    return canvas.toDataURL();
}

// ============================================
// Authentication Functions
// ============================================

// Register owner
async function registerOwnerHandler(event) {
    event.preventDefault();
    
    const formData = {
        name: getElement('ownerName').value,
        phone: getElement('ownerPhoneReg').value,
        city: getElement('ownerCity').value
    };
    
    // Handle photo upload
    const photoInput = getElement('ownerPhoto');
    if (photoInput && photoInput.files[0]) {
        try {
            formData.photo = await handleImageUpload(photoInput);
        } catch (error) {
            showAlert('auth-message', error.message, 'error');
            return;
        }
    }
    
    // Call API
    const response = await registerOwner(formData);
    
    if (response.success) {
        showAlert('auth-message', 'Registration successful! Please login.', 'success');
        setTimeout(() => {
            window.location.href = 'owner-login.html';
        }, 1500);
    } else {
        showAlert('auth-message', response.message || 'Registration failed', 'error');
    }
}

// Login owner
async function loginOwnerHandler(event) {
    event.preventDefault();
    
    const phone = getElement('ownerPhone').value;
    
    // Call API
    const response = await loginOwner(phone);
    
    if (response.success) {
        setLoginStatus('owner', response.data);
        window.location.href = 'owner-dashboard.html';
    } else {
        showAlert('auth-message', response.message || 'Login failed', 'error');
    }
}

// Register worker
async function registerWorkerHandler(event) {
    event.preventDefault();
    
    const formData = {
        name: getElement('workerName').value,
        phone: getElement('workerPhoneReg').value,
        workType: getElement('workerType').value,
        experience: getElement('workerExperience').value,
        location: getElement('workerLocation').value
    };
    
    // Handle photo upload
    const photoInput = getElement('workerPhoto');
    if (photoInput && photoInput.files[0]) {
        try {
            formData.photo = await handleImageUpload(photoInput);
        } catch (error) {
            showAlert('auth-message', error.message, 'error');
            return;
        }
    }
    
    // Call API
    const response = await registerWorker(formData);
    
    if (response.success) {
        showAlert('auth-message', 'Registration successful! Please login.', 'success');
        setTimeout(() => {
            window.location.href = 'worker-login.html';
        }, 1500);
    } else {
        showAlert('auth-message', response.message || 'Registration failed', 'error');
    }
}

// Login worker
async function loginWorkerHandler(event) {
    event.preventDefault();
    
    const phone = getElement('workerPhone').value;
    
    // Call API
    const response = await loginWorker(phone);
    
    if (response.success) {
        setLoginStatus('worker', response.data);
        window.location.href = 'worker-dashboard.html';
    } else {
        showAlert('auth-message', response.message || 'Login failed', 'error');
    }
}

// ============================================
// Dashboard Functions
// ============================================

// Check authentication and redirect if not logged in
function requireAuth(userType) {
    const user = isLoggedIn(userType);
    if (!user) {
        window.location.href = `${userType}-login.html`;
        return null;
    }
    return user;
}

// Render owner dashboard
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
    
    // Render work postings
    await renderOwnerWorkPostings();
    
    // Render available workers
    await renderAvailableWorkers();
}

// Render work postings by owner
async function renderOwnerWorkPostings() {
    const owner = isLoggedIn('owner');
    const container = getElement('work-postings-list');
    
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    // Call API
    const response = await getOwnerWorkPostings(owner.id);
    
    if (!response.success) {
        container.innerHTML = '<p>Error loading work postings</p>';
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
    
    container.innerHTML = postings.map(posting => `
        <div class="card">
            <div class="card-header">
                <h3>${posting.vehicleType.charAt(0).toUpperCase() + posting.vehicleType.slice(1)} - ${posting.workerType.charAt(0).toUpperCase() + posting.workerType.slice(1)}</h3>
                <span class="status-badge status-pending">${posting.status || 'Active'}</span>
            </div>
            <div class="card-body">
                <p><span class="label">Location:</span> ${posting.location}</p>
                <p><span class="label">Duration:</span> ${posting.duration}</p>
                <p><span class="label">Description:</span> ${posting.description}</p>
                <p><span class="label">Posted:</span> ${formatDate(posting.createdAt)}</p>
                <p><span class="label">Applicants:</span> ${posting.applicantCount || 0}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-outline" onclick="viewApplicants('${posting.id}')">View Applicants</button>
                <button class="btn btn-small btn-secondary" onclick="deleteWorkPostingHandler('${posting.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render available workers
async function renderAvailableWorkers() {
    const container = getElement('available-workers-list');
    
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    // Call API
    const response = await getWorkers();
    
    if (!response.success) {
        container.innerHTML = '<p>Error loading workers</p>';
        return;
    }
    
    const workers = response.data || [];
    
    if (workers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <h3>No Workers Available</h3>
                <p>No workers have registered yet</p>
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

// Render worker dashboard
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
    
    // Render profile
    renderWorkerProfile(worker);
    
    // Render available work
    await renderAvailableWork();
    
    // Render applied work
    await renderAppliedWork();
}

// Render worker profile
function renderWorkerProfile(worker) {
    const container = getElement('worker-profile');
    if (!container) return;
    
    container.innerHTML = `
        <div class="profile-header">
            <img src="${worker.photo || createPlaceholderImage(worker.name.substring(0, 2).toUpperCase())}" alt="${worker.name}" class="profile-avatar">
            <div class="profile-info">
                <h2>${worker.name}</h2>
                <p>${worker.phone}</p>
                <span class="status-badge ${worker.verified ? 'status-verified' : 'status-unverified'}">
                    ${worker.verified ? '✓ Verified' : 'Pending Verification'}
                </span>
            </div>
        </div>
        <div class="profile-details">
            <div class="detail-item">
                <div class="label">Work Type</div>
                <div class="value">${worker.workType ? worker.workType.charAt(0).toUpperCase() + worker.workType.slice(1) : 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="label">Experience</div>
                <div class="value">${worker.experience || 0} years</div>
            </div>
            <div class="detail-item">
                <div class="label">Location</div>
                <div class="value">${worker.location || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="label">Member Since</div>
                <div class="value">${formatDate(worker.createdAt || new Date())}</div>
            </div>
        </div>
    `;
}

// Render available work postings
async function renderAvailableWork() {
    const worker = isLoggedIn('worker');
    const container = getElement('available-work-list');
    
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    // Call API
    const response = await getAvailableWork(worker.id);
    
    if (!response.success) {
        container.innerHTML = '<p>Error loading work</p>';
        return;
    }
    
    const workPostings = response.data || [];
    
    if (workPostings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <h3>No Work Available</h3>
                <p>Check back later for new opportunities</p>
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
                <p><span class="label">Description:</span> ${work.description}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="applyForWorkHandler('${work.id}')">Apply Now</button>
            </div>
        </div>
    `).join('');
}

// Render applied work
async function renderAppliedWork() {
    const worker = isLoggedIn('worker');
    const container = getElement('applied-work-list');
    
    if (!container) return;
    
    // Show loading
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    // Call API
    const response = await getAppliedWork(worker.id);
    
    if (!response.success) {
        container.innerHTML = '<p>Error loading applications</p>';
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
}

// ============================================
// Work Posting Functions
// ============================================

// Post new work
async function postWorkHandler(event) {
    event.preventDefault();
    
    const owner = isLoggedIn('owner');
    if (!owner) {
        showAlert('work-message', 'Please login first', 'error');
        return;
    }
    
    const formData = {
        ownerId: owner.id,
        ownerName: owner.name,
        ownerPhone: owner.phone,
        vehicleType: getElement('vehicleType').value,
        workerType: getElement('workerType').value,
        location: getElement('workLocation').value,
        duration: getElement('workDuration').value,
        description: getElement('workDescription').value
    };
    
    // Call API
    const response = await createWorkPosting(formData);
    
    if (response.success) {
        hideModal('post-work-modal');
        showAlert('dashboard-message', 'Work posted successfully!', 'success');
        
        // Reset form
        getElement('post-work-form').reset();
        
        // Refresh work postings
        await renderOwnerWorkPostings();
    } else {
        showAlert('work-message', response.message || 'Failed to post work', 'error');
    }
}

// Delete work posting
async function deleteWorkPostingHandler(workId) {
    if (!confirm('Are you sure you want to delete this work posting?')) {
        return;
    }
    
    const response = await deleteWorkPosting(workId);
    
    if (response.success) {
        showAlert('dashboard-message', 'Work posting deleted', 'success');
        await renderOwnerWorkPostings();
    } else {
        showAlert('dashboard-message', response.message || 'Failed to delete', 'error');
    }
}

// View applicants (placeholder - would need additional API endpoint)
function viewApplicants(workId) {
    showModal('applicants-modal');
    document.getElementById('applicants-list').innerHTML = '<p>Applicant details would be loaded here</p>';
}

// ============================================
// Worker Action Functions
// ============================================

// Apply for work
async function applyForWorkHandler(workId) {
    const worker = isLoggedIn('worker');
    if (!worker) {
        showAlert('work-list-message', 'Please login first', 'error');
        return;
    }
    
    // Call API
    const response = await applyForWork(workId, worker.id);
    
    if (response.success) {
        showAlert('work-list-message', response.message, 'success');
        
        // Refresh work lists
        await renderAvailableWork();
        await renderAppliedWork();
    } else {
        showAlert('work-list-message', response.message || 'Failed to apply', 'error');
    }
}

// Contact worker (owner view)
function contactWorker(phone) {
    showAlert('dashboard-message', `Calling ${phone}...`, 'success');
    window.location.href = `tel:${phone}`;
}

// Contact owner (worker view)
function contactOwner(phone) {
    window.location.href = `tel:${phone}`;
}

// ============================================
// Tab Functions
// ============================================

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
    const selectedContent = document.getElementById(`${tabName}-tab`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
}

// ============================================
// Search and Filter Functions
// ============================================

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

function renderFilteredWorkers(workers) {
    const container = getElement('available-workers-list');
    if (!container) return;
    
    if (workers.length === 0) {
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
    
    const worker = isLoggedIn('worker');
    if (worker) {
        filters.excludeApplied = worker.id;
    }
    
    const response = await getWorkPostings(filters);
    
    if (response.success) {
        renderFilteredWork(response.data);
    }
}

function renderFilteredWork(workPostings) {
    const container = getElement('available-work-list');
    if (!container) return;
    
    if (workPostings.length === 0) {
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
                <p><span class="label">Description:</span> ${work.description}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="applyForWorkHandler('${work.id}')">Apply Now</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Setup form submissions
    const ownerRegisterForm = getElement('owner-register-form');
    if (ownerRegisterForm) {
        ownerRegisterForm.addEventListener('submit', registerOwnerHandler);
    }
    
    const ownerLoginForm = getElement('owner-login-form');
    if (ownerLoginForm) {
        ownerLoginForm.addEventListener('submit', loginOwnerHandler);
    }
    
    const workerRegisterForm = getElement('worker-register-form');
    if (workerRegisterForm) {
        workerRegisterForm.addEventListener('submit', registerWorkerHandler);
    }
    
    const workerLoginForm = getElement('worker-login-form');
    if (workerLoginForm) {
        workerLoginForm.addEventListener('submit', loginWorkerHandler);
    }
    
    const postWorkForm = getElement('post-work-form');
    if (postWorkForm) {
        postWorkForm.addEventListener('submit', postWorkHandler);
    }
    
    // Setup modal close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Setup search inputs
    const workerSearch = getElement('worker-search');
    if (workerSearch) {
        workerSearch.addEventListener('input', searchWorkers);
    }
    
    const workerTypeFilter = getElement('worker-type-filter');
    if (workerTypeFilter) {
        workerTypeFilter.addEventListener('change', searchWorkers);
    }
    
    const workSearch = getElement('work-search');
    if (workSearch) {
        workSearch.addEventListener('input', searchWork);
    }
    
    const workTypeFilter = getElement('work-type-filter');
    if (workTypeFilter) {
        workTypeFilter.addEventListener('change', searchWork);
    }
    
    // Render dashboards if on dashboard pages
    if (getElement('owner-dashboard')) {
        renderOwnerDashboard();
    }
    
    if (getElement('worker-dashboard')) {
        renderWorkerDashboard();
    }
    
    // Setup logout buttons
    document.querySelectorAll('.logout-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userType = this.dataset.userType;
            logout(userType);
        });
    });
});
