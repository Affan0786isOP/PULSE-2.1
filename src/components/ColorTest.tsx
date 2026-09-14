import { motion } from 'motion/react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Navbar } from './Navbar';
import { AgeSelection } from './AgeSelection';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, HelpCircle, X, Check, RefreshCw } from 'lucide-react';
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
import { useRefreshRate } from '../lib/useRefreshRate';
import { CountdownOverlay } from './CountdownOverlay';

type EngineState = 'READY' | 'STARTING' | 'STIMULUS_ACTIVE' | 'FEEDBACK' | 'REPORT' | 'UNMOUNTED';

interface TrialPlan {
  condition: 'congruent' | 'incongruent';
  instruction: 'WORD' | 'COLOR';
}

const TOTAL_TRIALS = 15;

const COLORS = [
  { name: 'RED', value: '#ef4444' },
  { name: 'BLUE', value: '#3b82f6' },
  { name: 'GREEN', value: '#10b981' },
  { name: 'YELLOW', value: '#eab308' },
  { name: 'PURPLE', value: '#8e44ad' }
];


export function ColorTest({ onNavigate }: { onNavigate: (view: string) => void }) {
  useRefreshRate();
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
   
  const rawObservationsRef = useRef<any[]>([]);
  const hasSubmittedRef = useRef(false);

  const [engineState, setEngineState] = useState<EngineState>('READY');
  const [showGuide, setShowGuide] = useState(true);

  const [, setCurrentTrial] = useState(0);
  const [trialDataset, setTrialDataset] = useState<Array<{
    trial: number;
    wordName: string;
    wordColor: string;
    instruction: 'WORD' | 'COLOR';
    condition: 'congruent' | 'incongruent';
    conditionLabel: string;
    latency: number | null;
    rawLatency?: number | null;
    correct: boolean;
    timedOut?: boolean;
    falseStart?: boolean;
  }>>([]);
  const trialDatasetRef = useRef<any[]>([]);
  const trialSequenceRef = useRef<TrialPlan[]>([]);
  
  const [statusMessage, setStatusMessage] = useState('Click to start');
  const [reportStats, setReportStats] = useState<any>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState<boolean | undefined>(undefined);
  
  const [currentWord, setCurrentWord] = useState(COLORS[0]);
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [currentInstruction, setCurrentInstruction] = useState<'WORD' | 'COLOR'>('WORD');
  const [feedbackResult, setFeedbackResult] = useState<'CORRECT' | 'INCORRECT' | null>(null);

  const timerRef = useRef<HTMLDivElement>(null);
  const timeStimulusFired = useRef<number>(0);
  const stimulusWallTimestamp = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const engineStateRef = useRef<EngineState>('READY');
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeout = useRef<NodeJS.Timeout | null>(null);
  const stimulusTimeout = useRef<NodeJS.Timeout | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<typeof COLORS>([]);

  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  const initSession = useCallback(async (age: AgeGroup) => {
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await startExperimentSession('color-recognition', age);
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

  const openGuide = useCallback(() => {
    if (engineStateRef.current !== 'READY' && engineStateRef.current !== 'REPORT') {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      setStatusMessage('TEST INTERRUPTED');
      setEngineState('READY');
      engineStateRef.current = 'READY';
    }
    setShowGuide(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showGuide) {
        setShowGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGuide]);

  const updateLiveTimer = useCallback(() => {
    if (engineStateRef.current === 'STIMULUS_ACTIVE') {
      const delta = performance.now() - timeStimulusFired.current;
      if (timerRef.current) {
        timerRef.current.textContent = delta.toFixed(1);
      }
      animationFrameId.current = requestAnimationFrame(updateLiveTimer);
    }
  }, []);

  function getMedian(numbers: number[]): number | null {
    if (numbers.length === 0) return null;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function generateReport(dataset: typeof trialDataset) {
    const validTrials = dataset.filter(t => {
      const rawLt = (t.rawLatency !== undefined && t.rawLatency !== null) ? t.rawLatency : t.latency;
      return !t.timedOut && !t.falseStart && rawLt !== null && rawLt >= 80 && rawLt < 3000;
    });
    const validCorrectTrials = validTrials.filter(t => t.correct && t.latency !== null) as (typeof trialDataset[0] & { latency: number })[];
    const congruentTrials = validCorrectTrials.filter(t => t.condition === 'congruent' || t.wordName === t.wordColor);
    const incongruentTrials = validCorrectTrials.filter(t => t.condition === 'incongruent' || t.wordName !== t.wordColor);

    const congruentCorrectCount = congruentTrials.length;
    const incongruentCorrectCount = incongruentTrials.length;

    const congruentMeanRT = congruentTrials.length > 0 
      ? congruentTrials.reduce((a, b) => a + b.latency, 0) / congruentTrials.length 
      : null;
    const incongruentMeanRT = incongruentTrials.length > 0 
      ? incongruentTrials.reduce((a, b) => a + b.latency, 0) / incongruentTrials.length 
      : null;

    const congruentMedianRT = getMedian(congruentTrials.map(t => t.latency));
    const incongruentMedianRT = getMedian(incongruentTrials.map(t => t.latency));

    const interferenceCost = (congruentMeanRT !== null && incongruentMeanRT !== null)
      ? incongruentMeanRT - congruentMeanRT
      : null;

    const latencies = validCorrectTrials.map(t => t.latency);
    const correctCount = validCorrectTrials.length;
    const accuracy = validTrials.length > 0 ? Math.round(((correctCount / validTrials.length) * 100.0) * 100) / 100 : 0;
    
    const average = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const fastest = latencies.length > 0 ? Math.min(...latencies) : 0;
    const slowest = latencies.length > 0 ? Math.max(...latencies) : 0;
    const median = getMedian(latencies) || 0;

    let stats = {
      average,
      congruentAvg: congruentMeanRT,
      incongruentAvg: incongruentMeanRT,
      congruentMeanRT,
      incongruentMeanRT,
      congruentMedianRT,
      incongruentMedianRT,
      congruentCorrectCount,
      incongruentCorrectCount,
      interferenceCost,
      fastest,
      slowest,
      median,
      accuracy,
      correctCount
    };

    setReportStats(stats);
    setEngineState('REPORT'); engineStateRef.current = 'REPORT';
    playAudioCue('milestone');
    triggerHaptic('milestone');
  };

  const executeTrigger = useCallback((selectedColorName?: string, e?: any) => {
    if (engineStateRef.current === 'READY') {
      startCountdown();
    } else if (engineStateRef.current === 'STIMULUS_ACTIVE' && selectedColorName) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
      
      const responseWallTime = Date.now();
      const timeTriggered = (e && typeof e.timeStamp === 'number' && e.timeStamp > 0)
        ? e.timeStamp
        : performance.now();
      const rawDelta = Math.max(0, timeTriggered - timeStimulusFired.current);
      const offsetMs = getCachedRefreshRate()?.displayDelayOffsetMs || 0;
      const netDelta = Math.max(0, Number((rawDelta - offsetMs).toFixed(2)));
      if (timerRef.current) timerRef.current.textContent = netDelta.toFixed(1);
      
      const expected = currentInstruction === 'WORD' ? currentWord.name : currentColor.name;
      const correct = selectedColorName === expected;
      
      setFeedbackResult(correct ? 'CORRECT' : 'INCORRECT');
      if (correct) {
        playAudioCue('success');
        triggerHaptic('success');
      } else {
        playAudioCue('error');
        triggerHaptic('error');
      }
      
      const trialIndex = trialDatasetRef.current.length + 1;
      const isCongruent = currentWord.name === currentColor.name;
      const condition: 'congruent' | 'incongruent' = isCongruent ? 'congruent' : 'incongruent';
      const trialCondition = `${condition}-${currentInstruction.toLowerCase()}`;

      const stimWall = stimulusWallTimestamp.current || (responseWallTime - Math.round(rawDelta));

      const isFalseStart = rawDelta < 80;
      const isValid = correct && !isFalseStart && rawDelta < 3000;

      const newDataset = [...trialDatasetRef.current, {
        trial: trialIndex,
        wordName: currentWord.name,
        wordColor: currentColor.name,
        instruction: currentInstruction,
        condition,
        conditionLabel: trialCondition,
        latency: netDelta,
        rawLatency: Number(rawDelta.toFixed(2)),
        correct,
        timedOut: false,
        falseStart: isFalseStart
      }];
      setTrialDataset(newDataset); trialDatasetRef.current = newDataset;
      setEngineState('FEEDBACK'); engineStateRef.current = 'FEEDBACK';

      const obsIndex = rawObservationsRef.current.length + 1;
      // Save granular raw trial measurement
      rawObservationsRef.current.push({
        experimentId: sessionId,
        condition: trialCondition,
        test: 'color-recognition',
        trialNumber: obsIndex,
        trialIndex: obsIndex,
        sequenceNumber: obsIndex,
        attemptNumber: 1,
        wordName: currentWord.name,
        wordColor: currentColor.name,
        instruction: currentInstruction,
        userResponse: selectedColorName,
        stimulusTimestamp: stimWall,
        responseTimestamp: responseWallTime,
        reactionTime: netDelta,
        rawReactionTime: Number(rawDelta.toFixed(2)),
        displayDelayOffsetMs: offsetMs,
        accuracy: correct ? 1 : 0,
        falseStart: isFalseStart,
        timedOut: false,
        valid: isValid,
        ageGroup: selectedAgeGroup || undefined,
        notes: `word:${currentWord.name},color:${currentColor.name},task:${currentInstruction},condition:${condition}`
      });
      
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => {
        if (newDataset.length >= TOTAL_TRIALS) {
          generateReport(newDataset);
        } else {
          startTrialSequence();
        }
      }, 750);
    }
  }, [currentInstruction, currentWord, currentColor, sessionId, selectedAgeGroup]);

  function startCountdown() {
    if (!sessionId) return;
    hasSubmittedRef.current = false;
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setSubmissionError(null);
    setEngineState('STARTING'); engineStateRef.current = 'STARTING';
    setTrialDataset([]); trialDatasetRef.current = [];
    rawObservationsRef.current = [];
    setCurrentTrial(0);

    // Pre-generate explicit 50/50 balanced trial sequence (8/7 or 7/8 split) using seeded PRNG
    const prngPlans = seedPRNG(sessionId + "-color-plans");
    const is8Congruent = prngPlans() < 0.5;
    const congruentCount = is8Congruent ? 8 : 7;
    const incongruentCount = TOTAL_TRIALS - congruentCount;

    const plans: TrialPlan[] = [];
    for (let i = 0; i < congruentCount; i++) {
      plans.push({ condition: 'congruent', instruction: i % 2 === 0 ? 'WORD' : 'COLOR' });
    }
    for (let i = 0; i < incongruentCount; i++) {
      plans.push({ condition: 'incongruent', instruction: i % 2 === 0 ? 'WORD' : 'COLOR' });
    }

    // Fisher-Yates shuffle using seeded PRNG
    for (let i = plans.length - 1; i > 0; i--) {
      const j = Math.floor(prngPlans() * (i + 1));
      [plans[i], plans[j]] = [plans[j], plans[i]];
    }
    trialSequenceRef.current = plans;

    let count = 3;
    setStatusMessage(`Starting in ${count}`);
    if (timerRef.current) timerRef.current.textContent = "000.0";
    setFeedbackResult(null);
    
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

  function startTrialSequence() {
    setCurrentTrial(prev => prev + 1);
    setFeedbackResult(null);
    setEngineState('STIMULUS_ACTIVE'); engineStateRef.current = 'STIMULUS_ACTIVE';

    const currentTrialIndex = trialDatasetRef.current.length;
    const plan = trialSequenceRef.current[currentTrialIndex] || {
      condition: 'congruent',
      instruction: 'WORD'
    };

    const prngTrial = seedPRNG(sessionId + "-color-trial-" + currentTrialIndex);
    const wordIdx = Math.floor(prngTrial() * COLORS.length);
    let colorIdx = wordIdx;
    if (plan.condition === 'incongruent') {
      const offset = Math.floor(prngTrial() * (COLORS.length - 1)) + 1;
      colorIdx = (wordIdx + offset) % COLORS.length;
    }
    const nextWord = COLORS[wordIdx];
    const nextColor = COLORS[colorIdx];
    const nextInstruction = plan.instruction;

    setCurrentWord(nextWord);
    setCurrentColor(nextColor);
    setCurrentInstruction(nextInstruction);
    const newOptions = [...COLORS];
    for (let i = newOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
    }
    setShuffledOptions(newOptions);
    
    timeStimulusFired.current = performance.now();
    stimulusWallTimestamp.current = Date.now();
    // Synchronize stimulus timestamp with frame paint to eliminate pre-paint offset
    requestAnimationFrame((paintTime) => {
      if (engineStateRef.current === 'STIMULUS_ACTIVE') {
        timeStimulusFired.current = paintTime || performance.now();
      }
    });
    // Stimulus cues are visual-only to avoid multisensory response bias
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(updateLiveTimer);

    if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
    stimulusTimeout.current = setTimeout(() => {
      if (engineStateRef.current !== 'STIMULUS_ACTIVE') return;
      
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
      if (timerRef.current) timerRef.current.textContent = ">3000";
      
      setFeedbackResult('INCORRECT');
      playAudioCue('error');
      triggerHaptic('error');

      const trialIndex = trialDatasetRef.current.length + 1;
      const isCongruent = nextWord.name === nextColor.name;
      const condition: 'congruent' | 'incongruent' = isCongruent ? 'congruent' : 'incongruent';
      const trialCondition = `${condition}-${nextInstruction.toLowerCase()}`;
      const now = Date.now();
      const stimTime = stimulusWallTimestamp.current || (now - 3000);

      const newDataset = [...trialDatasetRef.current, {
        trial: trialIndex,
        wordName: nextWord.name,
        wordColor: nextColor.name,
        instruction: nextInstruction,
        condition,
        conditionLabel: trialCondition,
        latency: null,
        rawLatency: null,
        correct: false,
        timedOut: true
      }];
      
      setTrialDataset(newDataset); trialDatasetRef.current = newDataset;
      setEngineState('FEEDBACK'); engineStateRef.current = 'FEEDBACK';

      rawObservationsRef.current.push({
        experimentId: sessionId,
        condition: trialCondition,
        test: 'color-recognition',
        trialNumber: rawObservationsRef.current.length + 1,
        wordName: nextWord.name,
        wordColor: nextColor.name,
        instruction: nextInstruction,
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
        notes: `timeout_word:${nextWord.name},color:${nextColor.name},task:${nextInstruction},condition:${condition}`
      });
      
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      feedbackTimeout.current = setTimeout(() => {
        if (newDataset.length >= TOTAL_TRIALS) generateReport(newDataset);
        else startTrialSequence();
      }, 750);
    }, 3000);
  };

  // CLEANUP
  useEffect(() => {
    return () => { engineStateRef.current = 'UNMOUNTED';
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    };
  }, []);

  // MOUNT AUTOSTART
  useEffect(() => {
    if (!selectedAgeGroup || !sessionId) return;
    if (showGuide) {
      // Guide is displayed on start; test will begin once user clicks "Got It, Let's Play!"
      return;
    }
    if (engineStateRef.current === 'READY' || engineStateRef.current === 'UNMOUNTED') {
      engineStateRef.current = 'READY';
      startCountdown();
    }
  }, [selectedAgeGroup, sessionId, showGuide]);

  let apparatusClass = "w-[90%] max-w-[800px] min-h-[450px] bg-[var(--bg-surface)] border border-[var(--glass-border)] rounded-[24px] flex flex-col relative backdrop-blur-[20px] transition-colors duration-200 ease-out p-6 md:p-10 touch-manipulation select-none";
  let timerClass = "font-mono font-bold tracking-[-1px] leading-none mb-[15px] transition-colors duration-100 ease-out text-3xl md:text-5xl text-[var(--text-muted)]";
  
  if (engineState === 'STARTING') {
    apparatusClass += " !border-white/10 !bg-black/50 justify-center items-center cursor-pointer";
  } else if (engineState === 'STIMULUS_ACTIVE' || engineState === 'FEEDBACK') {
    apparatusClass += " !border-white/5";
    timerClass += " !text-white";
  } else {
    apparatusClass += " !border-white/10 hover:!border-white/20 !bg-black/50 hover:!bg-black/40 justify-center items-center cursor-pointer";
  }

  const speedData = useMemo(() => {
    return trialDataset.filter(t => t.correct && t.latency !== null && !t.falseStart && !t.timedOut).map((t) => ({
      name: `T${t.trial}`,
      latency: Math.round(t.latency!)
    }));
  }, [trialDataset]);
  
  const accuracyData = useMemo(() => {
    let correctSoFar = 0;
    return trialDataset.map((t, idx) => {
      if (t.correct) correctSoFar++;
      return {
        name: `T${t.trial}`,
        accuracy: Math.round((correctSoFar / (idx + 1)) * 100)
      };
    });
  }, [trialDataset]);

  useEffect(() => {
    if (engineState === 'READY') {
      hasSubmittedRef.current = false;
      setTrialDataset([]); setCurrentTrial(0); setStatusMessage('Click to start');
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
        assessmentType: 'color-recognition',
        averageReactionTime: reportStats.average,
        fastestReactionTime: reportStats.fastest,
        slowestReactionTime: reportStats.slowest,
        medianReactionTime: reportStats.median,
        accuracy: reportStats.accuracy,
        correctCount: reportStats.correctCount,
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
            correctCount: res.derivedMetrics.correctCount ?? prev.correctCount,
            totalCount: res.derivedMetrics.totalCount ?? prev.totalCount
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
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        if (stimulusTimeout.current) clearTimeout(stimulusTimeout.current);
        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        setStatusMessage('TEST INTERRUPTED');
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
        <Navbar currentView="colour-recognition" onNavigate={onNavigate} onBack={() => onNavigate('assessments')} />
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
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col select-none">
      <Navbar 
        currentView="colour-recognition" 
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex flex-col items-center justify-center relative flex-1"
        >
        {/* Top Control Bar */}
        <div className="w-full max-w-[800px] flex items-center justify-between px-2 sm:px-4 mb-3 z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--cyan-primary)]"></span>
            <span>
              {engineState === 'STIMULUS_ACTIVE' || engineState === 'FEEDBACK'
                ? `ROUND ${trialDataset.length + 1} OF ${TOTAL_TRIALS}`
                : '15 ROUNDS • STROOP TEST'}
            </span>
          </div>
          <button
            type="button"
            onClick={openGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-[var(--cyan-primary)] transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <HelpCircle size={14} />
            <span>How to Play</span>
          </button>
        </div>
        
        {engineState === 'REPORT' && reportStats ? (
          <div className="w-full max-w-lg z-10">
            <AssessmentResultReward
              score={reportStats.average}
              unit="ms"
              assessmentType="color-recognition"
              title="Colour Recognition"
              isLowerBetter={true}
              isNewPersonalBest={isNewPersonalBest}
              supportingMetrics={[
                { label: 'Accuracy', value: reportStats.accuracy.toFixed(0), unit: '%' },
                { label: 'Congruent', value: reportStats.congruentMeanRT !== null ? Math.round(reportStats.congruentMeanRT) : 'N/A', unit: reportStats.congruentMeanRT !== null ? 'ms' : undefined },
                { label: 'Incongruent', value: reportStats.incongruentMeanRT !== null ? Math.round(reportStats.incongruentMeanRT) : 'N/A', unit: reportStats.incongruentMeanRT !== null ? 'ms' : undefined },
                { label: 'Interference', value: reportStats.interferenceCost !== null ? Math.round(reportStats.interferenceCost) : 'N/A', unit: reportStats.interferenceCost !== null ? 'ms' : undefined }
              ]}
              submissionError={submissionError}
              onRetrySubmission={attemptSubmission}
              isSubmitting={isSubmitting}
              nextAssessmentName="Next: Block Memory"
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
                if (typeof timerRef !== 'undefined' && timerRef.current) timerRef.current.textContent = '000.0';
              }}
              onNext={() => onNavigate('block-memory')}
              onViewAnalytics={() => onNavigate('analytics')}
            >
              {!submissionError && hasSubmittedRef.current && reportStats && sessionId && (
                <LeaderboardOptIn 
                  assessmentType="color-recognition"
                  scoreMetric={reportStats.average}
                  ageGroup={selectedAgeGroup}
                  idempotencyKey={sessionId}
                  trials={rawObservationsRef.current}
                />
              )}
            </AssessmentResultReward>
          </div>
        ) : (
          <div 
            className={apparatusClass} 
            onPointerDown={(e) =>

 { 
              if (engineState === 'READY' || engineState === 'STARTING') {
                e.preventDefault(); 
                executeTrigger(); 
              }
            }}
          >
            {engineState === 'STARTING' && statusMessage.match(/Starting in (\d)/) && (
              <CountdownOverlay count={parseInt(statusMessage.match(/Starting in (\d)/)?.[1] || '3', 10)} />
            )}
            {engineState === 'STARTING' && (
              <div className="text-center pointer-events-none">
                <div className={timerClass} ref={timerRef}>000.0</div>
                <div className="font-['Space_Grotesk'] text-[1.1rem] font-medium tracking-[1px] uppercase text-[var(--text-main)] whitespace-pre-line">{statusMessage}</div>
              </div>
            )}
            
            {(engineState === 'STIMULUS_ACTIVE' || engineState === 'FEEDBACK') && (
              <div className="flex flex-col h-full w-full relative">

                <div className="flex flex-col items-center flex-1 justify-center relative">
                  <div className="font-mono text-[10px] md:text-xs tracking-widest text-[var(--text-muted)] uppercase mb-1">
                    INSTRUCTION
                  </div>
                  
                  <div className="font-['Space_Grotesk'] text-lg md:text-2xl font-extrabold tracking-wider uppercase py-1.5 px-5 rounded-lg mb-1 transition-colors" 
                       style={{ 
                         color: currentInstruction === 'WORD' ? 'var(--cyan-primary)' : '#c084fc',
                         backgroundColor: currentInstruction === 'WORD' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(168, 85, 247, 0.08)',
                         borderColor: currentInstruction === 'WORD' ? 'rgba(0, 242, 254, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                         borderWidth: '1px'
                       }}>
                    MATCH THE {currentInstruction === 'WORD' ? 'WRITTEN WORD' : 'INK COLOR'}
                  </div>
                  <div className="font-mono text-[11px] md:text-xs text-[var(--text-muted)] tracking-wider mb-6">
                    {currentInstruction === 'WORD' ? 'Read the word • Ignore the font color' : 'Match font color • Ignore the written word'}
                  </div>

                  <div className="relative flex items-center justify-center min-h-[120px] mb-8">
                    <div className="font-['Space_Grotesk'] text-5xl md:text-[5rem] font-black tracking-wider uppercase z-10" style={{ color: currentColor.value }}>
                      {currentWord.name}
                    </div>
                  </div>
                  
                  {engineState === 'FEEDBACK' && feedbackResult && (
                    <div className={`font-mono text-sm tracking-widest uppercase mb-4 ${feedbackResult === 'CORRECT' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                      {feedbackResult === 'CORRECT' ? '✓ CORRECT' : '✗ INCORRECT'}
                    </div>
                  )}
                  {engineState === 'STIMULUS_ACTIVE' && (
                    <div className="h-[20px] mb-4"></div>
                  )}
                  <div className={timerClass} ref={timerRef}>000.0</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full mt-auto">
                  {shuffledOptions.map((c, i) => {
                    let btnClass = "font-['Space_Grotesk'] font-bold text-xs md:text-sm tracking-widest uppercase py-4 px-2 rounded-lg cursor-pointer transition-[transform,filter,opacity] border text-black text-center select-none touch-manipulation ";
                    
                    if (engineState === 'FEEDBACK') {
                      const expected = currentInstruction === 'WORD' ? currentWord.name : currentColor.name;
                      if (c.name === expected) {
                        btnClass += " border-[var(--color-success)] ring-2 ring-[var(--color-success)]";
                      } else {
                        btnClass += " opacity-50";
                      }
                    } else {
                      btnClass += " hover:-translate-y-1 hover:brightness-110 active:translate-y-0";
                    }

                    // For mobile grid layout handling
                    if (i === 4) btnClass += " col-span-2 md:col-span-1";
return (
                      <button type="button"
                        key={`${c.name}-${i}`}
                        disabled={engineState === 'FEEDBACK'}
                        onPointerDown={(e) => { e.preventDefault(); executeTrigger(c.name, e.nativeEvent); }}
                        className={btnClass}
                        style={{ backgroundColor: c.value, borderColor: engineState === 'FEEDBACK' ? undefined : c.value }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {engineState === 'READY' && (
              <div className="text-center pointer-events-none">
                <div className="font-['Space_Grotesk'] text-[1.1rem] font-medium tracking-[1px] uppercase text-[var(--text-main)] whitespace-pre-line">Click to start</div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* HOW TO PLAY GUIDE POPUP */}
      {showGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
        >
          <div 
            className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg p-4 sm:p-5 relative text-left flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block mb-0.5">Assessment Guide</span>
                <h3 id="guide-title" className="text-lg sm:text-xl font-heading font-bold text-[var(--text-primary)]">
                  How to Play: Colour Recognition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                aria-label="Close guide"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)] font-medium">
                Check the instruction prompt at the top of each round before selecting your answer:
              </p>

              {/* Rule 1: MATCH THE WORD */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-cyan-400">
                    Rule 1: MATCH THE WRITTEN WORD
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">
                    Read Text
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-base sm:text-lg tracking-wider" style={{ color: '#eab308' }}>
                      RED
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">(Yellow ink)</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[10px] sm:text-[11px] text-white bg-red-600 px-2 py-0.5 rounded">
                    <Check size={12} className="stroke-[3]" /> Tap "RED"
                  </div>
                </div>
              </div>

              {/* Rule 2: MATCH THE COLOR */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-purple-500/10 border border-purple-500/25">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-purple-400">
                    Rule 2: MATCH THE INK COLOR
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                    Match Ink
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-base sm:text-lg tracking-wider" style={{ color: '#3b82f6' }}>
                      YELLOW
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">(Blue ink)</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[10px] sm:text-[11px] text-black bg-blue-500 px-2 py-0.5 rounded">
                    <Check size={12} className="stroke-[3]" /> Tap "BLUE"
                  </div>
                </div>
              </div>

              {/* Game Info Pill */}
              <div className="flex items-center justify-around bg-white/5 rounded-lg py-1.5 px-3 border border-white/10 text-[11px] font-mono text-[var(--text-muted)]">
                <span>⚡ 15 Rounds</span>
                <span>•</span>
                <span>🔀 Shuffled Buttons</span>
                <span>•</span>
                <span>🎯 Speed & Accuracy</span>
              </div>
            </div>

            {/* Action */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  startCountdown();
                }}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[var(--cyan-primary)] hover:bg-[#00d0dd] text-black font-heading font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer active:scale-95 text-center"
              >
                Got It, Let's Play!
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
