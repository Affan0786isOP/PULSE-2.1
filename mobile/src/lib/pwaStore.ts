export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaState {
  isInstallable: boolean;
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isBrowserFullscreen: boolean;
  isSupportedBrowser: boolean;
  isIos: boolean;
  isSafari: boolean;
  isMobile: boolean;
  isOffline: boolean;
  isGuideOpen: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<(state: PwaState) => void>();

function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as any).standalone === true;
  const isAndroidStandalone = typeof document !== 'undefined' && Boolean(document.referrer?.includes('android-app://'));
  return isStandaloneMedia || isIosStandalone || isAndroidStandalone;
}

function detectIsBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

function detectDeviceAndBrowser(): {
  isIos: boolean;
  isSafari: boolean;
  isMobile: boolean;
  isSupportedBrowser: boolean;
} {
  if (typeof window === 'undefined') {
    return { isIos: false, isSafari: false, isMobile: false, isSupportedBrowser: true };
  }
  const ua = window.navigator.userAgent || '';
  const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
  const isTouchMac = (window.navigator.maxTouchPoints || 0) > 1 && /Macintosh/i.test(ua);
  const isIos = isIosDevice || isTouchMac;

  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|MicroMessenger|musical_ly|WebView|wv/i.test(ua);
  const isWebKit = /WebKit/i.test(ua);
  const isSafari = isIos && isWebKit && !/CriOS|FxiOS|OPiOS|EdgiOS|mercury|Chrome/i.test(ua) && !isInAppBrowser;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isTouchMac || window.matchMedia('(max-width: 1024px)').matches;

  return {
    isIos,
    isSafari,
    isMobile,
    isSupportedBrowser: !isInAppBrowser
  };
}

let currentState: PwaState = (() => {
  const { isIos, isSafari, isMobile, isSupportedBrowser } = detectDeviceAndBrowser();
  const isStandalone = detectIsStandalone();
  const isBrowserFullscreen = detectIsBrowserFullscreen();
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  return {
    isInstallable: false,
    hasNativePrompt: false,
    isInstalled: isStandalone,
    isStandalone,
    isBrowserFullscreen,
    isSupportedBrowser,
    isIos,
    isSafari,
    isMobile,
    isOffline,
    isGuideOpen: false
  };
})();

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
  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    // Consume immediately to avoid duplicate invocation
    deferredPrompt = null;
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
    deferredPrompt = e as BeforeInstallPromptEvent;
    currentState = {
      ...currentState,
      hasNativePrompt: true,
      isInstallable: true
    };
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
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
    currentState = {
      ...currentState,
      isStandalone,
      isInstalled: isStandalone || currentState.isInstalled
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
