import * as crypto from 'crypto';
import type { IProfileAttributionRepository } from '../repositories/interfaces/IProfileAttributionRepository';

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
  constructor(private readonly repository: IProfileAttributionRepository) {}

  hashCapability(rawCapability: string): string {
    return crypto.createHash('sha256').update(rawCapability, 'utf8').digest('hex');
  }

  generateRawCapability(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async initializeAttribution(params: InitializeAttributionParams): Promise<{
    rawCapability: string;
    tokenHash: string;
    ageGroupSnapshot: string;
    displayNameSnapshot: string;
  }> {
    const rawCapability = this.generateRawCapability();
    const tokenHash = this.hashCapability(rawCapability);

    return this.repository.createAttribution({
      sessionId: params.sessionId,
      ownerUid: params.ownerUid,
      profileUid: params.profileUid,
      rawCapability,
      tokenHash
    });
  }

  async verifyAndConsumeCapability(params: VerifyCapabilityParams): Promise<{
    valid: boolean;
    profileUid: string;
    displayNameSnapshot: string;
    ageGroupSnapshot: string;
  }> {
    const tokenHash = this.hashCapability(params.rawCapability);

    return this.repository.verifyAndConsumeCapability({
      rawCapability: params.rawCapability,
      sessionId: params.sessionId,
      ownerUid: params.ownerUid,
      tokenHash
    });
  }
}
