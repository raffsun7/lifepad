const firebaseConfig = {
  apiKey: "AIzaSyAdIsBqkFusePwWrCxtWP2dTucP5U3Hx6E",
  authDomain: "lifepad-e9f70.firebaseapp.com",
  projectId: "lifepad-e9f70",
  storageBucket: "lifepad-e9f70.firebasestorage.app",
  messagingSenderId: "56392358576",
  appId: "1:56392358576:web:0bfa286c0641d248f3f975",
  measurementId: "G-T6EDQNS70E"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// --- Added: Enable Offline Persistence ---
// This caches user data, allowing the app to work offline and load faster on subsequent visits.
// It should be called once, right after initialization.
try {
  firebase.firestore().enablePersistence({ experimentalForceOwningTab: true })
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        // This can happen if multiple tabs are open. Persistence will still work in the primary tab.
        console.warn("Firestore persistence failed: can only be enabled in one tab at a time.");
      } else if (err.code == 'unimplemented') {
        // The browser is likely too old or doesn't support the necessary features.
        console.warn("Firestore persistence not available in this browser.");
      }
    });
} catch (e) {
  console.error("An error occurred while enabling Firestore persistence: ", e);
}