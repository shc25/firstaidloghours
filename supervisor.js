import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBWtaWaFLcnS6NiUFLJfWZ0IuojIIw0fNI",
  authDomain: "first-aid-log-hours.firebaseapp.com",
  projectId: "first-aid-log-hours",
  storageBucket: "first-aid-log-hours.firebasestorage.app",
  messagingSenderId: "413029874974",
  appId: "1:413029874974:web:431eb394a78a666442dd0f",
  measurementId: "G-VD5BEXPTFD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Theme toggle
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
if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark');
else document.documentElement.classList.add('dark');

// Alert helper
function showAlert(message) {
  const container = document.getElementById('alert-container');
  container.innerHTML = `<div class="alert">${message}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// Logout
export function logout() {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
}

// Load logs for supervisor
async function loadLogs() {
  const searchName = document.getElementById('search-name').value.toLowerCase();
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(doc => doc.data());

  let filteredUsers = users;
  if (searchName) {
    filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchName));
  }

  const logList = document.getElementById('supervisor-log-list');
  logList.innerHTML = '';
  let totalHours = 0;
  let totalMinutes = 0;

  for (let user of filteredUsers) {
    const q = query(collection(db, 'logs'), where('userId','==',user.uid), orderBy('date','desc'));
    const logsSnap = await getDocs(q);

    logsSnap.forEach(doc => {
      const data = doc.data();
      totalHours += data.hours;
      totalMinutes += data.minutes;

      totalHours += Math.floor(totalMinutes/60);
      totalMinutes %= 60;

      const li = document.createElement('li');
      li.innerHTML = `<strong>${user.name}</strong> (${user.email}) - ${data.event} - ${data.hours}h ${data.minutes}m <br><img src="${data.imageURL}" class="w-full mt-1 rounded-md"/>`;
      logList.appendChild(li);
    });
  }

  if (totalHours + totalMinutes === 0) {
    logList.innerHTML = '<li class="text-gray-400">No logs found.</li>';
  }
}

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = 'index.html';
  else loadLogs();
});

window.loadLogs = loadLogs; // allow search input to call this
