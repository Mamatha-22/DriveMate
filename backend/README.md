# DriveMate Backend

This is the Node.js + Express + MongoDB backend for the DriveMate platform.

## 📁 Project Structure

```
backend/
├── package.json              # Dependencies and scripts
├── server.js                  # Main server file
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   └── errorHandler.js      # Error handling middleware
├── config/
│   └── upload.js             # Multer file upload configuration
├── models/
│   ├── Owner.js             # Owner data model
│   ├── Worker.js            # Worker data model
│   ├── WorkPosting.js       # Work posting data model
│   └── Review.js            # Review/Rating data model
├── routes/
│   ├── ownerRoutes.js       # Owner API routes
│   ├── workerRoutes.js       # Worker API routes
│   └── workRoutes.js        # Work posting API routes
└── uploads/                  # Uploaded files storage
    ├── profiles/            # Profile photos
    ├── aadhaar/             # Aadhaar card documents
    └── driving-license/     # Driving license documents
```

## 🚀 Quick Start

### Prerequisites
1. **Node.js** - Download from https://nodejs.org (v14 or higher)
2. **MongoDB** - Download from https://www.mongodb.com or use MongoDB Atlas (cloud)

### Installation

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start MongoDB (if local)
mongod

# Start the server
npm start
```

### Verify Server Running
- Open browser: http://localhost:3000/api/test
- API Docs: http://localhost:3000/api

---

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**How authentication works:**
1. User registers or logs in
2. Server returns JWT token
3. Frontend stores the token (localStorage/sessionStorage)
4. Frontend includes token in API requests
5. Server verifies token and processes request

---

## 📡 Frontend Integration Guide

Here are examples of how to connect your HTML forms to the backend APIs using `fetch()`.

### 🔑 Store Token (JavaScript)

```javascript
// Store token after login
localStorage.setItem('drivemate_token', token);
localStorage.setItem('drivemate_user', JSON.stringify(ownerData));
localStorage.setItem('drivemate_role', 'owner'); // or 'worker'

// Get token for API calls
function getAuthHeader() {
    const token = localStorage.getItem('drivemate_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Check if logged in
function isLoggedIn() {
    return !!localStorage.getItem('drivemate_token');
}

// Logout
function logout() {
    localStorage.removeItem('drivemate_token');
    localStorage.removeItem('drivemate_user');
    localStorage.removeItem('drivemate_role');
    window.location.href = 'index.html';
}
```

---

### 👤 OWNER: Register

```javascript
async function registerOwner(name, phone, password, city) {
    try {
        const response = await fetch('http://localhost:3000/api/owners/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                phone: phone,        // 10-digit number
                password: password,  // min 6 characters
                city: city
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Store token and user data
            localStorage.setItem('drivemate_token', result.data.token);
            localStorage.setItem('drivemate_user', JSON.stringify(result.data.owner));
            localStorage.setItem('drivemate_role', 'owner');
            
            alert('Registration successful!');
            window.location.href = 'owner-dashboard.html';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Registration failed:', error);
        alert('Registration failed. Please try again.');
    }
}

// Usage in HTML form:
/*
<form onsubmit="event.preventDefault(); registerOwner(
    document.getElementById('name').value,
    document.getElementById('phone').value,
    document.getElementById('password').value,
    document.getElementById('city').value
);">
*/
```

---

### 🔑 OWNER: Login

```javascript
async function loginOwner(phone, password) {
    try {
        const response = await fetch('http://localhost:3000/api/owners/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('drivemate_token', result.data.token);
            localStorage.setItem('drivemate_user', JSON.stringify(result.data.owner));
            localStorage.setItem('drivemate_role', 'owner');
            
            alert('Login successful!');
            window.location.href = 'owner-dashboard.html';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
    }
}
```

---

### 👷 WORKER: Register

```javascript
async function registerWorker(name, phone, password, workType, experience, location) {
    try {
        const response = await fetch('http://localhost:3000/api/workers/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                phone: phone,
                password: password,
                workType: workType,      // 'driver', 'helper', or 'loader'
                experience: parseInt(experience),
                location: location
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('drivemate_token', result.data.token);
            localStorage.setItem('drivemate_user', JSON.stringify(result.data.worker));
            localStorage.setItem('drivemate_role', 'worker');
            
            alert('Registration successful! Please upload documents for verification.');
            window.location.href = 'worker-dashboard.html';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Registration failed:', error);
        alert('Registration failed. Please try again.');
    }
}
```

---

### 🔑 WORKER: Login

```javascript
async function loginWorker(phone, password) {
    try {
        const response = await fetch('http://localhost:3000/api/workers/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('drivemate_token', result.data.token);
            localStorage.setItem('drivemate_user', JSON.stringify(result.data.worker));
            localStorage.setItem('drivemate_role', 'worker');
            
            alert('Login successful!');
            window.location.href = 'worker-dashboard.html';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
    }
}
```

---

### 📝 OWNER: Create Work Post

```javascript
async function createWorkPost(vehicleType, workerType, location, duration, description, salary) {
    const token = localStorage.getItem('drivemate_token');
    
    try {
        const response = await fetch('http://localhost:3000/api/works', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                vehicleType: vehicleType,  // 'bus', 'lorry', 'tempo', 'van', 'truck'
                workerType: workerType,    // 'driver', 'helper', 'loader'
                location: location,
                duration: duration,        // 'Full Time', 'Part Time', 'Temporary', 'Project Basis'
                description: description,
                salary: salary || 'Negotiable'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Work posting created successfully!');
            // Refresh the list or redirect
            loadMyPostings();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Create posting failed:', error);
        alert('Failed to create posting.');
    }
}
```

---

### 📋 WORKER: Apply for Work

```javascript
async function applyForWork(postingId) {
    const token = localStorage.getItem('drivemate_token');
    
    try {
        const response = await fetch(`http://localhost:3000/api/works/${postingId}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Application submitted! The owner will contact you at: ' + result.data.ownerPhone);
            // Refresh the list
            loadAvailableWork();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Apply failed:', error);
        alert('Failed to apply for work.');
    }
}
```

---

### 📋 Get All Work Postings (Public)

```javascript
async function loadAllWorkPostings() {
    try {
        const response = await fetch('http://localhost:3000/api/works');
        const result = await response.json();
        
        if (result.success) {
            const postings = result.data.postings;
            
            // Display postings
            postings.forEach(post => {
                console.log(post.vehicleType, post.location, post.description);
            });
        }
    } catch (error) {
        console.error('Failed to load postings:', error);
    }
}
```

---

### 📋 OWNER: Get My Postings with Applicants

```javascript
async function loadMyPostings() {
    const token = localStorage.getItem('drivemate_token');
    
    try {
        const response = await fetch('http://localhost:3000/api/works/my-postings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const postings = result.data.postings;
            
            postings.forEach(post => {
                console.log('Post:', post.vehicleType);
                console.log('Applicants:', post.applicants.length);
                
                post.applicants.forEach(applicant => {
                    console.log(' -', applicant.workerName, applicant.status);
                });
            });
        }
    } catch (error) {
        console.error('Failed to load postings:', error);
    }
}
```

---

### 📋 WORKER: Get Available Work

```javascript
async function loadAvailableWork() {
    const token = localStorage.getItem('drivemate_token');
    
    try {
        const response = await fetch('http://localhost:3000/api/works/available', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const postings = result.data.postings;
            
            postings.forEach(post => {
                console.log(post.vehicleType, post.location);
            });
        }
    } catch (error) {
        console.error('Failed to load work:', error);
    }
}
```

---

### ⭐ RATE A WORKER (Owner)

```javascript
async function rateWorker(workerId, rating, comment, workPostingId = null) {
    const token = localStorage.getItem('drivemate_token');
    
    try {
        const response = await fetch(`http://localhost:3000/api/owners/me/reviews/${workerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: rating,        // 1-5
                comment: comment,      // Optional review text
                workPostingId: workPostingId  // Optional
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Rating submitted successfully!');
            console.log('New average rating:', result.data.newAverageRating);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Rating failed:', error);
        alert('Failed to submit rating.');
    }
}
```

---

### 📤 Upload Verification Documents

```javascript
async function uploadVerification(aadhaarFile, drivingLicenseFile = null, photoFile = null) {
    const token = localStorage.getItem('drivemate_token');
    const formData = new FormData();
    
    if (aadhaarFile) formData.append('aadhaar', aadhaarFile);
    if (drivingLicenseFile) formData.append('drivingLicense', drivingLicenseFile);
    if (photoFile) formData.append('photo', photoFile);
    
    try {
        const response = await fetch('http://localhost:3000/api/owners/me/verify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Documents uploaded successfully! Status: ' + result.data.verificationStatus);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload documents.');
    }
}

// HTML form example:
/*
<form id="verifyForm">
    <input type="file" id="aadhaar" accept="image/*,.pdf" required>
    <input type="file" id="drivingLicense" accept="image/*,.pdf">
    <input type="file" id="photo" accept="image/*">
    <button type="submit">Upload for Verification</button>
</form>

<script>
document.getElementById('verifyForm').onsubmit = async function(e) {
    e.preventDefault();
    const aadhaarFile = document.getElementById('aadhaar').files[0];
    const dlFile = document.getElementById('drivingLicense').files[0];
    const photoFile = document.getElementById('photo').files[0];
    await uploadVerification(aadhaarFile, dlFile, photoFile);
};
</script>
*/
```

---

## 📊 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "...",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Error description"
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Please fill all required fields correctly",
  "errors": {
    "phone": "Invalid phone number",
    "password": "Password too short"
  }
}
```

---

## 🔧 Complete Example: Owner Dashboard

```html
<!DOCTYPE html>
<html>
<head>
    <title>Owner Dashboard - DriveMate</title>
</head>
<body>
    <h1>Owner Dashboard</h1>
    <div id="userInfo"></div>
    
    <h2>Create Work Posting</h2>
    <form id="createPostForm">
        <select id="vehicleType" required>
            <option value="">Select Vehicle Type</option>
            <option value="bus">Bus</option>
            <option value="lorry">Lorry</option>
            <option value="tempo">Tempo</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
        </select>
        
        <select id="workerType" required>
            <option value="">Select Worker Type</option>
            <option value="driver">Driver</option>
            <option value="helper">Helper</option>
            <option value="loader">Loader</option>
        </select>
        
        <input type="text" id="location" placeholder="Work Location" required>
        
        <select id="duration" required>
            <option value="">Select Duration</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Temporary">Temporary</option>
            <option value="Project Basis">Project Basis</option>
        </select>
        
        <textarea id="description" placeholder="Job Description" required></textarea>
        <input type="text" id="salary" placeholder="Salary (optional)">
        
        <button type="submit">Create Posting</button>
    </form>
    
    <h2>My Postings</h2>
    <div id="myPostings"></div>
    
    <button onclick="logout()">Logout</button>
    
    <script>
        const API_URL = 'http://localhost:3000/api';
        
        // Check login on page load
        if (!localStorage.getItem('drivemate_token')) {
            window.location.href = 'owner-login.html';
        }
        
        // Display user info
        const user = JSON.parse(localStorage.getItem('drivemate_user'));
        document.getElementById('userInfo').innerHTML = `<p>Welcome, ${user.name}!</p>`;
        
        // Create work posting
        document.getElementById('createPostForm').onsubmit = async function(e) {
            e.preventDefault();
            await createWorkPost(
                document.getElementById('vehicleType').value,
                document.getElementById('workerType').value,
                document.getElementById('location').value,
                document.getElementById('duration').value,
                document.getElementById('description').value,
                document.getElementById('salary').value
            );
        };
        
        // Load my postings
        loadMyPostings();
        
        async function createWorkPost(vehicleType, workerType, location, duration, description, salary) {
            const token = localStorage.getItem('drivemate_token');
            
            try {
                const response = await fetch(`${API_URL}/works`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ vehicleType, workerType, location, duration, description, salary })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('Posting created!');
                    loadMyPostings();
                    document.getElementById('createPostForm').reset();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                console.error(error);
                alert('Failed to create posting');
            }
        }
        
        async function loadMyPostings() {
            const token = localStorage.getItem('drivemate_token');
            
            try {
                const response = await fetch(`${API_URL}/works/my-postings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const container = document.getElementById('myPostings');
                    container.innerHTML = '';
                    
                    result.data.postings.forEach(post => {
                        const div = document.createElement('div');
                        div.innerHTML = `
                            <h3>${post.vehicleType} - ${post.location}</h3>
                            <p>${post.description}</p>
                            <p>Applicants: ${post.applicants.length}</p>
                        `;
                        container.appendChild(div);
                    });
                }
            } catch (error) {
                console.error(error);
            }
        }
        
        function logout() {
            localStorage.removeItem('drivemate_token');
            localStorage.removeItem('drivemate_user');
            localStorage.removeItem('drivemate_role');
            window.location.href = 'index.html';
        }
    </script>
</body>
</html>
```

---

## 🛠️ Troubleshooting

### MongoDB connection failed
- Make sure MongoDB is running
- Check connection string in server.js

### Port already in use
- Change PORT in server.js: `const PORT = process.env.PORT || 3001;`

### CORS errors
- Backend is configured to allow CORS
- Frontend can be on different port/domain

### Token expired
- User needs to login again
- Frontend should redirect to login page on 401 errors

### Not verified error
- User must upload documents and get approved
- Until then, they cannot post/apply for work

---

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **multer** - File uploads
- **cors** - Cross-origin resource sharing

---

## 📝 License

This project is for educational purposes.
