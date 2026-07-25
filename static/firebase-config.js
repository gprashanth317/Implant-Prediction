// Firebase SDK Web Configuration for ImplantAI Application
// Replace the config object below with your Firebase Console Project credentials if needed

const firebaseConfig = {
    apiKey: "AIzaSyB_DemoImplantAIKey_2026_SDK",
    authDomain: "implant-prediction-app.firebaseapp.com",
    projectId: "implant-prediction-app",
    storageBucket: "implant-prediction-app.appspot.com",
    messagingSenderId: "84920194820",
    appId: "1:84920194820:web:8a9f0e1d2c3b4a"
};

// Initialize Firebase App
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("🔥 Firebase Web SDK initialized successfully!");
    } catch (e) {
        console.warn("Firebase initialization warning:", e);
    }
}

// Global Firebase Authentication & Firestore DB Helpers
let firebaseAuth = null;
let firebaseDB = null;
let googleProvider = null;

if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
    try {
        firebaseAuth = firebase.auth();
        firebaseDB = firebase.firestore();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('email');
        googleProvider.addScope('profile');
    } catch (e) {
        console.warn("Firebase Auth/Firestore service binding:", e);
    }
}
