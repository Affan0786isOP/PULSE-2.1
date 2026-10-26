import { db, isConfigured } from './firebase';
import { ensureFirebaseReady, ensureAuthenticatedUser } from './firestore';
import { doc, collection, getDocsFromServer, query, orderBy, limit as firestoreLimit, writeBatch } from 'firebase/firestore';

export interface RawTrialObservation {
  id: string;
  participantId: string;
  experimentId: string;
  condition: string;
  test: string;
  trialNumber: number;
  stimulusTimestamp: number;
  responseTimestamp: number;
  reactionTime: number; // in ms
  accuracy: number; // 1 for correct, 0 for error (or percentage 0-100)
  falseStart: boolean;
  timestamp: string; // ISO 8601 string
  device: string;
  screenWidth: number;
  screenHeight: number;
  ageGroup?: string;
  notes?: string;
  [key: string]: any;
}

const PARTICIPANT_STORAGE_KEY = 'pulse_participant_id';
const RAW_TRIALS_STORAGE_KEY = 'pulse_raw_trial_observations';

/**
 * Returns a persistent anonymous participant ID stored on the device.
 * Generated once via secure UUID and preserved across sessions.
 */
export function getParticipantId(): string {
  if (typeof window === 'undefined') return 'participant-server';
  try {
    let participantId = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    if (!participantId || participantId.trim() === '') {
      participantId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? `sub-${crypto.randomUUID()}`
        : `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, participantId);
    }
    return participantId;
  } catch {
    return `sub-${Date.now()}`;
  }
}

/**
 * Gets device hardware, browser platform, and viewport dimensions.
 */
export function getDeviceDetails(): { device: string; screenWidth: number; screenHeight: number } {
  if (typeof window === 'undefined') {
    return { device: 'Server Environment', screenWidth: 1920, screenHeight: 1080 };
  }

  const screenWidth = typeof window.innerWidth === 'number' ? window.innerWidth : (window.screen?.width || 0);
  const screenHeight = typeof window.innerHeight === 'number' ? window.innerHeight : (window.screen?.height || 0);

  let deviceLabel = 'Web Client';
  try {
    const ua = navigator.userAgent || '';
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
    
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    let os = 'Unknown OS';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';

    deviceLabel = `${isMobile ? 'Mobile' : 'Desktop'} (${os} / ${browser})`;
  } catch {
    deviceLabel = 'Standard Web Browser';
  }

  return {
    device: deviceLabel,
    screenWidth,
    screenHeight
  };
}

/**
 * Retrieves all stored raw trial observations from local persistent storage.
 * Does not overwrite existing records; newest observations appear first.
 */
export function getRawTrialObservations(filter?: {
  test?: string;
  experimentId?: string;
  participantId?: string;
}): RawTrialObservation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RAW_TRIALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: RawTrialObservation[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let filtered = parsed;
    if (filter?.test && filter.test !== 'All') {
      filtered = filtered.filter(obs => obs.test === filter.test);
    }
    if (filter?.experimentId) {
      filtered = filtered.filter(obs => obs.experimentId === filter.experimentId);
    }
    if (filter?.participantId) {
      filtered = filtered.filter(obs => obs.participantId === filter.participantId);
    }

    return filtered;
  } catch (err) {
    console.warn('Failed to retrieve raw trial observations:', err);
    return [];
  }
}

/**
 * Saves a single raw trial observation without overwriting previous measurements.
 * Every trial measurement is an immutable, append-only document.
 */
export async function saveRawTrialObservation(
  data: Omit<RawTrialObservation, 'id' | 'participantId' | 'timestamp' | 'device' | 'screenWidth' | 'screenHeight'> &
    Partial<Pick<RawTrialObservation, 'id' | 'participantId' | 'timestamp' | 'device' | 'screenWidth' | 'screenHeight'>>
): Promise<RawTrialObservation> {
  const participantId = data.participantId || getParticipantId();
  const { device, screenWidth, screenHeight } = getDeviceDetails();
  const timestamp = data.timestamp || new Date().toISOString();
  
  const id = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID 
    ? `obs-${crypto.randomUUID()}` 
    : `obs-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const fullObservation: RawTrialObservation = {
    id,
    participantId,
    experimentId: data.experimentId || `exp-${Date.now()}`,
    condition: data.condition || 'standard',
    test: data.test,
    trialNumber: Math.max(1, Math.round(data.trialNumber || 1)),
    stimulusTimestamp: Number(data.stimulusTimestamp) || 0,
    responseTimestamp: Number(data.responseTimestamp) || 0,
    reactionTime: Math.max(0, Number(data.reactionTime) || 0),
    accuracy: typeof data.accuracy === 'number' ? data.accuracy : (data.accuracy ? 1 : 0),
    falseStart: Boolean(data.falseStart),
    timestamp,
    device: data.device || device,
    screenWidth: typeof data.screenWidth === 'number' ? data.screenWidth : screenWidth,
    screenHeight: typeof data.screenHeight === 'number' ? data.screenHeight : screenHeight,
    ageGroup: data.ageGroup,
    notes: data.notes
  };

  // 1. Append locally immediately (Immutable append-only: newest at head, max 2000 in memory)
  if (typeof window !== 'undefined') {
    try {
      const existing = getRawTrialObservations();
      // Ensure we do NOT overwrite raw observations - only append unique id
      const combined = [fullObservation, ...existing.filter(obs => obs.id !== fullObservation.id)];
      const MAX_LOCAL_TRIALS = 2000;
      if (combined.length > MAX_LOCAL_TRIALS) {
        const evictedCount = combined.length - MAX_LOCAL_TRIALS;
        console.warn(`[TrialStore] Local storage capacity reached (${MAX_LOCAL_TRIALS}). Pruned ${evictedCount} oldest local records. Prior records remain backed up in Cloud Firestore.`);
        try {
          const prevEvicted = Number(localStorage.getItem(`${RAW_TRIALS_STORAGE_KEY}_evicted_count`) || 0);
          localStorage.setItem(`${RAW_TRIALS_STORAGE_KEY}_evicted_count`, String(prevEvicted + evictedCount));
        } catch {}
      }
      const updated = combined.slice(0, MAX_LOCAL_TRIALS);
      localStorage.setItem(RAW_TRIALS_STORAGE_KEY, JSON.stringify(updated));
      
      // Dispatch custom event for real-time subscribers
      window.dispatchEvent(new CustomEvent('pulse_new_raw_trial', { detail: fullObservation }));
    } catch (storageErr) {
      console.warn('Local storage write warning for raw trial:', storageErr);
    }
  }

  // 2. Queue for batched Cloud Firestore sync if configured
  queueTrialForCloudSync(fullObservation);

  return fullObservation;
}

// In-memory queue for batched Firestore trial observation writes
let pendingSyncQueue: RawTrialObservation[] = [];
let batchFlushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushingBatch = false;

/**
 * Flushes all queued trial observations to Cloud Firestore in atomic write batches.
 */
export async function flushPendingTrialObservations(): Promise<void> {
  if (!isConfigured || !db || pendingSyncQueue.length === 0 || isFlushingBatch) return;

  if (batchFlushTimer) {
    clearTimeout(batchFlushTimer);
    batchFlushTimer = null;
  }

  isFlushingBatch = true;
  const itemsToSync = [...pendingSyncQueue];
  pendingSyncQueue = [];

  try {
    const ready = await ensureFirebaseReady();
    if (!ready) {
      pendingSyncQueue = [...itemsToSync, ...pendingSyncQueue];
      isFlushingBatch = false;
      return;
    }

    await ensureAuthenticatedUser().catch(() => {});

    // Write in chunks of up to 500 (Firestore maximum batch size limit)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < itemsToSync.length; i += CHUNK_SIZE) {
      const chunk = itemsToSync.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const obs of chunk) {
        const docRef = doc(db, 'trialObservations', obs.id);
        batch.set(docRef, {
          participantId: obs.participantId,
          experimentId: obs.experimentId,
          condition: obs.condition,
          test: obs.test,
          trialNumber: obs.trialNumber,
          stimulusTimestamp: obs.stimulusTimestamp,
          responseTimestamp: obs.responseTimestamp,
          reactionTime: obs.reactionTime,
          accuracy: obs.accuracy,
          falseStart: obs.falseStart,
          timestamp: obs.timestamp,
          device: obs.device,
          screenWidth: obs.screenWidth,
          screenHeight: obs.screenHeight,
          ageGroup: obs.ageGroup || 'Unspecified'
        });
      }
      await batch.commit();
    }
  } catch (err: any) {
    // Re-queue items on failure for later retry
    pendingSyncQueue = [...itemsToSync, ...pendingSyncQueue];
    console.debug('Batch cloud sync trial observation info:', err?.message || err);
  } finally {
    isFlushingBatch = false;
  }
}

/**
 * Enqueues a trial observation for batched writing to Cloud Firestore.
 */
function queueTrialForCloudSync(obs: RawTrialObservation): void {
  if (!isConfigured || !db) return;
  pendingSyncQueue.push(obs);

  // If queue reaches 20 items, flush immediately; otherwise debounce by 600ms
  if (pendingSyncQueue.length >= 20) {
    flushPendingTrialObservations().catch(() => {});
  } else {
    if (batchFlushTimer) clearTimeout(batchFlushTimer);
    batchFlushTimer = setTimeout(() => {
      flushPendingTrialObservations().catch(() => {});
    }, 600);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingTrialObservations().catch(() => {});
  });
  window.addEventListener('pagehide', () => {
    flushPendingTrialObservations().catch(() => {});
  });
}

/**
 * Fetch recent cloud trial observations (fallback or sync)
 */
export async function fetchCloudTrialObservations(limitCount: number = 200): Promise<RawTrialObservation[]> {
  if (!isConfigured || !db) return getRawTrialObservations();

  try {
    await ensureFirebaseReady();
    await ensureAuthenticatedUser().catch(() => {});

    const colRef = collection(db, 'trialObservations');
    const q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(limitCount));
    const snapshot = await getDocsFromServer(q);

    const cloudObservations: RawTrialObservation[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data) {
        cloudObservations.push({
          id: docSnap.id,
          participantId: data.participantId || 'unknown',
          experimentId: data.experimentId || 'unknown',
          condition: data.condition || 'standard',
          test: data.test || 'visual-reaction',
          trialNumber: data.trialNumber || 1,
          stimulusTimestamp: Number(data.stimulusTimestamp) || 0,
          responseTimestamp: Number(data.responseTimestamp) || 0,
          reactionTime: Number(data.reactionTime) || 0,
          accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : 1,
          falseStart: Boolean(data.falseStart),
          timestamp: data.timestamp || new Date().toISOString(),
          device: data.device || 'Web Browser',
          screenWidth: Number(data.screenWidth) || 0,
          screenHeight: Number(data.screenHeight) || 0,
          ageGroup: data.ageGroup
        });
      }
    });

    // Merge with local observations so no raw local trial is ever lost
    const local = getRawTrialObservations();
    const map = new Map<string, RawTrialObservation>();
    local.forEach(o => map.set(o.id, o));
    cloudObservations.forEach(o => map.set(o.id, o));

    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.warn('Could not fetch cloud trial observations, falling back to local store:', err);
    return getRawTrialObservations();
  }
}

/**
 * Returns comprehensive experimental metadata and data dictionary for researchers.
 */
export function getExperimentMetadata(trialsCount?: number, sessionsCount?: number) {
  const now = new Date();
  return {
    experiment_name: "PULSE Cognitive Latency & Working Memory Evaluation Study",
    short_name: "PULSE-EXP-2026",
    study_version: "2.1.0",
    generated_at: now.toISOString(),
    epoch_timestamp: now.getTime(),
    license: "CC-BY-4.0 (Open Research & Educational Use)",
    description: "High-precision empirical psychomotor latency, stimulus discrimination, executive control (Stroop interference), and working memory capacity dataset collected across cross-sectional age cohorts.",
    investigation_lead: "PULSE Research Laboratory & Cognitive Science Working Group",
    sampling_summary: {
      total_trial_observations: typeof trialsCount === 'number' ? trialsCount : getRawTrialObservations().length,
      total_session_assessments: typeof sessionsCount === 'number' ? sessionsCount : 0,
      timing_resolution: "Sub-millisecond monotonic timer (performance.now()) with requestAnimationFrame hardware refresh calibration"
    },
    timing_specifications: {
      stimulus_timing_method: "Double-buffered requestAnimationFrame synchronization",
      timer_mechanism: "Monotonic high-resolution performance.now() elapsed calculation combined with Date.now() UTC epoch wall-clock anchoring",
      refresh_rate_compensation: "Display frame interval delta tracking (60Hz / 90Hz / 120Hz / 144Hz / 240Hz auto-detection)",
      input_latency_mitigation: "Zero-drag pointerdown and touchstart immediate event binding to bypass mobile 300ms click delay"
    },
    protocols: [
      {
        id: "visual-reaction",
        name: "Simple Visual Reaction Time (SRT)",
        paradigm: "Single-stimulus sudden visual onset (Red to Green transition)",
        dependent_variables: ["reaction_time_ms", "false_starts", "latency_variability_sd"],
        independent_variables: ["random_foreperiod_delay_ms (2000-6000ms)", "age_group"],
        standard_trials: 10,
        unit: "milliseconds (ms)"
      },
      {
        id: "direction",
        name: "Choice Directional Reaction Time (CRT / Spatial Stroop)",
        paradigm: "4-alternative forced choice directional stimulus (Arrow Glyphs: Up, Down, Left, Right)",
        dependent_variables: ["reaction_time_ms", "accuracy_rate", "directional_bias"],
        independent_variables: ["random_foreperiod_delay_ms (1000-3000ms)", "stimulus_direction", "age_group"],
        standard_trials: 10,
        unit: "milliseconds (ms)"
      },
      {
        id: "color-recognition",
        name: "Color-Word Stroop Executive Interference",
        paradigm: "Congruent vs Incongruent chromatic text vs lexical semantic naming",
        dependent_variables: ["reaction_time_ms", "interference_cost_ms", "error_rate"],
        independent_variables: ["random_foreperiod_delay_ms (1000-2500ms)", "congruency (congruent vs incongruent)", "target_instruction (MATCH_WORD vs MATCH_COLOR)", "age_group"],
        standard_trials: 15,
        unit: "milliseconds (ms)"
      },
      {
        id: "block-memory",
        name: "Corsi Block-Tapping Visuospatial Working Memory",
        paradigm: "Sequential spatial block lighting sequence reproduction on a 3x3 matrix",
        dependent_variables: ["highest_sequence_span", "total_correct_trials", "accuracy_percentage"],
        independent_variables: ["sequence_length (starting at 2)", "lives (3 strikes policy)", "age_group"],
        unit: "span level (discrete count)"
      },
      {
        id: "number-memory",
        name: "Digit Span Numerical Working Memory",
        paradigm: "Progressive numerical digit span recall with rapid visual presentation",
        dependent_variables: ["highest_digit_span", "total_correct_digits", "accuracy_percentage"],
        independent_variables: ["digit_length (starting at 2)", "lives (3 strikes policy)", "age_group"],
        unit: "span level (discrete count)"
      }
    ],
    variables_codebook: [
      {
        variable: "participantId",
        label: "Participant Identifier",
        type: "string (UUID / sub-*)",
        description: "Anonymized, persistent, client-generated participant pseudonymous key."
      },
      {
        variable: "experimentId",
        label: "Session Experiment ID",
        type: "string (UUID / exp-*)",
        description: "Unique idempotency identifier for a single contiguous assessment run."
      },
      {
        variable: "test",
        label: "Assessment Protocol",
        type: "string",
        allowed_values: ["visual-reaction", "direction", "color-recognition", "block-memory", "number-memory"],
        description: "The specific cognitive test protocol executed."
      },
      {
        variable: "condition",
        label: "Experimental Condition",
        type: "string",
        description: "Trial stimulus condition (e.g. 'standard-visual', 'arrow-up', 'congruent-color', 'incongruent-text', 'sequence-length-4')."
      },
      {
        variable: "trialNumber",
        label: "Trial Index",
        type: "integer",
        range: ">= 1",
        description: "Ordinal trial index within the active test session."
      },
      {
        variable: "stimulusTimestamp",
        label: "Stimulus Onset Timestamp",
        type: "integer (epoch ms)",
        description: "Exact Unix millisecond timestamp when the visual stimulus was rendered to screen."
      },
      {
        variable: "responseTimestamp",
        label: "User Response Timestamp",
        type: "integer (epoch ms)",
        description: "Exact Unix millisecond timestamp when the user input trigger was registered."
      },
      {
        variable: "reactionTime",
        label: "Reaction Latency",
        type: "float (ms)",
        unit: "milliseconds",
        description: "Elapsed duration between stimulus onset and user response (sub-millisecond resolution)."
      },
      {
        variable: "accuracy",
        label: "Response Accuracy",
        type: "numeric (0 or 1, or percentage)",
        description: "1 = Correct response / successful sequence, 0 = Incorrect response / timeout / error."
      },
      {
        variable: "falseStart",
        label: "Anticipatory False Start",
        type: "boolean (TRUE / FALSE)",
        description: "Indicates whether the user clicked or triggered before stimulus presentation."
      },
      {
        variable: "timestamp",
        label: "ISO 8601 Timestamp",
        type: "string (ISO 8601)",
        description: "Standard UTC ISO date-time string of trial recording."
      },
      {
        variable: "device",
        label: "Device / Platform Architecture",
        type: "string",
        description: "Device category, operating system family, and browser client."
      },
      {
        variable: "screenWidth",
        label: "Viewport Width",
        type: "integer (pixels)",
        description: "Client display viewport width in pixels."
      },
      {
        variable: "screenHeight",
        label: "Viewport Height",
        type: "integer (pixels)",
        description: "Client display viewport height in pixels."
      },
      {
        variable: "ageGroup",
        label: "Age Cohort Category",
        type: "string",
        allowed_values: [
          "Children (8–12)",
          "Adolescents (13–17)",
          "Young adults (18–25)",
          "Adults (26–40)",
          "Middle-aged adults (41–60)",
          "Older adults (61–75)",
          "Seniors (76+)",
          "Unspecified"
        ],
        description: "Demographic age cohort selected by voluntary participant."
      },
      {
        variable: "notes",
        label: "Trial Specific Parameters",
        type: "string",
        description: "Contextual string containing trial parameters (e.g. target sequence, distractor color, task rule)."
      }
    ],
    software_environment: {
      platform: "PULSE Cognitive Assessment Web Platform",
      framework: "React 18 / TypeScript / Vite",
      client_storage: "HTML5 Web Storage (Append-Only Local Store) + Firebase Cloud Firestore"
    }
  };
}

/**
 * Exports raw trial observations as formatted CSV string directly usable in Excel / Google Sheets / Python.
 * Includes optional UTF-8 BOM for immediate Microsoft Excel character fidelity.
 */
export function exportTrialsToCSV(
  observations: RawTrialObservation[],
  options: { includeBOM?: boolean; includeNotes?: boolean } = { includeBOM: true, includeNotes: true }
): string {
  const headers = [
    'participantId',
    'experimentId',
    'condition',
    'test',
    'trialNumber',
    'stimulusTimestamp',
    'responseTimestamp',
    'reactionTime',
    'accuracy',
    'falseStart',
    'timestamp',
    'device',
    'screenWidth',
    'screenHeight',
    'ageGroup'
  ];

  if (options.includeNotes) {
    headers.push('notes');
  }

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = observations.map(obs => {
    const row = [
      escapeCSV(obs.participantId),
      escapeCSV(obs.experimentId),
      escapeCSV(obs.condition),
      escapeCSV(obs.test),
      obs.trialNumber,
      obs.stimulusTimestamp,
      obs.responseTimestamp,
      Number(obs.reactionTime || 0).toFixed(2),
      obs.accuracy,
      obs.falseStart ? 'TRUE' : 'FALSE',
      escapeCSV(obs.timestamp),
      escapeCSV(obs.device),
      obs.screenWidth,
      obs.screenHeight,
      escapeCSV(obs.ageGroup || 'Unspecified')
    ];

    if (options.includeNotes) {
      row.push(escapeCSV(obs.notes || ''));
    }

    return row.join(',');
  });

  const csvBody = [headers.join(','), ...rows].join('\r\n');
  return (options.includeBOM !== false ? '\uFEFF' : '') + csvBody;
}

/**
 * Exports aggregate session observations as formatted CSV string.
 */
export function exportSessionsToCSV(
  sessions: any[],
  options: { includeBOM?: boolean } = { includeBOM: true }
): string {
  const headers = [
    'id',
    'participantId',
    'assessmentType',
    'ageGroup',
    'completedAtMonth',
    'completedAtTimestamp',
    'averageReactionTime',
    'medianReactionTime',
    'bestReactionTime',
    'totalTrials',
    'successfulTrials',
    'falseStarts',
    'overallAccuracy',
    'highestLevel',
    'score',
    'deviceCategory'
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = sessions.map(s => [
    escapeCSV(s.id || ''),
    escapeCSV(s.participantId || s.id || ''),
    escapeCSV(s.assessmentType || ''),
    escapeCSV(s.ageGroup || 'Unspecified'),
    escapeCSV(s.completedAtMonth || ''),
    s.completedAtTimestamp || '',
    typeof s.averageReactionTime === 'number' ? s.averageReactionTime.toFixed(2) : '',
    typeof s.medianReactionTime === 'number' ? s.medianReactionTime.toFixed(2) : '',
    typeof s.bestReactionTime === 'number' ? s.bestReactionTime.toFixed(2) : '',
    s.totalTrials ?? '',
    s.successfulTrials ?? '',
    s.falseStarts ?? 0,
    typeof s.overallAccuracy === 'number' ? s.overallAccuracy.toFixed(1) : '',
    s.highestLevel ?? '',
    s.score ?? '',
    escapeCSV(s.deviceCategory || 'Desktop')
  ].join(','));

  const csvBody = [headers.join(','), ...rows].join('\r\n');
  return (options.includeBOM !== false ? '\uFEFF' : '') + csvBody;
}

/**
 * Exports data dictionary / codebook directly as CSV.
 */
export function exportCodebookToCSV(options: { includeBOM?: boolean } = { includeBOM: true }): string {
  const metadata = getExperimentMetadata();
  const headers = ['variable', 'label', 'type', 'allowed_values', 'unit', 'description'];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = metadata.variables_codebook.map(v => [
    escapeCSV(v.variable),
    escapeCSV(v.label),
    escapeCSV(v.type),
    escapeCSV(Array.isArray((v as any).allowed_values) ? (v as any).allowed_values.join('; ') : ''),
    escapeCSV((v as any).unit || ''),
    escapeCSV(v.description)
  ].join(','));

  const csvBody = [headers.join(','), ...rows].join('\r\n');
  return (options.includeBOM !== false ? '\uFEFF' : '') + csvBody;
}

/**
 * Exports full research package containing metadata, trials, and session observations into a structured JSON.
 */
export function exportDatasetToJSON(
  trials: RawTrialObservation[],
  sessions: any[] = []
): string {
  const metadata = getExperimentMetadata(trials.length, sessions.length);
  const fullPayload = {
    metadata,
    summary: {
      exported_at: new Date().toISOString(),
      raw_trials_count: trials.length,
      sessions_count: sessions.length
    },
    trials,
    sessions
  };

  return JSON.stringify(fullPayload, null, 2);
}

/**
 * Exports the experiment metadata as standalone JSON.
 */
export function exportMetadataToJSON(): string {
  return JSON.stringify(getExperimentMetadata(), null, 2);
}

/**
 * Downloads a data payload as a file in the browser with explicit character encoding.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
