// firebase.ts (or firebase.js if you're not using TypeScript)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCvxwsTLbHqHyVGA4lCJOsR80DiCGVBJQw",
  authDomain: "chaiiwala-b9079.firebaseapp.com",
  projectId: "chaiiwala-b9079",
  storageBucket: "chaiiwala-b9079.appspot.com", // 🔧 FIXED: Correct Firebase format
  messagingSenderId: "1052549676394",
  appId: "1:1052549676394:web:0ce07617f60a779afbb913",
  measurementId: "G-LD9SYD1W8B"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);