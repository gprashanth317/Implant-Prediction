// --- 0. BACKGROUND HANDLER ---
function changeBackground(imageName) {
    document.body.style.backgroundImage = `linear-gradient(rgba(30, 45, 60, 0.7), rgba(30, 45, 60, 0.7)), url('/static/${imageName}')`;
}
changeBackground('loginpage.jpg');

// --- 1. ACCESS VALIDATION & SERVER AUTHENTICATION ---
function toggleLoginCard(cardType) {
    const loginCard = document.querySelector('.card.login-card');
    const googleCard = document.getElementById('google-email-card');
    const setupCard = document.getElementById('google-setup-card');
    const forgotCard = document.getElementById('forgot-password-card');

    loginCard.classList.add('hidden');
    googleCard.classList.add('hidden');
    setupCard.classList.add('hidden');
    forgotCard.classList.add('hidden');

    if (cardType === 'google') {
        googleCard.classList.remove('hidden');
    } else if (cardType === 'setup') {
        setupCard.classList.remove('hidden');
    } else if (cardType === 'forgot') {
        forgotCard.classList.remove('hidden');
    } else {
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

async function loginWithFirebaseGoogle() {
    if (typeof firebase !== 'undefined' && firebaseAuth && googleProvider) {
        try {
            const userCredential = await firebaseAuth.signInWithPopup(googleProvider);
            const user = userCredential.user;
            const googleEmail = user.email;
            const googleName = user.displayName || 'Doctor User';

            // Authenticate session with backend FIRST
            const response = await fetch('/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: googleName, email: googleEmail })
            });

            const result = await response.json();
            if (response.ok && result.status === 'success') {
                successfulAuthTransition();

                // Background non-blocking Firestore Cloud DB sync
                if (firebaseDB) {
                    firebaseDB.collection('users').doc(user.uid).set({
                        uid: user.uid,
                        email: googleEmail,
                        name: googleName,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(err => console.warn("Firestore sync warning:", err));
                }
            } else if (result.status === 'setup_required') {
                document.getElementById('setup-email').value = result.email;
                document.getElementById('setup-name').value = result.name;
                document.getElementById('setup-username').value = result.email;
                toggleLoginCard('setup');
            } else {
                alert(`Authentication error: ${result.message}`);
                toggleLoginCard('google');
            }
            return;
        } catch (error) {
            console.warn("Firebase Google popup authentication:", error.code, error.message);
            if (error.code === 'auth/unauthorized-domain') {
                alert(`⚠️ Domain Authorization Required in Firebase Console!\n\nPlease add your local IP/domain (e.g. 127.0.0.1 or 10.137.146.140) to Firebase Console -> Authentication -> Settings -> Authorized Domains.\n\nOpening Google Email Login below...`);
            }
            toggleLoginCard('google');
        }
    } else {
        toggleLoginCard('google');
    }
}

document.getElementById('google-email-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('google-input-email').value.trim();
    const name = document.getElementById('google-input-name').value.trim();
    const errorDiv = document.getElementById('google-auth-error');

    errorDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, email: email })
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
            errorDiv.textContent = result.message || 'Authentication error.';
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        errorDiv.textContent = 'Server connection error during Google sign-in.';
        errorDiv.classList.remove('hidden');
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
            body: JSON.stringify({ email: email, name: name, username: username, password: password })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
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
        if (typeof firebaseAuth !== 'undefined' && firebaseAuth) {
            await firebaseAuth.signOut();
        }
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
    else if (pageId === 'predict-page') {
        changeBackground('implant.jpg');
        resetPredictorForm();
    }
    else if (pageId === 'history-page') changeBackground('view.jpg');
    else if (pageId === 'profile-page') {
        changeBackground('view.jpg'); 
        resetProfilePage();
    }
    else if (pageId === 'analytics-page') changeBackground('view.jpg');
}

function resetPredictorForm() {
    const form = document.getElementById('predictor-form');
    if (form) form.reset();

    const resultsCard = document.getElementById('results-card');
    if (resultsCard) resultsCard.classList.add('hidden');

    const expSection = document.getElementById('explanation-section');
    if (expSection) expSection.classList.add('hidden');

    const expBreakdown = document.getElementById('explanation-breakdown');
    if (expBreakdown) expBreakdown.innerHTML = '';

    const scoreDisplay = document.getElementById('survival-score');
    if (scoreDisplay) {
        scoreDisplay.innerText = '--%';
        scoreDisplay.style.color = '#1e2d3c';
    }
}

function resetProfilePage() {
    toggleProfileEdit(false);
    togglePasswordModal(false);
    const forgotContainer = document.getElementById('profile-forgot-container');
    if (forgotContainer) forgotContainer.classList.add('hidden');
    
    const profMsg = document.getElementById('profile-update-msg');
    if (profMsg) { profMsg.classList.add('hidden'); profMsg.textContent = ''; }
    
    const pwMsg = document.getElementById('password-update-msg');
    if (pwMsg) { pwMsg.classList.add('hidden'); pwMsg.textContent = ''; }

    fetchProfile();
}

// --- 4. PREDICTOR ENGINE CONTROLLER ---
let lastPredictionItem = null;
let currentModalItem = null;

document.getElementById('predictor-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        patientName: document.getElementById('patientName').value,
        patientId: document.getElementById('patientId').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        bone_quality: document.getElementById('bone_quality').value,
        jaw_location: document.getElementById('jaw_location').value,
        oral_hygiene: document.getElementById('oral_hygiene').value,
        implant_length_mm: document.getElementById('implant_length_mm').value,
        implant_diameter_mm: document.getElementById('implant_diameter_mm').value,
        implant_surface: document.getElementById('implant_surface').value,
        smoking_status: document.getElementById('smoking_status').value,
        diabetes: document.getElementById('diabetes').checked ? 'yes' : 'no',
        history_periodontitis: document.getElementById('history_periodontitis').checked ? 'yes' : 'no',
        bruxism: document.getElementById('bruxism').checked ? 'yes' : 'no'
    };

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            const scoreDisplay = document.getElementById('survival-score');
            scoreDisplay.innerText = `${result.survival_probability}%`;
            scoreDisplay.style.color = result.survival_probability >= 90 ? '#27ae60' : (result.survival_probability >= 80 ? '#d35400' : '#c62828');
            
            const explanationList = document.getElementById('explanation-breakdown');
            explanationList.innerHTML = '';
            
            if (result.explanations && result.explanations.length > 0) {
                result.explanations.forEach(exp => {
                    const direction = exp.impact > 0 ? '🟢 Positive' : '🔴 Negative';
                    const sign = exp.impact > 0 ? '+' : '';
                    explanationList.innerHTML += `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; font-size: 0.9rem;">
                            <span><strong>${exp.factor}</strong></span>
                            <span>${direction} (${sign}${exp.impact}%)</span>
                        </div>
                    `;
                });
                document.getElementById('explanation-section').classList.remove('hidden');
            } else {
                document.getElementById('explanation-section').classList.add('hidden');
            }

            lastPredictionItem = {
                patient_name: formData.patientName,
                patient_id: formData.patientId,
                date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                age: formData.age,
                gender: formData.gender,
                smoking_status: formData.smoking_status,
                diabetes: formData.diabetes,
                history_periodontitis: formData.history_periodontitis,
                bruxism: formData.bruxism,
                oral_hygiene: formData.oral_hygiene,
                bone_quality: formData.bone_quality,
                jaw_location: formData.jaw_location,
                implant_length_mm: formData.implant_length_mm,
                implant_diameter_mm: formData.implant_diameter_mm,
                implant_surface: formData.implant_surface,
                score: result.survival_probability
            };

            // Unhide results card IMMEDIATELY
            const resultsCard = document.getElementById('results-card');
            resultsCard.classList.remove('hidden');
            resultsCard.scrollIntoView({ behavior: 'smooth' });

            // Non-blocking background save to Firebase Firestore
            if (typeof firebaseDB !== 'undefined' && firebaseDB) {
                firebaseDB.collection('patient_history').add({
                    ...lastPredictionItem,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    console.log("🔥 Patient evaluation saved directly to Firebase Firestore Cloud Database!");
                }).catch(fsErr => {
                    console.warn("Firestore patient history save warning:", fsErr);
                });
            }
        } else {
            alert(`Prediction Error: ${result.message}`);
        }
    } catch (error) {
        alert(`Communication error: ${error.message}`);
    }
});

// --- 5. HISTORY, PDF & ANALYTICS DASHBOARD LOGIC ---
let cachedHistoryData = [];
let currentAnalyticsCategory = 'all';

async function fetchHistory() {
    const listElement = document.getElementById('history-list');
    closePatientModal();
    try {
        const response = await fetch('/get_history');
        
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            logout();
            return;
        }

        cachedHistoryData = await response.json();
        listElement.innerHTML = '';

        if (!Array.isArray(cachedHistoryData) || cachedHistoryData.length === 0) {
            listElement.innerHTML = '<li style="color:#000; text-align: center; padding: 20px;">No historic entries recorded yet.</li>';
            return;
        }

        cachedHistoryData.slice().reverse().forEach(item => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '15px 20px';
            li.style.marginBottom = '12px';
            li.style.background = '#f8f9fa';
            li.style.borderRadius = '8px';
            li.style.border = '1px solid #e2e8f0';

            li.innerHTML = `
                <div style="text-align: left;">
                    <a href="javascript:void(0)" onclick="showPatientDetails(${item.id})" style="color: #1e2d3c; text-decoration: none; font-size: 1.15rem; font-weight: bold; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='#2980b9'" onmouseout="this.style.color='#1e2d3c'">
                        👤 ${item.patient_name} <span style="font-size: 0.85rem; color: #7f8c8d; font-weight: normal;">(ID: ${item.patient_id})</span> 🔍
                    </a>
                    <div style="color: #7f8c8d; font-size: 0.85rem; margin-top: 4px;">
                        📅 Evaluated: ${item.date} | Age: ${item.age} yrs | ${item.gender}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: bold; font-size: 1.2rem; padding: 6px 12px; border-radius: 6px; background: #fff; border: 1px solid #ddd; color: ${item.score >= 90 ? '#27ae60' : (item.score >= 80 ? '#d35400' : '#c62828')};">
                        ${item.score}%
                    </span>
                    <button type="button" class="btn-primary" onclick="downloadPatientPDFById(${item.id})" style="padding: 6px 10px; font-size: 0.85rem; background: #27ae60;" title="Download PDF Report">📄 PDF</button>
                    <button class="btn-delete" onclick="deleteRecord(${item.id})" title="Delete Record" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">🗑️</button>
                </div>
            `;
            listElement.appendChild(li);
        });
    } catch (error) {
        listElement.innerHTML = '<li style="color:red; text-align: center;">Failed to load patient history.</li>';
    }
}

function showPatientDetails(recordId) {
    const item = cachedHistoryData.find(r => r.id === recordId);
    if (!item) return;

    currentModalItem = item;
    const modal = document.getElementById('patient-details-modal');
    const modalTitle = document.getElementById('modal-patient-name');
    const modalBody = document.getElementById('modal-patient-body');

    modalTitle.innerHTML = `📋 ${item.patient_name} <span style="font-size: 1rem; color: #7f8c8d;">(Patient ID: ${item.patient_id})</span>`;

    const scoreColor = item.score >= 90 ? '#27ae60' : (item.score >= 80 ? '#d35400' : '#c62828');

    modalBody.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <!-- Patient Demographics & Assessment Card -->
            <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.1rem; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px;">👤 Patient Information</h3>
                <p style="margin-bottom: 8px; color: #333;"><strong>Full Name:</strong> ${item.patient_name}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Patient ID:</strong> ${item.patient_id}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Evaluation Date:</strong> ${item.date}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Age:</strong> ${item.age} years old</p>
                <p style="margin-bottom: 0; color: #333;"><strong>Gender:</strong> ${item.gender}</p>
            </div>

            <!-- Survival Score Prognosis Card -->
            <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.1rem; margin-bottom: 10px;">📊 Calculated 10-Year Survival Score</h3>
                <div style="font-size: 3rem; font-weight: bold; color: ${scoreColor}; margin-bottom: 5px;">
                    ${item.score}%
                </div>
                <div style="font-size: 0.9rem; color: #555; font-weight: 500;">
                    ${item.score >= 90 ? '🟢 Excellent Prognosis' : (item.score >= 80 ? '🟠 Moderate Prognosis' : '🔴 High Risk Profile')}
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Clinical & Systemic Risk Factors -->
            <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.1rem; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px;">🩺 Clinical & Systemic Factors</h3>
                <p style="margin-bottom: 8px; color: #333;"><strong>Smoking Status:</strong> ${item.smoking_status}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Diabetes Mellitus:</strong> ${item.diabetes === 'yes' ? '⚠️ Yes (Present)' : '✅ No'}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>History of Periodontitis:</strong> ${item.history_periodontitis === 'yes' ? '⚠️ Yes (Present)' : '✅ No'}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Bruxism / Parafunction:</strong> ${item.bruxism === 'yes' ? '⚠️ Yes (Present)' : '✅ No'}</p>
                <p style="margin-bottom: 0; color: #333;"><strong>Oral Hygiene Index:</strong> ${item.oral_hygiene}</p>
            </div>

            <!-- Anatomical & Implant Parameters -->
            <div style="background: #f8f9fa; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.1rem; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px;">🦴 Anatomical & Implant Specs</h3>
                <p style="margin-bottom: 8px; color: #333;"><strong>Bone Quality:</strong> ${item.bone_quality}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Jaw Site Location:</strong> ${item.jaw_location}</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Implant Length:</strong> ${item.implant_length_mm} mm</p>
                <p style="margin-bottom: 8px; color: #333;"><strong>Implant Diameter:</strong> ${item.implant_diameter_mm} mm</p>
                <p style="margin-bottom: 0; color: #333;"><strong>Implant Surface Type:</strong> ${item.implant_surface}</p>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.scrollIntoView({ behavior: 'smooth' });
}

function closePatientModal() {
    const modal = document.getElementById('patient-details-modal');
    if (modal) modal.classList.add('hidden');
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
        if (result.status === 'success') {
            closePatientModal();
            fetchHistory();
            renderAnalyticsDashboard();
        } else {
            alert(`Execution failed: ${result.message}`);
        }
    } catch (error) {
        alert(`Communication exception encountered: ${error.message}`);
    }
}

// --- PDF REPORT GENERATOR ---
function downloadCurrentPredictionPDF() {
    if (lastPredictionItem) {
        downloadPatientPDF(lastPredictionItem);
    } else {
        alert("No active prediction found to export.");
    }
}

function downloadModalPDF() {
    if (currentModalItem) {
        downloadPatientPDF(currentModalItem);
    } else {
        alert("No patient selected for PDF export.");
    }
}

function downloadPatientPDFById(recordId) {
    const item = cachedHistoryData.find(r => r.id === recordId);
    if (item) downloadPatientPDF(item);
    else alert("Patient record not found.");
}

function downloadPatientPDF(item) {
    const riskLabel = item.score >= 90 ? 'Low Risk (Excellent Prognosis)' : (item.score >= 80 ? 'Medium Risk (Moderate Prognosis)' : 'High Risk Profile');
    const riskColor = item.score >= 90 ? '#27ae60' : (item.score >= 80 ? '#d35400' : '#c62828');

    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '30px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.color = '#333';
    pdfContainer.style.background = '#fff';

    pdfContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e2d3c; padding-bottom: 15px; margin-bottom: 25px;">
            <div>
                <h1 style="margin: 0; color: #1e2d3c; font-size: 1.8rem;">ImplantAI Clinical Evaluation Report</h1>
                <p style="margin: 4px 0 0 0; color: #7f8c8d; font-size: 0.95rem;">Maxillofacial Prosthetics Survival Predictor</p>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: #555;">
                <p style="margin: 0;"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="margin: 3px 0 0 0;"><strong>Evaluation ID:</strong> ${item.patient_id || 'REG-' + Date.now().toString().substring(6)}</p>
            </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.1rem; border-bottom: 1px solid #ccc; padding-bottom: 6px;">👤 Patient & Evaluation Demographics</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                <tr>
                    <td style="padding: 6px 0;"><strong>Patient Name:</strong> ${item.patient_name}</td>
                    <td style="padding: 6px 0;"><strong>Patient ID:</strong> ${item.patient_id}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0;"><strong>Age / Gender:</strong> ${item.age} years / ${item.gender}</td>
                    <td style="padding: 6px 0;"><strong>Evaluation Date:</strong> ${item.date}</td>
                </tr>
            </table>
        </div>

        <div style="background: #1e2d3c; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <div style="font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Calculated 10-Year Survival Probability</div>
            <div style="font-size: 3.2rem; font-weight: bold; margin: 8px 0; color: #fff;">${item.score}%</div>
            <div style="display: inline-block; padding: 6px 16px; border-radius: 20px; background: ${riskColor}; color: white; font-weight: bold; font-size: 0.95rem;">
                Category: ${riskLabel}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin-top:0; color: #1e2d3c; border-bottom: 1px solid #ddd; padding-bottom: 6px;">🩺 Systemic Risk Factors</h4>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Smoking Status:</strong> ${item.smoking_status}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Diabetes Mellitus:</strong> ${item.diabetes === 'yes' ? 'Present (Yes)' : 'Absent (No)'}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>History of Periodontitis:</strong> ${item.history_periodontitis === 'yes' ? 'Present (Yes)' : 'Absent (No)'}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Bruxism / Parafunction:</strong> ${item.bruxism === 'yes' ? 'Present (Yes)' : 'Absent (No)'}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Oral Hygiene Index:</strong> ${item.oral_hygiene}</p>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin-top:0; color: #1e2d3c; border-bottom: 1px solid #ddd; padding-bottom: 6px;">🦴 Anatomical & Implant Specs</h4>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Bone Quality:</strong> ${item.bone_quality}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Jaw Location:</strong> ${item.jaw_location}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Implant Length:</strong> ${item.implant_length_mm} mm</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Implant Diameter:</strong> ${item.implant_diameter_mm} mm</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Implant Surface:</strong> ${item.implant_surface}</p>
            </div>
        </div>

        <div style="border-top: 1px solid #ddd; padding-top: 15px; text-align: center; font-size: 0.8rem; color: #7f8c8d;">
            <p>ImplantAI Decision Support Platform — Generated for Clinical Consultation Only.</p>
        </div>
    `;

    const opt = {
        margin:       10,
        filename:     `ImplantAI_Report_${item.patient_name.replace(/\s+/g, '_')}_${item.patient_id}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContainer).save();
}

// --- ANALYTICS DASHBOARD LOGIC ---
async function renderAnalyticsDashboard() {
    try {
        const response = await fetch('/get_history');
        if (response.ok) {
            cachedHistoryData = await response.json();
        }
    } catch (e) {
        console.warn("Analytics fetch error", e);
    }

    const data = cachedHistoryData || [];
    const total = data.length;

    const lowRisk = data.filter(d => d.score >= 90);
    const medRisk = data.filter(d => d.score >= 80 && d.score < 90);
    const highRisk = data.filter(d => d.score < 80);

    const lowPct = total > 0 ? Math.round((lowRisk.length / total) * 100) : 0;
    const medPct = total > 0 ? Math.round((medRisk.length / total) * 100) : 0;
    const highPct = total > 0 ? Math.round((highRisk.length / total) * 100) : 0;

    document.getElementById('analytics-total-count').innerText = total;
    document.getElementById('analytics-low-risk-count').innerText = `${lowRisk.length} (${lowPct}%)`;
    document.getElementById('analytics-med-risk-count').innerText = `${medRisk.length} (${medPct}%)`;
    document.getElementById('analytics-high-risk-count').innerText = `${highRisk.length} (${highPct}%)`;

    document.getElementById('bar-low-risk').style.width = `${lowPct}%`;
    document.getElementById('bar-med-risk').style.width = `${medPct}%`;
    document.getElementById('bar-high-risk').style.width = `${highPct}%`;

    document.getElementById('pct-low-risk').innerText = `${lowPct}% (${lowRisk.length} pts)`;
    document.getElementById('pct-med-risk').innerText = `${medPct}% (${medRisk.length} pts)`;
    document.getElementById('pct-high-risk').innerText = `${highPct}% (${highRisk.length} pts)`;

    filterAnalyticsCategory(currentAnalyticsCategory);
}

function filterAnalyticsCategory(category) {
    currentAnalyticsCategory = category;
    
    document.querySelectorAll('.filter-tab').forEach(b => b.style.opacity = '0.7');
    const activeBtn = document.getElementById(`tab-${category}`);
    if (activeBtn) activeBtn.style.opacity = '1.0';

    const listElement = document.getElementById('analytics-patient-list');
    listElement.innerHTML = '';

    let filtered = cachedHistoryData || [];
    if (category === 'low') {
        filtered = filtered.filter(d => d.score >= 90);
    } else if (category === 'medium') {
        filtered = filtered.filter(d => d.score >= 80 && d.score < 90);
    } else if (category === 'high') {
        filtered = filtered.filter(d => d.score < 80);
    }

    if (filtered.length === 0) {
        listElement.innerHTML = '<li style="color:#7f8c8d; text-align: center; padding: 20px;">No patients found in this risk classification category.</li>';
        return;
    }

    filtered.slice().reverse().forEach(item => {
        const riskCategory = item.score >= 90 ? '🟢 Low Risk' : (item.score >= 80 ? '🟠 Medium Risk' : '🔴 High Risk');
        const badgeColor = item.score >= 90 ? '#27ae60' : (item.score >= 80 ? '#d35400' : '#c62828');

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '15px 20px';
        li.style.marginBottom = '12px';
        li.style.background = '#f8f9fa';
        li.style.borderRadius = '8px';
        li.style.border = '1px solid #e2e8f0';

        li.innerHTML = `
            <div style="text-align: left;">
                <div style="font-size: 1.15rem; font-weight: bold; color: #1e2d3c;">
                    👤 ${item.patient_name} <span style="font-size: 0.85rem; color: #7f8c8d; font-weight: normal;">(ID: ${item.patient_id})</span>
                </div>
                <div style="color: #7f8c8d; font-size: 0.85rem; margin-top: 4px;">
                    📅 Evaluated: ${item.date} | Age: ${item.age} yrs | Bone: ${item.bone_quality} | Jaw: ${item.jaw_location}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 0.85rem; font-weight: bold; padding: 4px 10px; border-radius: 4px; color: white; background: ${badgeColor};">
                    ${riskCategory} (${item.score}%)
                </span>
                <button type="button" class="btn-primary" onclick="downloadPatientPDFById(${item.id})" style="padding: 6px 10px; font-size: 0.85rem; background: #27ae60;" title="Download PDF Report">📄 PDF</button>
            </div>
        `;
        listElement.appendChild(li);
    });
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

function toggleProfileForgotForm(show) {
    const pwContainer = document.getElementById('password-change-container');
    const pfContainer = document.getElementById('profile-forgot-container');
    const pfMsg = document.getElementById('pf-msg');

    pfMsg.classList.add('hidden');
    pfMsg.textContent = '';

    if (show) {
        pwContainer.classList.add('hidden');
        pfContainer.classList.remove('hidden');
        const userEmail = document.getElementById('profile-email').textContent;
        document.getElementById('pf-email').value = (userEmail && !userEmail.includes('Loading')) ? userEmail : '';
        document.getElementById('pf-new-pw').value = '';
        document.getElementById('pf-confirm-pw').value = '';
    } else {
        pfContainer.classList.add('hidden');
        pwContainer.classList.remove('hidden');
    }
}

document.getElementById('profile-forgot-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('pf-email').value;
    const newPw = document.getElementById('pf-new-pw').value;
    const confirmPw = document.getElementById('pf-confirm-pw').value;
    const pfMsg = document.getElementById('pf-msg');

    pfMsg.classList.add('hidden');

    if (newPw !== confirmPw) {
        pfMsg.style.color = '#c62828';
        pfMsg.textContent = '❌ New password and confirmation do not match.';
        pfMsg.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/auth/forgot_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                new_password: newPw,
                confirm_password: confirmPw
            })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            pfMsg.style.color = '#2e7d32';
            pfMsg.textContent = '✅ ' + result.message;
            pfMsg.classList.remove('hidden');

            setTimeout(() => {
                toggleProfileForgotForm(false);
                togglePasswordModal(false);
            }, 1500);
        } else {
            pfMsg.style.color = '#c62828';
            pfMsg.textContent = '❌ ' + (result.message || 'Password reset failed.');
            pfMsg.classList.remove('hidden');
        }
    } catch (err) {
        pfMsg.style.color = '#c62828';
        pfMsg.textContent = '❌ Communication error.';
        pfMsg.classList.remove('hidden');
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