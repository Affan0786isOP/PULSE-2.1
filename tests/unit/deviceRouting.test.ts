import { describe, expect, it } from 'vitest';
import { evaluateDeviceRouting as evaluateDesktopRouting } from '../../src/lib/deviceRouting';
import { evaluateDeviceRouting as evaluateMobileRouting } from '../../mobile/src/lib/deviceRouting';

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';
const DESKTOP_UA_WITH_BROWSER_BRAND =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 SamsungBrowser/29.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';

describe.each([
  ['desktop routing helper', evaluateDesktopRouting],
  ['mobile routing helper', evaluateMobileRouting],
])('%s', (_name, evaluateDeviceRouting) => {
  it('does not let a persisted mobile cookie redirect a desktop browser to mobile', () => {
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
