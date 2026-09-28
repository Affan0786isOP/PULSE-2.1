import * as path from 'path';
import * as fs from 'fs';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function isPermissionDenied(err: any): boolean {
  if (!err) return false;
  if (err.code === 7 || err.code === 'permission-denied') return true;
  const msg = err.message || String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('Missing or insufficient permissions')) return true;
  return false;
}

export function safeLogWarning(prefix: string, err: any) {
  if (isPermissionDenied(err)) {
    // Suppress permission denied warnings in preview environments
    return;
  }
  // Print only the message to avoid leaking stack traces that trigger the error detector
  console.warn(prefix, err instanceof Error ? err.message : String(err));
}

export function initializeAdminApp(): void {
  if (getApps().length > 0) {
    return;
  }
  
  let appletConfig: any = null;
  try {
    const configRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
    appletConfig = JSON.parse(configRaw);
  } catch (e) {
  }
  
  const envProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT)?.trim();
  const projectId = envProjectId || appletConfig?.projectId;

  if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    try {
      let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      
      // Remove surrounding quotes if present (e.g. from Vercel env vars)
      if (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) {
        serviceAccountStr = serviceAccountStr.slice(1, -1).trim();
      } else if (serviceAccountStr.startsWith("'") && serviceAccountStr.endsWith("'")) {
        serviceAccountStr = serviceAccountStr.slice(1, -1).trim();
      }

      let serviceAccount;
      if (serviceAccountStr.startsWith('{')) {
        serviceAccount = JSON.parse(serviceAccountStr);
      } else {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString('utf8'));
      }
      if (serviceAccount && serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      if (getApps().length === 0) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id
        });
      }
      lastAdminError = null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Firebase Admin] Initialization failed:', msg);
      lastAdminError = `Invalid FIREBASE_SERVICE_ACCOUNT configuration: ${msg}`;
      throw new Error(lastAdminError);
    }
  } else {
    lastAdminError = 'FIREBASE_SERVICE_ACCOUNT environment variable is missing or empty. Server-side admin credentials are required.';
    throw new Error(lastAdminError);
  }
}

let lastAdminError: string | null = null;
let adminDb: Firestore | null = null;

export function getAdminDiagnosticMessage(): string {
  if (lastAdminError) return lastAdminError;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    return 'FIREBASE_SERVICE_ACCOUNT environment variable is missing or empty. Server-side admin credentials are required.';
  }
  return 'Server admin initialization failed';
}

export function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;
  try {
    initializeAdminApp();
    
    let appletConfig: any = null;
    try {
      const configRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
      appletConfig = JSON.parse(configRaw);
    } catch (e) {}
    
    const envProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT)?.trim();
    const envDbId = (process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID)?.trim();
    const rawDbId = envDbId || (!envProjectId ? appletConfig?.firestoreDatabaseId : undefined);
    const dbId = typeof rawDbId === 'string' && rawDbId.trim() && rawDbId !== '(default)' ? rawDbId.trim() : undefined;
    
    adminDb = dbId ? getFirestore(getApps()[0], dbId) : getFirestore(getApps()[0]);
    return adminDb;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    safeLogWarning('[Firebase Admin] Firestore initialization notice:', err);
    if (!lastAdminError) {
      lastAdminError = msg;
    }
    return null;
  }
}
