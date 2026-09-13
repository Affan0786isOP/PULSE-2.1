import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

function isPermissionDenied(err: any): boolean {
  if (!err) return false;
  if (err.code === 7 || err.code === 'permission-denied') return true;
  const msg = err.message || String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('Missing or insufficient permissions')) return true;
  return false;
}

function safeLogWarning(prefix: string, err: any) {
  if (isPermissionDenied(err)) {
    // Suppress permission denied warnings in preview environments
    return;
  }
  // Print only the message to avoid leaking stack traces that trigger the error detector
  console.warn(prefix, err instanceof Error ? err.message : String(err));
}

function initializeAdminApp(): void {
  if (getApps().length > 0) {
    return;
  }
  
  let appletConfig: any = null;
  try {
    const configRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
    appletConfig = JSON.parse(configRaw);
  } catch (e) {
  }
  
  const envProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT)?.trim();
  const projectId = envProjectId || appletConfig?.projectId;

  if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    try {
      let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      
      // Remove surrounding quotes if present (e.g. from Vercel env vars)
      if (serviceAccountStr.startsWith('"') && serviceAccountStr.endsWith('"')) {
        serviceAccountStr = serviceAccountStr.slice(1, -1).trim();
      } else if (serviceAccountStr.startsWith("'") && serviceAccountStr.endsWith("'")) {
        serviceAccountStr = serviceAccountStr.slice(1, -1).trim();
      }

      let serviceAccount;
      if (serviceAccountStr.startsWith('{')) {
        serviceAccount = JSON.parse(serviceAccountStr);
      } else {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString('utf8'));
      }
      if (serviceAccount && serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      if (getApps().length === 0) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId || serviceAccount.project_id
        });
      }
      lastAdminError = null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Firebase Admin] Initialization failed:', msg);
      lastAdminError = `Invalid FIREBASE_SERVICE_ACCOUNT configuration: ${msg}`;
      throw new Error(lastAdminError);
    }
  } else {
    lastAdminError = 'FIREBASE_SERVICE_ACCOUNT environment variable is missing or empty. Server-side admin credentials are required.';
    throw new Error(lastAdminError);
  }
}

let lastAdminError: string | null = null;
let adminDb: Firestore | null = null;

export function getAdminDiagnosticMessage(): string {
  if (lastAdminError) return lastAdminError;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    return 'FIREBASE_SERVICE_ACCOUNT environment variable is missing or empty. Server-side admin credentials are required.';
  }
  return 'Server admin initialization failed';
}

function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;
  try {
    initializeAdminApp();
    
    let appletConfig: any = null;
    try {
      const configRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
      appletConfig = JSON.parse(configRaw);
    } catch (e) {}
    
    const envProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT)?.trim();
    const envDbId = (process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID)?.trim();
    const rawDbId = envDbId || (!envProjectId ? appletConfig?.firestoreDatabaseId : undefined);
    const dbId = typeof rawDbId === 'string' && rawDbId.trim() && rawDbId !== '(default)' ? rawDbId.trim() : undefined;
    
    adminDb = dbId ? getFirestore(getApps()[0], dbId) : getFirestore(getApps()[0]);
    return adminDb;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    safeLogWarning('[Firebase Admin] Firestore initialization notice:', err);
    if (!lastAdminError) {
      lastAdminError = msg;
    }
    return null;
  }
}

async function verifyFirebaseUserToken(req: express.Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) return null;

  // Let initializeAdminApp throw if server config is missing/invalid
  initializeAdminApp();

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.warn('[Firebase Auth] verifyIdToken failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}



const VALID_AGE_GROUPS = [
  'Children (8–12)',
  'Adolescents (13–17)',
  'Young adults (18–25)',
  'Adults (26–40)',
  'Middle-aged adults (41–60)',
  'Older adults (61–75)',
  'Seniors (76+)'
];

const VALID_ASSESSMENT_TYPES = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory'
];

function normalizeAssessmentType(type: string): string {
  const t = String(type || '').toLowerCase().trim();
  if (t === 'reaction-test' || t === 'visual-reaction') return 'visual-reaction';
  if (t === 'direction-test' || t === 'direction') return 'direction';
  if (t === 'colour-recognition' || t === 'color-test' || t === 'color-recognition') return 'color-recognition';
  if (t === 'block-memory') return 'block-memory';
  if (t === 'number-memory') return 'number-memory';
  return t;
}

function validateReactionMetrics(metrics: any): boolean {
  if (!metrics || typeof metrics !== 'object') return false;
  const { averageReactionTime, fastestReactionTime, slowestReactionTime, medianReactionTime } = metrics;
  return typeof averageReactionTime === 'number' && averageReactionTime >= 80.0 && averageReactionTime <= 3600000.0 &&
    typeof fastestReactionTime === 'number' && fastestReactionTime >= 80.0 && fastestReactionTime <= averageReactionTime &&
    typeof slowestReactionTime === 'number' && slowestReactionTime >= averageReactionTime && slowestReactionTime <= 3600000.0 &&
    typeof medianReactionTime === 'number' && medianReactionTime >= 80.0 && medianReactionTime <= 3600000.0 &&
    fastestReactionTime <= medianReactionTime && medianReactionTime <= slowestReactionTime;
}

function deriveForeperiodCategory(foreperiodMs: number | null | undefined): 'SHORT' | 'LONG' | null {
  if (typeof foreperiodMs !== 'number' || !Number.isFinite(foreperiodMs) || !Number.isInteger(foreperiodMs)) return null;
  if (foreperiodMs >= 100 && foreperiodMs <= 500) return 'SHORT';
  if (foreperiodMs >= 501 && foreperiodMs <= 3000) return 'LONG';
  return null;
}

function normalizeSequenceForDigest(val: unknown): (number | string)[] | string | number | null {
  if (Array.isArray(val)) {
    return val.map(x => (typeof x === 'number' ? x : String(x)));
  }
  if (typeof val === 'string' || typeof val === 'number') {
    return val;
  }
  return null;
}

function computeCanonicalTrialsDigest(trials: Record<string, any>[]): string {
  if (!Array.isArray(trials) || trials.length === 0) {
    return crypto.createHash('sha256').update('[]').digest('hex');
  }

  const normalizedTrials = trials.map((t: Record<string, any>, idx: number) => {
    const trialNumber = typeof t.trialNumber === 'number' ? t.trialNumber : (Number(t.trialNumber) || (idx + 1));
    const trialIndex = typeof t.trialIndex === 'number' ? t.trialIndex : (idx + 1);
    const sequenceNumber = typeof t.sequenceNumber === 'number' ? t.sequenceNumber : (idx + 1);
    const attemptNumber = typeof t.attemptNumber === 'number' ? t.attemptNumber : 1;
    const condition = typeof t.condition === 'string' ? t.condition : 'standard';

    const reactionTime = typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.reactionTimeMs === 'number' ? t.reactionTimeMs : null);
    const reactionTimeMs = reactionTime;
    const rawReactionTime = typeof t.rawReactionTime === 'number' ? t.rawReactionTime : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);
    const rawLatencyMs = rawReactionTime;
    const displayDelayOffsetMs = typeof t.displayDelayOffsetMs === 'number' ? t.displayDelayOffsetMs : null;

    const falseStart = t.falseStart === true;
    const timedOut = t.timedOut === true;
    const valid = typeof t.valid === 'boolean' ? t.valid : (!falseStart && !timedOut);
    const correct = typeof t.correct === 'boolean'
      ? t.correct
      : (typeof t.correctness === 'boolean'
          ? t.correctness
          : (typeof t.accuracy === 'number' ? t.accuracy === 1 : valid));
    const correctness = correct;
    const accuracy = typeof t.accuracy === 'number' ? t.accuracy : (correct ? 1 : 0);

    const foreperiodMs = typeof t.foreperiodMs === 'number' ? t.foreperiodMs : null;
    const foreperiodCategory = typeof t.foreperiodCategory === 'string' && (t.foreperiodCategory === 'SHORT' || t.foreperiodCategory === 'LONG')
      ? t.foreperiodCategory
      : (typeof t.foreperiodMs === 'number' ? deriveForeperiodCategory(t.foreperiodMs) : null);

    const targetDirection = typeof t.targetDirection === 'string' ? t.targetDirection : null;
    const wordName = typeof t.wordName === 'string' ? t.wordName : null;
    const wordColor = typeof t.wordColor === 'string' ? t.wordColor : null;
    const instruction = typeof t.instruction === 'string' ? t.instruction : null;
    const userResponse = typeof t.userResponse === 'string' ? t.userResponse : null;

    const level = typeof t.level === 'number' ? t.level : null;
    const sequenceLength = typeof t.sequenceLength === 'number' ? t.sequenceLength : null;
    const generatedSequence = normalizeSequenceForDigest(t.generatedSequence);
    const playerSequence = normalizeSequenceForDigest(t.playerSequence);
    const correctSelections = typeof t.correctSelections === 'number' ? t.correctSelections : null;
    const responseDurationMs = typeof t.responseDurationMs === 'number' ? t.responseDurationMs : null;

    const stimulusTimestamp = typeof t.stimulusTimestamp === 'number' ? t.stimulusTimestamp : null;
    const responseTimestamp = typeof t.responseTimestamp === 'number' ? t.responseTimestamp : null;
    const stimulusScheduledAt = typeof t.stimulusScheduledAt === 'number' ? t.stimulusScheduledAt : null;
    const stimulusPresentedAt = typeof t.stimulusPresentedAt === 'number' ? t.stimulusPresentedAt : null;
    const responseDetectedAt = typeof t.responseDetectedAt === 'number' ? t.responseDetectedAt : null;
    const stimulusWallTimestamp = typeof t.stimulusWallTimestamp === 'number' ? t.stimulusWallTimestamp : null;
    const responseWallTimestamp = typeof t.responseWallTimestamp === 'number' ? t.responseWallTimestamp : null;
    const assessmentStartedAt = typeof t.assessmentStartedAt === 'number' ? t.assessmentStartedAt : null;
    const previousTrialEndedAt = typeof t.previousTrialEndedAt === 'number' ? t.previousTrialEndedAt : null;
    const interStimulusIntervalMs = typeof t.interStimulusIntervalMs === 'number' ? t.interStimulusIntervalMs : null;
    const interTrialIntervalMs = typeof t.interTrialIntervalMs === 'number' ? t.interTrialIntervalMs : null;
    const validity = typeof t.validity === 'string' ? t.validity : null;
    const qualityFlag = t.qualityFlag !== undefined && t.qualityFlag !== null ? String(t.qualityFlag) : null;
    const notes = typeof t.notes === 'string' ? t.notes : null;

    const deviceCategory = typeof t.deviceCategory === 'string' ? t.deviceCategory : null;
    const device = typeof t.device === 'string' ? t.device : null;
    const screenWidth = typeof t.screenWidth === 'number' && Number.isFinite(t.screenWidth) && t.screenWidth > 0 ? Number(t.screenWidth) : null;
    const screenHeight = typeof t.screenHeight === 'number' && Number.isFinite(t.screenHeight) && t.screenHeight > 0 ? Number(t.screenHeight) : null;

    const stimulusScheduledAtPerfMs = typeof t.stimulusScheduledAtPerfMs === 'number' && Number.isFinite(t.stimulusScheduledAtPerfMs)
      ? t.stimulusScheduledAtPerfMs
      : (typeof t.stimulusScheduledAt === 'number' && Number.isFinite(t.stimulusScheduledAt) ? t.stimulusScheduledAt : null);
    const stimulusPresentedAtPerfMs = typeof t.stimulusPresentedAtPerfMs === 'number' && Number.isFinite(t.stimulusPresentedAtPerfMs)
      ? t.stimulusPresentedAtPerfMs
      : (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) ? t.stimulusPresentedAt : null);
    const responseDetectedAtPerfMs = typeof t.responseDetectedAtPerfMs === 'number' && Number.isFinite(t.responseDetectedAtPerfMs)
      ? t.responseDetectedAtPerfMs
      : (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) ? t.responseDetectedAt : null);
    const previousTrialEndedAtPerfMs = typeof t.previousTrialEndedAtPerfMs === 'number' && Number.isFinite(t.previousTrialEndedAtPerfMs)
      ? t.previousTrialEndedAtPerfMs
      : (typeof t.previousTrialEndedAt === 'number' && Number.isFinite(t.previousTrialEndedAt) ? t.previousTrialEndedAt : null);

    return {
      accuracy,
      assessmentStartedAt,
      attemptNumber,
      condition,
      correct,
      correctSelections,
      correctness,
      device,
      deviceCategory,
      displayDelayOffsetMs,
      falseStart,
      foreperiodCategory,
      foreperiodMs,
      generatedSequence,
      instruction,
      interStimulusIntervalMs,
      interTrialIntervalMs,
      level,
      notes,
      playerSequence,
      previousTrialEndedAt,
      previousTrialEndedAtPerfMs,
      qualityFlag,
      rawLatencyMs,
      rawReactionTime,
      reactionTime,
      reactionTimeMs,
      responseDetectedAt,
      responseDetectedAtPerfMs,
      responseDurationMs,
      responseTimestamp,
      responseWallTimestamp,
      screenHeight,
      screenWidth,
      sequenceLength,
      sequenceNumber,
      stimulusPresentedAt,
      stimulusPresentedAtPerfMs,
      stimulusScheduledAt,
      stimulusScheduledAtPerfMs,
      stimulusTimestamp,
      stimulusWallTimestamp,
      targetDirection,
      timedOut,
      trialIndex,
      trialNumber,
      userResponse,
      valid,
      validity,
      wordColor,
      wordName
    };
  });

  return crypto.createHash('sha256')
    .update(JSON.stringify(normalizedTrials))
    .digest('hex');
}

// Helper to parse cookies from header
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      if (key) {
        try {
          cookies[key] = decodeURIComponent(val);
        } catch {
          // Fallback to raw value if decodeURIComponent throws on malformed URI encoding
          cookies[key] = val;
        }
      }
    }
  }
  return cookies;
}

// Constants & Limits
const MAX_TRIALS_PER_SESSION = 100;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_IDEMPOTENCY_ENTRIES = 5000;

function isValidIdempotencyKey(key: unknown): key is string {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_IDEMPOTENCY_KEY_LENGTH;
}

// Helper to identify mobile user agents
function isMobileUserAgent(req: express.Request): boolean {
  const secChMobile = req.headers['sec-ch-ua-mobile'];
  if (secChMobile === '?1') return true;
  const ua = (req.headers['user-agent'] as string) || '';
  if (!ua) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle|KFAPWI|Fennec|Windows Phone|SamsungBrowser|MiuiBrowser|UCBrowser/i.test(ua);
}


function seedPRNG(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    let z = (h += 0x6D2B79F5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// Assessment-specific trial schema validators

function generateAuthoritativeVrtForeperiod(
  sessionId: string,
  trialNumber: number,
  attemptNumber: number
): { foreperiodMs: number; foreperiodCategory: 'SHORT' | 'LONG' } {
  const prng = seedPRNG(`${sessionId}-reaction-delays-t${trialNumber}-a${attemptNumber}`);
  const isShort = prng() < 0.5;
  const foreperiodMs = isShort
    ? Math.floor(prng() * (500 - 100 + 1)) + 100
    : Math.floor(prng() * (3000 - 501 + 1)) + 501;
  const foreperiodCategory = foreperiodMs <= 500 ? 'SHORT' : 'LONG';
  return { foreperiodMs, foreperiodCategory };
}

function validateVisualReactionTrial(
  t: any,
  index: number,
  sessionId: string,
  expectedAttemptNumber: number
): { success: boolean; error?: string; foreperiodMs?: number; foreperiodCategory?: 'SHORT' | 'LONG' } {
  const rawFp = t.foreperiodMs !== null && t.foreperiodMs !== undefined
    ? Number(t.foreperiodMs)
    : (t.foreperiod !== null && t.foreperiod !== undefined ? Number(t.foreperiod) : null);

  if (rawFp === null || typeof rawFp !== 'number' || !Number.isFinite(rawFp) || !Number.isInteger(rawFp) || rawFp < 100 || rawFp > 3000) {
    return { success: false, error: `Invalid or missing foreperiod duration in trial ${index + 1}. Must be an integer between 100ms and 3000ms.` };
  }

  const trialNumber = Number(t.trialNumber);
  if (!Number.isInteger(trialNumber) || trialNumber < 1) {
    return { success: false, error: `Invalid trialNumber for visual reaction trial ${index + 1}.` };
  }

  const authoritative = generateAuthoritativeVrtForeperiod(sessionId, trialNumber, expectedAttemptNumber);
  if (rawFp !== authoritative.foreperiodMs) {
    return {
      success: false,
      error: `Foreperiod mismatch in trial ${index + 1}: received ${rawFp}ms, expected the authoritative session schedule.`
    };
  }

  const expectedCategory = authoritative.foreperiodCategory;
  if (t.foreperiodCategory !== undefined && t.foreperiodCategory !== null && t.foreperiodCategory !== expectedCategory) {
    return { success: false, error: `Foreperiod category mismatch in trial ${index + 1}: got ${t.foreperiodCategory} for ${rawFp}ms.` };
  }

  return { success: true, foreperiodMs: authoritative.foreperiodMs, foreperiodCategory: expectedCategory };
}

function validateDirectionTrial(
  t: any,
  index: number,
  expectedDir: string
): { success: boolean; error?: string; userResponse?: string; isResponded?: boolean; isCorrect?: boolean; derivedFalseStart?: boolean; derivedTimedOut?: boolean } {
  const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
  }

  const clientTarget = t.targetDirection.trim().toUpperCase();
  if (!DIRECTIONS.includes(clientTarget)) {
    return { success: false, error: `Trial ${index + 1} has invalid targetDirection '${t.targetDirection}'.` };
  }

  if (clientTarget !== expectedDir) {
    return { success: false, error: `Trial ${index + 1} targetDirection mismatch (${t.targetDirection} vs expected ${expectedDir.toLowerCase()}).` };
  }

  let rawRt: number | null = null;
  if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
    rawRt = Number(t.rawReactionTime);
  } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
    rawRt = Number(t.rawLatencyMs);
  } else if (t.rawLatency !== null && t.rawLatency !== undefined && !Number.isNaN(Number(t.rawLatency))) {
    rawRt = Number(t.rawLatency);
  } else if (t.reactionTime !== null && t.reactionTime !== undefined && !Number.isNaN(Number(t.reactionTime))) {
    rawRt = Number(t.reactionTime);
  } else if (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined && !Number.isNaN(Number(t.reactionTimeMs))) {
    rawRt = Number(t.reactionTimeMs);
  }

  const rawStim = typeof t.stimulusTimestamp === 'number' && Number.isFinite(t.stimulusTimestamp) && t.stimulusTimestamp > 0
    ? t.stimulusTimestamp
    : (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) && t.stimulusPresentedAt > 0 ? t.stimulusPresentedAt : null);
  const rawResp = typeof t.responseTimestamp === 'number' && Number.isFinite(t.responseTimestamp) && t.responseTimestamp > 0
    ? t.responseTimestamp
    : (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) && t.responseDetectedAt > 0 ? t.responseDetectedAt : null);

  const hasStimulus = rawStim !== null;
  const hasResponse = rawResp !== null || (typeof t.userResponse === 'string' && t.userResponse.trim().length > 0);

  const derivedFalseStart = !hasStimulus || (hasStimulus && rawStim !== null && rawResp !== null && rawResp < rawStim) || (rawRt !== null && rawRt < 80.0);
  const derivedTimedOut = !derivedFalseStart && (!hasResponse || rawRt === null || rawRt >= 3000.0 || (rawStim !== null && rawResp !== null && (rawResp - rawStim) >= 3000.0));

  let isCorrect = false;
  let isResponded = false;
  let cleanUserResp: string | undefined = undefined;

  if (!derivedFalseStart && !derivedTimedOut) {
    if (typeof t.userResponse !== 'string' || !t.userResponse.trim()) {
      return { success: false, error: `Trial ${index + 1} is missing required 'userResponse' for responded trial.` };
    }
    cleanUserResp = t.userResponse.trim().toUpperCase();
    if (!DIRECTIONS.includes(cleanUserResp)) {
      return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
    }
    if (rawRt === null || !Number.isFinite(rawRt) || rawRt < 80.0 || rawRt >= 3000.0) {
      return { success: false, error: `Trial ${index + 1} has invalid reactionTime (${rawRt}) for completed trial.` };
    }
    isCorrect = cleanUserResp === expectedDir;
    isResponded = true;
  } else {
    if (t.userResponse !== undefined && t.userResponse !== null) {
      if (typeof t.userResponse !== 'string') {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse type on non-responded trial.` };
      }
      const trimmed = t.userResponse.trim().toUpperCase();
      if (trimmed && !DIRECTIONS.includes(trimmed)) {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
      }
      cleanUserResp = trimmed;
    }
  }

  return { success: true, userResponse: cleanUserResp, isResponded, isCorrect, derivedFalseStart, derivedTimedOut };
}

function validateColorRecognitionTrial(
  t: any,
  index: number,
  expectedWord: string,
  expectedColor: string,
  expectedCondition: 'congruent' | 'incongruent',
  expectedInstruction: 'WORD' | 'COLOR'
): { success: boolean; error?: string; userResponse?: string; isResponded?: boolean; isCorrect?: boolean; derivedFalseStart?: boolean; derivedTimedOut?: boolean } {
  const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];

  if (typeof t.wordName !== 'string' || !t.wordName.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'wordName' field.` };
  }
  if (typeof t.wordColor !== 'string' || !t.wordColor.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'wordColor' field.` };
  }
  if (typeof t.condition !== 'string' || !t.condition.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'condition' field.` };
  }
  if (typeof t.instruction !== 'string' || !t.instruction.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'instruction' field.` };
  }

  const clientWord = t.wordName.trim().toUpperCase();
  const clientColor = t.wordColor.trim().toUpperCase();
  const clientCond = t.condition.trim().toLowerCase();
  const clientInst = t.instruction.trim().toUpperCase();

  if (!COLORS.includes(clientWord)) {
    return { success: false, error: `Trial ${index + 1} has invalid wordName '${t.wordName}'.` };
  }
  if (!COLORS.includes(clientColor)) {
    return { success: false, error: `Trial ${index + 1} has invalid wordColor '${t.wordColor}'.` };
  }
  if (clientCond !== 'congruent' && clientCond !== 'incongruent') {
    return { success: false, error: `Trial ${index + 1} has invalid condition '${t.condition}'.` };
  }
  if (clientInst !== 'WORD' && clientInst !== 'COLOR') {
    return { success: false, error: `Trial ${index + 1} has invalid instruction '${t.instruction}'.` };
  }

  if (clientWord !== expectedWord) {
    return { success: false, error: `Trial ${index + 1} wordName mismatch (${t.wordName} vs expected ${expectedWord}).` };
  }
  if (clientColor !== expectedColor) {
    return { success: false, error: `Trial ${index + 1} wordColor mismatch (${t.wordColor} vs expected ${expectedColor}).` };
  }
  if (clientCond !== expectedCondition) {
    return { success: false, error: `Trial ${index + 1} condition mismatch (${t.condition} vs expected ${expectedCondition}).` };
  }
  if (clientInst !== expectedInstruction) {
    return { success: false, error: `Trial ${index + 1} instruction mismatch (${t.instruction} vs expected ${expectedInstruction}).` };
  }

  let rawRt: number | null = null;
  if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
    rawRt = Number(t.rawReactionTime);
  } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
    rawRt = Number(t.rawLatencyMs);
  } else if (t.reactionTime !== null && t.reactionTime !== undefined && !Number.isNaN(Number(t.reactionTime))) {
    rawRt = Number(t.reactionTime);
  } else if (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined && !Number.isNaN(Number(t.reactionTimeMs))) {
    rawRt = Number(t.reactionTimeMs);
  }

  const rawStim = typeof t.stimulusTimestamp === 'number' && Number.isFinite(t.stimulusTimestamp) && t.stimulusTimestamp > 0
    ? t.stimulusTimestamp
    : (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) && t.stimulusPresentedAt > 0 ? t.stimulusPresentedAt : null);
  const rawResp = typeof t.responseTimestamp === 'number' && Number.isFinite(t.responseTimestamp) && t.responseTimestamp > 0
    ? t.responseTimestamp
    : (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) && t.responseDetectedAt > 0 ? t.responseDetectedAt : null);

  const hasStimulus = rawStim !== null;
  const hasResponse = rawResp !== null || (typeof t.userResponse === 'string' && t.userResponse.trim().length > 0);

  const derivedFalseStart = !hasStimulus || (hasStimulus && rawStim !== null && rawResp !== null && rawResp < rawStim) || (rawRt !== null && rawRt < 80.0);
  const derivedTimedOut = !derivedFalseStart && (!hasResponse || rawRt === null || rawRt >= 3000.0 || (rawStim !== null && rawResp !== null && (rawResp - rawStim) >= 3000.0));

  const expectedCorrectResponse = expectedInstruction === 'WORD' ? expectedWord : expectedColor;
  let isCorrect = false;
  let isResponded = false;
  let cleanUserResp: string | undefined = undefined;

  if (!derivedFalseStart && !derivedTimedOut) {
    if (typeof t.userResponse !== 'string' || !t.userResponse.trim()) {
      return { success: false, error: `Trial ${index + 1} is missing required 'userResponse' for responded trial.` };
    }
    cleanUserResp = t.userResponse.trim().toUpperCase();
    if (!COLORS.includes(cleanUserResp)) {
      return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
    }
    if (rawRt === null || !Number.isFinite(rawRt) || rawRt < 80.0 || rawRt >= 3000.0) {
      return { success: false, error: `Trial ${index + 1} has invalid reactionTime (${rawRt}) for completed trial.` };
    }
    isCorrect = cleanUserResp === expectedCorrectResponse;
    isResponded = true;
  } else {
    if (t.userResponse !== undefined && t.userResponse !== null) {
      if (typeof t.userResponse !== 'string') {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse type on non-responded trial.` };
      }
      const trimmed = t.userResponse.trim().toUpperCase();
      if (trimmed && !COLORS.includes(trimmed)) {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
      }
      cleanUserResp = trimmed;
    }
  }

  return { success: true, userResponse: cleanUserResp, isResponded, isCorrect, derivedFalseStart, derivedTimedOut };
}

function validateBlockMemoryTrial(
  t: any,
  index: number,
  expectedLevel: number,
  seqLen: number,
  expectedSeq: number[]
): { success: boolean; error?: string; isCorrect?: boolean } {
  if (typeof t.level !== 'number' || !Number.isInteger(t.level) || t.level < 1) {
    return { success: false, error: `Trial ${index + 1} is missing or has invalid 'level' field.` };
  }

  if (t.level !== expectedLevel) {
    return { success: false, error: `Trial ${index + 1} has unexpected level (${t.level}). Expected level: ${expectedLevel}.` };
  }

  if (t.sequenceLength !== undefined && t.sequenceLength !== null) {
    if (typeof t.sequenceLength !== 'number' || !Number.isInteger(t.sequenceLength) || t.sequenceLength !== seqLen) {
      return { success: false, error: `Trial ${index + 1} sequenceLength (${t.sequenceLength}) mismatch. Expected ${seqLen}.` };
    }
  }

  if (!Array.isArray(t.generatedSequence)) {
    return { success: false, error: `Trial ${index + 1} is missing required 'generatedSequence' array.` };
  }
  if (t.generatedSequence.length !== expectedSeq.length || !t.generatedSequence.every((val: any, i: number) => Number(val) === expectedSeq[i])) {
    return { success: false, error: `Trial ${index + 1} generatedSequence mismatch.` };
  }

  if (!Array.isArray(t.playerSequence)) {
    return { success: false, error: `Trial ${index + 1} is missing required 'playerSequence' array.` };
  }
  if (t.playerSequence.length > 50) {
    return { success: false, error: `Trial ${index + 1} playerSequence length (${t.playerSequence.length}) exceeds maximum allowable length (50).` };
  }
  for (let pIdx = 0; pIdx < t.playerSequence.length; pIdx++) {
    const val = t.playerSequence[pIdx];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 8) {
      return { success: false, error: `Trial ${index + 1} playerSequence contains invalid block ID (${val}) at index ${pIdx}. Must be an integer between 0 and 8.` };
    }
  }

  if (t.correct !== undefined && t.correct !== null && typeof t.correct !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correct' flag type.` };
  }
  if (t.correctness !== undefined && t.correctness !== null && typeof t.correctness !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correctness' flag type.` };
  }

  const isCorrect = t.playerSequence.length === expectedSeq.length &&
    t.playerSequence.every((val: any, i: number) => Number(val) === expectedSeq[i]);

  return { success: true, isCorrect };
}

function validateNumberMemoryTrial(
  t: any,
  index: number,
  expectedLevel: number,
  seqLen: number,
  expectedSeq: string
): { success: boolean; error?: string; isCorrect?: boolean } {
  if (typeof t.level !== 'number' || !Number.isInteger(t.level) || t.level < 1) {
    return { success: false, error: `Trial ${index + 1} is missing or has invalid 'level' field.` };
  }

  if (t.level !== expectedLevel) {
    return { success: false, error: `Trial ${index + 1} has unexpected level (${t.level}). Expected level: ${expectedLevel}.` };
  }

  if (t.sequenceLength !== undefined && t.sequenceLength !== null) {
    if (typeof t.sequenceLength !== 'number' || !Number.isInteger(t.sequenceLength) || t.sequenceLength !== seqLen) {
      return { success: false, error: `Trial ${index + 1} sequenceLength (${t.sequenceLength}) mismatch. Expected ${seqLen}.` };
    }
  }

  if (typeof t.generatedSequence !== 'string' || !t.generatedSequence) {
    return { success: false, error: `Trial ${index + 1} is missing required 'generatedSequence' string.` };
  }
  if (t.generatedSequence !== expectedSeq) {
    return { success: false, error: `Trial ${index + 1} generatedSequence mismatch.` };
  }

  if (typeof t.playerSequence !== 'string') {
    return { success: false, error: `Trial ${index + 1} is missing required 'playerSequence' string.` };
  }
  if (!/^\d*$/.test(t.playerSequence)) {
    return { success: false, error: `Trial ${index + 1} playerSequence contains invalid characters. Must contain only digits.` };
  }
  if (t.playerSequence.length > 50) {
    return { success: false, error: `Trial ${index + 1} playerSequence length (${t.playerSequence.length}) exceeds maximum allowable length (50).` };
  }

  if (t.correct !== undefined && t.correct !== null && typeof t.correct !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correct' flag type.` };
  }
  if (t.correctness !== undefined && t.correctness !== null && typeof t.correctness !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correctness' flag type.` };
  }

  const isCorrect = t.playerSequence === expectedSeq;

  return { success: true, isCorrect };
}

function validateAndDeriveAssessmentFromTrials(
  assessmentType: string,
  ageGroup: string,
  trials: any[],
  session?: any
): { success: boolean; error?: string; derivedMetrics?: Record<string, any> } {
  if (!Array.isArray(trials) || trials.length === 0) {
    return { success: false, error: 'Trial sequence must be a non-empty array.' };
  }

  if (trials.length > MAX_TRIALS_PER_SESSION) {
    return { success: false, error: `Trial sequence exceeds maximum allowed limit (${MAX_TRIALS_PER_SESSION} trials).` };
  }

  const sessionId = session ? session.sessionId : 'default_seed';

  // 1. Structural, chronological, and physiological verification of every individual trial observation
  let lastStimulus = 0;
  let lastResponse = 0;
  const sessionWindowMargin = 30000; // 30s allowance for network/clock skew

  for (let i = 0; i < trials.length; i++) {
    const t = trials[i];
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      return { success: false, error: `Trial at index ${i} is not a valid object.` };
    }

    const trialNumber = Number(t.trialNumber);
    if (!Number.isInteger(trialNumber) || trialNumber < 1) {
      return { success: false, error: `Invalid trialNumber at index ${i}. Must be a positive integer.` };
    }

    if (i === 0) {
      if (trialNumber !== 1) {
        return { success: false, error: `Invalid trialNumber at index 0 (received ${trialNumber}, expected 1). First observation must start at logical trial 1.` };
      }
    } else {
      const prevTrialNumber = Number(trials[i - 1].trialNumber);
      if (trialNumber !== prevTrialNumber && trialNumber !== prevTrialNumber + 1) {
        return { success: false, error: `Invalid trialNumber sequence at index ${i} (received ${trialNumber}, expected ${prevTrialNumber} or ${prevTrialNumber + 1}).` };
      }
    }

    const expectedChronoIndex = i + 1;
    if (t.trialIndex !== undefined && t.trialIndex !== null) {
      const trialIndex = Number(t.trialIndex);
      if (!Number.isInteger(trialIndex) || trialIndex !== expectedChronoIndex) {
        return { success: false, error: `Invalid trialIndex at index ${i} (received ${t.trialIndex}, expected ${expectedChronoIndex}).` };
      }
    }

    if (t.sequenceNumber !== undefined && t.sequenceNumber !== null) {
      const sequenceNumber = Number(t.sequenceNumber);
      if (!Number.isInteger(sequenceNumber) || sequenceNumber !== expectedChronoIndex) {
        return { success: false, error: `Invalid sequenceNumber at index ${i} (received ${t.sequenceNumber}, expected ${expectedChronoIndex}).` };
      }
    }

    let expectedAttemptNumber = 1;
    if (i > 0) {
      const prevTrialNumber = Number(trials[i - 1].trialNumber);
      const prevAttemptNumber = Number(trials[i - 1].attemptNumber) || 1;
      if (trialNumber === prevTrialNumber) {
        expectedAttemptNumber = prevAttemptNumber + 1;
      } else {
        expectedAttemptNumber = 1;
      }
    }

    if (t.attemptNumber !== undefined && t.attemptNumber !== null) {
      const attemptNumber = Number(t.attemptNumber);
      if (!Number.isInteger(attemptNumber) || attemptNumber !== expectedAttemptNumber) {
        return { success: false, error: `Invalid attemptNumber at index ${i} (received ${t.attemptNumber}, expected ${expectedAttemptNumber}).` };
      }
    }

    const rawStimulus = t.stimulusTimestamp !== null && t.stimulusTimestamp !== undefined ? Number(t.stimulusTimestamp) : null;
    const stimulusTimestamp = (rawStimulus !== null && Number.isFinite(rawStimulus) && rawStimulus > 0) ? rawStimulus : null;

    const rawResponse = t.responseTimestamp !== null && t.responseTimestamp !== undefined ? Number(t.responseTimestamp) : null;
    const responseTimestamp = (rawResponse !== null && Number.isFinite(rawResponse) && rawResponse > 0) ? rawResponse : null;

    const reactionTime = typeof t.reactionTime === 'number' && Number.isFinite(t.reactionTime)
      ? Number(t.reactionTime)
      : (typeof t.reactionTimeMs === 'number' && Number.isFinite(t.reactionTimeMs) ? Number(t.reactionTimeMs) : null);

    const rawRt = typeof t.rawReactionTime === 'number' && Number.isFinite(t.rawReactionTime)
      ? Number(t.rawReactionTime)
      : (typeof t.rawLatencyMs === 'number' && Number.isFinite(t.rawLatencyMs)
          ? Number(t.rawLatencyMs)
          : (typeof t.rawLatency === 'number' && Number.isFinite(t.rawLatency) ? Number(t.rawLatency) : reactionTime));

    if (stimulusTimestamp === null && responseTimestamp === null) {
      return { success: false, error: `Trial ${i + 1} is missing both stimulusTimestamp and responseTimestamp.` };
    }

    if (stimulusTimestamp === null || (responseTimestamp !== null && responseTimestamp < stimulusTimestamp)) {
      // Pre-stimulus false start: response was recorded prior to or without stimulus presentation
      if (responseTimestamp === null || !Number.isFinite(responseTimestamp) || responseTimestamp <= 0) {
        return { success: false, error: `Invalid responseTimestamp at false start trial ${i + 1}.` };
      }
      if (session) {
        if (responseTimestamp < (session.createdAt - sessionWindowMargin) || responseTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} responseTimestamp is outside the authoritative session window.` };
        }
      }
      if (responseTimestamp < lastResponse) {
        return { success: false, error: `Non-chronological responseTimestamp sequence at trial ${i + 1}.` };
      }
      lastResponse = responseTimestamp;
    } else if (responseTimestamp === null) {
      // Timeout without response: stimulus presented, but response omitted
      if (stimulusTimestamp === null || !Number.isFinite(stimulusTimestamp) || stimulusTimestamp <= 0) {
        return { success: false, error: `Invalid stimulusTimestamp at timeout trial ${i + 1}.` };
      }
      if (session) {
        if (stimulusTimestamp < (session.createdAt - sessionWindowMargin) || stimulusTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} stimulusTimestamp is outside the authoritative session window.` };
        }
      }
      if (stimulusTimestamp < lastStimulus) {
        return { success: false, error: `Non-chronological stimulusTimestamp sequence at trial ${i + 1}.` };
      }
      lastStimulus = stimulusTimestamp;
    } else {
      // Completed / responded observation: both stimulusTimestamp and responseTimestamp are present and responseTimestamp >= stimulusTimestamp
      if (stimulusTimestamp === null || !Number.isFinite(stimulusTimestamp) || stimulusTimestamp <= 0) {
        return { success: false, error: `Invalid stimulusTimestamp at trial ${i + 1}.` };
      }
      if (responseTimestamp === null || !Number.isFinite(responseTimestamp) || responseTimestamp < stimulusTimestamp) {
        return { success: false, error: `Invalid responseTimestamp < stimulusTimestamp at trial ${i + 1}.` };
      }
      if (reactionTime !== null && (!Number.isFinite(reactionTime) || reactionTime < 0)) {
        return { success: false, error: `Invalid reactionTime at trial ${i + 1}.` };
      }
      if (session) {
        if (stimulusTimestamp < (session.createdAt - sessionWindowMargin) || stimulusTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} stimulusTimestamp is outside the authoritative session window.` };
        }
        if (responseTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} responseTimestamp is outside the authoritative session window.` };
        }
      }
      if (stimulusTimestamp < lastStimulus) {
        return { success: false, error: `Non-chronological stimulusTimestamp sequence at trial ${i + 1}.` };
      }
      if (responseTimestamp < lastResponse) {
        return { success: false, error: `Non-chronological responseTimestamp sequence at trial ${i + 1}.` };
      }
      lastStimulus = stimulusTimestamp;
      lastResponse = responseTimestamp;

      const checkedRt = rawRt !== null ? rawRt : reactionTime;
      if (checkedRt !== null && checkedRt > 0) {
        const calculatedDelta = responseTimestamp - stimulusTimestamp;
        if (Math.abs(checkedRt - calculatedDelta) > 150) {
          return { success: false, error: `Trial ${i + 1} reactionTime (${checkedRt}ms) deviates excessively from response-stimulus timestamp delta (${calculatedDelta}ms).` };
        }
      }
    }

    // Strict schema validation on optional/flag fields (no truthy coercion)
    if (t.accuracy !== undefined && t.accuracy !== null) {
      if (typeof t.accuracy !== 'number' && typeof t.accuracy !== 'boolean') {
        return { success: false, error: `Trial ${i + 1} has invalid accuracy type. Must be number or boolean.` };
      }
      if (typeof t.accuracy === 'number' && t.accuracy !== 0 && t.accuracy !== 1 && t.accuracy !== 100) {
        return { success: false, error: `Trial ${i + 1} has invalid accuracy value (${t.accuracy}).` };
      }
    }
    if (t.falseStart !== undefined && t.falseStart !== null && typeof t.falseStart !== 'boolean') {
      return { success: false, error: `Trial ${i + 1} has invalid falseStart type. Must be boolean.` };
    }
    if (t.timedOut !== undefined && t.timedOut !== null && typeof t.timedOut !== 'boolean') {
      return { success: false, error: `Trial ${i + 1} has invalid timedOut type. Must be boolean.` };
    }
    if (t.valid !== undefined && t.valid !== null && typeof t.valid !== 'boolean') {
      return { success: false, error: `Trial ${i + 1} has invalid valid flag type. Must be boolean.` };
    }
  }

  // 2. Assessment Protocol Specific Validation & Server Metric Derivation
  const normType = normalizeAssessmentType(assessmentType);
  switch (normType) {
    case 'visual-reaction': {
      let falseStartsCount = 0;
      const validRTs: number[] = [];
      const chronoValidTrials: any[] = [];

      for (let i = 0; i < trials.length; i++) {
        const t = trials[i];
        let expectedAttemptNumber = 1;
        for (let attemptIdx = i - 1; attemptIdx >= 0; attemptIdx--) {
          if (Number(trials[attemptIdx].trialNumber) !== Number(t.trialNumber)) break;
          expectedAttemptNumber++;
        }
        const valRes = validateVisualReactionTrial(t, i, sessionId, expectedAttemptNumber);
        if (!valRes.success) {
          return { success: false, error: valRes.error };
        }

        t.foreperiodMs = valRes.foreperiodMs;
        t.foreperiodCategory = valRes.foreperiodCategory;

        const rawStimulus = t.stimulusTimestamp !== null && t.stimulusTimestamp !== undefined ? Number(t.stimulusTimestamp) : null;
        const hasStimulus = (rawStimulus !== null && Number.isFinite(rawStimulus) && rawStimulus > 0) || (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) && t.stimulusPresentedAt > 0);

        const rawResponse = t.responseTimestamp !== null && t.responseTimestamp !== undefined ? Number(t.responseTimestamp) : null;
        const hasResponse = (rawResponse !== null && Number.isFinite(rawResponse) && rawResponse > 0) || (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) && t.responseDetectedAt > 0);

        const correctedRt = typeof t.reactionTime === 'number' && Number.isFinite(t.reactionTime)
          ? Number(t.reactionTime)
          : (typeof t.reactionTimeMs === 'number' && Number.isFinite(t.reactionTimeMs) ? Number(t.reactionTimeMs) : null);

        const rawRtPhysiological = typeof t.rawReactionTime === 'number' && Number.isFinite(t.rawReactionTime)
          ? Number(t.rawReactionTime)
          : (typeof t.rawLatencyMs === 'number' && Number.isFinite(t.rawLatencyMs)
              ? Number(t.rawLatencyMs)
              : (typeof t.rawLatency === 'number' && Number.isFinite(t.rawLatency) ? Number(t.rawLatency)
                  : correctedRt));

        let isFalseStart = false;
        let isTimedOut = false;
        let isValid = false;
        let canonicalValidity: 'VALID' | 'FALSE_START_PRE_STIMULUS' | 'ANTICIPATORY_TOO_FAST' | 'TIMEOUT';
        let canonicalQualityFlag: 'ANTICIPATORY_RT' | 'TIMEOUT_EXCEEDED' | 'PREMATURE_TRIGGER' | null;

        if (!hasStimulus || (hasStimulus && hasResponse && rawStimulus !== null && rawResponse !== null && rawResponse < rawStimulus)) {
          // Pre-stimulus false start: response occurred prior to or without stimulus presentation
          isFalseStart = true;
          isTimedOut = false;
          isValid = false;
          canonicalValidity = 'FALSE_START_PRE_STIMULUS';
          canonicalQualityFlag = 'PREMATURE_TRIGGER';
        } else if (!hasResponse || rawRtPhysiological === null || rawRtPhysiological >= 3000.0 || (rawStimulus !== null && rawResponse !== null && (rawResponse - rawStimulus) >= 3000.0)) {
          // Timeout: stimulus presented, but response was missing or exceeded 3000ms
          isFalseStart = false;
          isTimedOut = true;
          isValid = false;
          canonicalValidity = 'TIMEOUT';
          canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
        } else if (rawRtPhysiological < 80.0 || (rawStimulus !== null && rawResponse !== null && (rawResponse - rawStimulus) < 80.0)) {
          // Anticipatory physiological false start (< 80ms)
          isFalseStart = true;
          isTimedOut = false;
          isValid = false;
          canonicalValidity = 'ANTICIPATORY_TOO_FAST';
          canonicalQualityFlag = 'ANTICIPATORY_RT';
        } else {
          // Physiologically valid reaction (80ms <= RT < 3000ms)
          isFalseStart = false;
          isTimedOut = false;
          isValid = true;
          canonicalValidity = 'VALID';
          canonicalQualityFlag = null;
        }

        // Canonicalize server-derived state onto trial object for persistence & digest
        t.falseStart = isFalseStart;
        t.timedOut = isTimedOut;
        t.valid = isValid;
        t.validity = canonicalValidity;
        t.qualityFlag = canonicalQualityFlag;
        t.correct = isValid;
        t.accuracy = isValid ? 1 : 0;

        if (isFalseStart) {
          falseStartsCount++;
        } else if (isValid) {
          const analyticalRt = correctedRt !== null ? correctedRt : rawRtPhysiological!;
          validRTs.push(analyticalRt);
          chronoValidTrials.push({ ...t, reactionTime: analyticalRt });
        }
      }

      if (validRTs.length !== 10) {
        return { success: false, error: `Visual reaction test requires exactly 10 physiological reaction time trials (80ms - 3000ms), received ${validRTs.length}.` };
      }

      const sortedRTs = [...validRTs].sort((a, b) => a - b);
      const sum = sortedRTs.reduce((acc, v) => acc + v, 0);
      const avg = Math.round((sum / sortedRTs.length) * 100) / 100;
      const fastest = Math.round(sortedRTs[0] * 100) / 100;
      const slowest = Math.round(sortedRTs[sortedRTs.length - 1] * 100) / 100;

      const mid = Math.floor(sortedRTs.length / 2);
      const median = sortedRTs.length % 2 !== 0
        ? Math.round(sortedRTs[mid] * 100) / 100
        : Math.round(((sortedRTs[mid - 1] + sortedRTs[mid]) / 2.0) * 100) / 100;

      const variance = sortedRTs.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / sortedRTs.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / avg) * 100;
      const consistency = Math.max(0, Math.min(100, Math.round((100 - cv) * 100) / 100));

      // Scientific Temporal Dynamics calculations
      // 1. Foreperiod sensitivity (Pearson correlation r between foreperiod and RT)
      let foreperiodSensitivity: number | null = null;
      if (chronoValidTrials.length >= 3) {
        const xs = chronoValidTrials.map(t => Number(t.foreperiodMs ?? t.foreperiod ?? 0));
        const ys = chronoValidTrials.map(t => Number(t.reactionTime));
        const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
        const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
        let num = 0;
        let denX = 0;
        let denY = 0;
        for (let k = 0; k < xs.length; k++) {
          const dx = xs[k] - meanX;
          const dy = ys[k] - meanY;
          num += dx * dy;
          denX += dx * dx;
          denY += dy * dy;
        }
        const den = Math.sqrt(denX * denY);
        if (den > 0) {
          foreperiodSensitivity = Number((num / den).toFixed(4));
        }
      }

      // 2. Short and long foreperiod observation windows
      const shortWindowTrials = chronoValidTrials.filter(t => {
        const fp = Number(t.foreperiodMs ?? t.foreperiod ?? 0);
        return fp >= 100 && fp <= 500;
      });

      const longWindowTrials = chronoValidTrials.filter(t => {
        const fp = Number(t.foreperiodMs ?? t.foreperiod ?? 0);
        return fp >= 501 && fp <= 3000;
      });

      const shortWindow = {
        windowRangeMs: [100, 500],
        sampleAvailable: shortWindowTrials.length > 0,
        count: shortWindowTrials.length,
        meanRt: shortWindowTrials.length > 0
          ? Number((shortWindowTrials.reduce((a, b) => a + Number(b.reactionTime), 0) / shortWindowTrials.length).toFixed(2))
          : null,
        status: shortWindowTrials.length > 0 ? 'available' : 'insufficient_data'
      };

      const longWindow = {
        windowRangeMs: [501, 3000],
        sampleAvailable: longWindowTrials.length > 0,
        count: longWindowTrials.length,
        meanRt: longWindowTrials.length > 0
          ? Number((longWindowTrials.reduce((a, b) => a + Number(b.reactionTime), 0) / longWindowTrials.length).toFixed(2))
          : null,
        status: longWindowTrials.length > 0 ? 'available' : 'insufficient_data'
      };

      // 3. Foreperiod transition cost (delta RT following >= 1500ms foreperiod shift)
      let foreperiodTransitionCost: number | null = null;
      const transitionDeltas: number[] = [];
      for (let k = 1; k < chronoValidTrials.length; k++) {
        const prevFp = Number(chronoValidTrials[k - 1].foreperiodMs ?? chronoValidTrials[k - 1].foreperiod ?? 0);
        const currFp = Number(chronoValidTrials[k].foreperiodMs ?? chronoValidTrials[k].foreperiod ?? 0);
        if (Math.abs(currFp - prevFp) >= 1500) {
          const prevRt = Number(chronoValidTrials[k - 1].reactionTime);
          const currRt = Number(chronoValidTrials[k].reactionTime);
          transitionDeltas.push(currRt - prevRt);
        }
      }
      if (transitionDeltas.length >= 2) {
        foreperiodTransitionCost = Number((transitionDeltas.reduce((a, b) => a + b, 0) / transitionDeltas.length).toFixed(2));
      }

      // 4. Adaptation slope (linear regression slope of RT across chronological valid trial sequence)
      let adaptationSlope: number | null = null;
      if (chronoValidTrials.length >= 2) {
        const N = chronoValidTrials.length;
        const meanT = (N + 1) / 2;
        const ys = chronoValidTrials.map(t => Number(t.reactionTime));
        const meanY = ys.reduce((a, b) => a + b, 0) / N;
        let num = 0;
        let den = 0;
        for (let k = 0; k < N; k++) {
          const tIdx = k + 1;
          const dt = tIdx - meanT;
          const dy = ys[k] - meanY;
          num += dt * dy;
          den += dt * dt;
        }
        if (den > 0) {
          adaptationSlope = Number((num / den).toFixed(2));
        }
      }

      // 5. Habituation index (ratio of mean RT of last 5 valid trials / mean RT of first 5 valid trials)
      let habituationIndex: number | null = null;
      if (chronoValidTrials.length === 10) {
        const first5 = chronoValidTrials.slice(0, 5).map(t => Number(t.reactionTime));
        const last5 = chronoValidTrials.slice(5, 10).map(t => Number(t.reactionTime));
        const meanFirst5 = first5.reduce((a, b) => a + b, 0) / 5;
        const meanLast5 = last5.reduce((a, b) => a + b, 0) / 5;
        if (meanFirst5 > 0) {
          habituationIndex = Number((meanLast5 / meanFirst5).toFixed(3));
        }
      }

      // 6. Temporal stability (1 - CV clamped to [0, 1])
      const temporalStability = Math.max(0, Math.min(1, Number((1 - (stdDev / avg)).toFixed(2))));

      const temporalDynamics = {
        foreperiodSensitivity,
        shortWindow,
        longWindow,
        foreperiodTransitionCost,
        temporalSurpriseCost: null,
        adaptationSlope,
        habituationIndex,
        temporalStability,
        analysisVersion: 'temporal-v1'
      };

      return {
        success: true,
        derivedMetrics: {
          averageReactionTime: avg,
          fastestReactionTime: fastest,
          slowestReactionTime: slowest,
          medianReactionTime: median,
          consistency,
          totalFalseStarts: falseStartsCount,
          temporalDynamics
        }
      };
    }
    case 'direction': {
      let totalCorrect = 0;
      const completedLogicalPositions = new Set<number>();
      const validRTs: number[] = [];

      for (let i = 0; i < trials.length; i++) {
        const t = trials[i];

        if (typeof t.trialNumber !== 'number' || !Number.isInteger(t.trialNumber) || t.trialNumber < 1 || t.trialNumber > 10) {
          return { success: false, error: `Trial ${i + 1} has invalid or missing trialNumber.` };
        }
        const logicalIdx = t.trialNumber - 1;

        const prng = seedPRNG(sessionId + "-direction-" + logicalIdx);
        const windowDelay = prng() * (3000 - 1000) + 1000;
        const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const expectedDir = DIRECTIONS[Math.floor(prng() * DIRECTIONS.length)];

        const valRes = validateDirectionTrial(t, i, expectedDir);
        if (!valRes.success) {
          return { success: false, error: valRes.error };
        }

        let rawRtPhysiological: number | null = null;
        if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
          rawRtPhysiological = Number(t.rawReactionTime);
        } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
          rawRtPhysiological = Number(t.rawLatencyMs);
        } else if (t.rawLatency !== null && t.rawLatency !== undefined && !Number.isNaN(Number(t.rawLatency))) {
          rawRtPhysiological = Number(t.rawLatency);
        } else if (t.reactionTime !== null && t.reactionTime !== undefined && !Number.isNaN(Number(t.reactionTime))) {
          rawRtPhysiological = Number(t.reactionTime);
        } else if (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined && !Number.isNaN(Number(t.reactionTimeMs))) {
          rawRtPhysiological = Number(t.reactionTimeMs);
        }

        const correctedRt = t.reactionTime !== null && t.reactionTime !== undefined
          ? Number(t.reactionTime)
          : (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined ? Number(t.reactionTimeMs) : null);

        let canonicalValidity = 'VALID';
        let canonicalQualityFlag = null;
        if (valRes.derivedFalseStart) {
          canonicalValidity = 'FALSE_START_PRE_STIMULUS';
          canonicalQualityFlag = 'PREMATURE_TRIGGER';
        } else if (valRes.derivedTimedOut) {
          canonicalValidity = 'TIMEOUT';
          canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
        } else if (rawRtPhysiological !== null && rawRtPhysiological < 80.0) {
          canonicalValidity = 'ANTICIPATORY_TOO_FAST';
          canonicalQualityFlag = 'ANTICIPATORY_RT';
        }

        t.falseStart = !!valRes.derivedFalseStart || (rawRtPhysiological !== null && rawRtPhysiological < 80.0);
        t.timedOut = !!valRes.derivedTimedOut;
        t.valid = !valRes.derivedFalseStart && !valRes.derivedTimedOut && rawRtPhysiological !== null && rawRtPhysiological >= 80.0 && rawRtPhysiological < 3000.0;
        t.validity = canonicalValidity;
        t.qualityFlag = canonicalQualityFlag;

        if (!valRes.derivedFalseStart) {
          completedLogicalPositions.add(logicalIdx);
        }

        if (valRes.isCorrect && (correctedRt !== null || rawRtPhysiological !== null)) {
          totalCorrect++;
          validRTs.push(correctedRt !== null ? correctedRt : rawRtPhysiological!);
        }
      }

      if (completedLogicalPositions.size !== 10) {
        return { success: false, error: `Direction test requires exactly 10 completed logical trials (received ${completedLogicalPositions.size}).` };
      }

      const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
      if (validTrialsCount === 0) {
        return { success: false, error: 'No valid trials found for Direction test.' };
      }
      const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;

      validRTs.sort((a, b) => a - b);
      const sum = validRTs.reduce((acc, v) => acc + v, 0);
      const avg = validRTs.length > 0 ? Math.round((sum / validRTs.length) * 100) / 100 : null;
      const fastest = validRTs.length > 0 ? Math.round(validRTs[0] * 100) / 100 : null;
      const slowest = validRTs.length > 0 ? Math.round(validRTs[validRTs.length - 1] * 100) / 100 : null;

      const mid = Math.floor(validRTs.length / 2);
      const median = validRTs.length > 0
        ? (validRTs.length % 2 !== 0
          ? Math.round(validRTs[mid] * 100) / 100
          : Math.round(((validRTs[mid - 1] + validRTs[mid]) / 2.0) * 100) / 100)
        : null;

      const falseStartsCount = trials.filter(t => t.falseStart).length;
      const derivedMetrics: Record<string, any> = {
        accuracy,
        totalCorrect,
        totalTrials: 10,
        totalIncorrect: Math.max(0, 10 - totalCorrect),
        totalFalseStarts: falseStartsCount
      };
      if (avg !== null) derivedMetrics.averageReactionTime = avg;
      if (fastest !== null) derivedMetrics.fastestReactionTime = fastest;
      if (slowest !== null) derivedMetrics.slowestReactionTime = slowest;
      if (median !== null) derivedMetrics.medianReactionTime = median;

      return {
        success: true,
        derivedMetrics
      };
    }
    case 'color-recognition': {
      if (trials.length !== 15) {
        return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
      }

      // Reconstruct congruent/incongruent plans sequence
      const prngPlans = seedPRNG(sessionId + "-color-plans");
      const is8Congruent = prngPlans() < 0.5;
      const congruentCount = is8Congruent ? 8 : 7;
      const incongruentCount = 15 - congruentCount;
      const plans: { condition: 'congruent' | 'incongruent', instruction: 'WORD' | 'COLOR' }[] = [];
      for (let j = 0; j < congruentCount; j++) {
        plans.push({ condition: 'congruent', instruction: j % 2 === 0 ? 'WORD' : 'COLOR' });
      }
      for (let j = 0; j < incongruentCount; j++) {
        plans.push({ condition: 'incongruent', instruction: j % 2 === 0 ? 'WORD' : 'COLOR' });
      }
      for (let j = plans.length - 1; j > 0; j--) {
        const r = Math.floor(prngPlans() * (j + 1));
        const tmp = plans[j];
        plans[j] = plans[r];
        plans[r] = tmp;
      }

      let correctCount = 0;
      const validRTs: number[] = [];
      const congruentTrials: any[] = [];
      const incongruentTrials: any[] = [];

      for (let i = 0; i < trials.length; i++) {
        const t = trials[i];
        const plan = plans[i];

        // Seeded PRNG for the individual trial
        const prngTrial = seedPRNG(sessionId + "-color-trial-" + i);
        const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];
        const wordIdx = Math.floor(prngTrial() * COLORS.length);
        let colorIdx = wordIdx;
        if (plan.condition === 'incongruent') {
          const offset = Math.floor(prngTrial() * (COLORS.length - 1)) + 1;
          colorIdx = (wordIdx + offset) % COLORS.length;
        }
        const expectedWord = COLORS[wordIdx];
        const expectedColor = COLORS[colorIdx];
        const expectedCondition = plan.condition;
        const expectedInstruction = plan.instruction;

        const valRes = validateColorRecognitionTrial(t, i, expectedWord, expectedColor, expectedCondition, expectedInstruction);
        if (!valRes.success) {
          return { success: false, error: valRes.error };
        }

        const correctedRt = t.reactionTime !== null && t.reactionTime !== undefined
          ? Number(t.reactionTime)
          : (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined ? Number(t.reactionTimeMs) : null);
        const rawRt = t.rawReactionTime !== null && t.rawReactionTime !== undefined
          ? Number(t.rawReactionTime)
          : (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined ? Number(t.rawLatencyMs) : correctedRt);

        let canonicalValidity = 'VALID';
        let canonicalQualityFlag = null;
        if (valRes.derivedFalseStart) {
          canonicalValidity = 'FALSE_START_PRE_STIMULUS';
          canonicalQualityFlag = 'PREMATURE_TRIGGER';
        } else if (valRes.derivedTimedOut) {
          canonicalValidity = 'TIMEOUT';
          canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
        } else if (rawRt !== null && rawRt < 80.0) {
          canonicalValidity = 'ANTICIPATORY_TOO_FAST';
          canonicalQualityFlag = 'ANTICIPATORY_RT';
        }

        t.falseStart = !!valRes.derivedFalseStart || (rawRt !== null && rawRt < 80.0);
        t.timedOut = !!valRes.derivedTimedOut;
        t.valid = !valRes.derivedFalseStart && !valRes.derivedTimedOut && rawRt !== null && rawRt >= 80.0 && rawRt < 3000.0;
        t.validity = canonicalValidity;
        t.qualityFlag = canonicalQualityFlag;
        t.correct = valRes.isCorrect;
        t.accuracy = valRes.isResponded ? (valRes.isCorrect ? 1 : 0) : 0;

        if (valRes.isCorrect) {
          correctCount++;
        }
        if (t.valid && correctedRt !== null) {
          validRTs.push(correctedRt);
          if (plan.condition === 'congruent') congruentTrials.push(correctedRt);
          else incongruentTrials.push(correctedRt);
        }
      }

      const validTrialsCount = trials.filter(t => t.valid).length;
      const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;
      validRTs.sort((a, b) => a - b);
      const avg = validRTs.length > 0 ? Math.round((validRTs.reduce((a, b) => a + b, 0) / validRTs.length) * 100) / 100 : null;
      const fastest = validRTs.length > 0 ? Math.round(validRTs[0] * 100) / 100 : null;
      const slowest = validRTs.length > 0 ? Math.round(validRTs[validRTs.length - 1] * 100) / 100 : null;
      const mid = Math.floor(validRTs.length / 2);
      const median = validRTs.length > 0
        ? (validRTs.length % 2 !== 0
          ? Math.round(validRTs[mid] * 100) / 100
          : Math.round(((validRTs[mid - 1] + validRTs[mid]) / 2.0) * 100) / 100)
        : null;
      const congruentAvg = congruentTrials.length > 0 ? Number((congruentTrials.reduce((a, b) => a + b, 0) / congruentTrials.length).toFixed(2)) : null;
      const incongruentAvg = incongruentTrials.length > 0 ? Number((incongruentTrials.reduce((a, b) => a + b, 0) / incongruentTrials.length).toFixed(2)) : null;
      const interferenceCost = congruentAvg !== null && incongruentAvg !== null ? Number((incongruentAvg - congruentAvg).toFixed(2)) : null;

      const derivedMetrics: Record<string, any> = {
        accuracy,
        correctCount,
        totalTrials: 15,
        totalIncorrect: Math.max(0, validTrialsCount - correctCount),
        totalFalseStarts: trials.filter(t => t.falseStart).length,
        congruentAvg,
        incongruentAvg,
        interferenceCost
      };
      if (avg !== null) derivedMetrics.averageReactionTime = avg;
      if (fastest !== null) derivedMetrics.fastestReactionTime = fastest;
      if (slowest !== null) derivedMetrics.slowestReactionTime = slowest;
      if (median !== null) derivedMetrics.medianReactionTime = median;

      return { success: true, derivedMetrics };
    }
    case 'block-memory': {
      let failuresCount = 0;
      let expectedLevel = 1;
      let totalCorrect = 0;
      const correctLevels: number[] = [];
      const levelAttempts: Record<number, number> = {};

      for (let idx = 0; idx < trials.length; idx++) {
        const t = trials[idx];
        const level = Number(t.level);
        const seqLen = level + 1;

        if (!levelAttempts[level]) levelAttempts[level] = 0;
        const attemptIdx = levelAttempts[level]++;

        const prng = seedPRNG(sessionId + "-block-" + level + "-" + attemptIdx);
        const expectedSeq: number[] = [];
        for (let k = 0; k < seqLen; k++) {
          let next: number;
          do {
            next = Math.floor(prng() * 9);
          } while (expectedSeq.includes(next));
          expectedSeq.push(next);
        }

        const valRes = validateBlockMemoryTrial(t, idx, expectedLevel, seqLen, expectedSeq);
        if (!valRes.success) {
          return { success: false, error: valRes.error };
        }

        const isCorrect = valRes.isCorrect;
        t.generatedSequence = expectedSeq;
        t.sequenceLength = seqLen;
        t.accuracy = isCorrect ? 1 : 0;
        t.correct = isCorrect;
        t.correctness = isCorrect;
        t.valid = isCorrect;
        t.validity = isCorrect ? 'VALID' : 'INCORRECT';
        t.qualityFlag = isCorrect ? null : 'ACCURACY_ERROR';

        if (isCorrect) {
          totalCorrect++;
          correctLevels.push(level);
          expectedLevel = level + 1;
        } else {
          failuresCount++;
          if (failuresCount > 3) {
            return { success: false, error: `Trial sequence exceeds maximum allowed failures (3 lives limit).` };
          }
          if (failuresCount === 3 && idx !== trials.length - 1) {
            return { success: false, error: `Assessment must terminate immediately upon 3rd failure.` };
          }
        }
      }

      const highestLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
      const longestSeq = highestLevel > 0 ? highestLevel + 1 : 0;
      const totalAttempts = trials.length;
      const overallAccuracy = Math.round(((totalCorrect * 100.0) / totalAttempts) * 100) / 100;
      const firstTrial = trials[0];
      const lastTrial = trials[trials.length - 1];

      const assessmentStart = typeof firstTrial.assessmentStartedAt === 'number' && Number.isFinite(firstTrial.assessmentStartedAt)
        ? firstTrial.assessmentStartedAt
        : (typeof firstTrial.previousTrialEndedAt === 'number' && Number.isFinite(firstTrial.previousTrialEndedAt)
          ? firstTrial.previousTrialEndedAt
          : (typeof session?.createdAt === 'number' ? session.createdAt : Number(firstTrial.stimulusTimestamp)));
      const lastResponse = Number(lastTrial.responseTimestamp) || Date.now();
      const totalTimeMs = Math.max(100, Math.min(3600000, lastResponse - assessmentStart));

      return {
        success: true,
        derivedMetrics: {
          highestLevel,
          longestSeq,
          totalCorrect,
          totalAttempts,
          overallAccuracy,
          totalTimeMs
        }
      };
    }
    case 'number-memory': {
      if (trials.length < 1 || trials.length > 103) {
        return { success: false, error: `Number memory trial count (${trials.length}) is outside valid range (1-103).` };
      }

      let failuresCount = 0;
      let expectedLevel = 1;
      let totalCorrect = 0;
      const correctLevels: number[] = [];
      const levelAttempts: Record<number, number> = {};

      for (let idx = 0; idx < trials.length; idx++) {
        const t = trials[idx];
        const level = Number(t.level);
        const seqLen = level + 2;

        if (!levelAttempts[level]) levelAttempts[level] = 0;
        const attemptIdx = levelAttempts[level]++;

        const prng = seedPRNG(sessionId + "-number-" + level + "-" + attemptIdx);
        let expectedSeq = '';
        for (let k = 0; k < seqLen; k++) {
          expectedSeq += Math.floor(prng() * 10).toString();
        }

        const valRes = validateNumberMemoryTrial(t, idx, expectedLevel, seqLen, expectedSeq);
        if (!valRes.success) {
          return { success: false, error: valRes.error };
        }

        const isCorrect = valRes.isCorrect;
        t.generatedSequence = expectedSeq;
        t.sequenceLength = seqLen;
        t.accuracy = isCorrect ? 1 : 0;
        t.correct = isCorrect;
        t.correctness = isCorrect;
        t.valid = isCorrect;
        t.validity = isCorrect ? 'VALID' : 'INCORRECT';
        t.qualityFlag = isCorrect ? null : 'ACCURACY_ERROR';

        if (isCorrect) {
          totalCorrect++;
          correctLevels.push(level);
          expectedLevel = level + 1;
        } else {
          failuresCount++;
          if (failuresCount > 3) {
            return { success: false, error: `Trial sequence exceeds maximum allowed failures (3 lives limit).` };
          }
          if (failuresCount === 3 && idx !== trials.length - 1) {
            return { success: false, error: `Assessment must terminate immediately upon 3rd failure.` };
          }
        }
      }

      const highestLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
      const longestSeq = highestLevel > 0 ? highestLevel + 2 : 0;
      const totalAttempts = trials.length;
      const overallAccuracy = Math.round(((totalCorrect * 100.0) / totalAttempts) * 100) / 100;
      const firstTrial = trials[0];
      const lastTrial = trials[trials.length - 1];

      const assessmentStart = typeof firstTrial.assessmentStartedAt === 'number' && Number.isFinite(firstTrial.assessmentStartedAt)
        ? firstTrial.assessmentStartedAt
        : (typeof firstTrial.previousTrialEndedAt === 'number' && Number.isFinite(firstTrial.previousTrialEndedAt)
          ? firstTrial.previousTrialEndedAt
          : (typeof session?.createdAt === 'number' ? session.createdAt : Number(firstTrial.stimulusTimestamp)));
      const lastResponse = Number(lastTrial.responseTimestamp) || Date.now();
      const totalTimeMs = Math.max(100, Math.min(3600000, lastResponse - assessmentStart));

      return {
        success: true,
        derivedMetrics: {
          highestLevel,
          longestSeq,
          totalCorrect,
          totalAttempts,
          overallAccuracy,
          totalTimeMs
        }
      };
    }
    default:
      return { success: false, error: `Unsupported assessment type: ${assessmentType}` };
  }
}

// ... existing server implementation continues unchanged ...
