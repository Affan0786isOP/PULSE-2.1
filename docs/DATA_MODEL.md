# PULSE Data Model & Schemas

This document defines the data structures, Firestore collections, TypeScript types, validation rules, and lifecycle retention policies across the PULSE platform.

---

## 1. Firestore Collections Overview

| Collection Name | Purpose | Primary Read Access | Primary Write Access | Retention Policy |
| :--- | :--- | :--- | :--- | :--- |
| **`experimentSessions`** | Ephemeral experiment tokens & PRNG seeds | Authenticated Subject (`uid == auth.uid`) | Server Backend Only | **90 days** (or upon consumption) |
| **`assessmentTrials`** | Granular millisecond-level trial telemetry | Authenticated Subject (`participantId == auth.uid`) | Server Backend Only | **5 years** (GDPR erasure applies) |
| **`assessmentResults`** | Aggregated assessment outcome summaries | Authenticated Subject (`participantId == auth.uid`) | Server Backend Only | **5 years** (GDPR erasure applies) |
| **`publicDataset`** | Anonymized open research benchmark records | Authenticated Users (`auth != null`) | Server Backend Only | **Indefinite** (Open science) |
| **`leaderboardResults`** | Voluntary opted-in public rank records | Public (`hidden == false`) | Server Backend Only | **2 years** (or user removal) |
| **`adminAuditLogs`** | Immutable administrator moderation log | Server Admin Only (Client read denied) | Server Backend Only | **7 years** (Statutory audit) |

---

## 2. Core Entities & TypeScript Interfaces

### 2.1 Age Cohort Definition
```typescript
export const VALID_AGE_GROUPS = [
  'Children (8–12)',
  'Adolescents (13–17)',
  'Young adults (18–25)',
  'Adults (26–40)',
  'Middle-aged adults (41–60)',
  'Older adults (61–75)',
  'Seniors (76+)'
] as const;

export type AgeGroup = typeof VALID_AGE_GROUPS[number];
```

### 2.2 Assessment Types
```typescript
export type AssessmentType = 
  | 'visual-reaction' 
  | 'direction' 
  | 'color-recognition' 
  | 'block-memory' 
  | 'number-memory';
```

---

## 3. Detailed Document Schemas

### 3.1 `experimentSessions`
```typescript
interface ExperimentSessionDoc {
  sessionId: string;           // UUIDv4 identifier
  uid: string;                 // Firebase Anonymous Auth UID
  assessmentType: AssessmentType;
  ageGroup: AgeGroup;
  createdAt: number;           // Epoch millisecond timestamp
  expiresAt: number;           // Expiration timestamp (+1 hour)
  consumed: boolean;           // Replay prevention flag
  derivedMetrics?: Record<string, unknown>;
}
```

### 3.2 `assessmentTrials`
```typescript
interface AssessmentTrialDoc {
  id: string;
  participantId: string;       // Firebase Auth UID
  experimentId: string;        // Linked sessionId
  test: AssessmentType;        // Protocol identifier
  trialNumber: number;         // 1-indexed trial number
  stimulusTimestamp: number | null; // performance.now() epoch mark
  responseTimestamp: number | null; // performance.now() epoch mark
  reactionTime: number | null; // Calculated latency in milliseconds
  rawReactionTime?: number;    // Uncorrected hardware latency
  displayDelayOffsetMs?: number; // Hardware frame delay offset
  accuracy: number;            // 1 (correct) or 0 (incorrect)
  falseStart: boolean;         // True if clicked before stimulus or < 80ms
  timedOut?: boolean;          // True if response exceeded 3000ms
  valid?: boolean;             // True if trial conforms to physiological floor
  foreperiodMs?: number;       // Delay window in ms (VRT)
  foreperiodCategory?: 'SHORT' | 'LONG';
  device: string;              // Client User-Agent string
  screenWidth: number;
  screenHeight: number;
  ageGroup: AgeGroup;
  timestamp: string;           // ISO 8601 string
  notes?: string;
}
```

### 3.3 `publicDataset` (Anonymized Research Archive)
Enforces strict zero-PII boundary: no user IDs, no session IDs, no IP addresses.
```typescript
interface PublicDatasetDoc {
  schemaVersion: 1;
  assessmentVersion: string;   // e.g. "2.2.0"
  protocolVersion: string;     // e.g. "vrt-v1"
  datasetSchemaVersion: string;// e.g. "dataset-v1"
  metricsVersion: string;      // e.g. "metrics-v1"
  assessmentType: AssessmentType;
  ageGroup: AgeGroup;
  completedAtMonth: string;    // "YYYY-MM" (Coarse temporal aggregation)
  deviceCategory: 'desktop' | 'mobile';
  device: 'desktop' | 'mobile';
  provenanceToken: string;     // 64-character HMAC-SHA256 hex string
  progressionTrials: Array<{
    trialNumber: number;
    reactionTime?: number;
    inputLatencyMs?: number;
    metricType?: 'reaction_time' | 'input_latency';
    falseStart: boolean;
  }>;
  // Protocol-Specific Derived Metrics:
  averageReactionTime?: number;
  fastestReactionTime?: number;
  slowestReactionTime?: number;
  medianReactionTime?: number;
  consistency?: number;
  totalFalseStarts?: number;
  temporalDynamics?: {
    analysisVersion: 'temporal-v1';
    foreperiodSensitivity: number | null;
    foreperiodTransitionCost: number | null;
    temporalSurpriseCost: number | null;
    adaptationSlope: number | null;
    habituationIndex: number | null;
    temporalStability: number;
    shortWindow: { windowRangeMs: [number, number]; sampleAvailable: boolean; count: number; meanRt: number | null };
    longWindow: { windowRangeMs: [number, number]; sampleAvailable: boolean; count: number; meanRt: number | null };
  };
  // Direction & Color specific
  totalCorrect?: number;
  totalTrials?: number;
  accuracy?: number;
  congruentAvg?: number;
  incongruentAvg?: number;
  interferenceCost?: number;
  // Memory specific
  highestLevel?: number;
  longestSeq?: number;
  totalAttempts?: number;
  overallAccuracy?: number;
  totalTimeMs?: number;
}
```

### 3.4 `leaderboardResults`
```typescript
interface LeaderboardResultDoc {
  id: string;
  displayName: string;         // Self-chosen public alias (sanitized)
  assessmentType: AssessmentType;
  scoreMetric: number;         // Primary metric (ms for speed, level/span for memory)
  ageGroup: AgeGroup;
  createdAt: number | Timestamp;
  provenanceToken: string;     // HMAC-SHA256 attestation
  hidden: boolean;             // Moderator soft-hide flag
  hideReason?: string;         // Internal moderator note
}
```

### 3.5 `adminAuditLogs`
```typescript
interface AdminAuditLogDoc {
  actor: 'admin';
  action: 'HIDE_LEADERBOARD_ENTRY' | 'UNHIDE_LEADERBOARD_ENTRY' | 'DELETE_LEADERBOARD_ENTRY';
  target: string;              // Target document UUID
  timestamp: number | string;  // Server epoch timestamp
  note?: string;               // Moderator justification
}
```

---

## 4. Normalization & Transformation Pipeline

```mermaid
flowchart LR
    Raw[Raw Trial Stream] --> Filter[Physiological Filter (RT >= 80ms)]
    Filter --> Derive[Metric Derivation Engine]
    Derive --> HMAC[Sign HMAC-SHA256 Token]
    HMAC --> Split1[Write assessmentResults]
    HMAC --> Split2[Anonymize & Write publicDataset]
    HMAC --> Split3[If Opted-In: Write leaderboardResults]
```
