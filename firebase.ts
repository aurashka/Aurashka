// Fix: Add a global declaration for the firebase object on the window.
// This informs TypeScript that 'window.firebase' exists, resolving compile-time errors.
declare global {
  interface Window {
    firebase: any;
  }
}

// This file accesses the global 'firebase' object loaded from the scripts in index.html
const firebaseConfig = {
  apiKey: "AIzaSyAPPZgVrZF9SEaS42xx8RcsnM2i8EpenUQ",
  authDomain: "creadit-loan-5203b.firebaseapp.com",
  databaseURL: "https://creadit-loan-5203b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "creadit-loan-5203b",
  storageBucket: "creadit-loan-5203b.appspot.com",
  messagingSenderId: "95634892627",
  appId: "1:95634892627:web:1500052cb60f3b7e4823a6",
  measurementId: "G-V60FZSL5V1"
};

// Initialize Firebase
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

export const auth = window.firebase.auth();
export const db = window.firebase.database();
