import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from './config/firebaseAdmin';
import type { ISessionRepository } from './repositories/interfaces/ISessionRepository';
import type { IResearchSubmissionRepository } from './repositories/interfaces/IResearchSubmissionRepository';
import type { IResearchDatasetRepository } from './repositories/interfaces/IResearchDatasetRepository';
import type { ILeaderboardSubmissionRepository } from './repositories/interfaces/ILeaderboardSubmissionRepository';
import type { ILeaderboardRepository } from './repositories/interfaces/ILeaderboardRepository';
import type { IAdminAuditRepository } from './repositories/interfaces/IAdminAuditRepository';

import { FirestoreSessionRepository } from './repositories/firestore/firestoreSessionRepository';
import { FirestoreResearchSubmissionRepository } from './repositories/firestore/firestoreResearchSubmissionRepository';
import { FirestoreResearchDatasetRepository } from './repositories/firestore/firestoreResearchDatasetRepository';
import { FirestoreLeaderboardSubmissionRepository } from './repositories/firestore/firestoreLeaderboardSubmissionRepository';
import { FirestoreLeaderboardRepository } from './repositories/firestore/firestoreLeaderboardRepository';
import { FirestoreAdminAuditRepository } from './repositories/firestore/firestoreAdminAuditRepository';

import type { ISessionService } from './services/interfaces/ISessionService';
import type { IPersonalBestService } from './services/interfaces/IPersonalBestService';
import type { IResearchService } from './services/interfaces/IResearchService';
import type { ILeaderboardService } from './services/interfaces/ILeaderboardService';
import type { IAdminService } from './services/interfaces/IAdminService';

import { SessionService, setDefaultSessionService } from './services/sessionService';
import { PersonalBestService } from './services/personalBestService';
import { ResearchService } from './services/researchService';
import { LeaderboardAppService } from './services/leaderboardAppService';
import { AdminService } from './services/adminService';

export interface ServerContainer {
  sessionRepository: ISessionRepository;
  researchSubmissionRepository: IResearchSubmissionRepository;
  researchDatasetRepository: IResearchDatasetRepository;
  leaderboardSubmissionRepository: ILeaderboardSubmissionRepository;
  leaderboardRepository: ILeaderboardRepository;
  adminAuditRepository: IAdminAuditRepository;

  sessionService: ISessionService;
  personalBestService: IPersonalBestService;
  researchService: IResearchService;
  leaderboardService: ILeaderboardService;
  adminService: IAdminService;
}

export function createServerContainer(dbProvider?: () => Firestore | null): ServerContainer {
  const getDb = dbProvider ?? getAdminDb;

  const sessionRepository = new FirestoreSessionRepository(getDb);
  const researchSubmissionRepository = new FirestoreResearchSubmissionRepository(getDb);
  const researchDatasetRepository = new FirestoreResearchDatasetRepository(getDb);
  const leaderboardSubmissionRepository = new FirestoreLeaderboardSubmissionRepository(getDb);
  const leaderboardRepository = new FirestoreLeaderboardRepository(getDb);
  const adminAuditRepository = new FirestoreAdminAuditRepository(getDb);

  const sessionService = new SessionService(sessionRepository);
  setDefaultSessionService(sessionService);

  const personalBestService = new PersonalBestService(sessionRepository);
  const researchService = new ResearchService(
    sessionService,
    sessionRepository,
    researchSubmissionRepository,
    researchDatasetRepository
  );
  const leaderboardService = new LeaderboardAppService(
    sessionRepository,
    leaderboardRepository,
    leaderboardSubmissionRepository
  );
  const adminService = new AdminService(adminAuditRepository, leaderboardRepository);

  return {
    sessionRepository,
    researchSubmissionRepository,
    researchDatasetRepository,
    leaderboardSubmissionRepository,
    leaderboardRepository,
    adminAuditRepository,

    sessionService,
    personalBestService,
    researchService,
    leaderboardService,
    adminService
  };
}
