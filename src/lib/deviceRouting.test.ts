import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluateDeviceRouting,
  detectIsMobileDevice,
  isTruthyRoutingFlag,
  parseCookies,
  syncDeviceRoutingStorage,
  cleanConsumedRoutingParams,
  checkAndSetRedirectLoopGuard,
  clearRedirectLoopGuard,
  resolveDeviceRedirect
} from './deviceRouting';

class MockStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

const mockSessionStorage = new MockStorage();

describe('deviceRouting', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    mockSessionStorage.clear();
    vi.stubGlobal('sessionStorage', mockSessionStorage);
  });

  describe('isTruthyRoutingFlag', () => {
    it('returns true for truthy string flags', () => {
      expect(isTruthyRoutingFlag('1')).toBe(true);
      expect(isTruthyRoutingFlag('true')).toBe(true);
      expect(isTruthyRoutingFlag('TRUE')).toBe(true);
      expect(isTruthyRoutingFlag('yes')).toBe(true);
      expect(isTruthyRoutingFlag(' YES ')).toBe(true);
    });

    it('returns false for falsy or undefined flags', () => {
      expect(isTruthyRoutingFlag('0')).toBe(false);
      expect(isTruthyRoutingFlag('false')).toBe(false);
      expect(isTruthyRoutingFlag('no')).toBe(false);
      expect(isTruthyRoutingFlag('')).toBe(false);
      expect(isTruthyRoutingFlag(null)).toBe(false);
      expect(isTruthyRoutingFlag(undefined)).toBe(false);
    });
  });

  describe('parseCookies', () => {
    it('correctly parses cookie key-values with whitespace handling', () => {
      const header = 'pulse_force_desktop=true; other_cookie=xyz; pulse_force_mobile=1';
      const cookies = parseCookies(header);
      expect(cookies['pulse_force_desktop']).toBe('true');
      expect(cookies['other_cookie']).toBe('xyz');
      expect(cookies['pulse_force_mobile']).toBe('1');
    });

    it('handles empty or missing cookies', () => {
      expect(parseCookies('')).toEqual({});
      expect(parseCookies(undefined)).toEqual({});
    });
  });

  describe('evaluateDeviceRouting URL search param evaluation', () => {
    it('prioritizes explicit force_mobile query param', () => {
      const decision = evaluateDeviceRouting('?force_mobile=1');
      expect(decision.isExplicitForceMobile).toBe(true);
      expect(decision.isExplicitForceDesktop).toBe(false);
      expect(decision.shouldUseMobile).toBe(true);
    });

    it('prioritizes explicit mobile=true query param', () => {
      const decision = evaluateDeviceRouting('?mobile=true');
      expect(decision.isExplicitForceMobile).toBe(true);
      expect(decision.shouldUseMobile).toBe(true);
    });

    it('prioritizes explicit force_desktop query param', () => {
      const decision = evaluateDeviceRouting('?force_desktop=1');
      expect(decision.isExplicitForceDesktop).toBe(true);
      expect(decision.isExplicitForceMobile).toBe(false);
      expect(decision.shouldUseMobile).toBe(false);
    });

    it('prioritizes explicit desktop=true query param', () => {
      const decision = evaluateDeviceRouting('?desktop=true');
      expect(decision.isExplicitForceDesktop).toBe(true);
      expect(decision.shouldUseMobile).toBe(false);
    });

    it('avoids false positives from substring matching (e.g. other_mobile=10)', () => {
      const decision = evaluateDeviceRouting('?other_mobile=1&non_desktop=true', '', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(decision.isExplicitForceMobile).toBe(false);
      expect(decision.isExplicitForceDesktop).toBe(false);
      expect(decision.shouldUseMobile).toBe(false);
    });
  });

  describe('iPadOS desktop-mode Safari detection', () => {
    it('identifies touch-enabled Macintosh as mobile/tablet device', () => {
      const macUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
      
      // Stub window with maxTouchPoints > 1
      vi.stubGlobal('navigator', {
        userAgent: macUa,
        maxTouchPoints: 5
      });
      vi.stubGlobal('window', {
        navigator: { userAgent: macUa, maxTouchPoints: 5 },
        matchMedia: () => ({ matches: false })
      });

      expect(detectIsMobileDevice(macUa)).toBe(true);
    });

    it('identifies standard non-touch Macintosh as desktop', () => {
      const macUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      
      vi.stubGlobal('navigator', {
        userAgent: macUa,
        maxTouchPoints: 0
      });
      vi.stubGlobal('window', {
        navigator: { userAgent: macUa, maxTouchPoints: 0 },
        matchMedia: () => ({ matches: false })
      });

      expect(detectIsMobileDevice(macUa)).toBe(false);
    });
  });

  describe('cleanConsumedRoutingParams', () => {
    it('removes routing flags while preserving other search params and hash', () => {
      let replacedUrl = '';
      vi.stubGlobal('window', {
        location: {
          href: 'https://pulse-lab.in/assessments?ref=twitter&force_mobile=1&utm_source=test#results',
          pathname: '/assessments',
          search: '?ref=twitter&force_mobile=1&utm_source=test',
          hash: '#results'
        },
        history: {
          state: null,
          replaceState: vi.fn((_state, _title, url) => {
            replacedUrl = url;
          })
        }
      });

      cleanConsumedRoutingParams();
      expect(replacedUrl).toBe('/assessments?ref=twitter&utm_source=test#results');
    });
  });

  describe('checkAndSetRedirectLoopGuard', () => {
    beforeEach(() => {
      clearRedirectLoopGuard();
    });

    it('allows initial redirects but detects and halts redirect loops', () => {
      const path = '/mobile/';
      expect(checkAndSetRedirectLoopGuard(path, 2)).toBe(false); // attempt 1
      expect(checkAndSetRedirectLoopGuard(path, 2)).toBe(false); // attempt 2
      expect(checkAndSetRedirectLoopGuard(path, 2)).toBe(true);  // attempt 3 -> LOOP DETECTED
    });

    it('resets guard when destination path changes', () => {
      expect(checkAndSetRedirectLoopGuard('/mobile/', 2)).toBe(false);
      expect(checkAndSetRedirectLoopGuard('/desktop', 2)).toBe(false);
    });
  });

  describe('resolveDeviceRedirect', () => {
    beforeEach(() => {
      clearRedirectLoopGuard();
    });

    it('never redirects admin routes', () => {
      const res = resolveDeviceRedirect('/admin/dashboard', '?force_mobile=1', '#top');
      expect(res.shouldRedirect).toBe(false);
      expect(res.targetUrl).toBe(null);
      expect(res.reason).toBe('none');
    });

    it('handles desktop shell mistakenly served for /mobile/* with loop breaker', () => {
      const res1 = resolveDeviceRedirect('/mobile/assessment', '?id=vrt', '#run');
      expect(res1.shouldRedirect).toBe(true);
      expect(res1.targetUrl).toBe('/mobile/assessment?id=vrt#run');
      expect(res1.reason).toBe('desktop_shell_served_for_mobile');

      // Subsequent loop triggering
      resolveDeviceRedirect('/mobile/assessment', '?id=vrt', '#run');
      const resLoop = resolveDeviceRedirect('/mobile/assessment', '?id=vrt', '#run');
      expect(resLoop.shouldRedirect).toBe(false);
      expect(resLoop.loopHalted).toBe(true);
    });

    it('redirects mobile device to /mobile/ preserving query and hash while removing force params', () => {
      const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15';
      const res = resolveDeviceRedirect('/', '?utm_source=twitter&force_mobile=1', '#intro', undefined, mobileUa);
      expect(res.shouldRedirect).toBe(true);
      expect(res.targetUrl).toBe('/mobile/?utm_source=twitter#intro');
      expect(res.reason).toBe('device_is_mobile');
    });

    it('redirects nested desktop route to /mobile/<route>', () => {
      const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15';
      const res = resolveDeviceRedirect('/assessment', '?test=vrt', '', undefined, mobileUa);
      expect(res.shouldRedirect).toBe(true);
      expect(res.targetUrl).toBe('/mobile/assessment?test=vrt');
      expect(res.reason).toBe('device_is_mobile');
    });

    it('does not redirect desktop devices on desktop routes', () => {
      const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const res = resolveDeviceRedirect('/assessment', '', '', undefined, desktopUa);
      expect(res.shouldRedirect).toBe(false);
      expect(res.targetUrl).toBe(null);
      expect(res.reason).toBe('none');
    });
  });
});

