// --- 0. BACKGROUND HANDLER ---
function changeBackground(imageName) {
    document.body.style.backgroundImage = `linear-gradient(rgba(30, 45, 60, 0.7), rgba(30, 45, 60, 0.7)), url('/static/${imageName}')`;
}
changeBackground('loginpage.jpg');

// --- 1. ACCESS VALIDATION & SERVER AUTHENTICATION ---
function toggleLoginCard(cardType) {
    const loginCard = document.querySelector('.card.login-card');
    const setupCard = document.getElementById('google-setup-card');
    const forgotCard = document.getElementById('forgot-password-card');

    if (cardType === 'setup') {
        loginCard.classList.add('hidden');
        forgotCard.classList.add('hidden');
        setupCard.classList.remove('hidden');
    } else if (cardType === 'forgot') {
        loginCard.classList.add('hidden');
        setupCard.classList.add('hidden');
        forgotCard.classList.remove('hidden');
    } else {
        setupCard.classList.add('hidden');
        forgotCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    }
}

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            successfulAuthTransition();
        } else {
            errorMsg.textContent = result.message || 'Invalid credentials. Please try again.';
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        errorMsg.textContent = 'Server connection error. Please try again.';
        errorMsg.classList.remove('hidden');
    }
});

document.getElementById('google-login-btn').addEventListener('click', async function() {
    const mockGoogleEmail = prompt("Google Identity Sign-In\nEnter your Google Email address:", "doctor.sarah@clinic.com");
    if (!mockGoogleEmail) return;
    const mockGoogleName = prompt("Enter your Name:", "Dr. Sarah Smith") || "Doctor User";

    try {
        const response = await fetch('/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: mockGoogleName, email: mockGoogleEmail })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            successfulAuthTransition();
        } else if (result.status === 'setup_required') {
            document.getElementById('setup-email').value = result.email;
            document.getElementById('setup-name').value = result.name;
            document.getElementById('setup-username').value = result.email.split('@')[0];
            toggleLoginCard('setup');
        } else {
            alert(`Authentication Error: ${result.message}`);
        }
    } catch (err) {
        alert("Server connection error during Google sign-in.");
    }
});

document.getElementById('google-setup-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('setup-email').value;
    const name = document.getElementById('setup-name').value;
    const username = document.getElementById('setup-username').value;
    const password = document.getElementById('setup-password').value;
    const errorDiv = document.getElementById('setup-error');

    errorDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/complete_setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, username, password })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            alert(result.message);
            successfulAuthTransition();
        } else {
            errorDiv.textContent = result.message || 'Setup failed.';
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        errorDiv.textContent = 'Server connection error.';
        errorDiv.classList.remove('hidden');
    }
});

document.getElementById('forgot-password-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const newPassword = document.getElementById('forgot-new-password').value;
    const confirmPassword = document.getElementById('forgot-confirm-password').value;
    const msgDiv = document.getElementById('forgot-msg');

    msgDiv.classList.add('hidden');

    if (newPassword !== confirmPassword) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ New password and confirmation do not match.';
        msgDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/auth/forgot_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            msgDiv.style.color = '#2e7d32';
            msgDiv.textContent = '✅ ' + result.message;
            msgDiv.classList.remove('hidden');

            setTimeout(() => {
                toggleLoginCard('login');
            }, 1800);
        } else {
            msgDiv.style.color = '#c62828';
            msgDiv.textContent = '❌ ' + (result.message || 'Password reset failed.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ Server connection error.';
        msgDiv.classList.remove('hidden');
    }
});

function successfulAuthTransition() {
    toggleLoginCard('login');
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('password').value = '';
    changeBackground('homepage.jpg');
    detectLocation();
}

async function logout() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn("Logout request failed", e);
    }
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    closeNav();
    showPage('home-page'); 
    changeBackground('loginpage.jpg');
}

// --- 2. LIVE LOCATION SERVICES ---
let locationWatchId = null;

async function detectLocation() {
    const locBar = document.getElementById('location-bar');
    if (!locBar) return;

    locBar.innerHTML = '📡 Detecting live location...';

    // IP-based Fallback Function
    async function fallbackIpLocation(reason = '') {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data && data.city) {
                const region = data.region || data.country_name || '';
                locBar.innerHTML = `📍 <strong>LIVE:</strong> ${data.city}, ${region} <span style="font-size:0.8em; opacity:0.8;">(IP Tracked)</span>`;
            } else {
                locBar.innerHTML = `📍 Location: ${reason || 'Detection unavailable'}`;
            }
        } catch (err) {
            locBar.innerHTML = `📍 <strong>LIVE:</strong> Location Access Restricted`;
        }
    }

    if ("geolocation" in navigator) {
        // Clear previous watcher if exists
        if (locationWatchId !== null) {
            navigator.geolocation.clearWatch(locationWatchId);
        }

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await response.json();
                    
                    const addr = data.address || {};
                    const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "Active Region";
                    const state = addr.state || addr.country || "";

                    locBar.innerHTML = `📍 <strong>LIVE:</strong> ${city}${state ? ', ' + state : ''} <span style="font-size:0.8em; opacity:0.85;">(${lat.toFixed(2)}°, ${lon.toFixed(2)}°)</span>`;
                } catch {
                    locBar.innerHTML = `📍 <strong>LIVE:</strong> Lat: ${lat.toFixed(3)}°, Lon: ${lon.toFixed(3)}°`;
                }
            },
            (error) => {
                console.warn("Geolocation warning:", error.message);
                fallbackIpLocation("Permission restricted");
            },
            geoOptions
        );
    } else {
        fallbackIpLocation("Geolocation unsupported");
    }
}

// --- 3. MENU NAVIGATION ---
function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    if (window.innerWidth > 768) {
        document.getElementById("main").style.marginLeft = "250px";
    }
}

function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "auto";
}

function showPage(pageId) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => section.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    closeNav();

    if (pageId === 'home-page') changeBackground('homepage.jpg');
    else if (pageId === 'predict-page') changeBackground('implant.jpg');
    else if (pageId === 'history-page') changeBackground('view.jpg');
    else if (pageId === 'profile-page') changeBackground('view.jpg'); 
}

// --- 4. PREDICTOR ENGINE CONTROLLER ---
document.getElementById('predictor-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const patientData = {
        patientName: document.getElementById('patientName').value,
        patientId: document.getElementById('patientId').value,
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        smoking_status: document.getElementById('smoking_status').value,
        diabetes: document.getElementById('diabetes').checked ? 'yes' : 'no',
        history_periodontitis: document.getElementById('history_periodontitis').checked ? 'yes' : 'no',
        bruxism: document.getElementById('bruxism').checked ? 'yes' : 'no',
        oral_hygiene: document.getElementById('oral_hygiene').value,
        bone_quality: document.getElementById('bone_quality').value,
        jaw_location: document.getElementById('jaw_location').value,
        implant_length_mm: document.getElementById('implant_length_mm').value,
        implant_diameter_mm: document.getElementById('implant_diameter_mm').value,
        implant_surface: document.getElementById('implant_surface').value
    };

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patientData)
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const result = await response.json();
        if (result.status === 'success') {
            const scoreDisplay = document.getElementById('survival-score');
            scoreDisplay.textContent = `${result.survival_probability}%`;
            
            if (result.survival_probability >= 90) scoreDisplay.style.color = '#2e7d32';
            else if (result.survival_probability >= 80) scoreDisplay.style.color = '#ef6c00';
            else scoreDisplay.style.color = '#c62828';

            // --- Render SHAP explanations ---
            const breakdownContainer = document.getElementById('explanation-breakdown');
            breakdownContainer.innerHTML = ''; 
            
            if (result.explanations && result.explanations.length > 0) {
                result.explanations.forEach(item => {
                    const isPositive = item.impact > 0;
                    const color = isPositive ? '#2e7d32' : '#c62828';
                    const sign = isPositive ? '+' : '';
                    const icon = isPositive ? '📈' : '📉';
                    
                    breakdownContainer.innerHTML += `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #dcdde1; padding-bottom: 8px;">
                            <span style="font-weight: 500;">${icon} ${item.factor}</span>
                            <span style="color: ${color}; font-weight: bold;">${sign}${item.impact}%</span>
                        </div>
                    `;
                });
                document.getElementById('explanation-section').classList.remove('hidden');
            }

            document.getElementById('results-card').classList.remove('hidden');
        } else {
            alert(`Prediction Error: ${result.message}`);
        }
    } catch (error) {
        alert(`Communication error: ${error.message}`);
    }
});

// --- 5. HISTORY & REMOVAL ACTIONS ---
async function fetchHistory() {
    const listElement = document.getElementById('history-list');
    listElement.innerHTML = '<li style="color:#000;">Processing local records...</li>';

    try {
        const response = await fetch('/get_history');
        
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const historyData = await response.json();
        listElement.innerHTML = '';

        if (!Array.isArray(historyData) || historyData.length === 0) {
            listElement.innerHTML = '<li style="color:#000;">No historic entries recorded.</li>';
            return;
        }

        historyData.slice().reverse().forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span style="color:#111;">
                    <strong>${item.patient_name}</strong> | Age: ${item.age} <br>
                    <small style="color:#7f8c8d;">${item.date}</small>
                </span>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-weight: bold; font-size: 1.2rem; color: ${item.score >= 90 ? 'green' : (item.score >= 80 ? 'orange' : 'red')};">
                        ${item.score}%
                    </span>
                    <button class="btn-delete" onclick="deleteRecord(${item.id})">🗑️</button>
                </div>
            `;
            listElement.appendChild(li);
        });
    } catch (error) {
        listElement.innerHTML = '<li style="color:red;">Failed to load patient history.</li>';
    }
}

async function deleteRecord(recordId) {
    if (!confirm("Delete this clinical record permanently?")) return;
    try {
        const response = await fetch(`/delete_history/${recordId}`, { method: 'DELETE' });
        
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const result = await response.json();
        if (result.status === 'success') fetchHistory(); 
        else alert(`Execution failed: ${result.message}`);
    } catch (error) {
        alert(`Communication exception encountered: ${error.message}`);
    }
}

// --- 6. PROFILE LOGIC ---
async function fetchProfile() {
    try {
        const response = await fetch('/get_profile');
        
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const profileData = await response.json();

        if (profileData.status === "success") {
            document.getElementById('profile-name').textContent = profileData.name;
            document.getElementById('profile-email').textContent = profileData.email;
            document.getElementById('profile-joined').textContent = profileData.joined;
            document.getElementById('profile-specialty').textContent = profileData.specialty || "Maxillofacial Surgeon";
            document.getElementById('profile-clinic').textContent = profileData.clinic_name || "City Dental & Surgical Center";
            document.getElementById('profile-license').textContent = profileData.license_number || "REG-8849201";

            const avatarIcon = document.getElementById('profile-avatar-icon');
            const avatarImg = document.getElementById('profile-avatar-img');

            if (profileData.avatar_url) {
                avatarImg.src = profileData.avatar_url;
                avatarImg.classList.remove('hidden');
                avatarIcon.classList.add('hidden');
            } else {
                avatarImg.classList.add('hidden');
                avatarIcon.classList.remove('hidden');
            }

            // Pre-fill edit fields
            document.getElementById('edit-profile-name').value = profileData.name || '';
            document.getElementById('edit-profile-email').value = profileData.email || '';
            document.getElementById('edit-profile-specialty').value = profileData.specialty || '';
            document.getElementById('edit-profile-clinic').value = profileData.clinic_name || '';
            document.getElementById('edit-profile-license').value = profileData.license_number || '';
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
    }
}

function toggleProfileEdit(show) {
    const viewContainer = document.getElementById('profile-view-container');
    const editContainer = document.getElementById('profile-edit-container');
    const pwContainer = document.getElementById('password-change-container');
    const msgDiv = document.getElementById('profile-update-msg');
    
    msgDiv.classList.add('hidden');
    msgDiv.textContent = '';
    pwContainer.classList.add('hidden');

    if (show) {
        viewContainer.classList.add('hidden');
        editContainer.classList.remove('hidden');
    } else {
        editContainer.classList.add('hidden');
        viewContainer.classList.remove('hidden');
    }
}

function togglePasswordModal(show) {
    const viewContainer = document.getElementById('profile-view-container');
    const editContainer = document.getElementById('profile-edit-container');
    const pwContainer = document.getElementById('password-change-container');
    const msgDiv = document.getElementById('password-update-msg');

    msgDiv.classList.add('hidden');
    msgDiv.textContent = '';
    editContainer.classList.add('hidden');

    if (show) {
        viewContainer.classList.add('hidden');
        pwContainer.classList.remove('hidden');
        document.getElementById('pw-current').value = '';
        document.getElementById('pw-new').value = '';
        document.getElementById('pw-confirm').value = '';
    } else {
        pwContainer.classList.add('hidden');
        viewContainer.classList.remove('hidden');
    }
}

document.getElementById('profile-edit-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const msgDiv = document.getElementById('profile-update-msg');
    msgDiv.classList.add('hidden');

    const formData = new FormData();
    formData.append('name', document.getElementById('edit-profile-name').value);
    formData.append('email', document.getElementById('edit-profile-email').value);
    formData.append('specialty', document.getElementById('edit-profile-specialty').value);
    formData.append('clinic_name', document.getElementById('edit-profile-clinic').value);
    formData.append('license_number', document.getElementById('edit-profile-license').value);

    const avatarFile = document.getElementById('edit-profile-avatar').files[0];
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }

    try {
        const response = await fetch('/update_profile', {
            method: 'POST',
            body: formData
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const result = await response.json();
        if (result.status === 'success') {
            msgDiv.style.color = '#2e7d32';
            msgDiv.textContent = '✅ ' + result.message;
            msgDiv.classList.remove('hidden');

            fetchProfile();

            setTimeout(() => {
                toggleProfileEdit(false);
            }, 1200);
        } else {
            msgDiv.style.color = '#c62828';
            msgDiv.textContent = '❌ ' + (result.message || 'Update failed.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ Communication error.';
        msgDiv.classList.remove('hidden');
    }
});

document.getElementById('password-change-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const msgDiv = document.getElementById('password-update-msg');
    msgDiv.classList.add('hidden');

    const currentPw = document.getElementById('pw-current').value;
    const newPw = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;

    if (newPw !== confirmPw) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ New password and confirmation do not match.';
        msgDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/change_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: currentPw,
                new_password: newPw,
                confirm_password: confirmPw
            })
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const result = await response.json();
        if (result.status === 'success') {
            msgDiv.style.color = '#2e7d32';
            msgDiv.textContent = '✅ ' + result.message;
            msgDiv.classList.remove('hidden');

            setTimeout(() => {
                togglePasswordModal(false);
            }, 1200);
        } else {
            msgDiv.style.color = '#c62828';
            msgDiv.textContent = '❌ ' + (result.message || 'Password update failed.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ Communication error.';
        msgDiv.classList.remove('hidden');
    }
});

// --- 7. AUTO-RESTORE ACTIVE SESSION ON LOAD ---
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/get_profile');
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                successfulAuthTransition();
            }
        }
    } catch (e) {
        // Session not active
    }
});