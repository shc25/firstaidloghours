import { auth, db, toggleTheme } from './firebase-init.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

function showAlert(message) {
  const container = document.getElementById('alert-container');
  container.innerHTML = `<div class="alert">${message}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 4000);
}

export function logout() {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
}

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
