// supervisor.js (module) - polished
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore, collection, query, orderBy, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

/* firebase config */
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

/* DOM */
const el = id => document.getElementById(id);
const supervisorEmail = el('supervisor-email');
const allLogsTbody = el('all-logs');
const summaryEl = el('summary');
const applyBtn = el('applyFilters');
const resetBtn = el('resetFilters');
const exportBtn = el('exportCSV');
const filterName = el('filter-name');
const filterDate = el('filter-date');
const filterMonth = el('filter-month');
const filterEvent = el('filter-event');
const minMinutes = el('min-hours'); // these are minutes numeric inputs
const maxMinutes = el('max-hours');
const logoutBtn = el('logoutBtn');
const supervisorTotalEl = el('supervisor-total');

const themeToggle = el('theme-toggle');
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

/* helper formatting */
function minutesToHuman(mins) {
  mins = Number(mins) || 0;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2,'0')}m`;
}
function formatTimestamp(ts) {
  if (!ts) return '';
  try { if (ts.toDate) return ts.toDate().toLocaleString(); } catch(e){}
  return new Date(ts).toLocaleString();
}

/* populate months */
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

/* fetch users -> map */
async function fetchAllUsers(){
  userMap = {};
  const q = query(collection(db,'users'), orderBy('createdAt','asc'));
  const snap = await getDocs(q);
  snap.forEach(s => {
    const u = s.data();
    userMap[s.id] = { name: u.name || '', email: u.email || '' };
  });
}

/* fetch logs and build totals */
async function fetchAllLogs() {
  allLogs = []; usersTotals = {}; allLogsTbody.innerHTML = '';
  await fetchAllUsers();

  const q = query(collection(db,'logs'), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const d = docSnap.data();
    d.minutes = Number(d.minutes || d.minutes === 0 ? d.minutes : (d.minutes || 0));
    const u = userMap[d.userId] || { name: d.name || '', email: d.email || '' };
    d.userName = u.name || '';
    d.userEmail = u.email || d.email || '';
    d._createdAtStr = formatTimestamp(d.createdAt);
    allLogs.push(d);
    const key = d.userName || d.userEmail;
    usersTotals[key] = (usersTotals[key] || 0) + Number(d.minutes || 0);
  });

  renderSummary();
  renderTable(allLogs);
  // update supervisor total
  const tot = Object.values(usersTotals).reduce((a,b) => a + b, 0);
  supervisorTotalEl.textContent = minutesToHuman(tot);
}

/* render summary cards */
function renderSummary(){
  summaryEl.innerHTML = '';
  const entries = Object.entries(usersTotals).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if (entries.length===0) { summaryEl.innerHTML = '<div class="p-4 bg-white dark:bg-gray-700 rounded">No logs yet</div>'; return; }
  entries.forEach(([label, hrs])=>{
    const card = document.createElement('div');
    card.className = 'p-4 bg-white dark:bg-gray-700 rounded shadow';
    card.innerHTML = `<div class="text-sm text-gray-600 dark:text-gray-300">User</div><div class="font-semibold cursor-pointer user-summary" data-label="${escapeHtml(label)}">${escapeHtml(label)}</div><div class="text-sm mt-1">Total: ${minutesToHuman(Number(hrs))}</div>`;
    summaryEl.appendChild(card);
  });
  document.querySelectorAll('.user-summary').forEach(el=>{
    el.addEventListener('click', ()=> openUserModalByLabel(el.getAttribute('data-label')));
  });
}

/* render table */
function renderTable(data){
  allLogsTbody.innerHTML = '';
  data.forEach(d=>{
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-200 dark:border-gray-700';
    const userLabel = d.userName ? `${escapeHtml(d.userName)}` : escapeHtml(d.userEmail);
    const userCell = `<td class="px-3 py-2"><a href="#" class="user-link text-indigo-600 dark:text-indigo-300 underline" data-uid="${escapeHtml(d.userId)}">${userLabel}<div class="text-xs text-gray-500">${escapeHtml(d.userEmail)}</div></a></td>`;
    tr.innerHTML = `${userCell}
                    <td class="px-3 py-2">${escapeHtml(d.date)}</td>
                    <td class="px-3 py-2">${escapeHtml(d.event)}</td>
                    <td class="px-3 py-2">${minutesToHuman(d.minutes)}</td>
                    <td class="px-3 py-2">${d.proofUrl?`<a href="${d.proofUrl}" target="_blank"><img src="${d.proofUrl}" width="60" class="rounded"/></a>`:'-'}</td>
                    <td class="px-3 py-2">${escapeHtml(d._createdAtStr)}</td>`;
    allLogsTbody.appendChild(tr);
  });
  document.querySelectorAll('.user-link').forEach(a=>a.addEventListener('click', e=>{ e.preventDefault(); const uid = e.currentTarget.getAttribute('data-uid'); if (uid) openUserModal(uid); }));
}

/* filtering & export */
function applyFilters(){
  const nameFilter = filterName.value.trim().toLowerCase();
  const dt = filterDate.value;
  const mon = filterMonth.value;
  const ev = filterEvent.value.trim().toLowerCase();
  const min = Number(minMinutes.value || 0);
  const max = Number(maxMinutes.value || Infinity);
  const filtered = allLogs.filter(l=>{
    if (nameFilter) {
      const target = ((l.userName || l.userEmail) + '').toLowerCase();
      if (!target.includes(nameFilter)) return false;
    }
    if (dt && l.date !== dt) return false;
    if (mon) { const [y,m]=mon.split('-'); if (!l.date.startsWith(`${y}-${m}`)) return false; }
    if (ev && !l.event.toLowerCase().includes(ev)) return false;
    if (Number(l.minutes) < min) return false;
    if (Number(l.minutes) > max) return false;
    return true;
  });
  const totals = {}; filtered.forEach(x=>{ const key = x.userName || x.userEmail; totals[key] = (totals[key]||0) + Number(x.minutes); });
  summaryEl.innerHTML=''; Object.entries(totals).slice(0,6).forEach(([label,hrs])=>{
    const card = document.createElement('div'); card.className='p-4 bg-white dark:bg-gray-700 rounded shadow';
    card.innerHTML=`<div class="text-sm text-gray-600 dark:text-gray-300">User</div><div class="font-semibold">${escapeHtml(label)}</div><div class="text-sm mt-1">Total: ${minutesToHuman(Number(hrs))}</div>`;
    summaryEl.appendChild(card);
  });
  renderTable(filtered);
  // update supervisor total for filtered
  const totFiltered = Object.values(totals).reduce((a,b) => a + b, 0);
  supervisorTotalEl.textContent = minutesToHuman(totFiltered);
}

function resetFilters(){ filterName.value=''; filterDate.value=''; filterMonth.value=''; filterEvent.value=''; minMinutes.value=''; maxMinutes.value=''; renderSummary(); renderTable(allLogs); supervisorTotalEl.textContent = minutesToHuman(Object.values(usersTotals).reduce((a,b)=>a+b,0)); }

function exportToCSV(rows, filename='logs.csv'){
  const cols=['userName','userEmail','date','event','minutes','loggedAt','proofUrl'];
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
      minutes: parseInt((cells[3].textContent.match(/(\d+)h\s+(\d+)m/) || [0,0,0])[1])*60 + parseInt((cells[3].textContent.match(/(\d+)h\s+(\d+)m/) || [0,0,0])[2]),
      loggedAt: cells[5].textContent.trim(),
      proofUrl: cells[4].querySelector('img') ? cells[4].querySelector('img').src : ''
    });
  });
  exportToCSV(rows,'visible_logs.csv');
});
applyBtn.addEventListener('click', applyFilters);
resetBtn.addEventListener('click', resetFilters);

/* modal + user view */
let currentChart = null;
function openUserModal(uid){
  const modal = el('userModal');
  const userLogsEl = el('userLogs');
  const modalEmail = el('modal-user-email');
  const user = userMap[uid] || { name:'(unknown)', email:'' };
  modalEmail.textContent = `${user.name || user.email}`;
  const userLogs = allLogs.filter(l=>l.userId === uid).sort((a,b)=>a.date.localeCompare(b.date));
  userLogsEl.innerHTML = '';
  userLogs.forEach(l=>{
    const li = document.createElement('li');
    li.className='p-2 bg-gray-50 dark:bg-gray-700 rounded';
    li.innerHTML = `<div class="font-semibold">${escapeHtml(l.event)} <span class="text-xs text-gray-500">(${escapeHtml(l.date)})</span></div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">${minutesToHuman(l.minutes)} — ${escapeHtml(l.start)} to ${escapeHtml(l.end)}</div>
                    <div class="text-xs text-gray-400 mt-1">Logged at: ${escapeHtml(l._createdAtStr)}</div>`;
    userLogsEl.appendChild(li);
  });
  const labels = userLogs.map(x=>x.date);
  const data = userLogs.map(x=>Number(x.minutes)/60);
  const ctx = document.getElementById('userChart').getContext('2d');
  if (currentChart) currentChart.destroy();
  currentChart = new Chart(ctx,{ type:'bar', data:{ labels, datasets:[{ label:'Hours', data, backgroundColor:'rgba(99,102,241,0.85)' }] }, options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } } });
  modal.classList.remove('hidden');
  el('downloadUserCSV').onclick = ()=> {
    const rows = userLogs.map(x=>({ userName: x.userName, userEmail: x.userEmail, date: x.date, event: x.event, minutes: x.minutes, loggedAt: x._createdAtStr, proofUrl: x.proofUrl || '' }));
    exportToCSV(rows, `${(user.email || user.name || uid).replace(/[@.]/g,'_')}_logs.csv`);
  };
}
el('closeModal').addEventListener('click', ()=>{
  el('userModal').classList.add('hidden');
  if (currentChart) { currentChart.destroy(); currentChart = null; }
});

function openUserModalByLabel(label){
  const uid = Object.keys(userMap).find(k => {
    const u = userMap[k];
    const combined = (u.name || '') || (u.email || '');
    return combined === label || (`${u.name}`) === label || (`${u.name} (${u.email})`) === label;
  });
  if (uid) return openUserModal(uid);
  const uid2 = Object.keys(userMap).find(k => (userMap[k].email || '') === label);
  if (uid2) return openUserModal(uid2);
  alert('User not found in records.');
}

function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* auth + role check */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  supervisorEmail.textContent = user.email;
  const udoc = await getDoc(doc(db,'users', user.uid));
  const role = udoc.exists() ? (udoc.data().role || 'firstAider') : 'firstAider';
  if (role !== 'supervisor') { alert('Access denied — supervisors only'); window.location.href = 'index.html'; return; }
  supervisorEmail.textContent = udoc.data().name ? `${udoc.data().name} (${udoc.data().email || user.email})` : (udoc.data().email || user.email);
  await fetchAllLogs();
});
