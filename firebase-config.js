import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIpk_rVayLvg4Bru5T_WIUhrG5bnBatSs",
  authDomain: "nichat-99622.firebaseapp.com",
  projectId: "nichat-99622",
  storageBucket: "nichat-99622.firebasestorage.app",
  messagingSenderId: "187740833492",
  appId: "1:187740833492:web:7b068f9f8aff76f59f9d41"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);