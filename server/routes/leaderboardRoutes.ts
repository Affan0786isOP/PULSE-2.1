import type express from 'express';
import type { Express } from 'express';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminDiagnosticMessage, safeLogWarning } from '../config/firebaseAdmin';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES, MAX_TRIALS_PER_SESSION } from '../config/constants';
import { verifyFirebaseUserToken } from '../middleware/auth';
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { validateAndDeriveAssessmentFromTrials } from '../engines/assessmentEngine';
import { getIdempotency, setIdempotency, isValidIdempotencyKey } from '../services/idempotencyService';
import { getAndValidateSession, type ExperimentSession } from '../services/sessionService';
import { computeCanonicalTrialsDigest, safeCompareHex, signProvenancePayload } from '../services/provenanceService';
import { isOptedInLeaderboardUser, isValidLeaderboardScoreMetric, type AuthoritativeLeaderboardEntry } from '../services/leaderboardService';

export function registerLeaderboardRoutes(app: Express): void {
  // Authoritative Leaderboard Submission & Firestore Server-Side Write
  app.post('/api/leaderboard/submit', async (req, res) => {
    let leaderboardIdempotencyKey: string | null = null;
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { displayName, assessmentType, ageGroup, userId, trials, sessionId, idempotencyKey } = req.body || {};

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        return res.status(400).json({ success: false, error: 'sessionId is required and must be a valid non-empty string' });
      }

      if (idempotencyKey !== undefined && idempotencyKey !== null && !isValidIdempotencyKey(idempotencyKey)) {
        return res.status(400).json({ success: false, error: 'Invalid idempotencyKey (must be 1-128 characters string)' });
      }

      const validIdempKey = isValidIdempotencyKey(idempotencyKey) ? idempotencyKey.trim() : null;
      const activeSessionId = sessionId.trim();

      if (activeSessionId === validIdempKey) {
        return res.status(400).json({ success: false, error: 'sessionId and idempotencyKey must be distinct' });
      }

      leaderboardIdempotencyKey = validIdempKey ?? activeSessionId;
      if (leaderboardIdempotencyKey) {
        const cached = getIdempotency(`lb_sub:${leaderboardIdempotencyKey}`);
        if (cached) {
          return res.json(cached);
        }
      }

      if (!activeSessionId) {
        return res.status(400).json({ success: false, error: 'Authoritative experiment session is required for leaderboard submission' });
      }

      if (userId && typeof userId === 'string' && userId.trim() !== verifiedUser.uid) {
        return res.status(403).json({ success: false, error: 'Participant identity mismatch with authenticated user' });
      }

      if (!displayName || typeof displayName !== 'string' || !displayName.trim() || [...displayName.trim()].length > 30) {
        return res.status(400).json({ success: false, error: 'Invalid displayName (1-30 characters required)' });
      }

      const normalizedAssessmentType = normalizeAssessmentType(assessmentType);
      if (!normalizedAssessmentType || !VALID_ASSESSMENT_TYPES.includes(normalizedAssessmentType)) {
        return res.status(400).json({ success: false, error: 'Invalid assessmentType' });
      }

      const leaderboardDocId = crypto.randomUUID();
      const db = getAdminDb();

      // Retrieve and validate session authoritatively from Firestore
      let sData: ExperimentSession | null = null;
      if (db) {
        try {
          const sessionSnap = await db.collection('experimentSessions').doc(activeSessionId).get();
          if (sessionSnap.exists) {
            sData = sessionSnap.data() as ExperimentSession;
          }
        } catch (dbErr) {
          console.error('[Leaderboard Submit API] Session read error:', dbErr instanceof Error ? dbErr.message : String(dbErr));
          return res.status(500).json({ success: false, error: 'Failed to read experiment session from database' });
        }
      }

      if (!sData) {
        return res.status(404).json({ success: false, error: 'Experiment session not found' });
      }

      // Rule 1: Same user verification
      if (sData.uid !== verifiedUser.uid) {
        return res.status(403).json({ success: false, error: 'Session UID mismatch with authenticated user' });
      }

      // Rule 1: Same assessment type verification
      if (normalizeAssessmentType(sData.assessmentType) !== normalizedAssessmentType) {
        return res.status(400).json({ success: false, error: 'Session assessment type mismatch' });
      }

      // Strictly bind ageGroup to session; reject invalid age groups
      if (!VALID_AGE_GROUPS.includes(sData.ageGroup as any)) {
        return res.status(400).json({ success: false, error: 'Authoritative experiment session has an invalid ageGroup' });
      }
      if (ageGroup && ageGroup !== sData.ageGroup) {
        return res.status(400).json({ success: false, error: 'ageGroup mismatch with authoritative experiment session' });
      }

      // Enforce session consumption and expiry
      if (!sData.consumed) {
        return res.status(400).json({ success: false, error: 'Leaderboard submission requires a completed, consumed research session' });
      }
      if (typeof sData.expiresAt === 'number' && Date.now() > sData.expiresAt + 60000) {
        return res.status(400).json({ success: false, error: 'Experiment session has expired' });
      }

      // Rule 2 & 3: Bind leaderboard submission to session lifecycle and prevent reuse (durable idempotency)
      if (sData.leaderboardSubmitted) {
        if (sData.leaderboardDocId) {
          const replayPayload = {
            success: true,
            docId: sData.leaderboardDocId,
            scoreMetric: sData.scoreMetric,
            provenanceToken: sData.provenanceToken,
            trialsDigest: sData.trialsDigest,
            derivedMetrics: sData.derivedMetrics,
            alreadySubmitted: true
          };
          if (leaderboardIdempotencyKey) {
            setIdempotency(`lb_sub:${leaderboardIdempotencyKey}`, replayPayload);
          }
          return res.json(replayPayload);
        }
        return res.status(400).json({ success: false, error: 'Leaderboard score has already been submitted for this session' });
      }

      const authoritativeAgeGroup = sData.ageGroup;

      // Rule 12 & 13: Derive metrics & validate trials
      let metrics = sData.derivedMetrics;
      let trialsDigest = sData.trialsDigest;

      if (!metrics) {
        const validation = validateAndDeriveAssessmentFromTrials(normalizedAssessmentType, authoritativeAgeGroup, trials, sData);
        if (!validation.success || !validation.derivedMetrics) {
          return res.status(400).json({ success: false, error: validation.error || 'Trial validation failed' });
        }
        metrics = validation.derivedMetrics;
        trialsDigest = computeCanonicalTrialsDigest(trials);
      } else if (!trialsDigest && Array.isArray(trials) && trials.length > 0) {
        trialsDigest = computeCanonicalTrialsDigest(trials);
      }

      let scoreMetric = 0;
      const isSpeed = normalizedAssessmentType === 'visual-reaction' || normalizedAssessmentType === 'direction' || normalizedAssessmentType === 'color-recognition';
      if (isSpeed) {
        scoreMetric = Number(metrics.averageReactionTime);
      } else if (normalizedAssessmentType === 'block-memory' || normalizedAssessmentType === 'number-memory') {
        scoreMetric = Number(metrics.longestSeq ?? (normalizedAssessmentType === 'block-memory' ? (metrics.highestLevel > 0 ? metrics.highestLevel + 1 : 0) : (metrics.highestLevel > 0 ? metrics.highestLevel + 2 : 0)));
      } else {
        scoreMetric = Number(metrics.overallAccuracy ?? 0);
      }

      if (!isValidLeaderboardScoreMetric(normalizedAssessmentType, scoreMetric)) {
        return res.status(400).json({ success: false, error: 'Invalid or non-finite score metric for assessment type' });
      }

      const tokenData = `lb:${normalizedAssessmentType}:${authoritativeAgeGroup}:${scoreMetric.toFixed(2)}:${displayName.trim()}:${trialsDigest || ''}`;
      const provenanceToken = signProvenancePayload(tokenData);

      const now = Date.now();

      

            // 2. Authoritative Firestore persistence
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database unavailable: Server misconfiguration' });
      }
      try {
        const sessionDocRef = db.collection('experimentSessions').doc(activeSessionId);
        const leaderboardDocRef = db.collection('leaderboardResults').doc(leaderboardDocId);

        const leaderboardDoc = {
          displayName: displayName.trim(),
          assessmentType: normalizedAssessmentType,
          scoreMetric,
          ageGroup: authoritativeAgeGroup,
          provenanceToken,
          hidden: false,
          createdAt: FieldValue.serverTimestamp()
        };

        await db.runTransaction(async (tx) => {
          tx.set(leaderboardDocRef, leaderboardDoc);
          tx.set(sessionDocRef, {
            leaderboardSubmitted: true,
            leaderboardDocId,
            leaderboardSubmittedAt: now,
            scoreMetric,
            trialsDigest: trialsDigest || '',
            provenanceToken,
            derivedMetrics: metrics
          }, { merge: true });
        });
      } catch (dbErr: any) {
        console.error('[Leaderboard Submit API] Firestore persistence failed:', dbErr);
        return res.status(500).json({ success: false, error: 'Failed to persist leaderboard result in database' });
      }
      const resultPayload = {
        success: true,
        docId: leaderboardDocId,
        scoreMetric,
        provenanceToken,
        trialsDigest,
        derivedMetrics: metrics
      };

      if (leaderboardIdempotencyKey && resultPayload) {
        setIdempotency(`lb_sub:${leaderboardIdempotencyKey}`, resultPayload);
      }

      return res.json(resultPayload);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'DATABASE_UNAVAILABLE') {
        return res.status(503).json({ success: false, error: 'Database service is unavailable. Unable to save leaderboard result.' });
      }
      if (errMsg === 'SESSION_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Experiment session not found' });
      }
      if (errMsg === 'SESSION_UID_MISMATCH') {
        return res.status(403).json({ success: false, error: 'Session UID mismatch with authenticated user' });
      }
      if (errMsg === 'SESSION_TYPE_MISMATCH') {
        return res.status(400).json({ success: false, error: 'Session assessment type mismatch' });
      }
      if (errMsg === 'SESSION_INVALID_AGE_GROUP') {
        return res.status(400).json({ success: false, error: 'Authoritative experiment session has an invalid ageGroup' });
      }
      if (errMsg === 'SESSION_AGE_GROUP_MISMATCH') {
        return res.status(400).json({ success: false, error: 'ageGroup mismatch with authoritative experiment session' });
      }
      if (errMsg === 'SESSION_NOT_CONSUMED') {
        return res.status(400).json({ success: false, error: 'Leaderboard submission requires a completed, consumed research session' });
      }
      if (errMsg === 'SESSION_EXPIRED') {
        return res.status(400).json({ success: false, error: 'Experiment session has expired' });
      }
      if (errMsg === 'INVALID_SCORE_METRIC') {
        return res.status(400).json({ success: false, error: 'Invalid or non-finite score metric for assessment type' });
      }
      if (errMsg === 'LEADERBOARD_ALREADY_SUBMITTED') {
        const sData = (err as any).sData;
        if (sData && sData.leaderboardDocId) {
          const replayPayload = {
            success: true,
            docId: sData.leaderboardDocId,
            scoreMetric: sData.scoreMetric,
            provenanceToken: sData.provenanceToken,
            trialsDigest: sData.trialsDigest,
            derivedMetrics: sData.derivedMetrics,
            alreadySubmitted: true
          };
          if (leaderboardIdempotencyKey) {
            setIdempotency(`lb_sub:${leaderboardIdempotencyKey}`, replayPayload);
          }
          return res.json(replayPayload);
        }
        return res.status(400).json({ success: false, error: 'Leaderboard score has already been submitted for this session' });
      }
      if (errMsg.startsWith('VALIDATION_FAILED:')) {
        return res.status(400).json({ success: false, error: errMsg.replace('VALIDATION_FAILED:', '') });
      }

      console.error("[Leaderboard Submit API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to persist leaderboard result in database' });
    }
  });




  app.post('/api/leaderboard/verify-provenance', (req, res) => {
    const { assessmentType, ageGroup, scoreMetric, displayName, trialsDigest, provenanceToken } = req.body || {};
    if (!provenanceToken || typeof provenanceToken !== 'string' || typeof scoreMetric !== 'number') {
      return res.json({ verified: false, reason: 'Missing parameters' });
    }
    const tokenData = `lb:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${(displayName || '').trim()}:${trialsDigest || ''}`;
    const expected = signProvenancePayload(tokenData);
    return res.json({ verified: safeCompareHex(expected, provenanceToken) });
  });


  // Public Leaderboard Retrieval Endpoint — Authoritative Firestore leaderboardResults
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : null;
      const assessmentType = rawType ? normalizeAssessmentType(rawType) : null;
      const entriesMap = new Map<string, AuthoritativeLeaderboardEntry>();

      const db = getAdminDb();
      const isSpeed = !assessmentType || assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
      const orderDirection: 'asc' | 'desc' = isSpeed ? 'asc' : 'desc';

      const aliases = assessmentType
        ? (assessmentType === 'color-recognition' ? ['color-recognition', 'colour-recognition', 'color-test'] : [assessmentType])
        : ['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory'];

      if (db) {
        for (const alias of aliases) {
          const aliasIsSpeed = alias === 'visual-reaction' || alias === 'direction' || alias === 'color-recognition' || alias === 'colour-recognition' || alias === 'color-test';
          const aliasDirection: 'asc' | 'desc' = aliasIsSpeed ? 'asc' : 'desc';

          try {
            const snap = await db.collection('leaderboardResults')
              .where('assessmentType', '==', alias)
              .orderBy('scoreMetric', aliasDirection)
              .limit(100)
              .get();

            snap.docs.forEach((docSnap: any) => {
              const data = docSnap.data();
              const displayName = String(data?.displayName || '').trim();
              const docType = normalizeAssessmentType(String(data?.assessmentType || alias));

              if (data && data.hidden !== true && isOptedInLeaderboardUser(displayName) && !entriesMap.has(docSnap.id)) {
                entriesMap.set(docSnap.id, {
                  id: docSnap.id,
                  displayName,
                  assessmentType: docType,
                  scoreMetric: Number(data.scoreMetric) || 0,
                  ageGroup: String(data.ageGroup || ''),
                  createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || Date.now()),
                  provenanceToken: String(data.provenanceToken || ''),
                  hidden: false
                });
              }
            });
          } catch (qErr: any) {
            safeLogWarning('[Leaderboard API] Firestore query notice:', qErr);
          }
        }
      }

      const entries = Array.from(entriesMap.values());

      entries.sort((a, b) => {
        if (isSpeed) {
          if (a.scoreMetric !== b.scoreMetric) return a.scoreMetric - b.scoreMetric;
        } else {
          if (a.scoreMetric !== b.scoreMetric) return b.scoreMetric - a.scoreMetric;
        }
        // Deterministic tie-breaker 1: createdAt ascending (earlier submission first)
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        if (aTime !== bTime) return aTime - bTime;
        // Deterministic tie-breaker 2: id lexicographical comparison
        return a.id.localeCompare(b.id);
      });

      return res.json({
        success: true,
        entries: entries.slice(0, 100)
      });
    } catch (err) {
      console.error('[Leaderboard API] Error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve leaderboard',
        entries: []
      });
    }
  });

}
