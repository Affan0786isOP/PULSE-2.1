export type LeaderboardAccuracyBackfillMode = 'dry-run' | 'apply';

export interface LeaderboardAccuracyBackfillBatchInput {
  mode: LeaderboardAccuracyBackfillMode;
  cursor: string | null;
  limit: number;
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
