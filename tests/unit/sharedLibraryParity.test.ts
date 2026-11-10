import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isValidReactionMetrics as desktopValidate } from '../../src/lib/protocolValidators';
import { isValidReactionMetrics as mobileValidate } from '../../mobile/src/lib/protocolValidators';

const readSource = (relPath: string) =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');


function getUnderEightyMillisecondDirectionBranch(source: string): string {
  const marker = 'if (rawLatency < 80) {';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('Direction under-80ms branch was not found.');

  const endMarker = "notes: 'anticipatory_response_<80ms'";
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error('Direction under-80ms observation was not found.');
  return source.slice(start, end);
}

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

  it('keeps the mobile About route inside the mobile component boundary', () => {
    const mobileApp = readSource('mobile/src/App.tsx');
    expect(mobileApp).toContain("import('./components/About')");
    expect(mobileApp).not.toContain("../../src/components/About");
  });


  it('includes the required targetDirection in desktop and mobile under-80ms observations', () => {
    for (const path of [
      'src/components/DirectionTest.tsx',
      'mobile/src/components/DirectionTest.tsx',
    ]) {
      const branch = getUnderEightyMillisecondDirectionBranch(readSource(path));
      expect(branch).toMatch(/targetDirection: currentDirection\\.toLowerCase\\(\\)/);
    }
  });

  it('keeps the desktop AddToHomeScreenModal reachable from Navbar and Settings', () => {
    const navbarSource = readSource('src/components/Navbar.tsx');
    expect(navbarSource).toContain('AddToHomeScreenModal');

    const settingsSource = readSource('src/components/SettingsModal.tsx');
    expect(settingsSource).toContain('AddToHomeScreenModal');
  });
});
