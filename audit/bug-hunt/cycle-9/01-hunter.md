# PULSE v2.1 — Cycle 9 Adversarial Bug Hunt Report (Distributed Rate Limiting, Session Persistence, Client Protocol Validation, and Notifications)

**Auditor:** Bug Hunter Agent (Cycle 9)  
**Methodology:** Ponytail Senior Dev Audit (/ponytail-audit lens: correctness, concurrency/scale races under load, missing tests for risky logic, security boundaries, and lean bloat/dead code)  
**Threshold Applied:** Frequency (1–10) × Impact (1–10) ≥ 5.

---

## 1. Executive Summary

Cycle 9 evaluated the infrastructure, distributed synchronization, session lifecycle, telemetry notification pipelines, and client validation protocols of the PULSE assessment platform:
1. `server/config/firestoreRateLimitStore.ts`
2. `server/config/rateLimits.ts`
3. `server/repositories/firestore/firestoreSessionRepository.ts`
4. `src/lib/protocolValidators.ts`
5. `mobile/src/lib/protocolValidators.ts`
6. `server/services/telegramNotifierService.ts`

Ten concrete, high-impact defects were discovered. The findings range from a distributed rate-limit fail-open vulnerability under Firestore transaction contention that resets quota counters to 1, unverified client JWT partitioning enabling unauthenticated attackers to bypass route rate limits and burn Firestore daily write quotas, a 100x multiplication error in assessment accuracy reporting 10,000% to Telegram channels, an outbox worker loop defect that prematurely breaks and throttles notifications to a single message per tick, a failure-loop avalanche where un-updated send timestamps flood the Telegram API without delays, mobile PWA bundle pollution where importing desktop About pulls the entire desktop application and test suite into mobile production builds, un-normalized assessment types causing `/api/personal-best` to return `null` for British English queries, unhandled slash characters in session lookup triggering HTTP 500 errors, protocol validator alias omissions rejecting valid dataset entries, and an unbounded in-memory map in the Telegram service leading to memory leaks and event-loop lag.

---

## 2. Quantitative Defect Ranking Matrix

| ID | Category | Target File | Defect Summary | Freq (1–10) | Impact (1–10) | Risk Score (F×I) |
|---|---|---|---|:---:|:---:|:---:|
| **BUG-C9-01** | Security / Concurrency | [rateLimits.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L10-L38) | Unverified client claims partitioning allows unauthenticated DoS floods and burns Firestore write quota | 8 | 8 | **64** |
| **BUG-C9-02** | Architecture / Bundling | [App.tsx](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L30) | Mobile lazy import of desktop About drags entire desktop app and all 9 desktop tests into mobile PWA bundle | 9 | 7 | **63** |
| **BUG-C9-03** | Concurrency / Rate Limiting | [firestoreRateLimitStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L62-L73) | Firestore transaction contention error handler fails open, resetting hit counter to 1 under load | 7 | 8 | **56** |
| **BUG-C9-04** | Telemetry / Data Integrity | [researchRoutes.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159) & [telegramNotifierService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L188-L201) | Flanker & Stroop accuracy is multiplied by 100 twice, reporting 10,000% accuracy in Telegram notifications | 9 | 6 | **54** |
| **BUG-C9-05** | Logic / Data Retrieval | [researchRoutes.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L75-L80) & [personalBestService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/personalBestService.ts#L8-L13) | Un-normalized `assessmentType` in Personal Best API silently returns null for `colour-recognition` | 7 | 7 | **49** |
| **BUG-C9-06** | Concurrency / Performance | [telegramNotifierService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L405-L410) | Premature loop break in outbox worker caps dispatch to 1 msg per 5s tick, stalling notifications | 8 | 6 | **48** |
| **BUG-C9-07** | Resilience / Rate Limiting | [telegramNotifierService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L418-L439) | Stale `lastSendTime` on dispatch error triggers unthrottled rapid-fire request storm against Telegram API | 6 | 7 | **42** |
| **BUG-C9-08** | Memory / Performance | [telegramNotifierService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382) | Unbounded deduplication map causes memory leak and $O(N)$ synchronous main-thread stall on every page view | 6 | 6 | **36** |
| **BUG-C9-09** | Protocol / Validation | [protocolValidators.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L389-L410) | `isValidProtocolObservation` lacks `'colour-recognition'` alias in switch, rejecting valid observations | 6 | 6 | **36** |
| **BUG-C9-10** | Robustness / Input Validation | [sessionService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L58-L72) & [firestoreSessionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts#L13) | Unsanitized forward slashes in `sessionId` crash Firestore document lookup with HTTP 500 instead of 400 | 5 | 5 | **25** |

---

## 3. Deep Dive Defect Analysis & Minimal Surgical Fixes

---

### BUG-C9-01: Unverified Client Claims Partitioning Allows Trivial Rate Limit Bypass & Firestore Quota Depletion

- **File Link:** [rateLimits.ts#L10-L38](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L10-L38)
- **Defect Description:**
  In `server/config/rateLimits.ts`:
  ```ts
  function getUnverifiedUid(req: Request): string | null {
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer\s+/i.test(authorization)) return null;
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    const payload = token.split('.')[1];
    if (!payload) return null;
    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        user_id?: unknown;
      };
      const uid = typeof decoded.user_id === 'string' ? decoded.user_id : null;
      return typeof uid === 'string' && uid.length > 0 && uid.length <= 256 ? uid : null;
    } catch {
      return null;
    }
  }

  function createLimiterKey(namespace: string, useUserIdentity: boolean) {
    return (req: Request): string => {
      const ip = normalizedRequestIp(req);
      const uid = useUserIdentity ? getUnverifiedUid(req) : null;
      const identity = uid ? `uid:${uid}:ip:${ip}` : `ip:${ip}`;
      return `${namespace}:${identity}`;
    };
  }
  ```
  `applyRateLimits(app)` is registered in `server/index.ts` at line 49, which runs **before** any route handler or authentication middleware (`verifyFirebaseUserToken`).
  Because `getUnverifiedUid` trusts the unverified JWT payload supplied by the client, an unauthenticated attacker can forge arbitrary unverified tokens with random `user_id` values (e.g. `Bearer header.<b64 {"user_id": "rand1"}>.sig`, `rand2`, `rand3`).
  This causes two critical vulnerabilities:
  1. **Rate Limit Bypass (CWE-807):** The rate limiters for `/api/research/session` (max: 30), `/api/research/submit` (max: 30), and `/api/leaderboard/submit` (max: 30) generate a new key (`namespace:uid:<rand>:ip:<ip>`) on every request. The attacker completely bypasses the 30-request threshold, flooding the server with thousands of invalid requests that force CPU-expensive RSA/ECDSA token verifications (`getAuth().verifyIdToken()`).
  2. **Firestore Free Quota Depletion / Cost Denial of Service:** In `FirestoreRateLimitStore`, each unique key creates a brand-new counter document in the `_rateLimitCounters` collection in Firestore. By generating 20,000 distinct fake user IDs, an unauthenticated attacker burns through the entire daily free-tier write quota (20,000 writes/day) of the Firebase project, causing database downtime for legitimate users.
- **Frequency:** 8/10. Exploitable with trivial single-line scripts sending forged Bearer headers.
- **Impact:** 8/10. Complete rate-limit bypass on sensitive write routes and resource exhaustion of Firestore write quotas.
- **Surgical Root-Cause Fix:**
  Partition rate limit keys by IP address as the primary outer envelope. If user identity is used, enforce a strict per-IP sub-ceiling or disallow client-controlled arbitrary `user_id` values from avoiding IP rate accounting:
  ```ts
  function createLimiterKey(namespace: string, useUserIdentity: boolean) {
    return (req: Request): string => {
      const ip = normalizedRequestIp(req);
      // Rate limiting before auth must always enforce per-IP boundaries.
      // Unverified client tokens cannot expand quota beyond the base IP envelope.
      return `${namespace}:ip:${ip}`;
    };
  }
  ```

---

### BUG-C9-02: Mobile PWA Lazy Import of Desktop About Drags Entire Desktop App and All 9 Desktop Tests into Mobile Build

- **File Link:** [mobile/src/App.tsx#L30](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L30)
- **Defect Description:**
  In `mobile/src/App.tsx`:
  ```ts
  // Code-split heavy routes for fast Home startup
  const About = React.lazy(() => import('../../src/components/About').then(m => ({ default: m.About })));
  ```
  And in line 157:
  ```tsx
  <Route path="/about" element={<About onNavigate={handleNavigate} />} />
  ```
  `mobile/src/App.tsx` lazily imports `About` directly from the **desktop** component directory (`../../src/components/About`).
  Tracing the desktop dependency tree:
  1. `src/components/About.tsx` imports `import { PageShell } from './layout/PageShell'`.
  2. `src/components/layout/PageShell.tsx` imports `import { Navbar } from '../Navbar'`.
  3. `src/components/Navbar.tsx` imports `import { preloadRoute } from '../lib/routeTheme'`.
  4. Desktop `src/lib/routeTheme.ts` preloads all 9 desktop test components:
     ```ts
     case '/assessments': import('../components/Assessments'); break;
     case '/leaderboard': import('../components/Leaderboard'); break;
     case '/improve': import('../components/Improve'); break;
     case '/reaction-test': import('../components/ReactionTest'); break;
     case '/direction-test': import('../components/DirectionTest'); break;
     case '/block-memory': import('../components/BlockMemoryTest'); break;
     case '/number-memory': import('../components/NumberMemoryTest'); break;
     case '/colour-recognition': import('../components/ColorTest'); break;
     ```
  Because Vite/Rollup analyzes static imports, compiling the mobile build (`cd mobile && npm run build`) pulls the **entire desktop application tree** into the mobile build directory.
  The build emits duplicate chunks for every assessment component in `dist/mobile/assets/`:
  - `BlockMemoryTest-BJDBptSS.js` (desktop) AND `BlockMemoryTest-DfPKYpHZ.js` (mobile)
  - `ColorTest-CTHwHSKf.js` (desktop) AND `ColorTest-CN-vg8Bx.js` (mobile)
  - `ReactionTest-C5NgLjWF.js` (desktop) AND `ReactionTest-DFJDvhMd.js` (mobile)
  - `DirectionTest-g8oyHK1F.js` (desktop) AND `DirectionTest-CoCv2JW8.js` (mobile)
  - `SettingsModal-BgTvPnZQ.js` (desktop) AND `SettingsModal-Dgy6L9pA.js` (mobile)
  - `Improve-Rom1ruUv.js` (desktop) AND `Improve-DVW5xqG9.js` (mobile)
  - `Assessments-CRZrOgT6.js` (desktop) AND `Assessments-DRLnQM2k.js` (mobile)
  - `AddToHomeScreenModal-Dq2CXjbM.js` (desktop) AND `AddToHomeScreenModal-IATDk4qJ.js` (mobile)
  - `About-Bpw246cx.js` (41.53 kB desktop chunk)
  This directly breaks bundle isolation, bloats mobile distribution by hundreds of kilobytes, and defeats the test in `tests/unit/sharedLibraryParity.test.ts#L23-L31` that intended to prevent desktop chunk leakage into mobile.
- **Frequency:** 9/10. Occurs on 100% of mobile production builds.
- **Impact:** 7/10. Severely degrades mobile PWA download size, performance budgets, and cache efficiency.
- **Surgical Root-Cause Fix:**
  Create a lightweight mobile-native `About` screen or redirect mobile `/about` to `/` (or render `ResearchPrivacyPolicy`), removing the import to desktop `../../src/components/About`:
  ```tsx
  // mobile/src/App.tsx
  const ResearchPrivacyPolicy = React.lazy(() => import('./components/ResearchPrivacyPolicy').then(m => ({ default: m.ResearchPrivacyPolicy })));
  // Replace desktop About with mobile-native view
  <Route path="/about" element={<GuardedNavigate to="/" replace />} />
  ```

---

### BUG-C9-03: Firestore Transaction Contention Error Handler Fails Open, Resetting Hit Counter to 1 Under Load

- **File Link:** [firestoreRateLimitStore.ts#L62-L73](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L62-L73)
- **Defect Description:**
  In `server/config/firestoreRateLimitStore.ts`:
  ```ts
    try {
      let totalHits = 0;
      await ref.firestore.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const data = snap.data();
        const previousCount = data?.windowStart === windowStart ? Number(data.count) || 0 : 0;
        totalHits = previousCount + 1;
        tx.set(ref, {
          count: totalHits,
          windowStart,
          resetAt: resetTime,
          updatedAt: now
        });
      });

      return { totalHits, resetTime };
    } catch (err) {
      console.warn('[Rate limit store] Firestore counter error, falling back to memory counter:', err instanceof Error ? err.message : String(err));
      const existing = this.memoryFallback.get(key);
      if (!existing || existing.resetAt.getTime() <= now) {
        if (this.memoryFallback.size >= 2000) { /* eviction */ }
        this.memoryFallback.set(key, { count: 1, resetAt: resetTime });
        return { totalHits: 1, resetTime };
      }
      existing.count += 1;
      return { totalHits: existing.count, resetTime: existing.resetAt };
    }
  ```
  When an attacker sends high-concurrency requests against a rate-limited endpoint, concurrent Firestore transactions contend on the document (`_rateLimitCounters/<hash>`). After 5 retries, the Node.js Firestore SDK aborts the transaction and throws `ABORTED` or `RESOURCE_EXHAUSTED`.
  The error is caught by `catch (err)`. In the catch block:
  1. The code falls back to `this.memoryFallback`.
  2. Because successful prior requests only wrote to Firestore and never populated `this.memoryFallback`, `this.memoryFallback.get(key)` returns `undefined`.
  3. The fallback initializes `count = 1` and returns `{ totalHits: 1, resetTime }`.
  4. `express-rate-limit` checks if `totalHits <= max` (e.g. `1 <= 30` is `true`), and **permits the request**.
  Even if the user was already at 29 or 30 requests in Firestore, high contention causes the rate limiter to fail open, resetting their count to 1 and allowing unlimited burst traffic through during high server load.
- **Frequency:** 7/10. Happens whenever concurrent requests for the same key exceed Firestore transaction contention limits (common under automated burst scripts).
- **Impact:** 8/10. Inversion of rate limiting security: sending requests faster bypasses the limiter instead of blocking.
- **Surgical Root-Cause Fix:**
  If a Firestore transaction aborts due to contention, do not reset `totalHits` to 1. Fall back to rejecting or assuming the current threshold has been exceeded if an active counter is suspected, or keep `memoryFallback` synchronized on every read:
  ```ts
  } catch (err) {
    console.warn('[Rate limit store] Firestore counter error, falling back to memory counter:', err instanceof Error ? err.message : String(err));
    const existing = this.memoryFallback.get(key);
    // If memory fallback has no state, fail-closed or estimate high to prevent contention bypass
    const fallbackCount = existing && existing.resetAt.getTime() > now ? existing.count + 1 : 2;
    this.memoryFallback.set(key, { count: fallbackCount, resetAt: resetTime });
    return { totalHits: fallbackCount, resetTime };
  }
  ```

---

### BUG-C9-04: Flanker & Stroop Accuracy is Multiplied by 100 Twice, Reporting 10,000% Accuracy in Telegram Notifications

- **File Link:** [researchRoutes.ts#L159](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159) and [telegramNotifierService.ts#L188-L200](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L188-L200)
- **Defect Description:**
  In `server/routes/researchRoutes.ts`:
  ```ts
  accuracyPercentage: typeof dm.accuracyPercentage === 'number'
    ? dm.accuracyPercentage
    : (typeof dm.accuracy === 'number' ? dm.accuracy * 100 : null),
  ```
  Both `server/engines/flankerCalculator.ts` (line 194) and `server/engines/stroopCalculator.ts` (line 242) compute accuracy as a percentage out of 100:
  ```ts
  // flankerCalculator.ts#L194
  const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;
  // stroopCalculator.ts#L242
  const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;
  ```
  They store this value under `accuracy` (e.g. `100` for 100%, `93.33` for 93.33%). Neither engine ever outputs `accuracyPercentage`.
  In `researchRoutes.ts#L159`, because `dm.accuracyPercentage` is `undefined`, it evaluates `dm.accuracy * 100`:
  `100` becomes `10000`, and `93.33` becomes `9333`!
  Then in `server/services/telegramNotifierService.ts#L188` and `#L196`:
  ```ts
  const accuracy = typeof m.accuracyPercentage === 'number' ? `${Math.round(m.accuracyPercentage)}%` : 'N/A';
  ```
  The message formatted and sent to the Telegram channel displays:
  `• Accuracy: 10000%` or `• Accuracy: 9333%`!
  Every single Direction and Color assessment notification sent to Telegram displays corrupted, impossible accuracy percentages.
- **Frequency:** 9/10. 100% reproducible on every Direction and Color Recognition completion notification.
- **Impact:** 6/10. Admin telemetry distortion and incorrect metric auditing across live communication channels.
- **Surgical Root-Cause Fix:**
  In `server/routes/researchRoutes.ts#L159`, use `dm.accuracy` directly when it is already in 0–100 scale:
  ```ts
  accuracyPercentage: typeof dm.accuracyPercentage === 'number'
    ? dm.accuracyPercentage
    : (typeof dm.accuracy === 'number' ? (dm.accuracy <= 1 ? dm.accuracy * 100 : dm.accuracy) : null),
  ```

---

### BUG-C9-05: Un-normalized `assessmentType` in Personal Best API Silently Returns Null for `colour-recognition`

- **File Link:** [researchRoutes.ts#L75-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L75-L80) and [personalBestService.ts#L8-L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/personalBestService.ts#L8-L13)
- **Defect Description:**
  In `server/routes/researchRoutes.ts`:
  ```ts
  app.get('/api/personal-best', async (req, res) => {
    ...
    const { assessmentType } = req.query;
    if (!assessmentType || typeof assessmentType !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid assessmentType parameter' });
    }

    const best = await services.personalBestService.getPersonalBest(verifiedUser.uid, assessmentType);
    return res.json({ success: true, personalBest: best });
  ```
  And in `server/services/personalBestService.ts`:
  ```ts
  export class PersonalBestService implements IPersonalBestService {
    constructor(private readonly sessionRepo: ISessionRepository) {}

    async getPersonalBest(userId: string, assessmentType: string): Promise<number | null> {
      const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
      let best: number | null = null;

      try {
        const sessions = await this.sessionRepo.findUserConsumedSessions(userId, assessmentType);
  ```
  Throughout PULSE (and in `server/engines/assessmentTypes.ts`), British English (`colour-recognition`) and US English (`color-recognition`) are supported aliases.
  When sessions are created and completed, `assessmentType` is canonicalized to `'color-recognition'` before being persisted in Firestore.
  However, `/api/personal-best` passes `req.query.assessmentType` directly to `PersonalBestService.getPersonalBest` **without calling `normalizeAssessmentType`**.
  When a client (or British English UI locale) calls `/api/personal-best?assessmentType=colour-recognition`:
  1. `sessionRepo.findUserConsumedSessions` runs:
     `.where('assessmentType', '==', 'colour-recognition')`.
  2. Firestore returns 0 documents because all documents were stored as `'color-recognition'`.
  3. The API responds with `{ success: true, personalBest: null }`, wiping the user's displayed personal best.
  4. Furthermore, line 9 (`isLowerBetter`) checks `assessmentType === 'color-recognition'`, so even if documents were matched, it would invert the scoring direction.
- **Frequency:** 7/10. 100% reproducible whenever `colour-recognition` is requested.
- **Impact:** 7/10. Breaks personal-best tracking and UI score display for participants.
- **Surgical Root-Cause Fix:**
  In `server/routes/researchRoutes.ts#L78` and `server/services/personalBestService.ts#L8`:
  ```ts
  import { normalizeAssessmentType } from '../engines/assessmentTypes';

  // In researchRoutes.ts
  const canonicalType = normalizeAssessmentType(assessmentType) || assessmentType;
  const best = await services.personalBestService.getPersonalBest(verifiedUser.uid, canonicalType);
  ```

---

### BUG-C9-06: Premature Loop Break in Outbox Worker Caps Dispatch to 1 Msg per 5s Tick, Stalling Notifications

- **File Link:** [telegramNotifierService.ts#L405-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L405-L410)
- **Defect Description:**
  In `server/services/telegramNotifierService.ts`:
  ```ts
  private readonly minSendIntervalMs = 3333; // ~18 msgs/minute rate limit target

  public async processOutbox(ignoreInterval = false): Promise<{ processed: number; failed: number }> {
    ...
    for (const record of dueRecords) {
      // Enforce chat-wide rate limiting
      const timeSinceLast = Date.now() - this.lastSendTime;
      if (!ignoreInterval && timeSinceLast < this.minSendIntervalMs) {
        break; // Yield to next loop iteration
      }

      record.state = 'sending';
      record.attempts += 1;

      try {
        await this.dispatchMessage(record);
        record.state = 'sent';
        record.sentAt = Date.now();
        this.lastSendTime = Date.now();
        this.outbox.delete(record.id);
        this.saveRecent(record);
        processed += 1;
      } catch (err: unknown) {
  ```
  The background worker timer runs every 5000ms (`setInterval(..., 5000)` at line 130).
  Suppose there are 5 messages in `dueRecords`.
  1. The worker evaluates message 1. Assuming `Date.now() - this.lastSendTime >= 3333`, it calls `dispatchMessage(record)`.
  2. The message is sent. At line 418, `this.lastSendTime` is updated to `Date.now()`.
  3. The `for` loop advances to message 2.
  4. Now, `timeSinceLast = Date.now() - this.lastSendTime` is `0ms`.
  5. `timeSinceLast < this.minSendIntervalMs` (0 < 3333) is `true`.
  6. The code executes `break;`!
  `break` exits the entire loop immediately, terminating `processOutbox`.
  As a result, **`processOutbox` will NEVER dispatch more than 1 single message per tick**, capping outbox throughput to 12 messages per minute instead of the designed 18 msgs/min. During bursts of page visits or simultaneous test submissions, the outbox backlog steadily accumulates until it hits `MAX_OUTBOX_CAPACITY` (200), whereupon `ensureCapacity` begins dropping messages permanently.
- **Frequency:** 8/10. Happens whenever 2 or more messages are queued in the outbox.
- **Impact:** 6/10. Causes artificial delivery latency and leads to premature dropped notifications under capacity overflow.
- **Surgical Root-Cause Fix:**
  If the rate limit interval has not elapsed, wait for the remaining delta (`await new Promise(r => setTimeout(r, minSendIntervalMs - timeSinceLast))`) instead of breaking out of the loop:
  ```ts
  if (!ignoreInterval && timeSinceLast < this.minSendIntervalMs) {
    await new Promise(resolve => setTimeout(resolve, this.minSendIntervalMs - timeSinceLast));
  }
  ```

---

### BUG-C9-07: Stale `lastSendTime` on Dispatch Error Triggers Unthrottled Rapid-Fire Request Storm Against Telegram API

- **File Link:** [telegramNotifierService.ts#L418-L439](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L418-L439)
- **Defect Description:**
  In `server/services/telegramNotifierService.ts`:
  ```ts
    try {
      await this.dispatchMessage(record);
      record.state = 'sent';
      record.sentAt = Date.now();
      this.lastSendTime = Date.now();
      this.outbox.delete(record.id);
      this.saveRecent(record);
      processed += 1;
    } catch (err: unknown) {
      failed += 1;
      const errMsg = err instanceof Error ? err.message : String(err);
      record.lastError = errMsg;
      ...
    }
  ```
  Notice that `this.lastSendTime = Date.now()` at line 418 is only executed inside the `try` block when `dispatchMessage` succeeds.
  If Telegram is returning an error (such as HTTP 429 Too Many Requests, HTTP 500, or a network timeout), `dispatchMessage` throws an error.
  Line 418 is skipped, and execution jumps directly to `catch (err)`.
  In the catch block, `this.lastSendTime` is **never updated**.
  When the loop moves to the next record in `dueRecords`:
  `timeSinceLast = Date.now() - this.lastSendTime` is still large (from before the failed call).
  The check `timeSinceLast < this.minSendIntervalMs` evaluates to `false`!
  `processOutbox` immediately attempts to dispatch message 2 with 0ms delay!
  If message 2 also fails, message 3 is dispatched immediately!
  Under error conditions (e.g. rate limit or gateway outage), `processOutbox` hammers the Telegram API in an unthrottled tight loop, exacerbating the 429 block and rapidly exhausting all 5 retry attempts across every pending message in the outbox.
- **Frequency:** 6/10. Happens on any Telegram API failure or network glitch.
- **Impact:** 7/10. Converts temporary transient network issues into permanent dead-letter drops for the entire queue.
- **Surgical Root-Cause Fix:**
  Always update `this.lastSendTime = Date.now()` regardless of whether the dispatch succeeded or failed:
  ```ts
    try {
      await this.dispatchMessage(record);
      record.state = 'sent';
      record.sentAt = Date.now();
      this.outbox.delete(record.id);
      this.saveRecent(record);
      processed += 1;
    } catch (err: unknown) {
      ...
    } finally {
      this.lastSendTime = Date.now();
    }
  ```

---

### BUG-C9-08: Unbounded Deduplication Map Causes Memory Leak & $O(N)$ Synchronous Main-Thread Stall on Every Page View

- **File Link:** [telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382)
- **Defect Description:**
  In `server/services/telegramNotifierService.ts`:
  ```ts
  private readonly pageViewEventIds: Map<string, number> = new Map(); // eventId -> expiry epoch ms

  public async enqueuePageView(event: PageViewRequest): Promise<{ success: boolean; deduplicated?: boolean }> {
    ...
    const now = Date.now();
    // 48-hour eventId deduplication
    this.cleanExpiredDeduplicationKeys(now);
    if (this.pageViewEventIds.has(event.eventId)) {
      return { success: true, deduplicated: true };
    }
    this.pageViewEventIds.set(event.eventId, now + 48 * 60 * 60 * 1000);
  ```
  And `cleanExpiredDeduplicationKeys`:
  ```ts
  private cleanExpiredDeduplicationKeys(now: number): void {
    if (this.pageViewEventIds.size > 2000) {
      for (const [key, expiry] of this.pageViewEventIds.entries()) {
        if (expiry <= now) {
          this.pageViewEventIds.delete(key);
        }
      }
    }
  }
  ```
  Keys in `this.pageViewEventIds` are given a 48-hour TTL (`now + 48 * 60 * 60 * 1000`).
  If a production site receives 10,000 page views over 48 hours:
  1. None of the 10,000 keys have expired (`expiry <= now` is `false`).
  2. `cleanExpiredDeduplicationKeys` checks `if (this.pageViewEventIds.size > 2000)`.
  3. Because size is > 2000, it iterates through **all 10,000 entries** in the Map on **every single incoming page-view HTTP request**.
  4. It deletes 0 entries.
  5. The map grows unbounded to 20,000, 50,000, etc.
  6. Every subsequent page view executes a blocking, synchronous loop over 50,000 items on Node.js's single-threaded event loop, consuming CPU and causing memory leakage.
- **Frequency:** 6/10. Happens continuously on high-traffic or active deployments.
- **Impact:** 6/10. Event loop stalls, increased API latency, and unbounded memory consumption.
- **Surgical Root-Cause Fix:**
  Add a hard FIFO capacity eviction cap when the map exceeds maximum bounds, exactly like `FirestoreRateLimitStore`:
  ```ts
  private cleanExpiredDeduplicationKeys(now: number): void {
    if (this.pageViewEventIds.size > 2000) {
      for (const [key, expiry] of this.pageViewEventIds.entries()) {
        if (expiry <= now) {
          this.pageViewEventIds.delete(key);
        }
      }
      while (this.pageViewEventIds.size > 2000) {
        const oldest = this.pageViewEventIds.keys().next().value;
        if (!oldest) break;
        this.pageViewEventIds.delete(oldest);
      }
    }
  }
  ```

---

### BUG-C9-09: `isValidProtocolObservation` Lacks `'colour-recognition'` Alias in Switch, Rejecting Valid Observations

- **File Link:** [protocolValidators.ts#L389-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L389-L410)
- **Defect Description:**
  In `src/lib/protocolValidators.ts`:
  ```ts
  export function isValidProtocolObservation(obs: DatasetObservation, protocolFilter?: string): boolean {
    const targetProtocol = protocolFilter && protocolFilter !== 'All' ? protocolFilter : obs.assessmentType;

    switch (targetProtocol) {
      case 'visual-reaction':
        return isValidVisualReactionObservation(obs);
      case 'direction':
        return isValidDirectionObservation(obs);
      case 'color-recognition':
        return isValidColorObservation(obs);
      case 'block-memory':
      case 'number-memory':
        return isValidMemoryObservation(obs);
      default:
        return (
          isValidVisualReactionObservation(obs) ||
          isValidDirectionObservation(obs) ||
          isValidColorObservation(obs) ||
          isValidMemoryObservation(obs)
        );
    }
  }
  ```
  Throughout the platform, `colour-recognition` is the official British English route and protocol name.
  If `protocolFilter` is passed as `'colour-recognition'` (or if an observation has `assessmentType: 'colour-recognition'`):
  1. It fails to match `case 'color-recognition':`.
  2. It falls into `default:`, which evaluates `isValidVisualReactionObservation || isValidDirectionObservation || isValidColorObservation || isValidMemoryObservation`.
  3. Inside `isValidColorObservation(obs)` (line 304):
     `if (obs.assessmentType !== 'color-recognition') return false;`
     Because `obs.assessmentType` is `'colour-recognition'`, it returns `false`.
  4. All other validators return `false`.
  5. `isValidProtocolObservation` returns `false`, rejecting valid observations.
  Conversely, if `protocolFilter === 'colour-recognition'` is used to filter a dataset of mixed observations, the default branch executes all 4 validators, allowing Direction, Reaction, and Memory observations to pass through the filter instead of filtering for color tests!
- **Frequency:** 6/10. Occurs whenever British English protocol naming is supplied to the master validator.
- **Impact:** 6/10. Client validation rejection of valid dataset rows and failure of protocol filtering.
- **Surgical Root-Cause Fix:**
  Add `case 'colour-recognition':` and normalize `obs.assessmentType` in `isValidColorObservation`:
  ```ts
    switch (targetProtocol) {
      case 'visual-reaction':
        return isValidVisualReactionObservation(obs);
      case 'direction':
        return isValidDirectionObservation(obs);
      case 'color-recognition':
      case 'colour-recognition':
        return isValidColorObservation(obs);
      case 'block-memory':
      case 'number-memory':
        return isValidMemoryObservation(obs);
  ```

---

### BUG-C9-10: Unsanitized Forward Slashes in `sessionId` Crash Firestore Document Lookup with HTTP 500 Instead of 400

- **File Link:** [sessionService.ts#L58-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L58-L72) and [firestoreSessionRepository.ts#L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts#L13)
- **Defect Description:**
  In `server/repositories/firestore/firestoreSessionRepository.ts`:
  ```ts
  async findById(sessionId: string): Promise<ExperimentSessionRecord | null> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }
    const snap = await db.collection('experimentSessions').doc(sessionId).get();
    if (!snap.exists) {
      return null;
    }
    return snap.data() as ExperimentSessionRecord;
  }
  ```
  And in `server/services/sessionService.ts`:
  ```ts
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.trim().length > 128) {
    return { valid: false, error: 'Missing or invalid session ID', status: 400 };
  }

  const cleanSessionId = sessionId.trim();
  let session: ExperimentSessionRecord | null = null;
  try {
    session = await this.sessionRepo.findById(cleanSessionId);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg === 'DATABASE_UNAVAILABLE') {
      return { valid: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}`, status: 500 };
    }
    return { valid: false, error: 'Database error reading experiment session', status: 500 };
  }
  ```
  The input validation in `sessionService.ts` only checks `sessionId.length > 128`.
  In Firestore Admin SDK, calling `doc(sessionId)` with forward slashes (e.g. `doc('a/b/c')`) treats the string as a subcollection path. When the path contains an odd number of components, Firestore throws:
  `FirebaseError: Value for argument "documentPath" must point to a document, but was "experimentSessions/a/b/c". Your path does not contain an even number of components.`
  `sessionService.ts` catches this Firestore driver error and returns HTTP 500 (`Database error reading experiment session`) rather than properly rejecting the malformed input with HTTP 400 (`Invalid session ID format`).
- **Frequency:** 5/10. Triggers on malformed, fuzzing, or exploratory client input.
- **Impact:** 5/10. Improper error classification masks user input errors as server internal errors.
- **Surgical Root-Cause Fix:**
  Enforce strict UUID/alphanumeric format validation on `sessionId` in `sessionService.ts`:
  ```ts
  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(sessionId.trim())) {
    return { valid: false, error: 'Missing or invalid session ID', status: 400 };
  }
  ```

---

## 4. Ponytail Elimination of Bloat & Dead Code

1. **Dead Route in Rate Limiting:**
   In `server/config/rateLimits.ts#L216`:
   ```ts
   app.use('/api/sessions', generalSessionsLimiter);
   ```
   The route `/api/sessions` does not exist in any route handler in `server/routes/`. The actual session issuance endpoint is `/api/research/session/start` (covered by `sessionStartLimiter`). `generalSessionsLimiter` and its registration on `/api/sessions` are dead code and should be removed.

2. **Unused Protocol Validators in Production:**
   In `src/lib/protocolValidators.ts`, `isValidBaseObservation`, `isValidVisualReactionObservation`, `isValidDirectionObservation`, `isValidColorObservation`, and `isValidMemoryObservation` (~280 lines of code) are never imported or invoked by the server ingestion pipeline (`server/routes/researchRoutes.ts`) or client fetchers (`src/lib/dataset.ts`). They exist solely as standalone test fixtures. They should either be wired as validation gates in `researchRoutes.ts` or trimmed.

3. **Leaky Session Repository Abstraction:**
   `FirestoreSessionRepository` defines only `findById`, `create`, and `findUserConsumedSessions`. However, session consumption, transactional locking, and leaderboard submission update writes directly access `db.collection('experimentSessions')` inside `firestoreResearchSubmissionRepository.ts` and `firestoreLeaderboardSubmissionRepository.ts`. Adding a `consume()` and `updateLeaderboardMeta()` method to `ISessionRepository` eliminates fragmented database queries.
