import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Force fixed provenance secret for determinism
process.env.PULSE_PROVENANCE_SECRET = 'unit-test-secret';

const VALID_AGE_GROUP = 'Young adults (18–25)';

interface MockDoc {
  id: string;
  data: Record<string, any>;
}

class MockFirestore {
  collections: Map<string, Map<string, Record<string, any>>> = new Map();

  getCollection(name: string): Map<string, Record<string, any>> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string) {
    const self = this;
    const colMap = this.getCollection(name);

    return {
      doc(id: string) {
        return {
          id,
          async get() {
            const data = colMap.get(id);
            return {
              id,
              exists: !!data,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
            };
          },
          async set(data: any, options?: { merge?: boolean }) {
            const existing = colMap.get(id) || {};
            const finalData = options?.merge ? { ...existing, ...data } : { ...data };
            colMap.set(id, JSON.parse(JSON.stringify(finalData)));
          },
          async update(data: any) {
            const existing = colMap.get(id);
            if (!existing) throw new Error('NOT_FOUND');
            colMap.set(id, { ...existing, ...JSON.parse(JSON.stringify(data)) });
          },
          async delete() {
            colMap.delete(id);
          }
        };
      },
      async add(data: any) {
        const id = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        colMap.set(id, JSON.parse(JSON.stringify(data)));
        return { id };
      },
      where(field: string, op: string, val: any) {
        return this._buildQuery([{ field, op, val }]);
      },
      orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
        return this._buildQuery([], [{ field, dir }]);
      },
      limit(n: number) {
        return this._buildQuery([], [], n);
      },
      count() {
        return {
          async get() {
            return { data: () => ({ count: colMap.size }) };
          }
        };
      },
      _buildQuery(filters: { field: string; op: string; val: any }[] = [], orders: { field: string; dir: 'asc' | 'desc' }[] = [], limitCount?: number, startAfterVal?: any) {
        const queryObj = {
          where(f: string, o: string, v: any) {
            return self.collection(name)._buildQuery([...filters, { field: f, op: o, val: v }], orders, limitCount, startAfterVal);
          },
          orderBy(f: string, d: 'asc' | 'desc' = 'asc') {
            return self.collection(name)._buildQuery(filters, [...orders, { field: f, dir: d }], limitCount, startAfterVal);
          },
          startAfter(cursor: any) {
            return self.collection(name)._buildQuery(filters, orders, limitCount, cursor);
          },
          limit(l: number) {
            return self.collection(name)._buildQuery(filters, orders, l, startAfterVal);
          },
          count() {
            return {
              async get() {
                const snap = await queryObj.get();
                return { data: () => ({ count: snap.docs.length }) };
              }
            };
          },
          async get() {
            let docs: MockDoc[] = [];
            for (const [id, data] of colMap.entries()) {
              docs.push({ id, data });
            }
            for (const filter of filters) {
              if (filter.op === '==') {
                docs = docs.filter(d => d.data[filter.field] === filter.val);
              } else if (filter.op === 'in') {
                docs = docs.filter(d => Array.isArray(filter.val) && filter.val.includes(d.data[filter.field]));
              }
            }
            if (orders.length > 0) {
              docs.sort((a, b) => {
                for (const ord of orders) {
                  const valA = ord.field === '__name__' ? a.id : a.data[ord.field];
                  const valB = ord.field === '__name__' ? b.id : b.data[ord.field];
                  if (valA !== valB) {
                    if (valA === undefined) return 1;
                    if (valB === undefined) return -1;
                    const res = valA > valB ? 1 : -1;
                    return ord.dir === 'desc' ? -res : res;
                  }
                }
                return 0;
              });
            }
            if (startAfterVal) {
              const idx = docs.findIndex(d => d.id === startAfterVal);
              if (idx >= 0) {
                docs = docs.slice(idx + 1);
              }
            }
            if (typeof limitCount === 'number') {
              docs = docs.slice(0, limitCount);
            }
            return {
              docs: docs.map(d => ({
                id: d.id,
                data: () => JSON.parse(JSON.stringify(d.data)),
              })),
            };
          }
        };
        return queryObj;
      }
    };
  }

  async runTransaction(updateFunction: (tx: any) => Promise<any>) {
    const tx = {
      async get(docRef: any) {
        return docRef.get();
      },
      set(docRef: any, data: any, options?: any) {
        return docRef.set(data, options);
      },
      update(docRef: any, data: any) {
        return docRef.update(data);
      },
      delete(docRef: any) {
        return docRef.delete();
      }
    };
    return updateFunction(tx);
  }
}

// Global active mock db pointer
let activeMockDb: MockFirestore | null = new MockFirestore();

vi.mock('../../server/config/firebaseAdmin', () => {
  return {
    getAdminDb: () => activeMockDb,
    getAdminDiagnosticMessage: () => 'Mock DB unavailable diagnostic',
    safeLogWarning: (_msg: string, _err: any) => {},
    initializeAdminApp: () => {},
  };
});

// Mock Auth
let activeAuthUser: { uid: string; email?: string } | null = { uid: 'user-default-123', email: 'test@example.com' };
let activeAdminAuthorized = true;

vi.mock('../../server/middleware/auth', () => {
  return {
    verifyFirebaseUserToken: async () => activeAuthUser,
    verifyAdminSession: () => activeAdminAuthorized,
    getAdminPasscode: () => 'pulse-admin-2026-master-key',
    createAdminSessionToken: () => ({ token: 'mock-admin-token:1700000000000:nonce:sig', expiresAt: 1700000000000 + 28800000 }),
  };
});

import { createServerContainer } from '../../server/container';
import { registerResearchRoutes } from '../../server/routes/researchRoutes';
import { registerLeaderboardRoutes } from '../../server/routes/leaderboardRoutes';
import { registerAdminRoutes } from '../../server/routes/adminRoutes';

function makeRequest(server: http.Server, method: string, pathUrl: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const req = http.request({
      host: '127.0.0.1',
      port: addr.port,
      method,
      path: pathUrl,
      headers: {
        'content-type': 'application/json',
        ...(headers || {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({
          status: res.statusCode || 500,
          headers: res.headers,
          body: parsed,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('Record Golden Baseline', () => {
  let app: express.Express;
  let server: http.Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const container = createServerContainer();
    registerResearchRoutes(app, { sessionService: container.sessionService, personalBestService: container.personalBestService, researchService: container.researchService });
    registerLeaderboardRoutes(app, { leaderboardService: container.leaderboardService });
    registerAdminRoutes(app, { adminService: container.adminService });

    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('captures golden baseline across all routes and branches', async () => {
    const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'goldenBaseline');
    const httpResponsesPath = path.join(fixturesDir, 'httpResponses.json');
    const sideEffectsPath = path.join(fixturesDir, 'sideEffects.json');

    if (fs.existsSync(httpResponsesPath) && fs.existsSync(sideEffectsPath) && process.env.RE_RECORD_BASELINE !== 'true') {
      expect(fs.existsSync(httpResponsesPath)).toBe(true);
      expect(fs.existsSync(sideEffectsPath)).toBe(true);
      return;
    }

    fs.mkdirSync(fixturesDir, { recursive: true });

    const capturedResponses: Record<string, any> = {};
    const capturedSideEffects: Record<string, any> = {};

    // 1. POST /api/research/session/start
    // 1.1 No Auth
    activeAuthUser = null;
    let res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: VALID_AGE_GROUP });
    capturedResponses['POST /api/research/session/start [no_auth]'] = { status: res.status, body: res.body };

    // 1.2 Invalid Assessment Type
    activeAuthUser = { uid: 'user-1' };
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'invalid-assessment', ageGroup: VALID_AGE_GROUP });
    capturedResponses['POST /api/research/session/start [invalid_type]'] = { status: res.status, body: res.body };

    // 1.3 Invalid Age Group
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: 'invalid-age' });
    capturedResponses['POST /api/research/session/start [invalid_age]'] = { status: res.status, body: res.body };

    // 1.4 DB Unavailable
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: VALID_AGE_GROUP });
    capturedResponses['POST /api/research/session/start [db_null]'] = { status: res.status, body: res.body };

    // 1.5 Valid Success
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: VALID_AGE_GROUP });
    capturedResponses['POST /api/research/session/start [success]'] = {
      status: res.status,
      body: {
        success: res.body.success,
        hasSessionId: typeof res.body.sessionId === 'string',
        hasExpiresAt: typeof res.body.expiresAt === 'number',
        assessmentType: res.body.assessmentType,
      }
    };
    capturedSideEffects['POST /api/research/session/start [success]'] = {
      collection: 'experimentSessions',
      docCount: activeMockDb.getCollection('experimentSessions').size,
      sampleDocKeys: Object.keys(Array.from(activeMockDb.getCollection('experimentSessions').values())[0] || {}).sort(),
    };

    // 2. GET /api/personal-best
    // 2.1 No Auth
    activeAuthUser = null;
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    capturedResponses['GET /api/personal-best [no_auth]'] = { status: res.status, body: res.body };

    // 2.2 Missing Type
    activeAuthUser = { uid: 'user-1' };
    res = await makeRequest(server, 'GET', '/api/personal-best');
    capturedResponses['GET /api/personal-best [missing_type]'] = { status: res.status, body: res.body };

    // 2.3 DB Null
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    capturedResponses['GET /api/personal-best [db_null]'] = { status: res.status, body: res.body };

    // 2.4 Valid - None Found
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    capturedResponses['GET /api/personal-best [valid_null]'] = { status: res.status, body: res.body };

    // 2.5 Valid - Found Existing
    activeMockDb.getCollection('experimentSessions').set('sess-old-pb', {
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      consumed: true,
      scoreMetric: 215.5
    });
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    capturedResponses['GET /api/personal-best [valid_found]'] = { status: res.status, body: res.body };

    // 3. POST /api/research/submit
    // 3.1 DB Null (fails in getAndValidateSession -> returns 500 with diagnostic message)
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'sess-123',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    capturedResponses['POST /api/research/submit [db_null]'] = { status: res.status, body: res.body };

    // 3.2 Session Not Found
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'nonexistent-session',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    capturedResponses['POST /api/research/submit [session_not_found]'] = { status: res.status, body: res.body };

    // 3.3 Session UID Mismatch
    activeMockDb.getCollection('experimentSessions').set('sess-other-user', {
      sessionId: 'sess-other-user',
      uid: 'other-user',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
      consumed: false
    });
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'sess-other-user',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    capturedResponses['POST /api/research/submit [uid_mismatch]'] = { status: res.status, body: res.body };

    // 3.4 Session Expired
    activeMockDb.getCollection('experimentSessions').set('sess-expired', {
      sessionId: 'sess-expired',
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      createdAt: Date.now() - 1000000,
      expiresAt: Date.now() - 200000,
      consumed: false
    });
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'sess-expired',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    capturedResponses['POST /api/research/submit [session_expired]'] = { status: res.status, body: res.body };

    // 3.5 Session Already Consumed (Replay with stored data)
    activeMockDb.getCollection('experimentSessions').set('sess-consumed-replay', {
      sessionId: 'sess-consumed-replay',
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      createdAt: Date.now() - 100000,
      expiresAt: Date.now() + 600000,
      consumed: true,
      consumedAt: 1700000001000,
      researchDocId: 'doc-replay-1',
      provenanceToken: 'prov-token-replay',
      trialsDigest: 'digest-replay',
      derivedMetrics: { averageReactionTime: 220 },
      scoreMetric: 220,
      isNewPersonalBest: true,
      personalBest: 220
    });
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'sess-consumed-replay',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    capturedResponses['POST /api/research/submit [consumed_replay]'] = { status: res.status, body: res.body };

    // 4. GET /api/research/dataset
    // 4.1 DB Null -> 503
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/research/dataset');
    capturedResponses['GET /api/research/dataset [db_null]'] = { status: res.status, body: res.body };

    // 4.2 Empty Dataset
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'GET', '/api/research/dataset');
    capturedResponses['GET /api/research/dataset [empty]'] = { status: res.status, body: res.body };

    // 5. GET /api/research/dataset/summary
    // 5.1 DB Null -> 503
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/research/dataset/summary');
    capturedResponses['GET /api/research/dataset/summary [db_null]'] = { status: res.status, body: res.body };

    // 5.2 Empty Summary
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'GET', '/api/research/dataset/summary');
    capturedResponses['GET /api/research/dataset/summary [empty]'] = { status: res.status, body: res.body };

    // 6. POST /api/leaderboard/submit
    // 6.1 DB Null -> Returns 404 because initial session read is skipped
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/leaderboard/submit', {
      sessionId: 'sess-lb-1',
      displayName: 'Player One',
      assessmentType: 'visual-reaction',
      trials: []
    });
    capturedResponses['POST /api/leaderboard/submit [db_null]'] = { status: res.status, body: res.body };

    // 6.2 Session not consumed
    activeMockDb = new MockFirestore();
    activeMockDb.getCollection('experimentSessions').set('sess-unconsumed', {
      sessionId: 'sess-unconsumed',
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
      consumed: false
    });
    res = await makeRequest(server, 'POST', '/api/leaderboard/submit', {
      sessionId: 'sess-unconsumed',
      displayName: 'Player One',
      assessmentType: 'visual-reaction',
      trials: []
    });
    capturedResponses['POST /api/leaderboard/submit [session_unconsumed]'] = { status: res.status, body: res.body };

    // 7. GET /api/leaderboard
    // 7.1 DB Null -> Graceful 200 with empty entries
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/leaderboard');
    capturedResponses['GET /api/leaderboard [db_null]'] = { status: res.status, body: res.body };

    // 7.2 Empty Leaderboard
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'GET', '/api/leaderboard');
    capturedResponses['GET /api/leaderboard [empty]'] = { status: res.status, body: res.body };

    // 8. Admin Routes
    // 8.1 POST /api/admin/audit-log [unauthorized]
    activeAdminAuthorized = false;
    res = await makeRequest(server, 'POST', '/api/admin/audit-log', { action: 'TEST', target: 'TARGET' });
    capturedResponses['POST /api/admin/audit-log [unauthorized]'] = { status: res.status, body: res.body };

    // 8.2 POST /api/admin/audit-log [db_null]
    activeAdminAuthorized = true;
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/admin/audit-log', { action: 'TEST', target: 'TARGET' });
    capturedResponses['POST /api/admin/audit-log [db_null]'] = { status: res.status, body: res.body };

    // 8.3 POST /api/admin/audit-log [success]
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'POST', '/api/admin/audit-log', { action: 'TEST_ACTION', target: 'TARGET_1' });
    capturedResponses['POST /api/admin/audit-log [success]'] = {
      status: res.status,
      body: {
        success: res.body.success,
        hasLogId: typeof res.body.log?.id === 'string',
        action: res.body.log?.action,
        target: res.body.log?.target,
      }
    };

    // 8.4 POST /api/admin/leaderboard/hide [db_null] -> returns 200
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/admin/leaderboard/hide', { id: 'entry-123' });
    capturedResponses['POST /api/admin/leaderboard/hide [db_null]'] = { status: res.status, body: res.body };

    // 8.5 POST /api/admin/leaderboard/hide [missing_doc] -> returns 200, still writes audit log
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'POST', '/api/admin/leaderboard/hide', { id: 'entry-missing' });
    capturedResponses['POST /api/admin/leaderboard/hide [missing_doc]'] = { status: res.status, body: res.body };
    capturedSideEffects['POST /api/admin/leaderboard/hide [missing_doc]'] = {
      adminAuditLogsCount: activeMockDb.getCollection('adminAuditLogs').size,
    };

    // 8.6 POST /api/admin/leaderboard/delete [db_null] -> returns 200
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/admin/leaderboard/delete', { id: 'entry-123' });
    capturedResponses['POST /api/admin/leaderboard/delete [db_null]'] = { status: res.status, body: res.body };

    // 8.7 GET /api/admin/audit-logs [db_null] -> 503
    res = await makeRequest(server, 'GET', '/api/admin/audit-logs');
    capturedResponses['GET /api/admin/audit-logs [db_null]'] = { status: res.status, body: res.body };

    // 8.8 GET /api/admin/leaderboard/all [db_null] -> 503
    res = await makeRequest(server, 'GET', '/api/admin/leaderboard/all');
    capturedResponses['GET /api/admin/leaderboard/all [db_null]'] = { status: res.status, body: res.body };

    // Write golden baseline fixtures
    fs.writeFileSync(httpResponsesPath, JSON.stringify(capturedResponses, null, 2), 'utf-8');
    fs.writeFileSync(sideEffectsPath, JSON.stringify(capturedSideEffects, null, 2), 'utf-8');
    console.log(`Successfully recorded golden baseline to ${fixturesDir}`);
  });
});
