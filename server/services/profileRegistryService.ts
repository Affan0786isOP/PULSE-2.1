import type { IProfileRegistryRepository } from '../repositories/interfaces/IProfileRegistryRepository';
import type { ProfileRecord } from '../../shared/contracts/profiles';

export class ProfileRegistryService {
  constructor(private readonly repository: IProfileRegistryRepository) {}

  async reserveProfile(params: {
    ownerUid: string;
    displayName: string;
    ageGroup: string;
    shareAgeGroupOnLeaderboard?: boolean;
  }): Promise<{ success: boolean; profile: ProfileRecord }> {
    return this.repository.reserveProfile(params);
  }

  async checkNameAvailability(displayName: string): Promise<{ available: boolean; normalizedName: string; reason?: string }> {
    return this.repository.checkNameAvailability(displayName);
  }

  async getMyProfiles(ownerUid: string): Promise<ProfileRecord[]> {
    return this.repository.getMyProfiles(ownerUid);
  }

  async deleteProfile(ownerUid: string, profileUid: string): Promise<{ success: boolean }> {
    return this.repository.deleteProfile(ownerUid, profileUid);
  }
}
