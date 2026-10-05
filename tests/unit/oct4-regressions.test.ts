import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Oct 4–5 regression guards', () => {
  it('prevents ReactionTest keyboard events from reaching both handlers', () => {
    const source = readSource('src/components/ReactionTest.tsx');

    expect(source).toContain("e.stopPropagation();");
    expect(source).toContain("if (e.code === 'Space' || e.key === 'Enter')");
    expect(source.match(/executeTriggerRef\.current\(e\);/g)?.length).toBe(1);
  });

  it('keeps Home constrained to a single viewport', () => {
    const source = readSource('src/components/Home.tsx');

    expect(source).toContain('h-[100dvh]');
    expect(source).toContain('overflow-hidden');
    expect(source).not.toContain('Structured Telemetry Showcase Below-the-fold');
  });

  it('keeps the assessment hero keyboard-accessible', () => {
    const source = readSource('src/components/ui/AssessmentHero3D.tsx');

    expect(source).toContain('role="button"');
    expect(source).toContain('tabIndex={Math.abs(offset) <= 1 ? 0 : -1}');
    expect(source).toContain('if (e.key === \'Enter\' || e.key === \' \')');
    expect(source).toContain('navigate(assessment.targetRoute);');
  });
});
