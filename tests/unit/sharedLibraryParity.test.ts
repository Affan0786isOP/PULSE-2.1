import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isValidReactionMetrics as desktopValidate } from '../../src/lib/protocolValidators';
import { isValidReactionMetrics as mobileValidate } from '../../mobile/src/lib/protocolValidators';

const readSource = (relPath: string) =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');

describe('Shared Library Parity & Chunk Leakage Guards', () => {
  it('enforces exact parity for isValidReactionMetrics between desktop and mobile', () => {
    // Both should reject median reaction times outside fastest..slowest
    const invalidMedian = {
      medianReactionTime: 350,
      fastestReactionTime: 180,
      slowestReactionTime: 300,
    };

    expect(desktopValidate(invalidMedian)).toBe(false);
    expect(mobileValidate(invalidMedian)).toBe(false);
  });

  it('confirms mobile routeTheme.ts preloads mobile chunks, not desktop components', () => {
    const mobileRouteTheme = readSource('mobile/src/lib/routeTheme.ts');
    // Must not re-export from desktop
    expect(mobileRouteTheme).not.toContain("export * from '../../../src/lib/routeTheme'");
    // Must preload mobile components
    expect(mobileRouteTheme).toContain("import('../components/Assessments')");
    expect(mobileRouteTheme).toContain("import('../components/Leaderboard')");
    expect(mobileRouteTheme).not.toContain("../../../src/components/About");
  });

  it('keeps the desktop AddToHomeScreenModal reachable from Navbar and Settings', () => {
    const navbarSource = readSource('src/components/Navbar.tsx');
    expect(navbarSource).toContain('AddToHomeScreenModal');

    const settingsSource = readSource('src/components/SettingsModal.tsx');
    expect(settingsSource).toContain('AddToHomeScreenModal');
  });
});
