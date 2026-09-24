# ADR-003: Zero-PII Anonymous Research Participant Model

## Status
Accepted

## Context
Collecting cognitive reaction times and working memory metrics involves handling sensitive human performance telemetry. To comply with GDPR, FTC Health Breach Notification regulations (16 CFR 318), and State Consumer Health Data Privacy laws (RCW 19.373), data exposure risks must be minimized at the architectural root.

## Decision
1. Collect zero email addresses, zero passwords, and zero user telephone numbers.
2. Authenticate all participant sessions via Firebase Anonymous Authentication (`signInAnonymously`).
3. Anonymize the open scientific dataset (`publicDataset`) by removing all UIDs, session UUIDs, and IP addresses.
4. Restrict demographic tracking to 7 broad age brackets and aggregate completion timestamps to coarse months (`YYYY-MM`).

## Consequences
- **Positive:** Zero risk of user credential or identity exfiltration; frictionless participant onboarding without sign-up walls.
- **Negative:** Longitudinal cross-device tracking requires anonymous session persistence on the local device.

## Evidence
- [`security/retention.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/security/retention.md)
- [`security/data-map.yaml`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/security/data-map.yaml)
- [`src/lib/protocolValidators.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts)
