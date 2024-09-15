// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Import Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADjFvsWYsDt5hi6Ku9kd_zluYcUpFvOG0",
  authDomain: "payments-bc7ff.firebaseapp.com",
  projectId: "payments-bc7ff",
  storageBucket: "payments-bc7ff.appspot.com",
  messagingSenderId: "96783815",
  appId: "1:96783815:web:eca946425222415ca5dde2",
  measurementId: "G-M03TK67HRF",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (replace getAnalytics with getFirestore)
const db = getFirestore(app);

// Export the Firestore instance to use in your other scripts
export { db };
