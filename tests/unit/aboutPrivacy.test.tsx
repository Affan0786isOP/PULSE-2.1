import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { About } from '../../src/components/About';
import { ResearchPrivacyPolicy } from '../../src/components/ResearchPrivacyPolicy';

describe('About and Privacy Light Design System Migration', () => {
  beforeEach(() => {
    document.title = '';
    const metas = document.querySelectorAll('meta, link, script#pulse-seo-jsonld');
    metas.forEach(el => el.remove());
  });

  afterEach(() => {
    cleanup();
  });

  describe('About page preservation & shell integration', () => {
    it('renders platform purpose, five protocol summaries, and version indicator', () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <About onNavigate={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByText('About Pulse Evaluator')).toBeDefined();
      expect(screen.getByText('What the Platform Does')).toBeDefined();
      expect(screen.getByText('Available Cognitive Assessments')).toBeDefined();
      expect(screen.getByText(/Who the Platform is For/i)).toBeDefined();

      // All 5 protocols in About
      expect(screen.getByText('Visual Reaction')).toBeDefined();
      expect(screen.getByText('Directional Choice')).toBeDefined();
      expect(screen.getByText('Colour Recognition')).toBeDefined();
      expect(screen.getByText('Block Memory')).toBeDefined();
      expect(screen.getByText('Number Memory')).toBeDefined();

      // Scientific metrics
      expect(screen.getAllByText('Latency (ms)')).toHaveLength(2);
      expect(screen.getByText('Choice Speed (ms)')).toBeDefined();
      expect(screen.getByText('Spatial Span')).toBeDefined();
      expect(screen.getByText('Digit Span')).toBeDefined();
    });

    it('injects structured ABOUT_SCHEMA json-ld and enforces single main landmark', () => {
      render(
        <MemoryRouter initialEntries={['/about']}>
          <About onNavigate={vi.fn()} />
        </MemoryRouter>
      );

      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');

      const jsonLd = document.getElementById('pulse-seo-jsonld');
      expect(jsonLd).not.toBeNull();
      expect(jsonLd?.textContent).toContain('AboutPage');
      expect(jsonLd?.textContent).toContain('Precision User Latency & Stimulus Evaluator');
    });
  });

  describe('Research Privacy Policy preservation & shell integration', () => {
    it('renders 4-tier data architecture table and telemetry safeguards', () => {
      render(
        <MemoryRouter initialEntries={['/privacy']}>
          <ResearchPrivacyPolicy onNavigate={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByText('Research Privacy Policy')).toBeDefined();
      expect(screen.getByText(/Data Architecture & Classification/i)).toBeDefined();
      expect(screen.getByText(/Assessment Timing & Telemetry/i)).toBeDefined();
      expect(screen.getByText(/average of approximately 60 live-timer UI updates per second/i)).toBeDefined();
      expect(screen.queryByText(/Display Calibration & Timing Correction/i)).toBeNull();
      expect(screen.getByText(/Anonymization & Authentication Boundary/i)).toBeDefined();
      expect(screen.getByText(/Age Cohorts & Minor Safeguards/i)).toBeDefined();

      // Table contents
      expect(screen.getByText('1. Local Client State')).toBeDefined();
      expect(screen.getByText('2. Cloud Research Records')).toBeDefined();
      expect(screen.getByText('3. Public Leaderboards')).toBeDefined();
      expect(screen.getByText('4. Infrastructure Logs')).toBeDefined();

      const table = screen.getByRole('table');
      expect(table).toBeDefined();
    });

    it('enforces single main landmark and light background via PageShell', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/privacy']}>
          <ResearchPrivacyPolicy onNavigate={vi.fn()} />
        </MemoryRouter>
      );

      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');

      const root = container.firstElementChild as HTMLElement;
      expect(root.getAttribute('data-theme')).toBe('light');
    });
  });
});
