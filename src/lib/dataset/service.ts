import { collection, getDocs, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db, isConfigured } from '../firebase';
import {
  ResearchSessionRecord,
  DatasetObservation
} from './types';
import { normalizeProtocolType, normalizeSessionToObservations } from './normalization';

/**
 * Canonical Research Dataset Fetcher
 * Queries server API `/api/research/dataset` using cursor-based pagination to retrieve the COMPLETE dataset,
 * falling back to paginated direct Firestore SDK if necessary.
 * 
 * NOTE ON FALLBACK SOURCE:
 * Both the `/api/research/dataset` endpoint and the direct fallback query use the `publicDataset` collection.
 * The `publicDataset` collection is the canonical public projection written transactionally alongside 
 * the authoritative `experimentSessions` and `assessmentResults` records in `server.ts`.
 * Because both paths query the same canonical projection, they produce identical normalized semantics.
 * 
 * Propagates errors explicitly without fabricating fake observations or truncating data.
 */
export async function fetchResearchDataset(): Promise<{
  records: ResearchSessionRecord[];
  observations: DatasetObservation[];
}> {
  let fetchedRecords: ResearchSessionRecord[] = [];
  let fetchError: Error | null = null;

  // 1. Try server API endpoint with cursor pagination to retrieve all records
  try {
    let tempRecords: ResearchSessionRecord[] = [];
    let hasMore = true;
    let cursor: string | null = null;
    const batchSize = 1000;

    while (hasMore) {
      const url = new URL('/api/research/dataset', typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      url.searchParams.set('limit', String(batchSize));
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        tempRecords.push(...data.records);
        if (data.hasMore) {
          if (!data.nextCursor) {
            throw new Error("Malformed pagination response: hasMore is true but nextCursor is missing");
          }
          cursor = data.nextCursor;
        } else {
          hasMore = false;
        }
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("Malformed API response: missing success or error flag");
      }
    }
    fetchedRecords = tempRecords;
  } catch (apiErr) {
    fetchError = apiErr instanceof Error ? apiErr : new Error(String(apiErr));
  }

  // 2. If no server records and Firestore is configured, query Firestore directly with complete pagination
  if (fetchedRecords.length === 0 && isConfigured && db) {
    try {
      let tempRecords: ResearchSessionRecord[] = [];
      const batchSize = 1000;
      let hasMore = true;
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      while (hasMore) {
        let q = lastDoc
          ? query(collection(db, 'publicDataset'), orderBy('__name__'), startAfter(lastDoc), limit(batchSize))
          : query(collection(db, 'publicDataset'), orderBy('__name__'), limit(batchSize));

        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
          break;
        }

        const pageRecords = snap.docs.map(docSnap => {
          const d = docSnap.data();
          let derivedMonth = d.completedAtMonth;
          if (!derivedMonth && (d.completedAtTimestamp || d.createdAt)) {
            const dateObj = new Date(d.completedAtTimestamp || d.createdAt);
            if (!isNaN(dateObj.getTime())) {
              derivedMonth = dateObj.toISOString().substring(0, 7);
            }
          }

          return {
            id: docSnap.id,
            assessmentType: normalizeProtocolType(d.assessmentType || ''),
            ageGroup: d.ageGroup,
            completedAtMonth: derivedMonth,
            completedAtTimestamp: d.completedAtTimestamp || d.createdAt,
            deviceCategory: d.deviceCategory || d.device,
            device: d.device,
            inputModality: d.inputModality || d.inputMethod,
            displayRefreshRateHz: d.displayRefreshRateHz || d.refreshRateHz || d.refreshRate,
            refreshRateHz: d.refreshRateHz || d.refreshRate,
            provenanceToken: d.provenanceToken,
            trialsDigest: d.trialsDigest,
            scoreMetric: d.scoreMetric,
            averageReactionTime: d.averageReactionTime,
            medianReactionTime: d.medianReactionTime,
            fastestReactionTime: d.fastestReactionTime,
            slowestReactionTime: d.slowestReactionTime,
            longestSeq: d.longestSeq,
            highestLevel: d.highestLevel,
            accuracy: d.accuracy,
            congruentAvg: d.congruentAvg,
            incongruentAvg: d.incongruentAvg,
            interferenceCost: d.interferenceCost,
            progressionTrials: d.progressionTrials || []
          } as ResearchSessionRecord;
        });

        tempRecords.push(...pageRecords);
        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < batchSize) {
          hasMore = false;
        }
      }
      fetchedRecords = tempRecords;

      if (fetchedRecords.length > 0) {
        fetchError = null; // Successfully retrieved via direct Firestore
      }
    } catch (fsErr) {
      if (!fetchError) {
        fetchError = fsErr instanceof Error ? fsErr : new Error(String(fsErr));
      }
    }
  }

  // If both endpoints failed and resulted in an error, throw so the UI shows an explicit error state
  if (fetchError && fetchedRecords.length === 0) {
    throw fetchError;
  }

  // Flatten into normalized observations
  const observations: DatasetObservation[] = [];
  fetchedRecords.forEach(rec => {
    const obsList = normalizeSessionToObservations(rec);
    observations.push(...obsList);
  });

  return {
    records: fetchedRecords,
    observations
  };
}

/**
 * Export dataset observations to CSV format using canonical research schema
 */
export function exportObservationsToCSV(observations: DatasetObservation[], filename = 'pulse_dataset_export.csv') {
  if (observations.length === 0) return;

  const headers = [
    'ObservationID',
    'SessionID',
    'AssessmentProtocol',
    'DemographicAgeGroup',
    'TemporalMonth',
    'CompletedAtTimestamp',
    'DeviceCategory',
    'InputModality',
    'RefreshRateHz',
    'TrialIndex',
    'LatencyMs',
    'RawLatencyMs',
    'DisplayDelayOffsetMs',
    'IsValid',
    'IsCorrect',
    'ValidityStatus',
    'QualityFlag',
    'ForeperiodMs',
    'ForeperiodCategory',
    'TargetDirection',
    'ChosenDirection',
    'TargetColor',
    'ChosenColor',
    'WordName',
    'WordColor',
    'Condition',
    'Instruction',
    'UserResponse',
    'Level',
    'SequenceLength',
    'InterTapTimeMs',
    'ResponseDurationMs',
    'StimulusScheduledAtPerfMs',
    'StimulusPresentedAtPerfMs',
    'ResponseDetectedAtPerfMs',
    'ProvenanceToken',
    'TrialsDigest'
  ];

  const rows = observations.map(o => [
    o.obsId,
    o.sessionId,
    o.assessmentType,
    o.ageGroup,
    o.completedAtMonth,
    o.completedAtTimestamp ?? '',
    o.deviceCategory ?? '',
    o.inputModality,
    o.refreshRateHz !== null ? o.refreshRateHz : '',
    o.trialIndex,
    o.latencyMs !== null ? o.latencyMs : '',
    o.rawLatencyMs !== null && o.rawLatencyMs !== undefined ? o.rawLatencyMs : '',
    o.displayDelayOffsetMs !== null && o.displayDelayOffsetMs !== undefined ? o.displayDelayOffsetMs : '',
    o.isValid ? 'TRUE' : 'FALSE',
    o.isCorrect !== null ? (o.isCorrect ? 'TRUE' : 'FALSE') : '',
    o.validityStatus,
    o.qualityFlag ?? '',
    o.foreperiodMs ?? '',
    o.foreperiodCategory ?? '',
    o.targetDirection ?? '',
    o.chosenDirection ?? '',
    o.targetColor ?? '',
    o.chosenColor ?? '',
    o.wordName ?? '',
    o.wordColor ?? '',
    o.condition ?? '',
    o.instruction ?? '',
    o.userResponse ?? '',
    o.level ?? '',
    o.sequenceLength ?? '',
    o.interTapTimeMs ?? '',
    o.responseDurationMs ?? '',
    o.stimulusScheduledAtPerfMs ?? '',
    o.stimulusPresentedAtPerfMs ?? '',
    o.responseDetectedAtPerfMs ?? '',
    o.provenanceToken ?? '',
    o.trialsDigest ?? ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export dataset observations to JSON format
 */
export function exportObservationsToJSON(observations: DatasetObservation[], filename = 'pulse_dataset_export.json') {
  if (observations.length === 0) return;

  const exportPayload = {
    repository: 'PULSE Public Research Dataset',
    exportTimestamp: new Date().toISOString(),
    recordCount: observations.length,
    schemaVersion: 'v1.0.0',
    observations
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
