import {
initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
getFirestore,
doc,
setDoc,
getDoc,
addDoc,
collection,
serverTimestamp
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
const auth = getAuth();
const db = getFirestore();


// Helper references
const nameInput = () => document.getElementById("name");
const emailInput = () => document.getElementById("email");
const passInput = () => document.getElementById("password");


async function signup() {
try {
const name = nameInput().value.trim();
if (!name) return alert("Please enter your name.");


const cred = await createUserWithEmailAndPassword(
auth,
emailInput().value,
passInput().value
);


await setDoc(doc(db, "users", cred.user.uid), {
uid: cred.user.uid,
email: cred.user.email,
name,
role: "firstAider",
createdAt: serverTimestamp()
});


});
