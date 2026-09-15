import { motion } from 'motion/react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './Navbar';
import { AgeSelection } from './AgeSelection';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Delete, Heart, Activity, RefreshCw } from 'lucide-react';
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
  generatedSequence: string;
  playerSequence: string;
  correct: boolean;
  timestamp: number;
};


export function NumberMemoryTest({ onNavigate }: { onNavigate: (view: string) => void }) {
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
  const [sequence, setSequence] = useState<string>('');
  const sequenceRef = useRef<string>('');
  const [playerInput, setPlayerInput] = useState<string>('');
  const [trialDataset, setTrialDataset] = useState<TrialData[]>([]);
  
  const [statusMessage, setStatusMessage] = useState('Click to start');
  const [inputPrompt, setInputPrompt] = useState('');
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const engineStateRef = useRef<EngineState>('READY');
  const levelRef = useRef<number>(1);
  const livesRef = useRef<number>(3);
  const inputRef = useRef<string>('');
  const stimulusWallTimestamp = useRef<number>(0);
  const assessmentStartTimeRef = useRef<number | null>(null);
  const assessmentStartWallTimestampRef = useRef<number | null>(null);
  const totalTimeMsRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
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

  useEffect(() => {
    inputRef.current = playerInput;
  }, [playerInput]);

  const initSession = useCallback(async (age: AgeGroup) => {
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await startExperimentSession('number-memory', age);
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
    return () => { engineStateRef.current = 'UNMOUNTED';
      clearAllTimers();
    };
  }, [selectedAgeGroup, sessionId]);

  const handlersRef = useRef({ handleNumberInput: (n: string) => {}, handleBackspace: () => {}, handleSubmit: () => {} });
  useEffect(() => {
    handlersRef.current = { handleNumberInput, handleBackspace, handleSubmit };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engineStateRef.current !== 'INPUT') return;
      if (document.hidden) return;
      
      if (e.key >= '0' && e.key <= '9') {
        handlersRef.current.handleNumberInput(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handlersRef.current.handleBackspace();
      } else if (e.key === 'Enter') {
        handlersRef.current.handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateSequence = (lvl: number) => {
    if (levelAttemptsRef.current[lvl] === undefined) {
      levelAttemptsRef.current[lvl] = 0;
    }
    const attemptIdx = levelAttemptsRef.current[lvl]++;
    const seed = `${sessionId}-number-${lvl}-${attemptIdx}`;
    const prng = seedPRNG(seed);
    const len = lvl + 2;
    let seq = '';
    for (let i = 0; i < len; i++) {
      seq += Math.floor(prng() * 10).toString();
    }
    return seq;
  };

  const playSequence = async (seq: string) => {
    setEngineState('SHOWING'); engineStateRef.current = 'SHOWING';
    setStatusMessage('Memorize');
    setInputPrompt('Memorize the number');
    
    // Show sequence for a brief period proportional to length
    const showTime = Math.max(1000, seq.length * 500); // 500ms per digit, min 1s
    
    if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
    sequenceTimeout.current = setTimeout(() => {
      if (engineStateRef.current !== 'SHOWING') return;
      
      setEngineState('INPUT'); engineStateRef.current = 'INPUT';
      stimulusWallTimestamp.current = Date.now();
      setPlayerInput('');
      setStatusMessage('Your turn');
      setInputPrompt('Type the number');
    }, showTime);
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
    setSequence(seq); sequenceRef.current = seq;
    setPlayerInput('');
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
      setPlayerInput('');
    }
  };

  const handleNumberInput = (num: string) => {
    playAudioCue('click');
    triggerHaptic('tap');
    setPlayerInput(prev => prev + num);
  };

  const handleBackspace = () => {
    playAudioCue('click');
    triggerHaptic('tap');
    setPlayerInput(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (engineStateRef.current !== 'INPUT') return;
    
    const input = inputRef.current;
    if (input.length === 0) return; // Prevent empty submission

    const isCorrect = input === sequenceRef.current;
    const now = Date.now();
    const stimTime = stimulusWallTimestamp.current || now;
    const trialIndex = trialDataset.length + 1;
    
    const trial: TrialData = {
      level: levelRef.current,
      sequenceLength: sequenceRef.current.length,
      generatedSequence: sequenceRef.current,
      playerSequence: input,
      correct: isCorrect,
      timestamp: now
    };
    
    if (!isCorrect && livesRef.current <= 1) {
      if (assessmentStartTimeRef.current !== null && totalTimeMsRef.current === null) {
        totalTimeMsRef.current = performance.now() - assessmentStartTimeRef.current;
      }
    }
    
    setTrialDataset(prev => [...prev, trial]);

    const obsIndex = rawObservationsRef.current.length + 1;
    const currentLvl = levelRef.current;
    const attemptNum = levelAttemptsRef.current[currentLvl] || 1;

    rawObservationsRef.current.push({
      experimentId: sessionId,
      condition: `digits-${sequenceRef.current.length}`,
      test: 'number-memory',
      trialNumber: currentLvl,
      trialIndex: obsIndex,
      sequenceNumber: obsIndex,
      attemptNumber: attemptNum,
      assessmentStartedAt: assessmentStartWallTimestampRef.current || stimTime,
      stimulusTimestamp: stimTime,
      responseTimestamp: now,
      reactionTime: Math.max(0, now - stimTime),
      accuracy: isCorrect ? 1 : 0,
      correct: isCorrect,
      valid: true,
      validity: isCorrect ? 'VALID' : 'INCORRECT',
      falseStart: false,
      ageGroup: selectedAgeGroup || undefined,
      level: currentLvl,
      sequenceLength: sequenceRef.current.length,
      generatedSequence: sequenceRef.current,
      playerSequence: input,
      notes: `level:${currentLvl},target:${sequenceRef.current},user:${input}`
    });

    if (!isCorrect) {
      // Failed
      setEngineState('FAILED'); engineStateRef.current = 'FAILED';
      playAudioCue('error');
      triggerHaptic('error');
      
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
    } else {
      // Success
      setEngineState('SUCCESS'); engineStateRef.current = 'SUCCESS';
      setStatusMessage('Correct!');
      setInputPrompt('Next level...');
      playAudioCue('success');
      triggerHaptic('success');
      
      transitionTimeoutRef.current = setTimeout(() => {
        if (engineStateRef.current === 'UNMOUNTED') return;
        if (levelRef.current >= 100) {
          setStatusMessage('You beat the game!');
          setInputPrompt('Seeing your score...');
          transitionTimeoutRef.current = setTimeout(() => {
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

  const capacityData = useMemo(() => {
    return trialDataset.map((t) => ({
      name: `L${t.level}`,
      length: t.sequenceLength,
      correct: t.correct
    }));
  }, [trialDataset]);

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

  let apparatusClass = "relative w-full max-w-[600px] min-h-[480px] sm:min-h-[520px] py-8 mx-auto rounded-[32px] border flex flex-col items-center justify-between cursor-pointer transition-all duration-200 ease-out z-20 backdrop-blur-[10px]";
  let statusClass = "font-['Space_Grotesk'] text-[1.1rem] font-medium tracking-[1px] uppercase transition-colors duration-100 ease-in text-[var(--text-muted)]";
  

  if (engineState === 'READY') {
    apparatusClass += " border-white/10 hover:border-white/20 bg-black/50 hover:bg-black/40";
  } else if (engineState === 'STARTING') {
    apparatusClass += " border-white/10 bg-black/50";
    statusClass += " !text-[var(--text-main)]";
  } else if (engineState === 'SHOWING') {
    apparatusClass += " border-[rgba(255,214,10,0.2)] bg-black/80";
    statusClass += " !text-[var(--color-idle)]";
  } else if (engineState === 'INPUT') {
    apparatusClass += " border-[rgba(0,240,255,0.3)] bg-black/80 cursor-default";
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

  const renderKeypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'enter'];
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[260px] sm:max-w-[280px] mx-auto mt-4 mb-4 z-10">
        {keys.map((key) => {
          let btnClass = "h-12 sm:h-14 rounded-xl border border-white/10 font-['Space_Grotesk'] text-xl text-white flex items-center justify-center transition-all hover:bg-white/10 active:bg-white/20 active:scale-95 bg-white/5";
          
          if (key === 'enter') {
            btnClass += " bg-[var(--cyan-primary)]/20 border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/30 active:bg-[var(--cyan-primary)]/40";
          } else if (key === 'del') {
            btnClass += " text-white/50 hover:text-white/80";
          }
          
          return (
            <button type="button"
              key={key}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (key === 'del') handleBackspace();
                else if (key === 'enter') handleSubmit();
                else handleNumberInput(key);
              }}
              className={btnClass}
            >
              {key === 'del' ? <Delete size={20} /> : key === 'enter' ? '↵' : key}
            </button>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (engineState === 'READY' || engineState === 'STARTING') {
      hasSubmittedRef.current = false;
      setPlayerInput('');
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
        assessmentType: 'number-memory',
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
        <Navbar currentView="number-memory" onNavigate={onNavigate} onBack={() => onNavigate('assessments')} />
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
        currentView="number-memory" 
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
                <div className="tracking-[1px]">DIGITS: <span className="text-white">{level + 2}</span></div>
              </div>
            )}
          </div>
        )}

        {engineState === 'REPORT' && reportStats ? (
          <div className="w-full max-w-lg z-10">
            <AssessmentResultReward
              score={reportStats.longestSeq}
              unit="Digits"
              assessmentType="number-memory"
              title="Number Memory"
              isLowerBetter={false}
              isNewPersonalBest={isNewPersonalBest}
              supportingMetrics={[
                { label: 'Highest Level', value: reportStats.highestLevel },
                { label: 'Accuracy', value: reportStats.overallAccuracy, unit: '%' },
                { label: 'Correct', value: `${reportStats.totalCorrect}/${reportStats.totalAttempts}` },
                { label: 'Total Time', value: (reportStats.totalTimeMs / 1000).toFixed(1), unit: 's' }
              ]}
              submissionError={submissionError}
              onRetrySubmission={attemptSubmission}
              isSubmitting={isSubmitting}
              nextAssessmentName="Assessments"
              onRetry={handleStart}
              onNext={() => onNavigate('assessments')}
              onViewAnalytics={() => onNavigate('analytics')}
            >
              {!submissionError && hasSubmittedRef.current && reportStats && sessionId && (
                <LeaderboardOptIn 
                  assessmentType="number-memory"
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
            <div className={statusClass}>
              {statusMessage}
            </div>

            <div className="flex flex-col items-center justify-center w-full flex-1 my-4">
              {engineState === 'SHOWING' && (
                <div className="font-['Space_Grotesk'] text-5xl md:text-7xl text-white tracking-[8px] animate-[fadeIn_0.2s_ease-out]">
                  {sequence}
                </div>
              )}
              
              {engineState === 'INPUT' && (
                <>
                  <div className="font-['Space_Grotesk'] text-4xl md:text-6xl text-[var(--cyan-primary)] tracking-[8px] h-[72px] flex items-center justify-center border-b-2 border-[var(--cyan-primary)]/30 min-w-[50%] mb-4">
                    {playerInput || <span className="opacity-30">...</span>}
                  </div>
                  {renderKeypad()}
                </>
              )}

              {engineState === 'SUCCESS' && (
                <div className="font-['Space_Grotesk'] text-3xl md:text-4xl text-[var(--color-success)] tracking-[4px] opacity-80">
                  LEVEL {level} CLEARED
                </div>
              )}

              {engineState === 'FAILED' && (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-[var(--text-muted)] text-sm font-mono tracking-widest uppercase mb-1">Sequence was</div>
                  <div className="font-['Space_Grotesk'] text-3xl text-white tracking-[4px] mb-4 line-through opacity-50">
                    {sequence}
                  </div>
                </div>
              )}
            </div>

            
          </div>
        )}
      </motion.div>
      </main>
    </div>
  );
}
