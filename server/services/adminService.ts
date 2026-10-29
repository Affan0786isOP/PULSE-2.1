import type {
  AdminLeaderboardDTO,
  AdminLeaderboardPageResponse,
  UpdateAliasInput,
  AdminLeaderboardEntryRecord
} from '../models/adminModels';
import type {
  IAdminService,
  IAdminLeaderboardRepository,
  AdminLeaderboardFilterOptions
} from './interfaces/IAdminService';
import { AppError } from '../models/replayContracts';
import {
  safeLeaderboardDisplayNameForRead,
  validateLeaderboardDisplayName
} from '../../shared/domain/leaderboardEligibility';
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { VALID_ASSESSMENT_TYPES } from '../config/constants';

export class AdminService implements IAdminService {
  constructor(
    private readonly leaderboardRepo: IAdminLeaderboardRepository,
    private readonly sessionVerifier?: {
      createAdminToken: () => Promise<string> | string;
      revokeAdminToken: (token: string) => Promise<void> | void;
      validatePasscode: (passcode: string) => boolean;
    }
  ) {}

  /**
   * Project internal repository records to clean, strict AdminLeaderboardDTOs.
   * Strips all private metadata: ownerUid, sessionId, trialsDigest, derivedMetrics,
   * idempotencyKey, qualityFlags, moderationReason, and token internals.
   */
  private projectToDTO(record: AdminLeaderboardEntryRecord): AdminLeaderboardDTO {
    const rawDisplayName = typeof record.displayName === 'string' ? record.displayName : '';
    const safeDisplayName = safeLeaderboardDisplayNameForRead(rawDisplayName) ?? rawDisplayName;
    const createdAtNum = typeof record.createdAt === 'number'
      ? record.createdAt
      : (Number(record.createdAt) || 0);

    return {
      id: record.id,
      displayName: safeDisplayName,
      assessmentType: normalizeAssessmentType(String(record.assessmentType || '')),
      scoreMetric: typeof record.scoreMetric === 'number' ? record.scoreMetric : Number(record.scoreMetric) || 0,
      ageGroup: String(record.ageGroup || ''),
      createdAt: createdAtNum,
      hidden: record.hidden === true,
      ...(typeof record.hiddenAt === 'number' ? { hiddenAt: record.hiddenAt } : {}),
      ...(typeof record.hideReason === 'string' && record.hideReason ? { hideReason: record.hideReason } : {}),
      publicEntry: record.publicEntry !== false && record.submissionReceiptOnly !== true
    };
  }

  async login(passcode: string): Promise<{ success: boolean; token: string }> {
    if (!passcode || typeof passcode !== 'string') {
      throw new AppError('Passcode is required', 400);
    }
    if (!this.sessionVerifier) {
      throw new AppError('Admin authentication provider is unavailable', 503);
    }
    const isValid = this.sessionVerifier.validatePasscode(passcode);
    if (!isValid) {
      throw new AppError('Invalid admin passcode', 401);
    }
    const token = await this.sessionVerifier.createAdminToken();
    return { success: true, token };
  }

  async logout(token: string): Promise<{ success: boolean }> {
    if (!token || typeof token !== 'string') {
      throw new AppError('Token is required', 400);
    }
    if (this.sessionVerifier) {
      await this.sessionVerifier.revokeAdminToken(token);
    }
    return { success: true };
  }

  async getLeaderboardPage(options: AdminLeaderboardFilterOptions): Promise<AdminLeaderboardPageResponse> {
    const safeLimit = Number.isInteger(options.limit)
      ? Math.max(1, Math.min(options.limit!, 250))
      : 100;

    let targetAssessment: string | null = null;
    if (options.assessmentType && options.assessmentType !== 'all') {
      const normalized = normalizeAssessmentType(options.assessmentType);
      if (!VALID_ASSESSMENT_TYPES.includes(normalized)) {
        throw new AppError('Invalid assessmentType filter', 400);
      }
      targetAssessment = normalized;
    }

    const prefix = typeof options.prefix === 'string' ? options.prefix.trim().toLowerCase() : '';

    // If repository provides getAllEntriesForAdminPage, use it
    if (typeof this.leaderboardRepo.getAllEntriesForAdminPage === 'function') {
      const matchingEntries: AdminLeaderboardEntryRecord[] = [];
      let currentCursor = options.cursor;
      let hasMoreFromRepo = false;
      let lastNextCursor: string | null = null;

      // Fetch in a loop until safeLimit matching entries are collected or no more Firestore documents exist
      while (matchingEntries.length < safeLimit) {
        const page = await this.leaderboardRepo.getAllEntriesForAdminPage(safeLimit, currentCursor);
        hasMoreFromRepo = page.hasMore;
        lastNextCursor = page.nextCursor;

        let filtered = page.entries;
        if (targetAssessment) {
          filtered = filtered.filter(
            e => normalizeAssessmentType(String(e.assessmentType || '')) === targetAssessment
          );
        }
        if (prefix) {
          filtered = filtered.filter(e => {
            const name = String(e.displayName || '').toLowerCase();
            return name.startsWith(prefix);
          });
        }

        matchingEntries.push(...filtered);

        if (!page.hasMore || !page.nextCursor) {
          break;
        }
        currentCursor = page.nextCursor;
      }

      const finalEntries = matchingEntries.slice(0, safeLimit);
      const hasMore = matchingEntries.length > safeLimit || (matchingEntries.length === safeLimit && hasMoreFromRepo);

      return {
        success: true,
        entries: finalEntries.map(e => this.projectToDTO(e)),
        nextCursor: hasMore ? lastNextCursor : null,
        hasMore
      };
    }

    // Fallback: If getAllEntriesForAdmin is available
    if (typeof this.leaderboardRepo.getAllEntriesForAdmin === 'function') {
      const entries = await this.leaderboardRepo.getAllEntriesForAdmin(safeLimit);
      let filtered = entries;
      if (targetAssessment) {
        filtered = filtered.filter(
          e => normalizeAssessmentType(String(e.assessmentType || '')) === targetAssessment
        );
      }
      if (prefix) {
        filtered = filtered.filter(e => {
          const name = String(e.displayName || '').toLowerCase();
          return name.startsWith(prefix);
        });
      }

      return {
        success: true,
        entries: filtered.map(e => this.projectToDTO(e)),
        nextCursor: null,
        hasMore: false
      };
    }

    throw new AppError('Admin leaderboard pagination is unavailable', 503);
  }

  async editLeaderboardAlias(input: UpdateAliasInput): Promise<{
    success: boolean;
    entry: AdminLeaderboardDTO;
  }> {
    if (!input || !input.id || typeof input.id !== 'string' || input.id.trim() === '') {
      throw new AppError('Entry ID is required', 400);
    }
    const normalizedId = input.id.trim();

    const validation = validateLeaderboardDisplayName(input.displayName);
    if (!validation.valid || !validation.normalized) {
      throw new AppError(validation.error || 'Invalid display name', 400);
    }
    const newName = validation.normalized;

    if (typeof this.leaderboardRepo.updateEntryAlias !== 'function') {
      throw new AppError('Alias modification is unavailable', 503);
    }

    try {
      const res = await this.leaderboardRepo.updateEntryAlias(normalizedId, newName, input.reason);
      if (!res.found || !res.entry) {
        throw new AppError('Leaderboard entry not found', 404);
      }
      return {
        success: true,
        entry: this.projectToDTO(res.entry)
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'OWNER_ERASURE_IN_PROGRESS') {
        throw new AppError('Cannot modify entry: Owner account erasure is currently in progress', 409);
      }
      if (msg === 'PROVENANCE_MISMATCH' || msg === 'UNVERIFIED_PROVENANCE') {
        throw new AppError('Cannot modify entry: Existing provenance verification failed', 422);
      }
      if (msg === 'ENTRY_NOT_FOUND') {
        throw new AppError('Leaderboard entry not found', 404);
      }
      throw new AppError('Failed to update alias', 500);
    }
  }

  async hideLeaderboardEntry(entryId: string, reason?: string): Promise<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
  }> {
    if (!entryId || typeof entryId !== 'string' || !entryId.trim()) {
      throw new AppError('Entry ID is required', 400);
    }
    const normalizedId = entryId.trim();

    try {
      const res = await this.leaderboardRepo.softHideEntry(normalizedId, reason);
      if (!res.found) {
        throw new AppError('Leaderboard entry not found', 404);
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'OWNER_ERASURE_IN_PROGRESS') {
        throw new AppError('Cannot hide entry: Owner account erasure is currently in progress', 409);
      }
      throw new AppError('Failed to hide leaderboard entry', 500);
    }
  }

  async unhideLeaderboardEntry(entryId: string, reason?: string): Promise<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
    notBest?: boolean;
    erasureInProgress?: boolean;
    retainedEntryId?: string;
  }> {
    if (!entryId || typeof entryId !== 'string' || !entryId.trim()) {
      throw new AppError('Entry ID is required', 400);
    }
    const normalizedId = entryId.trim();

    try {
      const res = await this.leaderboardRepo.unhideEntry(normalizedId, reason);
      if (!res.found) {
        throw new AppError('Leaderboard entry not found', 404);
      }
      if (res.erasureInProgress) {
        throw new AppError('Cannot unhide entry: Owner account erasure is currently in progress', 409);
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'OWNER_ERASURE_IN_PROGRESS') {
        throw new AppError('Cannot unhide entry: Owner account erasure is currently in progress', 409);
      }
      throw new AppError('Failed to unhide leaderboard entry', 500);
    }
  }

  async deleteLeaderboardEntry(entryId: string, reason?: string): Promise<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
  }> {
    if (!entryId || typeof entryId !== 'string' || !entryId.trim()) {
      throw new AppError('Entry ID is required', 400);
    }
    const normalizedId = entryId.trim();

    try {
      const res = await this.leaderboardRepo.deleteEntry(normalizedId, reason);
      if (!res.found) {
        throw new AppError('Leaderboard entry not found', 404);
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'OWNER_ERASURE_IN_PROGRESS') {
        throw new AppError('Cannot delete entry: Owner account erasure is currently in progress', 409);
      }
      throw new AppError('Failed to delete leaderboard entry', 500);
    }
  }
}
