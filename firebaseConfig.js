import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjS6DDAUsFVjo31Yr6U_9fDUKU9y0siCo",
  authDomain: "jltaskboard.firebaseapp.com",
  projectId: "jltaskboard",
  storageBucket: "jltaskboard.appspot.com",
  messagingSenderId: "355775730237",
  appId: "1:355775730237:web:18b4db67b2f88f6a215054",
  measurementId: "G-SXEB6GQ2RE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
