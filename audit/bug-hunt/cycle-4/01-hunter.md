# Cycle 4: Bug Hunter Report (Ponytail Senior Dev Lens)

**Date:** 2026-11-10  
**Agent Role:** Bug Hunter (Cycle 4)  
**Subagent ID:** `00279f88-efa8-4779-b9a4-cb5c499fae00`  
**Evaluation Scope:** Unexplored areas: `mobile/src/components/ColorTest.tsx`, `server/middleware/auth.ts`, `src/components/ReactionTest.tsx`, `server/services/personalBestService.ts`, `scripts/generate-seo-pages.mjs`, `scripts/dedupeLeaderboardBestPerOwner.ts`, `server/services/sessionService.ts`, and `server/middleware/security.ts`.

---

### Findings

#### BUG-1 | Severity: Critical | Points: 10
- **File:** `mobile/src/components/ColorTest.tsx`
- **Line(s):** 243-244, 274-278, 292-294, 322, 406-412
- **Category:** logic
- **Estimated Frequency (1-10):** 6
- **Estimated Impact (1-10):** 9
- **Risk Score:** 54
- **Claim:** Asynchronous React `useState` closures for trial stimuli (`currentWord`, `currentColor`, `currentInstruction`) cause fast participant responses to evaluate against and record stale trial stimuli into raw observations, triggering server-side PRNG validation failure (`wordName mismatch`) and complete rejection of the submission.
- **Evidence:** `startTrialSequence` updates stimuli via asynchronous React setters (`setCurrentWord(nextWord); setCurrentColor(nextColor); setCurrentInstruction(nextInstruction);`), but `executeTrigger` closes over state values:
```tsx
const expected = currentInstruction === 'WORD' ? currentWord.name : currentColor.name;
const correct = selectedColorName === expected;
...
rawObservationsRef.current.push({
  ...
  wordName: currentWord.name,
  wordColor: currentColor.name,
  instruction: currentInstruction,
...
}, [currentInstruction, currentWord, currentColor, sessionId, selectedAgeGroup]);
```

---

#### BUG-2 | Severity: Critical | Points: 10
- **File:** `server/middleware/auth.ts`
- **Line(s):** 7-12
- **Category:** security
- **Estimated Frequency (1-10):** 7
- **Estimated Impact (1-10):** 8
- **Risk Score:** 56
- **Claim:** `verifyFirebaseUserToken` uses a case-sensitive check `authHeader.startsWith('Bearer ')` and fragile string split, causing standard lowercase `bearer <token>` authorization headers sent by HTTP/2 clients, proxies, and API consumers to silently fail authentication with HTTP 401 across all authenticated research and leaderboard endpoints.
- **Evidence:**
```ts
export async function verifyFirebaseUserToken(req: express.Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) return null;
```

---

#### BUG-3 | Severity: Medium | Points: 5
- **File:** `src/components/ReactionTest.tsx`
- **Line(s):** 396-405, 621-629, 691-696
- **Category:** logic
- **Estimated Frequency (1-10):** 7
- **Estimated Impact (1-10):** 6
- **Risk Score:** 42
- **Claim:** Desktop `ReactionTest` pushes timed-out attempts (`>3000ms`) directly to `trialDatasetRef.current` while false starts are excluded, causing retries of the same trial to duplicate trial entries and pollute the client performance chart with phantom 0ms latency drops.
- **Evidence:**
```tsx
const newDataset: TrialData[] = [...trialDatasetRef.current, {
  trial: currentTrial,
  type: 'visual',
  latency: 0,
  rawLatency: 0,
  falseStart: false,
  timedOut: true
}];
setTrialDataset(newDataset); trialDatasetRef.current = newDataset;
...
} else if (engineStateRef.current === 'TRIAL_COMPLETE') {
  const isError = statusMessage === 'False Start' || statusMessage === 'Too Slow';
...
  startTrialSequence(isError);
```

---

#### BUG-4 | Severity: Medium | Points: 5
- **File:** `server/services/personalBestService.ts`
- **Line(s):** 8-15, 34-38
- **Category:** logic
- **Estimated Frequency (1-10):** 6
- **Estimated Impact (1-10):** 8
- **Risk Score:** 48
- **Claim:** `PersonalBestService.getPersonalBest` fails to normalize `assessmentType`, causing query lookups using common route aliases (e.g. `colour-recognition`, `reaction-test`, `direction-test`) to return null and erroneously reversing score comparisons to treat reaction latency as higher-is-better.
- **Evidence:**
```ts
async getPersonalBest(userId: string, assessmentType: string): Promise<number | null> {
  const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
  let best: number | null = null;

  try {
    const sessions = await this.sessionRepo.findUserConsumedSessions(userId, assessmentType);
```

---

#### BUG-5 | Severity: Medium | Points: 5
- **File:** `scripts/generate-seo-pages.mjs`
- **Line(s):** 254-257
- **Category:** logic
- **Estimated Frequency (1-10):** 10
- **Estimated Impact (1-10):** 5
- **Risk Score:** 50
- **Claim:** Sitemap generation logic embeds `<priority>0.8</priority>` in the `changefreq` ternary branch, causing all core application pages (home, assessments, leaderboard) to omit `<changefreq>` while all guide/benchmark pages omit `<priority>`.
- **Evidence:**
```js
const changefreq = pathname.startsWith('/guides') || pathname.startsWith('/benchmarks')
  ? '\n    <changefreq>monthly</changefreq>'
  : '\n    <priority>0.8</priority>';
return '  <url>\n' + loc + lastmod + changefreq + '\n  </url>';
```

---

#### BUG-6 | Severity: Medium | Points: 5
- **File:** `scripts/dedupeLeaderboardBestPerOwner.ts`
- **Line(s):** 76-80
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 7
- **Estimated Impact (1-10):** 6
- **Risk Score:** 42
- **Claim:** Deduplication migration only updates `leaderboardOwnerIndex` if the index points to the specific loser ID being processed, leaving owner indices permanently desynchronized if they were previously null or pointing to an older entry, while incrementing `superseded` count outside the transaction even when the transaction aborted.
- **Evidence:**
```ts
if (!indexSnap.exists || indexSnap.data()?.leaderboardDocId === loser.id) {
  tx.set(ownerIndexRef, { ownerUid: loser.ownerUid, assessmentType: loser.assessmentType, leaderboardDocId: winner.id, updatedAt: Date.now() }, { merge: true });
}
});
superseded++;
```

---

#### BUG-7 | Severity: Medium | Points: 5
- **File:** `server/services/sessionService.ts`
- **Line(s):** 67-72
- **Category:** error-handling
- **Estimated Frequency (1-10):** 5
- **Estimated Impact (1-10):** 5
- **Risk Score:** 25
- **Claim:** `SessionService.getAndValidateSession` returns HTTP 500 instead of HTTP 503 when the database is unavailable, preventing research submission callers from recognizing retryable infrastructure faults.
- **Evidence:**
```ts
} catch (err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (errMsg === 'DATABASE_UNAVAILABLE') {
    return { valid: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}`, status: 500 };
  }
  return { valid: false, error: 'Database error reading experiment session', status: 500 };
}
```

---

#### BUG-8 | Severity: Low | Points: 1
- **File:** `server/middleware/security.ts`
- **Line(s):** 15-21
- **Category:** security
- **Estimated Frequency (1-10):** 4
- **Estimated Impact (1-10):** 3
- **Risk Score:** 12
- **Claim:** URL prefix normalization for legacy API paths omits `/admin/leaderboard/edit-alias`, `/leaderboard/verify-submission`, `/leaderboard/my-rank`, and `/leaderboard/mine`, preventing un-prefixed requests from being routed to their respective API handlers.
- **Evidence:**
```ts
const isLegacyApiPath = [
  '/research', '/leaderboard/submit', '/leaderboard/verify-provenance',
  '/admin/login', '/admin/audit-log', '/admin/log-action', '/admin/audit-logs',
  '/admin/leaderboard/hide', '/admin/leaderboard/unhide',
  '/admin/leaderboard/delete', '/admin/leaderboard/all',
  '/health', '/personal-best', '/sessions'
].some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
```

---

**TOTAL FINDINGS:** 8  
**TOTAL SCORE:** 46  
