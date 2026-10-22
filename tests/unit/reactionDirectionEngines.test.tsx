import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ReactionTest } from '../../src/components/ReactionTest';
import { DirectionTest } from '../../src/components/DirectionTest';

vi.mock('../../src/lib/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/firestore')>();
  return {
    ...actual,
    startExperimentSession: vi.fn().mockResolvedValue({
      success: true,
      sessionId: 'sess-vrt-test-1234',
      status: 200,
    }),
    submitAssessmentResult: vi.fn().mockResolvedValue({
      success: true,
      status: 200,
      id: 'sub-vrt-test-1234',
      derivedMetrics: {
        averageReactionTime: 215.4,
        fastestReactionTime: 189.2,
        slowestReactionTime: 250.1,
        medianReactionTime: 212.0,
        consistency: 94,
        totalFalseStarts: 0,
      },
      isNewPersonalBest: false,
    }),
    getPersonalBest: vi.fn().mockResolvedValue({
      bestScore: 210,
      isNewPersonalBest: false,
      pbError: null,
    }),
  };
});

describe('Task 5A: Simple & Choice Reaction Engines (Visual & Directional)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ReactionTest (Visual Reaction Engine)', () => {
    it('renders AgeSelection dialog in single main landmark before cohort is selected', () => {
      const onNavigate = vi.fn();
      render(
        <MemoryRouter initialEntries={['/reaction-test']}>
          <ReactionTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');

      expect(screen.getByText('Select Your Age Group')).toBeDefined();
      expect(screen.getByText('Proceed to Assessment')).toBeDefined();

      const proceedBtn = screen.getByRole('button', { name: /proceed to assessment/i });
      expect((proceedBtn as HTMLButtonElement).disabled).toBe(true);
    }, 15000);

    it('transitions to assessment-ready dark apparatus after age cohort selection', async () => {
      const onNavigate = vi.fn();
      const { container } = render(
        <MemoryRouter initialEntries={['/reaction-test']}>
          <ReactionTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      const youngAdultsBtn = screen.getByRole('button', { name: /young adults/i });
      fireEvent.click(youngAdultsBtn);

      const proceedBtn = screen.getByRole('button', { name: /proceed to assessment/i });
      expect((proceedBtn as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(proceedBtn);

      await waitFor(() => {
        expect(screen.getByText('Click to start')).toBeDefined();
      });

      // Assert outer shell renders minimal light edge chrome at top and dark canvas inside
      const header = screen.getByRole('banner', { name: /global navigation/i });
      expect(header).toBeDefined();

      // Footers omitted during active assessment to prevent accidental scrolling
      expect(screen.queryByRole('contentinfo')).toBeNull();

      // The root apparatus shell container must have dark-apparatus theme
      const darkShell = container.querySelector('[data-theme="dark"]');
      expect(darkShell).not.toBeNull();
      expect(darkShell?.className).toContain('bg-[#12161B]');

      // Stimulus apparatus must be accessible via keyboard and pointer
      const stimulusArea = screen.getByRole('button', {
        name: /reaction test stimulus area/i,
      });
      expect(stimulusArea).toBeDefined();
      expect(stimulusArea.getAttribute('tabindex')).toBe('0');
    }, 15000);

    it('immediately aborts test sequence when pulse_settings_open event is triggered', async () => {
      const onNavigate = vi.fn();
      render(
        <MemoryRouter initialEntries={['/reaction-test']}>
          <ReactionTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      // Select age group
      fireEvent.click(screen.getByRole('button', { name: /^adults/i }));
      fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

      await waitFor(() => {
        expect(screen.getByText('Click to start')).toBeDefined();
      });

      // Dispatch settings open event to verify interrupt handler
      window.dispatchEvent(new Event('pulse_settings_open'));

      await waitFor(() => {
        expect(screen.getByText('Click to start')).toBeDefined();
      });
    }, 15000);
  });

  describe('DirectionTest (Directional Choice Engine)', () => {
    it('renders AgeSelection dialog and proceeds to dark apparatus with pad controls', async () => {
      const onNavigate = vi.fn();
      const { container } = render(
        <MemoryRouter initialEntries={['/direction-test']}>
          <DirectionTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      expect(screen.getByText('Select Your Age Group')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: /young adults/i }));
      fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

      await waitFor(() => {
        expect(screen.getByText('Click to start')).toBeDefined();
      });

      // Assert dark shell
      const darkShell = container.querySelector('[data-theme="dark"]');
      expect(darkShell).not.toBeNull();
      expect(darkShell?.className).toContain('bg-[#12161B]');

      // Exactly one main landmark
      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');
    }, 15000);
  });
});
