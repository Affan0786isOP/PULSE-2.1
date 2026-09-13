import React, { useState, useRef, useEffect } from 'react';
import { submitLeaderboardResult, AssessmentType, AgeGroup } from '../lib/firestore';


interface LeaderboardOptInProps {
  assessmentType: AssessmentType;
  scoreMetric: number;
  idempotencyKey: string;
  ageGroup: AgeGroup;
  trials?: any[];
}

export function LeaderboardOptIn({ assessmentType, scoreMetric,
      idempotencyKey, ageGroup, trials }: LeaderboardOptInProps) {
  const [optInState, setOptInState] = useState<'IDLE' | 'OPTING_IN' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isSubmittingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (optInState !== 'OPTING_IN' && optInState !== 'ERROR') {
      setIsKeyboardOpen(false);
      return;
    }

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (vv) {
        const heightDifference = window.innerHeight - vv.height;
        const keyboardDetected = heightDifference > 120;
        setIsKeyboardOpen(keyboardDetected);

        if (keyboardDetected || document.activeElement === inputRef.current) {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    handleViewportChange();
    if (inputRef.current) {
      inputRef.current.focus();
    }

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [optInState]);

  const handleFocus = () => {
    setIsKeyboardOpen(true);
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleBlur = () => {
    setTimeout(() => {
      const vv = window.visualViewport;
      if (!vv || window.innerHeight - vv.height <= 120) {
        setIsKeyboardOpen(false);
      }
    }, 150);
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    const trimmed = displayName.trim();
    if (!trimmed) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }
    if ([...trimmed].length > 30) {
      setErrorMsg("Display name must be 30 characters or less.");
      return;
    }

    isSubmittingRef.current = true;
    setOptInState('SUBMITTING');
    setErrorMsg('');

    const res = await submitLeaderboardResult({
      displayName: trimmed,
      assessmentType,
      scoreMetric,
      idempotencyKey,
      ageGroup,
      trials
    });

    if (res.success) {
      setOptInState('SUCCESS');
    } else {
      isSubmittingRef.current = false;
      setErrorMsg(res.error || 'Failed to synchronize with leaderboard.');
      setOptInState('ERROR');
    }
  };

  if (optInState === 'SUCCESS') {
    return (
      <div className="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--color-success)] p-2 rounded-lg flex items-center justify-center text-center animate-[fadeIn_0.2s_ease-out]">
        <span className="font-mono text-xs font-medium">
          ✓ Added to public research leaderboard
        </span>
      </div>
    );
  }

  if (optInState === 'IDLE') {
    return (
      <div className="w-full bg-[var(--surface-2)]/60 border border-[var(--border-subtle)] p-2 rounded-lg flex items-center justify-between gap-2 text-left transition-all">
        <div className="flex flex-col min-w-0">
          <span className="font-mono font-semibold text-[10px] text-[var(--text-primary)] uppercase tracking-wide truncate">Research Leaderboard</span>
          <span className="text-[var(--text-muted)] text-[9px] font-mono truncate">Publish score to public leaderboard</span>
        </div>
        <button type="button"
          onClick={() => setOptInState('OPTING_IN')}
          className="h-8 px-2.5 bg-[var(--surface-2)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          Publish
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-[var(--surface-2)]/60 border border-[var(--border-subtle)] p-2 rounded-lg flex flex-col items-center text-center transition-all ${
        isKeyboardOpen ? 'py-1 my-0.5' : ''
      }`}
    >
      <span className="font-mono font-bold text-[10px] text-[var(--text-primary)] uppercase tracking-wide mb-0.5">Enter Callsign</span>
      <p className="text-[var(--text-muted)] text-[9px] font-mono mb-1.5 max-w-xs">
        Your callsign will appear publicly on the global leaderboard.
      </p>
      
      <div className="w-full flex items-center justify-center gap-1.5 max-w-xs">
        <input
          ref={inputRef}
          type="text"
          value={displayName}
          onChange={(e) => {
            const chars = [...e.target.value];
            if (chars.length <= 30) {
              setDisplayName(e.target.value);
            } else {
              setDisplayName(chars.slice(0, 30).join(''));
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Callsign (e.g. Node-01)"
          disabled={optInState === 'SUBMITTING'}
          className="w-full h-8 bg-[var(--surface-1)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-md px-2 text-[var(--text-primary)] font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] transition-colors text-left"
          autoFocus
        />

        <div className="flex gap-1 shrink-0">
          <button type="button"
            onClick={() => { setOptInState('IDLE'); setErrorMsg(''); setDisplayName(''); }}
            disabled={optInState === 'SUBMITTING'}
            className="h-8 px-2 bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono text-[10px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button type="button"
            onClick={handleSubmit}
            disabled={optInState === 'SUBMITTING'}
            className="h-8 px-2.5 bg-[var(--accent)] hover:opacity-90 text-slate-950 rounded-md font-mono text-[10px] uppercase tracking-wider transition-colors font-bold cursor-pointer disabled:opacity-50"
          >
            {optInState === 'SUBMITTING' ? '...' : (optInState === 'ERROR' ? 'Retry' : 'Submit')}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="text-rose-400 text-[9px] font-mono mt-1">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
