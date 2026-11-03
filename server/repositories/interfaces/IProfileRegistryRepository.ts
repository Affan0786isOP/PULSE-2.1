import type { ProfileRecord } from '../../../shared/contracts/profiles';

export interface IProfileRegistryRepository {
  reserveProfile(params: {
    ownerUid: string;
    ownerEmail?: string | null;
    displayName: string;
    ageGroup: string;
    shareAgeGroupOnLeaderboard?: boolean;
  }): Promise<{ success: boolean; profile: ProfileRecord }>;

  checkNameAvailability(displayName: string, ownerUid?: string): Promise<{
    available: boolean;
    normalizedName: string;
    reason?: string;
  }>;

  getMyProfiles(ownerUid: string): Promise<ProfileRecord[]>;

  deleteProfile(ownerUid: string, profileUid: string): Promise<{ success: boolean }>;
}
