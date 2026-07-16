import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCaW4TukM8aQJsp3w1301rknyLNQZYu004",
  authDomain: "nostra-caffe-8185e.firebaseapp.com",
  projectId: "nostra-caffe-8185e",
  storageBucket: "nostra-caffe-8185e.firebasestorage.app",
  messagingSenderId: "236418082675",
  appId: "1:236418082675:web:2367fcd199ebbf97540706"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics tidak dipakai karena project baru belum mengaktifkannya
export const analytics = null;
