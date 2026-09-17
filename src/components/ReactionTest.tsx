import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './Navbar';
import { AgeSelection } from './AgeSelection';
import { Activity, RefreshCw } from 'lucide-react';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { submitAssessmentResult, startExperimentSession, AgeGroup, VrtTrialObservation } from '../lib/firestore';
import { LeaderboardOptIn } from './LeaderboardOptIn';
import { AssessmentResultReward } from './AssessmentResultReward';
import { motion } from 'motion/react';
import { playAudioCue, triggerHaptic } from '../lib/settingsStore';

function seedPRNG(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    let z = (h += 0x6D2B79F5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
import { getCachedRefreshRate } from '../lib/refreshRateDetector';
import { useRefreshRate } from '../lib/useRefreshRate';
import { safeUUID } from '../lib/utils';
import { VRT_MIN_FOREPERIOD_MS, VRT_MAX_FOREPERIOD_MS, VRT_TIMEOUT_MS, VRT_MIN_VALID_RT_MS, generateVrtForeperiod, ForeperiodCategory } from '../lib/protocolValidators';
import { CountdownOverlay } from './CountdownOverlay';

type EngineState = 'READY' | 'STARTING' | 'AWAITING_STIMULUS' | 'STIMULUS_ACTIVE' | 'TRIAL_COMPLETE' | 'REPORT' | 'UNMOUNTED';

type TrialData = {
  trial: number;
  type: string;
  latency: number;
  rawLatency: number;
  falseStart: boolean;
  timedOut?: boolean;
};

const TOTAL_TRIALS = 10;
const MIN_DELAY = VRT_MIN_FOREPERIOD_MS;
const MAX_DELAY = VRT_MAX_FOREPERIOD_MS;


export function ReactionTest({ onNavigate }: { onNavigate: (view: string) => void }) {
  useRefreshRate();
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const rawObservationsRef = useRef<VrtTrialObservation[]>([]);
  const attemptNumberRef = useRef<number>(1);
  const sequenceNumberRef = useRef<number>(0);
  const scheduledForeperiodMsRef = useRef<number>(0);
  const scheduledForeperiodCategoryRef = useRef<ForeperiodCategory>('SHORT');
  const stimulusScheduledAtRef = useRef<number>(0);
  const stimulusPresentedAtRef = useRef<number>(0);
  const previousTrialEndedAtRef = useRef<number | null>(null);
  const previousStimulusPresentedAtRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);
   

  const [engineState, setEngineState] = useState<EngineState>('READY');

  const [currentTrial, setCurrentTrial] = useState(0);
  const [trialDataset, setTrialDataset] = useState<TrialData[]>([]); 
  const trialDatasetRef = useRef<any[]>([]);
  const [, setFalseStartsCount] = useState(0);
  const falseStartsCountRef = useRef(0);
  
  const [reportStats, setReportStats] = useState<any>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState<boolean | undefined>(undefined);
  
  const [statusMessage, setStatusMessage] = useState('Click to start');
  const [inputPrompt, setInputPrompt] = useState('');

  const timerRef = useRef<HTMLDivElement>(null);
  const timeStimulusFired = useRef<number>(0);
  const stimulusWallTimestamp = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const stimulusTimeout = useRef<NodeJS.Timeout | null>(null);
  const finalizeTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const engineStateRef = useRef<EngineState>('READY');
    
  // Sync state to ref for callbacks
  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  const initSession = useCallback(async (ageGroup: AgeGroup) => {
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await startExperimentSession('visual-reaction', ageGroup);
      if (res?.success && res?.sessionId) {
        setSessionId(res.sessionId);
        setIsSessionLoading(false);
      } else {
        const errorMsg = res?.error
          ? `(${res.status || 'Error'}): ${res.error}`
          : 'Failed to initialize authoritative experiment session.';
        setSessionError(errorMsg);
        setIsSessionLoading(false);
      }
    } catch (err: any) {
      setSessionError(err.message || 'Failed to initialize session. Please check your connection and retry.');
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedAgeGroup) return;
    initSession(selectedAgeGroup);
  }, [selectedAgeGroup, initSession]);

  useEffect(() => {
    

    
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    };
  }, []);

  
  const updateLiveTimer = useCallback(() => {
    if (engineStateRef.current === 'STIMULUS_ACTIVE') {
      const delta = performance.now() - timeStimulusFired.current;
      if (timerRef.current) {
        timerRef.current.textContent = delta.toFixed(1);
      }
      animationFrameId.current = requestAnimationFrame(updateLiveTimer);
    }
  }, []);

  const calculateAndFinalizeMetrics = (data: TrialData[]) => {
    const legalRuns = data.filter(t => !t.falseStart && !t.timedOut && (t.rawLatency ?? t.latency) >= 80 && (t.rawLatency ?? t.latency) < 3000).map(t => t.latency);
    const rawRuns = data.filter(t => !t.falseStart && !t.timedOut && (t.rawLatency !== undefined ? t.rawLatency : t.latency) >= 80 && (t.rawLatency !== undefined ? t.rawLatency : t.latency) < 3000).map(t => t.rawLatency !== undefined ? t.rawLatency : t.latency);
    const totalFalseStarts = falseStartsCountRef.current;

    let stats = {
      average: 0, rawAverage: 0, fastest: 0, slowest: 0, median: 0, stdDev: 0,
      consistency: 0, visualAvg: 0, totalFalseStarts: totalFalseStarts
    };

    if (legalRuns.length > 0) {
      stats.fastest = Math.min(...legalRuns);
      stats.slowest = Math.max(...legalRuns);
      const sum = legalRuns.reduce((a, b) => a + b, 0);
      stats.average = sum / legalRuns.length;

      const rawSum = rawRuns.reduce((a, b) => a + b, 0);
      stats.rawAverage = rawSum / rawRuns.length;

      const sorted = [...legalRuns].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

      // Unbiased sample variance (Bessel's correction N-1 for sample SD)
      const squareDiffs = legalRuns.map(l => Math.pow(l - stats.average, 2));
      const sampleVariance = legalRuns.length > 1
        ? squareDiffs.reduce((a, b) => a + b, 0) / (legalRuns.length - 1)
        : 0;
      stats.stdDev = Math.sqrt(sampleVariance);

      // Standard consistency score based on coefficient of variation (CV = SD / Mean)
      const cv = stats.average > 0 ? (stats.stdDev / stats.average) : 0;
      stats.consistency = Math.max(0, Math.min(100, Math.round(100 * Math.max(0, 1 - cv))));
    }

    setReportStats(stats);
    setEngineState('REPORT'); engineStateRef.current = 'REPORT';
    playAudioCue('milestone');
    triggerHaptic('milestone');
  };

  const fireStimulus = () => {
    setEngineState('STIMULUS_ACTIVE'); engineStateRef.current = 'STIMULUS_ACTIVE';
    const initialStimPerf = performance.now();
    timeStimulusFired.current = initialStimPerf;
    stimulusPresentedAtRef.current = initialStimPerf;
    stimulusWallTimestamp.current = Date.now();
    // High-resolution monotonic timing from paint frame callback
    requestAnimationFrame((paintTime) => {
      if (engineStateRef.current === 'STIMULUS_ACTIVE') {
        const accuratePaintTime = paintTime || performance.now();
        timeStimulusFired.current = accuratePaintTime;
        stimulusPresentedAtRef.current = accuratePaintTime;
      }
    });
    setStatusMessage('CLICK NOW!');
    setInputPrompt("");
    // Note: Stimulus cues are strictly visual to avoid multisensory reaction bias
    updateLiveTimer();

    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    stimulusTimeout.current = setTimeout(() => {
      if (engineStateRef.current === 'STIMULUS_ACTIVE') {
        interceptMissed();
      }
    }, 3000);
  };

  const startCountdown = () => {
    playAudioCue('click');
    triggerHaptic('tap');
    
    hasSubmittedRef.current = false;
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setSubmissionError(null);
    setTrialDataset([]); setCurrentTrial(0); setStatusMessage('Click to start'); setInputPrompt('Press spacebar or click to start'); setFalseStartsCount(0);
    setEngineState('STARTING'); engineStateRef.current = 'STARTING';
    setTrialDataset([]); trialDatasetRef.current = [];
    setFalseStartsCount(0); falseStartsCountRef.current = 0;
    setCurrentTrial(0);
    attemptNumberRef.current = 1;
    sequenceNumberRef.current = 0;
    previousTrialEndedAtRef.current = null;
    previousStimulusPresentedAtRef.current = null;
    rawObservationsRef.current = [];
    let count = 3;
    setStatusMessage(`Starting in ${count}`);
    if (timerRef.current) timerRef.current.textContent = "000.0";
    setInputPrompt('');
    
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    countdownInterval.current = setInterval(() => {
      count--;
      if (count > 0) {
        setStatusMessage(`Starting in ${count}`);
      } else {
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        startTrialSequence(false);
      }
    }, 1000);
  };

  const startTrialSequence = (isRetry: boolean) => {
    const nextTrial = isRetry ? currentTrial : currentTrial + 1;
    setCurrentTrial(nextTrial);
    
    if (nextTrial > TOTAL_TRIALS) {
      calculateAndFinalizeMetrics(trialDatasetRef.current);
      return;
    }

    if (isRetry) {
      attemptNumberRef.current += 1;
    } else {
      attemptNumberRef.current = 1;
    }
    sequenceNumberRef.current += 1;
    stimulusScheduledAtRef.current = performance.now();
    stimulusPresentedAtRef.current = 0;

    setEngineState('AWAITING_STIMULUS'); engineStateRef.current = 'AWAITING_STIMULUS';
    setStatusMessage('Wait for screen to turn white...');
    if (timerRef.current) timerRef.current.textContent = "000.0";
    setInputPrompt("HOLD POSITION... DO NOT TRIGGER");

    const prng = seedPRNG(`${sessionId || 'vrt'}-reaction-delays-t${nextTrial}-a${attemptNumberRef.current}`);
    const generated = generateVrtForeperiod(prng);
    scheduledForeperiodMsRef.current = Math.round(generated.foreperiodMs);
    scheduledForeperiodCategoryRef.current = generated.foreperiodCategory;
    
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    stimulusTimeout.current = setTimeout(() => {
      fireStimulus();
    }, scheduledForeperiodMsRef.current);
  };

  const interceptFalseStart = () => {
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
    setStatusMessage('False Start');
    if (timerRef.current) timerRef.current.textContent = "ERR";
    setInputPrompt("Triggered too soon! Click to try again");
    playAudioCue('error');
    triggerHaptic('error');

    falseStartsCountRef.current += 1;
    setFalseStartsCount(falseStartsCountRef.current);

    const now = Date.now();
    const nowPerf = performance.now();
    const prevTrialEnd = previousTrialEndedAtRef.current !== null ? Math.round(previousTrialEndedAtRef.current) : null;
    const iti = previousTrialEndedAtRef.current !== null ? Math.round(nowPerf - previousTrialEndedAtRef.current) : null;

    const obsIndex1 = rawObservationsRef.current.length + 1;
    // Record high-precision observation in memory
    rawObservationsRef.current.push({
      trialIndex: obsIndex1,
      attemptNumber: attemptNumberRef.current,
      sequenceNumber: obsIndex1,
      foreperiodMs: scheduledForeperiodMsRef.current,
      foreperiodCategory: scheduledForeperiodCategoryRef.current,
      stimulusScheduledAt: Math.round(stimulusScheduledAtRef.current),
      stimulusScheduledAtPerfMs: Number(stimulusScheduledAtRef.current.toFixed(2)),
      stimulusPresentedAt: null,
      stimulusPresentedAtPerfMs: null,
      responseDetectedAt: Math.round(nowPerf),
      responseDetectedAtPerfMs: Number(nowPerf.toFixed(2)),
      reactionTimeMs: null,
      reactionTime: null,
      rawLatencyMs: null,
      rawReactionTime: null,
      displayDelayOffsetMs: null,
      falseStart: true,
      timedOut: false,
      valid: false,
      validity: 'FALSE_START_PRE_STIMULUS',
      qualityFlag: 'PREMATURE_TRIGGER',
      previousTrialEndedAt: prevTrialEnd,
      interStimulusIntervalMs: null,
      interTrialIntervalMs: iti,
      stimulusWallTimestamp: null,
      stimulusTimestamp: null,
      responseWallTimestamp: now,
      responseTimestamp: now,
      timestamp: new Date().toISOString(),
      notes: 'premature_trigger_before_stimulus',
      sessionId: sessionId || '',
      experimentId: sessionId || '',
      condition: 'standard-visual',
      test: 'visual-reaction',
      trialNumber: currentTrial,
      accuracy: 0,
      ageGroup: selectedAgeGroup || undefined
    });

    previousTrialEndedAtRef.current = nowPerf;
  };

  const interceptMissed = () => {
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    
    setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
    setStatusMessage('Too Slow');
    if (timerRef.current) timerRef.current.textContent = ">3000";
    setInputPrompt("Too slow (>3.0s)! Click to try again");
    playAudioCue('error');
    triggerHaptic('error');

    const now = Date.now();
    const nowPerf = performance.now();
    const stimWall = stimulusWallTimestamp.current || (now - 3000);
    const stimPerf = stimulusPresentedAtRef.current || (nowPerf - 3000);
    const isi = previousStimulusPresentedAtRef.current ? Math.round(stimPerf - previousStimulusPresentedAtRef.current) : null;
    previousStimulusPresentedAtRef.current = stimPerf;
    const prevTrialEnd = previousTrialEndedAtRef.current !== null ? Math.round(previousTrialEndedAtRef.current) : null;
    const iti = previousTrialEndedAtRef.current !== null ? Math.round(nowPerf - previousTrialEndedAtRef.current) : null;

    const newDataset: TrialData[] = [...trialDatasetRef.current, {
      trial: currentTrial,
      type: 'visual',
      latency: 0,
      rawLatency: 0,
      falseStart: false,
      timedOut: true
    }];
    setTrialDataset(newDataset); trialDatasetRef.current = newDataset;

    const obsIndex2 = rawObservationsRef.current.length + 1;
    // Record in-memory timeout observation
    rawObservationsRef.current.push({
      trialIndex: obsIndex2,
      attemptNumber: attemptNumberRef.current,
      sequenceNumber: obsIndex2,
      foreperiodMs: scheduledForeperiodMsRef.current,
      foreperiodCategory: scheduledForeperiodCategoryRef.current,
      stimulusScheduledAt: Math.round(stimulusScheduledAtRef.current),
      stimulusScheduledAtPerfMs: Number(stimulusScheduledAtRef.current.toFixed(2)),
      stimulusPresentedAt: Math.round(stimPerf),
      stimulusPresentedAtPerfMs: Number(stimPerf.toFixed(2)),
      responseDetectedAt: null,
      responseDetectedAtPerfMs: null,
      reactionTimeMs: null,
      reactionTime: null,
      rawLatencyMs: null,
      rawReactionTime: null,
      displayDelayOffsetMs: null,
      falseStart: false,
      timedOut: true,
      valid: false,
      validity: 'TIMEOUT',
      qualityFlag: 'TIMEOUT_EXCEEDED',
      previousTrialEndedAt: prevTrialEnd,
      interStimulusIntervalMs: isi,
      interTrialIntervalMs: iti,
      stimulusWallTimestamp: stimWall,
      stimulusTimestamp: stimWall,
      responseWallTimestamp: null,
      responseTimestamp: null,
      timestamp: new Date().toISOString(),
      notes: 'timeout_exceeded_3000ms',
      sessionId: sessionId || '',
      experimentId: sessionId || '',
      condition: 'standard-visual',
      test: 'visual-reaction',
      trialNumber: currentTrial,
      accuracy: 0,
      ageGroup: selectedAgeGroup || undefined
    });

    previousTrialEndedAtRef.current = nowPerf;
  };

  const captureLatency = (e?: any) => {
    // High-resolution event timestamp for sub-millisecond precision
    const timeTriggered = (e && typeof e.timeStamp === 'number' && e.timeStamp > 0)
      ? e.timeStamp
      : performance.now();
    
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);

    const stimPerf = stimulusPresentedAtRef.current || timeStimulusFired.current;
    const rawLatency = Math.max(0, timeTriggered - stimPerf);
    const offsetMs = getCachedRefreshRate()?.displayDelayOffsetMs || 0;
    const netLatency = Math.max(0, Number((rawLatency - offsetMs).toFixed(2)));

    // Ensure timing-domain consistency: responseTimestamp = stimulusTimestamp + Math.round(rawLatency)
    const nowWall = Date.now();
    const stimWall = stimulusWallTimestamp.current || (nowWall - Math.round(rawLatency));
    const responseWallTime = stimWall + Math.round(rawLatency);

    const isi = previousStimulusPresentedAtRef.current ? Math.round(stimPerf - previousStimulusPresentedAtRef.current) : null;
    previousStimulusPresentedAtRef.current = stimPerf;
    const prevTrialEnd = previousTrialEndedAtRef.current !== null ? Math.round(previousTrialEndedAtRef.current) : null;
    const iti = previousTrialEndedAtRef.current !== null ? Math.round(timeTriggered - previousTrialEndedAtRef.current) : null;

    if (rawLatency >= 3000) {
      interceptMissed();
      return;
    }

    // Physiological RT threshold check (visual reaction times < 80ms are anticipatory guesses)
    if (rawLatency < 80) {
      setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
      setStatusMessage('False Start');
      if (timerRef.current) timerRef.current.textContent = `${rawLatency.toFixed(0)}ms`;
      setInputPrompt("Anticipatory reaction (<80ms). Click to try again");
      playAudioCue('error');
      triggerHaptic('error');

      falseStartsCountRef.current += 1;
      setFalseStartsCount(falseStartsCountRef.current);

      const obsIndex3 = rawObservationsRef.current.length + 1;
      rawObservationsRef.current.push({
        trialIndex: obsIndex3,
        attemptNumber: attemptNumberRef.current,
        sequenceNumber: obsIndex3,
        foreperiodMs: scheduledForeperiodMsRef.current,
        foreperiodCategory: scheduledForeperiodCategoryRef.current,
        stimulusScheduledAt: Math.round(stimulusScheduledAtRef.current),
        stimulusScheduledAtPerfMs: Number(stimulusScheduledAtRef.current.toFixed(2)),
        stimulusPresentedAt: Math.round(stimPerf),
        stimulusPresentedAtPerfMs: Number(stimPerf.toFixed(2)),
        responseDetectedAt: Math.round(timeTriggered),
        responseDetectedAtPerfMs: Number(timeTriggered.toFixed(2)),
        reactionTimeMs: netLatency,
        reactionTime: netLatency,
        rawLatencyMs: Number(rawLatency.toFixed(2)),
        rawReactionTime: Number(rawLatency.toFixed(2)),
        displayDelayOffsetMs: offsetMs,
        falseStart: true,
        timedOut: false,
        valid: false,
        validity: 'ANTICIPATORY_TOO_FAST',
        qualityFlag: 'ANTICIPATORY_RT',
        previousTrialEndedAt: prevTrialEnd,
        interStimulusIntervalMs: isi,
        interTrialIntervalMs: iti,
        stimulusWallTimestamp: stimWall,
        stimulusTimestamp: stimWall,
        responseWallTimestamp: responseWallTime,
        responseTimestamp: responseWallTime,
        timestamp: new Date().toISOString(),
        notes: 'anticipatory_response_<80ms',
        sessionId: sessionId || '',
        experimentId: sessionId || '',
        condition: 'standard-visual',
        test: 'visual-reaction',
        trialNumber: currentTrial,
        accuracy: 0,
        ageGroup: selectedAgeGroup || undefined
      });
      previousTrialEndedAtRef.current = timeTriggered;
      return;
    }

    setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
    if (timerRef.current) timerRef.current.textContent = netLatency.toFixed(1);
    
    setStatusMessage('Good job!');
    setInputPrompt(currentTrial < TOTAL_TRIALS ? "Click to continue" : "Click to see your score");
    playAudioCue('success');
    triggerHaptic('success');

    const newDataset: TrialData[] = [...trialDatasetRef.current, {
      trial: currentTrial,
      type: 'visual',
      latency: netLatency,
      rawLatency: Number(rawLatency.toFixed(2)),
      falseStart: false,
      timedOut: false
    }];
    setTrialDataset(newDataset); trialDatasetRef.current = newDataset;

    const obsIndex4 = rawObservationsRef.current.length + 1;
    // Record in-memory valid response observation
    rawObservationsRef.current.push({
      trialIndex: obsIndex4,
      attemptNumber: attemptNumberRef.current,
      sequenceNumber: obsIndex4,
      foreperiodMs: scheduledForeperiodMsRef.current,
      foreperiodCategory: scheduledForeperiodCategoryRef.current,
      stimulusScheduledAt: Math.round(stimulusScheduledAtRef.current),
      stimulusScheduledAtPerfMs: Number(stimulusScheduledAtRef.current.toFixed(2)),
      stimulusPresentedAt: Math.round(stimPerf),
      stimulusPresentedAtPerfMs: Number(stimPerf.toFixed(2)),
      responseDetectedAt: Math.round(timeTriggered),
      responseDetectedAtPerfMs: Number(timeTriggered.toFixed(2)),
      reactionTimeMs: netLatency,
      reactionTime: netLatency,
      rawLatencyMs: Number(rawLatency.toFixed(2)),
      rawReactionTime: Number(rawLatency.toFixed(2)),
      displayDelayOffsetMs: offsetMs,
      falseStart: false,
      timedOut: false,
      valid: true,
      validity: 'VALID',
      qualityFlag: null,
      previousTrialEndedAt: prevTrialEnd,
      interStimulusIntervalMs: isi,
      interTrialIntervalMs: iti,
      stimulusWallTimestamp: stimWall,
      stimulusTimestamp: stimWall,
      responseWallTimestamp: responseWallTime,
      responseTimestamp: responseWallTime,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || '',
      experimentId: sessionId || '',
      condition: 'standard-visual',
      test: 'visual-reaction',
      trialNumber: currentTrial,
      accuracy: 1,
      ageGroup: selectedAgeGroup || undefined
    });

    previousTrialEndedAtRef.current = timeTriggered;

    if (currentTrial === TOTAL_TRIALS) {
      if (finalizeTimeout.current) clearTimeout(finalizeTimeout.current);
      finalizeTimeout.current = setTimeout(() => {
        if (engineStateRef.current !== 'UNMOUNTED') {
          calculateAndFinalizeMetrics(newDataset);
        }
      }, 800);
    }
  };

  const executeTrigger = (e?: any) => {
    if (engineStateRef.current === 'READY') {
      if (isSessionLoading || !sessionId) return;
      startCountdown();
    } else if (engineStateRef.current === 'AWAITING_STIMULUS') {
      interceptFalseStart();
    } else if (engineStateRef.current === 'STIMULUS_ACTIVE') {
      captureLatency(e);
    } else if (engineStateRef.current === 'TRIAL_COMPLETE') {
      const isError = statusMessage === 'False Start' || statusMessage === 'Too Slow';
      if (!isError && currentTrial >= TOTAL_TRIALS) {
        if (finalizeTimeout.current) clearTimeout(finalizeTimeout.current);
        calculateAndFinalizeMetrics(trialDatasetRef.current);
        return;
      }
      startTrialSequence(isError);
    }
  };

  const executeTriggerRef = useRef(executeTrigger);
  executeTriggerRef.current = executeTrigger;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        executeTriggerRef.current(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // MOUNT AUTOSTART
  useEffect(() => {
    if (!selectedAgeGroup || !sessionId) return;
    if (engineStateRef.current === 'READY' || engineStateRef.current === 'UNMOUNTED') {
      engineStateRef.current = 'READY';
      startCountdown();
    }
    return () => {
      engineStateRef.current = 'UNMOUNTED';
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
      if (finalizeTimeout.current) clearTimeout(finalizeTimeout.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [selectedAgeGroup, sessionId]);

  let apparatusClass = "w-[90%] max-w-[800px] h-[450px] bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-colors duration-150 touch-none select-none";
  let timerClass = "font-mono font-bold tracking-tight leading-none mb-3 transition-colors duration-100 ease-out text-[clamp(3.5rem,8vw,5.5rem)] text-[var(--text-muted)]";
  let statusClass = "text-sm font-medium tracking-normal transition-colors duration-100 ease-out text-[var(--text-muted)] whitespace-pre-line";

  if (engineState === 'STARTING') {
    apparatusClass += " !border-[var(--border-default)]";
    statusClass += " !text-[var(--text-primary)]";
  } else if (engineState === 'AWAITING_STIMULUS') {
    apparatusClass += " !border-amber-500/40";
    statusClass += " !text-amber-400";
  } else if (engineState === 'STIMULUS_ACTIVE') {
    apparatusClass += " !bg-[#ffffff] !border-[#ffffff]";
    timerClass += " !text-[#000000]";
    statusClass += " !text-[#000000] !font-bold";
  } else if (engineState === 'TRIAL_COMPLETE') {
    const isError = statusMessage === 'False Start' || statusMessage === 'Too Slow';
    if (isError) {
      apparatusClass += " !border-[var(--color-error)] animate-[hardwareShake_0.4s_cubic-bezier(.36,.07,.19,.97)_both]";
      timerClass += " !text-[var(--color-error)]";
      statusClass += " !text-[var(--color-error)]";
    } else {
      apparatusClass += " !border-[var(--color-success)]";
      timerClass += " !text-[var(--color-success)]";
      statusClass += " !text-[var(--color-success)]";
    }
  }

  const chartData = useMemo(() => {
    return trialDataset.filter(t => !t.falseStart).map((t, idx) => ({
      name: `T${idx + 1}`,
      latency: Math.round(t.latency)
    }));
  }, [trialDataset]);

  const attemptSubmission = useCallback(() => {
    if (!reportStats || !selectedAgeGroup || !sessionId || isSubmittingRef.current || hasSubmittedRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    if (reportStats.average === 0) {
      setSubmissionError('Assessment non-submittable: Zero valid responses recorded.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    setSubmissionError(null);
    
    submitAssessmentResult({
        idempotencyKey: sessionId,
        ageGroup: selectedAgeGroup,
        assessmentType: 'visual-reaction',
        averageReactionTime: reportStats.average,
        fastestReactionTime: reportStats.fastest,
        slowestReactionTime: reportStats.slowest,
        medianReactionTime: reportStats.median,
        consistency: reportStats.consistency,
        totalFalseStarts: reportStats.totalFalseStarts,
        trials: rawObservationsRef.current
      }).then(res => {
      if (!res || !res.success) {
        setSubmissionError(res?.error || 'Synchronization failed. Please try again.');
      } else {
        hasSubmittedRef.current = true;
        if (res.derivedMetrics) {
          setReportStats(prev => prev ? {
            ...prev,
            average: res.derivedMetrics.averageReactionTime ?? prev.average,
            fastest: res.derivedMetrics.fastestReactionTime ?? prev.fastest,
            slowest: res.derivedMetrics.slowestReactionTime ?? prev.slowest,
            median: res.derivedMetrics.medianReactionTime ?? prev.median,
            consistency: res.derivedMetrics.consistency ?? prev.consistency,
            totalFalseStarts: res.derivedMetrics.totalFalseStarts ?? prev.totalFalseStarts
          } : prev);
        }
        if (typeof res.isNewPersonalBest === 'boolean') {
          setIsNewPersonalBest(res.isNewPersonalBest);
        }
      }
    }).catch(err => {
      console.error("Failed to submit result:", err);
      setSubmissionError(err.message || 'Synchronization failed. Please try again.');
    }).finally(() => {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    });
  }, [reportStats, selectedAgeGroup, sessionId]);

  useEffect(() => {
    if (engineState === 'REPORT' && reportStats && selectedAgeGroup && sessionId && !hasSubmittedRef.current) {
      attemptSubmission();
    }
  }, [engineState, reportStats, selectedAgeGroup, sessionId, attemptSubmission]);

  useEffect(() => {
    const handleSettingsOpen = () => {
      // If a test is running, abort it to prevent timers from firing behind the modal
      if (engineStateRef.current !== 'READY' && engineStateRef.current !== 'REPORT') {
        if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        if (finalizeTimeout.current) clearTimeout(finalizeTimeout.current);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        setStatusMessage('TEST INTERRUPTED');
        setInputPrompt('Settings opened. Click to restart.');
        setEngineState('READY');
        engineStateRef.current = 'READY';
      }
    };
    window.addEventListener('pulse_settings_open', handleSettingsOpen);
    return () => window.removeEventListener('pulse_settings_open', handleSettingsOpen);
  }, []);

  if (!selectedAgeGroup) {
    return <AgeSelection onSelect={setSelectedAgeGroup} onCancel={() => onNavigate('assessments')} />;
  }

  if (sessionError) {
    return (
      <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col select-none">
        <Navbar currentView="reaction-test" onNavigate={onNavigate} onBack={() => onNavigate('assessments')} />
        <main className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--color-error)]/30 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] flex items-center justify-center font-bold text-xl">!</div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Session Initialization Failed</h2>
            <p className="text-sm text-[var(--text-muted)]">{sessionError}</p>
            <button
              onClick={() => initSession(selectedAgeGroup)}
              className="px-6 py-2.5 rounded-xl bg-[var(--cyan-primary)] text-black font-semibold hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Retry Connection
            </button>
          </div>
        </main>
      </div>
    );
  }
return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col select-none">
      <Navbar 
        currentView="reaction-test" 
        onNavigate={onNavigate} 
        onBack={() => onNavigate('assessments')}
      />
      
      <main 
        className="flex-1 w-full relative flex flex-col items-center justify-center overflow-y-auto bg-transparent py-4 pb-safe px-safe"
        style={{ 
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))'
        }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes hardwareShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
        `}</style>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex flex-col items-center justify-center relative flex-1"
        >
          <div className="absolute top-0 left-0 w-full h-[4px] bg-white/5 overflow-hidden">
          <div 
            className="w-full h-full bg-[var(--cyan-primary)] origin-left transition-transform duration-300 ease-out" 
            style={{ transform: `scaleX(${Math.min(1, currentTrial / TOTAL_TRIALS)})` }}
          ></div>
        </div>

        {engineState !== 'REPORT' && (
          <div className="w-full max-w-[800px] flex flex-col items-center gap-4 z-30 px-4 mb-8">
            <div className="font-mono text-[0.75rem] text-[#8b9bb466] tracking-[2px] uppercase text-center w-full animate-[fadeIn_0.5s_ease-out] min-h-[1.5rem]">
              {isSessionLoading ? 'INITIALIZING AUTHORITATIVE SESSION...' : inputPrompt}
            </div>
            <div className="flex justify-center items-center font-mono text-[0.85rem] text-[var(--text-muted)] animate-[fadeIn_0.5s_ease-out]">
              <div className="tracking-[1px]">TRIAL: <span className="text-white">{currentTrial}</span> / {TOTAL_TRIALS}</div>
            </div>
          </div>
        )}

        {engineState === 'REPORT' && reportStats ? (
          <div className="w-full max-w-lg z-10">
            <AssessmentResultReward
              score={reportStats.average}
              unit="ms"
              assessmentType="visual-reaction"
              title="Visual Reaction"
              isLowerBetter={true}
              isNewPersonalBest={isNewPersonalBest}
              supportingMetrics={[
                { label: 'Average RT', value: reportStats.average.toFixed(1), unit: 'ms' },
                { label: 'Fastest RT', value: reportStats.fastest.toFixed(1), unit: 'ms' },
                { label: 'Slowest RT', value: reportStats.slowest.toFixed(1), unit: 'ms' },
                { label: 'Median RT', value: reportStats.median.toFixed(1), unit: 'ms' },
                { label: 'Consistency', value: reportStats.consistency, unit: '%' },
                { label: 'False Starts', value: reportStats.totalFalseStarts }
              ]}
              submissionError={submissionError}
              onRetrySubmission={attemptSubmission}
              isSubmitting={isSubmitting}
              nextAssessmentName="Next: Direction"
              onRetry={() => {
                setReportStats(null);
                setSessionId(null);
                setSelectedAgeGroup(null);
                rawObservationsRef.current = [];
                setEngineState('READY');
                isSubmittingRef.current = false;
                hasSubmittedRef.current = false;
                setIsNewPersonalBest(undefined);
                setTrialDataset([]);
                setCurrentTrial(0);
                setStatusMessage('Click to start');
                setInputPrompt('Press spacebar or click to start');
                setFalseStartsCount(0);
                if (typeof timerRef !== 'undefined' && timerRef.current) timerRef.current.textContent = '000.0';
              }}
              onNext={() => onNavigate('direction-test')}
              onViewLeaderboard={() => onNavigate('leaderboard')}
            >
              {!submissionError && hasSubmittedRef.current && reportStats && sessionId && (
                <LeaderboardOptIn 
                  assessmentType="visual-reaction"
                  scoreMetric={reportStats.average}
                  ageGroup={selectedAgeGroup}
                  sessionId={sessionId}
                  idempotencyKey={sessionId}
                  trials={rawObservationsRef.current}
                />
              )}
            </AssessmentResultReward>
          </div>
        ) : (
          <div className={apparatusClass} onPointerDown={(e) =>

 { e.preventDefault(); executeTrigger(e.nativeEvent); }}>
            {engineState === 'STARTING' && statusMessage.match(/Starting in (\d)/) && (
              <CountdownOverlay count={parseInt(statusMessage.match(/Starting in (\d)/)?.[1] || '3', 10)} />
            )}

            <div className="text-center pointer-events-none">
              <div className={timerClass} ref={timerRef}>000.0</div>
              <div className={statusClass}>{statusMessage}</div>
            </div>
            
          </div>
        )}
        </motion.div>
      </main>
    </div>
  );
}
