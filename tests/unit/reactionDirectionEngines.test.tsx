import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, createEvent, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { submitAssessmentResult } from '../../src/lib/firestore';
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
    vi.useRealTimers();
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

  it('submits unadjusted rounded latency and null timing offsets, including a pre-stimulus false start', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <ReactionTest onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /young adults/i }));
    fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The engine autostarts its three-second countdown after session initialization.
    expect(screen.getByText('Starting in 3')).toBeDefined();
    const stimulusArea = screen.getByRole('button', { name: /Reaction test stimulus area/i });

    const pointerDownAtNow = () => {
      const event = createEvent.pointerDown(stimulusArea);
      Object.defineProperty(event, 'timeStamp', { configurable: true, value: performance.now() });
      fireEvent(stimulusArea, event);
    };

    await act(async () => {
      pointerDownAtNow();
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByText('Wait for the flash...')).toBeDefined();

    // Deliberately trigger a pre-stimulus false start; it must have no response latency.
    pointerDownAtNow();
    expect(screen.getByText('False Start')).toBeDefined();
    pointerDownAtNow(); // Retry the same trial.

    const waitForStimulus = async () => {
      for (let tick = 0; tick < 190; tick++) {
        if (screen.queryByText('CLICK NOW!')) return;
        await act(async () => {
          await vi.advanceTimersByTimeAsync(16);
        });
      }
      throw new Error('Stimulus did not appear before the 3-second timeout');
    };

    const recordResponse = async () => {
      await waitForStimulus();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120);
      });
      pointerDownAtNow();
    };

    await recordResponse();
    for (let trial = 1; trial < 10; trial++) {
      pointerDownAtNow(); // Start the next trial.
      await recordResponse();
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(submitAssessmentResult)).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(submitAssessmentResult).mock.calls[0][0] as {
      assessmentType: string;
      trials: Array<Record<string, unknown>>;
    };
    expect(payload.assessmentType).toBe('visual-reaction');

    const preStimulusFalseStart = payload.trials.find(
      trial => trial.validity === 'FALSE_START_PRE_STIMULUS'
    );
    expect(preStimulusFalseStart).toMatchObject({
      reactionTime: null,
      reactionTimeMs: null,
      rawLatencyMs: null,
      rawReactionTime: null,
      displayDelayOffsetMs: null,
      displayDelayOffsetEstimated: null,
      displayDelayOffsetSource: null,
    });

    const measuredTrials = payload.trials.filter(
      trial => trial.falseStart !== true && trial.timedOut !== true
    );
    expect(measuredTrials).toHaveLength(10);
    for (const trial of payload.trials) {
      expect(trial.displayDelayOffsetMs).toBeNull();
      expect(trial.displayDelayOffsetEstimated).toBeNull();
      expect(trial.displayDelayOffsetSource).toBeNull();
    }
    for (const trial of measuredTrials) {
      const expectedLatency = Number((trial.rawReactionTime as number).toFixed(2));
      expect(trial.reactionTime).toBe(expectedLatency);
      expect(trial.reactionTimeMs).toBe(expectedLatency);
      expect(trial.rawLatencyMs).toBe(expectedLatency);
      expect(trial.rawReactionTime).toBe(expectedLatency);
    }
  }, 15000);

  it('submits unadjusted rounded Direction latency and null offsets, including a pre-stimulus false start', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/direction-test']}>
        <DirectionTest onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /young adults/i }));
    fireEvent.click(screen.getByRole('button', { name: /proceed to assessment/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Starting in 3')).toBeDefined();

    const advanceUntilText = async (matcher: RegExp, maxTicks = 420) => {
      for (let tick = 0; tick < maxTicks; tick++) {
        if (screen.queryByText(matcher)) return;
        await act(async () => {
          await vi.advanceTimersByTimeAsync(16);
        });
      }
      throw new Error(`Timed out waiting for Direction status: ${matcher}`);
    };

    // An arrow pressed while the stimulus is still waiting is recorded with no measured latency.
    await advanceUntilText(/^Wait$/);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByText('False start')).toBeDefined();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    for (let trial = 0; trial < 10; trial++) {
      await advanceUntilText(/Press the matching arrow/i);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120);
      });

      const response = createEvent.keyDown(window, { key: 'ArrowUp' });
      Object.defineProperty(response, 'timeStamp', {
        configurable: true,
        value: performance.now(),
      });
      fireEvent(window, response);

      if (trial < 9) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(800);
        });
      }
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(submitAssessmentResult)).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(submitAssessmentResult).mock.calls[0][0] as {
      assessmentType: string;
      trials: Array<Record<string, unknown>>;
    };
    expect(payload.assessmentType).toBe('direction');

    const preStimulusFalseStart = payload.trials.find(
      trial => trial.notes === 'premature_trigger_before_stimulus'
    );
    expect(preStimulusFalseStart).toMatchObject({
      reactionTime: null,
      rawReactionTime: null,
      displayDelayOffsetMs: null,
      displayDelayOffsetEstimated: null,
      displayDelayOffsetSource: null,
    });

    const measuredTrials = payload.trials.filter(
      trial => trial.falseStart !== true && trial.timedOut !== true
    );
    expect(measuredTrials).toHaveLength(10);
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
