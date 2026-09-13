import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import appletConfig from '../../firebase-applet-config.json';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

const EXPECTED_PROJECT_ID = 'pulse-lab-36920';

const hasEnvVars = requiredEnvVars.every((envVar) => {
  const value = import.meta.env[envVar];
  return Boolean(value && String(value).trim());
});

const hasAppletConfig = Boolean(
  appletConfig &&
  appletConfig.apiKey &&
  appletConfig.projectId &&
  appletConfig.appId
);

const envConfig = hasEnvVars ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
} : null;

const appletCfg = hasAppletConfig ? {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId
} : null;

let selectedConfig: any = null;
if (envConfig) {
  if (envConfig.projectId === EXPECTED_PROJECT_ID) {
    selectedConfig = envConfig;
  } else {
    console.error(`[Firebase] Configured VITE_FIREBASE_PROJECT_ID (${envConfig.projectId}) does not match authoritative project (${EXPECTED_PROJECT_ID}). Rejecting mismatched environment configuration.`);
    if (appletCfg && appletCfg.projectId === EXPECTED_PROJECT_ID) {
      selectedConfig = appletCfg;
    } else {
      selectedConfig = null;
    }
  }
} else if (appletCfg) {
  if (appletCfg.projectId === EXPECTED_PROJECT_ID) {
    selectedConfig = appletCfg;
  } else {
    console.error(`[Firebase] Applet config projectId (${appletCfg.projectId}) does not match authoritative project (${EXPECTED_PROJECT_ID}).`);
    selectedConfig = null;
  }
}

const isConfigured = Boolean(
  selectedConfig &&
  selectedConfig.apiKey &&
  selectedConfig.projectId &&
  selectedConfig.projectId === EXPECTED_PROJECT_ID
);

const firebaseConfig = isConfigured ? selectedConfig : {};

const app = isConfigured ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
const rawDbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || (hasAppletConfig ? appletConfig.firestoreDatabaseId : undefined);
const dbId = typeof rawDbId === 'string' && rawDbId.trim() && rawDbId !== '(default)' ? rawDbId.trim() : undefined;
const db = app ? (dbId ? getFirestore(app, dbId) : getFirestore(app)) : null;
const auth = app ? getAuth(app) : null;

const authInitPromise = auth
  ? setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("[Firebase Auth] Local persistence unavailable (e.g. sandbox/iframe), falling back to inMemoryPersistence:", err);
      return setPersistence(auth, inMemoryPersistence).catch(() => Promise.resolve());
    })
  : Promise.resolve();

export { app, db, auth, isConfigured, authInitPromise };
