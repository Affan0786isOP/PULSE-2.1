import { getAdminDb, getAdminDiagnosticMessage } from '../config/firebaseAdmin';
import { normalizeAssessmentType } from '../engines/assessmentTypes';

export interface ExperimentSession {
  sessionId: string;
  uid: string;
  assessmentType: string;
  ageGroup: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
  consumedAt?: number;
  researchDocId?: string;
  leaderboardSubmitted?: boolean;
  leaderboardDocId?: string;
  leaderboardSubmittedAt?: number;
  trialsDigest?: string;
  provenanceToken?: string;
  derivedMetrics?: Record<string, any>;
  scoreMetric?: number;
  isNewPersonalBest?: boolean;
  previousPersonalBest?: number | null;
  personalBest?: number | null;
}

export async function getAndValidateSession(
  sessionId: string,
  userUid: string,
  requestedAssessmentType: string
): Promise<{ valid: boolean; session?: ExperimentSession; error?: string; status?: number }> {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.trim().length > 128) {
    return { valid: false, error: 'Missing or invalid session ID', status: 400 };
  }

  const cleanSessionId = sessionId.trim();
  const db = getAdminDb();
  if (!db) {
    const errorDetail = getAdminDiagnosticMessage();
    console.error('[Session Lookup] Firestore database is unavailable:', errorDetail);
    return { valid: false, error: `Database unavailable: ${errorDetail}`, status: 500 };
  }

  let session: ExperimentSession | null = null;
  try {
    const snap = await db.collection('experimentSessions').doc(cleanSessionId).get();
    if (snap.exists) {
      session = snap.data() as ExperimentSession;
    }
  } catch (err: any) {
    console.error('[Session Lookup] Firestore read failed:', err instanceof Error ? err.message : String(err));
    return { valid: false, error: 'Database error reading experiment session', status: 500 };
  }

  if (!session) {
    return { valid: false, error: 'Experiment session not found or invalid', status: 404 };
  }

  if (session.uid !== userUid) {
    return { valid: false, error: 'Session UID mismatch with authenticated identity', status: 403 };
  }

  if (normalizeAssessmentType(session.assessmentType) !== normalizeAssessmentType(requestedAssessmentType)) {
    return { valid: false, error: `Session assessment type mismatch (expected ${session.assessmentType}, received ${requestedAssessmentType})`, status: 400 };
  }

  if (Date.now() > session.expiresAt + 60000) {
    return { valid: false, error: 'Experiment session has expired', status: 400 };
  }

  if (session.consumed) {
    return { valid: false, error: 'Experiment session has already been completed/consumed', status: 400 };
  }

  return { valid: true, session };
}
