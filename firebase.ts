// Fix: Add a global declaration for the firebase object on the window.
// This informs TypeScript that 'window.firebase' exists, resolving compile-time errors.
declare global {
  interface Window {
    firebase: any;
  }
}

// This file accesses the global 'firebase' object loaded from the scripts in index.html
const firebaseConfig = {
  apiKey: "AIzaSyAbNsuWWYS4c8ChFgRtweQjSTfdfVn6Pxg",
  authDomain: "aurashka-web.firebaseapp.com",
  databaseURL: "https://aurashka-web-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aurashka-web",
  storageBucket: "aurashka-web.firebasestorage.app",
  messagingSenderId: "900002572213",
  appId: "1:900002572213:web:052179ead49fc806585bfc",
  measurementId: "G-TR1W4DWKG9"
};

// Initialize Firebase
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

export const auth = window.firebase.auth();
export const db = window.firebase.database();
