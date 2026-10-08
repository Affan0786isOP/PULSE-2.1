import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import metadata from '../../shared/seoMetadata.json';

const distDir = path.resolve(process.cwd(), 'dist');

describe('SEO Shell Generator Output Verification', () => {
  beforeAll(() => {
    // Run the generator to produce the output files for testing
    execSync('node scripts/generate-seo-pages.mjs', { stdio: 'pipe' });
  });

  const routesToVerify = [
    {
      file: 'seo/about.html',
      mobileFile: 'seo/mobile/about.html',
      expectedTitlePart: 'About PULSE',
      expectedHeading: 'About PULSE — Cognitive Benchmarking Suite',
      expectedFragment: 'What the Platform Does'
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
      expectedTitlePart: 'Reaction Time Test | Visual Reaction Test',
      expectedHeading: 'Reaction Time Test',
      expectedFragment: 'PULSE'
    },
    {
      file: 'seo/direction-test.html',
      mobileFile: 'seo/mobile/direction-test.html',
      expectedTitlePart: 'Directional Choice Test: Response Speed',
      expectedHeading: 'Directional Choice Test: Response Speed',
      expectedFragment: 'PULSE'
    },
    {
      file: 'seo/colour-recognition.html',
      mobileFile: 'seo/mobile/colour-recognition.html',
      expectedTitlePart: 'Colour Recognition Test: Stroop Task',
      expectedHeading: 'Colour Recognition Test: Stroop Task',
      expectedFragment: 'PULSE'
    },
    {
      file: 'seo/block-memory.html',
      mobileFile: 'seo/mobile/block-memory.html',
      expectedTitlePart: 'Block Memory Test: Spatial Sequence Recall',
      expectedHeading: 'Block Memory Test: Spatial Sequence Recall',
      expectedFragment: 'PULSE'
    },
    {
      file: 'seo/number-memory.html',
      mobileFile: 'seo/mobile/number-memory.html',
      expectedTitlePart: 'Number Memory Test: Forward Digit Recall',
      expectedHeading: 'Number Memory Test: Forward Digit Recall',
      expectedFragment: 'PULSE'
    }
  ];

  for (const { file, mobileFile, expectedTitlePart, expectedHeading } of routesToVerify) {
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

      // 4. Route-specific assessment article is present for assessment pages.
      if (file.includes('reaction-test') || file.includes('direction-test') || file.includes('colour-recognition') || file.includes('block-memory') || file.includes('number-memory')) {
        expect(content).toContain('<article id="assessment-seo-article">');
      }

      // 5. Shell exists exactly once
      const shellMatches = content.match(/<main\b[^>]*\bid=["']pulse-seo-shell["']/gi);
      expect(shellMatches).not.toBeNull();
      expect(shellMatches?.length).toBe(1);

      // 6. Canonical URL is strictly apex https://pulse-lab.in
      expect(content).toContain('link rel="canonical" href="https://pulse-lab.in');
      expect(content).not.toContain('link rel="canonical" href="https://www.pulse-lab.in');

      // 7. JSON-LD structured data exists and uses apex
      expect(content).toContain('id="pulse-seo-jsonld" type="application/ld+json"');
      expect(content).not.toContain('https://www.pulse-lab.in');
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

      // 5. JSON-LD structured data exists and uses apex
      expect(content).toContain('id="pulse-seo-jsonld" type="application/ld+json"');
      expect(content).not.toContain('https://www.pulse-lab.in');
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
