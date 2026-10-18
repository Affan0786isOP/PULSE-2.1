import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import * as http from 'http';
import type * as net from 'net';
import { registerAdminRoutes } from '../../server/routes/adminRoutes';
import type { IAdminService } from '../../server/services/interfaces/IAdminService';
import { AppError } from '../../server/models/replayContracts';

function makeRequest(
  server: http.Server,
  method: string,
  pathUrl: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as net.AddressInfo;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        method,
        path: pathUrl,
        headers: {
          'content-type': 'application/json',
          ...headers
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              body: JSON.parse(raw)
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              headers: res.headers,
              body: { raw }
            });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Admin Express Routes Unit Tests', () => {
  let app: express.Express;
  let server: http.Server;
  let mockAdminService: IAdminService;
  let mockVerifySession: ReturnType<typeof vi.fn>;
  let mockRevokeToken: ReturnType<typeof vi.fn>;
  let mockValidatePass: ReturnType<typeof vi.fn>;
  let mockCreateToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    mockAdminService = {
      login: vi.fn(),
      logout: vi.fn(),
      getLeaderboardPage: vi.fn(async () => ({
        success: true,
        entries: [
          {
            id: 'row-1',
            displayName: 'AliceSpeed',
            assessmentType: 'visual-reaction',
            scoreMetric: 205.2,
            ageGroup: 'Young adults (18–25)',
            createdAt: 1700000000000,
            hidden: false,
            publicEntry: true
          }
        ],
        nextCursor: null,
        hasMore: false
      })),
      editLeaderboardAlias: vi.fn(async input => ({
        success: true,
        entry: {
          id: input.id,
          displayName: input.displayName,
          assessmentType: 'visual-reaction',
          scoreMetric: 205.2,
          ageGroup: 'Young adults (18–25)',
          createdAt: 1700000000000,
          hidden: false,
          publicEntry: true
        }
      })),
      hideLeaderboardEntry: vi.fn(async id => ({
        success: true,
        found: true
      })),
      unhideLeaderboardEntry: vi.fn(async id => ({
        success: true,
        found: true,
        notBest: false
      })),
      deleteLeaderboardEntry: vi.fn(async id => ({
        success: true,
        found: true
      }))
    };

    mockVerifySession = vi.fn(async req => {
      const token = req.headers['x-admin-token'];
      if (token === 'valid-admin-token') {
        return { authorized: true };
      }
      return { authorized: false, errorStatus: 401, errorMsg: 'Unauthorized token' };
    });

    mockRevokeToken = vi.fn(async () => true);
    mockValidatePass = vi.fn((code: string) => code === '180611');
    mockCreateToken = vi.fn(() => 'generated-admin-token-123');

    registerAdminRoutes(app, {
      adminService: mockAdminService as any,
      verifySession: mockVerifySession as any,
      revokeToken: mockRevokeToken as any,
      validatePass: mockValidatePass as any,
      createToken: mockCreateToken as any
    });

    server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('Headers & Cache Controls', () => {
    it('sets Cache-Control no-store and no-cache on all admin responses', async () => {
      const res = await makeRequest(
        server,
        'GET',
        '/api/admin/leaderboard/all',
        { 'x-admin-token': 'valid-admin-token' }
      );
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['pragma']).toBe('no-cache');
      expect(res.headers['surrogate-control']).toBe('no-store');
    });
  });

  describe('POST /api/admin/login', () => {
    it('returns token on valid passcode', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/login', {}, { passcode: '180611' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('generated-admin-token-123');
    });

    it('rejects invalid passcode with 401', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/login', {}, { passcode: 'wrong-pass' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects missing passcode with 400', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/login', {}, {});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/logout', () => {
    it('rejects missing token with 400', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/logout', {});
      expect(res.status).toBe(400);
    });

    it('rejects malformed token with 401', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/logout', { 'x-admin-token': 'bad-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('Protected endpoints authentication guard', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/leaderboard/all');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/leaderboard/all', () => {
    it('passes pagination and filter options to service', async () => {
      const res = await makeRequest(
        server,
        'GET',
        '/api/admin/leaderboard/all?limit=50&cursor=c1&assessmentType=visual-reaction&prefix=ali',
        { 'x-admin-token': 'valid-admin-token' }
      );
      expect(res.status).toBe(200);
      expect(mockAdminService.getLeaderboardPage).toHaveBeenCalledWith({
        limit: 50,
        cursor: 'c1',
        assessmentType: 'visual-reaction',
        prefix: 'ali'
      });
      expect(res.body.entries).toHaveLength(1);
    });

    it('rejects invalid limit parameter with 400', async () => {
      const res = await makeRequest(
        server,
        'GET',
        '/api/admin/leaderboard/all?limit=999',
        { 'x-admin-token': 'valid-admin-token' }
      );
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/leaderboard/edit-alias', () => {
    it('updates alias and returns entry DTO', async () => {
      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/edit-alias',
        { 'x-admin-token': 'valid-admin-token' },
        { id: 'row-1', displayName: 'ValidNewName', reason: 'Fixed typo' }
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockAdminService.editLeaderboardAlias).toHaveBeenCalledWith({
        id: 'row-1',
        displayName: 'ValidNewName',
        reason: 'Fixed typo'
      });
    });

    it('rejects missing id with 400', async () => {
      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/edit-alias',
        { 'x-admin-token': 'valid-admin-token' },
        { displayName: 'ValidNewName' }
      );
      expect(res.status).toBe(400);
    });

    it('maps AppError status codes like 409 and 422 correctly', async () => {
      vi.mocked(mockAdminService.editLeaderboardAlias).mockRejectedValueOnce(
        new AppError('Provenance mismatch', 422)
      );

      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/edit-alias',
        { 'x-admin-token': 'valid-admin-token' },
        { id: 'row-1', displayName: 'ValidNewName' }
      );
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Provenance mismatch');
    });
  });

  describe('POST /api/admin/leaderboard/hide & unhide & delete', () => {
    it('hide endpoint calls service and returns status', async () => {
      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/hide',
        { 'x-admin-token': 'valid-admin-token' },
        { id: 'row-1', reason: 'Spam' }
      );
      expect(res.status).toBe(200);
      expect(mockAdminService.hideLeaderboardEntry).toHaveBeenCalledWith('row-1', 'Spam');
    });

    it('unhide endpoint calls service and returns status', async () => {
      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/unhide',
        { 'x-admin-token': 'valid-admin-token' },
        { id: 'row-1', reason: 'Approved' }
      );
      expect(res.status).toBe(200);
      expect(mockAdminService.unhideLeaderboardEntry).toHaveBeenCalledWith('row-1', 'Approved');
    });

    it('delete endpoint calls service and returns status', async () => {
      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/delete',
        { 'x-admin-token': 'valid-admin-token' },
        { id: 'row-1', reason: 'Admin purge' }
      );
      expect(res.status).toBe(200);
      expect(mockAdminService.deleteLeaderboardEntry).toHaveBeenCalledWith('row-1', 'Admin purge');
    });

    it('maps erasure lock 409 error correctly', async () => {
      vi.mocked(mockAdminService.deleteLeaderboardEntry).mockRejectedValueOnce(
        new AppError('Owner account erasure is in progress', 409)
      );

      const res = await makeRequest(
        server,
        'POST',
        '/api/admin/leaderboard/delete',
        { 'x-admin-token': 'valid-admin-token' },
        { id: 'row-1' }
      );
      expect(res.status).toBe(409);
    });
  });
});
