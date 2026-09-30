import 'dotenv/config';
import express from 'express';
import { applySecurityMiddleware } from './middleware/security';
import { applyRateLimits } from './config/rateLimits';
import { applyDeviceRoutingMiddleware } from './middleware/deviceRouting';
import { registerAdminRoutes } from './routes/adminRoutes';
import { registerResearchRoutes } from './routes/researchRoutes';
import { registerLeaderboardRoutes } from './routes/leaderboardRoutes';
import { registerStaticRoutes } from './routes/staticRoutes';
import { createServerContainer } from './container';

export { getAdminDiagnosticMessage } from './config/firebaseAdmin';

export const app = express();

async function startServer() {
  // Trust proxy for Cloud Run and reverse proxies
  app.set('trust proxy', 1);

  applySecurityMiddleware(app);

  // Respect process.env.PORT whenever present, defaulting to 3000
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body parsing for API endpoints
  app.use(express.json({ limit: '1mb' }));

  // Health check endpoint - exempted from rate limiting for Cloud Run probes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  applyRateLimits(app);

  const container = createServerContainer();

  registerAdminRoutes(app, {
    adminService: container.adminService
  });
  registerResearchRoutes(app, {
    sessionService: container.sessionService,
    personalBestService: container.personalBestService,
    researchService: container.researchService
  });
  registerLeaderboardRoutes(app, {
    leaderboardService: container.leaderboardService
  });

  applyDeviceRoutingMiddleware(app);
  await registerStaticRoutes(app);

  // Centralized Global Error Handler (Prevents stack trace leaks to client)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Unhandled Error]:', err instanceof Error ? err.message : String(err));
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'An unexpected internal server error occurred' });
  });

  if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.NOW_REGION) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
    });
  }
}

startServer();
export default app;
