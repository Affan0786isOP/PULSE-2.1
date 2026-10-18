export interface AdminLeaderboardDTO {
  id: string;
  displayName: string;
  assessmentType: string;
  scoreMetric: number;
  ageGroup: string;
  createdAt: number;
  hidden: boolean;
  hiddenAt?: number;
  hideReason?: string;
  publicEntry: boolean;
}

export interface AdminLeaderboardPageResponse {
  success: boolean;
  entries: AdminLeaderboardDTO[];
  nextCursor: string | null;
  hasMore: boolean;
  totalScanned?: number;
}

export interface UpdateAliasInput {
  id: string;
  displayName: string;
  reason?: string;
}

export interface AdminAuditLogRecord {
  id: string;
  actor: 'admin';
  action: 'HIDE_LEADERBOARD_ENTRY' | 'UNHIDE_LEADERBOARD_ENTRY' | 'DELETE_LEADERBOARD_ENTRY' | 'EDIT_LEADERBOARD_ALIAS';
  target: string;
  timestamp: number | string;
  note?: string;
  previousDisplayName?: string;
  newDisplayName?: string;
  ownerUnresolved?: boolean;
  [key: string]: unknown;
}

export interface CreateAuditLogInput {
  logId?: string;
  actor: 'admin';
  action: 'HIDE_LEADERBOARD_ENTRY' | 'UNHIDE_LEADERBOARD_ENTRY' | 'DELETE_LEADERBOARD_ENTRY' | 'EDIT_LEADERBOARD_ALIAS';
  target: string;
  timestamp: number | string;
  note?: string;
  previousDisplayName?: string;
  newDisplayName?: string;
  ownerUnresolved?: boolean;
}
