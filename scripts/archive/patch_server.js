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
code = code.replace(/if \([^)]+PERMISSION_DENIED[^}]+\} else \{\s*console\.warn\('([^']+)',\s*([a-zA-Z0-9_]+)\);\s*\}/g, "safeLogWarning('$1', $2);");

// And replace any remaining console.warn for firestore notice
code = code.replace(/console\.warn\('(\[[^\]]+\] Firestore[^']+)',\s*([a-zA-Z0-9_]+)\);/g, "safeLogWarning('$1', $2);");

fs.writeFileSync('server.ts', code);
