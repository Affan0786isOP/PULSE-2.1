import type { FirestoreProfileRegistryRepository } from '../repositories/firestore/firestoreProfileRegistryRepository';
import type { ProfileRecord } from '../../shared/contracts/profiles';
import { AppError } from '../models/replayContracts';

export class ProfileRegistryService {
  constructor(private readonly repository: FirestoreProfileRegistryRepository) {}

  async reserveProfile(params: {
    ownerUid: string;
    displayName: string;
    ageGroup: any;
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
