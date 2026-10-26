import React, { useState, useRef, useEffect } from 'react';
import { submitLeaderboardResult, getLeaderboardResults, AssessmentType, AgeGroup } from '../lib/firestore';
import { isValidLeaderboardScoreMetric, validateLeaderboardDisplayName } from '../../shared/domain/leaderboardEligibility';


interface LeaderboardOptInProps {
  assessmentType: AssessmentType;
  scoreMetric: number;
  sessionId?: string;
  idempotencyKey: string;
  ageGroup: AgeGroup;
  trials?: any[];
}

export function LeaderboardOptIn({ assessmentType, scoreMetric,
      sessionId, idempotencyKey, ageGroup, trials }: LeaderboardOptInProps) {
  const [optInState, setOptInState] = useState<'IDLE' | 'OPTING_IN' | 'SUBMITTING' | 'SUCCESS' | 'RECORDED' | 'PENDING_REVIEW' | 'STATUS_UNKNOWN' | 'ERROR'>('IDLE');
  
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

    const aliasValidation = validateLeaderboardDisplayName(displayName);
    if (!aliasValidation.valid || !aliasValidation.normalized) {
      setErrorMsg(aliasValidation.error || 'Choose a valid display name.');
      return;
    }
    const trimmed = aliasValidation.normalized;

    isSubmittingRef.current = true;
    setOptInState('SUBMITTING');
    setErrorMsg('');

    const res = await submitLeaderboardResult({
      displayName: trimmed,
      assessmentType,
      scoreMetric,
      sessionId,
      idempotencyKey,
      ageGroup,
      trials
    });

    if (res.success) {
      const submittedId = res.attemptId || res.docId;
      const visibleEntryId = res.leaderboardEntryId ?? res.leaderboardDocId ?? null;
      if (res.pendingReview) setOptInState('PENDING_REVIEW');
      else if (res.receiptAvailable !== true || !submittedId || !visibleEntryId) setOptInState('STATUS_UNKNOWN');
      else if (submittedId === visibleEntryId) setOptInState('SUCCESS');
      else setOptInState('RECORDED');
      // Prime fresh leaderboard cache in background for instant subsequent leaderboard views
      getLeaderboardResults(assessmentType, { bypassCache: true }).catch(err => {
        console.warn('[Leaderboard] Post-submission cache prime notice:', err?.message || err);
      });
    } else {
      isSubmittingRef.current = false;
      setErrorMsg(res.error || 'Failed to save to the leaderboard.');
      setOptInState('ERROR');
    }
  };

  if (!isValidLeaderboardScoreMetric(assessmentType, scoreMetric)) {
    return (
      <div role="note" className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-2 text-center text-xs text-[var(--text-muted)]">
        This result does not meet the leaderboard score requirements and cannot be published.
      </div>
    );
  }

  if (optInState === 'SUCCESS') {
    return <div role="status" className="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--color-success)] p-2 rounded-lg text-center"><span className="font-mono text-xs">✓ Your score is on the public leaderboard.</span></div>;
  }
  if (optInState === 'RECORDED') {
    return <div role="status" className="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] p-2 rounded-lg text-center"><span className="font-mono text-xs">Submission recorded. Your existing public best remains on the leaderboard.</span></div>;
  }
  if (optInState === 'PENDING_REVIEW') {
    return <div role="status" className="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] p-2 rounded-lg text-center"><span className="font-mono text-xs">Submission received and pending review. It is not public yet.</span></div>;
  }
  if (optInState === 'STATUS_UNKNOWN') {
    return <div role="status" className="w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] p-2 rounded-lg text-center"><span className="font-mono text-xs">Publication status could not be confirmed. Check the leaderboard before retrying.</span></div>;
  }

  if (optInState === 'IDLE') {
    return (
      <div className="w-full bg-[var(--surface-2)]/60 border border-[var(--border-subtle)] p-2 sm:p-2.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left transition-colors">
        <div className="flex flex-col">
          <span className="font-mono font-semibold text-[11px] text-[var(--text-primary)] uppercase tracking-wide">Public Leaderboard</span>
          <span className="text-[var(--text-muted)] text-[10px] font-mono">Add your score to the public leaderboard.</span>
        </div>
        <button type="button"
          onClick={() => setOptInState('OPTING_IN')}
          className="h-7 px-2.5 bg-[var(--surface-2)] hover:bg-[var(--border-subtle)] active:scale-95 border border-[var(--border-subtle)] rounded-md text-[var(--text-primary)] font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          Add Score
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-[var(--surface-2)]/60 border border-[var(--border-subtle)] p-2.5 rounded-lg flex flex-col items-center text-center ${
        isKeyboardOpen ? 'py-1.5 my-1' : ''
      }`}
    >
      <span className="font-mono font-bold text-[11px] text-[var(--text-primary)] uppercase tracking-wide mb-0.5">Choose a Name</span>
      <p className="text-[var(--text-muted)] text-[9px] font-mono mb-2 max-w-md">
        This name will appear on the public leaderboard.
      </p>
      
      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-1.5 max-w-sm">
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
          placeholder="Display name"
          disabled={optInState === 'SUBMITTING'}
          className="w-full h-8 bg-[var(--surface-1)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-md px-2.5 text-[var(--text-primary)] font-mono text-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 text-center sm:text-left transition-colors"
          autoFocus
        />

        <div className="flex gap-1.5 shrink-0">
          <button type="button"
            onClick={() => { setOptInState('IDLE'); setErrorMsg(''); setDisplayName(''); }}
            disabled={optInState === 'SUBMITTING'}
            className="h-8 px-2 bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono text-[11px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button type="button"
            onClick={handleSubmit}
            disabled={optInState === 'SUBMITTING'}
            className="h-8 px-3 bg-[var(--accent)] hover:opacity-90 text-slate-950 rounded-md font-mono text-[11px] uppercase tracking-wider transition-colors font-bold cursor-pointer disabled:opacity-50"
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
