import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


/* =========================
   LOGIN ELEMENTS
========================= */

const loginForm =
  document.getElementById("loginForm");

const email =
  document.getElementById("email");

const password =
  document.getElementById("password");

const authMessage =
  document.getElementById("authMessage");


/* =========================
   SHOW MESSAGE
========================= */

function showMessage(message, type = "error") {

  if (!authMessage) return;

  authMessage.textContent = message;

  authMessage.className =
    `auth-message ${type}`;

}


/* =========================
   LOGIN
========================= */

if (loginForm) {

  loginForm.addEventListener(
    "submit",

    async (event) => {

      event.preventDefault();


      const emailValue =
        email.value.trim();

      const passwordValue =
        password.value;


      if (!emailValue || !passwordValue) {

        showMessage(
          "Please enter your email and password."
        );

        return;

      }


      try {

        showMessage(
          "Logging in...",
          "success"
        );


        await signInWithEmailAndPassword(

          auth,

          emailValue,

          passwordValue

        );


        showMessage(
          "Login successful! Redirecting...",
          "success"
        );


        window.location.href =
          "./index.html";


      } catch (error) {

        console.error(
          "Login error:",
          error
        );


        let message =
          "Login failed. Please try again.";


        if (
          error.code ===
          "auth/invalid-email"
        ) {

          message =
            "Please enter a valid email address.";

        }


        else if (
          error.code ===
          "auth/invalid-credential"
        ) {

          message =
            "Incorrect email or password.";

        }


        else if (
          error.code ===
          "auth/user-not-found"
        ) {

          message =
            "No account found with this email.";

        }


        else if (
          error.code ===
          "auth/wrong-password"
        ) {

          message =
            "Incorrect password.";

        }


        else if (
          error.code ===
          "auth/too-many-requests"
        ) {

          message =
            "Too many attempts. Please try again later.";

        }


        showMessage(message);

      }

    }

  );

}