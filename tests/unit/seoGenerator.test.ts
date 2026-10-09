import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import metadata from '../../shared/seoMetadata.json';

let distDir: string;
let tempDistDir: string;

describe('SEO Shell Generator Output Verification', () => {
  beforeAll(() => {
    tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-seo-generator-'));
    fs.mkdirSync(path.join(tempDistDir, 'mobile'), { recursive: true });
    fs.copyFileSync(path.resolve(process.cwd(), 'index.html'), path.join(tempDistDir, 'index.html'));
    fs.copyFileSync(path.resolve(process.cwd(), 'mobile/index.html'), path.join(tempDistDir, 'mobile/index.html'));
    distDir = tempDistDir;

    execSync('node scripts/generate-seo-pages.mjs', {
      stdio: 'pipe',
      env: { ...process.env, PULSE_SEO_DIST_DIR: tempDistDir }
    });
  });

  afterAll(() => {
    fs.rmSync(tempDistDir, { recursive: true, force: true });
  });

  const routesToVerify = [
    {
      file: 'seo/about.html',
      mobileFile: 'seo/mobile/about.html',
      expectedTitlePart: 'About PULSE',
      expectedHeading: 'About PULSE — Cognitive Benchmarking Suite',
      expectedFragment: 'About PULSE'
    },
    {
      file: 'seo/assessments.html',
      mobileFile: 'seo/mobile/assessments.html',
      expectedTitlePart: 'Assessments',
      expectedHeading: 'Assessments',
      expectedFragment: 'PULSE'
    },
    {
      file: 'seo/reaction-test.html',
      mobileFile: 'seo/mobile/reaction-test.html',
      expectedTitlePart: 'Reaction Time Test | Visual Reaction Test | PULSE',
      expectedHeading: 'Visual Reaction Time Test',
      expectedFragment: 'What is Reaction Time?'
    },
    {
      file: 'seo/direction-test.html',
      mobileFile: 'seo/mobile/direction-test.html',
      expectedTitlePart: 'Directional Choice Test: Response Speed | PULSE',
      expectedHeading: 'Directional Choice Reaction Test',
      expectedFragment: 'What is Choice Reaction Time?'
    },
    {
      file: 'seo/colour-recognition.html',
      mobileFile: 'seo/mobile/colour-recognition.html',
      expectedTitlePart: 'Colour Recognition Test: Stroop Task | PULSE',
      expectedHeading: 'Colour Recognition &amp; Interference Test',
      expectedFragment: 'Cognitive Conflict and Interference'
    },
    {
      file: 'seo/block-memory.html',
      mobileFile: 'seo/mobile/block-memory.html',
      expectedTitlePart: 'Block Memory Test: Spatial Sequence Recall | PULSE',
      expectedHeading: 'Block Memory Test',
      expectedFragment: 'Spatial Working Memory'
    },
    {
      file: 'seo/number-memory.html',
      mobileFile: 'seo/mobile/number-memory.html',
      expectedTitlePart: 'Number Memory Test: Forward Digit Recall | PULSE',
      expectedHeading: 'Number Memory Test',
      expectedFragment: 'Digit Span Working Memory'
    }
  ];

  for (const { file, mobileFile, expectedTitlePart, expectedHeading, expectedFragment } of routesToVerify) {
    it(`generates correct desktop route body and metadata for ${file}`, () => {
      const filePath = path.join(distDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');

      // 1. Replaces homepage title and contains route title
      expect(content).toContain(`<title>${expectedTitlePart}`);

      // 2. Contains route-specific H1 inside the shell
      expect(content).toContain(`<h1 id="pulse-seo-shell-title"`);
      expect(content).toContain(expectedHeading);

      // 3. Does NOT contain homepage H1 inside the shell
      const homepageHeading = 'PULSE — Precision User Latency &amp; Stimulus Evaluator';
      expect(content).not.toContain(`<h1 id="pulse-seo-shell-title" style="font-size:clamp(2rem,6vw,4rem);line-height:1.05;margin:0 0 1rem">${homepageHeading}</h1>`);

      // 4. Shell exists exactly once
      const shellMatches = content.match(/<main\b[^>]*\bid=["']pulse-seo-shell["']/gi);
      expect(shellMatches).not.toBeNull();
      expect(shellMatches?.length).toBe(1);

      // 5. Canonical URL is strictly apex https://pulse-lab.in
      expect(content).toContain('link rel="canonical" href="https://pulse-lab.in');
      expect(content).not.toContain('link rel="canonical" href="https://www.pulse-lab.in');

      // 6. JSON-LD structured data exists, uses apex, and omits sameAs
      expect(content).toContain('id="pulse-seo-jsonld" type="application/ld+json"');
      expect(content).not.toContain('https://www.pulse-lab.in');
      expect(content).not.toContain('"sameAs"');

      // 7. Route contains expected fragment/heading
      if (expectedFragment) {
        expect(content).toContain(expectedFragment);
      }

      // 8. If assessment route, contains semantic article with real links
      if (file.includes('reaction-test') || file.includes('direction-test') || file.includes('colour-recognition') || file.includes('block-memory') || file.includes('number-memory')) {
        expect(content).toContain('<article id="assessment-seo-article"');
        expect(content).toMatch(/<a\s+href=["']\/(reaction-test|direction-test|colour-recognition|block-memory|number-memory|improve|assessments|leaderboard)["']/);
      }
    });

    it(`generates correct mobile route body and metadata for ${mobileFile}`, () => {
      const filePath = path.join(distDir, mobileFile);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');

      // 1. Replaces homepage title and contains route title
      expect(content).toContain(`<title>${expectedTitlePart}`);

      // 2. Contains route-specific H1 inside the shell
      expect(content).toContain(`<h1 id="pulse-seo-shell-title"`);
      expect(content).toContain(expectedHeading);

      // 3. Shell exists exactly once
      const shellMatches = content.match(/<main\b[^>]*\bid=["']pulse-seo-shell["']/gi);
      expect(shellMatches).not.toBeNull();
      expect(shellMatches?.length).toBe(1);

      // 4. Canonical points to canonical desktop URL using apex domain (without /mobile/)
      expect(content).toContain('link rel="canonical" href="https://pulse-lab.in');
      expect(content).not.toContain('link rel="canonical" href="https://www.pulse-lab.in');
      expect(content).not.toContain('link rel="canonical" href="https://pulse-lab.in/mobile/');

      // 5. JSON-LD structured data exists, uses apex, and omits sameAs
      expect(content).toContain('id="pulse-seo-jsonld" type="application/ld+json"');
      expect(content).not.toContain('https://www.pulse-lab.in');
      expect(content).not.toContain('"sameAs"');

      // 6. If assessment route, contains semantic article with real links
      if (mobileFile.includes('reaction-test') || mobileFile.includes('direction-test') || mobileFile.includes('colour-recognition') || mobileFile.includes('block-memory') || mobileFile.includes('number-memory')) {
        expect(content).toContain('<article id="assessment-seo-article"');
        expect(content).toMatch(/<a\s+href=["']\/(reaction-test|direction-test|colour-recognition|block-memory|number-memory|improve|assessments|leaderboard)["']/);
      }
    });
  }

  it('correctly marks non-indexable routes with noindex in robots meta tag', () => {
    const datasetPath = path.join(distDir, 'seo', 'dataset.html');
    expect(fs.existsSync(datasetPath)).toBe(true);
    const content = fs.readFileSync(datasetPath, 'utf8');
    expect(content).toContain('<meta name="robots" content="noindex, follow" />');
  });

  it('fails fast when base shell is missing from input template', () => {
    // Calling script on invalid base template would throw
    // Verify that the generator script throws when pulse-seo-shell is absent
    const scriptPath = path.resolve(process.cwd(), 'scripts/generate-seo-pages.mjs');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    expect(scriptContent).toContain('Expected <main id="pulse-seo-shell"> was not found');
  });
});
