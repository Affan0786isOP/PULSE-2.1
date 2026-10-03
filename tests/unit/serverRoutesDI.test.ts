import { describe, it } from 'vitest';
import express from 'express';
import { registerResearchRoutes } from '../../server/routes/researchRoutes';
import { registerLeaderboardRoutes } from '../../server/routes/leaderboardRoutes';
import { registerAdminRoutes } from '../../server/routes/adminRoutes';

describe('Server Routes DI Enforcement', () => {
  it('enforces mandatory service injection at the type level', () => {
    const app = express();
    
    // @ts-expect-error - Route registration must reject omitted services
    registerResearchRoutes(app);

    // @ts-expect-error - Route registration must reject omitted services
    registerLeaderboardRoutes(app);

    // @ts-expect-error - Route registration must reject omitted services
    registerAdminRoutes(app);

    // The test naturally passes if the @ts-expect-error directives are satisfied,
    // which proves TypeScript rejects the calls without the required service dependencies.
  });
});
