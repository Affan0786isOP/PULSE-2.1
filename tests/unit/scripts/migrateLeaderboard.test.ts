import { describe, it, expect, vi } from 'vitest';
import { runLeaderboardMigrationBatch } from '../../../scripts/migrateLeaderboardToProfilesDb';

describe('Leaderboard Migration Pipeline', () => {
  it('migrates historical leaderboard entries with deterministic IDs and preserves guest baseline', async () => {
    const mockLegacyDocs = [
      {
        id: 'legacy_sub_1',
        data: () => ({
          displayName: 'SpeedDemon',
          scoreMetric: 185,
          accuracy: 100,
          assessmentType: 'visual-reaction',
          ageGroup: 'Young adults (18–25)',
          hidden: false,
          createdAt: 1600000000000
        })
      }
    ];

    const targetSet = vi.fn();
    const mockTargetDb: any = {
      collection: vi.fn(() => ({
        doc: vi.fn((id: string) => ({
          set: targetSet
        }))
      }))
    };

    const count = await runLeaderboardMigrationBatch(mockLegacyDocs as any, mockTargetDb);
    expect(count).toBe(1);
    expect(targetSet).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'legacy_sub_1',
        displayName: 'SpeedDemon',
        scoreMetric: 185,
        hasRegisteredProfile: false, // Preserves guest baseline
        resultValidationStatus: 'validated',
        hidden: false
      })
    );
  });
});
