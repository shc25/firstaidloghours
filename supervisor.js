// supervisor.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore, collection, query, orderBy, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// DOM
const supervisorEmail = document.getElementById('supervisor-email');
const allLogsTbody = document.getElementById('all-logs');
const summaryEl = document.getElementById('summary');
const applyBtn = document.getElementById('applyFilters');
const resetBtn = document.getElementById('resetFilters');
const exportBtn = document.getElementById('exportCSV');
const filterName = document.getElementById('filter-name');
const filterDate = document.getElementById('filter-date');
const filterMonth = document.getElementById('filter-month');
const filterEvent = document.getElementById('filter-event');
const minHours = document.getElementById('min-hours');
const maxHours = document.getElementById('max-hours');
const logoutBtn = document.getElementById('logoutBtn');

const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
if (localStorage.getItem('theme') === 'light') root.classList.remove('dark'); else root.classList.add('dark');
themeToggle?.addEventListener('click', () => {
  if (root.classList.contains('dark')) { root.classList.remove('dark'); localStorage.setItem('theme','light'); }
  else { root.classList.add('dark'); localStorage.setItem('theme','dark'); }
});
logoutBtn?.addEventListener('click', async ()=>{ await signOut(auth); window.location.href='index.html'; });

let allLogs = [];
let usersTotals = {};
let userMap = {}; // uid -> {name, email}

/* ---------- helpers ---------- */
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const y = dt.getFullYear(); const m = String(dt.getMonth()+1).padStart(2,'0'); const day = String(dt.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  // Firestore Timestamp handling
  try {
    if (ts.toDate) return ts.toDate().toLocaleString();
  } catch(e){}
  return new Date(ts).toLocaleString();
}

/* populate month select */
(function populateMonths(){
  const sel = filterMonth;
  const now = new Date();
  for (let i=0;i<12;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const opt = document.createElement('option');
    opt.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    opt.textContent = d.toLocaleString(undefined,{month:'short',year:'numeric'});
    sel.appendChild(opt);
  }
})();

/* fetch users to build name/email map */
async function fetchAllUsers(){
  userMap = {};
  const q = query(collection(db,'users'), orderBy('createdAt','asc'));
  const snap = await getDocs(q);
  snap.forEach(s => {
    const u = s.data();
    userMap[u.uid] = { name: u.name || '', email: u.email || '' };
  });
}

/* fetch logs and attach user info */
async function fetchAllLogs() {
  allLogs = []; usersTotals = {}; allLogsTbody.innerHTML = '';
  // ensure user map is present
  await fetchAllUsers();

  const q = query(collection(db,'logs'), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const d = docSnap.data();
    d.hours = Number(d.hours || 0);
    // attach user info if available
    const u = userMap[d.userId] || { name: '', email: d.email || '' };
    d.userName = u.name || '';
    d.userEmail = u.email || d.email || '';
    // human-friendly createdAt
    d._createdAtStr = formatTimestamp(d.createdAt);
    allLogs.push(d);
    const key = d.userName || d.userEmail;
    usersTotals[key] = (usersTotals[key] || 0) + d.hours;
  });
  renderSummary();
  renderTable(allLogs);
}

/* summary cards (clickable by user) */
function renderSummary(){
  summaryEl.innerHTML = '';
  const entries = Object.entries(usersTotals).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if (entries.length===0) { summaryEl.innerHTML = '<div class="p-4 bg-white dark:bg-gray-700 rounded">No logs yet</div>'; return; }
  entries.forEach(([label, hrs])=>{
    const card = document.createElement('div');
    card.className = 'p-4 bg-white dark:bg-gray-700 rounded shadow';
    // label may be "Name (email)" or fallback email
    card.innerHTML = `<div class="text-sm text-gray-600 dark:text-gray-300">User</div><div class="font-semibold cursor-pointer user-summary" data-label="${escapeHtml(label)}">${escapeHtml(label)}</div><div class="text-sm mt-1">Total hours: ${Number(hrs).toFixed(2)}</div>`;
    summaryEl.appendChild(card);
  });
  // attach click handlers
  document.querySelectorAll('.user-summary').forEach(el=>{
    el.addEventListener('click', ()=>{
      const label = el.getAttribute('data-label');
      // attempt to find userId by name/email
      openUserModalByLabel(label);
    });
  });
}

/* render logs table */
function renderTable(data){
  allLogsTbody.innerHTML = '';
  data.forEach(d=>{
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-200 dark:border-gray-700';
    // user display: name on top, small email below
    const userLabel = d.userName ? `${escapeHtml(d.userName)}` : escapeHtml(d.userEmail);
    // include a data-uid attribute so clicking opens modal for this uid
    const userCell = `<td class="px-3 py-2"><a href="#" class="user-link text-indigo-600 dark:text-indigo-300 underline" data-uid="${escapeHtml(d.userId)}">${userLabel}<div class="text-xs text-gray-500">${escapeHtml(d.userEmail)}</div></a></td>`;
    tr.innerHTML = `${userCell}
                    <td class="px-3 py-2">${escapeHtml(d.date)}</td>
                    <td class="px-3 py-2">${escapeHtml(d.event)}</td>
                    <td class="px-3 py-2">${Number(d.hours).toFixed(2)}</td>
                    <td class="px-3 py-2">${d.proofUrl?`<a href="${d.proofUrl}" target="_blank"><img src="${d.proofUrl}" width="60" class="rounded"/></a>`:'-'}</td>
                    <td class="px-3 py-2">${escapeHtml(d._createdAtStr)}</td>`;
    allLogsTbody.appendChild(tr);
  });
  // attach click handlers
  document.querySelectorAll('.user-link').forEach(a=>a.addEventListener('click', e=>{
    e.preventDefault();
    const uid = e.currentTarget.getAttribute('data-uid');
    if (uid) openUserModal(uid);
  }));
}

/* filter logic (by name) */
function applyFilters(){
  const nameFilter = filterName.value.trim().toLowerCase();
  const dt = filterDate.value;
  const mon = filterMonth.value;
  const ev = filterEvent.value.trim().toLowerCase();
  const min = Number(minHours.value || 0);
  const max = Number(maxHours.value || Infinity);
  const filtered = allLogs.filter(l=>{
    if (nameFilter) {
      const target = ((l.userName || l.userEmail) + '').toLowerCase();
      if (!target.includes(nameFilter)) return false;
    }
    if (dt && l.date !== dt) return false;
    if (mon) { const [y,m]=mon.split('-'); if (!l.date.startsWith(`${y}-${m}`)) return false; }
    if (ev && !l.event.toLowerCase().includes(ev)) return false;
    if (Number(l.hours) < min) return false;
    if (Number(l.hours) > max) return false;
    return true;
  });
  // show summary for filtered
  const totals = {}; filtered.forEach(x=>{ const key = x.userName || x.userEmail; totals[key] = (totals[key]||0) + Number(x.hours); });
  summaryEl.innerHTML=''; Object.entries(totals).slice(0,6).forEach(([label,hrs])=>{
    const card = document.createElement('div'); card.className='p-4 bg-white dark:bg-gray-700 rounded shadow';
    card.innerHTML=`<div class="text-sm text-gray-600 dark:text-gray-300">User</div><div class="font-semibold">${escapeHtml(label)}</div><div class="text-sm mt-1">Total hours: ${Number(hrs).toFixed(2)}</div>`;
    summaryEl.appendChild(card);
  });
  renderTable(filtered);
}

function resetFilters(){ filterName.value=''; filterDate.value=''; filterMonth.value=''; filterEvent.value=''; minHours.value=''; maxHours.value=''; renderSummary(); renderTable(allLogs); }

function exportToCSV(rows, filename='logs.csv'){
  const cols=['userName','userEmail','date','event','hours','photoUrl','loggedAt'];
  const csv=[cols.join(',')].concat(rows.map(r=>cols.map(c=>`"${(r[c]||'').toString().replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', ()=>{
  const rows=[];
  document.querySelectorAll('#all-logs tr').forEach(tr=>{
    const cells = tr.querySelectorAll('td'); if (!cells.length) return;
    rows.push({
      userName: cells[0].querySelector('a') ? cells[0].querySelector('a').textContent.trim() : '',
      userEmail: cells[0].querySelector('.text-xs') ? cells[0].querySelector('.text-xs').textContent.trim() : '',
      date: cells[1].textContent.trim(),
      event: cells[2].textContent.trim(),
      hours: cells[3].textContent.trim(),
      photoUrl: cells[4].querySelector('img') ? cells[4].querySelector('img').src : '',
      loggedAt: cells[5].textContent.trim()
    });
  });
  exportToCSV(rows,'visible_logs.csv');
});
applyBtn.addEventListener('click', applyFilters);
resetBtn.addEventListener('click', resetFilters);

/* modal + chart (user-specific) */
let currentChart = null;
function openUserModal(uid){
  const modal = document.getElementById('userModal');
  const userLogsEl = document.getElementById('userLogs');
  const modalEmail = document.getElementById('modal-user-email');
  const user = userMap[uid] || { name:'(unknown)', email:'' };
  modalEmail.textContent = `${user.name || user.email}`;
  const userLogs = allLogs.filter(l=>l.userId === uid).sort((a,b)=>a.date.localeCompare(b.date));
  userLogsEl.innerHTML = '';
  userLogs.forEach(l=>{
    const li = document.createElement('li');
    li.className='p-2 bg-gray-50 dark:bg-gray-700 rounded';
    li.innerHTML = `<div class="font-semibold">${escapeHtml(l.event)} <span class="text-xs text-gray-500">(${escapeHtml(l.date)})</span></div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">${Number(l.hours).toFixed(2)} hrs — ${escapeHtml(l.start)} to ${escapeHtml(l.end)}</div>
                    <div class="text-xs text-gray-400 mt-1">Logged at: ${escapeHtml(l._createdAtStr)}</div>`;
    userLogsEl.appendChild(li);
  });
  // chart
  const labels = userLogs.map(x=>x.date);
  const data = userLogs.map(x=>Number(x.hours));
  const ctx = document.getElementById('userChart').getContext('2d');
  if (currentChart) currentChart.destroy();
  currentChart = new Chart(ctx,{ type:'bar', data:{ labels, datasets:[{ label:'Hours', data, backgroundColor:'rgba(99,102,241,0.85)' }] }, options:{ responsive:true, plugins:{legend:{display:false}} } });
  document.getElementById('userModal').classList.remove('hidden');
  // download
  document.getElementById('downloadUserCSV').onclick = ()=> exportToCSV(userLogs.map(x=>({ userName: x.userName, userEmail: x.userEmail, date: x.date, event: x.event, hours: x.hours, photoUrl: x.proofUrl || '', loggedAt: x._createdAtStr })), `${(user.email || user.name || uid).replace(/[@.]/g,'_')}_logs.csv`);
}

/* helper: open by summary label (which may be "Name" or "email") */
function openUserModalByLabel(label){
  // try to match name first
  const uid = Object.keys(userMap).find(k => {
    const u = userMap[k];
    const combined = (u.name || '') || (u.email || '');
    return combined === label || (`${u.name}`) === label || (`${u.name} (${u.email})`) === label;
  });
  if (uid) return openUserModal(uid);
  // fallback: try matching email
  const uid2 = Object.keys(userMap).find(k => (userMap[k].email || '') === label);
  if (uid2) return openUserModal(uid2);
  alert('User not found in records.');
}

document.getElementById('closeModal').addEventListener('click', ()=>{
  document.getElementById('userModal').classList.add('hidden');
  if (currentChart) { currentChart.destroy(); currentChart = null; }
});

function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* auth + role check (manual role stored in users collection) */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  // show email/name placeholder
  supervisorEmail.textContent = user.email;
  // check users collection doc by uid
  const udoc = await getDoc(doc(db,'users', user.uid));
  const role = udoc.exists() ? (udoc.data().role || 'firstAider') : 'firstAider';
  if (role !== 'supervisor') { alert('Access denied — supervisors only'); window.location.href = 'index.html'; return; }
  // show nicer supervisor label if name present
  supervisorEmail.textContent = udoc.data().name ? `${udoc.data().name} (${udoc.data().email || user.email})` : (udoc.data().email || user.email);
  await fetchAllLogs();
});
