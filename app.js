// app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

/* ====== Replace this firebaseConfig with your project's config if different ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBWtaWaFLcnS6NiUFLJfWZ0IuojIIw0fNI",
  authDomain: "first-aid-log-hours.firebaseapp.com",
  projectId: "first-aid-log-hours",
  storageBucket: "first-aid-log-hours.appspot.com",
  messagingSenderId: "413029874974",
  appId: "1:413029874974:web:431eb394a78a666442dd0f",
  measurementId: "G-VD5BEXPTFD"
};
/* ================================================================================ */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ---------- Theme toggle ---------- */
const root = document.documentElement;
function applySavedTheme() {
  if (localStorage.getItem('theme') === 'light') root.classList.remove('dark');
  else root.classList.add('dark');
}
applySavedTheme();
document.addEventListener('DOMContentLoaded', () => {
  const tbtn = document.getElementById('theme-toggle');
  if (tbtn) tbtn.addEventListener('click', () => {
    if (root.classList.contains('dark')) { root.classList.remove('dark'); localStorage.setItem('theme','light'); }
    else { root.classList.add('dark'); localStorage.setItem('theme','dark'); }
  });
});

/* ---------- UI refs ---------- */
const loginSection = () => document.getElementById('login-section');
const formSection = () => document.getElementById('form-section');
const emailInput = () => document.getElementById('email');
const passInput = () => document.getElementById('password');
const userEmailEl = () => document.getElementById('user-email');
const logListEl = () => document.getElementById('log-list');
const totalHoursEl = () => document.getElementById('total-hours');

/* ---------- Auth handlers ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('signupBtn').addEventListener('click', signup);
  document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
  document.getElementById('submitLogBtn').addEventListener('click', submitLog);
});

async function login() {
  try {
    await signInWithEmailAndPassword(auth, emailInput().value, passInput().value);
  } catch (e) { alert(e.message); }
}

async function signup() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailInput().value, passInput().value);
    // Create user document with uid as doc id
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      role: 'firstAider',
      createdAt: serverTimestamp()
    });
  } catch (e) { alert(e.message); }
}

/* ---------- Auth state & role redirect ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // show login
    formSection().classList.add('hidden');
    loginSection().classList.remove('hidden');
    return;
  }

  // check users collection for role
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const role = userDoc.exists() ? (userDoc.data().role || 'firstAider') : 'firstAider';
    if (role === 'supervisor') {
      // redirect to supervisor dashboard
      window.location.href = 'supervisor.html';
      return;
    }
  } catch (e) {
    console.warn('role check error', e);
  }

  // show form to normal user
  loginSection().classList.add('hidden');
  formSection().classList.remove('hidden');
  userEmailEl().textContent = user.email;
  // subscribe to realtime logs for this user
  subscribeUserLogs(user.uid);
});

/* ---------- Submit log (image upload, hours calc, serverTimestamp) ---------- */
async function submitLog() {
  const user = auth.currentUser;
  if (!user) return alert('Not authenticated');

  const date = document.getElementById('date').value;
  const event = document.getElementById('event').value.trim();
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const fileInput = document.getElementById('proof');

  if (!date || !event || !start || !end) return alert('Please fill all fields.');

  // compute hours
  const startTime = new Date(`1970-01-01T${start}`);
  const endTime = new Date(`1970-01-01T${end}`);
  let hours = (endTime - startTime) / (1000*60*60);
  if (hours < 0) hours = 0;

  // upload image if present
  let proofUrl = "";
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `proofs/${user.uid}/${Date.now()}_${file.name}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file);
    proofUrl = await getDownloadURL(ref);
  }

  // add log document
  await addDoc(collection(db, 'logs'), {
    userId: user.uid,
    email: user.email,
    date,
    event,
    start,
    end,
    hours,
    proofUrl,
    createdAt: serverTimestamp()
  });

  // clear inputs (preview already updated via subscription)
  document.getElementById('event').value = '';
  document.getElementById('start').value = '';
  document.getElementById('end').value = '';
  if (fileInput) fileInput.value = '';
}

/* ---------- Subscribe to user's logs in real-time & display ---------- */
let unsubscribeLogs = null;
function subscribeUserLogs(uid) {
  // cleanup previous
  if (unsubscribeLogs) unsubscribeLogs();

  const q = query(collection(db, 'logs'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  unsubscribeLogs = onSnapshot(q, snapshot => {
    const list = logListEl();
    list.innerHTML = '';
    let total = 0;
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      total += Number(d.hours || 0);
      const li = document.createElement('li');
      li.className = 'fade-slide-in p-2 border rounded';
      li.innerHTML = `<div class="font-semibold">${escapeHtml(d.event)} <span class="text-xs text-gray-500">(${escapeHtml(d.date)})</span></div>
                      <div class="text-xs text-gray-600">${escapeHtml(d.start)} - ${escapeHtml(d.end)} • ${Number(d.hours).toFixed(2)} hrs</div>
                      ${d.proofUrl ? `<div class="mt-2"><a href="${d.proofUrl}" target="_blank"><img src="${d.proofUrl}" width="160" class="rounded"/></a></div>` : ''}`;
      list.appendChild(li);
    });
    totalHoursEl().textContent = total.toFixed(2);
  });
}

function escapeHtml(s = '') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
