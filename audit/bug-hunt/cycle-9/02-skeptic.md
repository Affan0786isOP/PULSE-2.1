# PULSE v2.1 — Cycle 9 Bug Skeptic Adversarial Audit Report

**Auditor:** Bug Skeptic Agent (Cycle 9)  
**Methodology:** Ponytail Senior Dev Skeptic Audit (/ponytail-audit lens: ruthless verification of candidate findings, concurrency contention analysis under load, runtime trace verification, dependency tree leak analysis, and minimal surgical fixes)  
**Target Files Audited:**
1. `server/config/firestoreRateLimitStore.ts`
2. `server/config/rateLimits.ts`
3. `server/repositories/firestore/firestoreSessionRepository.ts`
4. `src/lib/protocolValidators.ts` & `mobile/src/lib/protocolValidators.ts`
5. `server/services/telegramNotifierService.ts`
6. `mobile/src/App.tsx`, `server/routes/researchRoutes.ts`, `server/services/personalBestService.ts`, `server/services/sessionService.ts`

---

## 1. Executive Summary & Verdict Classification Matrix

| ID | Candidate Finding Summary | Hunter Score | Skeptic Verdict | Realistic Freq (1–10) | Realistic Impact (1–10) | Skeptic Risk Score (F×I) | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C9-01** | Unverified client claims partitioning allows unauthenticated DoS floods and burns Firestore write quota | 64 | **CONFIRMED** | 7 | 8 | **56** | Actionable Defect |
| **BUG-C9-02** | Mobile lazy import of desktop About drags entire desktop app and all 9 desktop tests into mobile PWA bundle | 63 | **CONFIRMED** | 10 | 7 | **70** | Actionable Defect |
| **BUG-C9-03** | Firestore transaction contention error handler fails open, resetting hit counter to 1 under load | 56 | **CONFIRMED** | 6 | 8 | **48** | Actionable Defect |
| **BUG-C9-04** | Flanker & Stroop accuracy multiplied by 100 twice, reporting 10,000% accuracy in Telegram notifications | 54 | **CONFIRMED** | 9 | 6 | **54** | Actionable Defect |
| **BUG-C9-05** | Un-normalized `assessmentType` in Personal Best API rejects `colour-recognition` with HTTP 400 or inverts score logic | 49 | **CONFIRMED** *(Corrected)* | 5 | 6 | **30** | Actionable Defect |
| **BUG-C9-06** | Premature loop break in outbox worker caps dispatch to 1 msg per 5s tick, stalling notifications | 48 | **CONFIRMED** | 8 | 6 | **48** | Actionable Defect |
| **BUG-C9-07** | Stale `lastSendTime` on dispatch error triggers unthrottled rapid-fire request storm against Telegram API | 42 | **CONFIRMED** | 6 | 7 | **42** | Actionable Defect |
| **BUG-C9-08** | Unbounded deduplication map causes memory leak and $O(N)$ synchronous main-thread stall on every page view | 36 | **CONFIRMED** | 6 | 6 | **36** | Actionable Defect |
| **BUG-C9-09** | `isValidProtocolObservation` lacks `'colour-recognition'` alias in switch, rejecting valid observations | 36 | **CONFIRMED** *(Qualified)* | 4 | 4 | **16** | Actionable Defect |
| **BUG-C9-10** | Unsanitized forward slashes in `sessionId` crash Firestore document lookup with HTTP 500 instead of 400 | 25 | **CONFIRMED** | 3 | 4 | **12** | Actionable Defect |

---

## 2. Detailed Stress-Test & Skeptical Analysis

---

### BUG-C9-01: Unverified Client Claims Partitioning Allows Unauthenticated DoS Floods & Burns Firestore Write Quota

- **Source Links:** [server/config/rateLimits.ts#L10-L38](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L10-L38) and [server/config/rateLimits.ts#L206-L223](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L206-L223)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/config/rateLimits.ts#L10-L25](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L10-L25), `getUnverifiedUid` parses the middle segment of an `Authorization: Bearer <token>` header without cryptographic verification:
    ```ts
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { user_id?: unknown };
    const uid = typeof decoded.user_id === 'string' ? decoded.user_id : null;
    ```
  - In [server/config/rateLimits.ts#L32-L38](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L32-L38):
    ```ts
    function createLimiterKey(namespace: string, useUserIdentity: boolean) {
      return (req: Request): string => {
        const ip = normalizedRequestIp(req);
        const uid = useUserIdentity ? getUnverifiedUid(req) : null;
        const identity = uid ? `uid:${uid}:ip:${ip}` : `ip:${ip}`;
        return `${namespace}:${identity}`;
      };
    }
    ```
  - In [server/config/rateLimits.ts#L50-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L50-L72), `sessionStartLimiter`, `sessionSubmitLimiter`, and `leaderboardSubmitLimiter` all configure `createLimiterKey(..., true)`.
  - In [server/config/rateLimits.ts#L206-L223](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L206-L223), `applyRateLimits(app)` applies these limiters globally at lines 215, 217, and 218—**before** any authentication middleware runs.
  - An unauthenticated attacker can forge arbitrary tokens containing random `user_id` values (e.g. `user_id: "bot_1"`, `user_id: "bot_2"`, etc.).
  - **Rate Limit Bypass (CWE-807):** For every request, `createLimiterKey` generates a brand new key (`session-start:uid:bot_N:ip:x.x.x.x`). The 30-request quota is never exceeded, completely bypassing the route-level rate limiter.
  - **Firestore Free Quota Depletion / Denial of Service:** In `FirestoreRateLimitStore`, each unique key creates a separate counter document in `_rateLimitCounters` using `runTransaction()`. Generating 20,000 distinct fake user IDs executes 20,000 Firestore transaction writes, exhausting the entire free-tier daily write quota of Google Cloud Firestore without the attacker ever holding a valid Firebase account.
  - The fallback `generalApiLimiter` has a ceiling of 2,000 requests per 15 minutes per IP, which still permits an attacker to consume 16,000 Firestore writes in 2 hours from a single IP address.
- **Verdict:** **CONFIRMED** (Realistic Freq: 7 × Impact: 8 = **56**).
- **Minimal Surgical Fix:**
  In `server/config/rateLimits.ts`, do not permit unverified client JWT claims to bypass IP rate-limiting boundaries. Either enforce an outer per-IP limit or restrict rate-limit partitioning before authentication strictly to IP address:
  ```ts
  function createLimiterKey(namespace: string, useUserIdentity: boolean) {
    return (req: Request): string => {
      const ip = normalizedRequestIp(req);
      // Pre-auth rate limiters must enforce strict per-IP boundaries to prevent quota depletion
      return `${namespace}:ip:${ip}`;
    };
  }
  ```

---

### BUG-C9-02: Mobile Lazy Import of Desktop About Drags Entire Desktop App and All 9 Desktop Tests into Mobile PWA Bundle

- **Source Links:** [mobile/src/App.tsx#L30](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L30) and [tests/unit/sharedLibraryParity.test.ts#L23-L31](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/tests/unit/sharedLibraryParity.test.ts#L23-L31)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [mobile/src/App.tsx#L30](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/App.tsx#L30):
    ```ts
    const About = React.lazy(() => import('../../src/components/About').then(m => ({ default: m.About })));
    ```
  - Tracing the static and dynamic import tree from `src/components/About.tsx`:
    1. `src/components/About.tsx#L12` imports `PageShell` from `./layout/PageShell`.
    2. `src/components/layout/PageShell.tsx#L3` imports `Navbar` from `../Navbar`.
    3. `src/components/Navbar.tsx#L10` imports `preloadRoute` from `../lib/routeTheme`.
    4. `src/components/Navbar.tsx#L14-L16` lazy-imports `SettingsModal`, `WelcomeModal`, and `AddToHomeScreenModal`.
    5. `src/lib/routeTheme.ts#L24-L56` dynamically imports all 9 desktop assessment components: `Assessments`, `About`, `Leaderboard`, `Improve`, `ReactionTest`, `DirectionTest`, `BlockMemoryTest`, `NumberMemoryTest`, and `ColorTest`.
  - We verified the build output in `dist/mobile/assets/`:
    The Rollup/Vite bundler emitted **duplicate chunks for every desktop component** into the mobile PWA build:
    - `BlockMemoryTest-BJDBptSS.js` (desktop) AND `BlockMemoryTest-DfPKYpHZ.js` (mobile)
    - `ColorTest-CTHwHSKf.js` (desktop) AND `ColorTest-CN-vg8Bx.js` (mobile)
    - `DirectionTest-g8oyHK1F.js` (desktop) AND `DirectionTest-CoCv2JW8.js` (mobile)
    - `ReactionTest-C5NgLjWF.js` (desktop) AND `ReactionTest-DFJDvhMd.js` (mobile)
    - `NumberMemoryTest-Bd9FL4B0.js` (desktop) AND `NumberMemoryTest-DXn9TMXz.js` (mobile)
    - `Improve-Rom1ruUv.js` (desktop) AND `Improve-DVW5xqG9.js` (mobile)
    - `Leaderboard-D5AIRfFl.js` (desktop) AND `Leaderboard-DoC5Pz9p.js` (mobile)
    - `SettingsModal-BgTvPnZQ.js` (desktop) AND `SettingsModal-Dgy6L9pA.js` (mobile)
    - `AddToHomeScreenModal-Dq2CXjbM.js` (desktop) AND `AddToHomeScreenModal-IATDk4qJ.js` (mobile)
    - `About-Bpw246cx.js` (41.5 KB desktop chunk)
  - This completely defeats the architectural guard in [tests/unit/sharedLibraryParity.test.ts#L23-L31](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/tests/unit/sharedLibraryParity.test.ts#L23-L31) (`confirms mobile routeTheme.ts preloads mobile chunks, not desktop components`) and inflates mobile asset payload by hundreds of kilobytes.
- **Verdict:** **CONFIRMED** (Realistic Freq: 10 × Impact: 7 = **70**).
- **Minimal Surgical Fix:**
  In `mobile/src/App.tsx`, remove the import of desktop `../../src/components/About`. Render `ResearchPrivacyPolicy` or navigate to `/` for `/about` on mobile:
  ```tsx
  // mobile/src/App.tsx#L30
  // Remove desktop About import; redirect mobile /about or render mobile privacy policy
  <Route path="/about" element={<GuardedNavigate to="/" replace />} />
  ```

---

### BUG-C9-03: Firestore Transaction Contention Error Handler Fails Open, Resetting Hit Counter to 1 Under Load

- **Source Links:** [server/config/firestoreRateLimitStore.ts#L46-L73](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L46-L73)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/config/firestoreRateLimitStore.ts#L46-L61](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L46-L61), `increment` runs a Firestore transaction on `_rateLimitCounters/<hash>`.
  - Under concurrent request bursts for the same rate limit key, Firestore transactions contend. After 5 failed transaction retries, the SDK throws an abort exception.
  - In [server/config/firestoreRateLimitStore.ts#L62-L73](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/firestoreRateLimitStore.ts#L62-L73):
    ```ts
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
  - During normal execution, prior requests write only to Firestore; `this.memoryFallback` is never populated.
  - When transaction contention triggers `catch (err)`, `this.memoryFallback.get(key)` returns `undefined`.
  - The fallback resets the counter to `{ count: 1, resetAt: resetTime }` and returns `{ totalHits: 1, resetTime }`.
  - `express-rate-limit` checks if `totalHits <= max` (e.g. `1 <= 30`), evaluates to `true`, and permits the request through.
  - Even if the participant had already exhausted 29 or 30 hits in Firestore, high burst concurrency causes the rate limiter to fail open and allow unlimited throughput.
- **Verdict:** **CONFIRMED** (Realistic Freq: 6 × Impact: 8 = **48**).
- **Minimal Surgical Fix:**
  In `server/config/firestoreRateLimitStore.ts`, keep `this.memoryFallback` synchronized with `totalHits` on successful transactions, and fail closed or estimate conservatively in `catch`:
  ```ts
  // In transaction success block (line 60):
  this.memoryFallback.set(key, { count: totalHits, resetAt: resetTime });

  // In catch block:
  const fallbackCount = existing && existing.resetAt.getTime() > now ? existing.count + 1 : 2;
  this.memoryFallback.set(key, { count: fallbackCount, resetAt: resetTime });
  return { totalHits: fallbackCount, resetTime };
  ```

---

### BUG-C9-04: Flanker & Stroop Accuracy Multiplied by 100 Twice, Reporting 10,000% Accuracy in Telegram Notifications

- **Source Links:** [server/routes/researchRoutes.ts#L159](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159), [server/engines/flankerCalculator.ts#L194](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L194), [server/engines/stroopCalculator.ts#L242](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L242), and [server/services/telegramNotifierService.ts#L188-L201](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L188-L201)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/engines/flankerCalculator.ts#L194](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L194):
    `const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;`
  - In [server/engines/stroopCalculator.ts#L242](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L242):
    `const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;`
  - Both calculation engines output `accuracy` already scaled to a 0–100 percentage (e.g. `100` for 100%, `93.33` for 93.33%). Neither engine exports `accuracyPercentage`.
  - In [server/routes/researchRoutes.ts#L159](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L159):
    ```ts
    accuracyPercentage: typeof dm.accuracyPercentage === 'number' ? dm.accuracyPercentage : (typeof dm.accuracy === 'number' ? dm.accuracy * 100 : null)
    ```
    Because `dm.accuracyPercentage` is undefined, `dm.accuracy * 100` computes `100 * 100 = 10000`.
  - In [server/services/telegramNotifierService.ts#L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L188) and [line 196](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L196):
    ```ts
    const accuracy = typeof m.accuracyPercentage === 'number' ? `${Math.round(m.accuracyPercentage)}%` : 'N/A';
    ```
  - The resulting Telegram notification renders:
    `• Accuracy: 10000%` or `• Accuracy: 9333%`.
  - The bug was masked in unit testing (`server/services/telegramNotifierService.test.ts#L66`) because the test mocked `accuracyPercentage: 95.0` directly rather than running the route pipeline.
- **Verdict:** **CONFIRMED** (Realistic Freq: 9 × Impact: 6 = **54**).
- **Minimal Surgical Fix:**
  In `server/routes/researchRoutes.ts#L159`, check if `dm.accuracy` is already on the 0–100 scale:
  ```ts
  accuracyPercentage: typeof dm.accuracyPercentage === 'number'
    ? dm.accuracyPercentage
    : (typeof dm.accuracy === 'number' ? (dm.accuracy <= 1 ? dm.accuracy * 100 : dm.accuracy) : null),
  ```

---

### BUG-C9-05: Un-normalized `assessmentType` in Personal Best API Rejects `colour-recognition` with HTTP 400 or Inverts Score Logic

- **Source Links:** [server/routes/researchRoutes.ts#L74-L81](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L74-L81), [server/config/constants.ts#L11-L17](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/constants.ts#L11-L17), and [server/services/personalBestService.ts#L8-L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/personalBestService.ts#L8-L13)
- **Skeptic Stress-Test & Codebase Verification:**
  - *Correction to Hunter's Runtime Description:* Hunter stated that `GET /api/personal-best?assessmentType=colour-recognition` runs Firestore queries and returns `{ success: true, personalBest: null }`.
  - Code inspection reveals an earlier failure in [server/routes/researchRoutes.ts#L74-L77](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L74-L77):
    ```ts
    const { assessmentType } = req.query || {};
    if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
    }
    ```
    In [server/config/constants.ts#L11-L17](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/constants.ts#L11-L17), `VALID_ASSESSMENT_TYPES` contains `['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory']`. It does **not** include `'colour-recognition'`.
    Therefore, calling `/api/personal-best?assessmentType=colour-recognition` is rejected with **HTTP 400**.
  - Additionally, if `PersonalBestService.getPersonalBest` is called with `'colour-recognition'`:
    In [server/services/personalBestService.ts#L9](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/personalBestService.ts#L9):
    ```ts
    const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
    ```
    Because `'colour-recognition' !== 'color-recognition'`, `isLowerBetter` evaluates to `false` (inverting the reaction-time scoring rule), and `findUserConsumedSessions(userId, 'colour-recognition')` queries Firestore for documents that were stored with `'color-recognition'`, returning 0 results.
  - Across PULSE (`sessionService.ts`, `leaderboardAppService.ts`), `normalizeAssessmentType` is systematically called to canonicalize `'colour-recognition'` -> `'color-recognition'`. It was omitted from `researchRoutes.ts#L74` and `personalBestService.ts#L8`.
- **Verdict:** **CONFIRMED** *(Corrected: returns HTTP 400 rather than 200 with null)* (Realistic Freq: 5 × Impact: 6 = **30**).
- **Minimal Surgical Fix:**
  In `server/routes/researchRoutes.ts` and `server/services/personalBestService.ts`, normalize `assessmentType`:
  ```ts
  // server/routes/researchRoutes.ts
  const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType : '';
  const canonicalType = normalizeAssessmentType(rawType) || rawType;
  if (!VALID_ASSESSMENT_TYPES.includes(canonicalType)) {
    return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
  }
  const best = await services.personalBestService.getPersonalBest(verifiedUser.uid, canonicalType);
  ```

---

### BUG-C9-06: Premature Loop Break in Outbox Worker Caps Dispatch to 1 Msg per 5s Tick, Stalling Notifications

- **Source Links:** [server/services/telegramNotifierService.ts#L404-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L404-L410) and [server/services/telegramNotifierService.ts#L129-L136](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L129-L136)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/services/telegramNotifierService.ts#L130-L132](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L130-L132), the background worker timer runs every 5000ms:
    ```ts
    this.workerTimer = setInterval(() => { void this.processOutbox(); }, 5000);
    ```
  - In [server/services/telegramNotifierService.ts#L404-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L404-L410):
    ```ts
    for (const record of dueRecords) {
      // Enforce chat-wide rate limiting
      const timeSinceLast = Date.now() - this.lastSendTime;
      if (!ignoreInterval && timeSinceLast < this.minSendIntervalMs) {
        break; // Yield to next loop iteration
      }
    ```
  - Suppose 5 messages are queued in `dueRecords`.
  - Message 1 is dispatched; at line 418, `this.lastSendTime = Date.now()` is set.
  - The `for` loop advances to Message 2.
  - `timeSinceLast = Date.now() - this.lastSendTime` evaluates to ~0ms.
  - Since `0 < 3333` is true, the code executes `break;`.
  - `break` exits the entire `for` loop, terminating `processOutbox()`.
  - Consequently, **`processOutbox` will never dispatch more than 1 single message per tick**, strictly capping outbox throughput to 12 messages per minute (1 per 5s) instead of the designed ~18 msgs/min (`minSendIntervalMs = 3333`).
  - During bursts of page visits and assessment submissions, backlog steadily builds up until `MAX_OUTBOX_CAPACITY` (200) is exceeded, whereupon `ensureCapacity` drops messages permanently.
- **Verdict:** **CONFIRMED** (Realistic Freq: 8 × Impact: 6 = **48**).
- **Minimal Surgical Fix:**
  If `timeSinceLast < this.minSendIntervalMs`, wait for the remaining rate-limit interval instead of breaking:
  ```ts
  if (!ignoreInterval && timeSinceLast < this.minSendIntervalMs) {
    await new Promise(resolve => setTimeout(resolve, this.minSendIntervalMs - timeSinceLast));
  }
  ```

---

### BUG-C9-07: Stale `lastSendTime` on Dispatch Error Triggers Unthrottled Rapid-Fire Request Storm Against Telegram API

- **Source Links:** [server/services/telegramNotifierService.ts#L414-L439](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L414-L439)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/services/telegramNotifierService.ts#L414-L422](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L414-L422):
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
      ...
    }
    ```
  - `this.lastSendTime = Date.now()` at line 418 is placed strictly inside the `try` block after `dispatchMessage` succeeds.
  - When Telegram returns an error (e.g. HTTP 429 Too Many Requests, 502 Bad Gateway, or connection timeout), `dispatchMessage` throws.
  - Line 418 is skipped and execution jumps to `catch (err)`.
  - In `catch`, `this.lastSendTime` is **never updated**.
  - The loop continues to the next record in `dueRecords`.
  - For record 2, `timeSinceLast = Date.now() - this.lastSendTime` evaluates against the old timestamp (from minutes or seconds prior).
  - The check `timeSinceLast < this.minSendIntervalMs` evaluates to `false`.
  - Record 2 is dispatched immediately with 0ms delay.
  - If record 2 also fails, records 3, 4, 5... are all dispatched back-to-back in an unthrottled burst against Telegram's failing or rate-limiting endpoint.
  - This turns transient errors or 429 warnings into severe rate-limit lockouts.
- **Verdict:** **CONFIRMED** (Realistic Freq: 6 × Impact: 7 = **42**).
- **Minimal Surgical Fix:**
  Update `this.lastSendTime` regardless of dispatch outcome using a `finally` block or updating before dispatch:
  ```ts
  try {
    await this.dispatchMessage(record);
    record.state = 'sent';
    record.sentAt = Date.now();
    this.outbox.delete(record.id);
    this.saveRecent(record);
    processed += 1;
  } catch (err: unknown) {
    // error handling
  } finally {
    this.lastSendTime = Date.now();
  }
  ```

---

### BUG-C9-08: Unbounded Deduplication Map Causes Memory Leak & $O(N)$ Synchronous Main-Thread Stall on Every Page View

- **Source Links:** [server/services/telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382) and [server/services/telegramNotifierService.ts#L276-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L276-L283)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/services/telegramNotifierService.ts#L276-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L276-L283):
    ```ts
    const now = Date.now();
    this.cleanExpiredDeduplicationKeys(now);
    if (this.pageViewEventIds.has(event.eventId)) {
      return { success: true, deduplicated: true };
    }
    this.pageViewEventIds.set(event.eventId, now + 48 * 60 * 60 * 1000);
    ```
  - In [server/services/telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382):
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
  - Every page view is assigned an expiration of `now + 48 hours`.
  - Under active traffic (> 2,000 page views over 48 hours):
    1. Zero keys have expired (`expiry <= now` is `false`).
    2. `cleanExpiredDeduplicationKeys` executes a synchronous loop over all entries in `pageViewEventIds` on **every single incoming page-view HTTP request**.
    3. Zero keys are deleted.
    4. The map size grows to 5,000, 10,000, 25,000+ entries.
    5. Every subsequent request blocks Node.js's single-threaded event loop traversing tens of thousands of unexpired entries.
  - Unlike `FirestoreRateLimitStore` (which enforces a FIFO eviction cap when `size >= 2000`), `telegramNotifierService` has no capacity ceiling.
- **Verdict:** **CONFIRMED** (Realistic Freq: 6 × Impact: 6 = **36**).
- **Minimal Surgical Fix:**
  Add a strict FIFO capacity eviction cap in `cleanExpiredDeduplicationKeys`:
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

- **Source Links:** [src/lib/protocolValidators.ts#L389-L410](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L389-L410) and [src/lib/protocolValidators.ts#L301-L306](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L301-L306)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [src/lib/protocolValidators.ts#L389-L402](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts#L389-L402):
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
  - When `obs.assessmentType === 'colour-recognition'`, `targetProtocol` fails to match `case 'color-recognition':` and drops into `default:`.
  - In `default:`, `isValidColorObservation(obs)` is called. At line 304:
    `if (obs.assessmentType !== 'color-recognition') return false;`
    Because `obs.assessmentType` is `'colour-recognition'`, it returns `false`.
    All other validators return `false`. `isValidProtocolObservation` returns `false`, rejecting valid observations.
  - Furthermore, if `protocolFilter = 'colour-recognition'` is passed to filter a dataset, it falls into `default:` and evaluates `true` for Reaction, Direction, and Memory observations, completely breaking filter isolation.
  - *Skeptic Qualification:* In the current codebase, `isValidProtocolObservation` is only invoked in unit test suites (`tests/unit/protocolValidators.test.ts`), not in active client rendering routes. However, as an exported public utility in the shared validation library, the logic defect is real.
- **Verdict:** **CONFIRMED** *(Qualified on test-only reachability)* (Realistic Freq: 4 × Impact: 4 = **16**).
- **Minimal Surgical Fix:**
  In `src/lib/protocolValidators.ts`, add `case 'colour-recognition':` and accept the alias in `isValidColorObservation`:
  ```ts
  // Line 304:
  if (obs.assessmentType !== 'color-recognition' && obs.assessmentType !== 'colour-recognition') return false;

  // Line 398:
  case 'color-recognition':
  case 'colour-recognition':
    return isValidColorObservation(obs);
  ```

---

### BUG-C9-10: Unsanitized Forward Slashes in `sessionId` Crash Firestore Document Lookup with HTTP 500 Instead of 400

- **Source Links:** [server/services/sessionService.ts#L58-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L58-L72) and [server/repositories/firestore/firestoreSessionRepository.ts#L8-L18](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts#L8-L18)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [server/services/sessionService.ts#L58-L60](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L58-L60):
    ```ts
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.trim().length > 128) {
      return { valid: false, error: 'Missing or invalid session ID', status: 400 };
    }
    ```
  - In [server/repositories/firestore/firestoreSessionRepository.ts#L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreSessionRepository.ts#L13):
    ```ts
    const snap = await db.collection('experimentSessions').doc(sessionId).get();
    ```
  - In the Google Cloud Firestore Node.js SDK, `.doc(path)` parses forward slashes as subcollection paths.
  - If a client or automated fuzzer passes a `sessionId` containing an odd number of slashes (e.g. `doc('foo/bar')`), Firestore throws:
    `Value for argument "documentPath" must point to a document, but was "experimentSessions/foo/bar". Your path does not contain an even number of components.`
  - `sessionService.ts` catches this SDK exception and returns:
    `{ valid: false, error: 'Database error reading experiment session', status: 500 }`.
  - Malformed client input causes an unhandled database exception that manifests as HTTP 500 Internal Server Error rather than an immediate HTTP 400 Bad Request.
- **Verdict:** **CONFIRMED** (Realistic Freq: 3 × Impact: 4 = **12**).
- **Minimal Surgical Fix:**
  In `server/services/sessionService.ts#L58`, enforce an alphanumeric/safe format regex:
  ```ts
  if (!sessionId || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId.trim())) {
    return { valid: false, error: 'Missing or invalid session ID', status: 400 };
  }
  ```

---

## 3. Ponytail Bloat & Dead Code Audit Review

The Skeptic reviewed the 3 bloat and dead-code findings identified by the Hunter:

1. **Dead Rate Limiter on `/api/sessions`:**
   - **Hunter Finding:** `app.use('/api/sessions', generalSessionsLimiter);` at [rateLimits.ts#L216](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/config/rateLimits.ts#L216) protects a non-existent route.
   - **Skeptic Verification:** Confirmed. There is no route handler for `/api/sessions` anywhere in `server/routes/`. The actual session route is `/api/research/session/start`. `generalSessionsLimiter` is dead code.
2. **Unused Protocol Validators in Production:**
   - **Hunter Finding:** Protocol validators (`isValidBaseObservation`, `isValidVisualReactionObservation`, etc.) in `src/lib/protocolValidators.ts` are never invoked by production ingestion or display pipelines.
   - **Skeptic Verification:** Confirmed. They are only invoked in unit tests.
3. **Fragmented Direct Firestore Access for Session Mutations:**
   - **Hunter Finding:** `FirestoreSessionRepository` does not encapsulate `consume` or session state updates; callers directly access `db.collection('experimentSessions')`.
   - **Skeptic Verification:** Confirmed. Transactional consumption in `firestoreResearchSubmissionRepository.ts` directly manipulates `experimentSessions` documents, violating repository abstraction encapsulation.
