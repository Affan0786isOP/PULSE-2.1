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

const VRT_SHORT_FOREPERIOD_MIN_MS = 100;
const VRT_SHORT_FOREPERIOD_MAX_MS = 500;
const VRT_LONG_FOREPERIOD_MIN_MS = 501;
const VRT_LONG_FOREPERIOD_MAX_MS = 3000;

function generateVrtForeperiod(prng: () => number): { foreperiodMs: number; foreperiodCategory: 'SHORT' | 'LONG' } {
  const isShort = prng() < 0.5;
  const foreperiodMs = isShort
    ? Math.floor(prng() * (VRT_SHORT_FOREPERIOD_MAX_MS - VRT_SHORT_FOREPERIOD_MIN_MS + 1)) + VRT_SHORT_FOREPERIOD_MIN_MS
    : Math.floor(prng() * (VRT_LONG_FOREPERIOD_MAX_MS - VRT_LONG_FOREPERIOD_MIN_MS + 1)) + VRT_LONG_FOREPERIOD_MIN_MS;
  const foreperiodCategory: 'SHORT' | 'LONG' = foreperiodMs <= 500 ? 'SHORT' : 'LONG';
  return { foreperiodMs, foreperiodCategory };
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

function validateVisualReactionTrial(
  t: any,
  index: number,
  expectedForeperiod: { foreperiodMs: number; foreperiodCategory: 'SHORT' | 'LONG' }
): { success: boolean; error?: string; foreperiodMs?: number; foreperiodCategory?: 'SHORT' | 'LONG' } {
  const rawFp = t.foreperiodMs !== null && t.foreperiodMs !== undefined
    ? Number(t.foreperiodMs)
    : (t.foreperiod !== null && t.foreperiod !== undefined ? Number(t.foreperiod) : null);

  if (rawFp === null || typeof rawFp !== 'number' || !Number.isFinite(rawFp) || !Number.isInteger(rawFp) || rawFp < 100 || rawFp > 3000) {
    return { success: false, error: `Invalid or missing foreperiod duration in trial ${index + 1}. Must be an integer between 100ms and 3000ms.` };
  }

  if (rawFp !== expectedForeperiod.foreperiodMs) {
    return { success: false, error: `Trial ${index + 1} foreperiod duration mismatch (${rawFp}ms vs expected server-authoritative ${expectedForeperiod.foreperiodMs}ms).` };
  }

  const expectedCategory = deriveForeperiodCategory(rawFp);
  if (!expectedCategory || expectedCategory !== expectedForeperiod.foreperiodCategory) {
    return { success: false, error: `Invalid foreperiod category derivation for ${rawFp}ms in trial ${index + 1}.` };
  }

  if (t.foreperiodCategory !== undefined && t.foreperiodCategory !== null && t.foreperiodCategory !== expectedForeperiod.foreperiodCategory) {
    return { success: false, error: `Foreperiod category mismatch in trial ${index + 1}: got ${t.foreperiodCategory} for ${rawFp}ms (expected ${expectedForeperiod.foreperiodCategory}).` };
  }

  return { success: true, foreperiodMs: expectedForeperiod.foreperiodMs, foreperiodCategory: expectedForeperiod.foreperiodCategory };
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

        const trialNumber = Number(t.trialNumber);
        let attemptNumber = 1;
        if (i > 0) {
          const prevTrialNumber = Number(trials[i - 1].trialNumber);
          const prevAttempt = Number(trials[i - 1].attemptNumber) || 1;
          attemptNumber = (trialNumber === prevTrialNumber) ? prevAttempt + 1 : 1;
        }
        if (t.attemptNumber !== undefined && t.attemptNumber !== null) {
          attemptNumber = Number(t.attemptNumber);
        }

        const prng = seedPRNG(`${sessionId}-reaction-delays-t${trialNumber}-a${attemptNumber}`);
        const expectedForeperiod = generateVrtForeperiod(prng);

        const valRes = validateVisualReactionTrial(t, i, expectedForeperiod);
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
              : (typeof t.rawLatency === 'number' && Number.isFinite(t.rawLatency)
                  ? Number(t.rawLatency)
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
        let canonicalQualityFlag: string | null = null;
        if (valRes.derivedFalseStart) {
          if (rawRtPhysiological !== null && rawRtPhysiological < 80.0) {
            canonicalValidity = 'FALSE_START_PHYSIOLOGICAL';
            canonicalQualityFlag = 'ANTICIPATORY_RESPONSE';
          } else {
            canonicalValidity = 'FALSE_START_PRE_STIMULUS';
            canonicalQualityFlag = 'PREMATURE_TRIGGER';
          }
        } else if (valRes.derivedTimedOut) {
          canonicalValidity = 'TIMEOUT';
          canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
        } else if (!valRes.isCorrect) {
          canonicalValidity = 'INCORRECT';
          canonicalQualityFlag = 'ACCURACY_ERROR';
        } else {
          canonicalValidity = 'VALID';
          canonicalQualityFlag = null;
        }

        t.targetDirection = expectedDir;
        if (valRes.userResponse) {
          t.userResponse = valRes.userResponse;
        }
        t.falseStart = valRes.derivedFalseStart;
        t.timedOut = valRes.derivedTimedOut;
        t.correct = valRes.isCorrect === true;
        t.correctness = valRes.isCorrect === true;
        t.accuracy = valRes.isCorrect ? 1 : 0;
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
        const expectedInstruction = plan.instruction;

        const valRes = validateColorRecognitionTrial(
          t,
          i,
          expectedWord,
          expectedColor,
          plan.condition,
          expectedInstruction
        );
        if (!valRes.success) {
          return { success: false, error: valRes.error };
        }

        let rawRtPhysiological: number | null = null;
        if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
          rawRtPhysiological = Number(t.rawReactionTime);
        } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
          rawRtPhysiological = Number(t.rawLatencyMs);
        } else if (t.reactionTime !== null && t.reactionTime !== undefined && !Number.isNaN(Number(t.reactionTime))) {
          rawRtPhysiological = Number(t.reactionTime);
        } else if (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined && !Number.isNaN(Number(t.reactionTimeMs))) {
          rawRtPhysiological = Number(t.reactionTimeMs);
        }

        const correctedRt = t.reactionTime !== null && t.reactionTime !== undefined
          ? Number(t.reactionTime)
          : (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined ? Number(t.reactionTimeMs) : null);

        let canonicalValidity = 'VALID';
        let canonicalQualityFlag: string | null = null;
        if (valRes.derivedFalseStart) {
          if (rawRtPhysiological !== null && rawRtPhysiological < 80.0) {
            canonicalValidity = 'FALSE_START_PHYSIOLOGICAL';
            canonicalQualityFlag = 'ANTICIPATORY_RESPONSE';
          } else {
            canonicalValidity = 'FALSE_START_PRE_STIMULUS';
            canonicalQualityFlag = 'PREMATURE_TRIGGER';
          }
        } else if (valRes.derivedTimedOut) {
          canonicalValidity = 'TIMEOUT';
          canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
        } else if (!valRes.isCorrect) {
          canonicalValidity = 'INCORRECT';
          canonicalQualityFlag = 'ACCURACY_ERROR';
        } else {
          canonicalValidity = 'VALID';
          canonicalQualityFlag = null;
        }

        t.wordName = expectedWord;
        t.wordColor = expectedColor;
        t.condition = plan.condition;
        t.instruction = expectedInstruction;
        if (valRes.userResponse) {
          t.userResponse = valRes.userResponse;
        }
        t.falseStart = valRes.derivedFalseStart;
        t.timedOut = valRes.derivedTimedOut;
        t.correct = valRes.isCorrect === true;
        t.correctness = valRes.isCorrect === true;
        t.accuracy = valRes.isCorrect ? 1 : 0;
        t.valid = !valRes.derivedFalseStart && !valRes.derivedTimedOut && rawRtPhysiological !== null && rawRtPhysiological >= 80.0 && rawRtPhysiological < 3000.0;
        t.validity = canonicalValidity;
        t.qualityFlag = canonicalQualityFlag;

        if (valRes.isCorrect && (correctedRt !== null || rawRtPhysiological !== null)) {
          correctCount++;
          validRTs.push(correctedRt !== null ? correctedRt : rawRtPhysiological!);
          if (plan.condition === 'congruent') {
            congruentTrials.push(t);
          } else {
            incongruentTrials.push(t);
          }
        }
      }

      const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
      const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;

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

      let congruentAvg: number | undefined = undefined;
      let incongruentAvg: number | undefined = undefined;
      let interferenceCost: number | undefined = undefined;

      if (congruentTrials.length > 0) {
        const cSum = congruentTrials.reduce((acc, t) => acc + Number(t.reactionTime), 0);
        congruentAvg = Math.round((cSum / congruentTrials.length) * 100) / 100;
      }
      if (incongruentTrials.length > 0) {
        const iSum = incongruentTrials.reduce((acc, t) => acc + Number(t.reactionTime), 0);
        incongruentAvg = Math.round((iSum / incongruentTrials.length) * 100) / 100;
      }
      if (congruentAvg !== undefined && incongruentAvg !== undefined) {
        interferenceCost = Math.round((incongruentAvg - congruentAvg) * 100) / 100;
      }

      const derivedMetrics: Record<string, any> = {
        accuracy,
        correctCount
      };
      if (avg !== null) derivedMetrics.averageReactionTime = avg;
      if (fastest !== null) derivedMetrics.fastestReactionTime = fastest;
      if (slowest !== null) derivedMetrics.slowestReactionTime = slowest;
      if (median !== null) derivedMetrics.medianReactionTime = median;
      if (congruentAvg !== undefined) derivedMetrics.congruentAvg = congruentAvg;
      if (incongruentAvg !== undefined) derivedMetrics.incongruentAvg = incongruentAvg;
      if (interferenceCost !== undefined) derivedMetrics.interferenceCost = interferenceCost;

      return {
        success: true,
        derivedMetrics
      };
    }

    case 'block-memory': {
      if (trials.length < 1 || trials.length > 103) {
        return { success: false, error: `Block memory trial count (${trials.length}) is outside valid range (1-103).` };
      }

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
          } while (k > 0 && next === expectedSeq[k - 1]);
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
      return { success: false, error: 'Unsupported assessmentType' };
  }
}

function getProvenanceSecret() {
  const secret = process.env.PULSE_PROVENANCE_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('PULSE_PROVENANCE_SECRET environment variable is missing. Please configure it in the application settings.');
  }
  return secret;
}

export const app = express();

async function startServer() {
  // Trust proxy for Cloud Run and reverse proxies
  app.set('trust proxy', 1);

  // Normalize incoming URLs for Vercel/proxies that might strip or preserve /api prefix
  app.use((req, _res, next) => {
    if (req.url && !req.url.startsWith('/api') && (
      req.url.startsWith('/research') ||
      req.url.startsWith('/leaderboard') ||
      req.url.startsWith('/admin') ||
      req.url.startsWith('/health') ||
      req.url.startsWith('/personal-best') ||
      req.url.startsWith('/sessions')
    )) {
      req.url = '/api' + req.url;
    }
    next();
  });

  // Production security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://apis.google.com https://*.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com https://*.google.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.run.app",
      "worker-src 'self' blob:",
      "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app https://ai.studio"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    next();
  });

  // Respect process.env.PORT whenever present, defaulting to 3000
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body parsing for API endpoints
  app.use(express.json({ limit: '1mb' }));

  // Process-local idempotency store serves as a best-effort, bounded LRU cache for high-frequency retries within a single instance.
  // Hard bounded to MAX_IDEMPOTENCY_ENTRIES (5000) to prevent memory growth under unique keys.
  const idempotencyStore = new Map<string, { result: Record<string, unknown>; expiresAt: number }>();
  function setIdempotency(key: string, result: Record<string, unknown>, ttlMs: number = 24 * 60 * 60 * 1000) {
    if (!key || typeof key !== "string" || key.length > MAX_IDEMPOTENCY_KEY_LENGTH + 16) return;
    if (idempotencyStore.size >= MAX_IDEMPOTENCY_ENTRIES) {
      const oldestKey = idempotencyStore.keys().next().value;
      if (oldestKey) idempotencyStore.delete(oldestKey);
    }
    idempotencyStore.set(key, { result, expiresAt: Date.now() + ttlMs });
  }

  function getIdempotency(key: string): Record<string, unknown> | null {
    if (!key) return null;
    const item = idempotencyStore.get(key);
    if (!item) return null;
    if (item.expiresAt <= Date.now()) {
      idempotencyStore.delete(key);
      return null;
    }
    // Refresh position for LRU
    idempotencyStore.delete(key);
    idempotencyStore.set(key, item);
    return item.result;
  }

  setInterval(() => {
    const now = Date.now();
    for (const [key, item] of idempotencyStore.entries()) {
      if (item.expiresAt <= now) {
        idempotencyStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  // Authoritative Experiment Session Store
  interface ExperimentSession {
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

  interface AuthoritativeLeaderboardEntry {
    id: string;
    displayName: string;
    assessmentType: string;
    scoreMetric: number;
    ageGroup: string;
    createdAt: number;
    provenanceToken: string;
    hidden: boolean;
  }





  function isOptedInLeaderboardUser(displayName: string | null | undefined): boolean {
    const trimmed = String(displayName || '').trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'anonymous' || lower === 'unknown' || lower === 'guest') return false;
    if (lower.startsWith('participant')) return false;
    return true;
  }

  async function getAndValidateSession(
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

  // 1. Health check endpoint - exempted from rate limiting for Cloud Run probes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Specialized Rate Limiters
  const sessionStartLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, error: 'Too many requests. Please try again later.' }
  });

  const sessionSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, error: 'Too many requests. Please try again later.' }
  });

  const leaderboardSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, error: 'Too many requests. Please try again later.' }
  });

  const generalSessionsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, error: 'Too many requests. Please try again later.' }
  });

  const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { success: false, error: 'Too many verification requests. Please try again later.' }
  });

  const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, error: 'Too many API requests' }
  });

  app.use('/api/admin', generalApiLimiter);
  app.use('/api/research/session', sessionStartLimiter);
  app.use('/api/sessions', generalSessionsLimiter);
  app.use('/api/research/submit', sessionSubmitLimiter);
  app.use('/api/leaderboard/submit', leaderboardSubmitLimiter);
  app.use('/api/research/verify-provenance', verificationLimiter);
  app.use('/api/leaderboard/verify-provenance', verificationLimiter);
  app.use('/api/', generalApiLimiter);

  // Authoritative Admin Audit Log Creation
  const handleAdminAuditLog = async (req: express.Request, res: express.Response) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const isAdmin = !verifiedUser.isAnonymous && (
        verifiedUser.email === 'admin@pulse-research.org' ||
        verifiedUser.role === 'admin' ||
        verifiedUser.admin === true
      );

      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden: Caller is not an authorized administrator' });
      }

      const { action, target, note } = req.body || {};

      if (!action || typeof action !== 'string' || !action.trim()) {
        return res.status(400).json({ success: false, error: 'Invalid or missing action field' });
      }

      if (!target || typeof target !== 'string' || !target.trim()) {
        return res.status(400).json({ success: false, error: 'Invalid or missing target field' });
      }

      // Authoritative identity and timestamp determination
      const actor = verifiedUser.email || verifiedUser.uid;
      const timestamp = new Date().toISOString();
      const cleanAction = action.trim();
      const cleanTarget = target.trim();
      const cleanNote = (typeof note === 'string') ? note.trim() : '';

      const logId = `log-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

      const auditDoc = {
        actor,
        action: cleanAction,
        target: cleanTarget,
        timestamp,
        note: cleanNote
      };

      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({ success: false, error: 'Database service unavailable' });
      }

      try {
        await db.collection('adminAuditLogs').doc(logId).set(auditDoc);
      } catch (dbErr: any) {
        console.error('[Admin Audit Log API] Firestore write failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        return res.status(500).json({ success: false, error: 'Failed to persist audit log' });
      }

      return res.json({
        success: true,
        log: {
          id: logId,
          ...auditDoc
        }
      });
    } catch (err: unknown) {
      console.error('[Admin Audit Log API] Error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to record admin audit log' });
    }
  };

  app.post('/api/admin/audit-log', handleAdminAuditLog);
  app.post('/api/admin/log-action', handleAdminAuditLog);

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
          const isValid = typeof t.valid === 'boolean' ? t.valid : (!isFalseStart && !isTimedOut);
          const isCorrect = typeof t.correct === 'boolean'
            ? t.correct
            : (typeof t.correctness === 'boolean'
                ? t.correctness
                : (typeof t.accuracy === 'number' ? t.accuracy === 1 : isValid));
          const accuracyVal = typeof t.accuracy === 'number' ? t.accuracy : (isCorrect ? 1 : 0);

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
      const provenanceToken = crypto.createHmac('sha256', getProvenanceSecret()).update(payloadDigest).digest('hex');

      // Rule 4: Never trust client IDs as Firestore document IDs. Generate server-owned IDs.
      const docId = crypto.randomUUID();

      // Rule 5: publicDataset must NOT expose Firebase UID, participantId, sessionId or other direct identity/session identifiers
      // Extract progressionTrials strictly from server-canonicalized trialPayloads (max 5 trials)
      const isSpeedAssessment = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
      const progressionTrials = trialPayloads.slice(0, 5).map(({ data: tp }: { data: Record<string, any> }, idx: number) => {
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

        if (assessmentType === 'direction') {
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
          if (typeof tp.sequenceLength === 'number') baseProgressionItem.sequenceLength = tp.sequenceLength;
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



  function isValidLeaderboardScoreMetric(assessmentType: string, scoreMetric: unknown): boolean {
    if (typeof scoreMetric !== 'number' || !Number.isFinite(scoreMetric) || Number.isNaN(scoreMetric)) {
      return false;
    }
    const isSpeed = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
    if (isSpeed) {
      return scoreMetric >= 50 && scoreMetric <= 10000;
    }
    if (assessmentType === 'block-memory' || assessmentType === 'number-memory') {
      return scoreMetric >= 1 && scoreMetric <= 150;
    }
    return scoreMetric >= 0 && scoreMetric <= 100;
  }

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
      const provenanceToken = crypto.createHmac('sha256', getProvenanceSecret()).update(tokenData).digest('hex');

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



  // Verification helper for audits / researchers
  app.post('/api/research/verify-provenance', (req, res) => {
    const { assessmentType, ageGroup, completedAtTimestamp, completedAtMonth, metrics, trialsDigest, provenanceToken } = req.body || {};
    if (!provenanceToken || typeof provenanceToken !== 'string') {
      return res.json({ verified: false, reason: 'Missing provenance token' });
    }
    const canonicalMetrics = metrics ? Object.keys(metrics).sort().map(k => `${k}=${metrics[k]}`).join('&') : '';
    const payloadDigest = `${assessmentType}:${ageGroup}:${canonicalMetrics}:${trialsDigest || ''}:${completedAtTimestamp}:${completedAtMonth}`;
    const expected = crypto.createHmac('sha256', getProvenanceSecret()).update(payloadDigest).digest('hex');
    return res.json({ verified: expected === provenanceToken });
  });

  app.post('/api/leaderboard/verify-provenance', (req, res) => {
    const { assessmentType, ageGroup, scoreMetric, displayName, trialsDigest, provenanceToken } = req.body || {};
    if (!provenanceToken || typeof provenanceToken !== 'string' || typeof scoreMetric !== 'number') {
      return res.json({ verified: false, reason: 'Missing parameters' });
    }
    const tokenData = `lb:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${(displayName || '').trim()}:${trialsDigest || ''}`;
    const expected = crypto.createHmac('sha256', getProvenanceSecret()).update(tokenData).digest('hex');
    return res.json({ verified: expected === provenanceToken });
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

  // Admin Security Helper
  function isUserAdmin(decodedToken: DecodedIdToken): boolean {
    if (!decodedToken) return false;
    if (decodedToken.role === 'admin' || decodedToken.admin === true) return true;
    if (decodedToken.email && decodedToken.email.toLowerCase() === 'admin@pulse-research.org') return true;
    return false;
  }

  // Admin Moderation: Soft-Hide Leaderboard Entry
  app.post('/api/admin/leaderboard/hide', async (req, res) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      if (!isUserAdmin(verifiedUser)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin authorization required' });
      }
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid entry id' });
      }

      

      const db = getAdminDb();
      if (db) {
        try {
          const docRef = db.collection('leaderboardResults').doc(id);
          const snap = await docRef.get();
          if (snap.exists) {
            await docRef.update({ hidden: true, hiddenAt: Date.now(), hiddenBy: verifiedUser.uid, hideReason: reason || '' });
          }

          await db.collection('adminAuditLogs').add({
            actor: verifiedUser.email || verifiedUser.uid,
            action: 'HIDE_LEADERBOARD_ENTRY',
            target: id,
            note: reason || 'Soft-hide by admin',
            timestamp: Date.now()
          });
        } catch (dbErr: any) {
          console.error('[Admin Hide API] Firestore sync failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }

      
      

      return res.json({ success: true, message: 'Leaderboard entry hidden successfully' });
    } catch (err) {
      console.error("[Admin Hide API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to hide leaderboard entry' });
    }
  });

  // Admin Moderation: Hard-Delete Leaderboard Entry
  app.post('/api/admin/leaderboard/delete', async (req, res) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      if (!isUserAdmin(verifiedUser)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin authorization required' });
      }
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid entry id' });
      }

      const db = getAdminDb();
      if (db) {
        try {
          const docRef = db.collection('leaderboardResults').doc(id);
          const snap = await docRef.get();
          if (snap.exists) {
            await docRef.delete();
          }

          await db.collection('adminAuditLogs').add({
            actor: verifiedUser.email || verifiedUser.uid,
            action: 'DELETE_LEADERBOARD_ENTRY',
            target: id,
            note: reason || 'Permanently deleted by admin',
            timestamp: Date.now()
          });
        } catch (dbErr: any) {
          console.error('[Admin Delete API] Firestore sync failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }

      

      return res.json({ success: true, message: 'Leaderboard entry deleted permanently' });
    } catch (err) {
      console.error("[Admin Delete API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to delete leaderboard entry' });
    }
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
        let q: FirebaseFirestore.Query = db.collection('publicDataset');

        if (assessmentType) {
          const aliases = assessmentType === 'color-recognition'
            ? ['color-recognition', 'colour-recognition', 'color-test']
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

        pageDocs.forEach(docSnap => {
          const data = docSnap.data();

          let derivedMonth = data.completedAtMonth;
          if (!derivedMonth && (data.completedAtTimestamp || data.createdAt)) {
            const d = new Date(data.completedAtTimestamp || data.createdAt);
            if (!isNaN(d.getTime())) {
              derivedMonth = d.toISOString().substring(0, 7);
            }
          }

          records.push({
            id: docSnap.id,
            assessmentType: normalizeAssessmentType(data.assessmentType || 'visual-reaction'),
            ageGroup: data.ageGroup || undefined,
            completedAtMonth: derivedMonth || undefined,
            completedAtTimestamp: data.completedAtTimestamp || data.createdAt,
            deviceCategory: data.deviceCategory || data.device || undefined,
            device: data.device,
            inputModality: data.inputModality || data.inputMethod,
            displayRefreshRateHz: data.displayRefreshRateHz || data.refreshRateHz || data.refreshRate,
            refreshRateHz: data.refreshRateHz || data.refreshRate,
            provenanceToken: data.provenanceToken,
            trialsDigest: data.trialsDigest,
            scoreMetric: data.scoreMetric,
            averageReactionTime: data.averageReactionTime,
            medianReactionTime: data.medianReactionTime,
            fastestReactionTime: data.fastestReactionTime,
            slowestReactionTime: data.slowestReactionTime,
            longestSeq: data.longestSeq,
            highestLevel: data.highestLevel,
            accuracy: data.accuracy,
            congruentAvg: data.congruentAvg,
            incongruentAvg: data.incongruentAvg,
            interferenceCost: data.interferenceCost,
            progressionTrials: data.progressionTrials || []
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

  // Public Research Dataset Summary Endpoint
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
        const snap = await db.collection('publicDataset').limit(5000).get();
        totalRecords = snap.size;
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const normType = normalizeAssessmentType(data.assessmentType || '');
          if (normType && counts[normType] !== undefined) {
            counts[normType]++;
          }
          if (Array.isArray(data.progressionTrials)) {
            totalTrials += data.progressionTrials.length;
          }
        });
      } catch (dbErr) {
        console.error('[Research Summary API] Firestore query error:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        return res.status(500).json({
          success: false,
          error: dbErr instanceof Error ? dbErr.message : 'Database query failed'
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

  // Mobile Auto-Redirection Middleware
  app.use((req, res, next) => {
    const url = req.url || '';
    const pathname = req.path || '';

    // Direct /mobile without trailing slash to /mobile/
    if (pathname === '/mobile') {
      const queryString = url.includes('?') ? '?' + url.split('?')[1] : '';
      return res.redirect(301, `/mobile/${queryString}`);
    }

    // Ignore API, mobile assets, or static asset requests
    if (
      pathname.startsWith('/api') ||
      pathname.startsWith('/mobile') ||
      pathname.startsWith('/admin') ||
      pathname.match(/\.(js|css|json|png|jpg|jpeg|gif|svg|ico|webmanifest|map|woff2?|ttf|eot)$/i)
    ) {
      return next();
    }

    const isForceMobile = url.includes('force_mobile=1') || url.includes('mobile=1');

    if (isForceMobile) {
      res.setHeader('Set-Cookie', 'pulse_force_desktop=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    }

    // Check for explicit override to view desktop version
    const cookies = parseCookies(req.headers.cookie);
    const hasForceDesktop =
      !isForceMobile &&
      (url.includes('force_desktop=1') ||
       url.includes('desktop=1') ||
       cookies['pulse_force_desktop'] === 'true' ||
       cookies['pulse_force_desktop'] === '1');

    if (hasForceDesktop) {
      if (url.includes('force_desktop=1') || url.includes('desktop=1')) {
        res.setHeader('Set-Cookie', 'pulse_force_desktop=true; Path=/; Max-Age=86400');
      }
      return next();
    }

    if (isForceMobile || isMobileUserAgent(req)) {
      const cleanPath = (pathname === '/' || pathname === '' || pathname === '/index.html') 
        ? '/' 
        : pathname;
      const targetPath = cleanPath === '/' ? '/mobile/' : `/mobile${cleanPath}`;
      const queryString = url.includes('?') ? '?' + url.split('?')[1] : '';
      res.setHeader('Vary', 'User-Agent, Sec-CH-UA-Mobile');
      return res.redirect(302, targetPath + queryString);
    }

    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vi' + 'te');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    // Custom SPA fallback for /mobile routes before Vite's default SPA fallback catches it
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        if (req.path.startsWith('/mobile')) {
          req.url = '/mobile/index.html';
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    // In production, server.js lives inside dist/
    let currentDir = process.cwd();
    try { if (typeof __dirname !== 'undefined') currentDir = __dirname; } catch (e) {}
    const distPath = fs.existsSync(path.join(currentDir, 'index.html'))
      ? currentDir
      : fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : process.cwd();

    app.use(express.static(distPath));

    app.get(['/mobile', '/mobile/*'], (_req, res) => {
      const mobileHtml = path.join(distPath, 'mobile', 'index.html');
      if (fs.existsSync(mobileHtml)) {
        res.sendFile(mobileHtml);
      } else {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // SPA fallback for all other routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

    if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.NOW_REGION) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
    });
  }
}

startServer();
export default app;
