import type { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import type { IPersonalBestService } from './interfaces/IPersonalBestService';
import type { LeaderboardIdentity } from '../../shared/contracts/profiles';
import { safeLogWarning } from '../config/firebaseAdmin';

interface SessionDataWithProfile {
  scoreMetric?: number;
  profileUid?: string;
  derivedMetrics?: Record<string, unknown>;
}

export class PersonalBestService implements IPersonalBestService {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  async getPersonalBest(userId: string, assessmentType: string, identity?: LeaderboardIdentity): Promise<number | null> {
    const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
    let best: number | null = null;

    try {
      const sessions = await this.sessionRepo.findUserConsumedSessions(userId, assessmentType);
      sessions.forEach(data => {
        const item = data as SessionDataWithProfile;
        if (identity?.kind === 'profile') {
          if (item.profileUid && item.profileUid !== identity.profileUid) {
            return;
          }
        }

        let score: number | null = null;
        if (typeof item.scoreMetric === 'number') {
          score = item.scoreMetric;
        } else if (item.derivedMetrics) {
          const derived = item.derivedMetrics;
          if (isLowerBetter) {
            if (typeof derived.averageReactionTime === 'number') score = derived.averageReactionTime;
          } else {
            if (typeof derived.longestSeq === 'number') score = derived.longestSeq;
            else if (typeof derived.highestLevel === 'number') {
              score = assessmentType === 'block-memory'
                ? (Number(derived.highestLevel) > 0 ? Number(derived.highestLevel) + 1 : 0)
                : (Number(derived.highestLevel) > 0 ? Number(derived.highestLevel) + 2 : 0);
            }
          }
        }
        if (score !== null && !isNaN(score)) {
          if (best === null) {
            best = score;
          } else if (isLowerBetter && score < best) {
            best = score;
          } else if (!isLowerBetter && score > best) {
            best = score;
          }
        }
      });
    } catch (dbErr: unknown) {
      const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      if (errMsg === 'DATABASE_UNAVAILABLE') {
        throw dbErr;
      }
      safeLogWarning('[Personal Best API] Firestore query notice:', dbErr);
    }

    return best;
  }
}
