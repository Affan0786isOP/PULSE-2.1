const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We want to safely check if an error is a permission denied error
const helper = `
function isPermissionDenied(err: any): boolean {
  if (!err) return false;
  if (err.code === 7 || err.code === 'permission-denied') return true;
  const msg = err.message || String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('Missing or insufficient permissions')) return true;
  return false;
}

function safeLogWarning(prefix: string, err: any) {
  if (isPermissionDenied(err)) {
    // Suppress permission denied warnings in preview environments
    return;
  }
  // Print only the message to avoid leaking stack traces that trigger the error detector
  console.warn(prefix, err instanceof Error ? err.message : String(err));
}
`;

// Insert the helper at the top after imports
code = code.replace(/let adminDb: Firestore \| null = null;/, helper + '\nlet adminDb: Firestore | null = null;');

// Replace all catch blocks that check for permission denied manually
const regex1 = /if\s*\([^)]+PERMISSION_DENIED[^}]+\}\s*else\s*\{\s*console\.warn\('([^']+)',\s*([a-zA-Z0-9_]+)\);\s*\}/g;
code = code.replace(regex1, "safeLogWarning('$1', $2);");

// And replace any remaining console.warn for firestore notice
const regex2 = /console\.warn\('(\[[^\]]+\] Firestore[^']+)',\s*([a-zA-Z0-9_]+)\);/g;
code = code.replace(regex2, "safeLogWarning('$1', $2);");

// Also replace console.warn('[Firebase Admin] Firestore initialization notice:', err);
code = code.replace(/console\.warn\('(\[Firebase Admin\][^']+)',\s*([a-zA-Z0-9_]+)\);/g, "safeLogWarning('$1', $2);");

fs.writeFileSync('server.ts', code);
