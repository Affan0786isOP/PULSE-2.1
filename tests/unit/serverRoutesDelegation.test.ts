import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import * as http from 'http';
import type * as net from 'net';
import { registerResearchRoutes } from '../../server/routes/researchRoutes';
import { registerLeaderboardRoutes } from '../../server/routes/leaderboardRoutes';
import type { ISessionService } from '../../server/services/interfaces/ISessionService';
import type { IPersonalBestService } from '../../server/services/interfaces/IPersonalBestService';
import type { IResearchService } from '../../server/services/interfaces/IResearchService';
import type { ILeaderboardService } from '../../server/services/interfaces/ILeaderboardService';

vi.mock('../../server/middleware/auth', () => ({
  verifyFirebaseUserToken: async () => ({ uid: 'user-delegation-1' })
}));

function makeRequest(server: http.Server, method: string, pathUrl: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as net.AddressInfo;
    const req = http.request({
      host: '127.0.0.1',
      port: addr.port,
      method,
      path: pathUrl,
      headers: { 'content-type': 'application/json' }
    }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode || 500, body: { raw } });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Server Route Delegation Tests', () => {
  it('routes correctly delegate HTTP requests to injected service ports', async () => {
    const mockSessionService: ISessionService = {
      startSession: vi.fn(async () => ({
        sessionId: 'delegated-sess-1',
        expiresAt: 1700000900000,
        assessmentType: 'visual-reaction'
      })),
      getAndValidateSession: vi.fn(async () => ({ valid: true }))
    };

    const mockPbService: IPersonalBestService = {
      getPersonalBest: vi.fn(async () => 199.5)
    };

    const mockResearchService: IResearchService = {
      submitResearch: vi.fn(async () => ({
        docId: 'doc-del-1',
        sessionId: 'delegated-sess-1',
        completedAtTimestamp: 1700000000000,
        completedAtMonth: '2026-09',
        provenanceToken: 'tok',
        trialsDigest: 'dig',
        derivedMetrics: {},
        scoreMetric: 199.5,
        isNewPersonalBest: true,
        previousPersonalBest: null,
        personalBest: 199.5
      })),
      getDataset: vi.fn(async () => ({
        records: [],
        count: 0,
        hasMore: false,
        nextCursor: null
      })),
      getDatasetSummary: vi.fn(async () => ({
        totalRecords: 10,
        totalTrials: 100,
        counts: { 'visual-reaction': 10 }
      }))
    };

    const mockLeaderboardService: ILeaderboardService = {
      submitLeaderboard: vi.fn(async () => ({
        docId: 'lb-del-1',
        scoreMetric: 200,
        provenanceToken: 'tok',
        trialsDigest: 'dig',
        derivedMetrics: {}
      })),
      getPublicLeaderboard: vi.fn(async () => [])
    };

    const app = express();
    app.use(express.json());

    registerResearchRoutes(app, {
      sessionService: mockSessionService,
      personalBestService: mockPbService,
      researchService: mockResearchService
    });
    registerLeaderboardRoutes(app, {
      leaderboardService: mockLeaderboardService
    });

    const server = await new Promise<http.Server>(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      // 1. Session start delegates to sessionService
      const startRes = await makeRequest(server, 'POST', '/api/research/session/start', {
        assessmentType: 'visual-reaction',
        ageGroup: 'Young adults (18–25)'
      });
      expect(startRes.status).toBe(200);
      expect(mockSessionService.startSession).toHaveBeenCalledTimes(1);

      // 2. Personal best delegates to pbService
      const pbRes = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
      expect(pbRes.status).toBe(200);
      expect(pbRes.body['personalBest']).toBe(199.5);
      expect(mockPbService.getPersonalBest).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
