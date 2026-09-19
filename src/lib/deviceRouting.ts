export interface DeviceRoutingDecision {
  isExplicitForceMobile: boolean;
  isExplicitForceDesktop: boolean;
  isMobileDevice: boolean;
  shouldUseMobile: boolean;
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const source = cookieHeader ?? (typeof document !== 'undefined' ? document.cookie : '');
  if (!source) return cookies;
  const pairs = source.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      if (key) cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

export function isTruthyRoutingFlag(val: string | null | undefined): boolean {
  if (!val) return false;
  const v = val.toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes';
}

export function detectIsMobileDevice(uaString?: string): boolean {
  if (typeof window === 'undefined' && !uaString) return false;
  const ua = uaString || (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle|KFAPWI|Fennec|Windows Phone|SamsungBrowser|MiuiBrowser|UCBrowser/i.test(ua);
  if (isMobileUA) return true;

  if (typeof window !== 'undefined') {
    const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0;
    const hasTouch = ('ontouchstart' in window) || maxTouchPoints > 0;
    // iPadOS Safari in desktop mode: Macintosh UA with multi-touch points
    const isTouchMac = maxTouchPoints > 1 && /Macintosh/i.test(ua);
    if (isTouchMac) return true;

    const screenW = window.screen ? Math.min(window.screen.width, window.screen.height) : 0;
    const innerW = window.innerWidth || 0;
    const isSmallScreen = (screenW > 0 && screenW <= 768) || (innerW > 0 && innerW <= 768);
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    if ((hasTouch || isCoarse) && isSmallScreen) return true;
  }

  return false;
}

export function evaluateDeviceRouting(searchString?: string, cookieHeader?: string, uaString?: string): DeviceRoutingDecision {
  const search = searchString ?? (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(search);

  const hasForceMobileParam = isTruthyRoutingFlag(params.get('force_mobile')) || isTruthyRoutingFlag(params.get('mobile'));
  const hasForceDesktopParam = isTruthyRoutingFlag(params.get('force_desktop')) || isTruthyRoutingFlag(params.get('desktop'));

  let storedDesktop = false;
  let storedMobile = false;

  if (typeof window !== 'undefined') {
    try {
      storedDesktop = sessionStorage.getItem('pulse_force_desktop') === 'true';
      storedMobile = sessionStorage.getItem('pulse_force_mobile') === 'true';
    } catch {}
  }

  const cookies = parseCookies(cookieHeader);
  const cookieDesktop = cookies['pulse_force_desktop'] === 'true' || cookies['pulse_force_desktop'] === '1';
  const cookieMobile = cookies['pulse_force_mobile'] === 'true' || cookies['pulse_force_mobile'] === '1';

  // Explicit parameters take precedence over stored state
  if (hasForceMobileParam) {
    storedDesktop = false;
    storedMobile = true;
  } else if (hasForceDesktopParam) {
    storedDesktop = true;
    storedMobile = false;
  }

  const isExplicitForceMobile = hasForceMobileParam || (!hasForceDesktopParam && (storedMobile || cookieMobile));
  const isExplicitForceDesktop = !isExplicitForceMobile && (hasForceDesktopParam || storedDesktop || cookieDesktop);

  const isMobileDevice = detectIsMobileDevice(uaString);
  const shouldUseMobile = isExplicitForceMobile ? true : isExplicitForceDesktop ? false : isMobileDevice;

  return {
    isExplicitForceMobile,
    isExplicitForceDesktop,
    isMobileDevice,
    shouldUseMobile
  };
}

export function cleanConsumedRoutingParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let mutated = false;
    const routingKeys = ['force_mobile', 'mobile', 'force_desktop', 'desktop'];
    for (const key of routingKeys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        mutated = true;
      }
    }
    if (mutated) {
      const searchStr = url.searchParams.toString();
      const newRelativePathQuery = url.pathname + (searchStr ? '?' + searchStr : '') + url.hash;
      window.history.replaceState(window.history.state, '', newRelativePathQuery);
    }
  } catch {}
}

export function syncDeviceRoutingStorage(decision: DeviceRoutingDecision, hasParams: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (decision.isExplicitForceMobile) {
      sessionStorage.removeItem('pulse_force_desktop');
      sessionStorage.setItem('pulse_force_mobile', 'true');
      document.cookie = "pulse_force_desktop=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "pulse_force_mobile=true; path=/; max-age=86400; SameSite=Lax";
    } else if (decision.isExplicitForceDesktop) {
      sessionStorage.removeItem('pulse_force_mobile');
      sessionStorage.setItem('pulse_force_desktop', 'true');
      document.cookie = "pulse_force_mobile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "pulse_force_desktop=true; path=/; max-age=86400; SameSite=Lax";
    }
    if (hasParams) {
      cleanConsumedRoutingParams();
    }
  } catch {}
}

const LOOP_GUARD_KEY = 'pulse_redirect_loop_guard';

export function checkAndSetRedirectLoopGuard(targetPath: string, maxAttempts = 2): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(LOOP_GUARD_KEY);
    const data: { path: string; count: number; timestamp: number } = raw
      ? JSON.parse(raw)
      : { path: '', count: 0, timestamp: 0 };
    const now = Date.now();
    // Reset guard if last redirect was > 10 seconds ago
    if (now - data.timestamp > 10000 || data.path !== targetPath) {
      sessionStorage.setItem(LOOP_GUARD_KEY, JSON.stringify({ path: targetPath, count: 1, timestamp: now }));
      return false;
    }
    data.count += 1;
    data.timestamp = now;
    sessionStorage.setItem(LOOP_GUARD_KEY, JSON.stringify(data));
    if (data.count > maxAttempts) {
      console.warn(`[PULSE Router] Redirect loop detected for ${targetPath}. Halting automated redirection.`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearRedirectLoopGuard(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(LOOP_GUARD_KEY);
  } catch {}
}

export interface DeviceRedirectResult {
  shouldRedirect: boolean;
  targetUrl: string | null;
  reason: 'device_is_mobile' | 'desktop_shell_served_for_mobile' | 'none';
  loopHalted?: boolean;
}

export function resolveDeviceRedirect(
  pathname: string,
  search: string = '',
  hash: string = '',
  cookieHeader?: string,
  uaString?: string
): DeviceRedirectResult {
  const currentPath = pathname || '/';

  // 1. Never redirect admin routes
  if (currentPath.startsWith('/admin')) {
    return { shouldRedirect: false, targetUrl: null, reason: 'none' };
  }

  // 2. Case: Desktop shell was incorrectly served for /mobile/* (e.g. fallback hosting environment)
  if (currentPath.startsWith('/mobile')) {
    const rawPath = currentPath === '/mobile' ? '/mobile/' : currentPath;
    const targetUrl = `${rawPath}${search}${hash}`;
    if (checkAndSetRedirectLoopGuard(targetUrl)) {
      console.warn(`[PULSE Router] Desktop shell served at ${currentPath}; halting redirect loop.`);
      return { shouldRedirect: false, targetUrl: null, reason: 'desktop_shell_served_for_mobile', loopHalted: true };
    }
    return { shouldRedirect: true, targetUrl, reason: 'desktop_shell_served_for_mobile' };
  }

  // 3. Case: Standard desktop route evaluating whether the device should use mobile
  const decision = evaluateDeviceRouting(search, cookieHeader, uaString);
  const params = new URLSearchParams(search);
  const hasRoutingParam = params.has('force_mobile') || params.has('mobile') || params.has('force_desktop') || params.has('desktop');

  syncDeviceRoutingStorage(decision, hasRoutingParam);

  if (decision.shouldUseMobile) {
    const cleanPath = (currentPath === '/' || currentPath === '' || currentPath === '/index.html') ? '/' : currentPath;
    const targetParams = new URLSearchParams(search);
    targetParams.delete('force_mobile');
    targetParams.delete('mobile');
    targetParams.delete('force_desktop');
    targetParams.delete('desktop');
    const targetSearch = targetParams.toString() ? `?${targetParams.toString()}` : '';
    const targetPath = (cleanPath === '/' ? '/mobile/' : `/mobile${cleanPath}`) + targetSearch + hash;

    if (checkAndSetRedirectLoopGuard(targetPath)) {
      return { shouldRedirect: false, targetUrl: null, reason: 'device_is_mobile', loopHalted: true };
    }
    return { shouldRedirect: true, targetUrl: targetPath, reason: 'device_is_mobile' };
  }

  clearRedirectLoopGuard();
  return { shouldRedirect: false, targetUrl: null, reason: 'none' };
}
