import { motion } from 'motion/react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './Navbar';
import { AgeSelection } from './AgeSelection';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Activity, RefreshCw } from 'lucide-react';
import { submitAssessmentResult, startExperimentSession, AgeGroup } from '../lib/firestore';
import { LeaderboardOptIn } from './LeaderboardOptIn';
import { AssessmentResultReward } from './AssessmentResultReward';
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
import { CountdownOverlay } from './CountdownOverlay';

type EngineState = 'READY' | 'STARTING' | 'AWAITING_STIMULUS' | 'STIMULUS_ACTIVE' | 'TRIAL_COMPLETE' | 'REPORT' | 'UNMOUNTED';

type TrialData = {
  trial: number;
  directionShown: string;
  userResponse: string | null;
  latency: number | null;
  rawLatency?: number | null;
  falseStart: boolean;
  correct: boolean;
  timedOut?: boolean;
};

const TOTAL_TRIALS = 10;
const MIN_DELAY = 1000;
const MAX_DELAY = 3000;
const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];


export function DirectionTest({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
   
  const rawObservationsRef = useRef<any[]>([]);
  const attemptNumberRef = useRef<number>(1);
  const sequenceNumberRef = useRef<number>(0);
  const hasSubmittedRef = useRef(false);

  const [engineState, setEngineState] = useState<EngineState>('READY');

  const [currentTrial, setCurrentTrial] = useState(0);
  const currentTrialRef = useRef(0);
  const [trialDataset, setTrialDataset] = useState<TrialData[]>([]); 
  const trialDatasetRef = useRef<TrialData[]>([]);
  const [, setFalseStartsCount] = useState(0);
  const falseStartsCountRef = useRef(0);
  const [currentDirection, setCurrentDirection] = useState<string>('UP');
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
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const engineStateRef = useRef<EngineState>('READY');
  
  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  const initSession = useCallback(async (age: AgeGroup) => {
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await startExperimentSession('direction', age);
      if (res?.success && res?.sessionId) {
        setSessionId(res.sessionId);
      } else {
        const errorMsg = res?.error
          ? `(${res.status || 'Error'}): ${res.error}`
          : 'Failed to initialize authoritative experiment session.';
        setSessionError(errorMsg);
      }
    } catch (err: any) {
      console.error('Session init error:', err);
      setSessionError(err.message || 'Session initialization error.');
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedAgeGroup) return;
    initSession(selectedAgeGroup);
  }, [selectedAgeGroup, initSession]);



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
    const validTrials = data.filter(t => {
      const rawLt = (t.rawLatency !== undefined && t.rawLatency !== null) ? t.rawLatency : t.latency;
      return !t.falseStart && !t.timedOut && rawLt !== null && rawLt >= 80 && rawLt < 3000;
    });
    const correctTrials = validTrials.filter(t => t.correct && t.userResponse !== null);
    const validRuns = correctTrials.map(t => t.latency);
    const rawValidRuns = correctTrials.map(t => t.rawLatency !== undefined ? t.rawLatency : t.latency);
    const totalCorrect = correctTrials.length;
    const totalFalseStarts = data.filter(t => t.falseStart).length;

    let stats = {
      average: 0,
      rawAverage: 0,
      fastest: 0,
      slowest: 0,
      median: 0,
      accuracy: 0,
      totalCorrect,
      totalFalseStarts,
    };

    if (validRuns.length > 0) {
      stats.fastest = Math.min(...validRuns);
      stats.slowest = Math.max(...validRuns);
      const sum = validRuns.reduce((a, b) => a + b, 0);
      stats.average = sum / validRuns.length;

      const rawSum = rawValidRuns.reduce((a, b) => a + b, 0);
      stats.rawAverage = rawSum / rawValidRuns.length;

      const sorted = [...validRuns].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      stats.median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    stats.accuracy = validTrials.length > 0 ? Math.round(((totalCorrect / validTrials.length) * 100.0) * 100) / 100 : 0;

    setReportStats(stats);
    setEngineState('REPORT'); engineStateRef.current = 'REPORT';
    playAudioCue('milestone');
    triggerHaptic('milestone');
  };

  const fireStimulus = () => {
    setEngineState('STIMULUS_ACTIVE'); engineStateRef.current = 'STIMULUS_ACTIVE';
    timeStimulusFired.current = performance.now();
    stimulusWallTimestamp.current = Date.now();
    // High-resolution monotonic timing from paint frame callback
    requestAnimationFrame((paintTime) => {
      if (engineStateRef.current === 'STIMULUS_ACTIVE') {
        timeStimulusFired.current = paintTime || performance.now();
      }
    });
    
    setStatusMessage('Press Arrow or Tap Button Now!');
    setInputPrompt("");
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    updateLiveTimer();

    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    stimulusTimeout.current = setTimeout(() => {
      if (engineStateRef.current === 'STIMULUS_ACTIVE') {
        interceptMissed();
      }
    }, 3000);
  };

  const interceptMissed = () => {
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
    setStatusMessage('Too Slow');
    if (timerRef.current) timerRef.current.textContent = ">3000";
    setInputPrompt("Too slow (>3.0s)!");
    playAudioCue('error');
    triggerHaptic('error');

    const now = Date.now();
    const stimTime = stimulusWallTimestamp.current || (now - 3000);

    const newDataset: TrialData[] = [...trialDatasetRef.current, {
      trial: currentTrialRef.current,
      directionShown: currentDirection,
      userResponse: null,
      latency: null,
      rawLatency: null,
      falseStart: false,
      correct: false,
      timedOut: true
    }];
    setTrialDataset(newDataset);
    trialDatasetRef.current = newDataset;

    const obsIndex1 = rawObservationsRef.current.length + 1;
    rawObservationsRef.current.push({
      trialIndex: obsIndex1,
      attemptNumber: attemptNumberRef.current,
      sequenceNumber: obsIndex1,
      experimentId: sessionId,
      condition: `arrow-${currentDirection.toLowerCase()}`,
      test: 'direction',
      trialNumber: currentTrialRef.current,
      targetDirection: currentDirection.toLowerCase(),
      userResponse: null,
      stimulusTimestamp: stimTime,
      responseTimestamp: null,
      reactionTime: null,
      rawReactionTime: null,
      accuracy: 0,
      falseStart: false,
      timedOut: true,
      valid: false,
      ageGroup: selectedAgeGroup || undefined,
      notes: 'timeout_exceeded_3000ms'
    });
  };

  const startCountdown = () => {
    if (!sessionId) return;
    hasSubmittedRef.current = false;
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setSubmissionError(null);
    setEngineState('STARTING'); engineStateRef.current = 'STARTING';
    setTrialDataset([]); trialDatasetRef.current = [];
    rawObservationsRef.current = [];
    setFalseStartsCount(0); falseStartsCountRef.current = 0;
    currentTrialRef.current = 0;
    setCurrentTrial(0);
    attemptNumberRef.current = 1;
    sequenceNumberRef.current = 0;
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
        startTrialSequence();
      }
    }, 1000);
  };

  const startTrialSequence = (isRetry = false) => {
    const nextTrial = isRetry ? currentTrialRef.current : currentTrialRef.current + 1;
    currentTrialRef.current = nextTrial;
    setCurrentTrial(nextTrial);

    if (isRetry) {
      attemptNumberRef.current += 1;
    } else {
      attemptNumberRef.current = 1;
    }
    sequenceNumberRef.current += 1;
    
    if (nextTrial > TOTAL_TRIALS) {
      calculateAndFinalizeMetrics(trialDatasetRef.current);
      return;
    }

    setEngineState('STARTING'); engineStateRef.current = 'STARTING';
    setStatusMessage('Initializing...');
    if (timerRef.current) timerRef.current.textContent = "000.0";
    setInputPrompt("Click to start");

    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    stimulusTimeout.current = setTimeout(() => {
      setEngineState('AWAITING_STIMULUS'); engineStateRef.current = 'AWAITING_STIMULUS';
      setStatusMessage('Wait for arrow...');
      setInputPrompt("HOLD POSITION... DO NOT TRIGGER");

      const prng = seedPRNG(sessionId + "-direction-" + (currentTrialRef.current - 1));
      const windowDelay = prng() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
      const nextDir = DIRECTIONS[Math.floor(prng() * DIRECTIONS.length)];
      setCurrentDirection(nextDir);

      stimulusTimeout.current = setTimeout(() => {
        fireStimulus();
      }, windowDelay);
    }, 250);
  };

  const interceptFalseStart = (dir: string) => {
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
    setStatusMessage('False Start');
    if (timerRef.current) timerRef.current.textContent = "ERR";
    setInputPrompt("Too soon! Click to try this trial again");
    playAudioCue('error');
    triggerHaptic('error');

    falseStartsCountRef.current += 1;
    setFalseStartsCount(falseStartsCountRef.current);

    const obsIndex2 = rawObservationsRef.current.length + 1;
    rawObservationsRef.current.push({
      trialIndex: obsIndex2,
      attemptNumber: attemptNumberRef.current,
      sequenceNumber: obsIndex2,
      experimentId: sessionId,
      condition: `arrow-${currentDirection.toLowerCase()}`,
      test: 'direction',
      trialNumber: currentTrialRef.current,
      stimulusTimestamp: null,
      responseTimestamp: Date.now(),
      reactionTime: 0,
      accuracy: 0,
      falseStart: true,
      timedOut: false,
      valid: false,
      ageGroup: selectedAgeGroup || undefined,
      notes: 'premature_trigger_before_stimulus'
    });
  };

  const captureResponse = (dir: string, e?: any) => {
    const timeTriggered = (e && typeof e.timeStamp === 'number' && e.timeStamp > 0)
      ? e.timeStamp
      : performance.now();
    
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);

    const rawLatency = Math.max(0, timeTriggered - timeStimulusFired.current);
    const offsetMs = getCachedRefreshRate()?.displayDelayOffsetMs || 0;
    const netLatency = Math.max(0, Number((rawLatency - offsetMs).toFixed(2)));

    const stimWall = stimulusWallTimestamp.current || (Date.now() - Math.round(rawLatency));
    const responseWallTime = stimWall + Math.round(rawLatency);

    // Physiological RT threshold check (choice reaction times < 80ms are anticipatory guesses)
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
        experimentId: sessionId,
        condition: `arrow-${currentDirection.toLowerCase()}`,
        test: 'direction',
        trialNumber: currentTrialRef.current,
        stimulusTimestamp: stimWall,
        responseTimestamp: responseWallTime,
        reactionTime: netLatency,
        rawReactionTime: Number(rawLatency.toFixed(2)),
        displayDelayOffsetMs: offsetMs,
        accuracy: 0,
        falseStart: true,
        timedOut: false,
        valid: false,
        ageGroup: selectedAgeGroup || undefined,
        notes: 'anticipatory_response_<80ms'
      });
      return;
    }

    setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
    if (timerRef.current) timerRef.current.textContent = netLatency.toFixed(1);
    
    const isCorrect = dir === currentDirection;
    setStatusMessage(isCorrect ? 'Correct!' : 'Incorrect!');
    setInputPrompt(currentTrialRef.current < TOTAL_TRIALS ? "Get ready..." : "Click to see your score");

    if (isCorrect) {
      playAudioCue('success');
      triggerHaptic('success');
    } else {
      playAudioCue('error');
      triggerHaptic('error');
    }

    const newDataset: TrialData[] = [...trialDatasetRef.current, {
      trial: currentTrialRef.current,
      directionShown: currentDirection,
      userResponse: dir,
      latency: netLatency,
      rawLatency: Number(rawLatency.toFixed(2)),
      falseStart: false,
      correct: isCorrect
    }];
    setTrialDataset(newDataset);
    trialDatasetRef.current = newDataset;

    const obsIndex4 = rawObservationsRef.current.length + 1;
    rawObservationsRef.current.push({
      trialIndex: obsIndex4,
      attemptNumber: attemptNumberRef.current,
      sequenceNumber: obsIndex4,
      experimentId: sessionId,
      condition: `arrow-${currentDirection.toLowerCase()}`,
      test: 'direction',
      trialNumber: currentTrialRef.current,
      targetDirection: currentDirection.toLowerCase(),
      userResponse: dir.toLowerCase(),
      stimulusTimestamp: stimWall,
      responseTimestamp: responseWallTime,
      reactionTime: netLatency,
      rawReactionTime: Number(rawLatency.toFixed(2)),
      displayDelayOffsetMs: offsetMs,
      accuracy: isCorrect ? 1 : 0,
      falseStart: false,
      timedOut: false,
      valid: isCorrect,
      ageGroup: selectedAgeGroup || undefined
    });
  };

  const executeTrigger = (dir?: string, e?: any) => {
    if (engineStateRef.current === 'READY') {
      startCountdown();
    } else if (engineStateRef.current === 'STARTING') {
      return;
    } else if (engineStateRef.current === 'AWAITING_STIMULUS') {
      interceptFalseStart(dir || "UNKNOWN");
    } else if (engineStateRef.current === 'STIMULUS_ACTIVE') {
      if (dir) {
        captureResponse(dir, e);
      }
    } else if (engineStateRef.current === 'TRIAL_COMPLETE') {
      if (dir) return; // Prevent manual advance
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      const isRetry = statusMessage === 'False Start';
      if (!isRetry && currentTrialRef.current >= TOTAL_TRIALS) {
        calculateAndFinalizeMetrics(trialDatasetRef.current);
      } else {
        startTrialSequence(isRetry);
      }
    }
  };

  const executeTriggerRef = useRef(executeTrigger);
  executeTriggerRef.current = executeTrigger;

  useEffect(() => {
    if (engineState === 'TRIAL_COMPLETE') {
      autoAdvanceTimer.current = setTimeout(() => {
        executeTriggerRef.current();
      }, 800);
      return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
    }
  }, [engineState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        'ArrowUp': 'UP',
        'ArrowDown': 'DOWN',
        'ArrowLeft': 'LEFT',
        'ArrowRight': 'RIGHT',
        ' ': 'SPACE'
      };
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        if (dir === 'SPACE') {
          if (engineStateRef.current === 'STIMULUS_ACTIVE') {
            executeTriggerRef.current('SPACE', e);
          } else if (engineStateRef.current !== 'TRIAL_COMPLETE') {
            executeTriggerRef.current(undefined, e);
          }
        } else {
          executeTriggerRef.current(dir, e);
        }
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
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [selectedAgeGroup, sessionId]);

  let apparatusClass = "relative w-full max-w-[600px] h-[300px] sm:h-[400px] mx-auto rounded-[32px] border flex flex-col items-center justify-center cursor-pointer transition-[border-color,background-color] duration-200 ease-out z-20 backdrop-blur-[10px] touch-none select-none";
  let timerClass = "font-mono text-5xl sm:text-7xl font-light tracking-tight transition-colors duration-100 ease-out mb-2 text-[var(--text-muted)]";
  let statusClass = "font-['Space_Grotesk'] text-[1.1rem] font-medium tracking-[1px] uppercase transition-colors duration-100 ease-out text-[var(--text-muted)]";
  

  if (engineState === 'AWAITING_STIMULUS' || engineState === 'STARTING') {
    apparatusClass += " border-[rgba(255,214,10,0.2)] bg-black/40";
    statusClass += " text-[var(--color-idle)]";
  } else if (engineState === 'STIMULUS_ACTIVE') {
    apparatusClass += " border-[var(--cyan-primary)] bg-[rgba(0,240,255,0.05)]";
    timerClass += " text-[var(--cyan-primary)]";
    statusClass += " text-[var(--cyan-primary)]";
  } else if (engineState === 'TRIAL_COMPLETE') {
    const isError = statusMessage === 'False Start' || statusMessage === 'Incorrect!' || statusMessage === 'Too Slow';
    if (isError) {
      apparatusClass += " border-[rgba(255,51,102,0.4)] bg-[rgba(255,51,102,0.05)] animate-[hardwareShake_0.4s_cubic-bezier(.36,.07,.19,.97)_both]";
      timerClass += " text-[var(--color-error)]";
      statusClass += " text-[var(--color-error)]";
    } else {
      apparatusClass += " border-[rgba(0,245,212,0.3)] bg-[rgba(0,245,212,0.05)]";
      timerClass += " text-[var(--color-success)]";
      statusClass += " text-[var(--color-success)]";
    }
  } else {
    apparatusClass += " border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/40";
  }

  const speedData = useMemo(() => {
    return trialDataset.filter(t => !t.falseStart && t.correct && t.userResponse !== null).map((t) => ({
      name: `T${t.trial}`,
      latency: Math.round(t.latency)
    }));
  }, [trialDataset]);

  const accuracyData = useMemo(() => {
    let correctCount = 0;
    return trialDataset.map((t, idx) => {
      if (t.correct) correctCount++;
      return {
        name: `T${t.trial}`,
        accuracy: Math.round((correctCount / (idx + 1)) * 100)
      };
    });
  }, [trialDataset]);

  useEffect(() => {
    if (engineState === 'READY') {
      hasSubmittedRef.current = false;
      setTrialDataset([]); 
      trialDatasetRef.current = [];
      rawObservationsRef.current = [];
      setCurrentTrial(0); 
      currentTrialRef.current = 0;
      setStatusMessage('Click to start'); 
      setInputPrompt('Press arrow key or tap button to start'); 
      setFalseStartsCount(0);
      falseStartsCountRef.current = 0;
    }
  }, [engineState]);

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
        assessmentType: 'direction',
        averageReactionTime: reportStats.average,
        fastestReactionTime: reportStats.fastest,
        slowestReactionTime: reportStats.slowest,
        medianReactionTime: reportStats.median,
        accuracy: reportStats.accuracy,
        totalCorrect: reportStats.totalCorrect,
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
            accuracy: res.derivedMetrics.accuracy ?? prev.accuracy,
            totalCorrect: res.derivedMetrics.totalCorrect ?? prev.totalCorrect
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

  const renderArrowIcon = () => {
    if (engineState === 'STIMULUS_ACTIVE') {
      if (currentDirection === 'UP') return <ArrowUp size={80} className="text-[var(--cyan-primary)] mb-4" />;
      if (currentDirection === 'DOWN') return <ArrowDown size={80} className="text-[var(--cyan-primary)] mb-4" />;
      if (currentDirection === 'LEFT') return <ArrowLeft size={80} className="text-[var(--cyan-primary)] mb-4" />;
      if (currentDirection === 'RIGHT') return <ArrowRight size={80} className="text-[var(--cyan-primary)] mb-4" />;
    }
    return null;
  };

  useEffect(() => {
    const handleSettingsOpen = () => {
      // If a test is running, abort it to prevent timers from firing behind the modal
      if (engineStateRef.current !== 'READY' && engineStateRef.current !== 'REPORT') {
        if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
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
      <div className="bg-transparent text-[var(--text-primary)] font-sans min-h-[100dvh] w-full flex flex-col select-none">
        <Navbar currentView="direction-test" onNavigate={onNavigate} onBack={() => onNavigate('assessments')} />
        <main className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--color-error)]/30 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] flex items-center justify-center font-bold text-xl">!</div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Session Initialization Failed</h2>
            <p className="text-sm text-[var(--text-muted)]">{sessionError}</p>
            <button
              onClick={() => initSession(selectedAgeGroup)}
              className="px-6 py-2.5 rounded-xl bg-[var(--cyan-primary)] text-black font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry Connection
            </button>
          </div>
        </main>
      </div>
    );
  }
return (
    <div className="bg-transparent text-[var(--text-primary)] font-sans min-h-[100dvh] w-full flex flex-col select-none">
      <Navbar 
        currentView="direction-test" 
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
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full flex flex-col items-center justify-center relative flex-1"
        >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes hardwareShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
        `}</style>
        
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--border-subtle)] overflow-hidden">
          <div 
            className="h-full w-full bg-[var(--accent)] origin-left transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${currentTrial / TOTAL_TRIALS})` }}
          ></div>
        </div>

        {engineState !== 'REPORT' && (
          <div className="w-full max-w-[800px] flex flex-col items-center gap-2 z-30 px-4 mb-8">
            <div className="font-mono text-xs text-[var(--text-muted)] tracking-wider uppercase text-center w-full animate-[fadeIn_0.3s_ease-out] min-h-[1.5rem]">
              {isSessionLoading ? 'INITIALIZING AUTHORITATIVE SESSION...' : inputPrompt}
            </div>
            <div className="flex justify-center items-center font-mono text-xs text-[var(--text-secondary)] animate-[fadeIn_0.3s_ease-out]">
              <div className="tracking-wide">TRIAL: <span className="text-[var(--text-primary)] font-bold">{currentTrial}</span> / {TOTAL_TRIALS}</div>
            </div>
          </div>
        )}

        {engineState === 'REPORT' && reportStats ? (
          <div className="w-full max-w-lg z-10">
            <AssessmentResultReward
              score={reportStats.average}
              unit="ms"
              assessmentType="direction"
              title="Direction"
              isLowerBetter={true}
              isNewPersonalBest={isNewPersonalBest}
              supportingMetrics={[
                { label: 'Average RT', value: reportStats.average.toFixed(1), unit: 'ms' },
                { label: 'Accuracy', value: reportStats.accuracy, unit: '%' },
                { label: 'Fastest RT', value: reportStats.fastest.toFixed(1), unit: 'ms' },
                { label: 'Score', value: `${reportStats.totalCorrect}/${TOTAL_TRIALS}` }
              ]}
              submissionError={submissionError}
              onRetrySubmission={attemptSubmission}
              isSubmitting={isSubmitting}
              nextAssessmentName="Next: Colour Recognition"
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
                trialDatasetRef.current = [];
                setCurrentTrial(0); 
                currentTrialRef.current = 0;
                setStatusMessage('Click to start'); 
                setInputPrompt('Press arrow key or tap button to start'); 
                setFalseStartsCount(0);
                falseStartsCountRef.current = 0;
                if (typeof timerRef !== 'undefined' && timerRef.current) timerRef.current.textContent = '000.0';
              }}
              onNext={() => onNavigate('colour-recognition')}
              onViewAnalytics={() => onNavigate('analytics')}
            >
              {!submissionError && hasSubmittedRef.current && reportStats && sessionId && (
                <LeaderboardOptIn 
                  assessmentType="direction"
                  scoreMetric={reportStats.average}
                  ageGroup={selectedAgeGroup}
                  idempotencyKey={sessionId}
                  trials={rawObservationsRef.current}
                />
              )}
            </AssessmentResultReward>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-[600px] px-4">
            <div className={apparatusClass} onPointerDown={(e) =>

 { 
                if (engineState === 'READY' || engineState === 'TRIAL_COMPLETE') {
                  e.preventDefault(); 
                  executeTrigger(); 
                }
              }}>
            {engineState === 'STARTING' && statusMessage.match(/Starting in (\d)/) && (
              <CountdownOverlay count={parseInt(statusMessage.match(/Starting in (\d)/)?.[1] || '3', 10)} />
            )}
              <div className="flex flex-col items-center justify-center pointer-events-none">
                {renderArrowIcon()}
                <div className={timerClass} ref={timerRef}>000.0</div>
                <div className={statusClass}>{statusMessage}</div>
              </div>
            </div>

            {/* Mobile Controls */}
            {(engineState !== 'READY') && (
              <div className="w-full max-w-[280px] mt-6 grid grid-cols-3 gap-2">
                <div></div>
                <button type="button" 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); executeTrigger('UP'); }}
                  className="h-14 bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:bg-[var(--surface-3)] rounded-lg flex items-center justify-center text-[var(--text-primary)] active:bg-[var(--accent)] active:text-white transition-colors cursor-pointer"
                >
                  <ArrowUp size={24} />
                </button>
                <div></div>
                <button type="button" 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); executeTrigger('LEFT'); }}
                  className="h-14 bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:bg-[var(--surface-3)] rounded-lg flex items-center justify-center text-[var(--text-primary)] active:bg-[var(--accent)] active:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={24} />
                </button>
                <button type="button" 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); executeTrigger('DOWN'); }}
                  className="h-14 bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:bg-[var(--surface-3)] rounded-lg flex items-center justify-center text-[var(--text-primary)] active:bg-[var(--accent)] active:text-white transition-colors cursor-pointer"
                >
                  <ArrowDown size={24} />
                </button>
                <button type="button" 
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); executeTrigger('RIGHT'); }}
                  className="h-14 bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:bg-[var(--surface-3)] rounded-lg flex items-center justify-center text-[var(--text-primary)] active:bg-[var(--accent)] active:text-white transition-colors cursor-pointer"
                >
                  <ArrowRight size={24} />
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
      </main>
    </div>
  );
}
