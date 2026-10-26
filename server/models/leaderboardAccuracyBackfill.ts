export type LeaderboardAccuracyBackfillMode = 'dry-run' | 'apply';

export interface LeaderboardAccuracyBackfillBatchInput {
  mode: LeaderboardAccuracyBackfillMode;
  cursor: string | null;
  limit: number;
  /** Exact ordered public document IDs reviewed in the dry-run batch. Required for apply. */
  expectedEntryIds?: string[];
}

export interface LeaderboardAccuracyBackfillBatchReport {
  success: true;
  mode: LeaderboardAccuracyBackfillMode;
  counts: {
    scanned: number;
    eligible: number;
    wouldUpdate: number;
    updated: number;
    alreadyCorrect: number;
    skipped: number;
    failed: number;
  };
  skipReasons: Record<string, number>;
  /** Public entry IDs in this bounded page, used to bind apply to a reviewed preview. */
  entryIds: string[];
  nextCursor: string | null;
  done: boolean;
}

export type LeaderboardAccuracyBackfillDecision =
  | { kind: 'skip'; reason: string }
  | { kind: 'alreadyCorrect' }
  | { kind: 'wouldUpdate'; accuracy: number };

export type LeaderboardAccuracyBackfillRowResult =
  | { kind: 'skip'; reason: string }
  | { kind: 'alreadyCorrect' }
  | { kind: 'dryRun' }
  | { kind: 'updated' };

export interface LeaderboardAccuracyBackfillPage {
  ids: string[];
  nextCursor: string | null;
  done: boolean;
}

/** Candidate server-owned sessions found by exact entry linkage queries. */
export interface LeaderboardAccuracyBackfillLegacySessionCandidates {
  entryId: string;
  sessions: Array<Record<string, unknown>>;
  /** False when any bounded lookup hit its cap, so uniqueness cannot be proven. */
  complete: boolean;
}
