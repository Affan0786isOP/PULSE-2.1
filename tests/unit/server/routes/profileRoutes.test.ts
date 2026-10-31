import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { registerProfileRoutes } from '../../../../server/routes/profileRoutes';
import * as authMiddleware from '../../../../server/middleware/auth';

describe('Profile Routes Integration', () => {
  let app: express.Express;
  let mockService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockService = {
      checkNameAvailability: vi.fn(),
      reserveProfile: vi.fn(),
      getMyProfiles: vi.fn(),
      deleteProfile: vi.fn()
    };

    registerProfileRoutes(app, mockService);
  });

  it('rejects unauthenticated requests to reserve profile with 401', async () => {
    vi.spyOn(authMiddleware, 'verifyFirebaseUserToken').mockResolvedValue(null as any);

    const res = await new Promise<any>((resolve) => {
      const req: any = {
        headers: {},
        body: { displayName: 'Alex', ageGroup: 'Adults (26–40)' }
      };
      const response: any = {
        status: (code: number) => {
          response.statusCode = code;
          return response;
        },
        json: (data: any) => {
          resolve({ status: response.statusCode || 200, body: data });
        }
      };

      // Direct handler test
      const handler = (app as any)._router.stack.find((s: any) => s.route?.path === '/api/profiles/reserve').route.stack[0].handle;
      handler(req, response);
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Authentication required/);
  });

  it('allows checking name availability without authentication', async () => {
    mockService.checkNameAvailability.mockResolvedValue({ available: true, normalizedName: 'apex' });

    const res = await new Promise<any>((resolve) => {
      const req: any = { body: { displayName: 'Apex' } };
      const response: any = {
        status: (code: number) => {
          response.statusCode = code;
          return response;
        },
        json: (data: any) => {
          resolve({ status: response.statusCode || 200, body: data });
        }
      };

      const handler = (app as any)._router.stack.find((s: any) => s.route?.path === '/api/profiles/check-name').route.stack[0].handle;
      handler(req, response);
    });

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.normalizedName).toBe('apex');
  });
});
