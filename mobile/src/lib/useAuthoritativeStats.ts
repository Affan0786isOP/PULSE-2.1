import { useState, useEffect } from 'react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db, isConfigured } from './firebase';
import { ensureFirebaseReady, ensureAuthenticatedUser } from './firestore';
import { CANONICAL_ASSESSMENT_IDS } from '../../../shared/contracts/common';

export interface AuthoritativeHeroStats {
  testsCount: number;
  resultsCount: number | null;
  leaderboardCount: number | null;
  isLoadingResults: boolean;
  isLoadingLeaderboard: boolean;
}

export function useAuthoritativeStats(): AuthoritativeHeroStats {
  const testsCount = CANONICAL_ASSESSMENT_IDS.length;
  const [resultsCount, setResultsCount] = useState<number | null>(null);
  const [leaderboardCount, setLeaderboardCount] = useState<number | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      // 1. Fetch Verified Results Count
      try {
        let countResolved = false;

        // Try authoritative server-side aggregation endpoint first
        try {
          const res = await fetch('/api/research/dataset/summary');
          if (res.ok) {
            const data = await res.json();
            if (data?.success && typeof data.totalRecords === 'number') {
              if (isMounted) {
                setResultsCount(data.totalRecords);
                setIsLoadingResults(false);
                countResolved = true;
              }
            }
          }
        } catch {
          // Server endpoint not reachable (e.g. static/client-only environment), fallback to Firestore
        }

        // Direct Firestore fallback if server endpoint was not available
        if (!countResolved && isConfigured && db) {
          const ready = await ensureFirebaseReady();
          if (ready) {
            await ensureAuthenticatedUser();
            const colRef = collection(db, 'publicDataset');
            const countSnap = await getCountFromServer(colRef);
            if (isMounted) {
              setResultsCount(countSnap.data().count);
              setIsLoadingResults(false);
              countResolved = true;
            }
          }
        }

        if (!countResolved && isMounted) {
          setIsLoadingResults(false);
        }
      } catch (err) {
        console.warn('[useAuthoritativeStats] Could not fetch results count:', err);
        if (isMounted) {
          setIsLoadingResults(false);
        }
      }

      // 2. Fetch Verified Leaderboard Active Entries Count
      try {
        let lbResolved = false;

        // Try server-side public leaderboard first
        try {
          const res = await fetch('/api/leaderboard');
          if (res.ok) {
            const data = await res.json();
            if (data?.success && Array.isArray(data.entries)) {
              if (isMounted) {
                setLeaderboardCount(data.entries.length);
                setIsLoadingLeaderboard(false);
                lbResolved = true;
              }
            }
          }
        } catch {
          // Fallback to client Firestore
        }

        if (!lbResolved && isConfigured && db) {
          const ready = await ensureFirebaseReady();
          if (ready) {
            await ensureAuthenticatedUser();
            const q = query(collection(db, 'leaderboardResults'), where('hidden', '==', false));
            const countSnap = await getCountFromServer(q);
            if (isMounted) {
              setLeaderboardCount(countSnap.data().count);
              setIsLoadingLeaderboard(false);
              lbResolved = true;
            }
          }
        }

        if (!lbResolved && isMounted) {
          setIsLoadingLeaderboard(false);
        }
      } catch (err) {
        console.warn('[useAuthoritativeStats] Could not fetch leaderboard count:', err);
        if (isMounted) {
          setIsLoadingLeaderboard(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    testsCount,
    resultsCount,
    leaderboardCount,
    isLoadingResults,
    isLoadingLeaderboard,
  };
}
