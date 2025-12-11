import { auth, db, storage, toggleTheme } from './firebase-init.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

export function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  signInWithEmailAndPassword(auth, email, password)
    .then(showForm)
    .catch(e => alert(e.message));
}

export function signup() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (!name) return alert("Enter full name");

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (cred) => {
      await addDoc(collection(db, 'users'), { uid: cred.user.uid, name, email, role: "firstAider" });
      showForm();
    })
    .catch(e => alert(e.message));
}

export function logout() {
  signOut(auth).then(() => {
    document.getElementById('form-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
  });
}

async function showForm() {
  const user = auth.currentUser;
  document.getElementById('form-section').style.display = 'block';
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('user-email').textContent = user.email;
  loadLogs();
}

export async function submitLog() {
  const user = auth.currentUser;
  const event = document.getElementById('event').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const imageFile = document.getElementById('image').files[0];
  if (!imageFile) return alert("Upload an image!");

  const storageRef = ref(storage, `images/${user.uid}_${Date.now()}`);
  await uploadBytes(storageRef, imageFile);
  const imageURL = await getDownloadURL(storageRef);

  const startTime = new Date(`1970-01-01T${start}`);
  const endTime = new Date(`1970-01-01T${end}`);
  const diffMs = endTime - startTime;
  const hours = Math.floor(diffMs / (1000*60*60));
  const minutes = Math.floor((diffMs % (1000*60*60)) / (1000*60));

  await addDoc(collection(db, 'logs'), {
    userId: user.uid,
    email: user.email,
    date: serverTimestamp(),
    event,
    start,
    end,
    hours,
    minutes,
    imageURL
  });

  alert("Duty log saved!");
  loadLogs();
}

async function loadLogs() {
  const user = auth.currentUser;
  const q = query(collection(db, 'logs'), where('userId','==',user.uid), orderBy('date','desc'));
  const snapshot = await getDocs(q);
  const list = document.getElementById('log-list');
  list.innerHTML = '';
  let totalHours = 0;
  let totalMinutes = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    totalHours += data.hours;
    totalMinutes += data.minutes;

    // Carry over minutes > 60
    totalHours += Math.floor(totalMinutes/60);
    totalMinutes = totalMinutes%60;

    const li = document.createElement('li');
    li.innerHTML = `<strong>${data.event}</strong> - ${data.hours}h ${data.minutes}m <br> <img src="${data.imageURL}" class="w-full mt-1 rounded-md"/>`;
    list.appendChild(li);
  });

  document.getElementById('total-hours').textContent = `${totalHours}h ${totalMinutes}m`;
}

onAuthStateChanged(auth, user => {
  if (user) showForm();
});
