import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relPath: string) =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');

describe('Overengineering Pruning & Dead Code Purge Regression Suite', () => {
  it('confirms RiveFeedback is deleted and not referenced in AssessmentResultReward', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/RiveFeedback.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'public/rive'))).toBe(false);

    const desktopReward = readSource('src/components/AssessmentResultReward.tsx');
    expect(desktopReward).not.toContain('RiveFeedback');
    expect(desktopReward).not.toContain('riveAssetUrl');

    const pkg = JSON.parse(readSource('package.json'));
    expect(pkg.dependencies['@rive-app/react-canvas']).toBeUndefined();
  });

  it('confirms inMemorySessionStore is deleted and SettingsModal does not reference trialStore', () => {
    expect(existsSync(resolve(process.cwd(), 'src/lib/inMemorySessionStore.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/lib/inMemorySessionStore.ts'))).toBe(false);

    const desktopSettings = readSource('src/components/SettingsModal.tsx');
    expect(desktopSettings).not.toContain('trialStore');

    const mobileSettings = readSource('mobile/src/components/SettingsModal.tsx');
    expect(mobileSettings).not.toContain('trialStore');
  });

  it('confirms direct client-side fallback queries to leaderboardResults are purged from firestore.ts', () => {
    const desktopFirestore = readSource('src/lib/firestore.ts');
    expect(desktopFirestore).not.toContain("collection(db, 'leaderboardResults')");
    expect(desktopFirestore).not.toContain('Direct Firestore query for opted-in leaderboard submissions');

    const mobileFirestore = readSource('mobile/src/lib/firestore.ts');
    expect(mobileFirestore).not.toContain("collection(db, 'leaderboardResults')");
    expect(mobileFirestore).not.toContain('Direct Firestore query for opted-in leaderboard submissions');
  });
});
