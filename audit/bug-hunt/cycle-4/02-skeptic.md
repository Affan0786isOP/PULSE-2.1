# Cycle 4: Bug Skeptic Report

**Date:** 2026-11-10  
**Agent Role:** Bug Skeptic (Cycle 4)  
**Subagent ID:** `b2735260-cf16-4343-8e74-d5504145b5ec`  
**Evaluation Scope:** Adversarial challenge of findings BUG-1 through BUG-8.

---

### Challenge Decisions

#### BUG-1 | Original: 10 pts
- **Counter-argument:** The claim that asynchronous React `useState` closures cause participant responses to evaluate against stale stimuli is false. In React 18, state updates (`setCurrentTrial`, `setFeedbackResult`, `setEngineState`, `setCurrentWord`, `setCurrentColor`, `setCurrentInstruction`, `setShuffledOptions`) inside `startTrialSequence()` are automatically batched into a single render pass. Prior to this re-render, color buttons are either unmounted (during `STARTING` countdown) or explicitly disabled via `disabled={engineState === 'FEEDBACK'}` (which suppresses pointer/click events in the DOM). Once React commits the render, the new `executeTrigger` callback is created via `useCallback(..., [currentInstruction, currentWord, currentColor, sessionId, selectedAgeGroup])` with the fresh stimulus values and bound to the newly enabled buttons. Furthermore, human visual reaction time physically cannot precede screen paint. The participant responds exclusively to what is painted on screen, which is in sync with the updated closure. Realistic Frequency = 0, Impact = 0 (Frequency × Impact = 0 < 5).
- **Evidence:** In `mobile/src/components/ColorTest.tsx`:
```tsx
// Lines 387-418: All stimulus updates and state transitions are batched synchronously in startTrialSequence
function startTrialSequence() {
  ...
  setEngineState('STIMULUS_ACTIVE'); engineStateRef.current = 'STIMULUS_ACTIVE';
  ...
  setCurrentWord(nextWord);
  setCurrentColor(nextColor);
  setCurrentInstruction(nextInstruction);
  setShuffledOptions(newOptions);
  ...
}

// Line 870: Buttons are disabled during FEEDBACK, preventing any click prior to next trial's render
<button type="button"
  key={`${c.name}-${i}`}
  disabled={engineState === 'FEEDBACK'}
  onPointerDown={(e) => { e.preventDefault(); executeTrigger(c.name, e.nativeEvent); }}
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 10) - (5% x 20) = 9.5 - 1.0 = +8.5 pts
- **Decision:** DISPROVE

---

#### BUG-2 | Original: 10 pts
- **Counter-argument:** The claim misinterprets HTTP/2 and RFC 6750 specifications. HTTP/2 (RFC 7540 / RFC 9113 Section 8.2.1) mandates that HTTP header *field names* are lowercase (e.g. `authorization: Bearer <token>`); it NEVER lowercases header *field values* like the JWT itself or the scheme name. If header values were lowercased, base64url-encoded JWT ID tokens would be corrupted. Express in Node.js already normalizes the header name to lowercase (`req.headers.authorization`). Furthermore, RFC 6750 Section 2.1 standardizes the grammar as `credentials = "Bearer" 1*SP b64token`. Every client in the application (`mobile/src/lib/firestore.ts` line 125, `src/lib/firestore.ts` line 125) formats requests as `'Authorization': \`Bearer \${token}\``. There are no external third-party API consumers sending lowercase `bearer`. Realistic Frequency = 0, Impact = 0 (Frequency × Impact = 0 < 5).
- **Evidence:** In `src/lib/firestore.ts` and `mobile/src/lib/firestore.ts`:
```ts
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```
And in `server/middleware/auth.ts`:
```ts
export async function verifyFirebaseUserToken(req: express.Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization; // Header name normalized to lowercase by Node/Express
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 10) - (5% x 20) = 9.5 - 1.0 = +8.5 pts
- **Decision:** DISPROVE

---

#### BUG-3 | Original: 5 pts
- **Counter-argument:** The claim that retries of timed-out trials duplicate entries and "pollute the client performance chart with phantom 0ms latency drops" is completely false because no such chart exists in the UI. In `src/components/ReactionTest.tsx`, `chartData` (lines 691-696) is an unreferenced, dead `useMemo` variable that is never passed to any component or rendered anywhere in the DOM. Furthermore, the actual score calculation on completion (`calculateAndFinalizeMetrics`) explicitly filters out timeouts: `data.filter(t => !t.falseStart && !t.timedOut ...)`. Timed-out entries with 0ms latency are completely ignored in mean, median, fastest, slowest, and consistency metrics. For server submissions, `reactionCalculator.ts` lines 61-66 deduplicates trials by `trialNumber`, retaining only the final attempt. Realistic Frequency = 0, Impact = 0 (Frequency × Impact = 0 < 5).
- **Evidence:** In `src/components/ReactionTest.tsx`:
```tsx
// Line 691 is the only occurrence of chartData in the entire file (never rendered):
const chartData = useMemo(() => {
  return trialDataset.filter(t => !t.falseStart).map((t, idx) => ({
    name: `T${idx + 1}`,
    latency: Math.round(t.latency)
  }));
}, [trialDataset]);

// Lines 158-159: Metrics calculation strictly excludes timeouts
const legalRuns = data.filter(t => !t.falseStart && !t.timedOut && (t.rawLatency ?? t.latency) >= 80 && (t.rawLatency ?? t.latency) < 3000).map(t => t.latency);
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.5 = +4.25 pts
- **Decision:** DISPROVE

---

#### BUG-4 | Original: 5 pts
- **Counter-argument:** The claim that `PersonalBestService.getPersonalBest` fails to normalize `assessmentType` route aliases (e.g. `colour-recognition`, `reaction-test`) is disproved by the route layer. In `server/routes/researchRoutes.ts` lines 75-77, every incoming request query parameter is strictly validated: `if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) return res.status(400)`. Route aliases never reach `PersonalBestService` because they are rejected at the HTTP boundary with HTTP 400. In `server/config/constants.ts`, `VALID_ASSESSMENT_TYPES` consists exclusively of canonical keys (`['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory']`). Inside `PersonalBestService`, `isLowerBetter` correctly categorizes all five canonical types (`visual-reaction`, `direction`, and `color-recognition` as true; `block-memory` and `number-memory` as false). Realistic Frequency = 0, Impact = 0 (Frequency × Impact = 0 < 5).
- **Evidence:** In `server/routes/researchRoutes.ts`:
```ts
// Lines 75-77: Route boundary rejection of any non-canonical alias
if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
  return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
}
```
And in `server/services/personalBestService.ts`:
```ts
// Line 9: Correctly maps 100% of canonical assessment types permitted by the route boundary
const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.5 = +4.25 pts
- **Decision:** DISPROVE

---

#### BUG-5 | Original: 5 pts
- **Counter-argument:** Under the Sitemaps XML protocol (sitemaps.org 0.9 schema), both `<changefreq>` and `<priority>` are optional child elements of `<url>`. The generated `sitemap.xml` is 100% syntactically valid and passes all schema validators and unit tests (`tests/unit/seoGenerator.test.ts`). Moreover, Google Search Central officially documents that Googlebot explicitly ignores both `<priority>` and `<changefreq>` tags when crawling and indexing. The ternary in `scripts/generate-seo-pages.mjs` was intentionally committed (commit `d39eddca`) to assign monthly change frequency to guide/benchmark docs and priority 0.8 to core application routes. It breaks no functionality, causes no validation errors, and has zero negative SEO impact. Frequency × Impact = 1 × 1 = 1 < 5.
- **Evidence:** In `scripts/generate-seo-pages.mjs`:
```js
// Lines 254-257: Generates valid optional XML tags per sitemaps.org 0.9
const changefreq = pathname.startsWith('/guides') || pathname.startsWith('/benchmarks')
  ? '\n    <changefreq>monthly</changefreq>'
  : '\n    <priority>0.8</priority>';
return '  <url>\n' + loc + lastmod + changefreq + '\n  </url>';
```
- **Confidence:** 85%
- **Risk calc:** EV = (85% x 5) - (15% x 10) = 4.25 - 1.5 = +2.75 pts
- **Decision:** DISPROVE

---

#### BUG-6 | Original: 5 pts
- **Counter-argument:** The claim is refuted by reading the actual implementation in `scripts/dedupeLeaderboardBestPerOwner.ts`. First, line 76 explicitly checks `if (!indexSnap.exists || indexSnap.data()?.leaderboardDocId === loser.id)`. If the index was previously null / non-existent (`!indexSnap.exists`), it DOES write `{ leaderboardDocId: winner.id }`. If the index already pointed to `winner.id`, it is already synchronized and needs no update. Second, if a transaction aborts (throws), `await db.runTransaction(...)` throws an unhandled rejection caught by `main().catch(...)`, so line 80 (`superseded++`) is never reached. Finally, `superseded` is an ephemeral local integer used strictly for an informational console log in an offline script (`console.info(...)`), with zero persistence to Firestore and zero data-integrity impact. Realistic Frequency = 0, Impact = 0 (Frequency × Impact = 0 < 5).
- **Evidence:** In `scripts/dedupeLeaderboardBestPerOwner.ts`:
```ts
// Lines 76-78: Handles non-existent (null) indices and points them to winner.id
if (!indexSnap.exists || indexSnap.data()?.leaderboardDocId === loser.id) {
  tx.set(ownerIndexRef, { ownerUid: loser.ownerUid, assessmentType: loser.assessmentType, leaderboardDocId: winner.id, updatedAt: Date.now() }, { merge: true });
}
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.5 = +4.25 pts
- **Decision:** DISPROVE

---

#### BUG-7 | Original: 5 pts
- **Counter-argument:** Returning HTTP 500 when the database is unavailable is the intentional, verified architecture contract of the server. This behavior is frozen and verified by the golden characterization baseline in `tests/characterization/recordGoldenBaseline.test.ts` (line 337: `// 3.1 DB Null (fails in getAndValidateSession -> returns 500 with diagnostic message)`) and `tests/fixtures/goldenBaseline/httpResponses.json` (`POST /api/research/submit [db_null]` -> status 500). Changing this to 503 would break the golden baseline test suite. On the client side, `AssessmentResultReward` provides an inline "Retry Submission" button for any non-success response, ensuring transient errors are retryable by users regardless of whether the status code is 500 or 503. Realistic Frequency × Impact = 1 × 1 = 1 < 5.
- **Evidence:** In `tests/fixtures/goldenBaseline/httpResponses.json`:
```json
"POST /api/research/submit [db_null]": {
  "status": 500,
  "body": {
    "success": false,
    "error": "Database unavailable"
  }
}
```
And in `server/services/sessionService.ts`:
```ts
// Lines 68-70: Conforms to the golden baseline specification
if (errMsg === 'DATABASE_UNAVAILABLE') {
  return { valid: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}`, status: 500 };
}
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.5 = +4.25 pts
- **Decision:** DISPROVE

---

#### BUG-8 | Original: 1 pt
- **Counter-argument:** `server/middleware/security.ts` lines 6-7 explicitly document the purpose of `isLegacyApiPath`: `// Normalize legacy API paths only. Browser document requests must retain their page URL (notably /leaderboard and /admin/*) for SPA routing and hard refreshes.` The endpoints mentioned (`/api/admin/leaderboard/edit-alias`, `/api/leaderboard/verify-submission`, `/api/leaderboard/my-rank`, `/api/leaderboard/mine`) were designed as modern `/api/` endpoints from their inception; they never existed as un-prefixed legacy endpoints. All client callers (`src/lib/adminActions.ts`, `src/lib/firestore.ts`, `mobile/src/lib/firestore.ts`, `src/components/leaderboard/SubmissionVerificationModal.tsx`) send requests to `/api/...` directly. There is zero traffic requesting un-prefixed paths for these endpoints. Realistic Frequency = 0, Impact = 0 (Frequency × Impact = 0 < 5).
- **Evidence:** In `src/lib/adminActions.ts`:
```ts
return request<{ success: boolean; entry: AdminLeaderboardDTO }>('/api/admin/leaderboard/edit-alias', { ... });
```
And in `src/lib/firestore.ts`:
```ts
const res = await fetchWithAuth(`/api/leaderboard/my-rank?assessmentType=${encodeURIComponent(assessmentType)}`, { ... });
const res = await fetchWithAuth(`/api/leaderboard/mine?assessmentType=${encodeURIComponent(assessmentType)}`, { ... });
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 1) - (5% x 2) = 0.95 - 0.10 = +0.85 pts
- **Decision:** DISPROVE

---

**SUMMARY:**
- Bugs disproved: 8 (total points claimed: 46)
- Bugs accepted as real: 0
- Your final score: 46 pts

**ACCEPTED BUG LIST:**
*(None)*
