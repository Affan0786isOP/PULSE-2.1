const fs = require('fs');

function restore(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Insert types right before fetchWithAuth
  const types = `
export const VALID_AGE_GROUPS = [
  'Children (8–12)', 'Adolescents (13–17)', 'Young adults (18–25)', 
  'Adults (26–40)', 'Middle-aged adults (41–60)', 'Older adults (61–75)', 'Seniors (76+)'
] as const;

export type AgeGroup = typeof VALID_AGE_GROUPS[number];

export type AssessmentType = 'visual-reaction' | 'direction' | 'color-recognition' | 'block-memory' | 'number-memory';

export type AssessmentMetrics = Record<string, number | string | boolean | undefined>;

export type VrtTrialValidity = 'VALID' | 'FALSE_START_PRE_STIMULUS' | 'ANTICIPATORY_TOO_FAST' | 'TIMEOUT';
export type VrtQualityFlag = 'ANTICIPATORY_RT' | 'TIMEOUT_EXCEEDED' | 'PREMATURE_TRIGGER' | null;

export type ForeperiodCategory = 'SHORT' | 'LONG';

export type VisualReactionResult = {
  validity: VrtTrialValidity;
  reactionTimeMs: number | null;
  foreperiodMs: number;
  foreperiodCategory: ForeperiodCategory;
  qualityFlag: VrtQualityFlag;
  timestamp: number;
};

export type DirectionResult = {
  reactionTimeMs: number;
  isCorrect: boolean;
  congruent: boolean;
  timestamp: number;
};

export type ColorRecognitionResult = {
  reactionTimeMs: number;
  isCorrect: boolean;
  congruent: boolean;
  timestamp: number;
};

export type BlockMemoryResult = {
  level: number;
  sequenceLength: number;
  isCorrect: boolean;
  timeTakenMs: number;
  timestamp: number;
};

export type NumberMemoryResult = {
  level: number;
  digits: number;
  isCorrect: boolean;
  timeTakenMs: number;
  timestamp: number;
};

export type BasePayload = {
  assessmentType: AssessmentType;
  ageGroup: string;
  idempotencyKey?: string;
  trials?: any[];
  sessionId?: string;
  scoreMetric?: number;
  displayName?: string;
};

export const startExperimentSession = async (assessmentType: AssessmentType, ageGroup?: string): Promise<{
  success: boolean;
  sessionId?: string;
  expiresAt?: number;
  error?: string;
  status: number;
}> => {
  try {
`;

  // Fix fetchWithAuth
  const helper = `async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const ready = await ensureFirebaseReady();
  if (!ready) throw new Error('Firebase service unavailable');
  
  const authOk = await ensureAuthenticatedUser();
  if (!authOk || !auth?.currentUser) throw new Error('Authentication required');

  let idToken = await auth.currentUser.getIdToken();
  if (!idToken) throw new Error('Authentication token unavailable');

  const getHeaders = (token: string) => ({
    ...options.headers,
    'Authorization': \`Bearer \${token}\`
  });

  let res = await fetch(url, { ...options, headers: getHeaders(idToken) });

  if (res.status === 401) {
    idToken = await auth.currentUser.getIdToken(true);
    if (idToken) {
      res = await fetch(url, { ...options, headers: getHeaders(idToken) });
    }
  }
  return res;
}
`;

  content = content.replace(/async function fetchWithAuth[\s\S]*?const res = await fetchWithAuth\('\/\/api\/research\/session\/start', \{/, helper + types + `    const res = await fetchWithAuth('/api/research/session/start', {`);

  // Fix double slashes in other fetchWithAuth
  content = content.replace(/fetchWithAuth\('\/\//g, "fetchWithAuth('/");

  fs.writeFileSync(filePath, content);
}

restore('src/lib/firestore.ts');
restore('mobile/src/lib/firestore.ts');
