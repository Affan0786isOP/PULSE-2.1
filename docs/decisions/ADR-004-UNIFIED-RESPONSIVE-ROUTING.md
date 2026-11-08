# ADR-004: Unified Responsive Routing & Single-Route Surface Encapsulation

## Status
Accepted

## Context
In ADR-002, PULSE established a dual-surface architecture with separate `/` (desktop) and `/mobile/` (mobile PWA) URLs using User-Agent redirection and edge routing.
While this separated layouts cleanly, dual URL paths introduced several severe drawbacks:
1. Fragmented SEO and canonical URLs: identical cognitive assessment guides, leaderboards, and landing pages existed on split paths.
2. Fragile cross-device sharing: desktop links shared to mobile required redirects; mobile `/mobile/*` links shared to desktop broke ergonomics or triggered counter-redirects.
3. Redirection latency and flashes during device orientation switches or resizing.
4. Maintenance overhead of duplicated navigation guards and routes across two separate router configurations.

## Decision
1. **Unify Top-Level Canonical Routing:** All routes (`/`, `/assessments`, `/benchmarks`, `/leaderboard`, `/about`, `/improve`, `/research/privacy`, `/guides`, `/guides/:slug`, `/admin`, `/404`) are hosted on identical canonical paths for both desktop and mobile clients.
2. **Dynamic Surface Encapsulation (`useViewportSurface`):** Root `src/App.tsx` dynamically switches between `<DesktopApp />` and `<MobileAppWrapper />` using responsive viewport detection (768px breakpoint).
3. **Protected Surface Transition Queueing:** While an assessment is active or acquiring (`assessmentLockStore.isLocked`), viewport-triggered surface switches are queued safely until the user completes, leaves, or abandons the assessment, preventing abrupt unmounting of the assessment apparatus.
4. **Shared Subsystem Extraction (`@shared/*`):** Common business logic, state stores, navigation guards, and service worker bridges are extracted to `@shared/`:
   - `@shared/assessment/assessmentLockStore.ts`
   - `@shared/navigation/NavigationGuard.tsx`
   - `@shared/navigation/useGuardedNavigate.ts`
   - `@shared/lib/settingsStore.ts`
   - `@shared/pwa/serviceWorkerSessionBridge.ts`
5. **Eliminate `/mobile/` URLs:** Remove all public routing and redirects to `/mobile/`. The mobile UI components and PWA assets remain encapsulated under `mobile/src/` and are consumed directly by the unified surface switcher.

## Consequences
- **Positive:**
  - Single canonical URL structure across all devices, eliminating duplicate URL SEO issues.
  - Seamless responsive design and window resizing without page reloads.
  - Zero risk of unmounting active assessments during accidental orientation flips due to lock-aware queuing.
  - Centralized navigation protection and settings synchronization across both views.
- **Negative:**
  - Root bundle imports components for both desktop and mobile shells (mitigated by lazy chunking and Vite code splitting).

## Evidence
- [`src/App.tsx`](../../src/App.tsx)
- [`src/hooks/useViewportSurface.ts`](../../src/hooks/useViewportSurface.ts)
- [`shared/assessment/assessmentLockStore.ts`](../../shared/assessment/assessmentLockStore.ts)
- [`shared/navigation/NavigationGuard.tsx`](../../shared/navigation/NavigationGuard.tsx)
- [`tests/unit/useViewportSurface.test.tsx`](../../tests/unit/useViewportSurface.test.tsx)
- [`tests/unit/unifiedRouting.test.tsx`](../../tests/unit/unifiedRouting.test.tsx)
