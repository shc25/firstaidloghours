import {
initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getFirestore,
collection,
getDocs,
query,
where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {
/* your config */
  apiKey: "AIzaSyBWtaWaFLcnS6NiUFLJfWZ0IuojIIw0fNI",
  authDomain: "first-aid-log-hours.firebaseapp.com",
  projectId: "first-aid-log-hours",
  storageBucket: "first-aid-log-hours.appspot.com",
  messagingSenderId: "413029874974",
  appId: "1:413029874974:web:431eb394a78a666442dd0f",
  measurementId: "G-VD5BEXPTFD"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore();


const filterName = document.getElementById("filter-name");
const logTable = document.getElementById("log-table");


filterName.addEventListener("input", renderTable);


async function getLogs() {
const snap = await getDocs(collection(db, "logs"));
return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}


async function renderTable() {
const logs = await getLogs();
const filter = filterName.value.trim().toLowerCase();


logTable.innerHTML = "";


logs
.filter((l) => !filter || (l.userName || "").toLowerCase().includes(filter))
.forEach((d) => {
const tr = document.createElement("tr");
tr.className = "border-b";


tr.innerHTML = `
<td class="px-3 py-2">${d.userName || "Unknown"}</td>
<td class="px-3 py-2">${d.date}</td>
<td class="px-3 py-2">${d.event}</td>
<td class="px-3 py-2">${Number(d.hours).toFixed(2)}</td>
<td class="px-3 py-2">${d.proofUrl ? `<a href="${d.proofUrl}" target="_blank"><img src="${d.proofUrl}" width="60"></a>` : "-"}</td>
<td class="px-3 py-2">${d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString() : "-"}</td>
`;


logTable.appendChild(tr);
});
}


renderTable();
