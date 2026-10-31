import { Firestore } from '@google-cloud/firestore';
import { getAdminDb } from './firebaseAdmin';

export type StorageStrategy = 'physical' | 'logical';

export interface StorageConfig {
  strategy: StorageStrategy;
  profilesDbId?: string;
  leaderboardDbId?: string;
  researchDbId?: string;
}

let activeStrategy: StorageConfig | null = null;
let researchDbInstance: any = null;
let profilesDbInstance: any = null;
let leaderboardDbInstance: any = null;

export function resetDatabasesForTesting(): void {
  activeStrategy = null;
  researchDbInstance = null;
  profilesDbInstance = null;
  leaderboardDbInstance = null;
}

export function initStorageStrategy(options?: {
  defaultDbProvider?: () => any;
  customProfilesDb?: any;
  customLeaderboardDb?: any;
}): StorageConfig {
  const rawStrategy = process.env.PULSE_STORAGE_STRATEGY?.trim().toLowerCase();

  if (!rawStrategy) {
    throw new Error(
      'PULSE_STORAGE_STRATEGY is required. Valid options: "logical" (default production) or "physical" (staging only).'
    );
  }

  if (rawStrategy !== 'physical' && rawStrategy !== 'logical') {
    throw new Error(
      `Invalid PULSE_STORAGE_STRATEGY: "${rawStrategy}". Must be "physical" or "logical".`
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (rawStrategy === 'physical') {
    if (isProduction) {
      throw new Error(
        'Physical multi-database strategy is BLOCKED in production until named database support is GA and validated in staging.'
      );
    }

    const profilesDbId = process.env.PULSE_PROFILES_DATABASE_ID || 'pulse-profiles';
    const leaderboardDbId = process.env.PULSE_LEADERBOARD_DATABASE_ID || 'pulse-leaderboard';
    const researchDbId = process.env.PULSE_RESEARCH_DATABASE_ID || '(default)';

    activeStrategy = {
      strategy: 'physical',
      profilesDbId,
      leaderboardDbId,
      researchDbId
    };

    const getBaseDb = options?.defaultDbProvider ?? getAdminDb;
    researchDbInstance = getBaseDb();
    profilesDbInstance = options?.customProfilesDb ?? new Firestore({ databaseId: profilesDbId });
    leaderboardDbInstance = options?.customLeaderboardDb ?? new Firestore({ databaseId: leaderboardDbId });

    return activeStrategy;
  }

  // Logical namespace strategy
  activeStrategy = { strategy: 'logical' };
  const getDb = options?.defaultDbProvider ?? getAdminDb;
  const sharedDb = getDb();

  researchDbInstance = sharedDb;
  profilesDbInstance = sharedDb;
  leaderboardDbInstance = sharedDb;

  return activeStrategy;
}

export function getResearchDb(): any {
  if (!researchDbInstance) initStorageStrategy();
  return researchDbInstance;
}

export function getProfilesDb(): any {
  if (!profilesDbInstance) initStorageStrategy();
  return profilesDbInstance;
}

export function getLeaderboardDb(): any {
  if (!leaderboardDbInstance) initStorageStrategy();
  return leaderboardDbInstance;
}
