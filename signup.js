import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const signupForm = document.getElementById("signupForm");
const authMessage = document.getElementById("authMessage");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (authMessage) {
      authMessage.textContent = "Creating account...";
      authMessage.style.color = "#707991";
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      if (db) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: name,
          email: email,
          createdAt: new Date().toISOString()
        });
      }

      if (authMessage) {
        authMessage.textContent = "Account created! Redirecting...";
        authMessage.style.color = "#2e7d32";
      }

      setTimeout(() => {
        window.location.href = "./index.html";
      }, 1000);

    } catch (error) {
      console.error("Signup error:", error);
      if (authMessage) {
        authMessage.style.color = "#d32f2f";
        if (error.code === "auth/email-already-in-use") {
          authMessage.textContent = "That email is already registered.";
        } else if (error.code === "auth/weak-password") {
          authMessage.textContent = "Password must be at least 6 characters.";
        } else {
          authMessage.textContent = error.message;
        }
      }
    }
  });
}