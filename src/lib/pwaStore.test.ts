import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectBrowserAndPlatform,
  detectIsStandalone,
  detectIsIosStandalone,
  detectIsBrowserFullscreen,
  computeIsInstallActionable,
  getPwaState,
  subscribePwaState,
  promptInstall
} from './pwaStore';

describe('pwaStore Concept Separation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('computeIsInstallActionable', () => {
    it('returns false when app is already installed or in standalone mode', () => {
      expect(computeIsInstallActionable({
        isInstalled: true,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: true,
        isManualInstallOnly: false,
        isUnsupportedBrowser: false
      })).toBe(false);

      expect(computeIsInstallActionable({
        isInstalled: false,
        isStandalone: true,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: true,
        isManualInstallOnly: false,
        isUnsupportedBrowser: false
      })).toBe(false);

      expect(computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: true,
        isAndroidAppMode: false,
        hasNativePrompt: false,
        isManualInstallOnly: true,
        isUnsupportedBrowser: false
      })).toBe(false);
    });

    it('returns false in unsupported or in-app webview browsers', () => {
      expect(computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: false,
        isManualInstallOnly: false,
        isUnsupportedBrowser: true
      })).toBe(false);
    });

    it('returns true when native install prompt is deferred and available', () => {
      expect(computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: true,
        isManualInstallOnly: false,
        isUnsupportedBrowser: false
      })).toBe(true);
    });

    it('returns true for iOS Safari manual install flow', () => {
      expect(computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: false,
        isManualInstallOnly: true,
        isUnsupportedBrowser: false
      })).toBe(true);
    });
  });


  describe('Browser & Platform Categorization', () => {
    it('detects iOS Safari specifically', () => {
      const iosSafariUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
      vi.stubGlobal('navigator', { userAgent: iosSafariUa, maxTouchPoints: 5 });
      vi.stubGlobal('window', {
        navigator: { userAgent: iosSafariUa, maxTouchPoints: 5 },
        matchMedia: () => ({ matches: false })
      });

      const res = detectBrowserAndPlatform();
      expect(res.isIos).toBe(true);
      expect(res.isIosSafari).toBe(true);
      expect(res.isIosOtherBrowser).toBe(false);
      expect(res.isUnsupportedBrowser).toBe(false);
      expect(res.isManualInstallOnly).toBe(true);
    });

    it('detects iOS Chrome (CriOS) as iOS non-Safari and unsupported for direct install', () => {
      const iosChromeUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';
      vi.stubGlobal('navigator', { userAgent: iosChromeUa, maxTouchPoints: 5 });
      vi.stubGlobal('window', {
        navigator: { userAgent: iosChromeUa, maxTouchPoints: 5 },
        matchMedia: () => ({ matches: false })
      });

      const res = detectBrowserAndPlatform();
      expect(res.isIos).toBe(true);
      expect(res.isIosSafari).toBe(false);
      expect(res.isIosOtherBrowser).toBe(true);
      expect(res.isUnsupportedBrowser).toBe(true);
    });

    it('detects In-App browser webview (e.g. Instagram / Facebook)', () => {
      const inAppUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.21.112';
      vi.stubGlobal('navigator', { userAgent: inAppUa, maxTouchPoints: 5 });
      vi.stubGlobal('window', {
        navigator: { userAgent: inAppUa, maxTouchPoints: 5 },
        matchMedia: () => ({ matches: false })
      });

      const res = detectBrowserAndPlatform();
      expect(res.isUnsupportedBrowser).toBe(true);
      expect(res.isIosSafari).toBe(false);
    });

    it('detects Desktop Chrome with install prompt support', () => {
      const desktopChromeUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      vi.stubGlobal('navigator', { userAgent: desktopChromeUa, maxTouchPoints: 0 });
      vi.stubGlobal('window', {
        navigator: { userAgent: desktopChromeUa, maxTouchPoints: 0 },
        matchMedia: () => ({ matches: false })
      });

      const res = detectBrowserAndPlatform();
      expect(res.isIos).toBe(false);
      expect(res.isInstallPromptSupported).toBe(true);
      expect(res.isUnsupportedBrowser).toBe(false);
      expect(res.isManualInstallOnly).toBe(false);
    });
  });

  describe('Independent Concept States', () => {
    it('separates browser fullscreen from PWA standalone', () => {
      // Mock fullscreen active
      vi.stubGlobal('document', {
        fullscreenElement: {}
      });
      // Mock standalone false
      vi.stubGlobal('window', {
        matchMedia: () => ({ matches: false })
      });

      expect(detectIsBrowserFullscreen()).toBe(true);
      expect(detectIsStandalone()).toBe(false);
    });

    it('separates iOS standalone from standard media standalone', () => {
      vi.stubGlobal('window', {
        navigator: { standalone: true },
        matchMedia: () => ({ matches: false })
      });

      expect(detectIsIosStandalone()).toBe(true);
      expect(detectIsStandalone()).toBe(false);
    });
  });

  describe('Subscription and Prompt Execution', () => {
    it('subscribes to state updates and provides current state immediately', () => {
      let received: any = null;
      const unsub = subscribePwaState((state) => {
        received = state;
      });
      expect(received).not.toBeNull();
      expect(typeof received.isInstalled).toBe('boolean');
      expect(typeof received.isOffline).toBe('boolean');
      unsub();
    });

    it('invokes native prompt when deferred prompt is present', async () => {
      let promptCalled = false;
      const mockPromptEvent = {
        prompt: vi.fn(async () => { promptCalled = true; }),
        userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
        platforms: ['web']
      };

      vi.stubGlobal('window', {
        __PULSE_DEFERRED_PROMPT__: mockPromptEvent
      });

      const result = await promptInstall();
      expect(promptCalled).toBe(true);
      expect(result).toBe(true);
    });
  });
});
