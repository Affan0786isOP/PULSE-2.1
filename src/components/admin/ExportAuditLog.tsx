import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  Search, 
  Layers, 
  History,
  Sparkles,
  Lock
} from 'lucide-react';
import { AdminAuditLog, fetchAdminAuditLogs } from '../../lib/adminActions';

export function ExportAuditLog() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const loadSessionsAndLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const auditLogs = await fetchAdminAuditLogs();
      setLogs(auditLogs);
    } catch (err) {
      console.warn("Failed to load audit logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSessionsAndLogs();

    const handleLogAdded = () => {
      loadSessionsAndLogs();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pulse_admin_audit_log_added', handleLogAdded);
      return () => window.removeEventListener('pulse_admin_audit_log_added', handleLogAdded);
    }
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!searchLogQuery.trim()) return true;
    const q = searchLogQuery.toLowerCase();
    return (
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      (log.note && log.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-10" id="export-audit-log">
      {/* SECTION 2: IMMUTABLE ADMINISTRATIVE AUDIT LOG */}
      <section className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Security & Provenance
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                <Lock size={12} className="text-cyan-400" />
                Tamper-Resistant Audit Trail
              </span>
            </div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
              <History className="text-cyan-400" size={24} />
              Administrative Audit Logs
            </h3>
            <p className="text-xs font-sans text-[var(--text-secondary)] mt-1">
              Read-only ledger tracking all administrative state changes and moderation actions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-lg bg-[#111] border border-white/10 text-xs text-[var(--text-main)] placeholder-white/30 focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:border-cyan-500/50 w-44 md:w-56 font-mono"
              />
            </div>

            <button type="button"
              onClick={loadSessionsAndLogs}
              disabled={isLoadingLogs}
              className="p-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] active:scale-95 border border-white/10 text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              title="Refresh audit logs"
            >
              <RefreshCw size={14} className={isLoadingLogs ? 'animate-spin text-cyan-400' : ''} />
            </button>
          </div>
        </div>

        {/* AUDIT LOG TABLE */}
        <div className="overflow-x-auto rounded-xl border border-white/5 max-h-96">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="bg-[#090d16] text-[var(--text-muted)] sticky top-0 z-10 border-b border-white/10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Actor / Admin</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Resource</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Audit Note / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-semibold text-cyan-300">
                      {log.actor}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action.includes('HIDE') || log.action.includes('DELETE')
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.action.includes('SCAN') || log.action.includes('VALIDATION')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3 text-[var(--text-main)]">
                      <code className="text-xs text-white/90 bg-white/5 px-1.5 py-0.5 rounded">
                        {log.target}
                      </code>
                    </td>

                    <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>

                    <td className="p-3 text-[var(--text-secondary)] font-sans text-xs max-w-sm">
                      {log.note || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm font-sans text-[var(--text-muted)]">
                    No administrative audit records match active search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECURITY FOOTNOTE */}
        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15 flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>Target Collection: <code className="text-cyan-300">adminAuditLogs</code></span>
          </div>
          <span>Status: Enforced Read-Only in Client Console</span>
        </div>
      </section>
    </div>
  );
}
