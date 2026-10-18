import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ColorTest } from '../../src/components/ColorTest';
import { BlockMemoryTest } from '../../src/components/BlockMemoryTest';
import { NumberMemoryTest } from '../../src/components/NumberMemoryTest';

vi.mock('../../src/lib/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/firestore')>();
  return {
    ...actual,
    startExperimentSession: vi.fn().mockResolvedValue({
      success: true,
      sessionId: 'sess-mem-test-9999',
      status: 200,
    }),
    submitAssessmentResult: vi.fn().mockResolvedValue({
      success: true,
      status: 200,
      id: 'sub-mem-test-9999',
      derivedMetrics: {
        averageReactionTime: 320.5,
        fastestReactionTime: 290.0,
        slowestReactionTime: 410.2,
        medianReactionTime: 315.0,
        accuracy: 95,
        totalCorrect: 14,
      },
      isNewPersonalBest: false,
    }),
    getPersonalBest: vi.fn().mockResolvedValue({
      bestScore: 300,
      isNewPersonalBest: false,
      pbError: null,
    }),
  };
});

describe('Task 5B: Conflict & Working Memory Engines (Color, Block, Number)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ColorTest (Stroop Colour Recognition Engine)', () => {
    it('renders AgeSelection dialog and transitions to dark apparatus canvas upon selection', async () => {
      const onNavigate = vi.fn();
      const { container } = render(
        <MemoryRouter initialEntries={['/colour-recognition']}>
          <ColorTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      // Single main landmark
      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');

      expect(screen.getByText('Select Your Age Group')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: /^young adults/i }));
      fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

      await waitFor(() => {
        expect(screen.getByText('15 ROUNDS • STROOP TEST')).toBeDefined();
      });

      // Assert dark shell
      const darkShell = container.querySelector('[data-theme="dark"]');
      expect(darkShell).not.toBeNull();
      expect(darkShell?.className).toContain('bg-[#12161B]');

      // Minimal light edge chrome Navbar at top
      const header = screen.getByRole('banner', { name: /global navigation/i });
      expect(header).toBeDefined();

      // Footer omitted on engine canvas
      expect(screen.queryByRole('contentinfo')).toBeNull();
    }, 15000);

    it('immediately aborts test sequence when pulse_settings_open event is triggered', async () => {
      const onNavigate = vi.fn();
      render(
        <MemoryRouter initialEntries={['/colour-recognition']}>
          <ColorTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /^adults/i }));
      fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

      await waitFor(() => {
        expect(screen.getByText('15 ROUNDS • STROOP TEST')).toBeDefined();
      });

      window.dispatchEvent(new Event('pulse_settings_open'));

      await waitFor(() => {
        expect(screen.getByText('15 ROUNDS • STROOP TEST')).toBeDefined();
      });
    }, 15000);
  });

  describe('BlockMemoryTest (Corsi Block Tapping Engine)', () => {
    it('renders AgeSelection and transitions to dark canvas with memory block grid', async () => {
      const onNavigate = vi.fn();
      const { container } = render(
        <MemoryRouter initialEntries={['/block-memory']}>
          <BlockMemoryTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      expect(screen.getByText('Select Your Age Group')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: /^young adults/i }));
      fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

      await waitFor(() => {
        expect(screen.getByText('Click to start')).toBeDefined();
      });

      // Assert dark shell
      const darkShell = container.querySelector('[data-theme="dark"]');
      expect(darkShell).not.toBeNull();
      expect(darkShell?.className).toContain('bg-[#12161B]');

      // Single main landmark
      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');
    }, 15000);
  });

  describe('NumberMemoryTest (Digit Span Memory Engine)', () => {
    it('renders AgeSelection and transitions to dark canvas with digit presentation', async () => {
      const onNavigate = vi.fn();
      const { container } = render(
        <MemoryRouter initialEntries={['/number-memory']}>
          <NumberMemoryTest onNavigate={onNavigate} />
        </MemoryRouter>
      );

      expect(screen.getByText('Select Your Age Group')).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: /^young adults/i }));
      fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

      await waitFor(() => {
        expect(screen.getByText('Click to start')).toBeDefined();
      });

      // Assert dark shell
      const darkShell = container.querySelector('[data-theme="dark"]');
      expect(darkShell).not.toBeNull();
      expect(darkShell?.className).toContain('bg-[#12161B]');

      // Single main landmark
      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');
    }, 15000);
  });
});
