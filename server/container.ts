import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from './config/firebaseAdmin';


import { FirestoreSessionRepository } from './repositories/firestore/firestoreSessionRepository';
import { FirestoreResearchSubmissionRepository } from './repositories/firestore/firestoreResearchSubmissionRepository';
import { FirestoreResearchDatasetRepository } from './repositories/firestore/firestoreResearchDatasetRepository';
import { FirestoreLeaderboardSubmissionRepository } from './repositories/firestore/firestoreLeaderboardSubmissionRepository';
import { FirestoreLeaderboardRepository } from './repositories/firestore/firestoreLeaderboardRepository';

import type { ISessionService } from './services/interfaces/ISessionService';
import type { IPersonalBestService } from './services/interfaces/IPersonalBestService';
import type { IResearchService } from './services/interfaces/IResearchService';
import type { ILeaderboardService } from './services/interfaces/ILeaderboardService';

import { SessionService } from './services/sessionService';
import { PersonalBestService } from './services/personalBestService';
import { ResearchService } from './services/researchService';
import { LeaderboardAppService } from './services/leaderboardAppService';

export interface ServerContainer {
  sessionService: ISessionService;
  personalBestService: IPersonalBestService;
  researchService: IResearchService;
  leaderboardService: ILeaderboardService;
}


export function createServerContainer(dbProvider?: () => Firestore | null): ServerContainer {
  const getDb = dbProvider ?? getAdminDb;

  const sessionRepository = new FirestoreSessionRepository(getDb);
  const researchSubmissionRepository = new FirestoreResearchSubmissionRepository(getDb);
  const researchDatasetRepository = new FirestoreResearchDatasetRepository(getDb);
  const leaderboardSubmissionRepository = new FirestoreLeaderboardSubmissionRepository(getDb);
  const leaderboardRepository = new FirestoreLeaderboardRepository(getDb);

  const sessionService = new SessionService(sessionRepository);
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

  return {
    sessionService,
    personalBestService,
    researchService,
    leaderboardService
  };
}
