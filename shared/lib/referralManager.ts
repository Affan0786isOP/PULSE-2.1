import {
  ALLOWED_REFERRAL_TOKENS,
  ReferralToken,
  REFERRAL_STORAGE_KEY,
  REFERRAL_TTL_MS,
  StoredReferralContext,
  isValidReferralToken
} from '../contracts/referralContract';

/**
 * Captures an allowlisted referral token from the current URL query parameters (?ref=...),
 * persists it to sessionStorage with a timestamp, and sanitizes the address bar.
 */
export function captureReferralFromUrl(): ReferralToken | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const refParam = url.searchParams.get('ref');

    if (refParam && isValidReferralToken(refParam)) {
      const stored: StoredReferralContext = {
        token: refParam,
        timestamp: Date.now()
      };
      window.sessionStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(stored));

      // Sanitize URL bar without reloading the page
      url.searchParams.delete('ref');
      const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState(window.history.state, '', cleanUrl);

      return refParam;
    }
  } catch {
    // Fail closed: never break browser navigation on referral parse failure
  }

  return getActiveReferralToken();
}

/**
 * Retrieves the currently active referral token if present and within the 30-minute TTL.
 */
export function getActiveReferralToken(): ReferralToken | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredReferralContext;
    if (
      parsed &&
      isValidReferralToken(parsed.token) &&
      typeof parsed.timestamp === 'number' &&
      Date.now() - parsed.timestamp <= REFERRAL_TTL_MS
    ) {
      return parsed.token;
    }

    // Expired or corrupt: purge it
    window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  }

  return null;
}

/**
 * Clears the active referral token from sessionStorage upon assessment completion.
 */
export function clearActiveReferralToken(): void {
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    try {
      window.sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
