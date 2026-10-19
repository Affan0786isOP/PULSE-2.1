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

let statsCache: CachedStats | null = null;
let inFlightStatsPromise: Promise<number> | null = null;
const STATS_TTL_MS = 60_000;

export function clearAuthoritativeStatsCache(): void {
  statsCache = null;
  inFlightStatsPromise = null;
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
  const hasFreshCache = statsCache !== null && (now - statsCache.storedAt) < STATS_TTL_MS;

  const [resultsCount, setResultsCount] = useState<number | null>(hasFreshCache ? statsCache!.count : null);
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
          statsCache = { count, storedAt: Date.now() };
          return count;
        })
        .catch((err) => {
          statsCache = null;
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
