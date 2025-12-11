// firebase-init.js
/*import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWtaWaFLcnS6NiUFLJfWZ0IuojIIw0fNI",
  authDomain: "first-aid-log-hours.firebaseapp.com",
  projectId: "first-aid-log-hours",
  storageBucket: "first-aid-log-hours.appspot.com",
  messagingSenderId: "413029874974",
  appId: "1:413029874974:web:431eb394a78a666442dd0f",
  measurementId: "G-VD5BEXPTFD"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Theme toggle function
export function toggleTheme() {
  const root = document.documentElement;
  if (root.classList.contains('dark')) {
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
}

// Check saved theme
if (localStorage.getItem('theme') === 'light') root.classList.remove('dark');
else root.classList.add('dark');
