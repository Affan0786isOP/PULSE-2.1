export type CanonicalLeaderboardAssessmentType =
  | 'visual-reaction'
  | 'direction'
  | 'color-recognition'
  | 'block-memory'
  | 'number-memory';

/** One canonical assessment/type-alias mapping shared by server and both clients. */
export function normalizeLeaderboardAssessmentType(value: unknown): CanonicalLeaderboardAssessmentType | null {
  if (typeof value !== 'string') return null;
  const type = value.toLowerCase().trim().replace(/[_\s]+/g, '-');
  if (['reaction-test', 'visual-reaction', 'reaction', 'visual', 'visual-reaction-test'].includes(type)) return 'visual-reaction';
  if (['direction-test', 'direction', 'direction-reflex'].includes(type)) return 'direction';
  if (['colour-recognition', 'color-test', 'colour-test', 'color-recognition', 'color', 'colour', 'color-rec', 'colour-rec'].includes(type)) return 'color-recognition';
  if (['block-memory', 'block-memory-test', 'block'].includes(type)) return 'block-memory';
  if (['number-memory', 'number-memory-test', 'number'].includes(type)) return 'number-memory';
  return null;
}

const GENERIC_ALIASES = new Set(['anonymous', 'unknown', 'guest']);
// Keep this list limited to clear profanity/slurs. Ordinary names and words such as
// Dick, Bot, Admin, Staff, and Sex are not reliable evidence of abuse by themselves.
const DISALLOWED_TERMS = [
  'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'faggot', 'pussy',
  'cunt', 'bastard', 'retard'
];

// Common unambiguously abusive compounds are listed explicitly so that names
// containing the same letters (for example Harshit or Kshitij) are not blocked.
const DISALLOWED_COMPOUND_TERMS = [
  'fuckboi', 'fuckboy', 'fuckwit', 'fuckface', 'fuckhead', 'fucktard',
  'fucker', 'fuckers', 'fucked', 'fucking', 'fuckery',
  'motherfucker', 'motherfuckers', 'motherfucking',
  'shitface', 'shithead', 'shithole', 'shitbag', 'shitstain', 'shitshow',
  'shitbrain', 'dumbshit', 'bullshit', 'shitty',
  'asshat', 'asswipe', 'assclown', 'assface', 'dumbass', 'jackass'
];

const CONFUSABLE_CHARACTERS: Record<string, string> = {
  'а': 'a', 'α': 'a',
  'е': 'e', 'ε': 'e',
  'і': 'i', 'ι': 'i', 'ı': 'i',
  'о': 'o', 'ο': 'o',
  'р': 'p', 'ρ': 'p',
  'с': 'c', 'ϲ': 'c',
  'х': 'x', 'χ': 'x',
  'у': 'y', 'υ': 'y',
  'к': 'k', 'κ': 'k',
  'м': 'm',
  'т': 't', 'τ': 't',
  'в': 'b', 'β': 'b',
  'н': 'h', 'η': 'h',
  'ј': 'j', 'һ': 'h',
  'ѕ': 's',
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't'
};

function normalizeAliasText(value: string, splitCamelCase: boolean): string {
  let text = value.normalize('NFKC').normalize('NFKD').replace(/\p{M}/gu, '');
  // Detect intentionally mixed-case word boundaries such as xXfuckXx without
  // splitting ordinary title-cased names such as Harshit.
  if (splitCamelCase) {
    text = text.replace(/(?<=[a-z])([A-Z])(?=[a-z])/gu, ' $1 ');
  }
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[аαеεіιıоοрρсϲхχуυкκмтτвβнηјһѕ]/gu, char => CONFUSABLE_CHARACTERS[char] || char);
}

function compactAliasForSafetyCheck(value: string): string {
  return normalizeAliasText(value, false)
    .replace(/[013457]/gu, char => CONFUSABLE_CHARACTERS[char] || char)
    .replace(/[^a-z]/gu, '');
}

function containsDisallowedAliasTerm(value: string): boolean {
  const normalized = normalizeAliasText(value, true);
  const leetNormalized = normalized.replace(/[013457]/gu, char => CONFUSABLE_CHARACTERS[char] || char);

  // Check explicit terms as whole words. Non-letter separators and digits can
  // delimit a term (fuck123), or appear between its letters (f.u.c.k, f u c k).
  // Whole-word boundaries avoid blocking names such as Harshit or phrases such as Push It.
  const hasDisallowedWord = (text: string) => DISALLOWED_TERMS.some(term => {
    const separatedLetters = term.split('').join('[^a-z]*');
    return new RegExp('(?:^|[^a-z])' + separatedLetters + '(?:$|[^a-z])', 'u').test(text);
  });

  // Include explicit common inflections without treating every containing substring as abuse.
  const hasDisallowedInflection = /(?:^|[^a-z])(?:shitty|shithead|shithole|fucker|fucked|fucking|fuckery)(?:$|[^a-z])/u;

  const hasDisallowedCompound = (text: string) => DISALLOWED_COMPOUND_TERMS.some(term =>
    new RegExp('(?:^|[^a-z])' + term + '(?:$|[^a-z])', 'u').test(text)
  );

  return hasDisallowedWord(normalized) ||
    hasDisallowedWord(leetNormalized) ||
    hasDisallowedInflection.test(normalized) ||
    hasDisallowedInflection.test(leetNormalized) ||
    hasDisallowedCompound(normalized) ||
    hasDisallowedCompound(leetNormalized);
}

function containsDisallowedWholeWordForRead(value: string): boolean {
  // Intentionally lenient for already-stored aliases: no camel-case splitting,
  // no leetspeak conversion, and no matching across inserted separators.
  const normalized = normalizeAliasText(value, false);
  const hasDisallowedWholeWord = DISALLOWED_TERMS.some(term =>
    new RegExp('(?:^|[^a-z0-9])' + term + '(?:$|[^a-z0-9])', 'u').test(normalized)
  );
  const hasExplicitCompound = DISALLOWED_COMPOUND_TERMS.some(term =>
    new RegExp('(?:^|[^a-z])' + term + '(?:$|[^a-z])', 'u').test(normalized)
  );

  // Screen explicit compound abuse on reads too, but keep evasion normalization
  // (leet conversion, inserted separators, mixed-case splitting) submit-only.
  return hasDisallowedWholeWord || hasExplicitCompound;
}

/**
 * Normalizes and safety-checks an already-stored public alias without applying
 * the stricter character whitelist for new submissions. Return null when the
 * alias is clearly unsafe; preserve safe punctuation, Unicode scripts and emoji.
 */
export function safeLeaderboardDisplayNameForRead(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  const length = Array.from(normalized).length;
  if (length < 1 || length > 100) return null;

  // Reject controls and bidi/invisible overrides. U+200D remains available for emoji ZWJ sequences.
  if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200C\u200E-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u.test(normalized)) return null;
  if (/[<>]/u.test(normalized)) return null;

  if (/(?:https?:\/\/|www\.)/iu.test(normalized) ||
      /[\w.+-]+@[\w.-]+\.[A-Z]{2,}/iu.test(normalized) ||
      (normalized.match(/\p{N}/gu) || []).length >= 7) return null;

  if (!isOptedInLeaderboardUser(normalized)) return null;

  return containsDisallowedWholeWordForRead(normalized) ? null : normalized;
}

/** True only for a participant-selected, non-generic public alias. */
export function isOptedInLeaderboardUser(displayName: string | null | undefined): boolean {
  const trimmed = String(displayName || '').normalize('NFKC').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLocaleLowerCase('en-US');
  const compact = compactAliasForSafetyCheck(trimmed);
  if (
    GENERIC_ALIASES.has(lower) ||
    GENERIC_ALIASES.has(compact) ||
    lower.startsWith('participant') ||
    compact.startsWith('participant')
  ) return false;
  return true;
}

export interface LeaderboardAliasValidation {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Canonical public-alias policy used by clients and the authoritative server.
 * This deliberately rejects control/bidi characters, contact details, and markup-like aliases.
 */
export function validateLeaderboardDisplayName(value: unknown): LeaderboardAliasValidation {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Enter a valid display name.' };
  }

  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  const length = Array.from(normalized).length;
  if (length < 1 || length > 30) {
    return { valid: false, error: 'Display name must be between 1 and 30 characters.' };
  }

  // Explicitly reject hidden formatting and directional overrides rather than silently stripping them.
  if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/u.test(normalized)) {
    return { valid: false, error: 'Display name contains unsupported hidden characters.' };
  }

  // Support Unicode scripts while excluding markup, URLs, @handles, and punctuation-heavy payloads.
  if (!/^[\p{L}\p{M}\p{N} ._'-]+$/u.test(normalized)) {
    return { valid: false, error: 'Use letters, numbers, spaces, periods, apostrophes, underscores, or hyphens only.' };
  }

  if (/(?:https?:\/\/|www\.)/iu.test(normalized) ||
      /[\w.+-]+@[\w.-]+\.[A-Z]{2,}/iu.test(normalized) ||
      (normalized.match(/\p{N}/gu) || []).length >= 7) {
    return { valid: false, error: 'Display names cannot contain links or contact information.' };
  }

  if (!isOptedInLeaderboardUser(normalized)) {
    return { valid: false, error: 'Choose a non-generic display name instead of Guest, Anonymous, Unknown, or Participant.' };
  }

  if (containsDisallowedAliasTerm(normalized)) {
    return { valid: false, error: 'Choose a different display name that follows the community guidelines.' };
  }

  return { valid: true, normalized };
}

/** Shared score eligibility rule. All memory span scores must be whole numbers. */
export function isValidLeaderboardScoreMetric(assessmentType: string, scoreMetric: unknown): boolean {
  if (typeof scoreMetric !== 'number' || !Number.isFinite(scoreMetric)) return false;

  if (assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition') {
    return scoreMetric >= 50 && scoreMetric <= 10000;
  }

  if (assessmentType === 'block-memory' || assessmentType === 'number-memory') {
    return Number.isInteger(scoreMetric) && scoreMetric >= 1 && scoreMetric <= 150;
  }

  return false;
}
