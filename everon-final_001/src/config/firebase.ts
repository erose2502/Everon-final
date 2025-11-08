// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOVk2WIjcQQbPKlUwciqoQRLxhHOb6rAw",
  authDomain: "everon-f675a.firebaseapp.com",
  projectId: "everon-f675a",
  storageBucket: "everon-f675a.firebasestorage.app",
  messagingSenderId: "814820506555",
  appId: "1:814820506555:web:71c69c333463daf126a29e",
  measurementId: "G-FTJ11D0TV1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
