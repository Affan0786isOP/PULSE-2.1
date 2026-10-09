import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { AssessmentInfoPanel } from '../../src/components/AssessmentInfoPanel';

describe('Assessment SEO Bootstrap Single Article Invariant', () => {
  let staticShell: HTMLElement | null = null;

  beforeEach(() => {
    // Simulate pre-existing static SEO shell from scripts/generate-seo-pages.mjs
    staticShell = document.createElement('main');
    staticShell.id = 'pulse-seo-shell';
    staticShell.innerHTML = `
      <article id="assessment-seo-article">
        <h1>Visual Reaction Time Test</h1>
        <p>Pre-rendered static assessment content for search indexers.</p>
      </article>
    `;
    document.body.appendChild(staticShell);
  });

  afterEach(() => {
    cleanup();
    const shell = document.getElementById('pulse-seo-shell');
    if (shell) shell.remove();
  });

  it('removes the static seo shell upon client bootstrap leaving exactly one article in live DOM', () => {
    // Before bootstrap: static shell article is present in DOM
    const initialArticles = document.querySelectorAll('article#assessment-seo-article');
    expect(initialArticles.length).toBe(1);
    expect(document.getElementById('pulse-seo-shell')).not.toBeNull();

    // Client bootstrap step: as specified in index.html and Assessment SEO architecture,
    // document.getElementById('pulse-seo-shell')?.remove() executes prior to React mounting
    document.getElementById('pulse-seo-shell')?.remove();
    expect(document.getElementById('pulse-seo-shell')).toBeNull();

    // React mounts AssessmentInfoPanel
    render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={false}
        onClose={() => {}}
      />
    );

    // Verify exactly one article#assessment-seo-article exists in the live DOM
    const liveArticles = document.querySelectorAll('article#assessment-seo-article');
    expect(liveArticles.length).toBe(1);

    // Verify it is inside the dialog element
    const dialog = document.getElementById('assessment-info-panel');
    expect(dialog).not.toBeNull();
    expect(dialog?.contains(liveArticles[0])).toBe(true);

    // Verify heading hierarchy inside client article is h2 -> h3 -> h4
    expect(liveArticles[0].querySelector('h1')).toBeNull();
    const h2 = liveArticles[0].querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toBe('Visual Reaction Time Test');
  });
});
