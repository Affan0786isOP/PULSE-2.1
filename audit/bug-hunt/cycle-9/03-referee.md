# PULSE v2.1 — Cycle 9 Bug Referee Adjudication Report

**Role:** Bug Referee Agent (Cycle 9)  
**Task Scope:** Distributed Rate Limiting, Session Persistence, Client Protocol Validation, and Telemetry Notifications  
**Target Scope Files:**
1. [server/config/firestoreRateLimitStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts)
2. [server/config/rateLimits.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts)
3. [server/repositories/firestore/firestoreSessionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts)
4. [src/lib/protocolValidators.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts) & [mobile/src/lib/protocolValidators.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/protocolValidators.ts)
5. [server/services/telegramNotifierService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts)
6. Connected Callers: [mobile/src/App.tsx](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx), [server/routes/researchRoutes.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts), [server/services/personalBestService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/personalBestService.ts), [server/services/sessionService.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts)

**Standard Applied:** Actionability Threshold $\text{Risk Score} = \text{Frequency} \times \text{Impact} \ge 5$. Ponytail Senior Dev Minimalism (Zero Unrequested Abstractions, Surgical Diffs, Root-Cause Fixes).

---

## 1. Executive Summary & Definitive Adjudication Matrix

The Bug Referee has conducted independent static, architectural, runtime trace, and build bundle verifications of all 10 candidates debated between the Bug Hunter and Bug Skeptic for Cycle 9.

### Definitive Adjudication Summary:
- **CONFIRMED (10 Defects):** BUG-C9-01, BUG-C9-02, BUG-C9-03, BUG-C9-04, BUG-C9-05, BUG-C9-06, BUG-C9-07, BUG-C9-08, BUG-C9-09, BUG-C9-10. All 10 candidates represent verified defects in application code, bundle configuration, concurrency control, or data formatting. All 10 meet or exceed the actionability threshold ($\text{Score} \ge 5$) and require surgical remediation.
- **CALIBRATIONS & CORRECTIONS:**
  - **BUG-C9-02:** Build-artifact audit confirmed Rollup/Vite emitted duplicate chunks for all 9 desktop assessment components into `dist/mobile/assets/` (`About-Bpw246cx.js` 41.5 KB, duplicate `BlockMemoryTest`, `ColorTest`, `DirectionTest`, `ReactionTest`, `NumberMemoryTest`, `Improve`, `Leaderboard`, `SettingsModal`, `AddToHomeScreenModal`), violating `tests/unit/sharedLibraryParity.test.ts`. Frequency calibrated to 10/10; Risk Score: **70**.
  - **BUG-C9-05:** Runtime path corrected. `/api/personal-best?assessmentType=colour-recognition` fails with **HTTP 400** at `VALID_ASSESSMENT_TYPES.includes(assessmentType)` rather than HTTP 200 with `null`. In addition, `personalBestService.ts#L9` inverts scoring direction and fails to find documents. Confirmed with runtime correction; Risk Score: **30**.
  - **BUG-C9-09:** Qualified on reachability. `isValidProtocolObservation` has a genuine logic bug rejecting British English observation objects and leaking observation types during filtering, but is currently invoked only in unit test suites. Risk Score calibrated to **16**.

| ID | Candidate Defect Summary | Hunter Score | Skeptic Score | Referee Freq | Referee Imp | Referee Final Score | Referee Verdict | Actionability Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C9-01** | Unverified client claims partitioning allows unauthenticated DoS floods and burns Firestore write quota | 64 | 56 | 7 | 8 | **56** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-02** | Mobile lazy import of desktop About drags entire desktop app and all 9 desktop tests into mobile PWA bundle | 63 | 70 | 10 | 7 | **70** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-03** | Firestore transaction contention error handler fails open, resetting hit counter to 1 under load | 56 | 48 | 6 | 8 | **48** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-04** | Flanker & Stroop accuracy multiplied by 100 twice, reporting 10,000% accuracy in Telegram notifications | 54 | 54 | 9 | 6 | **54** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-05** | Un-normalized `assessmentType` in Personal Best API rejects `colour-recognition` with HTTP 400 or inverts score logic | 49 | 30 | 5 | 6 | **30** | **CONFIRMED** *(Corrected)* | Actionable Defect |
| **BUG-C9-06** | Premature loop break in outbox worker caps dispatch to 1 msg per 5s tick, stalling notifications | 48 | 48 | 8 | 6 | **48** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-07** | Stale `lastSendTime` on dispatch error triggers unthrottled rapid-fire request storm against Telegram API | 42 | 42 | 6 | 7 | **42** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-08** | Unbounded deduplication map causes memory leak and $O(N)$ synchronous main-thread stall on every page view | 36 | 36 | 6 | 6 | **36** | **CONFIRMED** | Actionable Defect |
| **BUG-C9-09** | `isValidProtocolObservation` lacks `'colour-recognition'` alias in switch, rejecting valid observations | 36 | 16 | 4 | 4 | **16** | **CONFIRMED** *(Qualified)* | Actionable Defect |
| **BUG-C9-10** | Unsanitized forward slashes in `sessionId` crash Firestore document lookup with HTTP 500 instead of 400 | 25 | 12 | 3 | 4 | **12** | **CONFIRMED** | Actionable Defect |

---

## 2. In-Depth Adjudication & Evidence-Backed Rulings

---

### BUG-C9-01: Unverified Client Claims Partitioning Allows Unauthenticated DoS Floods & Burns Firestore Write Quota

- **Target Source Links:**
  - [server/config/rateLimits.ts#L10-L38](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L10-L38)
  - [server/config/rateLimits.ts#L50-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L50-L72)
  - [server/config/rateLimits.ts#L206-L223](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L206-L223)
  - [server/config/firestoreRateLimitStore.ts#L22-L27](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L22-L27)
- **The Debate:**
  - **Hunter:** `getUnverifiedUid` parses the middle segment of an `Authorization: Bearer <jwt>` header without cryptographic verification. Because `applyRateLimits(app)` runs before auth middleware, an unauthenticated attacker can supply forged tokens with random `user_id` values, bypassing route limiters and generating 20,000 distinct Firestore documents in `_rateLimitCounters` to exhaust the project's free-tier daily write quota. (Score: 64).
  - **Skeptic:** Confirmed. Re-scored frequency from 8 down to 7 (Impact: 8, Score: 56). Fallback `generalApiLimiter` permits 2,000 requests per 15 minutes per IP, which still allows an attacker to burn 8,000 Firestore writes per hour from a single IP.
- **Referee Code Review & Adjudication:**
  Direct inspection confirms the vulnerability. In [server/config/rateLimits.ts#L10-L24](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L10-L24):
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
  ```
  `applyRateLimits(app)` binds `sessionStartLimiter`, `sessionSubmitLimiter`, and `leaderboardSubmitLimiter` at lines 215, 217, and 218. Because these run prior to `verifyFirebaseUserToken`, client-supplied `user_id` values are completely untrusted (CWE-807).
  In `FirestoreRateLimitStore#getCounterRef`, each unique key creates a separate document hash in `_rateLimitCounters`. Under Google Cloud Firestore pricing, each unique write operation counts against the daily limit (20,000 writes/day free tier). A script sending randomized bearer tokens completely bypasses the 30-request quota per route and drains database quotas.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 7, Impact: 8 $\rightarrow$ **56** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  Pre-auth rate limiting must enforce an absolute per-IP ceiling. In [server/config/rateLimits.ts#L32-L38](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L32-L38), remove unverified client token partitioning prior to authentication:
  ```ts
  function createLimiterKey(namespace: string, _useUserIdentity: boolean) {
    return (req: Request): string => {
      const ip = normalizedRequestIp(req);
      return `${namespace}:ip:${ip}`;
    };
  }
  ```

---

### BUG-C9-02: Mobile Lazy Import of Desktop About Drags Entire Desktop App and All 9 Desktop Tests into Mobile PWA Bundle

- **Target Source Links:**
  - [mobile/src/App.tsx#L30](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L30)
  - [src/components/About.tsx#L12](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/About.tsx#L12)
  - [src/components/layout/PageShell.tsx#L3](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/layout/PageShell.tsx#L3)
  - [src/components/Navbar.tsx#L10-L16](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/Navbar.tsx#L10-L16)
  - [src/lib/routeTheme.ts#L24-L56](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/routeTheme.ts#L24-L56)
  - [tests/unit/sharedLibraryParity.test.ts#L23-L31](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/tests/unit/sharedLibraryParity.test.ts#L23-L31)
- **The Debate:**
  - **Hunter:** In `mobile/src/App.tsx#L30`, lazy import of `../../src/components/About` drags the entire desktop dependency graph (PageShell $\rightarrow$ Navbar $\rightarrow$ routeTheme $\rightarrow$ all 9 desktop tests) into the mobile build. (Score: 63).
  - **Skeptic:** Confirmed. Re-scored to Freq: 10, Impact: 7 (Score: 70). Emphasized that `dist/mobile/assets/` contains duplicate chunks for all 9 desktop assessment components, defeating the architectural protection tested in `sharedLibraryParity.test.ts`.
- **Referee Code Review & Adjudication:**
  Referee executed physical inspection of `dist/mobile/assets/` on disk. The directory contains:
  - `About-Bpw246cx.js` (41.5 KB desktop chunk)
  - `BlockMemoryTest-BJDBptSS.js` (17.0 KB desktop) AND `BlockMemoryTest-DfPKYpHZ.js` (17.2 KB mobile)
  - `ColorTest-CTHwHSKf.js` (19.6 KB desktop) AND `ColorTest-CN-vg8Bx.js` (20.5 KB mobile)
  - `DirectionTest-g8oyHK1F.js` (22.3 KB desktop) AND `DirectionTest-CoCv2JW8.js` (22.6 KB mobile)
  - `ReactionTest-C5NgLjWF.js` (20.2 KB desktop) AND `ReactionTest-DFJDvhMd.js` (21.9 KB mobile)
  - `NumberMemoryTest-Bd9FL4B0.js` (17.9 KB desktop) AND `NumberMemoryTest-DXn9TMXz.js` (17.7 KB mobile)
  - `Improve-Rom1ruUv.js` (25.7 KB desktop) AND `Improve-DVW5xqG9.js` (37.5 KB mobile)
  - `Leaderboard-D5AIRfFl.js` (12.8 KB desktop) AND `Leaderboard-DoC5Pz9p.js` (16.8 KB mobile)
  - `SettingsModal-BgTvPnZQ.js` (23.6 KB desktop) AND `SettingsModal-Dgy6L9pA.js` (29.5 KB mobile)
  - `AddToHomeScreenModal-Dq2CXjbM.js` (17.2 KB desktop) AND `AddToHomeScreenModal-IATDk4qJ.js` (17.7 KB mobile)
  This is indisputable evidence of complete cross-platform bundle contamination. The test guard in [tests/unit/sharedLibraryParity.test.ts#L23-L31](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/tests/unit/sharedLibraryParity.test.ts#L23-L31) checked only `mobile/src/lib/routeTheme.ts` but missed `mobile/src/App.tsx#L30`.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 10, Impact: 7 $\rightarrow$ **70** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [mobile/src/App.tsx#L30](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L30) and [#L157](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L157), eliminate the cross-boundary desktop import and redirect mobile `/about` to `/` (or render `ResearchPrivacyPolicy`):
  ```tsx
  // mobile/src/App.tsx
  // Delete line 30:
  // const About = React.lazy(() => import('../../src/components/About').then(m => ({ default: m.About })));

  // Line 157:
  <Route path="/about" element={<GuardedNavigate to="/" replace />} />
  ```

---

### BUG-C9-03: Firestore Transaction Contention Error Handler Fails Open, Resetting Hit Counter to 1 Under Load

- **Target Source Links:**
  - [server/config/firestoreRateLimitStore.ts#L46-L73](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L46-L73)
- **The Debate:**
  - **Hunter:** Under transaction contention on `_rateLimitCounters/<hash>`, Firestore aborts. The catch block falls back to `memoryFallback`. Because `memoryFallback` is never populated on successful transactions, `memoryFallback.get(key)` is `undefined`, so it sets `count: 1` and returns `{ totalHits: 1, resetTime }`. The rate limiter fails open. (Score: 56).
  - **Skeptic:** Confirmed. Re-scored to Freq: 6, Impact: 8 (Score: 48). Verified that concurrent bursts trigger transaction retries and aborts, resetting participants who were near their rate ceiling.
- **Referee Code Review & Adjudication:**
  In [server/config/firestoreRateLimitStore.ts#L46-L73](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L46-L73):
  During normal execution (lines 48–61), `totalHits` is written only to Firestore. `this.memoryFallback` is untouched.
  When Firestore encounters concurrent updates on the document, after 5 retries the SDK throws `ABORTED` or `RESOURCE_EXHAUSTED`.
  In `catch (err)` (lines 62–73):
  ```ts
  const existing = this.memoryFallback.get(key);
  if (!existing || existing.resetAt.getTime() <= now) {
    if (this.memoryFallback.size >= 2000) { /* eviction */ }
    this.memoryFallback.set(key, { count: 1, resetAt: resetTime });
    return { totalHits: 1, resetTime };
  }
  ```
  `existing` is guaranteed to be `undefined`. The store returns `totalHits: 1`.
  `express-rate-limit` evaluates `totalHits <= max` (`1 <= 30` is true) and lets the request through.
  An attacker or burst of requests that triggers database contention actively bypasses the rate limiter because high contention resets the counter to 1.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 6, Impact: 8 $\rightarrow$ **48** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/config/firestoreRateLimitStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L60-L73), synchronize `memoryFallback` on transaction success, and fail conservatively (e.g. assume threshold reached or increment fallback) on contention error:
  ```ts
  // Line 60 (transaction success):
  this.memoryFallback.set(key, { count: totalHits, resetAt: resetTime });

  // In catch block (line 64):
  const fallbackCount = existing && existing.resetAt.getTime() > now ? existing.count + 1 : 2;
  this.memoryFallback.set(key, { count: fallbackCount, resetAt: resetTime });
  return { totalHits: fallbackCount, resetTime };
  ```

---

### BUG-C9-04: Flanker & Stroop Accuracy Multiplied by 100 Twice, Reporting 10,000% Accuracy in Telegram Notifications

- **Target Source Links:**
  - [server/routes/researchRoutes.ts#L159](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159)
  - [server/engines/flankerCalculator.ts#L194](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L194)
  - [server/engines/stroopCalculator.ts#L242](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L242)
  - [server/services/telegramNotifierService.ts#L188-L201](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L188-L201)
- **The Debate:**
  - **Hunter:** `flankerCalculator.ts` and `stroopCalculator.ts` calculate `accuracy` in the 0–100 percentage range (`100.0` or `93.33`). `researchRoutes.ts#L159` multiplies `dm.accuracy * 100`, producing `10000` or `9333`. `telegramNotifierService.ts` formats this as `${Math.round(m.accuracyPercentage)}%`, displaying `10000%`. (Score: 54).
  - **Skeptic:** Confirmed. Both agreed on Freq: 9, Impact: 6 (Score: 54). Unit test `telegramNotifierService.test.ts#L66` failed to catch this because it mocked `accuracyPercentage: 95.0` directly.
- **Referee Code Review & Adjudication:**
  Direct trace of data types:
  1. In [server/engines/flankerCalculator.ts#L194](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L194):
     `const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;`
  2. In [server/engines/stroopCalculator.ts#L242](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L242):
     `const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;`
  3. In [server/routes/researchRoutes.ts#L159](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159):
     `accuracyPercentage: typeof dm.accuracyPercentage === 'number' ? dm.accuracyPercentage : (typeof dm.accuracy === 'number' ? dm.accuracy * 100 : null)`
     Because neither calculator outputs `accuracyPercentage`, `dm.accuracy * 100` computes `100.0 * 100 = 10000`.
  4. In [server/services/telegramNotifierService.ts#L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L188) and [#L196](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L196):
     `const accuracy = typeof m.accuracyPercentage === 'number' ? `${Math.round(m.accuracyPercentage)}%` : 'N/A';`
     Formats as `• Accuracy: 10000%`.
  Every single Direction and Color assessment notification sent to Telegram exhibits this double multiplication.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 9, Impact: 6 $\rightarrow$ **54** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/routes/researchRoutes.ts#L159](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159), do not multiply by 100 if the value is already $> 1$:
  ```ts
  accuracyPercentage: typeof dm.accuracyPercentage === 'number'
    ? dm.accuracyPercentage
    : (typeof dm.accuracy === 'number' ? (dm.accuracy <= 1 ? dm.accuracy * 100 : dm.accuracy) : null),
  ```

---

### BUG-C9-05: Un-normalized `assessmentType` in Personal Best API Rejects `colour-recognition` with HTTP 400 or Inverts Score Logic

- **Target Source Links:**
  - [server/routes/researchRoutes.ts#L74-L81](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L74-L81)
  - [server/config/constants.ts#L11-L17](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/constants.ts#L11-L17)
  - [server/services/personalBestService.ts#L8-L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/personalBestService.ts#L8-L13)
- **The Debate:**
  - **Hunter:** Querying `/api/personal-best?assessmentType=colour-recognition` queries Firestore for `colour-recognition` documents, which returns empty results and responds with `{ success: true, personalBest: null }`. Also line 9 in `personalBestService` inverts score logic. (Score: 49).
  - **Skeptic:** Corrected runtime behavior: `researchRoutes.ts#L75` checks `VALID_ASSESSMENT_TYPES.includes(assessmentType)`. `VALID_ASSESSMENT_TYPES` contains only `'color-recognition'`. Thus, the request is rejected immediately with **HTTP 400** (`Invalid or missing assessmentType query parameter`). Also confirmed service scoring inversion. (Score: 30).
- **Referee Code Review & Adjudication:**
  Referee verifies Skeptic's runtime correction. In [server/routes/researchRoutes.ts#L74-L77](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L74-L77):
  ```ts
  const { assessmentType } = req.query || {};
  if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
  }
  ```
  Because `VALID_ASSESSMENT_TYPES` in [server/config/constants.ts#L11-L17](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/constants.ts#L11-L17) only has `'color-recognition'`, any client querying with the platform-standard British alias `'colour-recognition'` receives HTTP 400.
  Furthermore, if `personalBestService.getPersonalBest` is invoked with `'colour-recognition'`, line 9:
  `const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';`
  evaluates to `false`, treating lower latency as worse (inverting reaction scoring).
  Everywhere else in PULSE (`sessionService.ts`, `leaderboardAppService.ts`), `normalizeAssessmentType` is invoked. It was omitted here.
- **Referee Ruling:** **CONFIRMED** *(with runtime correction: returns HTTP 400 rather than 200 with null)*
- **Final Risk Score:** Frequency: 5, Impact: 6 $\rightarrow$ **30** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/routes/researchRoutes.ts#L74-L81](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L74-L81), normalize `assessmentType`:
  ```ts
  import { normalizeAssessmentType } from '../engines/assessmentTypes';

  const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType : '';
  const canonicalType = normalizeAssessmentType(rawType) || rawType;
  if (!VALID_ASSESSMENT_TYPES.includes(canonicalType)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
  }

  const best = await services.personalBestService.getPersonalBest(verifiedUser.uid, canonicalType);
  ```

---

### BUG-C9-06: Premature Loop Break in Outbox Worker Caps Dispatch to 1 Msg per 5s Tick, Stalling Notifications

- **Target Source Links:**
  - [server/services/telegramNotifierService.ts#L129-L136](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L129-L136)
  - [server/services/telegramNotifierService.ts#L404-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L404-L410)
- **The Debate:**
  - **Hunter:** In `processOutbox()`, `this.lastSendTime` is updated after message 1. In iteration 2, `timeSinceLast < this.minSendIntervalMs` is true, triggering `break;`. The worker timer runs every 5000ms, capping outbox throughput to 12 msgs/min (1 msg/tick) and causing backlog overflow. (Score: 48).
  - **Skeptic:** Confirmed. Both agreed on Freq: 8, Impact: 6 (Score: 48).
- **Referee Code Review & Adjudication:**
  Direct inspection of [server/services/telegramNotifierService.ts#L404-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L404-L410):
  ```ts
  for (const record of dueRecords) {
    // Enforce chat-wide rate limiting
    const timeSinceLast = Date.now() - this.lastSendTime;
    if (!ignoreInterval && timeSinceLast < this.minSendIntervalMs) {
      break; // Yield to next loop iteration
    }
  ```
  `dueRecords` gathers all pending messages ready for transmission.
  After record 1 is dispatched, line 418 sets `this.lastSendTime = Date.now()`.
  When the loop moves to record 2, `Date.now() - this.lastSendTime` is roughly 0 ms.
  `0 < 3333` is true. `break;` immediately terminates the loop and exits `processOutbox()`.
  Because the background worker timer runs every 5000ms (`setInterval(() => { void this.processOutbox(); }, 5000)` at line 130), **no tick can ever send more than 1 single message**.
  Throughput is throttled to $60 / 5 = 12$ messages per minute instead of the designed ~18 msgs/min (`minSendIntervalMs = 3333`).
  During surges, the outbox exceeds `MAX_OUTBOX_CAPACITY` (200), causing `ensureCapacity()` to permanently drop notifications.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 8, Impact: 6 $\rightarrow$ **48** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/services/telegramNotifierService.ts#L406-L409](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L406-L409), sleep for the remaining interval delta rather than breaking:
  ```ts
  if (!ignoreInterval && timeSinceLast < this.minSendIntervalMs) {
    await new Promise(resolve => setTimeout(resolve, this.minSendIntervalMs - timeSinceLast));
  }
  ```

---

### BUG-C9-07: Stale `lastSendTime` on Dispatch Error Triggers Unthrottled Rapid-Fire Request Storm Against Telegram API

- **Target Source Links:**
  - [server/services/telegramNotifierService.ts#L414-L439](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L414-L439)
- **The Debate:**
  - **Hunter:** `this.lastSendTime = Date.now()` is placed strictly inside the `try` block after `dispatchMessage` succeeds. If Telegram returns an error (429, 502, network failure), `this.lastSendTime` is never updated. The next record in `dueRecords` sees a large `timeSinceLast` and fires immediately with 0ms delay, hammering Telegram in a tight loop. (Score: 42).
  - **Skeptic:** Confirmed. Both agreed on Freq: 6, Impact: 7 (Score: 42).
- **Referee Code Review & Adjudication:**
  Direct code review of [server/services/telegramNotifierService.ts#L414-L439](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L414-L439):
  ```ts
  try {
    await this.dispatchMessage(record);
    record.state = 'sent';
    record.sentAt = Date.now();
    this.lastSendTime = Date.now(); // Line 418: Only on success!
    this.outbox.delete(record.id);
    this.saveRecent(record);
    processed += 1;
  } catch (err: unknown) {
    failed += 1;
    // this.lastSendTime is NOT updated here!
  }
  ```
  If `dispatchMessage` throws on record 1 (e.g. HTTP 429 Too Many Requests), line 418 is skipped.
  The `for` loop continues to record 2.
  `Date.now() - this.lastSendTime` compares against the previous successful dispatch (minutes or seconds ago).
  `timeSinceLast < this.minSendIntervalMs` evaluates to `false`!
  Record 2 is dispatched immediately.
  If record 2 also throws, record 3 is dispatched immediately.
  All pending messages in `dueRecords` are fired in a burst with 0ms spacing against Telegram's failing endpoint.
  This exacerbates Telegram 429 rate-limiting blocks and rapidly exhausts all 5 retries for every message in the queue.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 6, Impact: 7 $\rightarrow$ **42** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/services/telegramNotifierService.ts#L414-L440](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L414-L440), move `this.lastSendTime = Date.now()` into a `finally` block:
  ```ts
  try {
    await this.dispatchMessage(record);
    record.state = 'sent';
    record.sentAt = Date.now();
    this.outbox.delete(record.id);
    this.saveRecent(record);
    processed += 1;
  } catch (err: unknown) {
    failed += 1;
    // error logging and backoff...
  } finally {
    this.lastSendTime = Date.now();
  }
  ```

---

### BUG-C9-08: Unbounded Deduplication Map Causes Memory Leak & $O(N)$ Synchronous Main-Thread Stall on Every Page View

- **Target Source Links:**
  - [server/services/telegramNotifierService.ts#L276-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L276-L283)
  - [server/services/telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382)
- **The Debate:**
  - **Hunter:** Keys in `pageViewEventIds` have a 48-hour TTL. `cleanExpiredDeduplicationKeys` runs on every page view if size $> 2000$. Because none have expired, it loops through the entire map deleting 0 items. With no capacity cap, the map grows unbounded and executes an $O(N)$ synchronous main-thread stall on every page view. (Score: 36).
  - **Skeptic:** Confirmed. Both agreed on Freq: 6, Impact: 6 (Score: 36).
- **Referee Code Review & Adjudication:**
  In [server/services/telegramNotifierService.ts#L282](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L282):
  `this.pageViewEventIds.set(event.eventId, now + 48 * 60 * 60 * 1000);`
  And in lines 374–382:
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
  On a live site receiving 5,000 page views over 48 hours:
  1. No entry's `expiry` is $\le now$.
  2. The loop iterates 5,000 times on every incoming HTTP request.
  3. No keys are deleted.
  4. The map grows to 10,000, 25,000, etc.
  5. Unlike `FirestoreRateLimitStore` (which enforces a strict FIFO eviction cap `while (size > 2000)`), `telegramNotifierService` has no upper bound.
  This causes unbounded memory growth and blocks the Node.js event loop with synchronous traversals on every page view.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 6, Impact: 6 $\rightarrow$ **36** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/services/telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382), add a FIFO eviction cap:
  ```ts
  private cleanExpiredDeduplicationKeys(now: number): void {
    if (this.pageViewEventIds.size > 2000) {
      for (const [key, expiry] of this.pageViewEventIds.entries()) {
        if (expiry <= now) this.pageViewEventIds.delete(key);
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

- **Target Source Links:**
  - [src/lib/protocolValidators.ts#L301-L306](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L301-L306)
  - [src/lib/protocolValidators.ts#L389-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L389-L410)
  - [mobile/src/lib/protocolValidators.ts#L1](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/protocolValidators.ts#L1)
- **The Debate:**
  - **Hunter:** `isValidProtocolObservation` switch handles `'color-recognition'` but omits `'colour-recognition'`. It drops into `default:`, which calls `isValidColorObservation`, which checks `obs.assessmentType !== 'color-recognition'` and returns `false`. If used as a filter, it allows non-color observations to pass. (Score: 36).
  - **Skeptic:** Confirmed logic defect, but qualified because `isValidProtocolObservation` is currently invoked only in unit tests (`tests/unit/protocolValidators.test.ts`), not in active client rendering routes. Re-scored to Freq: 4, Impact: 4 (Score: 16).
- **Referee Code Review & Adjudication:**
  Code inspection of [src/lib/protocolValidators.ts#L389-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L389-L410):
  ```ts
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
  ```
  1. When passed an observation with `assessmentType === 'colour-recognition'`, `targetProtocol` misses all explicit cases and falls into `default:`.
  2. In `default:`, `isValidColorObservation(obs)` is called. At line 304: `if (obs.assessmentType !== 'color-recognition') return false;`. It returns `false`. All other validators return `false`. The observation is rejected.
  3. When `protocolFilter === 'colour-recognition'` is passed to filter a dataset, `targetProtocol` enters `default:`. Any valid Reaction, Direction, or Memory observation returns `true`, completely breaking protocol filtering.
  Although currently invoked directly in unit tests and exported from the shared library, leaving this bug in place breaks any client or script using the master validator for dataset validation or filtering.
- **Referee Ruling:** **CONFIRMED** *(Qualified on test-only runtime reachability)*
- **Final Risk Score:** Frequency: 4, Impact: 4 $\rightarrow$ **16** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [src/lib/protocolValidators.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L304-L402):
  ```ts
  // Line 304:
  if (obs.assessmentType !== 'color-recognition' && obs.assessmentType !== 'colour-recognition') return false;

  // Line 397:
  case 'color-recognition':
  case 'colour-recognition':
    return isValidColorObservation(obs);
  ```

---

### BUG-C9-10: Unsanitized Forward Slashes in `sessionId` Crash Firestore Document Lookup with HTTP 500 Instead of 400

- **Target Source Links:**
  - [server/services/sessionService.ts#L58-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L58-L72)
  - [server/repositories/firestore/firestoreSessionRepository.ts#L8-L18](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts#L8-L18)
- **The Debate:**
  - **Hunter:** `sessionService.ts` checks only `sessionId.length > 128`. In Firestore Admin SDK, `.doc(sessionId)` parses slashes as subcollection paths. An odd number of segments throws an SDK exception, caught as HTTP 500 (`Database error reading experiment session`) rather than rejected as HTTP 400. (Score: 25).
  - **Skeptic:** Confirmed. Re-scored to Freq: 3, Impact: 4 (Score: 12) because it requires client fuzzing or malformed URL input.
- **Referee Code Review & Adjudication:**
  In [server/repositories/firestore/firestoreSessionRepository.ts#L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts#L13):
  `const snap = await db.collection('experimentSessions').doc(sessionId).get();`
  In Google Cloud Firestore Node.js SDK, `.doc(path)` expects a valid document path. If `sessionId` is `foo/bar`, the path `experimentSessions/foo/bar` contains 3 segments (collection, doc, collection), which throws:
  `FirebaseError: Value for argument "documentPath" must point to a document, but was "experimentSessions/foo/bar". Your path does not contain an even number of components.`
  In [server/services/sessionService.ts#L64-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L64-L72):
  ```ts
  try {
    session = await this.sessionRepo.findById(cleanSessionId);
  } catch (err: unknown) {
    ...
    return { valid: false, error: 'Database error reading experiment session', status: 500 };
  }
  ```
  The server reports an internal 500 server error rather than rejecting invalid client input with HTTP 400 Bad Request.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 3, Impact: 4 $\rightarrow$ **12** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/services/sessionService.ts#L58-L60](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L58-L60), validate `sessionId` against a safe alphanumeric/UUID regex:
  ```ts
  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId.trim())) {
    return { valid: false, error: 'Missing or invalid session ID', status: 400 };
  }
  ```

---

## 3. Ponytail Bloat & Dead Code Audit Review

The Referee conducted an independent review of the 3 bloat and architectural defects identified in Cycle 9:

1. **Dead Route Limiter `/api/sessions`:**
   - **Location:** [server/config/rateLimits.ts#L74-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L74-L80) and [#L216](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L216).
   - **Finding:** `app.use('/api/sessions', generalSessionsLimiter);` protects a route that does not exist in any route handler in `server/routes/`. The actual session issuance endpoint is `/api/research/session/start`.
   - **Action:** Delete `generalSessionsLimiter` and its registration line.
2. **Unused Protocol Validators in Production:**
   - **Location:** [src/lib/protocolValidators.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L1-L388).
   - **Finding:** `isValidBaseObservation`, `isValidVisualReactionObservation`, `isValidDirectionObservation`, `isValidColorObservation`, and `isValidMemoryObservation` are standalone test utilities never imported by production route ingestion (`server/routes/researchRoutes.ts`) or client ingestion (`src/lib/dataset.ts`).
   - **Action:** Retain in test context; document or wire into ingestion validation gate.
3. **Leaky Session Repository Abstraction:**
   - **Location:** [server/repositories/firestore/firestoreSessionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts).
   - **Finding:** `FirestoreSessionRepository` does not encapsulate `consume` or session state updates; callers in `firestoreResearchSubmissionRepository.ts` directly manipulate `db.collection('experimentSessions')`.
   - **Action:** Add transactional `consume()` method to `ISessionRepository`.

---

## 4. Final Cycle 9 Actionable Remediation Plan

All 10 confirmed bugs satisfy the actionability threshold ($\ge 5$). The recommended implementation order:

1. **[BUG-C9-02] Mobile Bundle Cleanup:** Remove desktop `About` import in `mobile/src/App.tsx#L30` to instantly drop hundreds of KB of duplicated desktop components and test chunks from the mobile PWA build.
2. **[BUG-C9-01] Pre-Auth Rate Limit Security:** Enforce strict per-IP rate-limiting keys in `server/config/rateLimits.ts` to prevent forged JWT token rate-limit bypass and Firestore write quota burns.
3. **[BUG-C9-03] Rate Limit Store Fail-Closed:** Synchronize `memoryFallback` on transaction success in `server/config/firestoreRateLimitStore.ts` to prevent contention errors from resetting total hits to 1.
4. **[BUG-C9-04] Telemetry Accuracy Fix:** Prevent double multiplication of accuracy in `server/routes/researchRoutes.ts#L159` to stop 10,000% accuracy reports in Telegram.
5. **[BUG-C9-06 & BUG-C9-07] Outbox Worker Reliability:** In `server/services/telegramNotifierService.ts`, replace premature `break` with sleep and move `lastSendTime` update to `finally` to restore 18 msgs/min throughput and prevent rapid-fire error floods.
6. **[BUG-C9-08] Deduplication Map Eviction:** Add FIFO capacity eviction in `telegramNotifierService.ts#cleanExpiredDeduplicationKeys`.
7. **[BUG-C9-05] Personal Best Query Normalization:** Add `normalizeAssessmentType` in `server/routes/researchRoutes.ts#L74` and `personalBestService.ts#L9` to fix HTTP 400 rejection for British English.
8. **[BUG-C9-09] Protocol Validator Alias:** Add `'colour-recognition'` alias to `src/lib/protocolValidators.ts`.
9. **[BUG-C9-10] Session ID Regex Validation:** Add alphanumeric regex check to `server/services/sessionService.ts#L58`.
