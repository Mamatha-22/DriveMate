// DriveMate - Main JavaScript

// ==================== Utility Functions ====================

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

// ==================== Image Handling ====================

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

// ==================== Mock Data Initialization ====================

function initializeMockData() {
    // Initialize workers if not exists
    if (!getFromStorage('drivemate_workers')) {
        const mockWorkers = [
            {
                id: 'worker1',
                name: 'Rajesh Kumar',
                phone: '9876543210',
                workType: 'driver',
                experience: 5,
                location: 'Mumbai',
                photo: createPlaceholderImage('RK'),
                verified: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'worker2',
                name: 'Suresh Patel',
                phone: '9876543211',
                workType: 'helper',
                experience: 3,
                location: 'Delhi',
                photo: createPlaceholderImage('SP'),
                verified: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'worker3',
                name: 'Amit Singh',
                phone: '9876543212',
                workType: 'driver',
                experience: 8,
                location: 'Bangalore',
                photo: createPlaceholderImage('AS'),
                verified: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'worker4',
                name: 'Vikash Yadav',
                phone: '9876543213',
                workType: 'loader',
                experience: 2,
                location: 'Kolkata',
                photo: createPlaceholderImage('VY'),
                verified: false,
                createdAt: new Date().toISOString()
            }
        ];
        saveToStorage('drivemate_workers', mockWorkers);
    }
    
    // Initialize owners if not exists
    if (!getFromStorage('drivemate_owners')) {
        const mockOwners = [
            {
                id: 'owner1',
                name: 'Mahesh Transport',
                phone: '9988776655',
                city: 'Mumbai',
                photo: createPlaceholderImage('MT'),
                verified: true,
                createdAt: new Date().toISOString()
            }
        ];
        saveToStorage('drivemate_owners', mockOwners);
    }
    
    // Initialize work postings if not exists
    if (!getFromStorage('drivemate_work_postings')) {
        const mockWorkPostings = [
            {
                id: 'work1',
                ownerId: 'owner1',
                ownerName: 'Mahesh Transport',
                ownerPhone: '9988776655',
                vehicleType: 'lorry',
                workerType: 'driver',
                location: 'Mumbai',
                duration: 'Full Time',
                description: 'Looking for experienced driver for long-distance transport',
                createdAt: new Date().toISOString(),
                applicants: []
            },
            {
                id: 'work2',
                ownerId: 'owner1',
                ownerName: 'Mahesh Transport',
                ownerPhone: '9988776655',
                vehicleType: 'tempo',
                workerType: 'helper',
                location: 'Delhi',
                duration: 'Part Time',
                description: 'Need helper for local deliveries',
                createdAt: new Date().toISOString(),
                applicants: []
            }
        ];
        saveToStorage('drivemate_work_postings', mockWorkPostings);
    }
}

// ==================== Authentication Functions ====================

// Register owner
function registerOwner(event) {
    event.preventDefault();
    
    const formData = {
        id: generateId(),
        name: getElement('ownerName').value,
        phone: getElement('ownerPhone').value,
        city: getElement('ownerCity').value,
        photo: null,
        verified: false,
        createdAt: new Date().toISOString()
    };
    
    // Handle photo upload
    const photoInput = getElement('ownerPhoto');
    if (photoInput && photoInput.files[0]) {
        handleImageUpload(photoInput)
            .then(photoData => {
                formData.photo = photoData || createPlaceholderImage(formData.name.substring(0, 2).toUpperCase());
                completeOwnerRegistration(formData);
            })
            .catch(error => {
                showAlert('auth-message', error.message, 'error');
            });
    } else {
        formData.photo = createPlaceholderImage(formData.name.substring(0, 2).toUpperCase());
        completeOwnerRegistration(formData);
    }
}

function completeOwnerRegistration(formData) {
    const owners = getFromStorage('drivemate_owners') || [];
    
    // Check if phone already registered
    if (owners.find(o => o.phone === formData.phone)) {
        showAlert('auth-message', 'This phone number is already registered!', 'error');
        return;
    }
    
    owners.push(formData);
    saveToStorage('drivemate_owners', owners);
    
    showAlert('auth-message', 'Registration successful! Please login.', 'success');
    setTimeout(() => {
        window.location.href = 'owner-login.html';
    }, 1500);
}

// Login owner
function loginOwner(event) {
    event.preventDefault();
    
    const phone = getElement('ownerPhone').value;
    const owners = getFromStorage('drivemate_owners') || [];
    
    const owner = owners.find(o => o.phone === phone);
    
    if (owner) {
        setLoginStatus('owner', owner);
        window.location.href = 'owner-dashboard.html';
    } else {
        showAlert('auth-message', 'Owner not found! Please register first.', 'error');
    }
}

// Register worker
function registerWorker(event) {
    event.preventDefault();
    
    const formData = {
        id: generateId(),
        name: getElement('workerName').value,
        phone: getElement('workerPhone').value,
        workType: getElement('workerType').value,
        experience: getElement('workerExperience').value,
        location: getElement('workerLocation').value,
        photo: null,
        verified: false,
        createdAt: new Date().toISOString()
    };
    
    // Handle photo upload
    const photoInput = getElement('workerPhoto');
    if (photoInput && photoInput.files[0]) {
        handleImageUpload(photoInput)
            .then(photoData => {
                formData.photo = photoData || createPlaceholderImage(formData.name.substring(0, 2).toUpperCase());
                completeWorkerRegistration(formData);
            })
            .catch(error => {
                showAlert('auth-message', error.message, 'error');
            });
    } else {
        formData.photo = createPlaceholderImage(formData.name.substring(0, 2).toUpperCase());
        completeWorkerRegistration(formData);
    }
}

function completeWorkerRegistration(formData) {
    const workers = getFromStorage('drivemate_workers') || [];
    
    // Check if phone already registered
    if (workers.find(w => w.phone === formData.phone)) {
        showAlert('auth-message', 'This phone number is already registered!', 'error');
        return;
    }
    
    workers.push(formData);
    saveToStorage('drivemate_workers', workers);
    
    showAlert('auth-message', 'Registration successful! Please login.', 'success');
    setTimeout(() => {
        window.location.href = 'worker-login.html';
    }, 1500);
}

// Login worker
function loginWorker(event) {
    event.preventDefault();
    
    const phone = getElement('workerPhone').value;
    const workers = getFromStorage('drivemate_workers') || [];
    
    const worker = workers.find(w => w.phone === phone);
    
    if (worker) {
        setLoginStatus('worker', worker);
        window.location.href = 'worker-dashboard.html';
    } else {
        showAlert('auth-message', 'Worker not found! Please register first.', 'error');
    }
}

// ==================== Dashboard Functions ====================

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
function renderOwnerDashboard() {
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
    renderOwnerWorkPostings();
    
    // Render available workers
    renderAvailableWorkers();
}

// Render work postings by owner
function renderOwnerWorkPostings() {
    const owner = isLoggedIn('owner');
    const workPostings = getFromStorage('drivemate_work_postings') || [];
    const container = getElement('work-postings-list');
    
    if (!container) return;
    
    const ownerWorkPostings = workPostings.filter(wp => wp.ownerId === owner.id);
    
    if (ownerWorkPostings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h3>No Work Postings Yet</h3>
                <p>Post your first work requirement to find workers</p>
                <button class="btn btn-primary mt-20" onclick="showModal('post-work-modal')">Post Work</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = ownerWorkPostings.map(posting => `
        <div class="card">
            <div class="card-header">
                <h3>${posting.vehicleType.charAt(0).toUpperCase() + posting.vehicleType.slice(1)} - ${posting.workerType.charAt(0).toUpperCase() + posting.workerType.slice(1)}</h3>
                <span class="status-badge status-pending">Active</span>
            </div>
            <div class="card-body">
                <p><span class="label">Location:</span> ${posting.location}</p>
                <p><span class="label">Duration:</span> ${posting.duration}</p>
                <p><span class="label">Description:</span> ${posting.description}</p>
                <p><span class="label">Posted:</span> ${formatDate(posting.createdAt)}</p>
                <p><span class="label">Applicants:</span> ${posting.applicants.length}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-outline" onclick="viewApplicants('${posting.id}')">View Applicants</button>
                <button class="btn btn-small btn-secondary" onclick="deleteWorkPosting('${posting.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render available workers
function renderAvailableWorkers() {
    const workers = getFromStorage('drivemate_workers') || [];
    const container = getElement('available-workers-list');
    
    if (!container) return;
    
    if (workers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
                    <img src="${worker.photo}" alt="${worker.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
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
function renderWorkerDashboard() {
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
    renderAvailableWork();
    
    // Render applied work
    renderAppliedWork();
}

// Render worker profile
function renderWorkerProfile(worker) {
    const container = getElement('worker-profile');
    if (!container) return;
    
    container.innerHTML = `
        <div class="profile-header">
            <img src="${worker.photo}" alt="${worker.name}" class="profile-avatar">
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
                <div class="value">${worker.workType.charAt(0).toUpperCase() + worker.workType.slice(1)}</div>
            </div>
            <div class="detail-item">
                <div class="label">Experience</div>
                <div class="value">${worker.experience} years</div>
            </div>
            <div class="detail-item">
                <div class="label">Location</div>
                <div class="value">${worker.location}</div>
            </div>
            <div class="detail-item">
                <div class="label">Member Since</div>
                <div class="value">${formatDate(worker.createdAt)}</div>
            </div>
        </div>
    `;
}

// Render available work postings
function renderAvailableWork() {
    const workPostings = getFromStorage('drivemate_work_postings') || [];
    const worker = isLoggedIn('worker');
    const container = getElement('available-work-list');
    
    if (!container) return;
    
    // Filter out work that worker has already applied to
    const availableWork = workPostings.filter(wp => 
        !wp.applicants.includes(worker.id)
    );
    
    if (availableWork.length === 0) {
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
    
    container.innerHTML = availableWork.map(work => `
        <div class="card">
            <div class="card-header">
                <h3>${work.vehicleType.charAt(0).toUpperCase() + work.vehicleType.slice(1)} - ${work.workerType.charAt(0).toUpperCase() + work.workerType.slice(1)}</h3>
                <span class="status-badge status-verified">Verified Owner</span>
            </div>
            <div class="card-body">
                <p><span class="label">Owner:</span> ${work.ownerName}</p>
                <p><span class="label">Location:</span> ${work.location}</p>
                <p><span class="label">Duration:</span> ${work.duration}</p>
                <p><span class="label">Description:</span> ${work.description}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="applyForWork('${work.id}')">Apply Now</button>
            </div>
        </div>
    `).join('');
}

// Render applied work
function renderAppliedWork() {
    const workPostings = getFromStorage('drivemate_work_postings') || [];
    const worker = isLoggedIn('worker');
    const container = getElement('applied-work-list');
    
    if (!container) return;
    
    // Get work that worker has applied to
    const appliedWork = workPostings.filter(wp => 
        wp.applicants.includes(worker.id)
    );
    
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

// ==================== Work Posting Functions ====================

// Post new work
function postWork(event) {
    event.preventDefault();
    
    const owner = isLoggedIn('owner');
    if (!owner) {
        showAlert('work-message', 'Please login first', 'error');
        return;
    }
    
    const formData = {
        id: generateId(),
        ownerId: owner.id,
        ownerName: owner.name,
        ownerPhone: owner.phone,
        vehicleType: getElement('vehicleType').value,
        workerType: getElement('workerType').value,
        location: getElement('workLocation').value,
        duration: getElement('workDuration').value,
        description: getElement('workDescription').value,
        createdAt: new Date().toISOString(),
        applicants: []
    };
    
    const workPostings = getFromStorage('drivemate_work_postings') || [];
    workPostings.push(formData);
    saveToStorage('drivemate_work_postings', workPostings);
    
    hideModal('post-work-modal');
    showAlert('dashboard-message', 'Work posted successfully!', 'success');
    
    // Reset form
    getElement('post-work-form').reset();
    
    // Refresh work postings
    renderOwnerWorkPostings();
}

// Delete work posting
function deleteWorkPosting(workId) {
    if (!confirm('Are you sure you want to delete this work posting?')) {
        return;
    }
    
    let workPostings = getFromStorage('drivemate_work_postings') || [];
    workPostings = workPostings.filter(wp => wp.id !== workId);
    saveToStorage('drivemate_work_postings', workPostings);
    
    showAlert('dashboard-message', 'Work posting deleted', 'success');
    renderOwnerWorkPostings();
}

// View applicants
function viewApplicants(workId) {
    const workPostings = getFromStorage('drivemate_work_postings') || [];
    const work = workPostings.find(wp => wp.id === workId);
    
    if (!work) return;
    
    const workers = getFromStorage('drivemate_workers') || [];
    const applicants = workers.filter(w => work.applicants.includes(w.id));
    
    const container = getElement('applicants-list');
    if (!container) return;
    
    if (applicants.length === 0) {
        container.innerHTML = '<p>No applicants yet.</p>';
    } else {
        container.innerHTML = applicants.map(worker => `
            <div class="card mb-20">
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${worker.photo}" alt="${worker.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <h4>${worker.name}</h4>
                            <p>${worker.workType.charAt(0).toUpperCase() + worker.workType.slice(1)} - ${worker.experience} years experience</p>
                            <p>Location: ${worker.location}</p>
                            <span class="status-badge ${worker.verified ? 'status-verified' : 'status-unverified'}">
                                ${worker.verified ? 'Verified' : 'Not Verified'}
                            </span>
                        </div>
                    </div>
                    <div class="contact-display mt-20">
                        <p class="phone">${worker.phone}</p>
                    </div>
                    <button class="btn btn-small btn-success mt-20" onclick="contactWorker('${worker.phone}')">Contact Worker</button>
                </div>
            </div>
        `).join('');
    }
    
    showModal('applicants-modal');
}

// ==================== Worker Action Functions ====================

// Apply for work
function applyForWork(workId) {
    const worker = isLoggedIn('worker');
    if (!worker) {
        showAlert('work-list-message', 'Please login first', 'error');
        return;
    }
    
    let workPostings = getFromStorage('drivemate_work_postings') || [];
    const workIndex = workPostings.findIndex(wp => wp.id === workId);
    
    if (workIndex === -1) return;
    
    if (workPostings[workIndex].applicants.includes(worker.id)) {
        showAlert('work-list-message', 'You have already applied for this work', 'warning');
        return;
    }
    
    workPostings[workIndex].applicants.push(worker.id);
    saveToStorage('drivemate_work_postings', workPostings);
    
    showAlert('work-list-message', 'Application submitted! Owner will contact you.', 'success');
    
    // Refresh work lists
    renderAvailableWork();
    renderAppliedWork();
}

// Contact worker (owner view)
function contactWorker(phone) {
    const message = `Calling ${phone}...`;
    showAlert('dashboard-message', message, 'success');
    // In a real app, this would initiate a phone call
    window.location.href = `tel:${phone}`;
}

// Contact owner (worker view)
function contactOwner(phone) {
    window.location.href = `tel:${phone}`;
}

// ==================== Tab Functions ====================

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

// ==================== Search and Filter ====================

function searchWorkers() {
    const searchTerm = getElement('worker-search').value.toLowerCase();
    const workerType = getElement('worker-type-filter').value;
    
    const workers = getFromStorage('drivemate_workers') || [];
    const filteredWorkers = workers.filter(worker => {
        const matchesSearch = worker.name.toLowerCase().includes(searchTerm) ||
                              worker.location.toLowerCase().includes(searchTerm);
        const matchesType = !workerType || worker.workType === workerType;
        return matchesSearch && matchesType;
    });
    
    renderFilteredWorkers(filteredWorkers);
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
                    <img src="${worker.photo}" alt="${worker.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
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

function searchWork() {
    const searchTerm = getElement('work-search').value.toLowerCase();
    const workerType = getElement('work-type-filter').value;
    
    const workPostings = getFromStorage('drivemate_work_postings') || [];
    const filteredWork = workPostings.filter(work => {
        const matchesSearch = work.location.toLowerCase().includes(searchTerm) ||
                              work.description.toLowerCase().includes(searchTerm);
        const matchesType = !workerType || work.workerType === workerType;
        return matchesSearch && matchesType;
    });
    
    renderFilteredWork(filteredWork);
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
                <span class="status-badge status-verified">Verified Owner</span>
            </div>
            <div class="card-body">
                <p><span class="label">Owner:</span> ${work.ownerName}</p>
                <p><span class="label">Location:</span> ${work.location}</p>
                <p><span class="label">Duration:</span> ${work.duration}</p>
                <p><span class="label">Description:</span> ${work.description}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-small btn-primary" onclick="applyForWork('${work.id}')">Apply Now</button>
            </div>
        </div>
    `).join('');
}

// ==================== Initialization ====================

// Configuration - centralized for easy maintenance
const APP_CONFIG = {
    backendUrl: 'http://localhost:3000/api',
    connectionTimeout: 5000,
    maxRetries: 3
};

// Initialize on page load with proper error handling
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Main initialization function - orchestrates all app setup
 * Uses async/await for better readability and error handling
 */
async function initializeApp() {
    try {
        // Initialize mock data first
        initializeMockData();
        
        // Setup form submissions
        setupFormHandlers();
        
        // Setup modal handlers
        setupModalHandlers();
        
        // Setup search handlers
        setupSearchHandlers();
        
        // Setup dashboard handlers
        setupDashboardHandlers();
        
        // Check backend connection
        await checkBackendConnection();
        
        console.info('Application initialized successfully');
    } catch (error) {
        handleInitializationError(error);
    }
}

/**
 * Setup all form submission handlers with null-safe checks
 * Uses event delegation for better performance on dynamic content
 */
function setupFormHandlers() {
    const formHandlers = [
        { id: 'owner-register-form', handler: registerOwner },
        { id: 'owner-login-form', handler: loginOwner },      
        { id: 'worker-register-form', handler: registerWorker },
        { id: 'worker-login-form', handler: loginWorker },    
        { id: 'post-work-form', handler: postWork }           
    ];

    formHandlers.forEach(({ id, handler }) => {
        const form = getElement(id);
        if (form) {
            form.addEventListener('submit', handler);
        }
    });
}
/**
 * Check backend connection with timeout and retry logic
 */
async function checkBackendConnection() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.connectionTimeout);

    try {
        const response = await fetch(APP_CONFIG.backendUrl, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Backend responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('BACKEND OK:', data);
        return true;
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.warn('Backend connection timed out');
        } else {
            console.warn('Backend connection failed:', error.message);
        }
        return false;
    }
}

/**
 * Handle initialization errors gracefully
 * Can be extended to show user-friendly error messages
 */
function handleInitializationError(error) {
    console.error('Application initialization failed:', error);
    
    // Optionally show error to user
    const errorMessage = getElement('error-message');
    if (errorMessage) {
        errorMessage.textContent = 'Application failed to initialize. Please refresh the page.';
        errorMessage.classList.add('active');
    }
}

/**
 * Setup modal close buttons and background click handlers
 */
function setupModalHandlers() {
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
}

/**
 * Setup search input handlers
 */
function setupSearchHandlers() {
    const workerSearch = getElement('worker-search');
    if (workerSearch) {
        workerSearch.addEventListener('input', debounce(searchWorkers, 300));
    }
    
    const workerTypeFilter = getElement('worker-type-filter');
    if (workerTypeFilter) {
        workerTypeFilter.addEventListener('change', searchWorkers);
    }
    
    const workSearch = getElement('work-search');
    if (workSearch) {
        workSearch.addEventListener('input', debounce(searchWork, 300));
    }
    
    const workTypeFilter = getElement('work-type-filter');
    if (workTypeFilter) {
        workTypeFilter.addEventListener('change', searchWork);
    }
}

/**
 * Setup dashboard rendering and logout handlers
 */
function setupDashboardHandlers() {
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
}

/**
 * Utility function to debounce search inputs
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
