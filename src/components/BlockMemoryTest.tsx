import { motion } from 'motion/react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './Navbar';
import { AgeSelection } from './AgeSelection';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Activity, RefreshCw } from 'lucide-react';
import { submitAssessmentResult, startExperimentSession, AgeGroup } from '../lib/firestore';
import { LeaderboardOptIn } from './LeaderboardOptIn';
import { AssessmentResultReward } from './AssessmentResultReward';
import { playAudioCue, triggerHaptic } from '../lib/settingsStore';
import { CountdownOverlay } from './CountdownOverlay';

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

type EngineState = 'READY' | 'STARTING' | 'SHOWING' | 'INPUT' | 'SUCCESS' | 'FAILED' | 'REPORT' | 'UNMOUNTED';

type TrialData = {
  level: number;
  sequenceLength: number;
  generatedSequence: number[];
  playerSequence: number[];
  correct: boolean;
  correctSelections: number;
  timestamp: number;
};


export function BlockMemoryTest({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
   
  const rawObservationsRef = useRef<any[]>([]);
  const hasSubmittedRef = useRef(false);
  const levelAttemptsRef = useRef<Record<number, number>>({});

  const [engineState, setEngineState] = useState<EngineState>('READY');

  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalTimeMs, setTotalTimeMs] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState<boolean | undefined>(undefined);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [sequence, setSequence] = useState<number[]>([]);
  const [, setPlayerSequence] = useState<number[]>([]);
  const playerSequenceRef = useRef<number[]>([]);
  const [trialDataset, setTrialDataset] = useState<TrialData[]>([]);
  
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Click to start');
  const [inputPrompt, setInputPrompt] = useState('');
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const engineStateRef = useRef<EngineState>('READY');
  const levelRef = useRef<number>(1);
  const livesRef = useRef<number>(3);
  const assessmentStartTimeRef = useRef<number | null>(null);
  const assessmentStartWallTimestampRef = useRef<number | null>(null);
  const stimulusWallTimestamp = useRef<number>(0);
  const totalTimeMsRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    if (sequenceTimeout.current) {
      clearTimeout(sequenceTimeout.current);
      sequenceTimeout.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const waitCancellable = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
      sequenceTimeout.current = setTimeout(() => {
        sequenceTimeout.current = null;
        resolve();
      }, ms);
    });
  };

  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const initSession = useCallback(async (age: AgeGroup) => {
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await startExperimentSession('block-memory', age);
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

  useEffect(() => {
    if (!selectedAgeGroup || !sessionId) return;
    startCountdown();
    return () => {
      engineStateRef.current = 'UNMOUNTED';
      clearAllTimers();
    };
  }, [selectedAgeGroup, sessionId]);

  const generateSequence = (lvl: number) => {
    if (levelAttemptsRef.current[lvl] === undefined) {
      levelAttemptsRef.current[lvl] = 0;
    }
    const attemptIdx = levelAttemptsRef.current[lvl]++;
    const seed = `${sessionId}-block-${lvl}-${attemptIdx}`;
    const prng = seedPRNG(seed);
    const len = lvl + 1;
    const seq: number[] = [];
    for (let i = 0; i < len; i++) {
      let next: number;
      do {
        next = Math.floor(prng() * 9);
      } while (i > 0 && next === seq[i - 1]);
      seq.push(next);
    }
    return seq;
  };

  const playSequence = async (seq: number[]) => {
    setEngineState('SHOWING'); engineStateRef.current = 'SHOWING';
    setStatusMessage('Memorize');
    setInputPrompt('Memorize the pattern');
    
    // Initial delay before showing sequence
    await waitCancellable(800);
    if (engineStateRef.current !== 'SHOWING') return;

    for (let i = 0; i < seq.length; i++) {
      if (engineStateRef.current !== 'SHOWING') return;
      setActiveBlock(seq[i]);
      await waitCancellable(400);
      if (engineStateRef.current !== 'SHOWING') return;
      setActiveBlock(null);
      await waitCancellable(200);
      if (engineStateRef.current !== 'SHOWING') return;
    }
    
    if (engineStateRef.current !== 'SHOWING') return;
    
    setEngineState('INPUT'); engineStateRef.current = 'INPUT';
    stimulusWallTimestamp.current = Date.now();
    setPlayerSequence([]); playerSequenceRef.current = [];
    setStatusMessage('Your turn');
    setInputPrompt('Repeat the pattern');
  };

  const startCountdown = () => {
    if (!sessionId) return;
    hasSubmittedRef.current = false; 
    clearAllTimers();
    levelAttemptsRef.current = {};
    setEngineState('STARTING'); engineStateRef.current = 'STARTING';
    setLevel(1);
    setLives(3);
    setTrialDataset([]);
    rawObservationsRef.current = [];
    setInputPrompt('');
    assessmentStartTimeRef.current = null;
    totalTimeMsRef.current = null;
    setTotalTimeMs(null);

    let count = 3;
    setStatusMessage(`Starting in ${count}`);
    
    intervalRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setStatusMessage(`Starting in ${count}`);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        assessmentStartTimeRef.current = performance.now();
        assessmentStartWallTimestampRef.current = Date.now();
        startLevel(1);
      }
    }, 800);
  };

  const startLevel = (currentLevel: number) => {
    const seq = generateSequence(currentLevel);
    setSequence(seq);
    playSequence(seq);
  };

  const handleStart = () => {
    if (engineState === 'READY') {
      startCountdown();
    } else if (engineState === 'REPORT') {
      setSelectedAgeGroup(null);
      setSessionId(null);
      rawObservationsRef.current = [];
      setEngineState('READY');
      isSubmittingRef.current = false;
      hasSubmittedRef.current = false; 
      setIsNewPersonalBest(undefined);
    }
  };

  const handleBlockClick = (index: number) => {
    if (engineStateRef.current !== 'INPUT') return;

    playAudioCue('click');
    triggerHaptic('tap');

    const newPlayerSeq = [...playerSequenceRef.current, index];
    setPlayerSequence(newPlayerSeq); playerSequenceRef.current = newPlayerSeq;
    
    // Flash block briefly
    setActiveBlock(index);
    if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
    sequenceTimeout.current = setTimeout(() => {
      setActiveBlock(null);
    }, 150);

    const currentIndex = newPlayerSeq.length - 1;
    
    if (sequence[currentIndex] !== index) {
      // Failed
      setEngineState('FAILED'); engineStateRef.current = 'FAILED';
      playAudioCue('error');
      triggerHaptic('error');
      
      const trial: TrialData = {
        level: levelRef.current,
        sequenceLength: sequence.length,
        generatedSequence: sequence,
        playerSequence: newPlayerSeq,
        correct: false,
        correctSelections: currentIndex,
        timestamp: Date.now()
      };

      const now = Date.now();
      const stimTime = stimulusWallTimestamp.current || now;
      const obsIndex = rawObservationsRef.current.length + 1;
      const currentLvl = levelRef.current;
      const attemptNum = levelAttemptsRef.current[currentLvl] || 1;

      rawObservationsRef.current.push({
        experimentId: sessionId,
        condition: `sequence-length-${sequence.length}`,
        test: 'block-memory',
        trialNumber: currentLvl,
        trialIndex: obsIndex,
        sequenceNumber: obsIndex,
        attemptNumber: attemptNum,
        assessmentStartedAt: assessmentStartWallTimestampRef.current || stimTime,
        stimulusTimestamp: stimTime,
        responseTimestamp: now,
        reactionTime: Math.max(0, now - stimTime),
        accuracy: 0,
        correct: false,
        valid: true,
        validity: 'INCORRECT',
        falseStart: false,
        ageGroup: selectedAgeGroup || undefined,
        level: currentLvl,
        sequenceLength: sequence.length,
        generatedSequence: [...sequence],
        playerSequence: [...newPlayerSeq],
        notes: `level:${currentLvl},target:${sequence.join('-')},user:${newPlayerSeq.join('-')}`
      });
      
      if (livesRef.current <= 1) {
        if (assessmentStartTimeRef.current !== null && totalTimeMsRef.current === null) {
          totalTimeMsRef.current = performance.now() - assessmentStartTimeRef.current;
        }
      }
      
      setTrialDataset(prev => [...prev, trial]);
      
      if (livesRef.current > 1) {
        const remaining = livesRef.current - 1;
        setLives(remaining);
        setStatusMessage(`SEQUENCE FAILED - LIVES: ${remaining}`);
        setInputPrompt('Get ready...');
        transitionTimeoutRef.current = setTimeout(() => {
          if (engineStateRef.current === 'UNMOUNTED') return;
          startLevel(levelRef.current);
        }, 1500);
      } else {
        setLives(0);
        setStatusMessage('GAME OVER');
        setInputPrompt('Seeing your score...');
        transitionTimeoutRef.current = setTimeout(() => {
          if (engineStateRef.current === 'UNMOUNTED') return;
          const duration = assessmentStartTimeRef.current !== null ? Math.round(performance.now() - assessmentStartTimeRef.current) : (totalTimeMsRef.current || 0);
          totalTimeMsRef.current = duration;
          setTotalTimeMs(duration);
          setEngineState('REPORT'); engineStateRef.current = 'REPORT';
          playAudioCue('milestone');
          triggerHaptic('milestone');
        }, 1500);
      }
      
    } else if (newPlayerSeq.length === sequence.length) {
      // Success
      setEngineState('SUCCESS'); engineStateRef.current = 'SUCCESS';
      setStatusMessage('Correct!');
      setInputPrompt('Next level...');
      playAudioCue('success');
      triggerHaptic('success');
      
      const trial: TrialData = {
        level: levelRef.current,
        sequenceLength: sequence.length,
        generatedSequence: sequence,
        playerSequence: newPlayerSeq,
        correct: true,
        correctSelections: newPlayerSeq.length,
        timestamp: Date.now()
      };

      const now = Date.now();
      const stimTime = stimulusWallTimestamp.current || now;
      const obsIndex = rawObservationsRef.current.length + 1;
      const currentLvl = levelRef.current;
      const attemptNum = levelAttemptsRef.current[currentLvl] || 1;

      rawObservationsRef.current.push({
        experimentId: sessionId,
        condition: `sequence-length-${sequence.length}`,
        test: 'block-memory',
        trialNumber: currentLvl,
        trialIndex: obsIndex,
        sequenceNumber: obsIndex,
        attemptNumber: attemptNum,
        assessmentStartedAt: assessmentStartWallTimestampRef.current || stimTime,
        stimulusTimestamp: stimTime,
        responseTimestamp: now,
        reactionTime: Math.max(0, now - stimTime),
        accuracy: 1,
        correct: true,
        valid: true,
        validity: 'VALID',
        falseStart: false,
        ageGroup: selectedAgeGroup || undefined,
        level: currentLvl,
        sequenceLength: sequence.length,
        generatedSequence: [...sequence],
        playerSequence: [...newPlayerSeq],
        notes: `level:${currentLvl},target:${sequence.join('-')},user:${newPlayerSeq.join('-')}`
      });
      
      setTrialDataset(prev => [...prev, trial]);
      
      transitionTimeoutRef.current = setTimeout(() => {
        if (engineStateRef.current === 'UNMOUNTED') return;
        if (levelRef.current >= 100) {
          setStatusMessage('You beat the game!');
          setInputPrompt('Seeing your score...');
          setTimeout(() => {
            if (engineStateRef.current === 'UNMOUNTED') return;
            const duration = assessmentStartTimeRef.current !== null ? Math.round(performance.now() - assessmentStartTimeRef.current) : (totalTimeMsRef.current || 0);
            totalTimeMsRef.current = duration;
            setTotalTimeMs(duration);
            setEngineState('REPORT'); engineStateRef.current = 'REPORT';
          }, 1500);
        } else {
          const nextLevel = levelRef.current + 1;
          setLevel(nextLevel);
          startLevel(nextLevel);
        }
      }, 500);
    }
  };

  const accuracyData = useMemo(() => {
    let correctCount = 0;
    return trialDataset.map((t, idx) => {
      if (t.correct) correctCount++;
      return {
        name: `L${t.level}`,
        accuracy: Math.round((correctCount / (idx + 1)) * 100)
      };
    });
  }, [trialDataset]);

  const reportStats = useMemo(() => {
    if (trialDataset.length === 0) return null;
    const totalCorrect = trialDataset.filter(t => t.correct).length;
    const highestLevel = Math.max(...trialDataset.filter(t => t.correct).map(t => t.level), 0);
    const longestSeq = Math.max(...trialDataset.filter(t => t.correct).map(t => t.sequenceLength), 0);
    
    const overallAccuracy = Math.round((totalCorrect / trialDataset.length) * 100);
    const duration = totalTimeMs ?? (assessmentStartTimeRef.current !== null ? Math.round(performance.now() - assessmentStartTimeRef.current) : (totalTimeMsRef.current || 0));
    
    return {
      highestLevel: highestLevel || 0,
      longestSeq: longestSeq || 0,
      totalCorrect,
      totalAttempts: trialDataset.length,
      overallAccuracy,
      totalTimeMs: duration
    };
  }, [trialDataset, totalTimeMs]);

  let apparatusClass = "relative w-full max-w-[600px] min-h-[460px] sm:min-h-[500px] py-8 mx-auto rounded-[32px] border flex flex-col items-center justify-between cursor-pointer transition-[border-color,background-color] duration-200 ease-out z-20 backdrop-blur-[10px]";
  let statusClass = "font-['Space_Grotesk'] text-[1.1rem] font-medium tracking-[1px] uppercase transition-colors duration-100 ease-out text-[var(--text-muted)]";
  

  if (engineState === 'READY') {
    apparatusClass += " border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/40";
  } else if (engineState === 'STARTING') {
    apparatusClass += " border-white/10 bg-black/50";
    statusClass += " !text-[var(--text-main)]";
  } else if (engineState === 'SHOWING') {
    apparatusClass += " border-[rgba(255,214,10,0.2)] bg-black/80";
    statusClass += " !text-[var(--color-idle)]";
  } else if (engineState === 'INPUT') {
    apparatusClass += " border-[rgba(0,240,255,0.3)] bg-black/80";
    statusClass += " !text-[var(--cyan-primary)]";
    
  } else if (engineState === 'SUCCESS') {
    apparatusClass += " border-[rgba(0,245,212,0.3)] bg-[rgba(0,245,212,0.05)]";
    statusClass += " !text-[var(--color-success)]";
  } else if (engineState === 'FAILED') {
    apparatusClass += " border-[rgba(255,51,102,0.4)] bg-[rgba(255,51,102,0.05)] animate-[hardwareShake_0.4s_cubic-bezier(.36,.07,.19,.97)_both]";
    statusClass += " !text-[var(--color-error)]";
  } else {
    apparatusClass += " border-white/10 bg-black/50";
  }

  useEffect(() => {
    if (engineState === 'READY' || engineState === 'STARTING') {
      hasSubmittedRef.current = false;
    }
  }, [engineState]);

  const attemptSubmission = useCallback(() => {
    if (!reportStats || !selectedAgeGroup || !sessionId || isSubmittingRef.current || hasSubmittedRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);
    
    submitAssessmentResult({
        idempotencyKey: sessionId,
        ageGroup: selectedAgeGroup,
        assessmentType: 'block-memory',
        highestLevel: reportStats.highestLevel,
        longestSeq: reportStats.longestSeq,
        totalCorrect: reportStats.totalCorrect,
        totalAttempts: reportStats.totalAttempts,
        overallAccuracy: reportStats.overallAccuracy,
        totalTimeMs: reportStats.totalTimeMs,
         
        trials: rawObservationsRef.current
      }).then(res => {
      if (!res || !res.success) {
        setSubmissionError(res?.error || 'Synchronization failed. Please try again.');
      } else {
        hasSubmittedRef.current = true;
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
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
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
        <Navbar currentView="block-memory" onNavigate={onNavigate} onBack={() => onNavigate('assessments')} />
        <main className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--color-error)]/30 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] flex items-center justify-center font-bold text-xl">!</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Session Initialization Failed</h2>
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
        currentView="block-memory" 
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
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes hardwareShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
          .block-cell {
            transition: background-color 0.1s ease-out, border-color 0.1s ease-out, transform 0.1s ease-out;
          }
          .block-cell.active {
            background-color: var(--cyan-primary);
            transform: scale(0.95);
          }
          .block-cell.success-active {
            background-color: var(--color-success);
          }
          .block-cell.error-active {
            background-color: var(--color-error);
          }
        `}</style>

        {engineState !== 'REPORT' && (
          <div className="w-full max-w-[800px] flex flex-col items-center gap-4 z-30 px-4 mb-8">
            <div className="font-mono text-[0.75rem] text-[#8b9bb466] tracking-[2px] uppercase text-center w-full animate-[fadeIn_0.5s_ease-out] min-h-[1.5rem]">
              {inputPrompt}
            </div>
            {engineState !== 'READY' && (
              <div className="w-full flex justify-between items-center font-mono text-[0.85rem] text-[var(--text-muted)] animate-[fadeIn_0.5s_ease-out]">
                <div className="tracking-[1px]">LEVEL: <span className="text-white">{level}</span></div>
                <div className="tracking-[1px] flex items-center gap-1">LIVES: <span className="text-[var(--color-error)] flex gap-1 ml-1">{Array.from({ length: 3 }).map((_, i) => <Heart key={i} size={14} className={i < lives ? "fill-current" : "opacity-30"} />)}</span></div>
              </div>
            )}
          </div>
        )}

        {engineState === 'REPORT' && reportStats ? (
          <div className="w-full max-w-lg z-10">
            <AssessmentResultReward
              score={reportStats.longestSeq}
              unit="Blocks"
              assessmentType="block-memory"
              title="Block Memory"
              isLowerBetter={false}
              isNewPersonalBest={isNewPersonalBest}
              supportingMetrics={[
                { label: 'Highest Level', value: reportStats.highestLevel },
                { label: 'Accuracy', value: reportStats.overallAccuracy, unit: '%' },
                { label: 'Total Time', value: (reportStats.totalTimeMs / 1000).toFixed(1), unit: 's' }
              ]}
              submissionError={submissionError}
              onRetrySubmission={attemptSubmission}
              isSubmitting={isSubmitting}
              nextAssessmentName="Next: Number Memory"
              onRetry={handleStart}
              onNext={() => onNavigate('number-memory')}
              onViewLeaderboard={() => onNavigate('leaderboard')}
            >
              {!submissionError && hasSubmittedRef.current && reportStats && sessionId && (
                <LeaderboardOptIn 
                  assessmentType="block-memory"
                  scoreMetric={reportStats.longestSeq}
                  ageGroup={selectedAgeGroup}
                  idempotencyKey={sessionId}
                  trials={rawObservationsRef.current}
                />
              )}
            </AssessmentResultReward>
          </div>
        ) : (
          <div className={apparatusClass} onPointerDown={(e) =>

 {
            if (engineState === 'READY') {
              e.preventDefault();
              handleStart();
            }
          }}>
            {engineState === 'STARTING' && statusMessage.match(/Starting in (\d)/) && (
              <CountdownOverlay count={parseInt(statusMessage.match(/Starting in (\d)/)?.[1] || '3', 10)} />
            )}
            <div className="font-['Space_Grotesk'] text-[1.1rem] font-medium tracking-[1px] uppercase transition-colors duration-100 ease-out text-[var(--text-muted)]">
              {statusMessage}
            </div>

            {/* Grid */}
            <div className="flex-1 flex flex-col items-center justify-center w-full my-4"><div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-8 w-full max-w-[280px] sm:max-w-[320px] aspect-square mx-auto">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                let blockClass = "block-cell bg-white/5 border border-white/10 rounded-xl cursor-pointer w-full h-full";
                if (activeBlock === i) {
                  if (engineState === 'SUCCESS') {
                    blockClass += " success-active";
                  } else if (engineState === 'FAILED') {
                    blockClass += " error-active";
                  } else {
                    blockClass += " active";
                  }
                } else if (engineState === 'INPUT') {
                  blockClass += " hover:bg-white/15 active:bg-white/25";
                }
return (
                  <div 
                    key={`block-${i}`}
                    onPointerDown={(e) => {
                      if (engineState === 'INPUT') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBlockClick(i);
                      }
                    }}
                    className={blockClass}
                  />
                );
              })}
            </div></div>
            
          </div>
        )}
      </motion.div>
      </main>
    </div>
  );
}
