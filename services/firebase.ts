import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCQLCjZ4Uoh6Bo9qvLWwkCd1TazDB6DQ40",
  authDomain: "ssgpt-papergenerator.firebaseapp.com",
  projectId: "ssgpt-papergenerator",
  storageBucket: "ssgpt-papergenerator.firebasestorage.app",
  messagingSenderId: "735787611043",
  appId: "1:735787611043:web:a7d6da811a5f88a3d96016"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
