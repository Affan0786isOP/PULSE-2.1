import type { Firestore, Transaction, Timestamp } from 'firebase-admin/firestore';
import type { IProfileAttributionRepository } from '../interfaces/IProfileAttributionRepository';
import type { AssessmentAttribution, SessionCapability, ProfileRecord } from '../../../shared/contracts/profiles';
import { AppError } from '../../models/replayContracts';

export class FirestoreProfileAttributionRepository implements IProfileAttributionRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async createAttribution(params: {
    sessionId: string;
    ownerUid: string;
    profileUid: string;
    rawCapability: string;
    tokenHash: string;
  }): Promise<{
    rawCapability: string;
    tokenHash: string;
    ageGroupSnapshot: string;
    displayNameSnapshot: string;
  }> {
    const { sessionId, ownerUid, profileUid, rawCapability, tokenHash } = params;
    const db = this.getDb();
    if (!db) throw new AppError('Profiles database unavailable', 503);

    const profileRef = db.collection('profiles').doc(profileUid);
    const attributionRef = db.collection('assessmentAttributions').doc(sessionId);
    const capabilityRef = db.collection('sessionCapabilities').doc(tokenHash);

    const now = Date.now();
    const capabilityExpiresAt = now + 2 * 60 * 60 * 1000;
    const retentionDeleteAt = now + 90 * 24 * 60 * 60 * 1000;

    return await db.runTransaction(async (tx: Transaction) => {
      const profileSnap = await tx.get(profileRef);
      if (!profileSnap.exists) {
        throw new AppError('Profile not found', 404);
      }

      const profile = profileSnap.data() as ProfileRecord;
      if (profile.ownerUid !== ownerUid) {
        throw new AppError('Forbidden: Profile ownership mismatch', 403);
      }

      const attribution: AssessmentAttribution = {
        sessionId,
        profileUid,
        ownerUid,
        displayNameSnapshot: profile.displayName,
        ageGroupSnapshot: profile.ageGroup,
        profileRevision: profile.revision || 1,
        createdAt: now,
        capabilityExpiresAt,
        retentionDeleteAt,
        status: 'active'
      };

      const capability: SessionCapability = {
        tokenHash,
        sessionId,
        expiresAt: capabilityExpiresAt,
        usedAt: null,
        status: 'active'
      };

      tx.set(attributionRef, attribution);
      tx.set(capabilityRef, capability);

      return {
        rawCapability,
        tokenHash,
        ageGroupSnapshot: profile.ageGroup,
        displayNameSnapshot: profile.displayName
      };
    });
  }

  async verifyAndConsumeCapability(params: {
    rawCapability: string;
    sessionId: string;
    ownerUid: string;
    tokenHash: string;
  }): Promise<{
    valid: boolean;
    profileUid: string;
    displayNameSnapshot: string;
    ageGroupSnapshot: string;
  }> {
    const { sessionId, ownerUid, tokenHash } = params;
    const db = this.getDb();
    if (!db) throw new AppError('Profiles database unavailable', 503);

    const capabilityRef = db.collection('sessionCapabilities').doc(tokenHash);
    const attributionRef = db.collection('assessmentAttributions').doc(sessionId);

    return await db.runTransaction(async (tx: Transaction) => {
      const [capSnap, attrSnap] = await Promise.all([
        tx.get(capabilityRef),
        tx.get(attributionRef)
      ]);

      if (!capSnap.exists) {
        throw new AppError('Invalid or unrecognized session capability', 400);
      }

      const cap = capSnap.data() as SessionCapability;
      if (cap.sessionId !== sessionId) {
        throw new AppError('Capability and session ID mismatch', 400);
      }

      if (cap.status !== 'active') {
        throw new AppError('Capability has already been consumed or revoked', 400);
      }

      const now = Date.now();
      const expiresAt = typeof cap.expiresAt === 'number'
        ? cap.expiresAt
        : (cap.expiresAt as Timestamp)?.toMillis?.() || 0;

      if (now > expiresAt) {
        throw new AppError('CAPABILITY_EXPIRED: Session submission window has expired', 400);
      }

      if (!attrSnap.exists) {
        throw new AppError('Assessment attribution record missing', 404);
      }

      const attr = attrSnap.data() as AssessmentAttribution;
      if (attr.ownerUid !== ownerUid) {
        throw new AppError('Forbidden: Attribution owner mismatch', 403);
      }

      tx.update(capabilityRef, {
        status: 'consumed',
        usedAt: now
      });

      tx.update(attributionRef, {
        status: 'submitted'
      });

      return {
        valid: true,
        profileUid: attr.profileUid,
        displayNameSnapshot: attr.displayNameSnapshot,
        ageGroupSnapshot: attr.ageGroupSnapshot
      };
    });
  }
}
