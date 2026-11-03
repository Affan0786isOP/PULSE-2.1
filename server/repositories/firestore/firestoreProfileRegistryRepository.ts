import type { Firestore, Transaction, DocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import {
  validateProfileDisplayName,
  type ProfileRecord,
  type NameReservation,
  type AccountRegistry
} from '../../../shared/contracts/profiles';
import type { AgeGroup } from '../../../shared/contracts/common';
import type { IProfileRegistryRepository } from '../interfaces/IProfileRegistryRepository';
import { AppError } from '../../models/replayContracts';

export interface ReserveProfileParams {
  ownerUid: string;
  ownerEmail?: string | null;
  displayName: string;
  ageGroup: string;
  shareAgeGroupOnLeaderboard?: boolean;
}

export class FirestoreProfileRegistryRepository implements IProfileRegistryRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  generateProfileUid(): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    const bytes = crypto.randomBytes(16);
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars[bytes[i] % 36];
    }
    return result;
  }

  async reserveProfile(params: ReserveProfileParams): Promise<{ success: boolean; profile: ProfileRecord }> {
    const { ownerUid, ownerEmail, displayName, ageGroup, shareAgeGroupOnLeaderboard = true } = params;

    const validation = validateProfileDisplayName(displayName);
    if (!validation.valid) {
      throw new AppError(`Invalid display name: ${validation.error}`, 400);
    }
    const normalizedName = validation.normalized;

    const db = this.getDb();
    if (!db) {
      throw new AppError('Database unavailable', 503);
    }

    const accountRef = db.collection('accounts').doc(ownerUid);
    const profileUid = this.generateProfileUid();
    const profileRef = db.collection('profiles').doc(profileUid);

    const now = Date.now();
    const discriminator = Math.floor(1000 + Math.random() * 9000).toString();
    const leaderboardDisplayName = `${displayName.trim()} #${discriminator}`;

    return await db.runTransaction(async (tx: Transaction) => {
      const accountSnap = await tx.get(accountRef);

      let accountData: AccountRegistry;
      if (!accountSnap.exists) {
        accountData = {
          ownerUid,
          profileCount: 0,
          profileUids: [],
          revision: 1,
          isPermanentAccount: Boolean(ownerEmail),
          email: ownerEmail || null,
          createdAt: now,
          updatedAt: now
        };
      } else {
        accountData = accountSnap.data() as AccountRegistry;
      }

      if (accountData.profileCount >= 10 || accountData.profileUids.length >= 10) {
        throw new AppError('PROFILE_LIMIT_EXCEEDED: Accounts can hold a maximum of 10 profiles', 400);
      }

      // Check duplicate name within the user's existing profiles
      for (const existingUid of accountData.profileUids) {
        const existingSnap = await tx.get(db.collection('profiles').doc(existingUid));
        if (existingSnap.exists) {
          const ep = existingSnap.data() as ProfileRecord;
          if (ep.normalizedName === normalizedName) {
            throw new AppError('NAME_ALREADY_TAKEN: You already have a profile with this display name', 409);
          }
        }
      }

      const newProfile: ProfileRecord = {
        profileUid,
        displayName: displayName.trim(),
        normalizedName,
        discriminator,
        leaderboardDisplayName,
        ageGroup: ageGroup as AgeGroup,
        ownerUid,
        ownerEmail: ownerEmail || null,
        shareAgeGroupOnLeaderboard: Boolean(shareAgeGroupOnLeaderboard),
        revision: 1,
        lastRenamedAt: null,
        createdAt: now,
        updatedAt: now
      };

      tx.set(profileRef, newProfile);

      if (!accountSnap.exists) {
        accountData.profileCount = 1;
        accountData.profileUids = [profileUid];
        tx.set(accountRef, accountData);
      } else {
        tx.update(accountRef, {
          profileCount: accountData.profileCount + 1,
          profileUids: [...accountData.profileUids, profileUid],
          email: ownerEmail || accountData.email || null,
          revision: (accountData.revision || 1) + 1,
          updatedAt: now
        });
      }

      return { success: true, profile: newProfile };
    });
  }

  async checkNameAvailability(displayName: string, ownerUid?: string): Promise<{ available: boolean; normalizedName: string; reason?: string }> {
    const validation = validateProfileDisplayName(displayName);
    if (!validation.valid) {
      return { available: false, normalizedName: '', reason: validation.error };
    }

    if (!ownerUid) {
      return { available: true, normalizedName: validation.normalized };
    }

    const profiles = await this.getMyProfiles(ownerUid);
    const taken = profiles.some(p => p.normalizedName === validation.normalized);
    if (taken) {
      return { available: false, normalizedName: validation.normalized, reason: 'NAME_ALREADY_TAKEN' };
    }

    return { available: true, normalizedName: validation.normalized };
  }

  async getMyProfiles(ownerUid: string): Promise<ProfileRecord[]> {
    const db = this.getDb();
    if (!db) throw new AppError('Database unavailable', 503);

    const accountRef = db.collection('accounts').doc(ownerUid);
    const accountSnap = await accountRef.get();
    if (!accountSnap.exists) return [];

    const account = accountSnap.data() as AccountRegistry;
    if (!account.profileUids || account.profileUids.length === 0) return [];

    const profiles: ProfileRecord[] = [];
    for (const uid of account.profileUids) {
      const pSnap = await db.collection('profiles').doc(uid).get();
      if (pSnap.exists) {
        profiles.push(pSnap.data() as ProfileRecord);
      }
    }
    return profiles;
  }

  async deleteProfile(ownerUid: string, profileUid: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    if (!db) throw new AppError('Database unavailable', 503);

    const profileRef = db.collection('profiles').doc(profileUid);
    const accountRef = db.collection('accounts').doc(ownerUid);

    return await db.runTransaction(async (tx: Transaction) => {
      const [profileSnap, accountSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(accountRef)
      ]);

      if (!profileSnap.exists) {
        throw new AppError('Profile not found', 404);
      }

      const profile = profileSnap.data() as ProfileRecord;
      if (profile.ownerUid !== ownerUid) {
        throw new AppError('Forbidden: You do not own this profile', 403);
      }

      tx.delete(profileRef);

      if (accountSnap.exists) {
        const account = accountSnap.data() as AccountRegistry;
        const nextUids = (account.profileUids || []).filter(u => u !== profileUid);
        tx.update(accountRef, {
          profileUids: nextUids,
          profileCount: nextUids.length,
          revision: (account.revision || 1) + 1,
          updatedAt: Date.now()
        });
      }

      return { success: true };
    });
  }
}
