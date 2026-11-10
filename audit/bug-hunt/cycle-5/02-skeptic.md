# Cycle 5: Bug Skeptic Report

**Date:** 2026-11-10  
**Agent Role:** Bug Skeptic (Cycle 5)  
**Subagent ID:** `c5b31d6f-b4b6-4123-89ae-e79cbbe1d04c`  
**Evaluation Scope:** Adversarial challenge of findings BUG-1 through BUG-3.

---

### Challenge Decisions

#### BUG-1 | Original: 5 pts
- **Counter-argument:** This is a real bug with meaningful impact. `server/routes/adminRoutes.ts` fails to catch `INVALID_CURSOR` from `getLeaderboardPage` / `getAllEntriesForAdminPage`. When a client passes an invalid or stale cursor, `firestoreLeaderboardRepository.ts` throws a native `new Error('INVALID_CURSOR')`. Because this error is not an instance of `AppError`, the route's error handler falls back to HTTP 500 (`Internal Server Error`) instead of returning HTTP 400 (`Bad Request`). In contrast, `server/routes/researchRoutes.ts` (lines 346 & 395) explicitly checks `if (errMsg === 'INVALID_CURSOR')` and returns HTTP 400. In production environments, unhandled 500 errors on client query validation fail API contract guarantees, skew error budgets, and trigger false-alarm APM alerts.
- **Evidence:**
`server/routes/adminRoutes.ts` lines 154-159:
```ts
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve admin leaderboard entries'
      });
    }
```
`server/repositories/firestore/firestoreLeaderboardRepository.ts` line 154:
```ts
      if (cursorIndex < 0) throw new Error('INVALID_CURSOR');
```
`server/routes/researchRoutes.ts` lines 345-348:
```ts
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'INVALID_CURSOR') {
          return res.status(400).json({ success: false, error: 'Invalid cursor parameter', records: [] });
        }
```
- **Confidence:** 20%
- **Risk calc:** EV = (20% x 5) - (80% x 10) = 1.0 - 8.0 = -7.0 pts
- **Decision:** ACCEPT

---

#### BUG-2 | Original: 1 pts
- **Counter-argument:** This is a speculative non-issue and a false positive. `scripts/capture-break-ui.mjs` is an unreferenced ad-hoc scratch script created for a one-off debugging session. It is NOT part of `package.json` scripts, NOT called by any build or test target, and NOT referenced anywhere in `.github/workflows/` (`leaderboard-regression.yml` or `typography-completion.yml`). The analyst's claim that this breaks "CI pipelines" is factually incorrect as CI never runs it. Furthermore, the hardcoded path `C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2` exists on the host machine. Frequency (1) × Impact (1) = 1 < 5.
- **Evidence:**
`package.json` lines 7-29 contains no entry for `capture-break-ui.mjs`.
`.github/workflows/` has zero references to `capture-break-ui.mjs`.
`Test-Path "C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2"` evaluates to `True`.
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 1) - (5% x 2) = 0.95 - 0.10 = +0.85 pts
- **Decision:** DISPROVE

---

#### BUG-3 | Original: 1 pts
- **Counter-argument:** This is a speculative non-issue and a false positive. The mobile leaderboard submission contract works as intended without runtime failure or data loss. In all mobile test components (`mobile/src/components/ReactionTest.tsx`, `BlockMemoryTest.tsx`, `ColorTest.tsx`, etc.), callers pass `idempotencyKey={sessionId}`. In `mobile/src/lib/firestore.ts`, `submitLeaderboardResult` intentionally handles this via `const activeSessionId = payload.sessionId || payload.idempotencyKey;` and dispatches `sessionId: activeSessionId` alongside `idempotencyKey: `${payload.idempotencyKey}-submit``. The backend receives both valid `sessionId` and `idempotencyKey` values. The claim that this "weakens contract guarantees" is an aesthetic critique regarding desktop-mobile prop symmetry with zero user or functional impact. Frequency (1) × Impact (1) = 1 < 5.
- **Evidence:**
`mobile/src/components/ReactionTest.tsx` lines 893-899:
```tsx
                <LeaderboardOptIn 
                  assessmentType="visual-reaction"
                  scoreMetric={reportStats.average}
                  ageGroup={selectedAgeGroup}
                  idempotencyKey={sessionId}
                  trials={rawObservationsRef.current}
                />
```
`mobile/src/lib/firestore.ts` lines 322-337:
```ts
    const activeSessionId = payload.sessionId || payload.idempotencyKey;
    const activeIdempotencyKey = payload.idempotencyKey ? `${payload.idempotencyKey}-submit` : safeRandomUUID();
    const trials = payload.trials || [];
    const res = await fetchWithAuth('/api/research/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assessmentType: payload.assessmentType,
        ageGroup: payload.ageGroup,
        deviceCategory: 'mobile',
        trials,
        sessionId: activeSessionId,
        idempotencyKey: activeIdempotencyKey,
        deviceId: getOrCreateDeviceId()
      })
    });
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 1) - (5% x 2) = 0.95 - 0.10 = +0.85 pts
- **Decision:** DISPROVE

---

**SUMMARY:**
- Bugs disproved: 2 (total points claimed: 2)
- Bugs accepted as real: 1
- Your final score: 2 pts

**ACCEPTED BUG LIST:**
- BUG-1 | Severity: Medium
