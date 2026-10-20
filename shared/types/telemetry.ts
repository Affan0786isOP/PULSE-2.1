/**
 * Telemetry and activity notification contracts for PULSE.
 * Strictly limited to approved operational events without collecting PII.
 */

export const TRACKED_PAGE_ROUTES = [
  '/',
  '/about',
  '/assessments',
  '/leaderboard'
] as const;

export type TrackedPageRoute = (typeof TRACKED_PAGE_ROUTES)[number];

export type ActivitySurface = 'desktop' | 'mobile';

export interface PageViewRequest {
  eventId: string; // Cryptographically random UUID (used for retry idempotency)
  route: TrackedPageRoute;
  surface: ActivitySurface;
  deviceId?: string; // Pseudonymous browser-profile UUID (dev_...)
  clientTimestampMs?: number; // Diagnostic only; never authoritative
}

export type AssessmentNotificationType =
  | 'visual-reaction'
  | 'direction'
  | 'colour-recognition'
  | 'color-recognition'
  | 'block-memory'
  | 'number-memory';

export interface AssessmentResultNotification {
  notificationId: string; // Deterministic ID derived from sessionId/resultId
  assessmentType: AssessmentNotificationType;
  ageGroup: string;
  deviceCategory: string; // 'computer' | 'phone' | 'tablet' | 'unknown'
  surface: ActivitySurface;
  deviceId?: string;
  completedAtIso: string;
  metrics: {
    // Speed metrics
    meanReactionTimeMs?: number | null;
    medianReactionTimeMs?: number | null;
    fastestReactionTimeMs?: number | null;
    slowestReactionTimeMs?: number | null;
    falseStartsCount?: number;
    validTrialsCount?: number;
    totalTrialsCount?: number;
    accuracyPercentage?: number | null;
    congruentMeanRtMs?: number | null;
    incongruentMeanRtMs?: number | null;
    conflictCostMs?: number | null;
    interferenceCostMs?: number | null;
    // Memory metrics
    maxSpan?: number | null;
    highestLevelAchieved?: number | null;
    correctSequencesCount?: number | null;
    totalSequencesCount?: number | null;
  };
}

export interface LeaderboardNotification {
  notificationId: string; // Deterministic ID derived from leaderboard entry ID
  displayName: string;
  assessmentType: string;
  ageGroup: string;
  scoreDisplay: string;
  scoreUnit: string;
  rankAtSubmission?: number | null;
  trialsCount?: number | null;
  surface: ActivitySurface;
  deviceId?: string;
  createdAtIso: string;
}

export function isTrackedPageRoute(route: unknown): route is TrackedPageRoute {
  return typeof route === 'string' && (TRACKED_PAGE_ROUTES as readonly string[]).includes(route);
}

export function isActivitySurface(surface: unknown): surface is ActivitySurface {
  return surface === 'desktop' || surface === 'mobile';
}
