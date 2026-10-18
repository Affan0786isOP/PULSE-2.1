import React, { useState, useEffect, useRef } from 'react';
import { Edit2, AlertCircle, X, Loader2 } from 'lucide-react';
import { validateLeaderboardDisplayName } from '../../../shared/domain/leaderboardEligibility';
import { updateLeaderboardAlias } from '../../lib/adminActions';
import type { AdminLeaderboardDTO } from '../../../server/models/adminModels';

export interface AdminEditAliasModalProps {
  isOpen: boolean;
  entry: AdminLeaderboardDTO | null;
  onClose: () => void;
  onSuccess: (updatedEntry: AdminLeaderboardDTO) => void;
}

export function AdminEditAliasModal({
  isOpen,
  entry,
  onClose,
  onSuccess
}: AdminEditAliasModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && entry) {
      setDisplayName(entry.displayName);
      setReason('');
      setValidationError(null);
      setServerError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, entry]);

  if (!isOpen || !entry) return null;

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    setServerError(null);
    if (!val.trim()) {
      setValidationError('Display name cannot be empty.');
      return;
    }
    const result = validateLeaderboardDisplayName(val);
    if (!result.valid) {
      setValidationError(result.error || 'Invalid display name format.');
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateLeaderboardDisplayName(displayName);
    if (!result.valid || !result.normalized) {
      setValidationError(result.error || 'Invalid display name.');
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await updateLeaderboardAlias({
        id: entry.id,
        displayName: result.normalized,
        reason: reason.trim() || undefined
      });
      if (res.success && res.entry) {
        onSuccess(res.entry);
        onClose();
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to update alias.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-alias-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="edit-alias-title" className="text-lg font-semibold">
              Correct Display Name
            </h2>
            <p className="text-xs text-slate-400">Entry ID: <span className="font-mono">{entry.id}</span></p>
          </div>
        </div>

        {serverError && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-alias-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              New Display Name
            </label>
            <input
              id="edit-alias-input"
              ref={inputRef}
              type="text"
              value={displayName}
              onChange={e => handleNameChange(e.target.value)}
              disabled={isSubmitting}
              maxLength={30}
              placeholder="e.g. SpeedRunner42"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border ${
                validationError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-indigo-500'
              } text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
            {validationError && (
              <p className="mt-1.5 text-xs text-rose-400">{validationError}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-alias-reason" className="block text-xs font-medium text-slate-300 mb-1.5">
              Audit Reason (Optional)
            </label>
            <input
              id="edit-alias-reason"
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Typo fix requested by user"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!validationError || !displayName.trim()}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
