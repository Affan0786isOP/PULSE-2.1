const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Remove the global check
content = content.replace(
  "const SERVER_PROVENANCE_SECRET = process.env.PULSE_PROVENANCE_SECRET;\nif (!SERVER_PROVENANCE_SECRET) {\n  throw new Error('FATAL ERROR: PULSE_PROVENANCE_SECRET environment variable is missing.');\n}",
  ""
);

// Add a helper function
const helper = `
function getProvenanceSecret() {
  const secret = process.env.PULSE_PROVENANCE_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('PULSE_PROVENANCE_SECRET environment variable is missing. Please configure it in the application settings.');
  }
  return secret;
}
`;

content = content.replace("async function startServer() {", helper + "\nasync function startServer() {");

// Replace SERVER_PROVENANCE_SECRET usages with getProvenanceSecret()
content = content.replace(/crypto\.createHmac\('sha256', SERVER_PROVENANCE_SECRET\)/g, "crypto.createHmac('sha256', getProvenanceSecret())");

fs.writeFileSync('server.ts', content);
