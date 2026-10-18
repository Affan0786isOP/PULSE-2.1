import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Lock,
  LogOut,
  AlertTriangle,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import {
  fetchAdminLeaderboardPage,
  hideLeaderboardEntry,
  unhideLeaderboardEntry,
  deleteLeaderboardEntry
} from '../../lib/adminActions';
import { useAdminAuth } from '../../lib/useAdminAuth';
import { AdminPasscodeModal } from './AdminPasscodeModal';
import { AdminEditAliasModal } from './AdminEditAliasModal';
import type { AdminLeaderboardDTO } from '../../../server/models/adminModels';

const PROTOCOLS = [
  { id: 'all', label: 'All Protocols' },
  { id: 'visual-reaction', label: 'Visual Reaction' },
  { id: 'direction', label: 'Direction' },
  { id: 'color-recognition', label: 'Colour Recognition' },
  { id: 'block-memory', label: 'Block Memory' },
  { id: 'number-memory', label: 'Number Memory' }
];

export function AdminPage() {
  const { isAuthenticated, logout, token } = useAdminAuth();
  const [showLoginModal, setShowLoginModal] = useState(!isAuthenticated);

  // Table State
  const [entries, setEntries] = useState<AdminLeaderboardDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [selectedProtocol, setSelectedProtocol] = useState('all');
  const [searchPrefix, setSearchPrefix] = useState('');

  // Modals & Action Targets
  const [editingEntry, setEditingEntry] = useState<AdminLeaderboardDTO | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<AdminLeaderboardDTO | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Sync modal with auth state
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [isAuthenticated]);

  const loadData = useCallback(
    async (cursor: string | null = null, append: boolean = false) => {
      if (!isAuthenticated) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminLeaderboardPage({
          limit: 50,
          cursor,
          assessmentType: selectedProtocol === 'all' ? null : selectedProtocol,
          prefix: searchPrefix.trim() || null
        });

        if (append) {
          setEntries(prev => [...prev, ...res.entries]);
        } else {
          setEntries(res.entries);
        }
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load entries');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, selectedProtocol, searchPrefix]
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadData(null, false);
    }
  }, [isAuthenticated, selectedProtocol, searchPrefix, loadData]);

  // Handle Soft-Hide
  const handleHide = async (entry: AdminLeaderboardDTO) => {
    setActionInProgress(entry.id);
    setActionFeedback(null);
    try {
      await hideLeaderboardEntry(entry.id, 'Moderated by admin');
      setEntries(prev =>
        prev.map(e => (e.id === entry.id ? { ...e, hidden: true } : e))
      );
      setActionFeedback({ type: 'success', message: `Entry ${entry.id} is now hidden.` });
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to hide entry'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Unhide (Pessimistic: Only reflects change if successful and not blocked)
  const handleUnhide = async (entry: AdminLeaderboardDTO) => {
    setActionInProgress(entry.id);
    setActionFeedback(null);
    try {
      const res = await unhideLeaderboardEntry(entry.id, 'Un-hidden by admin');
      if (res.notBest) {
        setActionFeedback({
          type: 'warning',
          message: `Candidate unhide blocked: retained best is ${res.retainedEntryId}.`
        });
      } else {
        setEntries(prev =>
          prev.map(e => (e.id === entry.id ? { ...e, hidden: false } : e))
        );
        setActionFeedback({ type: 'success', message: `Entry ${entry.id} is now visible.` });
      }
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to unhide entry'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Permanent Delete
  const confirmDelete = async () => {
    if (!deletingEntry) return;
    const entryId = deletingEntry.id;
    setActionInProgress(entryId);
    setActionFeedback(null);
    try {
      await deleteLeaderboardEntry(entryId, 'Permanently purged by admin');
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setActionFeedback({ type: 'success', message: `Entry ${entryId} deleted permanently.` });
      setDeletingEntry(null);
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete entry'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Admin Top Header */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-wide flex items-center gap-2">
              PULSE Moderation Console
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Staff Only
              </span>
            </h1>
            <p className="text-xs text-slate-400">Manage leaderboard aliases, visibility, and deletions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Unlock Admin
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner Feedback */}
        {actionFeedback && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : actionFeedback.type === 'warning'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : actionFeedback.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-900/40 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Protocol Filter */}
            <div className="relative">
              <select
                aria-label="Filter by protocol"
                value={selectedProtocol}
                onChange={e => setSelectedProtocol(e.target.value)}
                className="appearance-none bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 pr-9 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {PROTOCOLS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Prefix Search */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchPrefix}
                onChange={e => setSearchPrefix(e.target.value)}
                placeholder="Search display name prefix..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            onClick={() => loadData(null, false)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Entries Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-medium uppercase tracking-wider text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">ID / Protocol</th>
                  <th className="px-4 py-3.5">Display Name</th>
                  <th className="px-4 py-3.5">Score Metric</th>
                  <th className="px-4 py-3.5">Age Cohort</th>
                  <th className="px-4 py-3.5">Created</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No leaderboard entries found matching filters.
                    </td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        <div className="text-white font-medium">{entry.id}</div>
                        <div className="text-[11px] text-slate-500">{entry.assessmentType}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-white">{entry.displayName}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sky-400">
                        {entry.scoreMetric.toFixed(1)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {entry.ageGroup || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {entry.hidden ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <EyeOff className="w-3 h-3" /> Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Eye className="w-3 h-3" /> Visible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Alias */}
                          <button
                            title="Edit Alias"
                            onClick={() => setEditingEntry(entry)}
                            disabled={actionInProgress === entry.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Hide / Unhide */}
                          {entry.hidden ? (
                            <button
                              title="Unhide Entry"
                              onClick={() => handleUnhide(entry)}
                              disabled={actionInProgress === entry.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                            >
                              {actionInProgress === entry.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              title="Soft-Hide Entry"
                              onClick={() => handleHide(entry)}
                              disabled={actionInProgress === entry.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                            >
                              {actionInProgress === entry.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            title="Delete Entry"
                            onClick={() => setDeletingEntry(entry)}
                            disabled={actionInProgress === entry.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {hasMore && (
            <div className="p-4 border-t border-white/5 flex justify-center bg-slate-900/20">
              <button
                onClick={() => loadData(nextCursor, true)}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Load More Entries
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Passcode Modal */}
      <AdminPasscodeModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false);
          loadData(null, false);
        }}
      />

      {/* Edit Alias Modal */}
      <AdminEditAliasModal
        isOpen={!!editingEntry}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={updated => {
          setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)));
          setActionFeedback({ type: 'success', message: `Alias updated to ${updated.displayName}.` });
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-rose-500/20 bg-slate-900 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-rose-400">Permanently Delete Entry?</h3>
                <p className="text-xs text-slate-400 font-mono">{deletingEntry.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete the public leaderboard row and associated private metadata. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
