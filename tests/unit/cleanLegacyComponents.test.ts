import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

function findRepositoryReferences(targetPatterns: string[]): { file: string; line: number; match: string }[] {
  const matches: { file: string; line: number; match: string }[] = [];
  const walk = (dir: string) => {
    const list = readdirSync(dir);
    for (const f of list) {
      if (['node_modules', '.git', 'dist', 'audit', '.gemini', 'scratch', 'docs'].includes(f)) continue;
      const full = join(dir, f);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (/\.(tsx|ts|json|html|css)$/.test(f)) {
        if (full.includes('tests') || full.includes('tests\\')) continue;
        const content = readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((l, i) => {
          for (const pattern of targetPatterns) {
            if (l.includes(pattern)) {
              matches.push({ file: full, line: i + 1, match: l.trim() });
            }
          }
        });
      }
    }
  };
  walk(process.cwd());
  return matches;
}

describe('Legacy Frontend Components Pre-Deletion Audit & Purge', () => {
  it('confirms 0 repository-wide references to AnimatedBackground before deletion', () => {
    const refs = findRepositoryReferences(['AnimatedBackground', 'pulse-technical-background', 'mobile-technical-background']);
    // Filter out the component files themselves if they still exist during audit
    const activeRefs = refs.filter(r => !r.file.endsWith('AnimatedBackground.tsx'));
    expect(activeRefs).toEqual([]);
  });

  it('confirms AnimatedBackground files are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/AnimatedBackground.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/components/AnimatedBackground.tsx'))).toBe(false);
  });

  it('confirms legacy grid CSS variables are removed from index.css', () => {
    const desktopCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const mobileCss = readFileSync(resolve(process.cwd(), 'mobile/src/index.css'), 'utf8');
    expect(desktopCss).not.toContain('--bg-grid-pattern');
    expect(mobileCss).not.toContain('--bg-grid-pattern');
  });

  it('confirms 0 active references to legacy Dataset explorer and dataset subcomponents', () => {
    const refs = findRepositoryReferences([
      'from \'./dataset/DatasetHeader\'',
      'from \'./dataset/DatasetFilterBar\'',
      'from \'./dataset/DatasetContentSlot\'',
      'from \'./components/Dataset\'',
      'from \'../../src/components/Dataset\''
    ]);
    // Only Dataset.tsx files themselves import them currently; once deleted, 0 active references
    const activeRefs = refs.filter(r => !r.file.endsWith('Dataset.tsx'));
    expect(activeRefs).toEqual([]);
  });

  it('confirms legacy Dataset components and directory are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/Dataset.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/components/Dataset.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/dataset'))).toBe(false);
  });

  it('confirms 0 active references to src/lib/dataset pipeline', () => {
    const refs = findRepositoryReferences([
      'from \'../lib/dataset\'',
      'from \'../../src/lib/dataset\'',
      'from \'./lib/dataset\''
    ]);
    expect(refs).toEqual([]);
  }, 15000);

  it('confirms src/lib/dataset directory is deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/lib/dataset'))).toBe(false);
  });

  it('confirms 0 active references to StimulusReticle and standalone fullscreen helpers', () => {
    const refs = findRepositoryReferences([
      'from \'./StimulusReticle\'',
      'from \'../lib/fullscreen\'',
      'from \'./lib/fullscreen\''
    ]);
    expect(refs).toEqual([]);
  });

  it('confirms StimulusReticle and standalone fullscreen helper files are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/brand/StimulusReticle.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/lib/fullscreen.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/lib/fullscreen.ts'))).toBe(false);

    const brandIndex = readFileSync(resolve(process.cwd(), 'src/components/brand/index.ts'), 'utf8');
    expect(brandIndex).not.toContain('StimulusReticle');
    expect(brandIndex).toContain('PulseLogo');
  });
});
