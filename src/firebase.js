import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyABldZ-IWolMQh1bHyfao7s4-rjD7uUfy8",
  authDomain: "stagetrack-v4-260430-461-92681.firebaseapp.com",
  projectId: "stagetrack-v4-260430-461-92681",
  storageBucket: "stagetrack-v4-260430-461-92681.firebasestorage.app",
  messagingSenderId: "839589213291",
  appId: "1:839589213291:web:45eb3702e75e0b3e0a2d2e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper function to ensure user is signed in anonymously
export const ensureAuthenticated = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous authentication failed:", error);
    }
  }
  return auth.currentUser;
};
