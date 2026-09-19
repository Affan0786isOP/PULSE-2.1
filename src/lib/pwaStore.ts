export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __PULSE_DEFERRED_PROMPT__?: BeforeInstallPromptEvent | null;
    __PULSE_APP_INSTALLED__?: boolean;
  }
}

export interface PwaState {
  // 1. Browser Fullscreen API
  isBrowserFullscreen: boolean;

  // 2. PWA Standalone Mode
  isStandalone: boolean;

  // 3. iOS Standalone Mode
  isIosStandalone: boolean;

  // 4. Android App Mode
  isAndroidAppMode: boolean;

  // 5. Installed Application
  isInstalled: boolean;

  // 6. Supported Install Prompt
  hasNativePrompt: boolean;
  isInstallPromptSupported: boolean;

  // 7. Manual Install Mode
  isManualInstallOnly: boolean;

  // 8. Unsupported Browser
  isUnsupportedBrowser: boolean;

  // 9. Platform & Browser Classification
  isIos: boolean;
  isIpadOs: boolean;
  isSafari: boolean;
  isIosSafari: boolean;
  isIosOtherBrowser: boolean;
  isMobile: boolean;

  // 10. Offline Availability
  isOffline: boolean;

  // 11. UI Modal State
  isGuideOpen: boolean;

  // Backward compatibility alias
  isInstallable: boolean;
}

const subscribers = new Set<(state: PwaState) => void>();

export function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isWindowControlsOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
  return isStandaloneMedia || isWindowControlsOverlay;
}

export function detectIsIosStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.navigator as any).standalone === true;
}

export function detectIsAndroidAppMode(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.referrer?.includes('android-app://'));
}

export function detectIsBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export function detectBrowserAndPlatform(): {
  isIos: boolean;
  isIpadOs: boolean;
  isSafari: boolean;
  isIosSafari: boolean;
  isIosOtherBrowser: boolean;
  isMobile: boolean;
  isUnsupportedBrowser: boolean;
  isManualInstallOnly: boolean;
  isInstallPromptSupported: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      isIos: false,
      isIpadOs: false,
      isSafari: false,
      isIosSafari: false,
      isIosOtherBrowser: false,
      isMobile: false,
      isUnsupportedBrowser: false,
      isManualInstallOnly: false,
      isInstallPromptSupported: false
    };
  }

  const ua = window.navigator.userAgent || '';
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;

  // iPadOS Safari in desktop mode presents Macintosh UA with multi-touch points
  const isIpadOs = maxTouchPoints > 1 && /Macintosh/i.test(ua);
  const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
  const isIos = isIosDevice || isIpadOs;

  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|MicroMessenger|musical_ly|WebView|wv/i.test(ua);
  const isWebKit = /WebKit/i.test(ua);
  
  // Third-party browsers on iOS (CriOS = Chrome, FxiOS = Firefox, EdgiOS = Edge, OPiOS = Opera)
  const isIosOtherBrowser = isIos && !isInAppBrowser && /CriOS|FxiOS|OPiOS|EdgiOS|mercury|Chrome/i.test(ua);
  
  // Apple Safari on iOS / iPadOS
  const isIosSafari = isIos && isWebKit && !isIosOtherBrowser && !isInAppBrowser;

  // General Safari (macOS or iOS)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR/i.test(ua) && !isInAppBrowser;

  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches;
  const isMobile = isMobileUA || isIpadOs || isMobileViewport;

  // Platforms where programmatic beforeinstallprompt is supported (Chromium based: Chrome, Edge, Brave, Samsung Internet, Opera)
  const isChromium = /Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(ua) && !isIos;
  const isInstallPromptSupported = isChromium && !isInAppBrowser;

  // iOS Safari supports manual Add to Home Screen via Share sheet
  const isManualInstallOnly = isIosSafari;

  // Unsupported browsers: in-app webviews, or non-Safari browsers on iOS (where Apple restricts Home Screen adding)
  const isUnsupportedBrowser = isInAppBrowser || isIosOtherBrowser;

  return {
    isIos,
    isIpadOs,
    isSafari,
    isIosSafari,
    isIosOtherBrowser,
    isMobile,
    isUnsupportedBrowser,
    isManualInstallOnly,
    isInstallPromptSupported
  };
}

/**
 * Authoritative helper for determining whether an install CTA is actionable for the user.
 *
 * Rules:
 * - If already installed or running in standalone mode (standard standalone, iOS standalone, or Android app mode) -> false (no CTA).
 * - If running in an unsupported or in-app webview (FB/IG/TikTok webview, non-Safari iOS browser) -> false (no misleading CTA).
 * - If native `beforeinstallprompt` is deferred and ready -> true (native install prompt actionable).
 * - If running in iOS Safari (where `beforeinstallprompt` does not exist) -> true (manual Add to Home Screen guide actionable).
 * - Note: Offline availability alone does not qualify as installed or installable.
 */
export function computeIsInstallActionable(params: {
  isInstalled: boolean;
  isStandalone: boolean;
  isIosStandalone: boolean;
  isAndroidAppMode: boolean;
  hasNativePrompt: boolean;
  isManualInstallOnly: boolean;
  isUnsupportedBrowser: boolean;
}): boolean {
  if (params.isInstalled || params.isStandalone || params.isIosStandalone || params.isAndroidAppMode) {
    return false;
  }
  if (params.isUnsupportedBrowser) {
    return false;
  }
  return params.hasNativePrompt || params.isManualInstallOnly;
}

function computeCurrentState(): PwaState {
  const platform = detectBrowserAndPlatform();
  const isStandalone = detectIsStandalone();
  const isIosStandalone = detectIsIosStandalone();
  const isAndroidAppMode = detectIsAndroidAppMode();
  const isBrowserFullscreen = detectIsBrowserFullscreen();
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  const hasDeferredPrompt = typeof window !== 'undefined' && Boolean(window.__PULSE_DEFERRED_PROMPT__);
  const appInstalledFlag = typeof window !== 'undefined' && Boolean(window.__PULSE_APP_INSTALLED__);
  const isInstalled = isStandalone || isIosStandalone || isAndroidAppMode || appInstalledFlag;

  // Authoritative computation of installability CTA state
  const isInstallable = computeIsInstallActionable({
    isInstalled,
    isStandalone,
    isIosStandalone,
    isAndroidAppMode,
    hasNativePrompt: hasDeferredPrompt,
    isManualInstallOnly: platform.isManualInstallOnly,
    isUnsupportedBrowser: platform.isUnsupportedBrowser
  });

  return {
    isBrowserFullscreen,
    isStandalone,
    isIosStandalone,
    isAndroidAppMode,
    isInstalled,
    hasNativePrompt: hasDeferredPrompt,
    isInstallPromptSupported: platform.isInstallPromptSupported,
    isManualInstallOnly: platform.isManualInstallOnly,
    isUnsupportedBrowser: platform.isUnsupportedBrowser,
    isIos: platform.isIos,
    isIpadOs: platform.isIpadOs,
    isSafari: platform.isSafari,
    isIosSafari: platform.isIosSafari,
    isIosOtherBrowser: platform.isIosOtherBrowser,
    isMobile: platform.isMobile,
    isOffline,
    isGuideOpen: false,
    isInstallable
  };
}

let currentState: PwaState = computeCurrentState();

function notify(): void {
  for (const subscriber of subscribers) {
    subscriber(currentState);
  }
}

export function getPwaState(): PwaState {
  return currentState;
}

export function subscribePwaState(subscriber: (state: PwaState) => void): () => void {
  subscribers.add(subscriber);
  subscriber(currentState);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function openInstallGuide(): void {
  currentState = { ...currentState, isGuideOpen: true };
  notify();
}

export function closeInstallGuide(): void {
  currentState = { ...currentState, isGuideOpen: false };
  notify();
}

export async function promptInstall(): Promise<boolean> {
  const promptEvent = typeof window !== 'undefined' ? window.__PULSE_DEFERRED_PROMPT__ : null;
  if (promptEvent) {
    // Consume immediately to avoid duplicate invocation
    if (typeof window !== 'undefined') {
      window.__PULSE_DEFERRED_PROMPT__ = null;
    }
    currentState = {
      ...currentState,
      hasNativePrompt: false,
      isInstallable: false
    };
    notify();

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        if (typeof window !== 'undefined') {
          window.__PULSE_APP_INSTALLED__ = true;
        }
        currentState = {
          ...currentState,
          isInstalled: true,
          isGuideOpen: false
        };
        notify();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error invoking native install prompt:', err);
      return false;
    }
  }

  // Fallback to instruction guide modal
  openInstallGuide();
  return false;
}

// Global browser event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__PULSE_DEFERRED_PROMPT__ = e as BeforeInstallPromptEvent;
    currentState = {
      ...currentState,
      hasNativePrompt: true,
      isInstallable: true
    };
    notify();
  });

  window.addEventListener('appinstalled', () => {
    window.__PULSE_DEFERRED_PROMPT__ = null;
    window.__PULSE_APP_INSTALLED__ = true;
    currentState = {
      ...currentState,
      hasNativePrompt: false,
      isInstallable: false,
      isInstalled: true,
      isGuideOpen: false
    };
    notify();
  });

  // Display mode changes
  const standaloneMedia = window.matchMedia('(display-mode: standalone)');
  const handleStandaloneChange = () => {
    const isStandalone = detectIsStandalone();
    const isIosStandalone = detectIsIosStandalone();
    currentState = {
      ...currentState,
      isStandalone,
      isIosStandalone,
      isInstalled: isStandalone || isIosStandalone || currentState.isInstalled
    };
    notify();
  };
  try {
    standaloneMedia.addEventListener('change', handleStandaloneChange);
  } catch {
    standaloneMedia.addListener(handleStandaloneChange);
  }

  // Fullscreen changes
  const handleFullscreenChange = () => {
    const isBrowserFullscreen = detectIsBrowserFullscreen();
    currentState = {
      ...currentState,
      isBrowserFullscreen
    };
    notify();
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

  // Online/Offline status
  window.addEventListener('online', () => {
    currentState = { ...currentState, isOffline: false };
    notify();
  });
  window.addEventListener('offline', () => {
    currentState = { ...currentState, isOffline: true };
    notify();
  });
}
