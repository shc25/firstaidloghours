import { auth, db, toggleTheme } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

async function loadLogs(filterName = "") {
  const q = query(collection(db,'users'), orderBy('name','asc'));
  const usersSnapshot = await getDocs(q);

  const logList = document.getElementById('log-list');
  logList.innerHTML = '';
  let totalHours = 0, totalMinutes = 0;

  for (let userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    if(filterName && !userData.name.toLowerCase().includes(filterName.toLowerCase())) continue;

    const logsQuery = query(collection(db,'logs'), where('userId','==',userData.uid), orderBy('date','desc'));
    const logsSnapshot = await getDocs(logsQuery);

    logsSnapshot.forEach(doc => {
      const data = doc.data();
      totalHours += data.hours;
      totalMinutes += data.minutes;
      totalHours += Math.floor(totalMinutes/60);
      totalMinutes %= 60;

      const li = document.createElement('li');
      li.innerHTML = `<strong>${userData.name}</strong> - ${data.event}: ${data.hours}h ${data.minutes}m <br> <img src="${data.imageURL}" class="w-full mt-1 rounded-md"/>`;
      logList.appendChild(li);
    });
  }

  document.getElementById('total-hours').textContent = `${totalHours}h ${totalMinutes}m`;
}

export function filterLogsByName() {
  const name = document.getElementById('search-name').value;
  loadLogs(name);
}

onAuthStateChanged(auth, user => {
  if(user) loadLogs();
});
