import { describe, it, expect } from 'vitest';
import {
  VALID_OBSERVATORY_THEMES,
  VALID_OBSERVATORY_GLYPHS,
  isValidProfileUid,
  normalizeProfileDisplayName,
  validateProfileDisplayName,
  type ProfileRecord,
  type AccountRegistry,
  type AssessmentAttribution,
  type SessionCapability
} from '../../shared/contracts/profiles';

describe('Shared Profile Contracts', () => {
  it('defines the 6 curated observatory theme accents', () => {
    expect(VALID_OBSERVATORY_THEMES).toHaveLength(6);
    expect(VALID_OBSERVATORY_THEMES.map(t => t.id)).toEqual([
      'cyan', 'green', 'amber', 'violet', 'rose', 'azure'
    ]);
  });

  it('defines the 6 curated observatory geometric glyphs', () => {
    expect(VALID_OBSERVATORY_GLYPHS).toHaveLength(6);
    expect(VALID_OBSERVATORY_GLYPHS.map(g => g.id)).toEqual([
      'reticle', 'wave', 'hexagon', 'orbit', 'delta', 'compass'
    ]);
  });

  it('validates 16-character lowercase alphanumeric profile UIDs strictly', () => {
    expect(isValidProfileUid('a1b2c3d4e5f6g7h8')).toBe(true);
    expect(isValidProfileUid('0123456789abcdef')).toBe(true);
    expect(isValidProfileUid('A1b2c3d4e5f6g7h8')).toBe(false); // Uppercase rejected
    expect(isValidProfileUid('a1b2c3d4e5f6g7h')).toBe(false);  // 15 chars
    expect(isValidProfileUid('a1b2c3d4e5f6g7h89')).toBe(false); // 17 chars
    expect(isValidProfileUid('a1b2c3d4e5f6g7h_')).toBe(false); // Special char rejected
  });

  it('normalizes display names using NFKC and lowercase folding', () => {
    expect(normalizeProfileDisplayName('  Nova_Pilot  ')).toBe('nova_pilot');
    expect(normalizeProfileDisplayName('Álèx')).toBe('álèx');
  });

  it('validates display names against length, charset, and reserved names', () => {
    expect(validateProfileDisplayName('Nova Pilot')).toEqual({ valid: true, normalized: 'nova pilot' });
    expect(validateProfileDisplayName('No')).toEqual({ valid: false, error: 'DISPLAY_NAME_TOO_SHORT' });
    expect(validateProfileDisplayName('A'.repeat(21))).toEqual({ valid: false, error: 'DISPLAY_NAME_TOO_LONG' });
    expect(validateProfileDisplayName('admin')).toEqual({ valid: false, error: 'NAME_RESERVED' });
    expect(validateProfileDisplayName('pulse')).toEqual({ valid: false, error: 'NAME_RESERVED' });
    expect(validateProfileDisplayName('Nova--Pilot')).toEqual({ valid: false, error: 'CONSECUTIVE_SYMBOLS_DISALLOWED' });
    expect(validateProfileDisplayName('  ')).toEqual({ valid: false, error: 'DISPLAY_NAME_TOO_SHORT' });
  });
});
