# Dead Code Audit and Cleanup — 2026-10-15

## Scope

Audited the current `main` head `7b07474af6cdf96f8a78ee40cd032b2fdcf8391b` of `Affan0786isOP/PULSE-2.1`. The cleanup is intentionally conservative: code was removed only where repository-wide symbol searches found no caller, or where the component was an unused no-op.

## Removed

| Path | Finding |
| --- | --- |
| `mobile/src/components/DirectionDataset.tsx` | Exported a component whose entire implementation was `return null`; no app imports/callers were found. |
| `src/components/ui/gooey-nav.tsx` | `GooeyNav` had no references outside its own source file. |
| `src/components/home/WhatIsPulseScene.tsx` | The section component had no references outside its own source file, so it was not part of the rendered application. |
| `src/components/brand/TelemetryMetricCard.tsx` | No consumers were found; it was exported only by the brand barrel. Its default values are illustrative hard-coded telemetry, not live measurements. |
| `src/components/brand/ProvenanceBadge.tsx` | Only consumed by the unused telemetry card and exported by the brand barrel. |
| `src/components/brand/index.ts` | Removed exports for the deleted `TelemetryMetricCard` and `ProvenanceBadge`; retained `PulseLogo` and `StimulusReticle`. |

## Deliberately retained

- `src/components/DatasetComingSoon.tsx`: it is used by the desktop and mobile route definitions and has tests covering its deferred `/dataset` and `/analytics` behaviour.
- `StimulusReticle.tsx`: no current runtime consumer was found, but it is explicitly documented in the design-system and brand-guidelines docs as a reusable brand component, so it was retained.
- The dataset explorer, scripts under `scripts/archive/`, visual experiments under `scratch/`, and agent-skill directories were not removed. They are dormant, archived, or developer-facing rather than proven safe-to-delete production dead code.

## Validation and limitations

Repository-wide code searches were used to validate the removed symbol references. A local dependency install, TypeScript checks, unit tests, and build were not run in this remote-only audit environment. The changes should therefore be validated by CI before merging. This is a conservative unused-component cleanup, not a claim that every unused local variable or package dependency in the repository has been exhaustively identified.
