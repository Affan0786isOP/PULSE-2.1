# Cycle 2: Bug Hunter Report (Ponytail Senior Dev Lens)

**Date:** 2026-11-10  
**Agent Role:** Bug Hunter (Cycle 2)  
**Subagent ID:** `b11a39f9-98f7-4b5f-b98a-d265ad3158a4`  
**Evaluation Scope:** Unexplored areas: `server.ts`, `server/routes/`, `server/services/`, `server/repositories/`, `src/lib/`, and `mobile/src/components/`.

---

### Findings

#### BUG-1 | Severity: Medium | Points: 5
- **File:** `server/routes/researchRoutes.ts`
- **Line(s):** 162-163
- **Category:** logic
- **Estimated Frequency (1-10):** 10
- **Estimated Impact (1-10):** 5
- **Risk Score:** 50
- **Claim:** Telegram assessment completion notifications for Block Memory and Number Memory protocol completions always display "N/A" for span and level because `researchRoutes.ts` queries metric property names that do not match the calculator's return contract.
- **Evidence:**
```typescript
// server/routes/researchRoutes.ts (lines 162-163):
maxSpan: typeof dm.maxSpan === 'number' ? dm.maxSpan : null,
highestLevelAchieved: typeof dm.highestLevelAchieved === 'number' ? dm.highestLevelAchieved : null

// server/engines/memoryCalculator.ts (lines 189-190, 276-277):
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

---

#### BUG-2 | Severity: Low | Points: 1
- **File:** `server/routes/researchRoutes.ts`
- **Line(s):** 160
- **Category:** logic
- **Estimated Frequency (1-10):** 10
- **Estimated Impact (1-10):** 3
- **Risk Score:** 30
- **Claim:** Direction assessment Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because `researchRoutes.ts` expects `dm.conflictCost` which is never computed or returned by `flankerCalculator.ts`.
- **Evidence:**
```typescript
// server/routes/researchRoutes.ts (line 160):
conflictCostMs: typeof dm.conflictCost === 'number' ? dm.conflictCost : null

// server/engines/flankerCalculator.ts (lines 210-221):
const derivedMetrics: Record<string, any> = {
  accuracy,
  totalCorrect,
  totalTrials: 10,
  totalIncorrect: Math.max(0, 10 - totalCorrect),
  totalFalseStarts: falseStartsCount
};
if (avg !== null) derivedMetrics.averageReactionTime = avg;

// server/services/telegramNotifierService.ts (lines 189, 193):
const conflict = typeof m.conflictCostMs === 'number' ? `${Math.round(m.conflictCostMs)} ms` : 'N/A';
metricsBlock = `• <b>Mean RT:</b> ${mean}\n• <b>Accuracy:</b> ${accuracy}\n• <b>Conflict Cost:</b> ${conflict}`;
```

---

#### BUG-3 | Severity: Medium | Points: 5
- **File:** `server/index.ts`
- **Line(s):** 73, 76-80, 89
- **Category:** error-handling
- **Estimated Frequency (1-10):** 3
- **Estimated Impact (1-10):** 6
- **Risk Score:** 18
- **Claim:** The centralized Express error handler is registered asynchronously after awaiting static route registration during un-awaited server boot, causing serverless cold starts or route errors to leak raw stack traces to clients.
- **Evidence:**
```typescript
// server/index.ts (lines 72-80, 89-90):
applyDeviceRoutingMiddleware(app);
await registerStaticRoutes(app);

// Centralized Global Error Handler (Prevents stack trace leaks to client)
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Unhandled Error]:', err instanceof Error ? err.message : String(err));
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: 'An unexpected internal server error occurred' });
});
...
startServer();
export default app;
```

---

#### BUG-4 | Severity: Medium | Points: 5
- **File:** `src/lib/trialStore.ts`
- **Line(s):** 226-255, 276-283
- **Category:** security
- **Estimated Frequency (1-10):** 8
- **Estimated Impact (1-10):** 5
- **Risk Score:** 40
- **Claim:** `trialStore.ts` attempts direct client Firestore batch writes to `/trialObservations`, which are unconditionally blocked with permission-denied by Firestore security rules, repeatedly re-queueing failed items and retrying on window exit.
- **Evidence:**
```typescript
// src/lib/trialStore.ts (lines 226-253):
const batch = writeBatch(db);
for (const obs of chunk) {
  const docRef = doc(db, 'trialObservations', obs.id);
  batch.set(docRef, { ... });
}
await batch.commit();
...
} catch (err: any) {
  // Re-queue items on failure for later retry
  pendingSyncQueue = [...itemsToSync, ...pendingSyncQueue];
  console.debug('Batch cloud sync trial observation info:', err?.message || err);
}

// firestore.rules (lines 34-37):
match /trialObservations/{docId} {
  allow read: if request.auth != null && resource.data.participantId == request.auth.uid;
  allow write: if false; // Server authoritative
}
```

---

#### BUG-5 | Severity: Medium | Points: 5
- **File:** `server/repositories/firestore/firestoreLeaderboardRepository.ts`
- **Line(s):** 30-49, 138-140
- **Category:** performance
- **Estimated Frequency (1-10):** 5
- **Estimated Impact (1-10):** 7
- **Risk Score:** 35
- **Claim:** `getAllEntriesForAdminPage` reads the entire `leaderboardResults` Firestore collection into memory on every admin page view, which is repeatedly invoked inside a `while` loop when filtering in `adminService.ts`.
- **Evidence:**
```typescript
// server/repositories/firestore/firestoreLeaderboardRepository.ts (lines 38-47, 138-139):
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

// server/services/adminService.ts (lines 105-106):
while (matchingEntries.length < safeLimit) {
  const page = await this.leaderboardRepo.getAllEntriesForAdminPage(safeLimit, currentCursor);
  ...
  currentCursor = page.nextCursor;
}
```

---

#### BUG-6 | Severity: Medium | Points: 5
- **File:** `server/config/firestoreRateLimitStore.ts`
- **Line(s):** 48-59
- **Category:** concurrency
- **Estimated Frequency (1-10):** 4
- **Estimated Impact (1-10):** 6
- **Risk Score:** 24
- **Claim:** The shared `FirestoreRateLimitStore` attached to the global API rate limiter updates a single document per client IP via Firestore transactions, which aborts under concurrent requests from shared IPs due to Firestore's 1 write/second per document limit.
- **Evidence:**
```typescript
// server/config/firestoreRateLimitStore.ts (lines 48-59):
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

// server/config/rateLimits.ts (lines 172, 222):
export const generalApiLimiter = rateLimit({
  ...
  store: createSharedStore(),
  ...
});
...
app.use(generalApiLimiter);
```

---

#### BUG-7 | Severity: Medium | Points: 5
- **File:** `mobile/src/components/ReactionTest.tsx`
- **Line(s):** 322-347, 489-514
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 10
- **Estimated Impact (1-10):** 4
- **Risk Score:** 40
- **Claim:** Mobile `ReactionTest.tsx` omits all high-precision timing telemetry fields (`stimulusScheduledAt`, `stimulusPresentedAt`, `responseDetectedAt`, `interStimulusIntervalMs`, `interTrialIntervalMs`, and ISO `timestamp`) that desktop `ReactionTest.tsx` populates, degrading research trial records submitted from mobile devices.
- **Evidence:**
```typescript
// mobile/src/components/ReactionTest.tsx (lines 489-514):
rawObservationsRef.current.push({
  trialIndex: obsIndex4,
  attemptNumber: attemptNumberRef.current,
  sequenceNumber: obsIndex4,
  experimentId: sessionId,
  condition: 'standard-visual',
  test: 'visual-reaction',
  trialNumber: currentTrial,
  foreperiodMs: scheduledForeperiodMsRef.current,
  foreperiodCategory: scheduledForeperiodCategoryRef.current,
  stimulusTimestamp: stimWall,
  responseTimestamp: responseWallTime,
  reactionTime: netLatency,
  reactionTimeMs: netLatency,
  rawReactionTime: Number(rawLatency.toFixed(2)),
  rawLatencyMs: Number(rawLatency.toFixed(2)),
  displayDelayOffsetMs: null,
  displayDelayOffsetEstimated: null,
  displayDelayOffsetSource: null,
  accuracy: 1,
  falseStart: false,
  timedOut: false,
  valid: true,
  ageGroup: selectedAgeGroup || undefined
});
```

---

**TOTAL FINDINGS:** 7  
**TOTAL SCORE:** 31  
