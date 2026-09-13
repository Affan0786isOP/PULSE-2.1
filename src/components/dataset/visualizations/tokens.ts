/**
 * PULSE Dataset Visualization Design Tokens
 * ==============================================================================
 * Grounded in authoritative PULSE design system tokens (index.css & Leaderboard).
 * Supplies uniform color palettes, typography specs, margins, and tooltips.
 * ==============================================================================
 */

export const CHART_PALETTE = {
  primary: 'var(--cyan-primary, #22C7D6)',
  primaryHex: '#22C7D6',
  primaryMuted: 'rgba(34, 199, 214, 0.25)',
  primarySubtle: 'rgba(34, 199, 214, 0.08)',
  
  secondary: '#818CF8', // Indigo
  secondaryMuted: 'rgba(129, 140, 248, 0.25)',
  
  tertiary: '#38BDF8', // Sky Blue
  tertiaryMuted: 'rgba(56, 189, 248, 0.25)',

  success: 'var(--success, #34C759)',
  successHex: '#34C759',
  successMuted: 'rgba(52, 199, 89, 0.25)',

  warning: 'var(--warning, #F2B84B)',
  warningHex: '#F2B84B',
  warningMuted: 'rgba(242, 184, 75, 0.25)',

  danger: 'var(--danger, #E05260)',
  dangerHex: '#E05260',
  dangerMuted: 'rgba(224, 82, 96, 0.25)',

  neutral: '#707A87',
  neutralMuted: 'rgba(112, 122, 135, 0.25)',

  grid: 'rgba(255, 255, 255, 0.05)',
  gridStrong: 'rgba(255, 255, 255, 0.10)',
  axisText: '#707A87',
  
  backgroundCard: 'var(--surface-1, #12161B)',
  backgroundPanel: 'var(--surface-2, #181D23)',
  borderSubtle: 'var(--border-subtle, #20262D)',
  borderDefault: 'var(--border-default, #29313A)',
  textPrimary: 'var(--text-primary, #F5F7FA)',
  textSecondary: 'var(--text-secondary, #A7B0BC)',
  textMuted: 'var(--text-muted, #707A87)',

  // Sequence for multi-category / multi-series charts
  series: [
    '#22C7D6', // Cyan Primary
    '#818CF8', // Indigo
    '#34C759', // Green Success
    '#F2B84B', // Amber Warning
    '#38BDF8', // Sky Blue
    '#E05260', // Rose Danger
    '#A78BFA', // Purple
    '#F472B6', // Pink
  ]
};

export const CHART_DIMENSIONS = {
  compactHeight: 220,
  defaultHeight: 300,
  largeHeight: 380,
  margin: { top: 12, right: 16, left: 0, bottom: 24 },
  marginWithAxis: { top: 12, right: 16, left: 8, bottom: 28 },
};

export const CHART_AXIS_STYLES = {
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  fill: '#707A87',
  tickLine: false,
  axisLine: false,
  dy: 8,
};

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#12161B',
  borderColor: '#29313A',
  borderWidth: '1px',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
  padding: '8px 12px',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace',
  color: '#F5F7FA',
};
