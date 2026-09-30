import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import * as http from 'http';
import type * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import type { Firestore } from 'firebase-admin/firestore';

process.env.PULSE_PROVENANCE_SECRET = 'unit-test-secret';
const VALID_AGE_GROUP = 'Young adults (18–25)';

interface MockDoc {
  id: string;
  data: Record<string, unknown>;
}

class MockFirestore {
  collections: Map<string, Map<string, Record<string, unknown>>> = new Map();

  getCollection(name: string): Map<string, Record<string, unknown>> {
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
          async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
            const existing = colMap.get(id) || {};
            const finalData = options?.merge ? { ...existing, ...data } : { ...data };
            colMap.set(id, JSON.parse(JSON.stringify(finalData)));
          },
          async update(data: Record<string, unknown>) {
            const existing = colMap.get(id);
            if (!existing) throw new Error('NOT_FOUND');
            colMap.set(id, { ...existing, ...JSON.parse(JSON.stringify(data)) });
          },
          async delete() {
            colMap.delete(id);
          }
        };
      },
      async add(data: Record<string, unknown>) {
        const id = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        colMap.set(id, JSON.parse(JSON.stringify(data)));
        return { id };
      },
      where(field: string, op: string, val: unknown) {
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
      _buildQuery(filters: { field: string; op: string; val: unknown }[] = [], orders: { field: string; dir: 'asc' | 'desc' }[] = [], limitCount?: number, startAfterVal?: unknown) {
        const queryObj = {
          where(f: string, o: string, v: unknown) {
            return self.collection(name)._buildQuery([...filters, { field: f, op: o, val: v }], orders, limitCount, startAfterVal);
          },
          orderBy(f: string, d: 'asc' | 'desc' = 'asc') {
            return self.collection(name)._buildQuery(filters, [...orders, { field: f, dir: d }], limitCount, startAfterVal);
          },
          startAfter(cursor: unknown) {
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
            if (typeof startAfterVal === 'string') {
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

  async runTransaction<T>(updateFunction: (tx: {
    get: (docRef: { get: () => Promise<unknown> }) => Promise<unknown>;
    set: (docRef: { set: (d: Record<string, unknown>, opt?: { merge?: boolean }) => Promise<void> }, data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
    update: (docRef: { update: (d: Record<string, unknown>) => Promise<void> }, data: Record<string, unknown>) => Promise<void>;
    delete: (docRef: { delete: () => Promise<void> }) => Promise<void>;
  }) => Promise<T>): Promise<T> {
    const tx = {
      async get(docRef: { get: () => Promise<unknown> }) {
        return docRef.get();
      },
      async set(docRef: { set: (d: Record<string, unknown>, opt?: { merge?: boolean }) => Promise<void> }, data: Record<string, unknown>, options?: { merge?: boolean }) {
        return docRef.set(data, options);
      },
      async update(docRef: { update: (d: Record<string, unknown>) => Promise<void> }, data: Record<string, unknown>) {
        return docRef.update(data);
      },
      async delete(docRef: { delete: () => Promise<void> }) {
        return docRef.delete();
      }
    };
    return updateFunction(tx);
  }
}

let activeMockDb: MockFirestore | null = new MockFirestore();

vi.mock('../../server/config/firebaseAdmin', () => ({
  getAdminDb: () => {
    const raw: unknown = activeMockDb;
    return raw as Firestore | null;
  },
  getAdminDiagnosticMessage: () => 'Mock DB unavailable diagnostic',
  safeLogWarning: () => {},
  initializeAdminApp: () => {}
}));

let activeAuthUser: { uid: string; email?: string } | null = { uid: 'user-default-123', email: 'test@example.com' };
let activeAdminAuthorized = true;

vi.mock('../../server/middleware/auth', () => ({
  verifyFirebaseUserToken: async () => activeAuthUser,
  verifyAdminSession: () => activeAdminAuthorized,
  getAdminPasscode: () => 'pulse-admin-2026-master-key',
  createAdminSessionToken: () => ({ token: 'mock-admin-token:1700000000000:nonce:sig', expiresAt: 1700000000000 + 28800000 })
}));

import { createServerContainer } from '../../server/container';
import { registerResearchRoutes } from '../../server/routes/researchRoutes';
import { registerLeaderboardRoutes } from '../../server/routes/leaderboardRoutes';
import { registerAdminRoutes } from '../../server/routes/adminRoutes';

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

describe('Server Route Parity Suite (against Golden Baseline)', () => {
  let app: express.Express;
  let server: http.Server;
  let goldenResponses: Record<string, { status: number; body: unknown }>;

  beforeAll(async () => {
    const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'goldenBaseline');
    const httpResponsesPath = path.join(fixturesDir, 'httpResponses.json');
    if (!fs.existsSync(httpResponsesPath)) {
      throw new Error(`CRITICAL: Golden baseline fixture missing at ${httpResponsesPath}. Cannot run parity verification.`);
    }
    goldenResponses = JSON.parse(fs.readFileSync(httpResponsesPath, 'utf-8'));

    app = express();
    app.use(express.json());

    // Instantiate with DI container
    const container = createServerContainer(() => {
      const raw: unknown = activeMockDb;
      return raw as Firestore | null;
    });

    registerResearchRoutes(app, {
      sessionService: container.sessionService,
      personalBestService: container.personalBestService,
      researchService: container.researchService
    });
    registerLeaderboardRoutes(app, {
      leaderboardService: container.leaderboardService
    });
    registerAdminRoutes(app, {
      adminService: container.adminService
    });

    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('verifies exact parity against golden baseline for all scenarios', async () => {
    // 1. POST /api/research/session/start
    // 1.1 No Auth
    activeAuthUser = null;
    let res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: VALID_AGE_GROUP });
    expect(res.status).toBe(goldenResponses['POST /api/research/session/start [no_auth]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/session/start [no_auth]'].body);

    // 1.2 Invalid Type
    activeAuthUser = { uid: 'user-1' };
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'invalid-assessment', ageGroup: VALID_AGE_GROUP });
    expect(res.status).toBe(goldenResponses['POST /api/research/session/start [invalid_type]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/session/start [invalid_type]'].body);

    // 1.3 Invalid Age
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: 'invalid-age' });
    expect(res.status).toBe(goldenResponses['POST /api/research/session/start [invalid_age]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/session/start [invalid_age]'].body);

    // 1.4 DB Null
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: VALID_AGE_GROUP });
    expect(res.status).toBe(goldenResponses['POST /api/research/session/start [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/session/start [db_null]'].body);

    // 1.5 Valid Success
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'POST', '/api/research/session/start', { assessmentType: 'visual-reaction', ageGroup: VALID_AGE_GROUP });
    expect(res.status).toBe(goldenResponses['POST /api/research/session/start [success]'].status);
    const bodyMap = res.body;
    const goldenBody = goldenResponses['POST /api/research/session/start [success]'].body as Record<string, unknown>;
    expect(bodyMap['success']).toBe(goldenBody['success']);
    expect(typeof bodyMap['sessionId'] === 'string').toBe(goldenBody['hasSessionId']);
    expect(typeof bodyMap['expiresAt'] === 'number').toBe(goldenBody['hasExpiresAt']);
    expect(bodyMap['assessmentType']).toBe(goldenBody['assessmentType']);

    // 2. GET /api/personal-best
    // 2.1 No Auth
    activeAuthUser = null;
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    expect(res.status).toBe(goldenResponses['GET /api/personal-best [no_auth]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/personal-best [no_auth]'].body);

    // 2.2 Missing Type
    activeAuthUser = { uid: 'user-1' };
    res = await makeRequest(server, 'GET', '/api/personal-best');
    expect(res.status).toBe(goldenResponses['GET /api/personal-best [missing_type]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/personal-best [missing_type]'].body);

    // 2.3 DB Null
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    expect(res.status).toBe(goldenResponses['GET /api/personal-best [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/personal-best [db_null]'].body);

    // 2.4 Valid Null
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    expect(res.status).toBe(goldenResponses['GET /api/personal-best [valid_null]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/personal-best [valid_null]'].body);

    // 2.5 Valid Found
    activeMockDb.getCollection('experimentSessions').set('sess-old-pb', {
      uid: 'user-1',
      assessmentType: 'visual-reaction',
      consumed: true,
      scoreMetric: 215.5
    });
    res = await makeRequest(server, 'GET', '/api/personal-best?assessmentType=visual-reaction');
    expect(res.status).toBe(goldenResponses['GET /api/personal-best [valid_found]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/personal-best [valid_found]'].body);

    // 3. POST /api/research/submit
    // 3.1 DB Null
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'sess-123',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    expect(res.status).toBe(goldenResponses['POST /api/research/submit [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/submit [db_null]'].body);

    // 3.2 Session Not Found
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'POST', '/api/research/submit', {
      sessionId: 'nonexistent-session',
      assessmentType: 'visual-reaction',
      ageGroup: VALID_AGE_GROUP,
      trials: []
    });
    expect(res.status).toBe(goldenResponses['POST /api/research/submit [session_not_found]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/submit [session_not_found]'].body);

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
    expect(res.status).toBe(goldenResponses['POST /api/research/submit [uid_mismatch]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/submit [uid_mismatch]'].body);

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
    expect(res.status).toBe(goldenResponses['POST /api/research/submit [session_expired]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/research/submit [session_expired]'].body);

    // 4. GET /api/research/dataset
    // 4.1 DB Null
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/research/dataset');
    expect(res.status).toBe(goldenResponses['GET /api/research/dataset [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/research/dataset [db_null]'].body);

    // 4.2 Empty
    activeMockDb = new MockFirestore();
    res = await makeRequest(server, 'GET', '/api/research/dataset');
    expect(res.status).toBe(goldenResponses['GET /api/research/dataset [empty]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/research/dataset [empty]'].body);

    // 5. POST /api/leaderboard/submit
    // 5.1 DB Null -> 404
    activeMockDb = null;
    res = await makeRequest(server, 'POST', '/api/leaderboard/submit', {
      sessionId: 'sess-lb-1',
      displayName: 'Player One',
      assessmentType: 'visual-reaction',
      trials: []
    });
    expect(res.status).toBe(goldenResponses['POST /api/leaderboard/submit [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/leaderboard/submit [db_null]'].body);

    // 6. GET /api/leaderboard
    // 6.1 DB Null -> 200 []
    activeMockDb = null;
    res = await makeRequest(server, 'GET', '/api/leaderboard');
    expect(res.status).toBe(goldenResponses['GET /api/leaderboard [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/leaderboard [db_null]'].body);

    // 7. Admin Moderation
    // 7.1 Hide DB Null -> 200
    res = await makeRequest(server, 'POST', '/api/admin/leaderboard/hide', { id: 'entry-123' });
    expect(res.status).toBe(goldenResponses['POST /api/admin/leaderboard/hide [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/admin/leaderboard/hide [db_null]'].body);

    // 7.2 Delete DB Null -> 200
    res = await makeRequest(server, 'POST', '/api/admin/leaderboard/delete', { id: 'entry-123' });
    expect(res.status).toBe(goldenResponses['POST /api/admin/leaderboard/delete [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['POST /api/admin/leaderboard/delete [db_null]'].body);

    // 7.3 Audit logs DB Null -> 503
    res = await makeRequest(server, 'GET', '/api/admin/audit-logs');
    expect(res.status).toBe(goldenResponses['GET /api/admin/audit-logs [db_null]'].status);
    expect(res.body).toEqual(goldenResponses['GET /api/admin/audit-logs [db_null]'].body);
  });
});
