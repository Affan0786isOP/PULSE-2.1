const fs = require('fs');

function updateFirestore(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace ensureAuthenticatedUser in mobile if it has signInAnonymously
  if (content.includes('await signInAnonymously(auth);')) {
    content = content.replace(
      /export const ensureAuthenticatedUser = async \(\): Promise<boolean> => \{[\s\S]*?\n\};/,
      `export const ensureAuthenticatedUser = async (): Promise<boolean> => {
  if (!isConfigured || !auth) return false;
  try {
    await authInitPromise;
    if (auth.currentUser) return true;
    
    return await new Promise<boolean>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          unsubscribe();
          resolve(true);
        }
      });
      setTimeout(() => {
        unsubscribe();
        resolve(Boolean(auth.currentUser));
      }, 5000);
    });
  } catch (error) {
    reportError(error, 'RECOVERABLE_FAILURE', { component: 'Firestore', action: 'ensureAuthenticatedUser' });
    return false;
  }
};`
    );
  }

  // Remove import { signInAnonymously } if present
  content = content.replace(/import \{ signInAnonymously \} from 'firebase\/auth';\n?/g, '');

  // Add fetchWithAuth helper
  if (!content.includes('fetchWithAuth')) {
    const helper = `\nasync function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const ready = await ensureFirebaseReady();
  if (!ready) throw new Error('Firebase service unavailable');
  
  const authOk = await ensureAuthenticatedUser();
  if (!authOk || !auth?.currentUser) throw new Error('Authentication required');

  let idToken = await auth.currentUser.getIdToken();
  if (!idToken) throw new Error('Authentication token unavailable');

  const getHeaders = (token: string) => ({
    ...options.headers,
    'Authorization': \`Bearer \${token}\`
  });

  let res = await fetch(url, { ...options, headers: getHeaders(idToken) });

  if (res.status === 401) {
    idToken = await auth.currentUser.getIdToken(true);
    if (idToken) {
      res = await fetch(url, { ...options, headers: getHeaders(idToken) });
    }
  }
  return res;
}\n\n`;
    content = content.replace(/(export const ensureAuthenticatedUser[\s\S]*?\n\};)/, `$1\n${helper}`);
  }

  // Replace fetch calls in sessionStart
  content = content.replace(
    /const ready = await ensureFirebaseReady\(\);[\s\S]*?const res = await fetch\('/g,
    `const res = await fetchWithAuth('/`
  );

  content = content.replace(
    /const authOk = await ensureAuthenticatedUser\(\);[\s\S]*?const idToken = await auth\.currentUser\.getIdToken\(\);[\s\S]*?const res = await fetch\('/g,
    `const res = await fetchWithAuth('/`
  );
  
  content = content.replace(
    /const authOk = await ensureAuthenticatedUser\(\);[\s\S]*?const res = await fetch\('/g,
    `const res = await fetchWithAuth('/`
  );

  // Clean up duplicate fetch definition matches
  // Actually, string replacement with regex might be tricky. Let's do it specifically:
  fs.writeFileSync(filePath, content);
}

updateFirestore('./src/lib/firestore.ts');
updateFirestore('./mobile/src/lib/firestore.ts');
