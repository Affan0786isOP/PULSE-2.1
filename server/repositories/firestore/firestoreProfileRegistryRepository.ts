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
    const { ownerUid, displayName, ageGroup, shareAgeGroupOnLeaderboard = true } = params;

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
    const nameRef = db.collection('names').doc(normalizedName);
    const profileUid = this.generateProfileUid();
    const profileRef = db.collection('profiles').doc(profileUid);

    const now = Date.now();

    return await db.runTransaction(async (tx: Transaction) => {
      const [accountSnap, nameSnap] = await Promise.all([
        tx.get(accountRef),
        tx.get(nameRef)
      ]);

      let accountData: AccountRegistry;
      if (!accountSnap.exists) {
        accountData = {
          ownerUid,
          profileCount: 0,
          profileUids: [],
          revision: 1,
          isPermanentAccount: false,
          email: null,
          createdAt: now,
          updatedAt: now
        };
      } else {
        accountData = accountSnap.data() as AccountRegistry;
      }

      if (accountData.profileCount >= 5 || accountData.profileUids.length >= 5) {
        throw new AppError('PROFILE_LIMIT_EXCEEDED: Accounts can hold a maximum of 5 profiles', 400);
      }

      if (nameSnap.exists) {
        const nameData = nameSnap.data() as NameReservation;
        if (nameData.status === 'active') {
          throw new AppError('NAME_ALREADY_TAKEN: That display name is already in use', 409);
        }
        if (nameData.status === 'tombstone' && nameData.expiresAt) {
          const exp = typeof nameData.expiresAt === 'number'
            ? nameData.expiresAt
            : (nameData.expiresAt as Timestamp)?.toMillis?.() || 0;
          if (now < exp) {
            throw new AppError('NAME_IN_COOLDOWN: That display name was recently deleted and is in cooldown', 409);
          }
        }
      }

      const newProfile: ProfileRecord = {
        profileUid,
        displayName: displayName.trim(),
        normalizedName,
        ageGroup: ageGroup as AgeGroup,
        ownerUid,
        shareAgeGroupOnLeaderboard: Boolean(shareAgeGroupOnLeaderboard),
        revision: 1,
        lastRenamedAt: null,
        createdAt: now,
        updatedAt: now
      };

      const newReservation: NameReservation = {
        normalizedName,
        profileUid,
        ownerUid,
        status: 'active',
        tombstoneReason: null,
        reservedAt: now,
        expiresAt: null
      };

      tx.set(profileRef, newProfile);
      tx.set(nameRef, newReservation);

      if (!accountSnap.exists) {
        accountData.profileCount = 1;
        accountData.profileUids = [profileUid];
        tx.set(accountRef, accountData);
      } else {
        tx.update(accountRef, {
          profileCount: accountData.profileCount + 1,
          profileUids: [...accountData.profileUids, profileUid],
          revision: (accountData.revision || 1) + 1,
          updatedAt: now
        });
      }

      return { success: true, profile: newProfile };
    });
  }

  async checkNameAvailability(displayName: string): Promise<{ available: boolean; normalizedName: string; reason?: string }> {
    const validation = validateProfileDisplayName(displayName);
    if (!validation.valid) {
      return { available: false, normalizedName: '', reason: validation.error };
    }

    const db = this.getDb();
    if (!db) throw new AppError('Database unavailable', 503);

    const nameRef = db.collection('names').doc(validation.normalized);
    const snap = await nameRef.get();
    if (!snap.exists) {
      return { available: true, normalizedName: validation.normalized };
    }

    const data = snap.data() as NameReservation;
    if (data.status === 'active') {
      return { available: false, normalizedName: validation.normalized, reason: 'NAME_ALREADY_TAKEN' };
    }

    if (data.status === 'tombstone' && data.expiresAt) {
      const exp = typeof data.expiresAt === 'number'
        ? data.expiresAt
        : (data.expiresAt as Timestamp)?.toMillis?.() || 0;
      if (Date.now() < exp) {
        return { available: false, normalizedName: validation.normalized, reason: 'NAME_IN_COOLDOWN' };
      }
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

      const now = Date.now();
      const tombstoneExp = now + 30 * 24 * 60 * 60 * 1000; // 30-day deletion cooldown
      const nameRef = db.collection('names').doc(profile.normalizedName);

      tx.set(nameRef, {
        normalizedName: profile.normalizedName,
        profileUid: null,
        ownerUid: null,
        status: 'tombstone',
        tombstoneReason: 'DELETE',
        reservedAt: now,
        expiresAt: tombstoneExp
      });

      tx.delete(profileRef);

      if (accountSnap.exists) {
        const account = accountSnap.data() as AccountRegistry;
        const nextUids = (account.profileUids || []).filter(u => u !== profileUid);
        tx.update(accountRef, {
          profileUids: nextUids,
          profileCount: nextUids.length,
          revision: (account.revision || 1) + 1,
          updatedAt: now
        });
      }

      return { success: true };
    });
  }
}
