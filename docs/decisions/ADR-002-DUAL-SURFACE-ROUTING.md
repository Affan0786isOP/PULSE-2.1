# ADR-002: Dual-Surface Application Architecture (Desktop SPA & Mobile PWA)

## Status
Accepted

## Context
Cognitive motor latency measurement on mobile touchscreens requires tailored touch hit-targets, full-screen canvas controls, and PWA offline installation capabilities, whereas desktop environments demand high-resolution telemetry dashboards and physical keyboard shortcuts. Supporting both within a single monolithic bundle led to layout conflicts and bloated client payloads.

## Decision
1. Implement a dual-surface architecture with the desktop React SPA located in `src/` and the mobile PWA subproject in `mobile/`.
2. Provide a dedicated Vite build configuration for mobile (`mobile/vite.config.ts`) with customized PWA manifest and service worker.
3. Automatically route incoming requests using Express edge routing and client-side device detection (`src/lib/deviceRouting.ts`), redirecting viewports $< 768\text{px}$ or mobile User-Agents to `/mobile/`.

## Consequences
- **Positive:** Maximum touch ergonomic fidelity on mobile devices; lightweight bundles optimized for respective form factors.
- **Negative:** Shared features or protocol changes require coordinated updates across `src/` and `mobile/src/`.

## Evidence
- [`src/lib/deviceRouting.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/deviceRouting.ts)
- [`mobile/vite.config.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/vite.config.ts)
- [`package.json`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/package.json)
