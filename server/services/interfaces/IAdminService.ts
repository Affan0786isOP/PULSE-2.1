import type {
  AdminLeaderboardDTO,
  AdminLeaderboardPageResponse,
  UpdateAliasInput
} from '../../models/adminModels';

import type { ILeaderboardRepository } from '../../repositories/interfaces/ILeaderboardRepository';
import type { AdminLeaderboardEntryRecord } from '../../models/adminModels';

export interface AdminLeaderboardFilterOptions {
  limit?: number;
  cursor?: string | null;
  assessmentType?: string | null;
  prefix?: string | null;
}

export interface IAdminLeaderboardRepository extends ILeaderboardRepository {
  getAllEntriesForAdminPage?(
    limitCount: number,
    cursor?: string | null
  ): Promise<{
    entries: AdminLeaderboardEntryRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  getAllEntriesForAdmin?(limitCount: number): Promise<AdminLeaderboardEntryRecord[]>;
  updateEntryAlias?(
    entryId: string,
    newDisplayName: string,
    reason?: string
  ): Promise<{
    success: boolean;
    found: boolean;
    entry?: AdminLeaderboardEntryRecord;
  }>;
}

export interface IAdminService {
  login(passcode: string): Promise<{ success: boolean; token: string }>;
  logout(token: string): Promise<{ success: boolean }>;
  getLeaderboardPage(options: AdminLeaderboardFilterOptions): Promise<AdminLeaderboardPageResponse>;
  editLeaderboardAlias(input: UpdateAliasInput): Promise<{
    success: boolean;
    entry: AdminLeaderboardDTO;
  }>;
  hideLeaderboardEntry(entryId: string, reason?: string): Promise<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
  }>;
  unhideLeaderboardEntry(entryId: string, reason?: string): Promise<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
    notBest?: boolean;
    erasureInProgress?: boolean;
    retainedEntryId?: string;
  }>;
  deleteLeaderboardEntry(entryId: string, reason?: string): Promise<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
  }>;
}
