import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

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
const storage = getStorage(app);

// Theme toggle
export function toggleTheme() {
  const root = document.documentElement;
  if(root.classList.contains('dark')){
    root.classList.remove('dark'); localStorage.setItem('theme','light');
  } else { root.classList.add('dark'); localStorage.setItem('theme','dark'); }
}
if(localStorage.getItem('theme')==='light') document.documentElement.classList.remove('dark');
else document.documentElement.classList.add('dark');

// Alert helper
function showAlert(message) {
  const container = document.getElementById('alert-container');
  container.innerHTML = `<div class="text-red-400 mb-2">${message}</div>`;
  setTimeout(()=>{ container.innerHTML=''; },4000);
}

// Login/Signup
export function login(){
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  signInWithEmailAndPassword(auth,email,password)
    .then(()=>showForm())
    .catch(err=>{
      if(err.code==='auth/user-not-found') showAlert("Email not found! Sign Up instead.");
      else if(err.code==='auth/wrong-password') showAlert("Incorrect password!");
      else showAlert(err.message);
    });
}

export function signup(){
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if(!name) return showAlert("Enter full name to Sign Up.");
  createUserWithEmailAndPassword(auth,email,password)
    .then(async cred=>{
      await addDoc(collection(db,'users'),{uid:cred.user.uid,name,email,role:"firstAider"});
      showForm();
    })
    .catch(err=>{
      if(err.code==='auth/email-already-in-use') showAlert("Email exists! Login instead.");
      else showAlert(err.message);
    });
}

export function logout(){
  signOut(auth).then(()=>{
    document.getElementById('form-section').style.display='none';
    document.getElementById('login-section').style.display='block';
  });
}

async function showForm(){
  const user = auth.currentUser;
  document.getElementById('login-section').style.display='none';
  document.getElementById('form-section').style.display='block';
  document.getElementById('user-email').textContent = user.email;
  loadLogs();
}

export async function submitLog(){
  const user = auth.currentUser;
  const event = document.getElementById('event').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const imageFile = document.getElementById('image').files[0];
  if(!imageFile) return showAlert("Upload an image!");

  const storageRef = ref(storage, `images/${user.uid}_${Date.now()}`);
  await uploadBytes(storageRef,imageFile);
  const imageURL = await getDownloadURL(storageRef);

  const startTime = new Date(`1970-01-01T${start}`);
  const endTime = new Date(`1970-01-01T${end}`);
  const diffMs = endTime - startTime;
  let hours = Math.floor(diffMs/(1000*60*60));
  let minutes = Math.floor((diffMs%(1000*60*60))/(1000*60));

  await addDoc(collection(db,'logs'),{
    userId:user.uid,
    email:user.email,
    date:serverTimestamp(),
    event,
    start,
    end,
    hours,
    minutes,
    imageURL
  });

  showAlert("Duty log saved!");
  loadLogs();
}

async function loadLogs(){
  const user = auth.currentUser;
  const q = query(collection(db,'logs'),where('userId','==',user.uid),orderBy('date','desc'));
  const snapshot = await getDocs(q);
  const list = document.getElementById('log-list');
  list.innerHTML='';
  let totalHours=0,totalMinutes=0;

  snapshot.forEach(doc=>{
    const data=doc.data();
    totalHours+=data.hours;
    totalMinutes+=data.minutes;
    totalHours+=Math.floor(totalMinutes/60);
    totalMinutes%=60;

    const li = document.createElement('li');
    li.innerHTML=`<strong>${data.event}</strong> - ${data.hours}h ${data.minutes}m<br><img src="${data.imageURL}" class="w-full mt-1 rounded-md"/>`;
    list.appendChild(li);
  });
  document.getElementById('total-hours').textContent = `${totalHours}h ${totalMinutes}m`;
}

onAuthStateChanged(auth,user=>{if(user) showForm();});

