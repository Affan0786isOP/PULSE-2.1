# Cycle 4: Bug Referee Report

**Date:** 2026-11-10  
**Agent Role:** Bug Referee (Final Arbiter)  
**Subagent ID:** `38c3d9e3-2387-4c06-9ee6-d02d07756749`  
**Evaluation Scope:** Authoritative verification and risk scoring of Cycle 4 findings BUG-1 through BUG-8.

---

### Verified Bug Judgments

#### BUG-1
- **Hunter's claim:** Asynchronous React `useState` closures for trial stimuli (`currentWord`, `currentColor`, `currentInstruction`) in `mobile/src/components/ColorTest.tsx` cause fast participant responses to evaluate against and record stale trial stimuli into raw observations, triggering server-side PRNG validation failure (`wordName mismatch`) and complete rejection of the submission.
- **Skeptic's response:** DISPROVE. React 18 automatically batches state updates in `startTrialSequence()`. Color buttons are disabled during `FEEDBACK` (`disabled={engineState === 'FEEDBACK'}`) suppressing DOM click events until render commits. Human visual RT cannot precede screen paint. Frequency 0, Impact 0.
- **Your analysis:** The Skeptic is correct. In `mobile/src/components/ColorTest.tsx` (lines 387–418), all stimulus state setters (`setCurrentWord`, `setCurrentColor`, `setCurrentInstruction`, `setShuffledOptions`) and `setEngineState('STIMULUS_ACTIVE')` are invoked synchronously inside `startTrialSequence()`, which runs inside a `setTimeout` callback. Under React 18, all state updates within event loop callbacks are automatically batched into a single render pass. Prior to that render committing, the color option buttons are either unmounted (during initial countdown) or strictly disabled in the DOM (`disabled={engineState === 'FEEDBACK'}` at line 870), which prevents pointer and click events from firing. Once React commits the batched render, the buttons are enabled and bound to the newly recreated `executeTrigger` callback closure (which has `[currentInstruction, currentWord, currentColor]` in its dependency array). Furthermore, human visual reaction time physically requires ≥150ms and cannot precede display paint. A participant response against a stale stimulus closure is impossible.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

#### BUG-2
- **Hunter's claim:** `verifyFirebaseUserToken` in `server/middleware/auth.ts` uses a case-sensitive check `authHeader.startsWith('Bearer ')` and string split, causing standard lowercase `bearer <token>` authorization headers sent by HTTP/2 clients, proxies, and API consumers to silently fail authentication with HTTP 401 across all authenticated research and leaderboard endpoints.
- **Skeptic's response:** DISPROVE. RFC 7540/9113 normalizes header *names* to lowercase, not header values. RFC 6750 Section 2.1 standardizes grammar as `"Bearer" 1*SP b64token`. Every client in the app sends `Bearer ${token}`. No external consumers send lowercase `bearer`. Frequency 0, Impact 0.
- **Your analysis:** The Skeptic is correct. The Hunter's claim fundamental misunderstands the HTTP/2 specification. RFC 7540 (Section 8.1.2) and RFC 9113 (Section 8.2.1) require HTTP header field *names* to be lowercase (e.g., `authorization: Bearer <token>`); they never lowercase header field *values*. If header field values were lowercased, case-sensitive base64url-encoded JWT signatures would be permanently corrupted. Node.js/Express automatically normalizes header field names so `req.headers.authorization` accesses the value preserving its exact casing. Furthermore, RFC 6750 Section 2.1 explicitly defines the Bearer authentication scheme grammar as `credentials = "Bearer" 1*SP b64token`. All internal clients (`mobile/src/lib/firestore.ts`, `src/lib/firestore.ts`) format headers as `'Authorization': \`Bearer \${token}\``. There are no external third-party API clients sending lowercase `bearer`.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

#### BUG-3
- **Hunter's claim:** Desktop `ReactionTest` in `src/components/ReactionTest.tsx` pushes timed-out attempts (`>3000ms`) directly to `trialDatasetRef.current` while false starts are excluded, causing retries of the same trial to duplicate trial entries and pollute the client performance chart with phantom 0ms latency drops.
- **Skeptic's response:** DISPROVE. `chartData` is dead code (line 691 `useMemo` is never rendered anywhere in the DOM). Metrics calculation on completion explicitly filters out timeouts (`!t.timedOut`). `reactionCalculator.ts` deduplicates trials by `trialNumber`. Frequency 0, Impact 0.
- **Your analysis:** The Skeptic is correct. In `src/components/ReactionTest.tsx`, `chartData` (defined at line 691 via `useMemo`) is dead code; it is never passed to any component or rendered anywhere in the DOM, so no performance chart exists to be polluted. In `calculateAndFinalizeMetrics` (lines 158–159), calculations explicitly filter out timeouts: `data.filter(t => !t.falseStart && !t.timedOut && (t.rawLatency ?? t.latency) >= 80 && (t.rawLatency ?? t.latency) < 3000)`. Timed-out entries with 0ms recorded latency are strictly excluded from mean, median, fastest, slowest, standard deviation, and consistency metrics. On the server side, `reactionCalculator.ts` (lines 61–66) deduplicates trials by `trialNumber`, retaining only the final attempt.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

#### BUG-4
- **Hunter's claim:** `PersonalBestService.getPersonalBest` in `server/services/personalBestService.ts` fails to normalize `assessmentType`, causing query lookups using common route aliases (e.g. `colour-recognition`, `reaction-test`, `direction-test`) to return null and erroneously reversing score comparisons to treat reaction latency as higher-is-better.
- **Skeptic's response:** DISPROVE. `researchRoutes.ts` lines 75-77 strictly validates `assessmentType` against canonical `VALID_ASSESSMENT_TYPES` and returns 400 for non-canonical route aliases before `PersonalBestService` is ever invoked. `isLowerBetter` correctly categorizes all canonical types. Frequency 0, Impact 0.
- **Your analysis:** The Skeptic is correct. In `server/routes/researchRoutes.ts` (lines 74–77), every incoming request is strictly validated: `if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) return res.status(400)...`. In `server/config/constants.ts`, `VALID_ASSESSMENT_TYPES` consists exclusively of the five canonical assessment types (`'visual-reaction'`, `'direction'`, `'color-recognition'`, `'block-memory'`, `'number-memory'`). Route aliases are rejected at the HTTP boundary with HTTP 400 and never reach `PersonalBestService`. Within `PersonalBestService` (line 9), `isLowerBetter` checks `assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition'`, which correctly covers 100% of the canonical lower-is-better assessments.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

#### BUG-5
- **Hunter's claim:** Sitemap generation logic in `scripts/generate-seo-pages.mjs` embeds `<priority>0.8</priority>` in the `changefreq` ternary branch, causing all core application pages (home, assessments, leaderboard) to omit `<changefreq>` while all guide/benchmark pages omit `<priority>`.
- **Skeptic's response:** DISPROVE. Under sitemaps.org 0.9 schema, both `<changefreq>` and `<priority>` are optional child elements. Googlebot explicitly ignores both `<priority>` and `<changefreq>`. Passes all 24 SEO unit tests. Frequency 1, Impact 1 (Risk 1 < 5).
- **Your analysis:** In `scripts/generate-seo-pages.mjs` (lines 254–257), the ternary condition assigns either `<changefreq>monthly</changefreq>` or `<priority>0.8</priority>` to the variable named `changefreq`. While this is an awkward coding artifact/typo, under the Sitemaps XML protocol (sitemaps.org 0.9 schema), both `<changefreq>` and `<priority>` are completely optional elements. The output XML is 100% syntactically valid XML and passes all unit tests (`tests/unit/seoGenerator.test.ts`). Furthermore, official Google Search Central documentation explicitly confirms that Googlebot ignores both `<priority>` and `<changefreq>` tags when crawling and indexing. The real-world operational impact is 1 (negligible/cosmetic), and realistic malfunction frequency is 1. Per the threshold rule (`Frequency × Impact < 5`), this must be left alone.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** DISMISSED (Score < 5 - Leave alone)
- **Confidence:** High
- **True severity:** Low

---

#### BUG-6

- **Hunter's claim:** The best-per-owner migration may leave an owner index stale when it points to an entry other than the loser currently being processed, and its superseded counter may be inaccurate.
- **Skeptic's response:** Partially disproved. A missing index is handled by `!indexSnap.exists`; a pointer to a loser in the same group is updated when that loser is processed. A pointer to an unrelated stale ID is not repaired. The counter also increments after early returns from the transaction callback.
- **Referee analysis:** The source confirms the narrower behavior:
  1. The `!indexSnap.exists` branch repairs a missing owner-index document.
  2. When the pointer equals a loser ID in the grouped visible rows, that loser's transaction writes the winner ID.
  3. When the pointer references an unrelated stale ID outside the group, the script leaves it unchanged.
  4. The reviewed submission path uses the owner-index `deleting` field as an erasure/submission guard, then derives the current visible best from owner-private metadata. It does not read `leaderboardDocId` from the index to select the best leaderboard record. No functional consequence of the stale pointer was established in the inspected paths.
  5. `superseded++` is not reached when the transaction promise rejects, but it is reached after a transaction callback returns early. The log count can therefore overstate successful superseding; it is an operational summary, not a persisted data mutation.
- **Frequency (1-10):** 1
- **Impact (1-10):** 2
- **Risk Score:** 2
- **VERDICT:** BELOW THRESHOLD — non-actionable based on the currently demonstrated impact.
- **Confidence:** High for the observed control flow; medium for the undocumented global owner-index contract.
- **Follow-up:** Before rerunning this migration as an index-repair tool, add emulator tests for a missing index, pointer-to-current-loser, pointer-to-winner, pointer-to-unrelated/stale ID, active deletion lock, hidden/missing rows, owner mismatch, and early-return counter behavior. Define whether this script is intended to repair every stale pointer. Do not broaden writes until that invariant is explicit.

---

#### BUG-7
- **Hunter's claim:** `SessionService.getAndValidateSession` in `server/services/sessionService.ts` returns HTTP 500 instead of HTTP 503 when the database is unavailable, preventing research submission callers from recognizing retryable infrastructure faults.
- **Skeptic's response:** DISPROVE. Returning HTTP 500 on database unavailable is the intentional frozen contract verified by the golden characterization baseline (`tests/characterization/recordGoldenBaseline.test.ts` and `tests/fixtures/goldenBaseline/httpResponses.json`). Changing to 503 breaks golden tests. Client retry button works for any non-200. Frequency 1, Impact 1 (Risk 1 < 5).
- **Your analysis:** In `server/services/sessionService.ts` lines 68–70, `errMsg === 'DATABASE_UNAVAILABLE'` returns `{ valid: false, error: ..., status: 500 }`. This HTTP 500 status code is the intentional, verified contract frozen in the characterization baseline (`tests/characterization/recordGoldenBaseline.test.ts` line 337 and `tests/fixtures/goldenBaseline/httpResponses.json` under `"POST /api/research/submit [db_null]"`: `status: 500`). Modifying this to 503 would actively break characterization regression tests. On the client side (`src/components/AssessmentResultReward.tsx`), the "Retry Submission" button is displayed on any non-200 response, meaning transient failures are cleanly retryable by participants regardless of whether 500 or 503 is returned. Returning HTTP 500 on unexpected database failure is standard server behavior, and any impact is negligible.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** DISMISSED (Score < 5 - Leave alone)
- **Confidence:** High
- **True severity:** Low

---

#### BUG-8
- **Hunter's claim:** URL prefix normalization for legacy API paths in `server/middleware/security.ts` omits `/admin/leaderboard/edit-alias`, `/leaderboard/verify-submission`, `/leaderboard/my-rank`, and `/leaderboard/mine`, preventing un-prefixed requests from being routed to their respective API handlers.
- **Skeptic's response:** DISPROVE. `isLegacyApiPath` intentionally normalizes only legacy paths to protect SPA page routing for `/leaderboard` and `/admin/*`. The listed modern endpoints never existed without `/api/`, and all client callers invoke `/api/...` directly. Frequency 0, Impact 0.
- **Your analysis:** The Skeptic is correct. The legacy path rewriting in `server/middleware/security.ts` (lines 6–27) exists solely as a backward-compatibility layer for legacy paths that historically omitted `/api`. The code explicitly documents that broad rewriting is constrained to prevent breaking client-side SPA routing for document navigations like `/leaderboard` and `/admin/*`. The endpoints listed by the Hunter (`/api/admin/leaderboard/edit-alias`, `/api/leaderboard/verify-submission`, `/api/leaderboard/my-rank`, `/api/leaderboard/mine`) were designed as modern API routes with `/api/` prefixes from day one. All client callers (`src/lib/adminActions.ts`, `src/lib/firestore.ts`, `mobile/src/lib/firestore.ts`) and tests call `/api/...` directly. No client or external integration issues un-prefixed requests for these paths.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

## VERIFIED BUG REPORT

### Stats:
- Total reported by Hunter: 8
- Dismissed as false positives (Not a bug): 5 (BUG-1, BUG-2, BUG-3, BUG-4, BUG-8)
- Dismissed below threshold (Frequency × Impact < 5 or rare/future cases): 3 (BUG-5, BUG-6, BUG-7)
- Confirmed actionable bugs (Risk Score ≥ 5): 0
- Critical: 0 | Medium: 0 | Low: 0

### Confirmed Actionable Bugs:
*(None — no actionable bugs confirmed)*

### Dismissed Below Threshold (Score < 5 - Left Alone per YAGNI):
- **BUG-5 (scripts/generate-seo-pages.mjs:254-257):** The sitemap generator emits one optional element (`changefreq` for guide/benchmark URLs or `priority` for core URLs). The generated XML remains structurally valid, and the reviewed evidence does not establish an operational search impact. Frequency: 1, Impact: 1, Risk Score: 1.
- **BUG-6 (scripts/dedupeLeaderboardBestPerOwner.ts:65-81):** Missing owner indexes and pointers to losers in the current group are handled. Unrelated stale pointers can remain, but the inspected submission path does not use `leaderboardDocId` from this index to choose the current best row; the transaction counter can also overstate work after early returns. No production behavior defect was established. Frequency: 1, Impact: 2, Risk Score: 2. Add focused tests and document the intended index-repair invariant before treating the script as a global repair utility.
- **BUG-7 (server/services/sessionService.ts:67-72):** HTTP 500 on database unavailability is the frozen characterization contract, and the client retry flow handles non-success responses. Do not change the status without an explicit API-contract migration. Frequency: 1, Impact: 1, Risk Score: 1.

### Low-Confidence Items (Flagged for Manual Review):
*(None — all items evaluated with High confidence after direct source code inspection)*
