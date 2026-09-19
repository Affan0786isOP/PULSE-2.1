const WELCOME_STORAGE_KEY = 'pulse_mobile_welcome_seen';
const LEGACY_WELCOME_STORAGE_KEY = 'pulse_welcome_seen';

export function isMobileWelcomeSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(WELCOME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setMobileWelcomeSeen(seen: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (seen) {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_WELCOME_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(WELCOME_STORAGE_KEY);
      localStorage.removeItem(LEGACY_WELCOME_STORAGE_KEY);
    }
  } catch {}
}
