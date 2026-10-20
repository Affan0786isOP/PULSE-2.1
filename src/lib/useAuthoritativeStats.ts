import { useState, useEffect } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { ensureFirebaseReady, ensureAuthenticatedUser } from './firestore';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';

export interface AuthoritativeHeroStats {
  testsCount: number;
  resultsCount: number | null;
  isLoadingResults: boolean;
}

/**
 * Reads the number of public research result records from Firestore.
 *
 * publicDataset is the single counting source for the desktop hero: it is readable
 * to authenticated (including anonymous) clients under the existing rules.
 * If auth or Firestore is unavailable, the UI displays an unavailable marker;
 * it never substitutes a mock, stale count, or unrelated collection total.
 */
interface CachedStats {
  count: number;
  storedAt: number;
}

const STATS_STORAGE_KEY = 'pulse_authoritative_stats';
let statsCache: CachedStats | null = null;
let inFlightStatsPromise: Promise<number> | null = null;
const STATS_TTL_MS = 60_000;

function readPersistedStats(): CachedStats | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.count === 'number' && Number.isSafeInteger(parsed.count) && parsed.count >= 0) {
      return {
        count: parsed.count,
        storedAt: typeof parsed.storedAt === 'number' ? parsed.storedAt : 0,
      };
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return null;
}

function persistStats(stats: CachedStats): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAuthoritativeStatsCache(): void {
  statsCache = null;
  inFlightStatsPromise = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STATS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

async function loadAuthoritativeCount(): Promise<number> {
  const ready = await ensureFirebaseReady();
  if (!ready || !db) {
    throw new Error('Firebase is not ready');
  }

  const authenticated = await ensureAuthenticatedUser();
  if (!authenticated) {
    throw new Error('Anonymous authentication failed');
  }

  const countSnap = await getCountFromServer(collection(db, 'publicDataset'));
  const count = countSnap.data().count;
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Firestore returned an invalid public result count');
  }
  return count;
}

export function useAuthoritativeStats(): AuthoritativeHeroStats {
  const testsCount = CANONICAL_ASSESSMENT_IDS.length;
  const now = Date.now();

  if (statsCache === null) {
    const persisted = readPersistedStats();
    if (persisted) {
      statsCache = persisted;
    }
  }

  const hasFreshCache = statsCache !== null && (now - statsCache.storedAt) < STATS_TTL_MS;
  const initialCount = statsCache !== null ? statsCache.count : null;

  const [resultsCount, setResultsCount] = useState<number | null>(initialCount);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(!hasFreshCache);

  useEffect(() => {
    let active = true;
    const currentNow = Date.now();

    if (statsCache !== null && (currentNow - statsCache.storedAt) < STATS_TTL_MS) {
      if (active) {
        setResultsCount(statsCache.count);
        setIsLoadingResults(false);
      }
      return () => {
        active = false;
      };
    }

    if (!inFlightStatsPromise) {
      inFlightStatsPromise = loadAuthoritativeCount()
        .then((count) => {
          const fresh = { count, storedAt: Date.now() };
          statsCache = fresh;
          persistStats(fresh);
          return count;
        })
        .catch((err) => {
          statsCache = null;
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
              localStorage.removeItem(STATS_STORAGE_KEY);
            } catch {}
          }
          throw err;
        })
        .finally(() => {
          inFlightStatsPromise = null;
        });
    }

    inFlightStatsPromise
      .then((count) => {
        if (active) {
          setResultsCount(count);
          setIsLoadingResults(false);
        }
      })
      .catch((err) => {
        console.warn('[useAuthoritativeStats] Could not fetch public results count:', err);
        if (active) {
          setResultsCount(null);
          setIsLoadingResults(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { testsCount, resultsCount, isLoadingResults };
}
