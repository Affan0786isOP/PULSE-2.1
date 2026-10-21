import { describe, it, expect } from 'vitest';
import { createServerContainer } from './container';
import { SessionService } from './services/sessionService';
import { PersonalBestService } from './services/personalBestService';
import { ResearchService } from './services/researchService';
import { LeaderboardAppService } from './services/leaderboardAppService';
import type { Firestore } from 'firebase-admin/firestore';

describe('Server Container', () => {
  it('should initialize successfully with a custom db provider', () => {
    const mockDbProvider = () => null as Firestore | null;
    const container = createServerContainer(mockDbProvider);

    expect(container).toBeDefined();

    // Check that services are instantiated with correct types
    expect(container.sessionService).toBeInstanceOf(SessionService);
    expect(container.personalBestService).toBeInstanceOf(PersonalBestService);
    expect(container.researchService).toBeInstanceOf(ResearchService);
    expect(container.leaderboardService).toBeInstanceOf(LeaderboardAppService);  });

  it('should initialize successfully with the default db provider', () => {
    // Calling without arguments should use getAdminDb implicitly
    const container = createServerContainer();

    expect(container).toBeDefined();

    // Check that services are instantiated with correct types
    expect(container.sessionService).toBeInstanceOf(SessionService);
    expect(container.personalBestService).toBeInstanceOf(PersonalBestService);
    expect(container.researchService).toBeInstanceOf(ResearchService);
    expect(container.leaderboardService).toBeInstanceOf(LeaderboardAppService);  });
});
