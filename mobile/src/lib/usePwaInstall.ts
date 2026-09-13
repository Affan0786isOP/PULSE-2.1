import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaInstallState {
  isInstallable: boolean;
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isSafari: boolean;
  isMobile: boolean;
  isSupportedBrowser: boolean;
  isOffline: boolean;
  promptInstall: () => Promise<boolean>;
  openInstallGuide: () => void;
  closeInstallGuide: () => void;
  isGuideOpen: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePwaInstall(): PwaInstallState {
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(true);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isDocFullscreen = Boolean(document.referrer.includes('android-app://'));
      return isStandaloneMedia || isIosStandalone || isDocFullscreen;
    };

    setIsInstalled(checkStandalone());

    // Check device and browser type
    const ua = window.navigator.userAgent || '';
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
    const isWebKit = /WebKit/i.test(ua);
    const isSafariBrowser = isIosDevice && isWebKit && !/CriOS|FxiOS|OPiOS|mercury|Chrome|Edg/i.test(ua);
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.matchMedia('(max-width: 1024px)').matches;
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|MicroMessenger|musical_ly/i.test(ua);

    setIsIos(isIosDevice);
    setIsSafari(isSafariBrowser);
    setIsMobile(isMobileDevice);
    setIsSupportedBrowser(!isInAppBrowser);

    // Online / Offline listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for beforeinstallprompt event (Android Chrome / Edge / Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setHasNativePrompt(false);
      setIsInstallable(false);
      setIsInstalled(true);
      setIsGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setHasNativePrompt(false);
          deferredPrompt = null;
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error invoking native install prompt:', err);
        return false;
      }
    } else {
      // If no native prompt event (e.g. iOS or already installed or unsupported), open guide
      setIsGuideOpen(true);
      return false;
    }
  }, []);

  const openInstallGuide = useCallback(() => {
    setIsGuideOpen(true);
  }, []);

  const closeInstallGuide = useCallback(() => {
    setIsGuideOpen(false);
  }, []);

  return {
    isInstallable: isInstallable || (isIos && !isInstalled),
    hasNativePrompt,
    isInstalled,
    isIos,
    isSafari,
    isMobile,
    isSupportedBrowser,
    isOffline,
    promptInstall,
    openInstallGuide,
    closeInstallGuide,
    isGuideOpen
  };
}
