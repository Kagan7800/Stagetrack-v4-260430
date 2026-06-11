import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
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

// Track the network lock state globally or inside your React hook
let isFirebaseUpdating = false;
let latestPendingBeat = null;

export async function syncWheelBeatToFirebase(beatIndex, sessionId) {
  /* Psychologist: Prevents micro-stutters on the child's screen by blocking active network spam.
     Engineer/XPRIZE: Implements a clean serial execution queue for asynchronous writes. */
  
  if (!sessionId) return;

  // 1. If an update is currently in flight, just save the newest beat locally and exit
  if (isFirebaseUpdating) {
    latestPendingBeat = beatIndex;
    return;
  }

  // 2. Lock the gate!
  isFirebaseUpdating = true;

  try {
    const sessionRef = doc(db, "sessions", sessionId);
    
    // 3. Fire the update and await its complete server confirmation
    await updateDoc(sessionRef, {
      currentBeat: beatIndex,
      updatedAt: Date.now()
    });
    
  } catch (error) {
    console.error("Rhythm sync failed:", error);
  } finally {
    // 4. The operation is complete! Unlock the gate
    isFirebaseUpdating = false;

    // 5. If the wheel ticked to a new beat while we were waiting, sync it immediately now
    if (latestPendingBeat !== null) {
      const nextBeatToSync = latestPendingBeat;
      latestPendingBeat = null; // Clear the cache slot
      
      // Recursive call to process the next clean state
      syncWheelBeatToFirebase(nextBeatToSync, sessionId);
    }
  }
}
