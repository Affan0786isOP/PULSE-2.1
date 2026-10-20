import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { 
  getSettings, 
  updateSettings, 
  resetSettingsToDefaults, 
  ThemeMode 
} from '../../src/lib/settingsStore';
import { 
  resolveEffectiveTheme, 
  applyAppTheme, 
  applyThemeWithRadialTransition, 
  useSystemTheme, 
  getSystemColorPreference 
} from '../../src/lib/useSystemTheme';
import { Navbar } from '../../src/components/Navbar';
import { SettingsModal } from '../../src/components/SettingsModal';
import { PageShell } from '../../src/components/layout/PageShell';

describe('Desktop Theme System Architecture & View Transitions', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsToDefaults();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phase 1: Theme State Architecture & Persistence', () => {
    it('defaults to system theme mode upon fresh cold-start', () => {
      const settings = getSettings();
      expect(settings.themeMode).toBe('system');
    });

    it('persists and sanitizes light, dark, and system theme preferences', () => {
      updateSettings({ themeMode: 'dark' });
      expect(getSettings().themeMode).toBe('dark');
      expect(localStorage.getItem('pulse_user_settings')).toContain('"themeMode":"dark"');

      updateSettings({ themeMode: 'light' });
      expect(getSettings().themeMode).toBe('light');
      expect(localStorage.getItem('pulse_user_settings')).toContain('"themeMode":"light"');

      updateSettings({ themeMode: 'system' });
      expect(getSettings().themeMode).toBe('system');
      expect(localStorage.getItem('pulse_user_settings')).toContain('"themeMode":"system"');
    });

    it('recovers safely from invalid or corrupt theme values in storage by falling back to system', () => {
      localStorage.setItem('pulse_user_settings', JSON.stringify({ themeMode: 'neon-invalid' }));
      const settings = resetSettingsToDefaults();
      expect(settings.themeMode).toBe('system');
    });

    it('synchronizes root data-theme, classes, and meta theme-color correctly', () => {
      // Light
      applyAppTheme('/assessments', 'light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        expect(meta.getAttribute('content')).toBe('#FFFFFF');
      }

      // Dark
      applyAppTheme('/assessments', 'dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('dark');
      if (meta) {
        expect(meta.getAttribute('content')).toBe('#0B0D10');
      }
    });
  });

  describe('Phase 2: Apparatus Protection Invariant', () => {
    it('enforces dark apparatus mode on all protected assessment stages regardless of light preference', () => {
      const protectedRoutes = [
        '/reaction-test',
        '/visual-reaction',
        '/direction-test',
        '/direction',
        '/colour-recognition',
        '/color-recognition',
        '/block-memory',
        '/number-memory',
      ];

      for (const route of protectedRoutes) {
        const resolved = resolveEffectiveTheme(route, 'light');
        expect(resolved.isDarkApparatus).toBe(true);
        expect(resolved.activeTheme).toBe('dark');

        const applied = applyAppTheme(route, 'light');
        expect(applied).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      }
    });

    it('PageShell locks data-theme to dark when theme is dark-apparatus', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/reaction-test']}>
          <PageShell currentView="reaction-test" theme="dark-apparatus">
            <div>Stimulus Apparatus</div>
          </PageShell>
        </MemoryRouter>
      );

      const root = container.firstElementChild as HTMLElement;
      expect(root.getAttribute('data-theme')).toBe('dark');
      expect(root.className).toContain('bg-[#12161B]');
    });
  });

  describe('Phase 4: Navbar Theme Toggle', () => {
    it('renders theme toggle on general pages and hides it on protected apparatus or active assessment', () => {
      const { unmount, rerender } = render(
        <MemoryRouter initialEntries={['/about']}>
          <Navbar currentView="about" isAssessmentActive={false} />
        </MemoryRouter>
      );

      // On /about, theme toggle is present
      const toggleBtn = screen.getByRole('button', { name: /switch to (dark|light) theme/i });
      expect(toggleBtn).toBeDefined();
      unmount();

      // On /reaction-test (apparatus), theme toggle is hidden
      render(
        <MemoryRouter initialEntries={['/reaction-test']}>
          <Navbar currentView="reaction-test" isAssessmentActive={false} />
        </MemoryRouter>
      );
      expect(screen.queryByRole('button', { name: /switch to (dark|light) theme/i })).toBeNull();
    });

    it('clicking navbar toggle in system mode explicitly selects the opposite resolved theme', async () => {
      updateSettings({ themeMode: 'system' });
      // In JSDOM, default matches is false (light)
      applyAppTheme('/about', 'system');

      render(
        <MemoryRouter initialEntries={['/about']}>
          <Navbar currentView="about" isAssessmentActive={false} />
        </MemoryRouter>
      );

      const toggleBtn = screen.getByRole('button', { name: /switch to dark theme/i });
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(getSettings().themeMode).toBe('dark');
      });
    });
  });

  describe('Phase 5: Settings Appearance Controls', () => {
    it('renders 3-way radio group with Light, Dark, and System options', () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      const radioGroup = screen.getByRole('radiogroup', { name: /theme preference/i });
      expect(radioGroup).toBeDefined();

      const lightBtn = screen.getByRole('radio', { name: /light/i });
      const darkBtn = screen.getByRole('radio', { name: /dark/i });
      const systemBtn = screen.getByRole('radio', { name: /system/i });

      expect(lightBtn).toBeDefined();
      expect(darkBtn).toBeDefined();
      expect(systemBtn).toBeDefined();
      expect(systemBtn.getAttribute('aria-checked')).toBe('true');
    });

    it('selecting a theme option updates settingsStore and persists preference', async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      const darkBtn = screen.getByRole('radio', { name: /dark/i });
      fireEvent.click(darkBtn);

      await waitFor(() => {
        expect(getSettings().themeMode).toBe('dark');
        expect(darkBtn.getAttribute('aria-checked')).toBe('true');
      });
    });
  });

  describe('Phase 6: Radial View Transitions & Fallbacks', () => {
    it('uses document.startViewTransition and circular clipPath animation when supported', async () => {
      const animateMock = vi.fn();
      document.documentElement.animate = animateMock;

      let callbackExecuted = false;
      (document as any).startViewTransition = vi.fn((cb: () => void) => {
        cb();
        callbackExecuted = true;
        return {
          ready: Promise.resolve(),
        };
      });

      await applyThemeWithRadialTransition('dark', { x: 500, y: 500 });

      expect((document as any).startViewTransition).toHaveBeenCalled();
      expect(callbackExecuted).toBe(true);
      expect(getSettings().themeMode).toBe('dark');

      // Wait for ready promise to trigger animate
      await waitFor(() => {
        expect(animateMock).toHaveBeenCalled();
        const callArgs = animateMock.mock.calls[0];
        expect(callArgs[0].clipPath[0]).toContain('circle(0px at 500px 500px)');
        expect(callArgs[1].duration).toBe(900);
        expect(callArgs[1].easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
        expect(callArgs[1].pseudoElement).toBe('::view-transition-new(root)');
      });
    });

    it('falls back to direct immediate update when reduced motion is preferred', async () => {
      const startTransitionMock = vi.fn();
      (document as any).startViewTransition = startTransitionMock;

      // Enable reduced motion in settings
      updateSettings({ reducedMotionEnabled: true });

      await applyThemeWithRadialTransition('light', { x: 100, y: 100 });

      // startViewTransition must NOT be called when reduced motion is active
      expect(startTransitionMock).not.toHaveBeenCalled();
      expect(getSettings().themeMode).toBe('light');
    });

    it('falls back directly if startViewTransition throws an exception', async () => {
      (document as any).startViewTransition = vi.fn(() => {
        throw new Error('Transition rejected');
      });

      await applyThemeWithRadialTransition('dark', { x: 200, y: 200 });
      expect(getSettings().themeMode).toBe('dark');
    });
  });
});
