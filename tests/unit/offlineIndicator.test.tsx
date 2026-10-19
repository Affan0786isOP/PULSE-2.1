import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar as DesktopNavbar } from '@/components/Navbar';
import { Navbar as MobileNavbar } from '../../mobile/src/components/Navbar';
import * as pwaHook from '@/lib/usePwaInstall';
import * as mobilePwaHook from '../../mobile/src/lib/usePwaInstall';

describe('Accessible Theme-Matched Offline Indicator (Tier 6)', () => {
  const basePwaState: pwaHook.PwaInstallHookResult = {
    isBrowserFullscreen: false,
    isStandalone: false,
    isIosStandalone: false,
    isAndroidAppMode: false,
    isInstalled: false,
    hasNativePrompt: false,
    isInstallPromptSupported: false,
    isManualInstallOnly: false,
    isUnsupportedBrowser: false,
    isIos: false,
    isIpadOs: false,
    isSafari: false,
    isIosSafari: false,
    isIosChrome: false,
    isIosOtherBrowser: false,
    isMobile: false,
    isOffline: false,
    isGuideOpen: false,
    isInstallable: false,
    promptInstall: vi.fn(),
    openInstallGuide: vi.fn(),
    closeInstallGuide: vi.fn()
  };

  it('renders offline indicator in desktop navbar when offline', () => {
    vi.spyOn(pwaHook, 'usePwaInstall').mockReturnValue({
      ...basePwaState,
      isOffline: true
    });

    render(
      <BrowserRouter>
        <DesktopNavbar currentView="home" />
      </BrowserRouter>
    );

    const btn = screen.getByRole('button', { name: /offline/i });
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('title')).toBe('Offline — cloud features and assessment start unavailable');
  });

  it('does not render offline indicator in desktop navbar when online', () => {
    vi.spyOn(pwaHook, 'usePwaInstall').mockReturnValue({
      ...basePwaState,
      isOffline: false
    });

    render(
      <BrowserRouter>
        <DesktopNavbar currentView="home" />
      </BrowserRouter>
    );

    expect(screen.queryByRole('button', { name: /offline/i })).toBeNull();
  });

  it('renders offline indicator in mobile navbar when offline', () => {
    vi.spyOn(mobilePwaHook, 'usePwaInstall').mockReturnValue({
      ...basePwaState,
      isOffline: true
    });

    render(
      <BrowserRouter>
        <MobileNavbar onNavigate={vi.fn()} currentView="home" />
      </BrowserRouter>
    );

    const btn = screen.getByRole('button', { name: /offline/i });
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('title')).toBe('Offline — cloud features and assessment start unavailable');
  });

  it('does not render offline indicator in mobile navbar when online', () => {
    vi.spyOn(mobilePwaHook, 'usePwaInstall').mockReturnValue({
      ...basePwaState,
      isOffline: false
    });

    render(
      <BrowserRouter>
        <MobileNavbar onNavigate={vi.fn()} currentView="home" />
      </BrowserRouter>
    );

    expect(screen.queryByRole('button', { name: /offline/i })).toBeNull();
  });
});
