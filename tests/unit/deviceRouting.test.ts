import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateDeviceRouting as evaluateDesktopRouting, resolveDeviceRedirect as resolveDesktopRedirect } from '../../src/lib/deviceRouting';
import { evaluateDeviceRouting as evaluateMobileRouting, resolveDeviceRedirect as resolveMobileRedirect } from '../../mobile/src/lib/deviceRouting';
import { applyDeviceRoutingMiddleware } from '../../server/middleware/deviceRouting';

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';
const DESKTOP_UA_WITH_BROWSER_BRAND =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 SamsungBrowser/29.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';

beforeEach(() => {
  window.sessionStorage.clear();
  document.cookie = 'pulse_force_mobile=; Max-Age=0; path=/';
  document.cookie = 'pulse_force_desktop=; Max-Age=0; path=/';
});

describe.each([
  ['desktop routing helper', evaluateDesktopRouting],
  ['mobile routing helper', evaluateMobileRouting],
])('%s', (_name, evaluateDeviceRouting) => {
  it('does not let a persisted mobile preference redirect a desktop browser to mobile', () => {
    window.sessionStorage.setItem('pulse_force_mobile', 'true');
    const decision = evaluateDeviceRouting('', 'pulse_force_mobile=true', DESKTOP_UA);

    expect(decision.isMobileDevice).toBe(false);
    expect(decision.isExplicitForceMobile).toBe(false);
    expect(decision.shouldUseMobile).toBe(false);
  });

  it('does not classify desktop browser brands as mobile without a mobile platform signal', () => {
    const decision = evaluateDeviceRouting('', '', DESKTOP_UA_WITH_BROWSER_BRAND);

    expect(decision.isMobileDevice).toBe(false);
    expect(decision.shouldUseMobile).toBe(false);
  });

  it('still honors an explicit force-mobile URL flag on desktop', () => {
    const decision = evaluateDeviceRouting('?force_mobile=1', '', DESKTOP_UA);

    expect(decision.isExplicitForceMobile).toBe(true);
    expect(decision.shouldUseMobile).toBe(true);
  });

  it('still routes an actual mobile User-Agent to mobile', () => {
    const decision = evaluateDeviceRouting('', '', MOBILE_UA);

    expect(decision.isMobileDevice).toBe(true);
    expect(decision.shouldUseMobile).toBe(true);
  });

  it('lets an explicit force-desktop URL flag win on mobile', () => {
    const decision = evaluateDeviceRouting('?force_desktop=1', '', MOBILE_UA);

    expect(decision.isExplicitForceDesktop).toBe(true);
    expect(decision.shouldUseMobile).toBe(false);
  });
});

describe.each([
  ['desktop routing resolver', resolveDesktopRedirect],
  ['mobile routing resolver', resolveMobileRedirect],
])('%s', (_name, resolveDeviceRedirect) => {
  it('keeps an explicitly selected mobile experience across /mobile page navigation on desktop', () => {
    window.sessionStorage.setItem('pulse_force_mobile', 'true');
    document.cookie = 'pulse_force_mobile=true; path=/';

    const redirect = resolveDeviceRedirect('/mobile/about', '', '');

    expect(redirect.shouldRedirect).toBe(false);
  });

  it('still honors force-desktop from a mobile route when mobile mode was persisted', () => {
    window.sessionStorage.setItem('pulse_force_mobile', 'true');
    document.cookie = 'pulse_force_mobile=true; path=/';

    const redirect = resolveDeviceRedirect('/mobile/about', '?force_desktop=1&campaign=keep', '#section');

    expect(redirect.shouldRedirect).toBe(true);
    expect(redirect.targetUrl).toBe('/about?campaign=keep#section');
  });
});

describe('server mobile-path normalization', () => {
  it('preserves explicit routing flags and ordinary query parameters for /mobile/', () => {
    const middleware: Array<(req: any, res: any, next: () => void) => unknown> = [];
    const mockApp = { use: (handler: (req: any, res: any, next: () => void) => unknown) => middleware.push(handler) } as any;
    applyDeviceRoutingMiddleware(mockApp);

    const redirects: Array<{ status: number; location: string }> = [];
    const req = {
      method: 'GET',
      headers: { host: 'pulse-lab.in', accept: 'text/html', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      url: '/mobile?force_mobile=1&campaign=keep',
      path: '/mobile',
      secure: true,
    };
    const res = {
      setHeader: () => undefined,
      redirect: (status: number, location: string) => redirects.push({ status, location }),
      send: () => undefined,
    } as any;

    middleware[1](req, res, () => {
      throw new Error('Expected /mobile canonical redirect');
    });

    expect(redirects).toEqual([{ status: 301, location: '/mobile/?force_mobile=1&campaign=keep' }]);
  });

  it('does not redirect mobile asset requests into the mobile page route', () => {
    const middleware: Array<(req: any, res: any, next: () => void) => unknown> = [];
    const mockApp = { use: (handler: (req: any, res: any, next: () => void) => unknown) => middleware.push(handler) } as any;
    applyDeviceRoutingMiddleware(mockApp);

    let nextCalled = false;
    const redirects: Array<{ status: number; location: string }> = [];
    const req = {
      method: 'GET',
      headers: {
        host: 'pulse-lab.in',
        accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      },
      url: '/images/banner.webp',
      path: '/images/banner.webp',
      secure: true,
    };
    const res = {
      setHeader: () => undefined,
      redirect: (status: number, location: string) => redirects.push({ status, location }),
      send: () => undefined,
    } as any;

    middleware[1](req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(redirects).toEqual([]);
  });
});
