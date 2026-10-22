import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../../src/components/SettingsModal';
import {
  getSettings,
  updateSettings,
  resetSettingsToDefaults,
  isReducedMotionActive,
} from '../../src/lib/settingsStore';

// Mock dependencies
// Mock dependencies
const mockPwa = {
  isInstalled: false,
  isGuideOpen: false,
  isIos: false,
  isSafari: false,
  isIosSafari: false,
  isIosChrome: false,
  isIosOtherBrowser: false,
  isInstallable: true,
  hasNativePrompt: true,
  isInstallPromptSupported: true,
  isUnsupportedBrowser: false,
  isOffline: false,
  promptInstall: vi.fn(),
  openInstallGuide: vi.fn(),
  closeInstallGuide: vi.fn(),
};

vi.mock('../../src/lib/usePwaInstall', () => ({
  usePwaInstall: () => mockPwa,
}));

describe('SettingsModal Component & Functional Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsToDefaults();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    resetSettingsToDefaults();
  });

  // 1. Switching tabs
  describe('Tab switching', () => {
    it('starts on General tab and allows switching between General, Feedback, and System', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      // General tab is active initially
      expect(screen.getByText('Accessibility Text Scale')).toBeDefined();
      expect(screen.getByText('Fullscreen Focus')).toBeDefined();

      // Switch to Feedback tab
      const feedbackTabBtn = screen.getByRole('button', { name: /Feedback/i });
      fireEvent.click(feedbackTabBtn);
      expect(screen.getByText('Audio Feedback')).toBeDefined();
      expect(screen.getByText('Haptic Vibration')).toBeDefined();

      // Switch to System tab
      const systemTabBtn = screen.getByRole('button', { name: /System/i });
      fireEvent.click(systemTabBtn);
      expect(screen.queryByText('DISPLAY FRAME TIMING')).toBeNull();
      expect(screen.getByText('Reduced Motion')).toBeDefined();
      expect(screen.getByText('Exhibition Kiosk Mode')).toBeDefined();
      expect(screen.getByText('Clear Local Cache')).toBeDefined();

      // Switch back to General
      const generalTabBtn = screen.getByRole('button', { name: /General/i });
      fireEvent.click(generalTabBtn);
      expect(screen.getByText('Accessibility Text Scale')).toBeDefined();
    });
  });

  // 2. Settings persistence
  describe('Settings persistence', () => {
    it('persists Font Scale changes to settingsStore and localStorage', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      const font115Btn = screen.getByRole('button', { name: /115%Large/i });
      fireEvent.click(font115Btn);

      const settings = getSettings();
      expect(settings.fontScale).toBe(1.15);

      const stored = JSON.parse(localStorage.getItem('pulse_user_settings') || '{}');
      expect(stored.fontScale).toBe(1.15);
    });

    it('persists Audio Feedback toggle to settingsStore and localStorage', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      // Switch to Feedback
      fireEvent.click(screen.getByRole('button', { name: /Feedback/i }));

      const soundToggle = screen.getByRole('switch', { name: /Toggle Audio Feedback/i });
      expect(soundToggle.getAttribute('aria-checked')).toBe('true');

      fireEvent.click(soundToggle);
      expect(getSettings().soundEnabled).toBe(false);

      const stored = JSON.parse(localStorage.getItem('pulse_user_settings') || '{}');
      expect(stored.soundEnabled).toBe(false);
    });

    it('persists Reduced Motion toggle and updates localStorage', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      // Switch to System
      fireEvent.click(screen.getByRole('button', { name: /System/i }));

      const motionToggle = screen.getByRole('switch', { name: /Toggle Reduced Motion/i });
      const initialChecked = motionToggle.getAttribute('aria-checked') === 'true';

      fireEvent.click(motionToggle);
      expect(getSettings().reducedMotionEnabled).toBe(!initialChecked);

      const stored = JSON.parse(localStorage.getItem('pulse_user_settings') || '{}');
      expect(stored.reducedMotionEnabled).toBe(!initialChecked);
    });

    it('persists Exhibition Kiosk Mode toggle to settingsStore and localStorage', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      // Switch to System
      fireEvent.click(screen.getByRole('button', { name: /System/i }));

      const kioskToggle = screen.getByRole('switch', { name: /Toggle Exhibition Kiosk Mode/i });
      expect(kioskToggle.getAttribute('aria-checked')).toBe('false');

      fireEvent.click(kioskToggle);
      expect(getSettings().exhibitionModeEnabled).toBe(true);

      const stored = JSON.parse(localStorage.getItem('pulse_user_settings') || '{}');
      expect(stored.exhibitionModeEnabled).toBe(true);
    });
  });

  // 3. Reduced Motion actual effects
  describe('Reduced Motion DOM effects', () => {
    it('applies data-reduced-motion and reduced-motion class to documentElement when enabled', () => {
      updateSettings({ reducedMotionEnabled: true });
      expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('true');
      expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
      expect(isReducedMotionActive()).toBe(true);

      updateSettings({ reducedMotionEnabled: false });
      expect(document.documentElement.getAttribute('data-reduced-motion')).toBeNull();
      expect(document.documentElement.classList.contains('reduced-motion')).toBe(false);
      expect(isReducedMotionActive()).toBe(false);
    });
  });

  // 4. Exhibition Kiosk Mode actual effects
  describe('Exhibition Kiosk Mode DOM effects', () => {
    it('applies data-exhibition-mode and exhibition-mode class to documentElement when enabled', () => {
      updateSettings({ exhibitionModeEnabled: true });
      expect(document.documentElement.getAttribute('data-exhibition-mode')).toBe('true');
      expect(document.documentElement.classList.contains('exhibition-mode')).toBe(true);

      updateSettings({ exhibitionModeEnabled: false });
      expect(document.documentElement.getAttribute('data-exhibition-mode')).toBeNull();
      expect(document.documentElement.classList.contains('exhibition-mode')).toBe(false);
    });
  });

  // 5. System tab no longer exposes hardware calibration.
  describe('System settings', () => {
    it('keeps accessibility controls and removes refresh-rate calibration UI', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /System/i }));

      expect(screen.getByText('Reduced Motion')).toBeDefined();
      expect(screen.getByText('Exhibition Kiosk Mode')).toBeDefined();
      expect(screen.getByText('Clear Local Cache')).toBeDefined();
      expect(screen.queryByText(/DISPLAY FRAME TIMING|Display Frame Timing/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Recalibrate/i })).toBeNull();
      expect(screen.queryByText(/Display Refresh Rate|Estimated Display Midpoint|Theoretical midpoint/i)).toBeNull();
    });
  });

  // 6. Cache Reset scope & confirmation
  describe('Clear Local Cache', () => {
    it('removes pulse-scoped keys while preserving unrelated localStorage keys', () => {
      localStorage.setItem('pulse_user_settings', JSON.stringify({ fontScale: 1.2 }));
      localStorage.setItem('pulse_desktop_welcome_seen', 'true');
      localStorage.setItem('pulse_raw_trial_observations', '[]');
      localStorage.setItem('unrelated_app_data', 'preserve_me');

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: /System/i }));

      const resetBtn = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetBtn);

      // Pulse keys purged
      expect(localStorage.getItem('pulse_desktop_welcome_seen')).toBeNull();
      expect(localStorage.getItem('pulse_raw_trial_observations')).toBeNull();

      // Unrelated keys preserved
      expect(localStorage.getItem('unrelated_app_data')).toBe('preserve_me');

      // Confirmation shows Done
      expect(screen.getByText('Done')).toBeDefined();
    });
  });

  // 7. PWA controls
  describe('PWA Install controls', () => {
    it('invokes promptInstall when Install button is clicked', async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      const installBtn = screen.getByRole('button', { name: /Install/i });
      fireEvent.click(installBtn);

      expect(mockPwa.promptInstall).toHaveBeenCalled();
    });
  });

  // 8. Accessibility & Keyboard
  describe('Accessibility & Keyboard management', () => {
    it('renders with accessible modal dialog attributes and focus target', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('settings-modal-heading');

      const closeBtn = screen.getByRole('button', { name: /Close Settings/i });
      expect(closeBtn).toBeDefined();
    });

    it('dismisses when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<SettingsModal isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  // 9. Viewport responsiveness
  describe('Viewport resilience', () => {
    it('includes responsive max-width and viewport height constraints', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-w-[550px]');
      expect(dialog.className).toContain('overflow-hidden');
    });
  });
});
