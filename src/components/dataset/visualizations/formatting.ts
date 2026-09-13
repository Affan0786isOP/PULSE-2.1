/**
 * PULSE Dataset Visualization Formatting Engine
 * ==============================================================================
 * Centralized, deterministic formatting for all research telemetry visualizations.
 * Guarantees consistent precision, units, and null handling across charts.
 * ==============================================================================
 */

/**
 * Format reaction latency or interval in milliseconds
 */
export function formatMilliseconds(ms: number | null | undefined, decimals = 1): string {
  if (ms === null || ms === undefined || isNaN(ms) || !isFinite(ms)) {
    return '—';
  }
  return `${ms.toFixed(decimals)} ms`;
}

/**
 * Format raw number in milliseconds without unit (for axis labels)
 */
export function formatMillisecondsRaw(ms: number | null | undefined, decimals = 0): string {
  if (ms === null || ms === undefined || isNaN(ms) || !isFinite(ms)) {
    return '—';
  }
  return `${ms.toFixed(decimals)}`;
}

/**
 * Format percentage with specified precision
 */
export function formatPercentage(pct: number | null | undefined, decimals = 1): string {
  if (pct === null || pct === undefined || isNaN(pct) || !isFinite(pct)) {
    return '—';
  }
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format observational count with locale thousands separator
 */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) {
    return '0';
  }
  return Math.round(n).toLocaleString();
}

/**
 * Format display refresh rate in Hertz
 */
export function formatHertz(hz: number | null | undefined): string {
  if (hz === null || hz === undefined || isNaN(hz) || !isFinite(hz)) {
    return '—';
  }
  return `${Math.round(hz)} Hz`;
}

/**
 * Format percentile key to human-readable label
 */
export function formatPercentileLabel(p: string | number): string {
  if (typeof p === 'number') {
    return `p${p}`;
  }
  const clean = p.toLowerCase().replace(/[^0-9]/g, '');
  return clean ? `p${clean}` : p;
}

/**
 * Format Year-Month (e.g. '2026-03') to short human label ('Mar 2026')
 */
export function formatMonthLabel(monthStr: string | null | undefined): string {
  if (!monthStr || monthStr === 'all' || monthStr === 'unspecified') {
    return 'All Time';
  }

  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (!isNaN(year) && !isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[monthIndex]} ${year}`;
    }
  }

  return monthStr;
}

/**
 * Generic value with unit formatting
 */
export function formatValueWithUnit(val: number | null | undefined, unit?: string, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return '—';
  }
  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format protocol identifier into display title
 */
export function formatProtocolLabel(protocol: string | null | undefined): string {
  if (!protocol || protocol === 'all') return 'All Protocols';
  switch (protocol) {
    case 'visual-reaction':
      return 'Visual Reaction (SRT)';
    case 'direction':
      return 'Direction Reflex (CRT)';
    case 'color-recognition':
    case 'colour-recognition':
      return 'Colour Recognition (Stroop)';
    case 'block-memory':
      return 'Block Memory (Corsi)';
    case 'number-memory':
      return 'Number Memory (Digit Span)';
    default:
      return protocol.replace(/-/g, ' ').toUpperCase();
  }
}
