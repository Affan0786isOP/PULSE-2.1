import * as crypto from 'crypto';
import type { AssessmentAttribution, SessionCapability, ProfileRecord } from '../../shared/contracts/profiles';
import { AppError } from '../models/replayContracts';

export interface InitializeAttributionParams {
  sessionId: string;
  ownerUid: string;
  profileUid: string;
}

export interface VerifyCapabilityParams {
  rawCapability: string;
  sessionId: string;
  ownerUid: string;
}

export class ProfileAttributionService {
  constructor(private readonly getProfilesDb: () => any) {}

  hashCapability(rawCapability: string): string {
    return crypto.createHash('sha256').update(rawCapability, 'utf8').digest('hex');
  }

  generateRawCapability(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 hex characters
  }

  async initializeAttribution(params: InitializeAttributionParams): Promise<{
    rawCapability: string;
    tokenHash: string;
    ageGroupSnapshot: any;
    displayNameSnapshot: string;
  }> {
    const { sessionId, ownerUid, profileUid } = params;
    const db = this.getProfilesDb();
    if (!db) throw new AppError('Profiles database unavailable', 503);

    const profileRef = db.collection('profiles').doc(profileUid);
    const attributionRef = db.collection('assessmentAttributions').doc(sessionId);
    const rawCapability = this.generateRawCapability();
    const tokenHash = this.hashCapability(rawCapability);
    const capabilityRef = db.collection('sessionCapabilities').doc(tokenHash);

    const now = Date.now();
    const capabilityExpiresAt = now + 2 * 60 * 60 * 1000; // 2-hour offline sync window
    const retentionDeleteAt = now + 90 * 24 * 60 * 60 * 1000; // 90-day retention

    return await db.runTransaction(async (tx: any) => {
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

  async verifyAndConsumeCapability(params: VerifyCapabilityParams): Promise<{
    valid: boolean;
    profileUid: string;
    displayNameSnapshot: string;
    ageGroupSnapshot: any;
  }> {
    const { rawCapability, sessionId, ownerUid } = params;
    const tokenHash = this.hashCapability(rawCapability);
    const db = this.getProfilesDb();
    if (!db) throw new AppError('Profiles database unavailable', 503);

    const capabilityRef = db.collection('sessionCapabilities').doc(tokenHash);
    const attributionRef = db.collection('assessmentAttributions').doc(sessionId);

    return await db.runTransaction(async (tx: any) => {
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
        : (cap.expiresAt as any)?.toMillis?.() || 0;

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
