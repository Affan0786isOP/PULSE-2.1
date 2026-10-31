import type { AssessmentAttribution, SessionCapability } from '../../../shared/contracts/profiles';

export interface IProfileAttributionRepository {
  createAttribution(params: {
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
  }>;

  verifyAndConsumeCapability(params: {
    rawCapability: string;
    sessionId: string;
    ownerUid: string;
    tokenHash: string;
  }): Promise<{
    valid: boolean;
    profileUid: string;
    displayNameSnapshot: string;
    ageGroupSnapshot: string;
  }>;
}
