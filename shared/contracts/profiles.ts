import type { AgeGroup, AssessmentType } from './common';

export const VALID_OBSERVATORY_THEMES = [
  { id: 'cyan', label: 'Signal Cyan', hex: '#00F0FF', borderClass: 'border-cyan-400' },
  { id: 'green', label: 'Provenance Green', hex: '#10B981', borderClass: 'border-emerald-500' },
  { id: 'amber', label: 'Solar Amber', hex: '#F59E0B', borderClass: 'border-amber-500' },
  { id: 'violet', label: 'Nebula Violet', hex: '#8B5CF6', borderClass: 'border-violet-500' },
  { id: 'rose', label: 'Nova Rose', hex: '#F43F5E', borderClass: 'border-rose-500' },
  { id: 'azure', label: 'Deep Azure', hex: '#3B82F6', borderClass: 'border-blue-500' }
] as const;

export type ObservatoryThemeId = typeof VALID_OBSERVATORY_THEMES[number]['id'];

export const VALID_OBSERVATORY_GLYPHS = [
  { id: 'reticle', label: 'Focus Reticle' },
  { id: 'wave', label: 'Pulse Wave' },
  { id: 'hexagon', label: 'Hexagon Core' },
  { id: 'orbit', label: 'Orbital Ring' },
  { id: 'delta', label: 'Delta Prism' },
  { id: 'compass', label: 'Binary Compass' }
] as const;

export type ObservatoryGlyphId = typeof VALID_OBSERVATORY_GLYPHS[number]['id'];

export const RESERVED_PROFILE_NAMES = new Set([
  'admin',
  'administrator',
  'pulse',
  'moderator',
  'mod',
  'system',
  'root',
  'official',
  'support',
  'guest',
  'anonymous'
]);

export function isValidProfileUid(uid: string): boolean {
  if (typeof uid !== 'string') return false;
  return /^[a-z0-9]{16}$/.test(uid);
}

export function normalizeProfileDisplayName(name: string): string {
  if (typeof name !== 'string') return '';
  return name.normalize('NFKC').trim().toLowerCase();
}

export type DisplayNameValidationResult =
  | { valid: true; normalized: string; error?: never }
  | { valid: false; error: string; normalized?: never };

export function validateProfileDisplayName(name: string): DisplayNameValidationResult {
  if (typeof name !== 'string') {
    return { valid: false, error: 'INVALID_TYPE' };
  }

  const trimmed = name.trim();
  const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

  const length = segmenter
    ? Array.from(segmenter.segment(trimmed)).length
    : Array.from(trimmed).length;

  if (length < 3) {
    return { valid: false, error: 'DISPLAY_NAME_TOO_SHORT' };
  }
  if (length > 20) {
    return { valid: false, error: 'DISPLAY_NAME_TOO_LONG' };
  }

  // Reject consecutive hyphens, spaces, or underscores
  if (/[-_ ]{2,}/.test(trimmed)) {
    return { valid: false, error: 'CONSECUTIVE_SYMBOLS_DISALLOWED' };
  }

  // Character set: letters, numbers, spaces, hyphens, underscores
  const validCharRegex = /^[\p{L}\p{N}][\p{L}\p{N}\s\-_]*[\p{L}\p{N}]$/u;
  if (!validCharRegex.test(trimmed)) {
    return { valid: false, error: 'INVALID_CHARACTERS' };
  }

  const normalized = normalizeProfileDisplayName(trimmed);
  if (RESERVED_PROFILE_NAMES.has(normalized)) {
    return { valid: false, error: 'NAME_RESERVED' };
  }

  return { valid: true, normalized };
}

// Canonical Database Entity Schemas
export interface AccountRegistry {
  ownerUid: string;
  profileCount: number;
  profileUids: string[];
  revision: number;
  isPermanentAccount: boolean;
  email: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface NameReservation {
  normalizedName: string;
  profileUid: string | null;
  ownerUid: string | null;
  status: 'active' | 'tombstone';
  tombstoneReason: 'RENAME' | 'DELETE' | null;
  reservedAt: unknown;
  expiresAt: unknown | null;
}

export interface ProfileRecord {
  profileUid: string;
  displayName: string;
  normalizedName: string;
  ageGroup: AgeGroup;
  ownerUid: string;
  shareAgeGroupOnLeaderboard: boolean;
  revision: number;
  lastRenamedAt: unknown | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AssessmentAttribution {
  sessionId: string;
  profileUid: string;
  ownerUid: string;
  displayNameSnapshot: string;
  ageGroupSnapshot: AgeGroup;
  profileRevision: number;
  createdAt: unknown;
  capabilityExpiresAt: unknown;
  retentionDeleteAt: unknown;
  status: 'active' | 'submitted' | 'revoked';
}

export interface SessionCapability {
  tokenHash: string;
  sessionId: string;
  expiresAt: unknown;
  usedAt: unknown | null;
  status: 'active' | 'consumed' | 'revoked';
}

export interface MergeProfileSelection {
  profileUid: string;
  sourceOwnerUid: string;
  expectedRevision: number;
}

export interface ProfileOwnershipTransferJob {
  jobId: string;
  sourceOwnerUid: string;
  targetOwnerUid: string;
  sourceAuthProofId: string;
  targetAuthProofId: string;
  selections: MergeProfileSelection[];
  status:
    | 'PREVIEW'
    | 'AUTHORIZED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'COMPENSATING'
    | 'ABORTED'
    | 'FAILED';
  expiresAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  error?: string;
}

export type LeaderboardIdentity =
  | { kind: 'profile'; profileUid: string }
  | { kind: 'guest'; legacyIdentity: string };

export interface LocalProfile {
  profileUid: string;
  displayName: string;
  ageGroup: AgeGroup;
  themeAccent?: ObservatoryThemeId;
  avatarGlyph?: ObservatoryGlyphId;
  shareAgeGroup?: boolean;
  shareAgeGroupOnLeaderboard?: boolean;
  revision: number;
}

export interface PublicLeaderboardEntry {
  id: string;
  displayName: string;
  assessmentType: string;
  scoreMetric: number;
  accuracy: number | null;
  ageGroup: string | null;
  hasRegisteredProfile: boolean;
  resultValidationStatus: 'pending' | 'validated' | 'rejected';
  hidden: boolean;
  submittedAtMonth: string;
  createdAt: number | string | Date;
}
