// ============================================================================
// 🔥 REAL FIREBASE WEB CONFIGURATION (firebase.google.com)
// ============================================================================
// HOW TO CONNECT YOUR REAL FIREBASE DATABASE:
// 1. Go to https://console.firebase.google.com/
// 2. Click "Add Project" -> Name it "ImplantAI"
// 3. Click the Web icon (</>) to register app -> Copy your firebaseConfig credentials below
// 4. In Firebase Console sidebar:
//    - Go to Authentication -> Sign-in method -> Enable "Google" and "Email/Password"
//    - Go to Firestore Database -> Create Database -> Start in Test Mode
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyChOhB4PzbZ-5hmvxF8wfkBrUPNVrKa3M4",
  authDomain: "implantpredict.firebaseapp.com",
  projectId: "implantpredict",
  storageBucket: "implantpredict.firebasestorage.app",
  messagingSenderId: "481525869578",
  appId: "1:481525869578:web:acb217e96f8ed16b4703f3",
  measurementId: "G-92GNPMYTEX"
};

// Initialize Firebase App SDK
let isFirebaseConnected = false;
let firebaseAuth = null;
let firebaseDB = null;
let googleProvider = null;

if (typeof firebase !== 'undefined') {
    try {
        if (!firebase.apps.length && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
            firebase.initializeApp(firebaseConfig);
            isFirebaseConnected = true;
            console.log("🔥 Connected to Real Firebase Project on firebase.google.com!");
        }

        if (firebase.auth && firebase.firestore) {
            firebaseAuth = firebase.auth();
            firebaseDB = firebase.firestore();
            googleProvider = new firebase.auth.GoogleAuthProvider();
            googleProvider.addScope('email');
            googleProvider.addScope('profile');
            googleProvider.setCustomParameters({ prompt: 'select_account' });
        }
    } catch (e) {
        console.warn("Firebase Web SDK initialization:", e);
    }
}
