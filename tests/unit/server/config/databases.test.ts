import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initStorageStrategy,
  getResearchDb,
  getProfilesDb,
  getLeaderboardDb,
  resetDatabasesForTesting
} from '../../../../server/config/databases';

describe('Server Multi-Database Architecture Bootstrap', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    resetDatabasesForTesting();
    process.env = { ...origEnv };
  });

  afterEach(() => {
    resetDatabasesForTesting();
    process.env = origEnv;
  });

  it('fails fast on startup when PULSE_STORAGE_STRATEGY is invalid or undefined', () => {
    delete process.env.PULSE_STORAGE_STRATEGY;
    expect(() => initStorageStrategy()).toThrowError(/PULSE_STORAGE_STRATEGY is required/);

    process.env.PULSE_STORAGE_STRATEGY = 'unsupported_mode';
    expect(() => initStorageStrategy()).toThrowError(/Invalid PULSE_STORAGE_STRATEGY/);
  });

  it('blocks physical strategy in production with explicit error', () => {
    process.env.PULSE_STORAGE_STRATEGY = 'physical';
    process.env.NODE_ENV = 'production';
    expect(() => initStorageStrategy()).toThrowError(/Physical multi-database strategy is BLOCKED in production/);
  });

  it('initializes logical strategy using Firestore client provider without throw', () => {
    process.env.PULSE_STORAGE_STRATEGY = 'logical';
    delete process.env.NODE_ENV;

    const mockDb: any = { collection: vi.fn(), runTransaction: vi.fn() };
    const strategy = initStorageStrategy({ defaultDbProvider: () => mockDb });

    expect(strategy.strategy).toBe('logical');
    expect(getResearchDb()).toBe(mockDb);
    expect(getProfilesDb()).toBe(mockDb);
    expect(getLeaderboardDb()).toBe(mockDb);
  });
});
