import type { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import type { IPersonalBestService } from './interfaces/IPersonalBestService';
import { safeLogWarning } from '../config/firebaseAdmin';

export class PersonalBestService implements IPersonalBestService {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  async getPersonalBest(userId: string, assessmentType: string): Promise<number | null> {
    const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
    let best: number | null = null;

    try {
      const sessions = await this.sessionRepo.findUserConsumedSessions(userId, assessmentType);
      sessions.forEach(data => {
        let score: number | null = null;
        if (typeof data.scoreMetric === 'number') {
          score = data.scoreMetric;
        } else if (data.derivedMetrics) {
          const derived = data.derivedMetrics as Record<string, unknown>;
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
      // Resilient behavior for query error (permission denied, timeout, etc.): return best accumulated so far
    }

    return best;
  }
}
