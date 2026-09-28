import type express from 'express';
import type { Express } from 'express';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminDiagnosticMessage, safeLogWarning } from '../config/firebaseAdmin';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES, MAX_TRIALS_PER_SESSION } from '../config/constants';
import { isMobileUserAgent } from '../middleware/deviceRouting';
import { verifyFirebaseUserToken } from '../middleware/auth';
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { validateAndDeriveAssessmentFromTrials } from '../engines/assessmentEngine';
import { deriveForeperiodCategory, validateReactionMetrics } from '../engines/reactionCalculator';
import { seedPRNG } from '../engines/prng';
import { getIdempotency, setIdempotency, isValidIdempotencyKey } from '../services/idempotencyService';
import { getAndValidateSession, type ExperimentSession } from '../services/sessionService';
import { computeCanonicalTrialsDigest, safeCompareHex, signProvenancePayload } from '../services/provenanceService';
import { isOptedInLeaderboardUser } from '../services/leaderboardService';

export function registerResearchRoutes(app: Express): void {
  // Authoritative Experiment Session Issuance
  const handleSessionStart = async (req: express.Request, res: express.Response) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { assessmentType, ageGroup } = req.body || {};
      const normalizedType = normalizeAssessmentType(assessmentType);
      if (!normalizedType || !VALID_ASSESSMENT_TYPES.includes(normalizedType)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType' });
      }

      if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing ageGroup. A valid demographic age group is required.' });
      }

      const sessionId = crypto.randomUUID();
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1000; // 15 minute lifespan

      const session: ExperimentSession = {
        sessionId,
        uid: verifiedUser.uid,
        assessmentType: normalizedType,
        ageGroup,
        createdAt: now,
        expiresAt,
        consumed: false
      };

      // Authoritative Firestore persistence
      const db = getAdminDb();
      if (!db) {
        const errorDetail = getAdminDiagnosticMessage();
        console.error('[Session Start API] Firestore database is unavailable:', errorDetail);
        return res.status(500).json({ success: false, error: `Database unavailable: ${errorDetail}` });
      }

      try {
        await db.collection('experimentSessions').doc(sessionId).set({
          sessionId,
          uid: verifiedUser.uid,
          assessmentType: normalizedType,
          ageGroup,
          createdAt: now,
          expiresAt,
          consumed: false
        });
      } catch (dbErr: any) {
        console.error('[Session Start API] Firestore persistence failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        return res.status(500).json({ success: false, error: `Failed to persist experiment session: ${dbErr instanceof Error ? dbErr.message : 'Database write error'}` });
      }

      return res.json({
        success: true,
        sessionId,
        expiresAt,
        assessmentType: normalizedType
      });
    } catch (err: unknown) {
      console.error('[Session Start API] Error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to initialize experiment session' });
    }
  };

  app.post('/api/research/session/start', handleSessionStart);


  // Canonical Personal Best Retrieval Endpoint — Authoritative Firestore
  app.get('/api/personal-best', async (req, res) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { assessmentType } = req.query || {};
      if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
      }

      const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';

      let best: number | null = null;
      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database unavailable: Server misconfiguration' });
      }

      try {
        const snap = await db.collection('experimentSessions')
          .where('uid', '==', verifiedUser.uid)
          .where('assessmentType', '==', assessmentType)
          .where('consumed', '==', true)
          .get();

        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          let score: number | null = null;
          if (typeof data.scoreMetric === 'number') {
            score = data.scoreMetric;
          } else if (data.derivedMetrics) {
            if (isLowerBetter) {
              if (typeof data.derivedMetrics.averageReactionTime === 'number') score = data.derivedMetrics.averageReactionTime;
            } else {
              if (typeof data.derivedMetrics.longestSeq === 'number') score = data.derivedMetrics.longestSeq;
              else if (typeof data.derivedMetrics.highestLevel === 'number') {
                score = assessmentType === 'block-memory'
                  ? (data.derivedMetrics.highestLevel > 0 ? data.derivedMetrics.highestLevel + 1 : 0)
                  : (data.derivedMetrics.highestLevel > 0 ? data.derivedMetrics.highestLevel + 2 : 0);
              }
            }
          }
          if (score !== null && !isNaN(score)) {
            if (best === null) {
              best = score;
            } else if (isLowerBetter && score < best) {
              best = score;
            } else if (!isLowerBetter && score > best) {
              best = score;
            }
          }
        });
      } catch (dbErr) {
        if (dbErr && ((dbErr as any).code === 7 || String(dbErr).includes('PERMISSION_DENIED'))) {
          // Suppress permission denied warnings in preview environments
        } else {
          safeLogWarning('[Personal Best API] Firestore query notice:', dbErr);
        }
      }

      return res.json({ success: true, personalBest: best });
    } catch (err: unknown) {
      console.error('[Personal Best API] Error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to retrieve personal best' });
    }
  });


  // Authoritative Research Submission & Canonical Firestore Server-Side Write
  app.post('/api/research/submit', async (req, res) => {
    let activeSessionId: string | null = null;
    let submissionIdempotencyKey: string | null = null;
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { assessmentType, ageGroup, trials, sessionId, idempotencyKey } = req.body || {};

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        return res.status(400).json({ success: false, error: 'sessionId is required and must be a valid non-empty string' });
      }

      if (idempotencyKey !== undefined && idempotencyKey !== null && !isValidIdempotencyKey(idempotencyKey)) {
        return res.status(400).json({ success: false, error: 'Invalid idempotencyKey (must be 1-128 characters string)' });
      }

      const validIdempKey = isValidIdempotencyKey(idempotencyKey) ? idempotencyKey.trim() : null;
      activeSessionId = sessionId.trim();

      if (activeSessionId === validIdempKey) {
        return res.status(400).json({ success: false, error: 'sessionId and idempotencyKey must be distinct' });
      }

      submissionIdempotencyKey = validIdempKey ?? activeSessionId;

      if (submissionIdempotencyKey) {
        const cached = getIdempotency(`res_sub:${submissionIdempotencyKey}`);
        if (cached) {
          return res.json(cached);
        }
      }

      if (!assessmentType || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType' });
      }

      if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing ageGroup' });
      }

      if (!activeSessionId) {
        return res.status(400).json({ success: false, error: 'Session ID is required for trial submission' });
      }

      // Validate session binding, identity, expiration, and one-time consumption
      const sessionCheck = await getAndValidateSession(activeSessionId, verifiedUser.uid, assessmentType);
      if (!sessionCheck.valid || !sessionCheck.session) {
        return res.status(sessionCheck.status || 400).json({ success: false, error: sessionCheck.error || 'Session validation failed' });
      }

      // Strictly bind ageGroup to session; reject client-provided overrides or unapproved age groups
      if (!VALID_AGE_GROUPS.includes(sessionCheck.session.ageGroup)) {
        return res.status(400).json({ success: false, error: 'Authoritative experiment session has an invalid ageGroup' });
      }
      if (ageGroup && ageGroup !== sessionCheck.session.ageGroup) {
        return res.status(400).json({ success: false, error: 'ageGroup mismatch with authoritative experiment session' });
      }
      const authoritativeAgeGroup = sessionCheck.session.ageGroup;

      // Server-authoritative validation & derivation of metrics directly from raw trials
      const validation = validateAndDeriveAssessmentFromTrials(assessmentType, authoritativeAgeGroup, trials, sessionCheck.session);
      if (!validation.success || !validation.derivedMetrics) {
        return res.status(400).json({ success: false, error: validation.error || 'Trial validation failed' });
      }

      const derivedMetrics = validation.derivedMetrics;

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database service unavailable' });
      }

      const serverDeviceCategory: 'mobile' | 'desktop' = isMobileUserAgent(req) ? 'mobile' : 'desktop';

      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const trialPayloads: { ref: FirebaseFirestore.DocumentReference; data: Record<string, any> }[] = [];
      if (Array.isArray(trials) && trials.length > 0) {
        trials.forEach((t: Record<string, any>, idx: number) => {
          // Rule 4: Generate server-owned IDs for assessmentTrials
          const trialId = crypto.randomUUID();
          const trialDocRef = db ? db.collection('assessmentTrials').doc(trialId) : null;
          const chronoIndex = idx + 1;
          let derivedAttemptNumber = 1;
          if (idx > 0) {
            const prevTrialNumber = Number(trials[idx - 1].trialNumber);
            const prevAttemptNumber = Number(trials[idx - 1].attemptNumber) || 1;
            if (Number(t.trialNumber) === prevTrialNumber) {
              derivedAttemptNumber = prevAttemptNumber + 1;
            }
          }

          const rawRt = typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.reactionTimeMs === 'number' ? t.reactionTimeMs : null);
          const rawLat = typeof t.rawReactionTime === 'number' ? t.rawReactionTime : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);

          const isFalseStart = t.falseStart === true;
          const isTimedOut = t.timedOut === true;
          const isAborted = t.validity === 'ABORTED' || (typeof rawRt === 'number' && rawRt <= 0);
          const isCompletedResponse = !isFalseStart && !isTimedOut && !isAborted;
          const isIncorrectResponse = isCompletedResponse && (t.correct === false || t.validity === 'INCORRECT');
          const isValid = isIncorrectResponse
            ? true
            : (typeof t.valid === 'boolean' ? t.valid : isCompletedResponse);
          const isCorrect = typeof t.correct === 'boolean'
            ? t.correct
            : (typeof t.correctness === 'boolean'
                ? t.correctness
                : (typeof t.accuracy === 'number' ? t.accuracy === 1 : (assessmentType === 'visual-reaction' ? isValid : null)));
          const accuracyVal = typeof t.accuracy === 'number' ? t.accuracy : (isCorrect === true ? 1 : 0);

          const trialPayload: Record<string, any> = {
            participantId: verifiedUser.uid, // Strictly bound to verified Firebase UID
            experimentId: activeSessionId,
            condition: typeof t.condition === 'string' ? t.condition : 'standard',
            test: assessmentType,
            trialNumber: Number(t.trialNumber) || chronoIndex,
            trialIndex: typeof t.trialIndex === 'number' ? t.trialIndex : chronoIndex,
            sequenceNumber: typeof t.sequenceNumber === 'number' ? t.sequenceNumber : chronoIndex,
            attemptNumber: typeof t.attemptNumber === 'number' ? t.attemptNumber : derivedAttemptNumber,
            stimulusTimestamp: typeof t.stimulusTimestamp === 'number' ? t.stimulusTimestamp : (t.stimulusTimestamp === null ? null : now),
            responseTimestamp: typeof t.responseTimestamp === 'number' ? t.responseTimestamp : null,
            reactionTime: rawRt,
            reactionTimeMs: rawRt,
            accuracy: accuracyVal,
            falseStart: isFalseStart,
            timedOut: isTimedOut,
            valid: isValid,
            correct: isCorrect,
            correctness: isCorrect,
            timestamp: typeof t.timestamp === 'string' ? t.timestamp : nowIso,
            deviceCategory: serverDeviceCategory,
            device: serverDeviceCategory,
            screenWidth: typeof t.screenWidth === 'number' && Number.isFinite(t.screenWidth) && t.screenWidth > 0 ? Number(t.screenWidth) : null,
            screenHeight: typeof t.screenHeight === 'number' && Number.isFinite(t.screenHeight) && t.screenHeight > 0 ? Number(t.screenHeight) : null,
            ageGroup: authoritativeAgeGroup
          };

          if (typeof t.device === 'string' && t.device !== 'desktop' && t.device !== 'mobile') {
            trialPayload.clientDeviceDetails = t.device;
          }

          if (rawLat !== null) {
            trialPayload.rawReactionTime = rawLat;
            trialPayload.rawLatencyMs = rawLat;
          }
          if (typeof t.displayDelayOffsetMs === 'number') trialPayload.displayDelayOffsetMs = t.displayDelayOffsetMs;
          if (typeof t.notes === 'string') trialPayload.notes = t.notes;

          if (typeof t.foreperiodMs === 'number') trialPayload.foreperiodMs = t.foreperiodMs;
          if (typeof t.foreperiodCategory === 'string' && (t.foreperiodCategory === 'SHORT' || t.foreperiodCategory === 'LONG')) {
            trialPayload.foreperiodCategory = t.foreperiodCategory;
          } else if (typeof t.foreperiodMs === 'number') {
            const derived = deriveForeperiodCategory(t.foreperiodMs);
            if (derived) trialPayload.foreperiodCategory = derived;
          }

          if (typeof t.stimulusScheduledAt === 'number') trialPayload.stimulusScheduledAt = t.stimulusScheduledAt;
          if (typeof t.stimulusScheduledAtPerfMs === 'number') trialPayload.stimulusScheduledAtPerfMs = t.stimulusScheduledAtPerfMs;
          else if (typeof t.stimulusScheduledAt === 'number') trialPayload.stimulusScheduledAtPerfMs = t.stimulusScheduledAt;

          if (typeof t.stimulusPresentedAt === 'number' || t.stimulusPresentedAt === null) trialPayload.stimulusPresentedAt = t.stimulusPresentedAt;
          if (typeof t.stimulusPresentedAtPerfMs === 'number' || t.stimulusPresentedAtPerfMs === null) trialPayload.stimulusPresentedAtPerfMs = t.stimulusPresentedAtPerfMs;
          else if (typeof t.stimulusPresentedAt === 'number' || t.stimulusPresentedAt === null) trialPayload.stimulusPresentedAtPerfMs = t.stimulusPresentedAt;

          if (t.responseDetectedAt !== undefined) trialPayload.responseDetectedAt = t.responseDetectedAt;
          if (t.responseDetectedAtPerfMs !== undefined) trialPayload.responseDetectedAtPerfMs = t.responseDetectedAtPerfMs;
          else if (t.responseDetectedAt !== undefined) trialPayload.responseDetectedAtPerfMs = t.responseDetectedAt;

          if (typeof t.validity === 'string') trialPayload.validity = t.validity;
          if (t.qualityFlag !== undefined) trialPayload.qualityFlag = t.qualityFlag;

          if (t.previousTrialEndedAt !== undefined) trialPayload.previousTrialEndedAt = t.previousTrialEndedAt;
          if (t.previousTrialEndedAtPerfMs !== undefined) trialPayload.previousTrialEndedAtPerfMs = t.previousTrialEndedAtPerfMs;
          else if (t.previousTrialEndedAt !== undefined) trialPayload.previousTrialEndedAtPerfMs = t.previousTrialEndedAt;
          if (t.interStimulusIntervalMs !== undefined) trialPayload.interStimulusIntervalMs = t.interStimulusIntervalMs;
          if (t.interTrialIntervalMs !== undefined) trialPayload.interTrialIntervalMs = t.interTrialIntervalMs;
          if (typeof t.stimulusWallTimestamp === 'number') trialPayload.stimulusWallTimestamp = t.stimulusWallTimestamp;
          if (t.responseWallTimestamp !== undefined) trialPayload.responseWallTimestamp = t.responseWallTimestamp;
          if (typeof t.assessmentStartedAt === 'number') trialPayload.assessmentStartedAt = t.assessmentStartedAt;

          if (typeof t.targetDirection === 'string') trialPayload.targetDirection = t.targetDirection;
          if (typeof t.wordName === 'string') trialPayload.wordName = t.wordName;
          if (typeof t.wordColor === 'string') trialPayload.wordColor = t.wordColor;
          if (typeof t.instruction === 'string') trialPayload.instruction = t.instruction;
          if (typeof t.userResponse === 'string' || t.userResponse === null) trialPayload.userResponse = t.userResponse;

          if (typeof t.level === 'number') trialPayload.level = t.level;
          if (typeof t.sequenceLength === 'number') trialPayload.sequenceLength = t.sequenceLength;
          if (t.generatedSequence !== undefined) trialPayload.generatedSequence = t.generatedSequence;
          if (t.playerSequence !== undefined) trialPayload.playerSequence = t.playerSequence;
          if (typeof t.responseDurationMs === 'number') trialPayload.responseDurationMs = t.responseDurationMs;
          if (typeof t.correctSelections === 'number') trialPayload.correctSelections = t.correctSelections;

          if (typeof t.correct === 'boolean') trialPayload.correct = t.correct;
          if (typeof t.correctness === 'boolean') trialPayload.correctness = t.correctness;

          if (trialDocRef) {
            trialPayloads.push({ ref: trialDocRef, data: trialPayload });
          }
        });
      }

      // Compute canonical SHA-256 digest covering complete research trial observation sequence
      const trialsDigest = computeCanonicalTrialsDigest(trialPayloads.map(tp => tp.data));

      const completedAtTimestamp = now;
      const completedAtMonth = new Date(now).toISOString().substring(0, 7);

      const canonicalMetrics = Object.keys(derivedMetrics).sort().map(k => `${k}=${derivedMetrics[k]}`).join('&');
      const payloadDigest = `${assessmentType}:${authoritativeAgeGroup}:${canonicalMetrics}:${trialsDigest}:${completedAtTimestamp}:${completedAtMonth}`;
      const provenanceToken = signProvenancePayload(payloadDigest);

      // Rule 4: Never trust client IDs as Firestore document IDs. Generate server-owned IDs.
      const docId = crypto.randomUUID();

      // Rule 5: publicDataset must NOT expose Firebase UID, participantId, sessionId or other direct identity/session identifiers
      // Extract progressionTrials strictly from server-canonicalized trialPayloads (all canonical trials)
      const isSpeedAssessment = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
      const progressionTrials = trialPayloads.map(({ data: tp }: { data: Record<string, any> }, idx: number) => {
        const trialNumber = typeof tp.trialNumber === 'number' ? tp.trialNumber : (idx + 1);
        const rawRt = typeof tp.reactionTime === 'number' ? tp.reactionTime : (typeof tp.reactionTimeMs === 'number' ? tp.reactionTimeMs : null);
        const falseStart = tp.falseStart === true;
        const timedOut = tp.timedOut === true;
        const valid = typeof tp.valid === 'boolean' ? tp.valid : (!falseStart && !timedOut);

        const baseProgressionItem: Record<string, any> = {
          trialNumber,
          falseStart,
          timedOut,
          valid,
        };

        if (typeof tp.correct === 'boolean') baseProgressionItem.correct = tp.correct;
        if (typeof tp.accuracy === 'number') baseProgressionItem.accuracy = tp.accuracy;
        if (typeof tp.validity === 'string') baseProgressionItem.validity = tp.validity;
        if (tp.qualityFlag !== undefined) baseProgressionItem.qualityFlag = tp.qualityFlag;

        if (typeof tp.rawLatencyMs === 'number') baseProgressionItem.rawLatencyMs = tp.rawLatencyMs;
        if (typeof tp.displayDelayOffsetMs === 'number') baseProgressionItem.displayDelayOffsetMs = tp.displayDelayOffsetMs;
        if (typeof tp.stimulusScheduledAtPerfMs === 'number') baseProgressionItem.stimulusScheduledAtPerfMs = tp.stimulusScheduledAtPerfMs;
        if (typeof tp.stimulusPresentedAtPerfMs === 'number') baseProgressionItem.stimulusPresentedAtPerfMs = tp.stimulusPresentedAtPerfMs;
        if (typeof tp.responseDetectedAtPerfMs === 'number') baseProgressionItem.responseDetectedAtPerfMs = tp.responseDetectedAtPerfMs;

        if (assessmentType === 'visual-reaction') {
          if (typeof tp.foreperiodMs === 'number') {
            baseProgressionItem.foreperiodMs = tp.foreperiodMs;
            baseProgressionItem.foreperiodCategory = typeof tp.foreperiodCategory === 'string'
              ? tp.foreperiodCategory
              : deriveForeperiodCategory(tp.foreperiodMs);
          } else if (typeof tp.foreperiodCategory === 'string') {
            baseProgressionItem.foreperiodCategory = tp.foreperiodCategory;
          }
        } else if (assessmentType === 'direction') {
          if (typeof tp.targetDirection === 'string') baseProgressionItem.targetDirection = tp.targetDirection;
          if (typeof tp.userResponse === 'string' || tp.userResponse === null) baseProgressionItem.userResponse = tp.userResponse;
        } else if (assessmentType === 'color-recognition') {
          if (typeof tp.wordName === 'string') baseProgressionItem.wordName = tp.wordName;
          if (typeof tp.wordColor === 'string') baseProgressionItem.wordColor = tp.wordColor;
          if (typeof tp.condition === 'string') baseProgressionItem.condition = tp.condition;
          if (typeof tp.instruction === 'string') baseProgressionItem.instruction = tp.instruction;
          if (typeof tp.userResponse === 'string' || tp.userResponse === null) baseProgressionItem.userResponse = tp.userResponse;
        } else if (assessmentType === 'block-memory' || assessmentType === 'number-memory') {
          if (typeof tp.level === 'number') baseProgressionItem.level = tp.level;
          if (typeof tp.sequenceLength === 'number') {
            baseProgressionItem.sequenceLength = tp.sequenceLength;
          } else if (typeof tp.level === 'number' && tp.level > 0) {
            baseProgressionItem.sequenceLength = assessmentType === 'block-memory' ? tp.level + 1 : tp.level + 2;
          }
          if (tp.generatedSequence !== undefined) baseProgressionItem.generatedSequence = tp.generatedSequence;
          if (tp.playerSequence !== undefined) baseProgressionItem.playerSequence = tp.playerSequence;
          if (typeof tp.responseDurationMs === 'number') baseProgressionItem.responseDurationMs = tp.responseDurationMs;
          if (typeof tp.correctSelections === 'number') baseProgressionItem.correctSelections = tp.correctSelections;
        }

        if (isSpeedAssessment) {
          return {
            ...baseProgressionItem,
            reactionTime: rawRt,
            metricType: 'reaction_time' as const
          };
        } else {
          return {
            ...baseProgressionItem,
            inputLatencyMs: rawRt,
            reactionTime: rawRt, // Retained for backward compatibility
            metricType: 'input_latency' as const
          };
        }
      });

      const publicDatasetDoc = {
        ageGroup: authoritativeAgeGroup,
        assessmentType,
        schemaVersion: 1,
        assessmentVersion: 'v1.0.0',
        protocolVersion: 'v1.0.0',
        datasetSchemaVersion: 'v1.0.0',
        metricsVersion: 'v1.0.0',
        provenanceVersion: 'v2.0.0',
        completedAtMonth,
        provenanceToken,
        trialsDigest,
        deviceCategory: serverDeviceCategory,
        device: serverDeviceCategory,
        progressionTrials,
        ...derivedMetrics
      };

      // Determine primary score metric and direction
      const isLowerBetter = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
      let currentScore: number | null = null;
      if (isLowerBetter) {
        currentScore = typeof derivedMetrics.averageReactionTime === 'number' ? derivedMetrics.averageReactionTime : null;
      } else {
        currentScore = typeof derivedMetrics.longestSeq === 'number' ? derivedMetrics.longestSeq : null;
      }

      // Query previous consumed sessions for user's previous personal best from Firestore
      let previousPersonalBest: number | null = null;
      if (db) {
        try {
          const prevSnap = await db.collection('experimentSessions')
            .where('uid', '==', verifiedUser.uid)
            .where('assessmentType', '==', assessmentType)
            .where('consumed', '==', true)
            .get();

          prevSnap.docs.forEach(docSnap => {
            if (docSnap.id === activeSessionId) return;
            const data = docSnap.data();
            let s: number | null = null;
            if (typeof data.scoreMetric === 'number') {
              s = data.scoreMetric;
            } else if (data.derivedMetrics) {
              if (isLowerBetter) {
                if (typeof data.derivedMetrics.averageReactionTime === 'number') s = data.derivedMetrics.averageReactionTime;
              } else {
                if (typeof data.derivedMetrics.longestSeq === 'number') s = data.derivedMetrics.longestSeq;
                else if (typeof data.derivedMetrics.highestLevel === 'number') {
                  s = assessmentType === 'block-memory' 
                    ? (data.derivedMetrics.highestLevel > 0 ? data.derivedMetrics.highestLevel + 1 : 0)
                    : (data.derivedMetrics.highestLevel > 0 ? data.derivedMetrics.highestLevel + 2 : 0);
                }
              }
            }
            if (s !== null && !isNaN(s)) {
              if (previousPersonalBest === null) {
                previousPersonalBest = s;
              } else if (isLowerBetter && s < previousPersonalBest) {
                previousPersonalBest = s;
              } else if (!isLowerBetter && s > previousPersonalBest) {
                previousPersonalBest = s;
              }
            }
          });
        } catch (pbErr: any) {
          if (pbErr && (pbErr.code === 7 || String(pbErr).includes('PERMISSION_DENIED'))) {
          // Suppress permission denied warnings in preview environments (handled gracefully by memory fallback)
        } else {
          safeLogWarning('[Research Submit API] Firestore personal best query notice:', pbErr);
        }
        }
      }

      let isNewPersonalBest = false;
      if (currentScore !== null) {
        if (previousPersonalBest === null) {
          isNewPersonalBest = true;
        } else if (isLowerBetter) {
          isNewPersonalBest = currentScore < previousPersonalBest;
        } else {
          isNewPersonalBest = currentScore > previousPersonalBest;
        }
      }

      const personalBest = isNewPersonalBest ? currentScore : (previousPersonalBest ?? currentScore);

      

            // 2. Authoritative durable Firestore transaction
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database unavailable: Server misconfiguration' });
      }
      
      try {
        const sessionDocRef = db.collection('experimentSessions').doc(activeSessionId);
        const publicDatasetDocRef = db.collection('publicDataset').doc(docId);
        await db.runTransaction(async (tx) => {
          const sessionSnap = await tx.get(sessionDocRef);
          if (!sessionSnap.exists) {
            throw new Error('SESSION_NOT_FOUND');
          }
          const sData = sessionSnap.data() as ExperimentSession;
          if (sData.uid !== verifiedUser.uid) throw new Error('SESSION_UID_MISMATCH');
          if (normalizeAssessmentType(sData.assessmentType) !== normalizeAssessmentType(assessmentType)) throw new Error('SESSION_TYPE_MISMATCH');
          if (Date.now() > sData.expiresAt + 60000) throw new Error('SESSION_EXPIRED');
          if (sData.consumed) {
            const err: any = new Error('SESSION_ALREADY_CONSUMED');
            err.sData = sData;
            throw err;
          }

          // Write canonical publicDataset document
          tx.set(publicDatasetDocRef, publicDatasetDoc);

          // Write canonical assessmentResults document
          const assessmentResultDocRef = db.collection('assessmentResults').doc(docId);
          tx.set(assessmentResultDocRef, {
            sessionId: activeSessionId,
            participantId: verifiedUser.uid,
            assessmentType,
            ageGroup: authoritativeAgeGroup,
            assessmentVersion: 'v1.0.0',
            protocolVersion: 'v1.0.0',
            datasetSchemaVersion: 'v1.0.0',
            metricsVersion: 'v1.0.0',
            derivedMetrics,
            temporalDynamics: derivedMetrics.temporalDynamics || null,
            scoreMetric: currentScore,
            isNewPersonalBest,
            completedAtTimestamp,
            completedAtMonth,
            provenanceToken,
            trialsDigest,
            createdAt: now
          });

          // Write canonical assessmentTrials documents
          for (const tp of trialPayloads) {
            const assessmentTrialRef = db.collection('assessmentTrials').doc(tp.ref.id);
            tx.set(assessmentTrialRef, {
              ...tp.data,
              sessionId: activeSessionId
            });
          }

          // Mark session consumed
          tx.set(sessionDocRef, {
            sessionId: activeSessionId,
            uid: verifiedUser.uid,
            assessmentType,
            ageGroup: authoritativeAgeGroup,
            createdAt: sData?.createdAt || now,
            expiresAt: sData?.expiresAt || (now + 15 * 60 * 1000),
            consumed: true,
            consumedAt: now,
            researchDocId: docId,
            derivedMetrics,
            scoreMetric: currentScore,
            isNewPersonalBest,
            previousPersonalBest,
            personalBest,
            provenanceToken,
            trialsDigest
          }, { merge: true });
        });
      } catch (txErr: any) {
        const errMsg = txErr instanceof Error ? txErr.message : String(txErr);
        if (['SESSION_NOT_FOUND', 'SESSION_UID_MISMATCH', 'SESSION_TYPE_MISMATCH', 'SESSION_EXPIRED'].includes(errMsg)) {
          throw txErr;
        }
        console.error('[Research Submit API] Firestore persistence failed:', txErr);
        return res.status(500).json({ success: false, error: 'Failed to persist research submission to database' });
      }
      const responsePayload = {
        success: true,
        docId,
        sessionId: activeSessionId,
        completedAtTimestamp,
        completedAtMonth,
        provenanceToken,
        trialsDigest,
        derivedMetrics,
        scoreMetric: currentScore,
        isNewPersonalBest,
        previousPersonalBest,
        personalBest
      };

      if (submissionIdempotencyKey) {
        setIdempotency(`res_sub:${submissionIdempotencyKey}`, responsePayload);
      }

      return res.json(responsePayload);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'SESSION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Experiment session not found or invalid' });
      }
      if (errMsg === 'SESSION_UID_MISMATCH') {
        return res.status(403).json({ success: false, error: 'Session UID mismatch with authenticated identity' });
      }
      if (errMsg === 'SESSION_TYPE_MISMATCH') {
        return res.status(400).json({ success: false, error: 'Session assessment type mismatch' });
      }
      if (errMsg === 'SESSION_EXPIRED') {
        return res.status(400).json({ success: false, error: 'Experiment session has expired' });
      }
      if (errMsg === 'SESSION_ALREADY_CONSUMED') {
        const sData = (err as any).sData;
        if (sData) {
          return res.json({
            success: true,
            docId: sData.researchDocId,
            sessionId: activeSessionId,
            completedAtTimestamp: sData.consumedAt || Date.now(),
            provenanceToken: sData.provenanceToken,
            trialsDigest: sData.trialsDigest,
            derivedMetrics: sData.derivedMetrics,
            scoreMetric: sData.scoreMetric ?? null,
            isNewPersonalBest: sData.isNewPersonalBest ?? false,
            previousPersonalBest: sData.previousPersonalBest ?? null,
            personalBest: sData.personalBest ?? null
          });
        }
        return res.status(400).json({ success: false, error: 'Experiment session has already been completed/consumed' });
      }

      console.error("[Research Submit API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to atomically persist research data in database' });
    }
  });




  // Verification helper for audits / researchers
  app.post('/api/research/verify-provenance', (req, res) => {
    const { assessmentType, ageGroup, completedAtTimestamp, completedAtMonth, metrics, trialsDigest, provenanceToken } = req.body || {};
    if (!provenanceToken || typeof provenanceToken !== 'string') {
      return res.json({ verified: false, reason: 'Missing provenance token' });
    }
    const canonicalMetrics = metrics ? Object.keys(metrics).sort().map(k => `${k}=${metrics[k]}`).join('&') : '';
    const payloadDigest = `${assessmentType}:${ageGroup}:${canonicalMetrics}:${trialsDigest || ''}:${completedAtTimestamp}:${completedAtMonth}`;
    const expected = signProvenancePayload(payloadDigest);
    return res.json({ verified: safeCompareHex(expected, provenanceToken) });
  });


  // Public Research Dataset Retrieval Endpoint with complete cursor-based pagination
  app.get('/api/research/dataset', async (req, res) => {
    try {
      const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : null;
      const assessmentType = rawType && rawType !== 'all' ? normalizeAssessmentType(rawType) : null;
      const ageGroup = typeof req.query.ageGroup === 'string' && req.query.ageGroup !== 'all' ? req.query.ageGroup.trim() : null;
      const completedAtMonth = typeof req.query.completedAtMonth === 'string' && req.query.completedAtMonth !== 'all' ? req.query.completedAtMonth.trim() : null;
      const limitCount = req.query.limit ? Math.min(Math.max(1, parseInt(String(req.query.limit), 10) || 1000), 5000) : 1000;
      const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim() ? req.query.cursor.trim() : null;

      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({ success: false, error: 'Database service unavailable', records: [] });
      }

      const records: any[] = [];

      try {
        // Authoritative Research Hierarchy: experimentSessions → assessmentResults → assessmentTrials
        let q: FirebaseFirestore.Query = db.collection('assessmentResults');

        if (assessmentType) {
          const aliases = assessmentType === 'color-recognition'
            ? ['color-recognition', 'colour-recognition', 'color-test', 'colour-test']
            : [assessmentType];
          if (aliases.length === 1) {
            q = q.where('assessmentType', '==', aliases[0]);
          } else {
            q = q.where('assessmentType', 'in', aliases);
          }
        }

        if (ageGroup) {
          q = q.where('ageGroup', '==', ageGroup);
        }

        if (completedAtMonth) {
          q = q.where('completedAtMonth', '==', completedAtMonth);
        }

        // Deterministic ordering by doc ID (or createdAt timestamp)
        q = q.orderBy('__name__');

        if (cursor) {
          q = q.startAfter(cursor);
        }

        q = q.limit(limitCount + 1);
        const snap = await q.get();

        const hasMore = snap.docs.length > limitCount;
        const pageDocs = hasMore ? snap.docs.slice(0, limitCount) : snap.docs;
        const nextCursor = hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1].id : null;

        // Collect session IDs to retrieve linked experimentSessions and complete assessmentTrials
        const sessionIds = pageDocs
          .map(docSnap => docSnap.data().sessionId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);

        // Batch fetch linked experimentSessions
        const sessionMap = new Map<string, FirebaseFirestore.DocumentData>();
        if (sessionIds.length > 0) {
          const sessionSnaps = await Promise.all(
            sessionIds.map(id => db.collection('experimentSessions').doc(id).get())
          );
          sessionSnaps.forEach(sSnap => {
            if (sSnap.exists) {
              sessionMap.set(sSnap.id, sSnap.data()!);
            }
          });
        }

        // Batch fetch canonical assessmentTrials (chunks of 30 for Firestore 'in' limitation)
        const trialsBySession = new Map<string, any[]>();
        for (let i = 0; i < sessionIds.length; i += 30) {
          const chunk = sessionIds.slice(i, i + 30);
          const trialsSnap = await db.collection('assessmentTrials').where('sessionId', 'in', chunk).get();
          trialsSnap.docs.forEach(tDoc => {
            const tData = tDoc.data();
            const sId = tData.sessionId;
            if (sId) {
              if (!trialsBySession.has(sId)) {
                trialsBySession.set(sId, []);
              }
              trialsBySession.get(sId)!.push(tData);
            }
          });
        }

        pageDocs.forEach(docSnap => {
          const data = docSnap.data();
          const sId = data.sessionId;
          const sessionData = sId ? sessionMap.get(sId) : undefined;
          const rawTrials = sId ? (trialsBySession.get(sId) || []) : [];

          // Sort trials canonically by trialNumber / trialIndex / sequenceNumber
          rawTrials.sort((a, b) => {
            const numA = typeof a.trialNumber === 'number' ? a.trialNumber : (typeof a.trialIndex === 'number' ? a.trialIndex : (typeof a.sequenceNumber === 'number' ? a.sequenceNumber : 0));
            const numB = typeof b.trialNumber === 'number' ? b.trialNumber : (typeof b.trialIndex === 'number' ? b.trialIndex : (typeof b.sequenceNumber === 'number' ? b.sequenceNumber : 0));
            return numA - numB;
          });

          // Sanitize progressionTrials strictly omitting participantId / private UID
          const sanitizedTrials = rawTrials.map((tp: Record<string, any>, idx: number) => {
            const trialNumber = typeof tp.trialNumber === 'number' ? tp.trialNumber : (idx + 1);
            const rawRt = typeof tp.reactionTime === 'number' ? tp.reactionTime : (typeof tp.reactionTimeMs === 'number' ? tp.reactionTimeMs : null);
            const falseStart = tp.falseStart === true;
            const timedOut = tp.timedOut === true;
            const valid = typeof tp.valid === 'boolean' ? tp.valid : (!falseStart && !timedOut);

            const trialItem: Record<string, any> = {
              trialNumber,
              trialIndex: typeof tp.trialIndex === 'number' ? tp.trialIndex : trialNumber,
              sequenceNumber: typeof tp.sequenceNumber === 'number' ? tp.sequenceNumber : trialNumber,
              attemptNumber: typeof tp.attemptNumber === 'number' ? tp.attemptNumber : 1,
              reactionTime: rawRt,
              falseStart,
              timedOut,
              valid,
            };

            if (typeof tp.correct === 'boolean') trialItem.correct = tp.correct;
            if (typeof tp.correctness === 'boolean') trialItem.correctness = tp.correctness;
            if (typeof tp.accuracy === 'number') trialItem.accuracy = tp.accuracy;
            if (typeof tp.validity === 'string') trialItem.validity = tp.validity;
            if (tp.qualityFlag !== undefined) trialItem.qualityFlag = tp.qualityFlag;

            if (typeof tp.rawLatencyMs === 'number') trialItem.rawLatencyMs = tp.rawLatencyMs;
            else if (typeof tp.rawReactionTime === 'number') trialItem.rawLatencyMs = tp.rawReactionTime;
            if (typeof tp.displayDelayOffsetMs === 'number') trialItem.displayDelayOffsetMs = tp.displayDelayOffsetMs;

            if (typeof tp.stimulusScheduledAtPerfMs === 'number') trialItem.stimulusScheduledAtPerfMs = tp.stimulusScheduledAtPerfMs;
            if (typeof tp.stimulusPresentedAtPerfMs === 'number') trialItem.stimulusPresentedAtPerfMs = tp.stimulusPresentedAtPerfMs;
            if (typeof tp.responseDetectedAtPerfMs === 'number') trialItem.responseDetectedAtPerfMs = tp.responseDetectedAtPerfMs;

            if (typeof tp.foreperiodMs === 'number') trialItem.foreperiodMs = tp.foreperiodMs;
            if (typeof tp.foreperiodCategory === 'string') trialItem.foreperiodCategory = tp.foreperiodCategory;

            if (typeof tp.targetDirection === 'string') trialItem.targetDirection = tp.targetDirection;
            if (typeof tp.chosenDirection === 'string') trialItem.chosenDirection = tp.chosenDirection;
            if (typeof tp.userResponse === 'string' || tp.userResponse === null) trialItem.userResponse = tp.userResponse;

            if (typeof tp.targetColor === 'string') trialItem.targetColor = tp.targetColor;
            if (typeof tp.chosenColor === 'string') trialItem.chosenColor = tp.chosenColor;
            if (typeof tp.wordName === 'string') trialItem.wordName = tp.wordName;
            if (typeof tp.wordColor === 'string') trialItem.wordColor = tp.wordColor;
            if (typeof tp.condition === 'string') trialItem.condition = tp.condition;
            if (typeof tp.instruction === 'string') trialItem.instruction = tp.instruction;

            if (typeof tp.level === 'number') trialItem.level = tp.level;
            if (typeof tp.sequenceLength === 'number') trialItem.sequenceLength = tp.sequenceLength;
            if (typeof tp.interTapTimeMs === 'number') trialItem.interTapTimeMs = tp.interTapTimeMs;
            if (typeof tp.responseDurationMs === 'number') trialItem.responseDurationMs = tp.responseDurationMs;

            return trialItem;
          });

          let derivedMonth = data.completedAtMonth;
          if (!derivedMonth && (data.completedAtTimestamp || data.createdAt)) {
            const d = new Date(data.completedAtTimestamp || data.createdAt);
            if (!isNaN(d.getTime())) {
              derivedMonth = d.toISOString().substring(0, 7);
            }
          }

          records.push({
            id: docSnap.id,
            assessmentType: normalizeAssessmentType(data.assessmentType || 'unknown'),
            ageGroup: data.ageGroup || sessionData?.ageGroup || undefined,
            completedAtMonth: derivedMonth || undefined,
            completedAtTimestamp: data.completedAtTimestamp || data.createdAt,
            deviceCategory: sessionData?.deviceCategory || sessionData?.device || undefined,
            device: sessionData?.device || sessionData?.deviceCategory || undefined,
            inputModality: sessionData?.inputModality || sessionData?.inputMethod || undefined,
            displayRefreshRateHz: sessionData?.displayRefreshRateHz || sessionData?.refreshRateHz || undefined,
            refreshRateHz: sessionData?.refreshRateHz || sessionData?.displayRefreshRateHz || undefined,
            provenanceToken: data.provenanceToken,
            trialsDigest: data.trialsDigest,
            scoreMetric: data.scoreMetric,
            averageReactionTime: data.derivedMetrics?.averageReactionTime ?? data.averageReactionTime,
            medianReactionTime: data.derivedMetrics?.medianReactionTime ?? data.medianReactionTime,
            fastestReactionTime: data.derivedMetrics?.fastestReactionTime ?? data.fastestReactionTime,
            slowestReactionTime: data.derivedMetrics?.slowestReactionTime ?? data.slowestReactionTime,
            longestSeq: data.derivedMetrics?.longestSeq ?? data.longestSeq,
            highestLevel: data.derivedMetrics?.highestLevel ?? data.highestLevel,
            accuracy: data.derivedMetrics?.accuracy ?? data.accuracy,
            congruentAvg: data.derivedMetrics?.congruentAvg ?? data.congruentAvg,
            incongruentAvg: data.derivedMetrics?.incongruentAvg ?? data.incongruentAvg,
            interferenceCost: data.derivedMetrics?.interferenceCost ?? data.interferenceCost,
            progressionTrials: sanitizedTrials
          });
        });

        return res.json({
          success: true,
          count: records.length,
          hasMore,
          nextCursor,
          records
        });
      } catch (dbErr) {
        console.error('[Research Dataset API] Firestore query error:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        return res.status(500).json({
          success: false,
          error: dbErr instanceof Error ? dbErr.message : 'Database query failed',
          records: []
        });
      }
    } catch (err) {
      console.error("[Research Dataset API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to retrieve research dataset', records: [] });
    }
  });

  // Public Research Dataset Summary Endpoint (Denial-of-Wallet Protected via Aggregation)
  app.get('/api/research/dataset/summary', async (req, res) => {
    try {
      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({ success: false, error: 'Database service unavailable' });
      }

      const counts: Record<string, number> = {
        'visual-reaction': 0,
        'direction': 0,
        'color-recognition': 0,
        'block-memory': 0,
        'number-memory': 0
      };
      let totalRecords = 0;
      let totalTrials = 0;

      try {
        const [resultsCountSnap, trialsCountSnap, ...typeCountSnaps] = await Promise.all([
          db.collection('assessmentResults').count().get(),
          db.collection('assessmentTrials').count().get(),
          ...VALID_ASSESSMENT_TYPES.map(type =>
            db.collection('assessmentResults').where('assessmentType', '==', type).count().get()
          )
        ]);
        totalRecords = resultsCountSnap.data().count;
        totalTrials = trialsCountSnap.data().count;
        VALID_ASSESSMENT_TYPES.forEach((type, idx) => {
          counts[type] = typeCountSnaps[idx]?.data().count || 0;
        });
      } catch (dbErr) {
        console.error('[Research Summary API] Firestore count error:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        return res.status(500).json({
          success: false,
          error: 'Failed to aggregate dataset summary'
        });
      }

      return res.json({
        success: true,
        totalRecords,
        totalTrials,
        counts
      });
    } catch (err) {
      console.error("[Research Summary API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to generate dataset summary' });
    }
  });

}
