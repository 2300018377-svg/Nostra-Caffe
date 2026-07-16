import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD6Ez77APXRJxX9uOOteqvgyF1Prx0BJkc",
  authDomain: "nostra-caffe.firebaseapp.com",
  projectId: "nostra-caffe",
  storageBucket: "nostra-caffe.firebasestorage.app",
  messagingSenderId: "410274342563",
  appId: "1:410274342563:web:4afea48efc246f40d84116",
  measurementId: "G-8PEQ86RFZ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
// Menggunakan getFirestore standar agar sinkronisasi jaringan berjalan lancar di HP dan desktop
// tanpa risiko IndexedDB terkunci (locked) oleh multiple tab manager bawaan browser mobile.
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (optional, checks if in browser context)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
