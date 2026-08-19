// --- 0. BACKGROUND HANDLER ---
function changeBackground(imageName) {
    document.body.style.backgroundImage = `linear-gradient(rgba(30, 45, 60, 0.7), rgba(30, 45, 60, 0.7)), url('/static/${imageName}')`;
}
changeBackground('loginpage.jpg');

// --- 1. DUAL LOGIN (DOCTOR / PATIENT) & AUTHENTICATION ---
let currentLoginRole = 'doctor';

function selectLoginRole(role) {
    currentLoginRole = role;
    const docTab = document.getElementById('role-tab-doctor');
    const patTab = document.getElementById('role-tab-patient');
    const heading = document.getElementById('login-heading');
    const subheading = document.getElementById('login-subheading');
    const usernameInput = document.getElementById('username');
    const submitBtn = document.getElementById('login-submit-btn');
    const googleBtnText = document.getElementById('google-btn-text');
    const setupRole = document.getElementById('setup-role');
    const setupDocFields = document.getElementById('setup-doctor-fields');
    const setupPatFields = document.getElementById('setup-patient-fields');

    if (role === 'doctor') {
        docTab.style.background = '#1e2d3c';
        docTab.style.color = '#fff';
        docTab.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        patTab.style.background = 'transparent';
        patTab.style.color = '#64748b';
        patTab.style.boxShadow = 'none';

        heading.textContent = '🩺 Doctor Clinical Login';
        subheading.textContent = 'Access prognostic engine, surgical history & implant tools';
        usernameInput.placeholder = 'Doctor Username or Email';
        submitBtn.textContent = 'Secure Doctor Login';
        if (googleBtnText) googleBtnText.textContent = 'Continue as Doctor with Google';
        
        if (setupRole) setupRole.value = 'doctor';
        if (setupDocFields) setupDocFields.classList.remove('hidden');
        if (setupPatFields) setupPatFields.classList.add('hidden');
    } else {
        patTab.style.background = '#1e2d3c';
        patTab.style.color = '#fff';
        patTab.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        docTab.style.background = 'transparent';
        docTab.style.color = '#64748b';
        docTab.style.boxShadow = 'none';

        heading.textContent = '👤 Patient Portal Login';
        subheading.textContent = 'Access personal implant evaluations & medical records';
        usernameInput.placeholder = 'Patient Username or Email';
        submitBtn.textContent = 'Secure Patient Login';
        if (googleBtnText) googleBtnText.textContent = 'Continue as Patient with Google';

        if (setupRole) setupRole.value = 'patient';
        if (setupDocFields) setupDocFields.classList.add('hidden');
        if (setupPatFields) setupPatFields.classList.remove('hidden');
    }
}

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
            body: JSON.stringify({ username: user, password: pass, role: currentLoginRole })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            successfulAuthTransition(result.role || currentLoginRole);
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
            const googleName = user.displayName || (currentLoginRole === 'doctor' ? 'Dr. Sarah Smith' : 'John Doe');

            // Authenticate session with backend FIRST
            const response = await fetch('/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: googleName, email: googleEmail, role: currentLoginRole })
            });

            const result = await response.json();
            if (response.ok && result.status === 'success') {
                successfulAuthTransition(result.role || currentLoginRole);

                // Background non-blocking Firestore Cloud DB sync (doctors/email or patients/email)
                if (firebaseDB) {
                    const collName = (currentLoginRole === 'doctor') ? 'doctors' : 'patients';
                    firebaseDB.collection(collName).doc(googleEmail.toLowerCase()).set({
                        email: googleEmail,
                        name: googleName,
                        role: currentLoginRole,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(err => console.warn("Firestore sync warning:", err));
                }
            } else if (result.status === 'setup_required') {
                document.getElementById('setup-email').value = result.email;
                document.getElementById('setup-name').value = result.name;
                document.getElementById('setup-username').value = result.email.split('@')[0];
                selectLoginRole(result.role || currentLoginRole);
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
            body: JSON.stringify({ name: name, email: email, role: currentLoginRole })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            successfulAuthTransition(result.role || currentLoginRole);
        } else if (result.status === 'setup_required') {
            document.getElementById('setup-email').value = result.email;
            document.getElementById('setup-name').value = result.name;
            document.getElementById('setup-username').value = result.email.split('@')[0];
            selectLoginRole(result.role || currentLoginRole);
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
    const phone = document.getElementById('setup-phone').value;
    const role = document.getElementById('setup-role').value || currentLoginRole;

    const specialty = document.getElementById('setup-specialty')?.value || '';
    const clinicName = document.getElementById('setup-clinic')?.value || '';
    const hospAddr = document.getElementById('setup-hospital-address')?.value || '';
    const address = document.getElementById('setup-patient-address')?.value || '';
    const age = document.getElementById('setup-patient-age')?.value || '';
    const gender = document.getElementById('setup-patient-gender')?.value || 'Male';
    const guardianName = document.getElementById('setup-patient-guardian-name')?.value || '';
    const guardianPhone = document.getElementById('setup-patient-guardian-phone')?.value || '';

    const errorDiv = document.getElementById('setup-error');
    errorDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/complete_setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                name: name, 
                username: username, 
                password: password,
                role: role,
                phone: phone,
                specialty: specialty,
                clinic_name: clinicName,
                hospital_address: hospAddr,
                address: address,
                age: age,
                gender: gender,
                guardian_name: guardianName,
                guardian_phone: guardianPhone
            })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            successfulAuthTransition(result.role || currentLoginRole);
        } else {
            errorDiv.textContent = result.message || 'Setup failed.';
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        errorDiv.textContent = 'Server connection error.';
        errorDiv.classList.remove('hidden');
    }
});

// --- 3-STEP OTP FORGOT PASSWORD CONTROLLERS ---
let resetEmailStorage = '';

function resetForgotCardToStep1() {
    document.getElementById('forgot-step1-form').classList.remove('hidden');
    document.getElementById('forgot-step2-form').classList.add('hidden');
    document.getElementById('forgot-step3-form').classList.add('hidden');
    document.getElementById('forgot-card-title').innerText = "🔑 Forgot Password";
    document.getElementById('forgot-card-subtitle').innerText = "Enter your registered email address to receive a 6-digit OTP verification code";
    document.getElementById('forgot-msg-step1').classList.add('hidden');
}

// Step 1: Request OTP for registered email
document.getElementById('forgot-step1-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const msgDiv = document.getElementById('forgot-msg-step1');
    msgDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/send_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const result = await response.json();

        if (response.ok && result.status === 'success') {
            resetEmailStorage = email;
            document.getElementById('forgot-step1-form').classList.add('hidden');
            document.getElementById('forgot-step2-form').classList.remove('hidden');
            document.getElementById('forgot-card-title').innerText = "📩 Enter Verification OTP";
            document.getElementById('forgot-card-subtitle').innerText = `Verification code sent to ${email}`;
        } else {
            msgDiv.textContent = '❌ ' + (result.message || 'Email not found.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.textContent = '❌ Server connection error.';
        msgDiv.classList.remove('hidden');
    }
});

// Step 2: Verify 6-Digit OTP
document.getElementById('forgot-step2-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const otpInput = document.getElementById('forgot-otp-input').value.trim();
    const msgDiv = document.getElementById('forgot-msg-step2');
    msgDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/verify_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetEmailStorage, otp: otpInput })
        });
        const result = await response.json();

        if (response.ok && result.status === 'success') {
            document.getElementById('forgot-step2-form').classList.add('hidden');
            document.getElementById('forgot-step3-form').classList.remove('hidden');
            document.getElementById('forgot-card-title').innerText = "🔒 Set New Password";
            document.getElementById('forgot-card-subtitle').innerText = "OTP Verified! Set your new account password";
        } else {
            msgDiv.textContent = '❌ ' + (result.message || 'Invalid OTP.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.textContent = '❌ Connection error.';
        msgDiv.classList.remove('hidden');
    }
});

// Step 3: Reset Password with OTP Verification token
document.getElementById('forgot-step3-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newPassword = document.getElementById('forgot-new-password').value;
    const confirmPassword = document.getElementById('forgot-confirm-password').value;
    const msgDiv = document.getElementById('forgot-msg-step3');
    msgDiv.classList.add('hidden');

    if (newPassword !== confirmPassword) {
        msgDiv.textContent = '❌ New password and confirmation do not match.';
        msgDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/auth/reset_password_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: resetEmailStorage,
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            msgDiv.style.color = '#27ae60';
            msgDiv.textContent = '✅ ' + result.message;
            msgDiv.classList.remove('hidden');

            setTimeout(() => {
                resetForgotCardToStep1();
                toggleLoginCard('login');
            }, 1800);
        } else {
            msgDiv.style.color = '#c62828';
            msgDiv.textContent = '❌ ' + (result.message || 'Password update failed.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ Server connection error.';
        msgDiv.classList.remove('hidden');
    }
});

function updateRoleBasedSidebar(role) {
    const activeRole = role || currentLoginRole || 'doctor';
    const analyticsLink = document.getElementById('sidebar-analytics-link');
    if (analyticsLink) {
        if (activeRole === 'doctor') {
            analyticsLink.style.display = 'block';
        } else {
            analyticsLink.style.display = 'none';
        }
    }
}

function successfulAuthTransition(role) {
    const activeRole = role || currentLoginRole || 'doctor';
    updateRoleBasedSidebar(activeRole);
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

            // Non-blocking background save to Firebase Firestore Subcollection
            if (typeof firebaseDB !== 'undefined' && firebaseDB) {
                const userEmail = (currentProfileData && currentProfileData.email ? currentProfileData.email : 'user@clinicalportal.com').trim().toLowerCase();
                const collName = (currentLoginRole === 'doctor') ? 'doctors' : 'patients';

                firebaseDB.collection(collName).doc(userEmail).collection('patient_history').add({
                    ...lastPredictionItem,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    console.log(`🔥 Patient evaluation saved directly to Firebase Firestore: ${collName}/${userEmail}/patient_history`);
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
// --- PDF REPORT GENERATOR ---
async function ensureProfileLoaded() {
    if (!currentProfileData) {
        try {
            const res = await fetch('/get_profile');
            if (res.ok) {
                currentProfileData = await res.json();
            }
        } catch (e) {
            console.warn("Profile fetch warning in PDF generator:", e);
        }
    }
}

async function downloadCurrentPredictionPDF() {
    if (lastPredictionItem) {
        await downloadPatientPDF(lastPredictionItem);
    } else {
        alert("No active prediction found to export.");
    }
}

async function downloadModalPDF() {
    if (currentModalItem) {
        await downloadPatientPDF(currentModalItem);
    } else {
        alert("No patient selected for PDF export.");
    }
}

async function downloadPatientPDFById(recordId) {
    const item = cachedHistoryData.find(r => r.id === recordId);
    if (item) await downloadPatientPDF(item);
    else alert("Patient record not found.");
}

async function downloadPatientPDF(item) {
    if (!item) {
        alert("No evaluation record selected for PDF export.");
        return;
    }

    await ensureProfileLoaded();

    const isDoctor = (currentProfileData && currentProfileData.role === 'doctor') || (currentLoginRole === 'doctor');
    
    // Doctor Details (Used strictly when user is a Doctor)
    const docName = (currentProfileData && currentProfileData.name && !currentProfileData.name.includes('(Patient)')) 
                    ? currentProfileData.name 
                    : 'Dr. Sarah Smith';
    const docPhone = (currentProfileData && currentProfileData.phone) || '+91 98765 43210';
    const docEmail = (currentProfileData && currentProfileData.email) || 'doctor@clinicalportal.com';
    const clinicName = (currentProfileData && currentProfileData.clinic_name) || 'City Dental & Maxillofacial Hospital';
    const hospAddr = (currentProfileData && currentProfileData.hospital_address) || 'Saveetha Nagar, Poonamallee High Rd, Chennai';
    const licenseNo = (currentProfileData && currentProfileData.license_number) || 'MCI/DCI-784920';

    const riskLabel = item.score >= 90 ? 'Low Risk (Excellent Prognosis)' : (item.score >= 80 ? 'Medium Risk (Moderate Prognosis)' : 'High Risk Profile');
    const riskColor = item.score >= 90 ? '#27ae60' : (item.score >= 80 ? '#d35400' : '#c62828');

    // Build Role-Specific Header & Demographic Blocks
    let headerHtml = '';
    let demographicsHtml = '';

    if (isDoctor) {
        // 1. DOCTOR LOGIN: Prominently mention Doctor Name, Phone Number, and Mail ID
        headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e2d3c; padding-bottom: 15px; margin-bottom: 25px;">
                <div>
                    <h1 style="margin: 0; color: #1e2d3c; font-size: 1.65rem;">ImplantAI Clinical Evaluation Report</h1>
                    <p style="margin: 4px 0 0 0; color: #7f8c8d; font-size: 0.92rem;">Maxillofacial Prosthetics & Dental Implant Prognosis</p>
                    <p style="margin: 4px 0 0 0; color: #2c3e50; font-size: 0.85rem;"><strong>🏥 Clinic / Hospital:</strong> ${clinicName} (${hospAddr})</p>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 0.8rem;"><strong>📜 Medical License:</strong> ${licenseNo}</p>
                </div>
                <div style="text-align: right; font-size: 0.88rem; color: #333; line-height: 1.45; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; min-width: 240px;">
                    <p style="margin: 0 0 4px 0; color: #1e2d3c; font-weight: bold; font-size: 0.95rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px;">👨‍⚕️ Attending Doctor Details</p>
                    <p style="margin: 3px 0;"><strong>Doctor Name:</strong> ${docName}</p>
                    <p style="margin: 3px 0;"><strong>Phone Number:</strong> ${docPhone}</p>
                    <p style="margin: 3px 0;"><strong>Mail ID:</strong> ${docEmail}</p>
                    <p style="margin: 3px 0; color: #64748b; font-size: 0.8rem;"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
        `;

        demographicsHtml = `
            <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.05rem; border-bottom: 1px solid #ccc; padding-bottom: 6px;">👤 Patient & Clinical Demographics</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.92rem;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Patient Name:</strong> ${item.patient_name}</td>
                        <td style="padding: 5px 0;"><strong>Attending Doctor:</strong> ${docName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Patient ID:</strong> ${item.patient_id || 'N/A'}</td>
                        <td style="padding: 5px 0;"><strong>Doctor Contact:</strong> ${docPhone} | ${docEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Age / Gender:</strong> ${item.age} years / ${item.gender}</td>
                        <td style="padding: 5px 0;"><strong>Evaluation Date:</strong> ${item.date}</td>
                    </tr>
                </table>
            </div>
        `;
    } else {
        // 2. PATIENT LOGIN: Explicitly mention "Self Download"
        headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #27ae60; padding-bottom: 15px; margin-bottom: 25px;">
                <div>
                    <h1 style="margin: 0; color: #1e2d3c; font-size: 1.65rem;">ImplantAI Prognosis Report</h1>
                    <p style="margin: 4px 0 0 0; color: #7f8c8d; font-size: 0.92rem;">Personal Dental Implant Survival Assessment</p>
                    <p style="margin: 4px 0 0 0; color: #27ae60; font-weight: bold; font-size: 0.9rem;">📥 Self Download</p>
                </div>
                <div style="text-align: right; font-size: 0.88rem; color: #333; line-height: 1.45; background: #e8f5e9; padding: 12px 16px; border-radius: 8px; border: 1px solid #c8e6c9; min-width: 220px;">
                    <p style="margin: 0 0 4px 0; color: #2e7d32; font-weight: bold; font-size: 0.95rem; border-bottom: 1px solid #a5d6a7; padding-bottom: 3px;">📥 Download Information</p>
                    <p style="margin: 3px 0;"><strong>Mode:</strong> Self Download</p>
                    <p style="margin: 3px 0;"><strong>Patient Name:</strong> ${item.patient_name}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 0.8rem;"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
            </div>
        `;

        demographicsHtml = `
            <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <h3 style="margin-top:0; color: #1e2d3c; font-size: 1.05rem; border-bottom: 1px solid #ccc; padding-bottom: 6px;">👤 Patient Information</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.92rem;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Patient Name:</strong> ${item.patient_name}</td>
                        <td style="padding: 5px 0;"><strong>Report Type:</strong> <span style="background:#e8f5e9; color:#2e7d32; font-weight:bold; padding:2px 8px; border-radius:4px;">Self Download</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Patient ID:</strong> ${item.patient_id || 'N/A'}</td>
                        <td style="padding: 5px 0;"><strong>Consultation:</strong> Self Download (Personal Health Record)</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Age / Gender:</strong> ${item.age} years / ${item.gender}</td>
                        <td style="padding: 5px 0;"><strong>Evaluation Date:</strong> ${item.date}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    const pdfContainer = document.createElement('div');
    pdfContainer.id = 'temp-pdf-render-box';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.top = '0';
    pdfContainer.style.left = '0';
    pdfContainer.style.width = '780px';
    pdfContainer.style.padding = '35px';
    pdfContainer.style.fontFamily = 'Arial, Helvetica, sans-serif';
    pdfContainer.style.color = '#1e2d3c';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.zIndex = '-999999';
    pdfContainer.style.pointerEvents = 'none';

    pdfContainer.innerHTML = `
        ${headerHtml}
        ${demographicsHtml}

        <div style="background: #1e2d3c; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <div style="font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Calculated 10-Year Survival Probability</div>
            <div style="font-size: 3.2rem; font-weight: bold; margin: 8px 0; color: #fff;">${item.score}%</div>
            <div style="display: inline-block; padding: 6px 18px; border-radius: 20px; background: ${riskColor}; color: white; font-weight: bold; font-size: 0.95rem;">
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
            <p>${isDoctor ? 'ImplantAI Decision Support Platform — Generated for Clinical Consultation Only.' : 'ImplantAI Patient Portal — Generated as Self Download. Please consult your dental specialist for diagnosis.'}</p>
        </div>
    `;

    document.body.appendChild(pdfContainer);

    const safeName = (item.patient_name || 'Patient').replace(/\s+/g, '_');
    const safeId = item.patient_id || 'Record';
    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `ImplantAI_${isDoctor ? 'Doctor' : 'SelfDownload'}_Report_${safeName}_${safeId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            scrollY: 0,
            scrollX: 0,
            windowWidth: 800,
            backgroundColor: '#ffffff'
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(pdfContainer).save().then(() => {
            if (pdfContainer.parentNode) {
                pdfContainer.parentNode.removeChild(pdfContainer);
            }
        }).catch(err => {
            console.error("html2pdf generation error:", err);
            if (pdfContainer.parentNode) {
                pdfContainer.parentNode.removeChild(pdfContainer);
            }
            alert("Error downloading PDF: " + err.message);
        });
    } else {
        alert("PDF generator library is loading. Please try again in 2 seconds.");
        if (pdfContainer.parentNode) {
            pdfContainer.parentNode.removeChild(pdfContainer);
        }
    }
}

// --- 4B. DOCTOR CLINICAL ANALYTICS DASHBOARD ---
let chartPrognosisInstance = null;
let chartBoneInstance = null;
let chartRiskInstance = null;
let chartJawInstance = null;

async function renderAnalyticsDashboard() {
    if (cachedHistoryData.length === 0) {
        try {
            const res = await fetch('/get_history');
            if (res.ok) {
                cachedHistoryData = await res.json();
            }
        } catch (e) {
            console.error("Error loading history for analytics:", e);
        }
    }

    const data = cachedHistoryData || [];
    const total = data.length;

    const kpiTotal = document.getElementById('kpi-total-patients');
    const kpiAvg = document.getElementById('kpi-avg-survival');
    const kpiOptimal = document.getElementById('kpi-optimal-cases');
    const kpiRisk = document.getElementById('kpi-risk-cases');

    if (total === 0) {
        if (kpiTotal) kpiTotal.innerText = '0';
        if (kpiAvg) kpiAvg.innerText = '0.0%';
        if (kpiOptimal) kpiOptimal.innerText = '0';
        if (kpiRisk) kpiRisk.innerText = '0';
    } else {
        const scores = data.map(d => parseFloat(d.score) || 0);
        const sum = scores.reduce((a, b) => a + b, 0);
        const mean = (sum / total).toFixed(1);
        const optimal = scores.filter(s => s >= 90).length;
        const risk = scores.filter(s => s < 80).length;

        if (kpiTotal) kpiTotal.innerText = total;
        if (kpiAvg) kpiAvg.innerText = `${mean}%`;
        if (kpiOptimal) kpiOptimal.innerText = `${optimal} (${Math.round((optimal / total) * 100)}%)`;
        if (kpiRisk) kpiRisk.innerText = `${risk} (${Math.round((risk / total) * 100)}%)`;
    }

    // Prepare Chart Data
    const tierOptimal = data.filter(d => (parseFloat(d.score) || 0) >= 90).length;
    const tierModerate = data.filter(d => (parseFloat(d.score) || 0) >= 80 && (parseFloat(d.score) || 0) < 90).length;
    const tierRisk = data.filter(d => (parseFloat(d.score) || 0) < 80).length;

    const boneTypes = ['Type 1', 'Type 2', 'Type 3', 'Type 4'];
    const boneAverages = boneTypes.map(type => {
        const matching = data.filter(d => (d.bone_quality || '').toLowerCase() === type.toLowerCase());
        if (matching.length === 0) return 92;
        const s = matching.map(m => parseFloat(m.score) || 0).reduce((a, b) => a + b, 0);
        return parseFloat((s / matching.length).toFixed(1));
    });

    const smokers = data.filter(d => (d.smoking_status || '').toLowerCase() !== 'non-smoker').length;
    const diabetics = data.filter(d => (d.diabetes || '').toLowerCase() === 'yes').length;
    const perio = data.filter(d => (d.history_periodontitis || '').toLowerCase() === 'yes').length;
    const bruxism = data.filter(d => (d.bruxism || '').toLowerCase() === 'yes').length;

    const maxilla = data.filter(d => (d.jaw_location || '').toLowerCase() === 'maxilla').length || 1;
    const mandible = data.filter(d => (d.jaw_location || '').toLowerCase() === 'mandible').length || 1;

    if (typeof Chart === 'undefined') return;

    // Destroy existing instances if refreshing
    if (chartPrognosisInstance) chartPrognosisInstance.destroy();
    if (chartBoneInstance) chartBoneInstance.destroy();
    if (chartRiskInstance) chartRiskInstance.destroy();
    if (chartJawInstance) chartJawInstance.destroy();

    // Chart 1: Prognosis Tier
    const ctx1 = document.getElementById('chart-prognosis-distribution')?.getContext('2d');
    if (ctx1) {
        chartPrognosisInstance = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Optimal (≥90%)', 'Moderate (80-89%)', 'Elevated Risk (<80%)'],
                datasets: [{
                    data: total === 0 ? [10, 3, 1] : [tierOptimal, tierModerate, tierRisk],
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // Chart 2: Bone Density vs Survival
    const ctx2 = document.getElementById('chart-bone-survival')?.getContext('2d');
    if (ctx2) {
        chartBoneInstance = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Type 1 (Dense)', 'Type 2 (Porous Cortical)', 'Type 3 (Porous Trabecular)', 'Type 4 (Fine Trabecular)'],
                datasets: [{
                    label: 'Mean 10-Yr Survival %',
                    data: boneAverages,
                    backgroundColor: ['#2980b9', '#27ae60', '#f39c12', '#e74c3c'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { min: 70, max: 100 } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Chart 3: Risk Factors
    const ctx3 = document.getElementById('chart-risk-factors')?.getContext('2d');
    if (ctx3) {
        chartRiskInstance = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: ['Smoking', 'Diabetes', 'Periodontitis', 'Bruxism'],
                datasets: [{
                    label: 'Patient Cases Affected',
                    data: total === 0 ? [3, 2, 4, 1] : [smokers, diabetics, perio, bruxism],
                    backgroundColor: '#e67e22',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Chart 4: Jaw Location
    const ctx4 = document.getElementById('chart-jaw-location')?.getContext('2d');
    if (ctx4) {
        chartJawInstance = new Chart(ctx4, {
            type: 'pie',
            data: {
                labels: ['Maxilla (Upper Jaw)', 'Mandible (Lower Jaw)'],
                datasets: [{
                    data: [maxilla, mandible],
                    backgroundColor: ['#34495e', '#16a085']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}

// --- 5. INTERACTIVE DENTAL HOSPITALS MAP & DIRECTORY ---
let hospitalsMap = null;
let hospitalMarkers = [];
let userLocationMarker = null;

const DENTAL_HOSPITALS = [
    {
        id: 1,
        name: "Saveetha Dental & Maxillofacial Hospital",
        phone: "+91 44 2680 1580",
        altPhone: "+91 98410 23456",
        address: "Saveetha Nagar, 162 Poonamallee High Rd, Chennai, Tamil Nadu 600077",
        lat: 13.0544,
        lng: 80.0967,
        specialties: ["Oral & Maxillofacial Surgery", "Immediate Dental Implants", "Zygomatic Implants"],
        emergency: "🚨 24x7 Emergency Trauma Unit",
        rating: "4.9 ⭐⭐⭐⭐⭐",
        category: "maxillofacial"
    },
    {
        id: 2,
        name: "Apollo Dental & Craniofacial Center",
        phone: "+91 44 2829 0200",
        altPhone: "1800 102 0288",
        address: "Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006",
        lat: 13.0604,
        lng: 80.2496,
        specialties: ["Full-Mouth Dental Rehabilitation", "3D Guided Implantology", "Bone Regeneration"],
        emergency: "🚨 24x7 Dental Emergency Care",
        rating: "4.8 ⭐⭐⭐⭐⭐",
        category: "implant"
    },
    {
        id: 3,
        name: "Tamil Nadu Govt Dental College & Hospital",
        phone: "+91 44 2534 0343",
        altPhone: "+91 44 2534 0344",
        address: "Frazer Bridge Road, Opp. Fort Station, George Town, Chennai, Tamil Nadu 600003",
        lat: 13.0837,
        lng: 80.2838,
        specialties: ["Oral & Maxillofacial Trauma", "Periodontal Surgery", "Prosthodontic Implants"],
        emergency: "🚨 24x7 Trauma & Casualty Center",
        rating: "4.7 ⭐⭐⭐⭐⭐",
        category: "emergency"
    },
    {
        id: 4,
        name: "Balaji Dental & Craniofacial Hospital",
        phone: "+91 44 2432 6222",
        altPhone: "+91 98401 77777",
        address: "30 KB Dasan Road, Teynampet, Chennai, Tamil Nadu 600018",
        lat: 13.0368,
        lng: 80.2520,
        specialties: ["Craniofacial Implant Surgery", "Microvascular Reconstruction", "Advanced Bone Grafting"],
        emergency: "🚨 24x7 Surgical ICU & Emergency",
        rating: "4.9 ⭐⭐⭐⭐⭐",
        category: "maxillofacial"
    },
    {
        id: 5,
        name: "Sri Ramachandra Dental Hospital & Research Institute",
        phone: "+91 44 2476 8027",
        altPhone: "+91 44 4592 8500",
        address: "No. 1 Ramachandra Nagar, Porur, Chennai, Tamil Nadu 600116",
        lat: 13.0382,
        lng: 80.1418,
        specialties: ["Laser Implantology", "Cleft & Craniofacial Center", "Oral Oncology & Implants"],
        emergency: "🚨 24x7 Emergency Hospital Care",
        rating: "4.8 ⭐⭐⭐⭐⭐",
        category: "implant"
    },
    {
        id: 6,
        name: "Meenakshi Ammal Dental College & Hospital",
        phone: "+91 44 2378 0177",
        altPhone: "+91 44 2378 0178",
        address: "Alapakkam Main Road, Maduravoyal, Chennai, Tamil Nadu 600095",
        lat: 13.0569,
        lng: 80.1612,
        specialties: ["Basal Implantology", "Sinus Lift & Bone Augmentation", "Pediatric & Geriatric Care"],
        emergency: "🚨 24x7 Casualty Available",
        rating: "4.6 ⭐⭐⭐⭐",
        category: "emergency"
    },
    {
        id: 7,
        name: "Ragas Dental College & Multi-Specialty Hospital",
        phone: "+91 44 2453 0001",
        altPhone: "+91 44 2453 0002",
        address: "2/102 East Coast Road, Uthandi, Chennai, Tamil Nadu 600119",
        lat: 12.8732,
        lng: 80.2476,
        specialties: ["Implant Prosthodontics", "Guided Flapless Surgery", "Cosmetic Dentofacial Surgery"],
        emergency: "🚨 24x7 Dental Emergency Helpdesk",
        rating: "4.7 ⭐⭐⭐⭐⭐",
        category: "implant"
    },
    {
        id: 8,
        name: "Global Health City Dental & Implant Institute",
        phone: "+91 44 4477 7000",
        altPhone: "+91 99400 12345",
        address: "439 Cheran Nagar, Perumbakkam, Chennai, Tamil Nadu 600100",
        lat: 12.9038,
        lng: 80.1915,
        specialties: ["Computer-Guided All-on-4 Implants", "Digital Smile Design", "Maxillofacial Trauma"],
        emergency: "🚨 24x7 Emergency Trauma Unit",
        rating: "4.8 ⭐⭐⭐⭐⭐",
        category: "maxillofacial"
    }
];

function initHospitalsMap() {
    const mapContainer = document.getElementById('hospitals-map');
    if (!mapContainer) return;

    if (!hospitalsMap && typeof L !== 'undefined') {
        // Initialize Leaflet Map centered on central healthcare hub
        hospitalsMap = L.map('hospitals-map').setView([13.0450, 80.2000], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors | Dental Care GIS'
        }).addTo(hospitalsMap);
    }

    // Refresh markers & grid
    filterHospitals();

    // Leaflet map resize trigger after CSS tab transition
    setTimeout(() => {
        if (hospitalsMap) {
            hospitalsMap.invalidateSize();
            fitHospitalBounds(DENTAL_HOSPITALS);
        }
    }, 200);
}

function renderHospitalMarkers(hospitals) {
    if (!hospitalsMap || typeof L === 'undefined') return;

    // Clear existing markers
    hospitalMarkers.forEach(m => hospitalsMap.removeLayer(m));
    hospitalMarkers = [];

    const hospitalIcon = L.divIcon({
        className: 'custom-dental-pin',
        html: `<div style="background:#1e2d3c; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 3px 8px rgba(0,0,0,0.3); border:2px solid #27ae60;">🏥</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32]
    });

    hospitals.forEach((h, index) => {
        const popupContent = `
            <div style="font-family:inherit; min-width:220px; text-align:left; padding:4px;">
                <h4 style="margin:0 0 5px 0; color:#1e2d3c; font-size:1.05rem;">🏥 ${h.name}</h4>
                <p style="margin:0 0 6px 0; color:#64748b; font-size:0.85rem;">📍 ${h.address}</p>
                <div style="margin-bottom:8px; font-weight:bold; color:#27ae60; font-size:0.85rem;">${h.emergency}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
                    ${h.specialties.map(s => `<span style="background:#e8f4fd; color:#2980b9; font-size:0.75rem; padding:2px 8px; border-radius:10px; font-weight:600;">${s}</span>`).join('')}
                </div>
                <a href="tel:${h.phone.replace(/\s+/g, '')}" style="display:block; text-align:center; background:#27ae60; color:#fff; text-decoration:none; padding:8px 12px; border-radius:6px; font-weight:bold; font-size:0.9rem; margin-top:6px;">📞 Call: ${h.phone}</a>
            </div>
        `;

        const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon })
            .addTo(hospitalsMap)
            .bindPopup(popupContent);
        
        hospitalMarkers.push(marker);
    });
}

function fitHospitalBounds(hospitals) {
    if (!hospitalsMap || hospitals.length === 0 || typeof L === 'undefined') return;
    const group = L.featureGroup(hospitalMarkers);
    if (group.getLayers().length > 0) {
        hospitalsMap.fitBounds(group.getBounds().pad(0.15));
    }
}

function renderHospitalsGrid(hospitals) {
    const container = document.getElementById('hospitals-list-grid');
    const badge = document.getElementById('hospital-count-badge');
    if (!container) return;

    if (badge) badge.innerText = `${hospitals.length} Hospitals Listed`;

    if (hospitals.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:30px; color:#64748b;">
                <p style="font-size:1.1rem;">🔍 No dental hospitals found matching your search.</p>
                <button type="button" class="btn-primary" onclick="resetHospitalMapView()" style="padding:8px 16px; font-size:0.9rem; background:#1e2d3c;">Show All Hospitals</button>
            </div>
        `;
        return;
    }

    container.innerHTML = hospitals.map((h, i) => `
        <div class="card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s, box-shadow 0.2s;">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <h3 style="margin:0; font-size:1.15rem; color:#1e2d3c; font-weight:bold;">🏥 ${h.name}</h3>
                </div>
                <div style="color:#f39c12; font-size:0.85rem; font-weight:bold; margin-bottom:10px;">${h.rating}</div>
                
                <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #edf2f7; margin-bottom:12px;">
                    <div style="font-size:0.9rem; color:#334155; margin-bottom:6px;">
                        <strong>📍 Address:</strong> ${h.address}
                    </div>
                    <div style="font-size:0.85rem; color:#27ae60; font-weight:600; margin-bottom:4px;">
                        ${h.emergency}
                    </div>
                </div>

                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:15px;">
                    ${h.specialties.map(s => `<span style="background:#e8f4fd; color:#2980b9; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:600;">${s}</span>`).join('')}
                </div>
            </div>

            <div style="border-top:1px solid #f1f5f9; padding-top:14px; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem; color:#64748b;">Primary Contact:</span>
                    <a href="tel:${h.phone.replace(/\s+/g, '')}" style="font-weight:bold; color:#27ae60; text-decoration:none; font-size:1rem; display:flex; align-items:center; gap:4px;">
                        📞 ${h.phone}
                    </a>
                </div>
                ${h.altPhone ? `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem; color:#64748b;">Helpline:</span>
                    <a href="tel:${h.altPhone.replace(/\s+/g, '')}" style="font-weight:600; color:#2980b9; text-decoration:none; font-size:0.9rem;">
                        📱 ${h.altPhone}
                    </a>
                </div>` : ''}

                <div style="display:flex; gap:8px; margin-top:5px;">
                    <a href="tel:${h.phone.replace(/\s+/g, '')}" class="btn-primary" style="flex:1; text-align:center; padding:8px 12px; font-size:0.9rem; text-decoration:none; background:#27ae60; display:flex; align-items:center; justify-content:center; gap:5px;">
                        📞 Call Now
                    </a>
                    <button type="button" class="btn-primary" onclick="focusHospitalOnMap(${h.id})" style="flex:1; padding:8px 12px; font-size:0.9rem; background:#1e2d3c; display:flex; align-items:center; justify-content:center; gap:5px;">
                        🗺️ View on Map
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterHospitals() {
    const searchVal = (document.getElementById('hospital-search-input')?.value || '').toLowerCase().trim();
    const filterCat = document.getElementById('hospital-specialty-filter')?.value || 'all';

    let filtered = DENTAL_HOSPITALS.filter(h => {
        const matchesCat = (filterCat === 'all') || (h.category === filterCat) || h.specialties.some(s => s.toLowerCase().includes(filterCat));
        const matchesSearch = !searchVal || 
            h.name.toLowerCase().includes(searchVal) || 
            h.address.toLowerCase().includes(searchVal) || 
            h.phone.includes(searchVal) || 
            h.specialties.some(s => s.toLowerCase().includes(searchVal));
        return matchesCat && matchesSearch;
    });

    renderHospitalMarkers(filtered);
    renderHospitalsGrid(filtered);
}

function focusHospitalOnMap(hospitalId) {
    const hospital = DENTAL_HOSPITALS.find(h => h.id === hospitalId);
    if (!hospital || !hospitalsMap) return;

    // Scroll smoothly to map
    const mapEl = document.getElementById('hospitals-map');
    if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    hospitalsMap.setView([hospital.lat, hospital.lng], 15, { animate: true });

    // Open marker popup
    const targetMarker = hospitalMarkers.find(m => {
        const latLng = m.getLatLng();
        return Math.abs(latLng.lat - hospital.lat) < 0.0001 && Math.abs(latLng.lng - hospital.lng) < 0.0001;
    });

    if (targetMarker) {
        targetMarker.openPopup();
    }
}

function locateUserOnMap() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (hospitalsMap && typeof L !== 'undefined') {
                if (userLocationMarker) hospitalsMap.removeLayer(userLocationMarker);

                const userIcon = L.divIcon({
                    className: 'user-location-pin',
                    html: `<div style="background:#2980b9; color:#fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 0 10px #2980b9; border:2px solid #fff;">📍</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                userLocationMarker = L.marker([lat, lng], { icon: userIcon })
                    .addTo(hospitalsMap)
                    .bindPopup("<b>📍 You Are Here</b><br>Searching nearest dental hospitals...")
                    .openPopup();

                hospitalsMap.setView([lat, lng], 13, { animate: true });
            }
        },
        (err) => {
            console.warn("Geolocation prompt:", err.message);
            alert("Unable to retrieve your current location. Centering on default healthcare region.");
            resetHospitalMapView();
        }
    );
}

function resetHospitalMapView() {
    const searchInput = document.getElementById('hospital-search-input');
    const filterDropdown = document.getElementById('hospital-specialty-filter');
    if (searchInput) searchInput.value = '';
    if (filterDropdown) filterDropdown.value = 'all';

    filterHospitals();
    fitHospitalBounds(DENTAL_HOSPITALS);
}

// --- 6. PROFILE LOGIC (STRICT ROLE-EXCLUSIVE DOCTOR VS PATIENT) ---
let currentProfileData = null;

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
            currentProfileData = profileData;
            const isDoctor = (profileData.role === 'doctor');
            updateRoleBasedSidebar(profileData.role);

            const docCard = document.getElementById('doctor-profile-card');
            const patCard = document.getElementById('patient-profile-card');
            const editDocFields = document.getElementById('edit-doctor-fields');
            const editPatFields = document.getElementById('edit-patient-fields');
            const pageHeader = document.getElementById('profile-page-header');
            const pageSub = document.getElementById('profile-page-sub');
            const editTitle = document.getElementById('edit-profile-title');
            const labelName = document.getElementById('label-profile-name');

            const avatarIcon = document.getElementById('profile-avatar-icon');
            const avatarImg = document.getElementById('profile-avatar-img');

            if (isDoctor) {
                // DOCTOR PROFILE ONLY
                if (docCard) docCard.classList.remove('hidden');
                if (patCard) patCard.classList.add('hidden');
                if (editDocFields) editDocFields.classList.remove('hidden');
                if (editPatFields) editPatFields.classList.add('hidden');

                if (pageHeader) pageHeader.textContent = "👨‍⚕️ Doctor Profile";
                if (pageSub) pageSub.textContent = "Manage your medical credentials and clinical hospital information";
                if (editTitle) editTitle.textContent = "Edit Doctor Profile Details";
                if (labelName) labelName.textContent = "Doctor Full Name";

                const docName = (profileData.name && !profileData.name.includes('(Patient)')) ? profileData.name : 'Dr. Sarah Smith';
                document.getElementById('doctor-profile-name').textContent = docName;
                document.getElementById('doctor-profile-name-field').textContent = docName;
                document.getElementById('doctor-profile-phone').textContent = profileData.phone || "+91 98765 43210";
                document.getElementById('doctor-profile-specialty').textContent = profileData.specialty || "Maxillofacial Surgeon & Implant Specialist";
                document.getElementById('doctor-profile-specialty-badge').textContent = profileData.specialty || "Maxillofacial Surgeon & Implant Specialist";
                document.getElementById('doctor-profile-hospital-name').textContent = profileData.clinic_name || "City Dental & Maxillofacial Hospital";
                document.getElementById('doctor-profile-hospital-address').textContent = profileData.hospital_address || "104 Medical Enclave, Healthcare City, Chennai, 600077";
                document.getElementById('doctor-profile-email').textContent = profileData.email;
                document.getElementById('doctor-profile-license').textContent = profileData.license_number || "REG-8849201";
                document.getElementById('doctor-profile-joined').textContent = profileData.joined;

                if (avatarIcon) avatarIcon.textContent = "👨‍⚕️";

                // Pre-fill Doctor Edit fields
                document.getElementById('edit-profile-name').value = docName;
                document.getElementById('edit-profile-phone').value = profileData.phone || '+91 98765 43210';
                document.getElementById('edit-profile-specialty').value = profileData.specialty || 'Maxillofacial Surgeon & Implant Specialist';
                document.getElementById('edit-profile-clinic').value = profileData.clinic_name || 'City Dental & Maxillofacial Hospital';
                document.getElementById('edit-profile-hospital-address').value = profileData.hospital_address || '104 Medical Enclave, Healthcare City, Chennai';
                document.getElementById('edit-profile-license').value = profileData.license_number || 'REG-8849201';
                document.getElementById('edit-profile-email').value = profileData.email || '';
            } else {
                // PATIENT PROFILE ONLY - ALL 8 ATTRIBUTES
                if (docCard) docCard.classList.add('hidden');
                if (patCard) patCard.classList.remove('hidden');
                if (editDocFields) editDocFields.classList.add('hidden');
                if (editPatFields) editPatFields.classList.remove('hidden');

                if (pageHeader) pageHeader.textContent = "👤 Patient Profile";
                if (pageSub) pageSub.textContent = "View and manage your personal medical, contact and family details";
                if (editTitle) editTitle.textContent = "Edit Patient Profile Details";
                if (labelName) labelName.textContent = "Patient Full Name";

                const patName = (profileData.name && !profileData.name.includes('Dr.') && !profileData.name.includes('Doctor') && !profileData.name.includes('System Administrator')) ? profileData.name : 'John Doe';
                document.getElementById('patient-profile-name').textContent = patName;
                document.getElementById('patient-profile-name-field').textContent = patName;
                document.getElementById('patient-profile-phone').textContent = profileData.phone || "+91 98123 45678";
                document.getElementById('patient-profile-email').textContent = profileData.email;
                document.getElementById('patient-profile-age').textContent = `${profileData.age || 48} Years`;
                document.getElementById('patient-profile-gender').textContent = profileData.gender || 'Male';
                document.getElementById('patient-profile-address').textContent = profileData.address || "Flat 4B, Green Park Residences, Bangalore";
                document.getElementById('patient-profile-guardian-name').textContent = profileData.guardian_name || "Robert Doe (Father)";
                document.getElementById('patient-profile-guardian-phone').textContent = profileData.guardian_phone || "+91 98450 11223";
                document.getElementById('patient-profile-joined').textContent = profileData.joined;
                document.getElementById('patient-profile-id-badge').textContent = `Patient ID: ${profileData.patient_id || 'PID-2026-889'}`;

                if (avatarIcon) avatarIcon.textContent = "👤";

                // Pre-fill Patient Edit fields
                document.getElementById('edit-profile-name').value = patName;
                document.getElementById('edit-profile-phone').value = profileData.phone || '+91 98123 45678';
                document.getElementById('edit-profile-address').value = profileData.address || '';
                document.getElementById('edit-profile-age').value = profileData.age || 45;
                document.getElementById('edit-profile-gender').value = profileData.gender || 'Male';
                document.getElementById('edit-profile-guardian-name').value = profileData.guardian_name || 'Robert Doe (Father)';
                document.getElementById('edit-profile-guardian-phone').value = profileData.guardian_phone || '+91 98450 11223';
                document.getElementById('edit-profile-email').value = profileData.email || '';
            }

            if (profileData.avatar_url) {
                avatarImg.src = profileData.avatar_url;
                avatarImg.classList.remove('hidden');
                avatarIcon.classList.add('hidden');
            } else {
                avatarImg.classList.add('hidden');
                avatarIcon.classList.remove('hidden');
            }
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
    formData.append('phone', document.getElementById('edit-profile-phone')?.value || '');
    
    // Doctor fields
    formData.append('specialty', document.getElementById('edit-profile-specialty')?.value || '');
    formData.append('clinic_name', document.getElementById('edit-profile-clinic')?.value || '');
    formData.append('hospital_address', document.getElementById('edit-profile-hospital-address')?.value || '');
    formData.append('license_number', document.getElementById('edit-profile-license')?.value || '');
    
    // Patient fields
    formData.append('address', document.getElementById('edit-profile-address')?.value || '');
    formData.append('age', document.getElementById('edit-profile-age')?.value || '');
    formData.append('gender', document.getElementById('edit-profile-gender')?.value || 'Male');
    formData.append('guardian_name', document.getElementById('edit-profile-guardian-name')?.value || '');
    formData.append('guardian_phone', document.getElementById('edit-profile-guardian-phone')?.value || '');

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

            // Sync to Firebase Firestore Client SDK (doctors/email or patients/email)
            if (typeof firebaseDB !== 'undefined' && firebaseDB && result.email) {
                const collName = (result.role === 'doctor') ? 'doctors' : 'patients';
                firebaseDB.collection(collName).doc(result.email.toLowerCase()).set({
                    name: result.name,
                    email: result.email,
                    phone: result.phone,
                    role: result.role,
                    specialty: result.specialty,
                    clinic_name: result.clinic_name,
                    hospital_address: result.hospital_address,
                    license_number: result.license_number,
                    address: result.address,
                    age: result.age,
                    gender: result.gender,
                    guardian_name: result.guardian_name,
                    guardian_phone: result.guardian_phone,
                    updated_at: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(err => console.warn("Firestore profile sync warning:", err));
            }

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

// --- PROFILE 3-STEP OTP FORGOT PASSWORD CONTROLLERS ---
let profResetEmailStorage = '';

function resetProfForgotToStep1() {
    document.getElementById('prof-step1-form').classList.remove('hidden');
    document.getElementById('prof-step2-form').classList.add('hidden');
    document.getElementById('prof-step3-form').classList.add('hidden');
    document.getElementById('prof-forgot-title').innerText = "🔑 Reset Forgotten Password";
    document.getElementById('prof-forgot-subtitle').innerText = "Enter your registered email address to receive a 6-digit OTP verification code";
    document.getElementById('pf-msg-step1').classList.add('hidden');
}

function toggleProfileForgotForm(show) {
    const pwContainer = document.getElementById('password-change-container');
    const pfContainer = document.getElementById('profile-forgot-container');

    resetProfForgotToStep1();

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

// Profile Step 1: Send OTP
document.getElementById('prof-step1-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('pf-email').value.trim();
    const msgDiv = document.getElementById('pf-msg-step1');
    msgDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/send_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const result = await response.json();

        if (response.ok && result.status === 'success') {
            profResetEmailStorage = email;
            document.getElementById('prof-step1-form').classList.add('hidden');
            document.getElementById('prof-step2-form').classList.remove('hidden');
            document.getElementById('prof-forgot-title').innerText = "📩 Enter Verification OTP";
            document.getElementById('prof-forgot-subtitle').innerText = `Verification code sent to ${email}`;
        } else {
            msgDiv.textContent = '❌ ' + (result.message || 'Registered email not found.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.textContent = '❌ Server connection error.';
        msgDiv.classList.remove('hidden');
    }
});

// Profile Step 2: Verify OTP
document.getElementById('prof-step2-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const otpInput = document.getElementById('pf-otp-input').value.trim();
    const msgDiv = document.getElementById('pf-msg-step2');
    msgDiv.classList.add('hidden');

    try {
        const response = await fetch('/auth/verify_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: profResetEmailStorage, otp: otpInput })
        });
        const result = await response.json();

        if (response.ok && result.status === 'success') {
            document.getElementById('prof-step2-form').classList.add('hidden');
            document.getElementById('prof-step3-form').classList.remove('hidden');
            document.getElementById('prof-forgot-title').innerText = "🔒 Set New Password";
            document.getElementById('prof-forgot-subtitle').innerText = "OTP Verified! Set your new account password";
        } else {
            msgDiv.textContent = '❌ ' + (result.message || 'Invalid OTP.');
            msgDiv.classList.remove('hidden');
        }
    } catch (err) {
        msgDiv.textContent = '❌ Connection error.';
        msgDiv.classList.remove('hidden');
    }
});

// Profile Step 3: Reset Password
document.getElementById('prof-step3-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newPw = document.getElementById('pf-new-pw').value;
    const confirmPw = document.getElementById('pf-confirm-pw').value;
    const msgDiv = document.getElementById('pf-msg-step3');
    msgDiv.classList.add('hidden');

    if (newPw !== confirmPw) {
        msgDiv.style.color = '#c62828';
        msgDiv.textContent = '❌ New password and confirmation do not match.';
        msgDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('/auth/reset_password_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: profResetEmailStorage,
                new_password: newPw,
                confirm_password: confirmPw
            })
        });

        const result = await response.json();
        if (response.ok && result.status === 'success') {
            msgDiv.style.color = '#27ae60';
            msgDiv.textContent = '✅ ' + result.message;
            msgDiv.classList.remove('hidden');

            setTimeout(() => {
                toggleProfileForgotForm(false);
                togglePasswordModal(false);
            }, 1500);
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

// --- 8. MOBILE APP (PWA / APK) INSTALLATION LOGIC ---
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById('pwa-install-sidebar-btn');
    if (installBtn) installBtn.style.display = 'block';
});

function triggerPWAInstall() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ User accepted the mobile app install prompt!');
            }
            deferredInstallPrompt = null;
        });
    } else {
        alert("📲 To install this app on your mobile phone:\n\n1. In Chrome mobile, tap the 3 dots (⋮) in the top-right.\n2. Tap 'Install App' or 'Add to Home screen'.\n3. The app icon will be installed directly on your phone home screen!");
    }
}