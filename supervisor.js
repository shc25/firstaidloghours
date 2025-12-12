import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
 apiKey: "AIzaSyBWtaWaFLcnS6NiUFLJfWZ0IuojIIw0fNI",
 authDomain: "first-aid-log-hours.firebaseapp.com",
 projectId: "first-aid-log-hours",
 storageBucket: "first-aid-log-hours.appspot.com",
 messagingSenderId: "413029874974",
 appId: "1:413029874974:web:431eb394a78a666442dd0f",
 measurementId: "G-VD5BEXPTFD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Theme toggle
export function toggleTheme() {
  const root = document.documentElement;
  if(root.classList.contains('dark')){
    root.classList.remove('dark'); localStorage.setItem('theme','light');
  } else { root.classList.add('dark'); localStorage.setItem('theme','dark'); }
}
if(localStorage.getItem('theme')==='light') document.documentElement.classList.remove('dark');
else document.documentElement.classList.add('dark');

function showAlert(message){
  const container = document.getElementById('alert-container');
  container.innerHTML=`<div class="text-red-400 mb-2">${message}</div>`;
  setTimeout(()=>{container.innerHTML='';},4000);
}

export function logout(){
  signOut(auth).then(()=>{
    window.location.href = "index.html"; // redirect first aiders
  });
}

async function loadLogs(){
  const searchName = document.getElementById('search-name').value.toLowerCase();
  const usersSnap = await getDocs(collection(db,'users'));
  const usersMap = {};
  usersSnap.forEach(u=>{
    const data=u.data();
    usersMap[data.uid] = data;
  });

  const logsSnap = await getDocs(query(collection(db,'logs'), orderBy('date','desc')));
  const list = document.getElementById('supervisor-log-list');
  list.innerHTML='';

  logsSnap.forEach(doc=>{
    const data = doc.data();
    const user = usersMap[data.userId];
    if(!user) return;
    if(searchName && !user.name.toLowerCase().includes(searchName)) return;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${user.name}</strong> (${user.email}) - ${data.event} - ${data.hours}h ${data.minutes}m<br><img src="${data.imageURL}" class="w-full mt-1 rounded-md"/>`;
    list.appendChild(li);
  });
}

document.getElementById('search-name')?.addEventListener('input', loadLogs);

onAuthStateChanged(auth,user=>{
  if(user) loadLogs();
});
