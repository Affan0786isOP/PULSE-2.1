# Cycle 5: Bug Hunter Report (Ponytail Senior Dev Lens)

**Date:** 2026-11-10  
**Agent Role:** Bug Hunter (Cycle 5)  
**Subagent ID:** `009d9b77-1765-4c47-b3ac-b04fb578665d`  
**Evaluation Scope:** Uninspected UI components, backend routes & repositories, and standalone scripts.

---

### Findings

#### BUG-1 | Severity: Medium | Points: 5
- **File:** `server/routes/adminRoutes.ts`
- **Line(s):** 134-160
- **Category:** error-handling
- **Estimated Frequency (1-10):** 4
- **Estimated Impact (1-10):** 4
- **Risk Score:** 16
- **Claim:** Unhandled `INVALID_CURSOR` error from `getLeaderboardPage` returns HTTP 500 Internal Server Error instead of HTTP 400 Bad Request.
- **Evidence:**
```ts
      const page = await deps.adminService.getLeaderboardPage({
        limit,
        cursor,
        assessmentType,
        prefix
      });

      return res.json(page);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve admin leaderboard entries'
      });
    }
```
When an operator or API integration passes an invalid, non-existent, or deleted document cursor to `GET /api/admin/leaderboard/all`, the underlying repository pagination throws a plain `new Error('INVALID_CURSOR')`. Because this error is not an `AppError` instance, `adminRoutes.ts` falls back to HTTP 500 (`Internal Server Error`) rather than returning HTTP 400 Bad Request (as is properly handled in `server/routes/researchRoutes.ts`), triggering false-positive alerts on standard client query errors.

---

#### BUG-2 | Severity: Low | Points: 1
- **File:** `scripts/capture-break-ui.mjs`
- **Line(s):** 4, 27-30
- **Category:** edge-case
- **Estimated Frequency (1-10):** 3
- **Estimated Impact (1-10):** 3
- **Risk Score:** 9
- **Claim:** Hardcoded ephemeral artifact directory path without existence verification causes the UI capture script to crash with `ENOENT`.
- **Evidence:**
```javascript
const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2';
...
    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, `laptop-visual-${mode}.png`),
      fullPage: true,
    });
```
`scripts/capture-break-ui.mjs` hardcodes an absolute file path to a past ephemeral conversation directory. It neither accepts an environment variable override (`process.env.ARTIFACT_DIR`) nor creates the output folder via `fs.mkdirSync(ARTIFACT_DIR, { recursive: true })`. When run in fresh workspaces or CI pipelines where this directory does not exist, Playwright's `page.screenshot` crashes immediately with `ENOENT`.

---

#### BUG-3 | Severity: Low | Points: 1
- **File:** `mobile/src/components/LeaderboardOptIn.tsx`
- **Line(s):** 6-12, 94-101
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 3
- **Estimated Impact (1-10):** 2
- **Risk Score:** 6
- **Claim:** Incomplete prop contract in mobile `LeaderboardOptIn` omits `sessionId`, forcing reliance on client fallback heuristics.
- **Evidence:**
```tsx
interface LeaderboardOptInProps {
  assessmentType: AssessmentType;
  scoreMetric: number;
  idempotencyKey: string;
  ageGroup: AgeGroup;
  trials?: any[];
}
...
    const res = await submitLeaderboardResult({
      displayName: trimmed,
      assessmentType,
      scoreMetric,
      idempotencyKey,
      ageGroup,
      trials
    });
```
Mobile `LeaderboardOptInProps` omits the `sessionId` prop present on the desktop counterpart (`src/components/LeaderboardOptIn.tsx`), passing only `idempotencyKey={sessionId}`. While `mobile/src/lib/firestore.ts` provides a defensive fallback (`activeSessionId = payload.sessionId || payload.idempotencyKey`), this architectural divergence weakens contract guarantees between desktop and mobile assessment workflows.

---

**TOTAL FINDINGS:** 3  
**TOTAL SCORE:** 7  
