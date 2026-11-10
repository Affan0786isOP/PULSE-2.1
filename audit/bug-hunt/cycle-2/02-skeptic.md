# Cycle 2: Bug Skeptic Report

**Date:** 2026-11-10  
**Agent Role:** Bug Skeptic (Cycle 2)  
**Subagent ID:** `cb9fa1f3-801f-4880-be37-2c1b297bac07`  
**Evaluation Scope:** Adversarial challenge of findings BUG-1 through BUG-7.

---

### Challenge Decisions

#### BUG-1 | Original: 5 pts
- **Counter-argument:** None. The claim is verified. `server/engines/memoryCalculator.ts` returns derived metrics keyed as `longestSeq` and `highestLevel`, whereas `server/routes/researchRoutes.ts` queries `dm.maxSpan` and `dm.highestLevelAchieved`. Because these keys are missing from `derivedMetrics`, `maxSpan` and `highestLevelAchieved` are always null in the telemetry payload, causing Telegram notifications for block-memory and number-memory assessments to always display "N/A" for span and level. Frequency (10) × Impact (5) = 50.
- **Evidence:** `server/engines/memoryCalculator.ts` (lines 189-194, 276-281):
  ```typescript
  return {
    success: true,
    derivedMetrics: {
      highestLevel,
      longestSeq,
      totalCorrect,
      totalAttempts,
      overallAccuracy,
      totalTimeMs
    }
  };
  ```
  `server/routes/researchRoutes.ts` (lines 162-163):
  ```typescript
  maxSpan: typeof dm.maxSpan === 'number' ? dm.maxSpan : null,
  highestLevelAchieved: typeof dm.highestLevelAchieved === 'number' ? dm.highestLevelAchieved : null
  ```
- **Confidence:** 10%
- **Risk calc:** EV = (10% x 5) - (90% x 10) = -8.5
- **Decision:** ACCEPT

---

#### BUG-2 | Original: 1 pts
- **Counter-argument:** None. The claim is verified. `flankerCalculator.ts` implements a 4-direction choice RT protocol (UP/DOWN/LEFT/RIGHT) and does not compute or return `conflictCost`. Consequently, `dm.conflictCost` is undefined in `researchRoutes.ts`, `conflictCostMs` is set to `null`, and `telegramNotifierService.ts` formats it as `• Conflict Cost: N/A` on 100% of direction assessment notifications. Frequency (10) × Impact (3) = 30.
- **Evidence:** `server/engines/flankerCalculator.ts` (lines 210-221) returns `derivedMetrics` without `conflictCost`. `server/services/telegramNotifierService.ts` (lines 189, 193):
  ```typescript
  const conflict = typeof m.conflictCostMs === 'number' ? `${Math.round(m.conflictCostMs)} ms` : 'N/A';
  metricsBlock = `• <b>Mean RT:</b> ${mean}\n• <b>Accuracy:</b> ${accuracy}\n• <b>Conflict Cost:</b> ${conflict}`;
  ```
- **Confidence:** 5%
- **Risk calc:** EV = (5% x 1) - (95% x 2) = -1.85
- **Decision:** ACCEPT

---

#### BUG-3 | Original: 5 pts
- **Counter-argument:** Disproved. This is a speculative theoretical race-condition claim that cannot occur under realistic usage or Node.js runtime mechanics. In production / Vercel (`process.env.NODE_ENV === 'production'` or `process.env.VERCEL`), `registerStaticRoutes(app)` executes 100% synchronously (lines 69-234 contain no `await` expressions). Although the function is declared `async`, awaiting a resolved promise enqueues continuation on the microtask queue. Under Node.js / V8 module import semantics (`api/index.ts` importing `server.js`), all microtasks are drained synchronously upon module evaluation before any incoming HTTP request or serverless event can be processed. Furthermore, in standalone Node.js environments, `app.listen(PORT)` at line 83 is executed strictly after `app.use(errorHandler)` at lines 76-80. The 4-arity error handler is fully registered and active before any request arrives, returning sanitized 500 JSON and preventing stack trace leaks. Frequency (0) × Impact (0) = 0 (< 5).
- **Evidence:** `server/routes/staticRoutes.ts` (lines 69-234): The production branch contains no `await` statements.
  `server/index.ts` (lines 73-86):
  ```typescript
  applyDeviceRoutingMiddleware(app);
  await registerStaticRoutes(app);

  // Centralized Global Error Handler (Prevents stack trace leaks to client)
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Unhandled Error]:', err instanceof Error ? err.message : String(err));
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'An unexpected internal server error occurred' });
  });

  if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.NOW_REGION) {
    app.listen(PORT, '0.0.0.0', () => { ... });
  }
  ```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.50 = +4.25
- **Decision:** DISPROVE

---

#### BUG-4 | Original: 5 pts
- **Counter-argument:** None. The claim is verified. `trialStore.ts` invokes `queueTrialForCloudSync` on every recorded trial, which triggers `flushPendingTrialObservations` to batch-write to `doc(db, 'trialObservations', obs.id)`. However, `firestore.rules` lines 34-37 explicitly enforces `allow write: if false; // Server authoritative` for `/trialObservations/{docId}`. All client batch writes fail with `permission-denied`. In the `catch` block (lines 250-252), failed items are prepended back to `pendingSyncQueue`, causing repeated retries every 600ms, on subsequent trials, and on `beforeunload`/`pagehide`, accumulating memory and emitting continuous console errors. Frequency (8) × Impact (5) = 40.
- **Evidence:** `firestore.rules` (lines 34-37):
  ```
  match /trialObservations/{docId} {
    allow read: if request.auth != null && resource.data.participantId == request.auth.uid;
    allow write: if false; // Server authoritative
  }
  ```
  `src/lib/trialStore.ts` (lines 249-253):
  ```typescript
  } catch (err: any) {
    // Re-queue items on failure for later retry
    pendingSyncQueue = [...itemsToSync, ...pendingSyncQueue];
    console.debug('Batch cloud sync trial observation info:', err?.message || err);
  }
  ```
- **Confidence:** 10%
- **Risk calc:** EV = (10% x 5) - (90% x 10) = -8.5
- **Decision:** ACCEPT

---

#### BUG-5 | Original: 5 pts
- **Counter-argument:** None. The claim is verified. `getAllEntriesForAdminPage` invokes `this.getAllLeaderboardResultDocs(db)` (line 139), which pages through the entire `leaderboardResults` collection via a `while (true)` loop with pageSize 250, reading every document into memory before sorting and slicing. In `server/services/adminService.ts` (lines 105-129), a `while (matchingEntries.length < safeLimit)` loop repeatedly calls `getAllEntriesForAdminPage` whenever filters (`targetAssessment` or `prefix`) are applied. Each iteration reads the entire Firestore collection from scratch, creating an O(N * (N/pageSize)) quadratic Firestore read storm that causes severe latency, memory pressure, and excessive Firestore billing costs. Frequency (5) × Impact (7) = 35.
- **Evidence:** `server/repositories/firestore/firestoreLeaderboardRepository.ts` (lines 38-47, 138-139):
  ```typescript
  while (true) {
    let pageQuery = orderedQuery.limit(pageSize);
    if (cursor) pageQuery = pageQuery.startAfter(cursor);
    const snap = await pageQuery.get();
    if (snap.empty) break;
    docs.push(...snap.docs);
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
  ...
  const safeLimit = Number.isInteger(limitCount) ? Math.max(1, Math.min(limitCount, 250)) : 100;
  const docs = await this.getAllLeaderboardResultDocs(db);
  ```
  `server/services/adminService.ts` (lines 105-106):
  ```typescript
  while (matchingEntries.length < safeLimit) {
    const page = await this.leaderboardRepo.getAllEntriesForAdminPage(safeLimit, currentCursor);
  ```
- **Confidence:** 5%
- **Risk calc:** EV = (5% x 5) - (95% x 10) = -9.25
- **Decision:** ACCEPT

---

#### BUG-6 | Original: 5 pts
- **Counter-argument:** Disproved. The claim that concurrent requests abort due to Firestore's 1 write/sec document limit is false. `FirestoreRateLimitStore.increment` (lines 46-73) wraps the Firestore transaction inside a `try ... catch (err)` block. If Firestore transaction contention occurs, the error is caught, logged as a warning (`console.warn('[Rate limit store] Firestore counter error, falling back to memory counter...')`), and transparently falls back to an in-memory counter (`this.memoryFallback.get(key)`). The request is never aborted or rejected with HTTP 500; it completes normally with `{ totalHits, resetTime }`. Furthermore, authenticated endpoints partition keys by `uid:${uid}:ip:${ip}` (lines 33-38 of `rateLimits.ts`), preventing different users on shared IPs (e.g. university NATs) from colliding on the same document. Static assets and leaderboard reads are also skipped. This is a speculative non-issue already handled by design with fallback mechanisms. Realistic Frequency (1) × Impact (1) = 1 (< 5).
- **Evidence:** `server/config/firestoreRateLimitStore.ts` (lines 62-73):
  ```typescript
  } catch (err) {
    console.warn('[Rate limit store] Firestore counter error, falling back to memory counter:', err instanceof Error ? err.message : String(err));
    const existing = this.memoryFallback.get(key);
    if (!existing || existing.resetAt.getTime() <= now) {
      if (this.memoryFallback.size >= 2000) { ... }
      this.memoryFallback.set(key, { count: 1, resetAt: resetTime });
      return { totalHits: 1, resetTime };
    }
    existing.count += 1;
    return { totalHits: existing.count, resetTime: existing.resetAt };
  }
  ```
- **Confidence:** 90%
- **Risk calc:** EV = (90% x 5) - (10% x 10) = 4.5 - 1.0 = +3.5
- **Decision:** DISPROVE

---

#### BUG-7 | Original: 5 pts
- **Counter-argument:** None. The claim is verified. Comparing `mobile/src/components/ReactionTest.tsx` (lines 489-514) with desktop `src/components/ReactionTest.tsx` (lines 560-595) confirms that the mobile implementation completely omits high-precision timing telemetry fields: `stimulusScheduledAt`, `stimulusScheduledAtPerfMs`, `stimulusPresentedAt`, `stimulusPresentedAtPerfMs`, `responseDetectedAt`, `responseDetectedAtPerfMs`, `interStimulusIntervalMs`, `interTrialIntervalMs`, `previousTrialEndedAt`, and ISO `timestamp`. When submitted to `/api/research/submit`, `server/services/researchService.ts` (lines 308-327) inspects these specific fields; because they are missing from mobile trials, the persisted research records for mobile participants lack all sub-millisecond hardware paint timings and ISI/ITI metrics. Frequency (10) × Impact (4) = 40.
- **Evidence:** `mobile/src/components/ReactionTest.tsx` (lines 489-514) vs `src/components/ReactionTest.tsx` (lines 566-591). Desktop populates:
  ```typescript
  stimulusScheduledAt: Math.round(stimulusScheduledAtRef.current),
  stimulusScheduledAtPerfMs: Number(stimulusScheduledAtRef.current.toFixed(2)),
  stimulusPresentedAt: Math.round(stimPerf),
  stimulusPresentedAtPerfMs: Number(stimPerf.toFixed(2)),
  responseDetectedAt: Math.round(timeTriggered),
  responseDetectedAtPerfMs: Number(timeTriggered.toFixed(2)),
  interStimulusIntervalMs: isi,
  interTrialIntervalMs: iti,
  timestamp: new Date().toISOString()
  ```
  whereas mobile completely omits all of them.
- **Confidence:** 10%
- **Risk calc:** EV = (10% x 5) - (90% x 10) = -8.5
- **Decision:** ACCEPT

---

**SUMMARY:**
- Bugs disproved: 2 (total points claimed: 10)
- Bugs accepted as real: 5
- Final Score: 10 pts

**ACCEPTED BUG LIST:**
- BUG-1 (Severity: Medium, 5 pts)
- BUG-2 (Severity: Low, 1 pt)
- BUG-4 (Severity: Medium, 5 pts)
- BUG-5 (Severity: Medium, 5 pts)
- BUG-7 (Severity: Medium, 5 pts)
