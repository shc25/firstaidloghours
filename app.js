// app.js (module) - polished, minutes stored in Firestore
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
  serverTimestamp,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

/* ====== Firebase config ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBWtaWaFLcnS6NiUFLJfWZ0IuojIIw0fNI",
  authDomain: "first-aid-log-hours.firebaseapp.com",
  projectId: "first-aid-log-hours",
  storageBucket: "first-aid-log-hours.appspot.com",
  messagingSenderId: "413029874974",
  appId: "1:413029874974:web:431eb394a78a666442dd0f",
  measurementId: "G-VD5BEXPTFD"
};
/* ============================== */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* Theme */
const root = document.documentElement;
function applySavedTheme() {
  if (localStorage.getItem('theme') === 'light') root.classList.remove('dark');
  else root.classList.add('dark');
}
applySavedTheme();

/* UI refs */
const el = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  el('theme-toggle')?.addEventListener('click', () => {
    if (root.classList.contains('dark')) { root.classList.remove('dark'); localStorage.setItem('theme','light'); }
    else { root.classList.add('dark'); localStorage.setItem('theme','dark'); }
  });

  // Auth buttons
  el('loginBtn').addEventListener('click', login);
  el('signupBtn').addEventListener('click', signup);
  el('logoutBtn').addEventListener('click', () => signOut(auth));

  // Submit log
  el('submitLogBtn').addEventListener('click', submitLog);
});

/* ---------- Helpers for minutes/format ---------- */
function timeStringToMinutes(ts) {
  // ts like "09:30" -> minutes since midnight (integer)
  if (!ts || typeof ts !== 'string') return null;
  const [hh, mm] = ts.split(':').map(x => parseInt(x, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function minutesToHuman(mins) {
  // mins integer >=0 -> "2h 30m"
  mins = Number(mins) || 0;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const hh = `${h}h`;
  const mm = `${String(m).padStart(2,'0')}m`;
  return `${hh} ${mm}`;
}

/* ---------- Auth functions ---------- */
async function login() {
  try {
    await signInWithEmailAndPassword(auth, el('email').value.trim(), el('password').value);
  } catch (e) { alert(e.message); console.error(e); }
}

async function signup() {
  try {
    const name = el('name').value.trim();
    if (!name) return alert('Please enter your full name for signup.');
    const cred = await createUserWithEmailAndPassword(auth, el('email').value.trim(), el('password').value);
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      name,
      role: 'firstAider',
      createdAt: serverTimestamp()
    });
  } catch (e) { alert(e.message); console.error(e); }
}

/* ---------- Auth state & role handling ---------- */
let unsubscribeLogs = null;

onAuthStateChanged(auth, async (user) => {
  // cleanup logs listener if any
  if (typeof unsubscribeLogs === 'function') { unsubscribeLogs(); unsubscribeLogs = null; }

  if (!user) {
    el('form-section').classList.add('hidden');
    el('login-section').classList.remove('hidden');
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const role = (userDoc.exists() && userDoc.data().role) ? userDoc.data().role : 'firstAider';
    const name = (userDoc.exists() && userDoc.data().name) ? userDoc.data().name : '';

    if (role === 'supervisor') {
      // supervisors go to supervisor dashboard
      window.location.href = 'supervisor.html';
      return;
    }

    // first aider - show form on same page
    el('login-section').classList.add('hidden');
    el('form-section').classList.remove('hidden');

    const displayName = name ? `${name}` : user.email;
    el('user-role-name').textContent = `First Aider — ${displayName}`;
    el('user-email-note').textContent = `Logged in as a First Aider (${user.email}).`;

    // subscribe to this user's logs
    subscribeUserLogs(user.uid);
  } catch (e) {
    console.warn('role check error', e);
  }
});

/* ---------- Submit log (minutes stored) ---------- */
async function submitLog() {
  const user = auth.currentUser;
  if (!user) return alert('Not authenticated');

  const date = el('date').value;
  const event = el('event').value.trim();
  const start = el('start').value;
  const end = el('end').value;

  if (!date || !event || !start || !end) return alert('Please fill all fields.');

  const startMin = timeStringToMinutes(start);
  const endMin = timeStringToMinutes(end);
  if (startMin === null || endMin === null) return alert('Invalid time provided.');

  let minutes = endMin - startMin;
  if (minutes < 0) minutes = 0; // do not allow negative; if you want overnight handling, we can modify

  // try get user's name
  let userName = '';
  try {
    const ud = await getDoc(doc(db, 'users', user.uid));
    userName = ud.exists() ? (ud.data().name || '') : '';
  } catch (e) {
    console.warn('could not read user name', e);
  }

  // file upload if present
  let proofUrl = '';
  const fileEl = el('proof');
  if (fileEl && fileEl.files && fileEl.files[0]) {
    try {
      const file = fileEl.files[0];
      const path = `proofs/${user.uid}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      proofUrl = await getDownloadURL(ref);
    } catch (e) {
      console.warn('upload failed', e);
      // don't block logging if upload fails; you may alert user if preferred
    }
  }

  // add to Firestore with minutes
  try {
    await addDoc(collection(db, 'logs'), {
      userId: user.uid,
      email: user.email,
      name: userName,
      date,
      event,
      start,
      end,
      minutes,
      proofUrl,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error('addDoc error', e);
    alert('Failed to save log: ' + e.message);
    return;
  }

  // clear inputs
  el('event').value = '';
  el('start').value = '';
  el('end').value = '';
  if (fileEl) fileEl.value = '';
}

/* ---------- Subscribe to user's logs (real-time) & render ---------- */
function subscribeUserLogs(uid) {
  if (typeof unsubscribeLogs === 'function') unsubscribeLogs();

  const q = query(collection(db, 'logs'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  unsubscribeLogs = onSnapshot(q, snapshot => {
    const list = el('log-list');
    list.innerHTML = '';
    let totalMinutes = 0;

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const mins = Number(d.minutes || 0);
      totalMinutes += mins;

      /// createdAt formatting
      let createdAtStr = '';
      if (d.createdAt && typeof d.createdAt.toDate === 'function') createdAtStr = d.createdAt.toDate().toLocaleString();
      else if (d.createdAt) createdAtStr = new Date(d.createdAt).toLocaleString();

      const li = document.createElement('li');
      li.className = 'fade-slide-in p-2 border rounded bg-white/60 dark:bg-gray-700/60';
      li.innerHTML = `<div class="font-semibold">${escapeHtml(d.event)} <span class="text-xs text-gray-500">(${escapeHtml(d.date)})</span></div>
                      <div class="text-xs text-gray-600">${escapeHtml(d.start)} - ${escapeHtml(d.end)} • ${escapeHtml(minutesToHuman(mins))}</div>
                      <div class="text-xs text-gray-400 mt-1">Logged at: ${escapeHtml(createdAtStr)}</div>
                      ${d.proofUrl ? `<div class="mt-2"><a href="${d.proofUrl}" target="_blank"><img src="${d.proofUrl}" width="160" class="rounded"/></a></div>` : ''}`;
      list.appendChild(li);
    });

    el('total-hours').textContent = minutesToHuman(totalMinutes);
  }, err => console.error('logs onSnapshot error', err));
}

function escapeHtml(s = '') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
