import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../../src/components/Home';
import { AddToHomeScreenModal } from '../../src/components/AddToHomeScreenModal';
import { MobileHero } from '../../mobile/src/components/hero/MobileHero';
import { SettingsModal } from '../../src/components/SettingsModal';
import * as pwaStore from '../../src/lib/pwaStore';

const mockPwa = vi.hoisted(() => ({
  isBrowserFullscreen: false,
  isStandalone: false,
  isIosStandalone: false,
  isAndroidAppMode: false,
  isInstalled: false,
  hasNativePrompt: false,
  isInstallPromptSupported: true,
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
  isInstallable: true,
  promptInstall: vi.fn().mockResolvedValue(true),
  openInstallGuide: vi.fn(),
  closeInstallGuide: vi.fn(),
}));

vi.mock('../../src/lib/usePwaInstall', () => ({
  usePwaInstall: () => mockPwa,
}));

vi.mock('../../src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => ({
    testsCount: 5,
    resultsCount: 120,
    isLoadingResults: false,
  }),
}));

vi.mock('../../mobile/src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => ({
    testsCount: 5,
    resultsCount: 120,
    isLoadingResults: false,
  }),
}));

describe('PWA Installation UI & Functional Audit', () => {
  beforeEach(() => {
    mockPwa.isInstalled = false;
    mockPwa.isStandalone = false;
    mockPwa.isUnsupportedBrowser = false;
    mockPwa.hasNativePrompt = false;
    mockPwa.isManualInstallOnly = false;
    mockPwa.isInstallable = true;
    mockPwa.isGuideOpen = false;
    mockPwa.isOffline = false;
    mockPwa.isIos = false;
    mockPwa.isIosSafari = false;
    mockPwa.isIosChrome = false;
    mockPwa.isIosOtherBrowser = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Desktop Install App Button Visibility
  describe('Desktop Install App Button', () => {
    it('renders the Install App button in desktop Home header when isInstallable is true', () => {
      mockPwa.isInstallable = true;
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      const installBtn = screen.getByRole('button', { name: /install app/i });
      expect(installBtn).toBeDefined();
      expect(installBtn.id).toBe('desktop-install-app-btn');
      expect(screen.getByText('Install App')).toBeDefined();
    });

    it('hides the Install App button when app is already installed', () => {
      mockPwa.isInstalled = true;
      mockPwa.isInstallable = false;
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
    });

    it('hides the Install App button when running in standalone mode', () => {
      mockPwa.isStandalone = true;
      mockPwa.isInstallable = false;
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
    });

    it('hides the Install App button in unsupported / in-app browsers', () => {
      mockPwa.isUnsupportedBrowser = true;
      mockPwa.isInstallable = false;
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
    });

    it('triggers promptInstall when desktop button is clicked and native prompt is available', () => {
      mockPwa.isInstallable = true;
      mockPwa.hasNativePrompt = true;
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      const installBtn = screen.getByRole('button', { name: /install app/i });
      fireEvent.click(installBtn);
      expect(mockPwa.promptInstall).toHaveBeenCalledTimes(1);
    });

    it('triggers openInstallGuide when desktop button is clicked without native prompt', () => {
      mockPwa.isInstallable = true;
      mockPwa.hasNativePrompt = false;
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      const installBtn = screen.getByRole('button', { name: /install app/i });
      fireEvent.click(installBtn);
      expect(mockPwa.openInstallGuide).toHaveBeenCalledTimes(1);
    });
  });

  // 2. AddToHomeScreenModal Component & Platform-Specific Instructions
  describe('AddToHomeScreenModal Redesign & Platform Guidance', () => {
    it('renders modal dialog with accessible attributes and header when open', () => {
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={false}
          isIos={false}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('pwa-modal-title');
      expect(screen.getByRole('heading', { name: /add to home screen/i })).toBeDefined();
      expect(screen.getByText('PWA')).toBeDefined();
    });

    it('renders already-installed state with confirmation badge', () => {
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={true}
          isIos={false}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      expect(screen.getByRole('heading', { name: /app installed/i })).toBeDefined();
      expect(screen.getByText(/running in its own standalone window/i)).toBeDefined();
      expect(screen.getByRole('button', { name: 'Done' })).toBeDefined();
    });

    it('renders native install button when hasNativePrompt is true', async () => {
      const promptSpy = vi.fn().mockResolvedValue(true);
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={false}
          isIos={false}
          hasNativePrompt={true}
          onPromptInstall={promptSpy}
        />
      );

      const installCta = screen.getByRole('button', { name: /install pulse/i });
      expect(installCta).toBeDefined();
      expect(installCta.id).toBe('native-pwa-install-btn');

      fireEvent.click(installCta);
      expect(promptSpy).toHaveBeenCalledTimes(1);
    });

    it('renders iOS Safari quick steps when on iOS Safari', () => {
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={false}
          isIos={true}
          isIosSafari={true}
          isIosChrome={false}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      expect(screen.getByText(/ios safari quick steps/i)).toBeDefined();
      expect(screen.getByText(/tap the/i)).toBeDefined();
      expect(screen.getByText(/share button/i)).toBeDefined();
      expect(screen.getAllByText(/add to home screen/i).length).toBeGreaterThanOrEqual(2);
    });

    it('renders iOS Chrome quick steps when on iOS Chrome', () => {
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={false}
          isIos={true}
          isIosSafari={false}
          isIosChrome={true}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      expect(screen.getByText(/ios chrome quick steps/i)).toBeDefined();
      expect(screen.getByText(/menu \(⋯\)/i)).toBeDefined();
    });

    it('renders in-app browser alert when isUnsupportedBrowser is true', () => {
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={false}
          isIos={false}
          isUnsupportedBrowser={true}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      expect(screen.getByText(/in-app browser detected/i)).toBeDefined();
      expect(screen.getByText(/open this page directly in/i)).toBeDefined();
    });

    it('renders generic browser fallback instructions when no native prompt is available', () => {
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={vi.fn()}
          isInstalled={false}
          isIos={false}
          hasNativePrompt={false}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      expect(screen.getByText(/tap the browser menu icon/i)).toBeDefined();
      expect(screen.getByText(/ready to install/i)).toBeDefined();
    });

    it('dismisses when close button or dismiss button is clicked', () => {
      const closeSpy = vi.fn();
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={closeSpy}
          isInstalled={false}
          isIos={false}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(closeSpy).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(closeSpy).toHaveBeenCalledTimes(2);
    });

    it('dismisses when Escape key is pressed', () => {
      const closeSpy = vi.fn();
      render(
        <AddToHomeScreenModal
          isOpen={true}
          onClose={closeSpy}
          isInstalled={false}
          isIos={false}
          onPromptInstall={vi.fn().mockResolvedValue(true)}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  // 3. Settings Modal Integration
  describe('Settings Modal PWA Row', () => {
    it('shows Install button in Settings General tab when not installed and invokes prompt/guide', () => {
      mockPwa.isInstalled = false;
      render(
        <SettingsModal isOpen={true} onClose={vi.fn()} />
      );

      const installBtn = screen.getByRole('button', { name: /install/i });
      expect(installBtn).toBeDefined();

      fireEvent.click(installBtn);
      expect(mockPwa.promptInstall).toHaveBeenCalled();
    });

    it('shows Active badge and Details button in Settings General tab when already installed', () => {
      mockPwa.isInstalled = true;
      render(
        <SettingsModal isOpen={true} onClose={vi.fn()} />
      );

      expect(screen.getByText('Active')).toBeDefined();
      expect(screen.getByText('Running as a standalone app')).toBeDefined();
      const detailsBtn = screen.getByRole('button', { name: /details/i });
      expect(detailsBtn).toBeDefined();

      fireEvent.click(detailsBtn);
      expect(mockPwa.openInstallGuide).toHaveBeenCalled();
    });
  });

  // 4. MobileHero Regression
  describe('MobileHero Install Control', () => {
    it('renders Install App button in mobile hero when pwaInstallable is true', () => {
      const promptSpy = vi.fn();
      render(
        <MemoryRouter>
          <MobileHero
            onOpenMenu={vi.fn()}
            pwaInstallable={true}
            onPromptInstall={promptSpy}
          />
        </MemoryRouter>
      );

      const installBtn = screen.getByRole('button', { name: 'Install App' });
      expect(installBtn).toBeDefined();

      fireEvent.click(installBtn);
      expect(promptSpy).toHaveBeenCalledTimes(1);
    });

    it('does not render Install App button in mobile hero when pwaInstallable is false', () => {
      render(
        <MemoryRouter>
          <MobileHero
            onOpenMenu={vi.fn()}
            pwaInstallable={false}
            onPromptInstall={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.queryByRole('button', { name: 'Install App' })).toBeNull();
    });
  });

  // 5. Authoritative PWA Store Helper Rules
  describe('pwaStore computeIsInstallActionable rules', () => {
    it('returns false when app is already installed or standalone', () => {
      expect(pwaStore.computeIsInstallActionable({
        isInstalled: true,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: true,
        isManualInstallOnly: false,
        isUnsupportedBrowser: false,
      })).toBe(false);

      expect(pwaStore.computeIsInstallActionable({
        isInstalled: false,
        isStandalone: true,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: true,
        isManualInstallOnly: false,
        isUnsupportedBrowser: false,
      })).toBe(false);
    });

    it('returns false in in-app or unsupported browsers', () => {
      expect(pwaStore.computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: false,
        isManualInstallOnly: true,
        isUnsupportedBrowser: true,
      })).toBe(false);
    });

    it('returns true when native beforeinstallprompt is ready', () => {
      expect(pwaStore.computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: true,
        isManualInstallOnly: false,
        isUnsupportedBrowser: false,
      })).toBe(true);
    });

    it('returns true for manual install on iOS Safari', () => {
      expect(pwaStore.computeIsInstallActionable({
        isInstalled: false,
        isStandalone: false,
        isIosStandalone: false,
        isAndroidAppMode: false,
        hasNativePrompt: false,
        isManualInstallOnly: true,
        isUnsupportedBrowser: false,
      })).toBe(true);
    });
  });
});
