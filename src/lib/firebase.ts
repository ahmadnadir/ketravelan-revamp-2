import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!hasFirebaseConfig()) return null;
  const supported = await isSupported();
  if (!supported) return null;
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  if (!messagingInstance) {
    messagingInstance = getMessaging(appInstance);
  }
  return messagingInstance;
}

export function getFirebaseConfig() {
  return firebaseConfig;
}
