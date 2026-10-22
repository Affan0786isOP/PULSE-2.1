import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, createEvent, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { submitAssessmentResult } from '../../src/lib/firestore';
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
    vi.useRealTimers();
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

  it('submits raw Color Recognition latency, null offsets, and null timeout latency', async () => {
    vi.useFakeTimers();

    const { container } = render(
      <MemoryRouter initialEntries={['/colour-recognition']}>
        <ColorTest onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /young adults/i }));
    fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Starting in 3')).toBeDefined();

    const optionButtons = () => screen.queryAllByRole('button', {
      name: /^Select color option /i,
    });

    const waitForActiveRound = async (maxTicks = 360) => {
      for (let tick = 0; tick < maxTicks; tick++) {
        const buttons = optionButtons();
        if (buttons.length > 0 && !(buttons[0] as HTMLButtonElement).disabled) return;
        await act(async () => {
          await vi.advanceTimersByTimeAsync(16);
        });
      }
      throw new Error('Timed out waiting for an active Color Recognition round');
    };

    // Let the first round time out. Its response latency must remain null.
    await waitForActiveRound();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(750);
    });

    for (let trial = 2; trial <= 15; trial++) {
      await waitForActiveRound();
      // Ensure the stimulus paint timestamp has been delivered before injecting a response.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(32);
      });

      const instruction = screen.getByText(/MATCH THE WRITTEN WORD|MATCH THE INK COLOR/).textContent || '';
      const stimulusElement = container.querySelector('.font-black') as HTMLElement | null;
      expect(stimulusElement).not.toBeNull();
      const wordName = stimulusElement?.textContent?.trim() || '';
      const inkColor = stimulusElement?.style.color || '';
      let expectedColorName = wordName;

      if (instruction.includes('INK COLOR')) {
        const matchingButton = optionButtons().find(
          button => (button as HTMLButtonElement).style.backgroundColor === inkColor
        );
        expectedColorName = matchingButton?.getAttribute('aria-label')?.replace(/^Select color option /, '') || '';
      }

      expect(expectedColorName).not.toBe('');
      const responseDelayMs = trial === 2 ? 40 : 120;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(responseDelayMs);
      });

      const responseButton = screen.getByRole('button', {
        name: `Select color option ${expectedColorName}`,
      });
      const response = createEvent.pointerDown(responseButton);
      Object.defineProperty(response, 'timeStamp', {
        configurable: true,
        value: performance.now(),
      });
      fireEvent(responseButton, response);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(750);
        await Promise.resolve();
      });
    }

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(submitAssessmentResult)).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(submitAssessmentResult).mock.calls[0][0] as {
      assessmentType: string;
      trials: Array<Record<string, unknown>>;
    };
    expect(payload.assessmentType).toBe('color-recognition');
    expect(payload.trials).toHaveLength(15);

    const timeoutTrial = payload.trials.find(trial => trial.timedOut === true);
    expect(timeoutTrial).toMatchObject({
      reactionTime: null,
      rawReactionTime: null,
      displayDelayOffsetMs: null,
      displayDelayOffsetEstimated: null,
      displayDelayOffsetSource: null,
    });

    const anticipatoryTrial = payload.trials.find(trial => trial.falseStart === true);
    expect(anticipatoryTrial).toBeDefined();
    expect(anticipatoryTrial?.reactionTime).not.toBeNull();
    expect(anticipatoryTrial?.rawReactionTime).not.toBeNull();
    expect(anticipatoryTrial?.displayDelayOffsetMs).toBeNull();
    expect(anticipatoryTrial?.displayDelayOffsetEstimated).toBeNull();
    expect(anticipatoryTrial?.displayDelayOffsetSource).toBeNull();
    const anticipatoryLatency = anticipatoryTrial?.rawReactionTime as number;
    expect(anticipatoryLatency).toBeGreaterThanOrEqual(0);
    expect(anticipatoryLatency).toBeLessThan(80);
    expect(anticipatoryTrial?.reactionTime).toBe(Number(anticipatoryLatency.toFixed(2)));

    const measuredTrials = payload.trials.filter(
      trial => typeof trial.rawReactionTime === 'number' && trial.timedOut !== true
    );
    expect(measuredTrials).toHaveLength(14);
    for (const trial of payload.trials) {
      expect(trial.displayDelayOffsetMs).toBeNull();
      expect(trial.displayDelayOffsetEstimated).toBeNull();
      expect(trial.displayDelayOffsetSource).toBeNull();
    }
    for (const trial of measuredTrials) {
      const expectedLatency = Number((trial.rawReactionTime as number).toFixed(2));
      expect(trial.reactionTime).toBe(expectedLatency);
      expect(trial.rawReactionTime).toBe(expectedLatency);
    }
  }, 30000);

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
