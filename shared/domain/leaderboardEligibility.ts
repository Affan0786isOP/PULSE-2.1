export function isOptedInLeaderboardUser(displayName: string | null | undefined): boolean {
  const trimmed = String(displayName || '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'anonymous' || lower === 'unknown' || lower === 'guest') return false;
  if (lower.startsWith('participant')) return false;
  return true;
}
