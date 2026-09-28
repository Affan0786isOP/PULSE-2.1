// Slim entry point. The Express app is composed in server/index.ts:
//   server/config      Firebase Admin, rate limiters, constants
//   server/middleware  security headers, device routing, auth
//   server/routes      admin, research, leaderboard, static/SPA
//   server/services    provenance (HMAC), sessions, idempotency, leaderboard rules
//   server/engines     server-side trial validation + metric derivation per protocol
import app, { getAdminDiagnosticMessage } from './server/index';

export { app, getAdminDiagnosticMessage };
export default app;
