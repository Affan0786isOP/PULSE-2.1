import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Minus,
  Maximize2,
  Copy,
  Check
} from 'lucide-react';
import { DatasetObservation } from '../../lib/dataset/types';
import { getAuthoritativeAgeLabel } from '../../lib/dataset/normalization';

interface DataExplorerProps {
  observations: DatasetObservation[];
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 25;

export function DataExplorer({
  observations,
  pageSize = DEFAULT_PAGE_SIZE
}: DataExplorerProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedObsId, setExpandedObsId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const totalCount = observations.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Automatically clamp current page when filter reduces dataset
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedObservations = useMemo(() => {
    return observations.slice(startIndex, endIndex);
  }, [observations, startIndex, endIndex]);

  const toggleRow = (obsId: string) => {
    setExpandedObsId(prev => (prev === obsId ? null : obsId));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const renderProtocolBadge = (protocol: string) => {
    const p = protocol.toLowerCase();
    let colorClass = "bg-[var(--bg-panel)] text-[var(--text-main)] border-[var(--border-subtle)]";
    let label = protocol;

    if (p.includes('visual') || p === 'reaction-test') {
      colorClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      label = "Visual Reaction";
    } else if (p.includes('direction')) {
      colorClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      label = "Direction";
    } else if (p.includes('colour') || p.includes('color')) {
      colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      label = "Colour Rec.";
    } else if (p.includes('block')) {
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      label = "Block Memory";
    } else if (p.includes('number')) {
      colorClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
      label = "Number Memory";
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border whitespace-nowrap ${colorClass}`}>
        {label}
      </span>
    );
  };

  const renderValidityBadge = (validityStatus: string, isValid: boolean) => {
    switch (validityStatus) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={10} />
            <span>VALID</span>
          </span>
        );
      case 'FALSE_START':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={10} />
            <span>FALSE START</span>
          </span>
        );
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={10} />
            <span>TIMEOUT</span>
          </span>
        );
      case 'INCORRECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={10} />
            <span>INCORRECT</span>
          </span>
        );
      case 'ABORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Minus size={10} />
            <span>ABORTED</span>
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${isValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
            {validityStatus || (isValid ? 'VALID' : 'INVALID')}
          </span>
        );
    }
  };

  const renderCorrectBadge = (isCorrect: boolean | null | undefined) => {
    if (isCorrect === true) {
      return <span className="text-emerald-400 font-mono font-bold text-xs">true</span>;
    }
    if (isCorrect === false) {
      return <span className="text-rose-400 font-mono font-bold text-xs">false</span>;
    }
    return <span className="text-[var(--text-muted)] font-mono">—</span>;
  };

  const formatTelemetryValue = (val: unknown): React.ReactNode => {
    if (val === null || val === undefined) {
      return <span className="text-[var(--text-muted)] italic font-mono text-xs">null</span>;
    }
    if (typeof val === 'boolean') {
      return val ? (
        <span className="text-emerald-400 font-mono font-bold text-xs">true</span>
      ) : (
        <span className="text-rose-400 font-mono font-bold text-xs">false</span>
      );
    }
    if (typeof val === 'number') {
      return <span className="font-mono text-[var(--cyan-primary)] font-semibold text-xs tabular-nums">{val}</span>;
    }
    return <span className="font-mono text-[var(--text-main)] text-xs">{String(val)}</span>;
  };

  if (totalCount === 0) {
    return (
      <div className="flex-1 min-h-[300px] bg-[var(--bg-panel)]/30 border border-dashed border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center p-6 text-center">
        <TableIcon size={32} className="text-[var(--text-muted)] mb-3" />
        <h3 className="font-bold text-sm text-[var(--text-main)] mb-1">No Observation Telemetry In View</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm">
          No observation records match the current filter criteria or the dataset is empty.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Table Container */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] select-none">
                <th scope="col" className="py-2.5 px-3 w-10 text-center">
                  <span className="sr-only">Inspect Details</span>
                </th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Observation ID</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Research Record ID</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Protocol</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-center">Trial</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Month</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Age Group</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Device</th>
                <th scope="col" className="py-2.5 px-3 font-semibold">Input Method</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-right">Refresh</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-right">Reaction Time</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-center">Validity</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-center">Correct</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-right">Delay Time</th>
                <th scope="col" className="py-2.5 px-3 font-semibold text-center">Delay Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/60">
              {paginatedObservations.map((obs) => {
                const isExpanded = expandedObsId === obs.obsId;
                return (
                  <React.Fragment key={obs.obsId}>
                    <tr
                      onClick={() => toggleRow(obs.obsId)}
                      className={`cursor-pointer transition-colors hover:bg-[var(--bg-panel)]/50 ${
                        isExpanded ? 'bg-[var(--cyan-primary)]/[0.04] border-l-2 border-l-[var(--cyan-primary)]' : ''
                      }`}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                      aria-label={`Observation ${obs.obsId}, click to ${isExpanded ? 'collapse' : 'expand'} full telemetry`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleRow(obs.obsId);
                        }
                      }}
                    >
                      {/* Expand Chevron */}
                      <td className="py-2 px-3 text-center text-[var(--text-muted)]">
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-[var(--cyan-primary)]" />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </td>

                      {/* Observation ID */}
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                        <span title={obs.obsId} className="hover:text-[var(--cyan-primary)] transition-colors">
                          {obs.obsId.length > 14 ? `${obs.obsId.slice(0, 14)}…` : obs.obsId}
                        </span>
                      </td>

                      {/* Research Record ID */}
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        <span title={obs.researchRecordId || obs.sessionId}>
                          {(obs.researchRecordId || obs.sessionId).length > 12 ? `${(obs.researchRecordId || obs.sessionId).slice(0, 12)}…` : (obs.researchRecordId || obs.sessionId)}
                        </span>
                      </td>

                      {/* Protocol */}
                      <td className="py-2 px-3">
                        {renderProtocolBadge(obs.assessmentType)}
                      </td>

                      {/* Trial Index */}
                      <td className="py-2 px-3 font-mono text-center tabular-nums text-[var(--text-main)]">
                        {obs.trialIndex}
                      </td>

                      {/* Month */}
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                        {obs.completedAtMonth || '—'}
                      </td>

                      {/* Age Cohort */}
                      <td className="py-2 px-3 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                        {getAuthoritativeAgeLabel(obs.ageGroup)}
                      </td>

                      {/* Device Category */}
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-secondary)] capitalize whitespace-nowrap">
                        {obs.deviceCategory || '—'}
                      </td>

                      {/* Input Modality */}
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-secondary)] capitalize whitespace-nowrap">
                        {obs.inputModality || '—'}
                      </td>

                      {/* Refresh Rate */}
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                        {typeof obs.refreshRateHz === 'number' ? `${obs.refreshRateHz} Hz` : '—'}
                      </td>

                      {/* Latency / RT */}
                      <td className="py-2 px-3 font-mono text-right font-bold text-[var(--cyan-primary)] tabular-nums whitespace-nowrap">
                        {typeof obs.latencyMs === 'number' ? `${obs.latencyMs} ms` : '—'}
                      </td>

                      {/* Validity */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {renderValidityBadge(obs.validityStatus, obs.isValid)}
                      </td>

                      {/* Correct */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {renderCorrectBadge(obs.isCorrect)}
                      </td>

                      {/* Wait Time (Foreperiod) */}
                      <td className="py-2 px-3 font-mono text-right tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                        {typeof obs.foreperiodMs === 'number' ? `${obs.foreperiodMs} ms` : '—'}
                      </td>

                      {/* Wait Type */}
                      <td className="py-2 px-3 font-mono text-center text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
                        {obs.foreperiodCategory || '—'}
                      </td>
                    </tr>

                    {/* Expandable Observation Telemetry Inspector */}
                    {isExpanded && (
                      <tr className="bg-[var(--bg-panel)]/80">
                        <td colSpan={15} className="p-4 sm:p-5 border-t border-b border-[var(--border-subtle)]">
                          <div className="flex flex-col gap-4 text-xs font-mono">
                            {/* Inspector Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                              <div className="flex items-center gap-2">
                                <Maximize2 size={14} className="text-[var(--cyan-primary)]" />
                                <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                                  Trial Detail Record
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--cyan-primary)]">
                                  {obs.obsId}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(JSON.stringify(obs, null, 2), obs.obsId);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/80 border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] transition-colors cursor-pointer active:scale-95"
                              >
                                {copiedKey === obs.obsId ? (
                                  <>
                                    <Check size={12} className="text-emerald-400" />
                                    <span className="text-emerald-400">Copied JSON</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy JSON Record</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Telemetry Detail Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {/* 1. Identifiers & Context */}
                              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                                <div className="text-[10px] uppercase font-bold text-[var(--cyan-primary)] tracking-wider mb-2">
                                  Basic Details
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Observation ID:</span>
                                  <span className="text-[var(--text-main)] truncate max-w-[140px]" title={obs.obsId}>{obs.obsId}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Research Record ID:</span>
                                  <span className="text-[var(--text-main)] truncate max-w-[140px]" title={obs.researchRecordId || obs.sessionId}>{obs.researchRecordId || obs.sessionId}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Protocol:</span>
                                  <span className="text-[var(--text-main)]">{obs.assessmentType}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Trial Index:</span>
                                  <span className="text-[var(--text-main)] tabular-nums">{obs.trialIndex}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Completion Month:</span>
                                  <span className="text-[var(--text-main)]">{obs.completedAtMonth || '—'}</span>
                                </div>
                                {typeof obs.completedAtTimestamp === 'number' && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[var(--text-muted)]">Timestamp:</span>
                                    <span className="text-[var(--text-main)] truncate max-w-[140px]" title={new Date(obs.completedAtTimestamp).toISOString()}>
                                      {new Date(obs.completedAtTimestamp).toISOString()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* 2. Demographic & Hardware Environment */}
                              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                                <div className="text-[10px] uppercase font-bold text-[var(--cyan-primary)] tracking-wider mb-2">
                                  User & Device Info
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Age Group:</span>
                                  <span className="text-[var(--text-main)]">{obs.ageGroup || '—'}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Device Category:</span>
                                  <span className="text-[var(--text-main)] capitalize">{obs.deviceCategory || '—'}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Input Method:</span>
                                  <span className="text-[var(--text-main)] capitalize">{obs.inputModality || '—'}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Refresh Rate:</span>
                                  <span>{typeof obs.refreshRateHz === 'number' ? `${obs.refreshRateHz} Hz` : formatTelemetryValue(obs.refreshRateHz)}</span>
                                </div>
                              </div>

                              {/* 3. Latency & Timing Calibration */}
                              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                                <div className="text-[10px] uppercase font-bold text-[var(--cyan-primary)] tracking-wider mb-2">
                                  Timing & Reaction Data
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Reaction Time:</span>
                                  <span>{typeof obs.latencyMs === 'number' ? `${obs.latencyMs} ms` : formatTelemetryValue(obs.latencyMs)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Raw Response Time:</span>
                                  <span>{typeof obs.rawLatencyMs === 'number' ? `${obs.rawLatencyMs} ms` : formatTelemetryValue(obs.rawLatencyMs)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Display Offset:</span>
                                  <span>{typeof obs.displayDelayOffsetMs === 'number' ? `${obs.displayDelayOffsetMs} ms` : formatTelemetryValue(obs.displayDelayOffsetMs)}</span>
                                </div>
                                {typeof obs.stimulusScheduledAtPerfMs === 'number' && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[var(--text-muted)]">Stimulus Scheduled:</span>
                                    <span>{formatTelemetryValue(obs.stimulusScheduledAtPerfMs)}</span>
                                  </div>
                                )}
                                {typeof obs.stimulusPresentedAtPerfMs === 'number' && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[var(--text-muted)]">Stimulus Presented:</span>
                                    <span>{formatTelemetryValue(obs.stimulusPresentedAtPerfMs)}</span>
                                  </div>
                                )}
                                {typeof obs.responseDetectedAtPerfMs === 'number' && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[var(--text-muted)]">Response Detected:</span>
                                    <span>{formatTelemetryValue(obs.responseDetectedAtPerfMs)}</span>
                                  </div>
                                )}
                              </div>

                              {/* 4. Quality & Validity Classification */}
                              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1.5">
                                <div className="text-[10px] uppercase font-bold text-[var(--cyan-primary)] tracking-wider mb-2">
                                  Data Quality & Validity
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Is Valid:</span>
                                  <span>{formatTelemetryValue(obs.isValid)}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Validity Status:</span>
                                  <span className="text-[var(--text-main)]">{obs.validityStatus}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-[var(--text-muted)]">Is Correct:</span>
                                  <span>{formatTelemetryValue(obs.isCorrect)}</span>
                                </div>
                                {obs.qualityFlag && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[var(--text-muted)]">Quality Flag:</span>
                                    <span className="text-[var(--text-main)]">{obs.qualityFlag}</span>
                                  </div>
                                )}
                                {obs.provenanceToken && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[var(--text-muted)]">Provenance:</span>
                                    <span className="text-[var(--text-main)] truncate max-w-[120px]" title={obs.provenanceToken}>
                                      {obs.provenanceToken}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Protocol Specific Telemetry Sub-panel (Only shown if specific fields are defined) */}
                            {(obs.foreperiodMs !== undefined ||
                              obs.targetDirection !== undefined ||
                              obs.targetColor !== undefined ||
                              obs.level !== undefined ||
                              obs.sequenceLength !== undefined) && (
                              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                                <div className="text-[10px] uppercase font-bold text-[var(--cyan-primary)] tracking-wider mb-2">
                                  Protocol-Specific Observation Telemetry
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                  {obs.foreperiodMs !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Foreperiod Delay</div>
                                      <div className="font-bold text-[var(--text-main)]">{typeof obs.foreperiodMs === 'number' ? `${obs.foreperiodMs} ms` : formatTelemetryValue(obs.foreperiodMs)}</div>
                                    </div>
                                  )}
                                  {obs.foreperiodCategory !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Foreperiod Category</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.foreperiodCategory)}</div>
                                    </div>
                                  )}
                                  {obs.targetDirection !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Target Direction</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.targetDirection)}</div>
                                    </div>
                                  )}
                                  {obs.chosenDirection !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Chosen Direction</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.chosenDirection)}</div>
                                    </div>
                                  )}
                                  {obs.userResponse !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">User Response</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.userResponse)}</div>
                                    </div>
                                  )}
                                  {obs.targetColor !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Target Color</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.targetColor)}</div>
                                    </div>
                                  )}
                                  {obs.chosenColor !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Chosen Color</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.chosenColor)}</div>
                                    </div>
                                  )}
                                  {obs.wordName !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Word Name</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.wordName)}</div>
                                    </div>
                                  )}
                                  {obs.wordColor !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Word Color</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.wordColor)}</div>
                                    </div>
                                  )}
                                  {obs.condition !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Condition</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.condition)}</div>
                                    </div>
                                  )}
                                  {obs.instruction !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Instruction</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.instruction)}</div>
                                    </div>
                                  )}
                                  {obs.level !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Level</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.level)}</div>
                                    </div>
                                  )}
                                  {obs.sequenceLength !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Sequence Length</div>
                                      <div className="font-bold text-[var(--text-main)]">{formatTelemetryValue(obs.sequenceLength)}</div>
                                    </div>
                                  )}
                                  {obs.responseDurationMs !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Response Duration</div>
                                      <div className="font-bold text-[var(--text-main)]">{typeof obs.responseDurationMs === 'number' ? `${obs.responseDurationMs} ms` : formatTelemetryValue(obs.responseDurationMs)}</div>
                                    </div>
                                  )}
                                  {obs.interTapTimeMs !== undefined && (
                                    <div>
                                      <div className="text-[10px] text-[var(--text-muted)] uppercase">Inter-Tap Latency</div>
                                      <div className="font-bold text-[var(--text-main)]">{typeof obs.interTapTimeMs === 'number' ? `${obs.interTapTimeMs} ms` : formatTelemetryValue(obs.interTapTimeMs)}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 font-mono text-xs text-[var(--text-secondary)] select-none">
        <div className="text-[11px] text-[var(--text-muted)]">
          Showing <strong className="text-[var(--text-main)]">{totalCount > 0 ? (startIndex + 1).toLocaleString() : 0}</strong>–
          <strong className="text-[var(--text-main)]">{endIndex.toLocaleString()}</strong> of{' '}
          <strong className="text-[var(--text-main)]">{totalCount.toLocaleString()}</strong> observations
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="data-explorer-prev-page"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous observation page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-[var(--text-main)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            Page <strong className="text-[var(--cyan-primary)] font-bold">{currentPage}</strong> of{' '}
            <strong className="text-[var(--text-main)]">{totalPages}</strong>
          </div>

          <button
            type="button"
            id="data-explorer-next-page"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next observation page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-[var(--text-main)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
