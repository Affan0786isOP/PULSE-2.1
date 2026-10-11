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
export function useAuthoritativeStats(): AuthoritativeHeroStats {
  const testsCount = CANONICAL_ASSESSMENT_IDS.length;
  const [resultsCount, setResultsCount] = useState<number | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        const ready = await ensureFirebaseReady();
        if (!ready || !db) return;

        const authenticated = await ensureAuthenticatedUser();
        if (!authenticated) return;

        const countSnap = await getCountFromServer(collection(db, 'publicDataset'));
        const count = countSnap.data().count;
        if (!Number.isSafeInteger(count) || count < 0) {
          throw new Error('Firestore returned an invalid public result count');
        }

        if (active) setResultsCount(count);
      } catch (err) {
        console.warn('[useAuthoritativeStats] Could not fetch public results count:', err);
        if (active) setResultsCount(null);
      } finally {
        if (active) setIsLoadingResults(false);
      }
    }

    void fetchStats();
    return () => {
      active = false;
    };
  }, []);

  return { testsCount, resultsCount, isLoadingResults };
}
