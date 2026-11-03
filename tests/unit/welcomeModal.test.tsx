import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  WelcomeModal,
  isWelcomeSeen,
  setWelcomeSeen,
  WELCOME_STORAGE_KEY,
  LEGACY_WELCOME_STORAGE_KEY,
} from '../../src/components/WelcomeModal';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('WelcomeModal Component & Persistence Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 1. Opening conditions
  describe('Opening conditions', () => {
    it('does not render the dialog into DOM when isOpen is false', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={false} onClose={vi.fn()} />
        </MemoryRouter>
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders the dialog with proper ARIA attributes when isOpen is true', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('welcome-modal-heading');
      expect(screen.getByRole('heading', { level: 2, name: /Welcome to PULSE/i })).toBeDefined();
    });

    it('initializes checkbox to unchecked when user has not previously opted out', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const checkbox = screen.getByLabelText(/Don't show this again/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('initializes checkbox to checked when user has previously opted out', () => {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const checkbox = screen.getByLabelText(/Don't show this again/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  // 2. Checked and unchecked checkbox behavior
  describe('Checkbox interaction behavior', () => {
    it('toggles controlled checkbox state and saves preference immediately', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const checkbox = screen.getByLabelText(/Don't show this again/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBe('true');
      expect(localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY)).toBe('true');
      expect(isWelcomeSeen()).toBe(true);

      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
      expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY)).toBeNull();
      expect(isWelcomeSeen()).toBe(false);
    });
  });

  // 3. Preference persistence across reloads/remounts
  describe('Persistence across reloads and remounts', () => {
    it('persists desktop and legacy keys when setWelcomeSeen(true) is called', () => {
      expect(setWelcomeSeen(true)).toBe(true);
      expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBe('true');
      expect(localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY)).toBe('true');
      expect(isWelcomeSeen()).toBe(true);
    });

    it('reads legacy key when desktop key is missing', () => {
      localStorage.setItem(LEGACY_WELCOME_STORAGE_KEY, 'true');
      expect(isWelcomeSeen()).toBe(true);
    });

    it('clears both keys when setWelcomeSeen(false) is called', () => {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_WELCOME_STORAGE_KEY, 'true');
      expect(setWelcomeSeen(false)).toBe(true);
      expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY)).toBeNull();
      expect(isWelcomeSeen()).toBe(false);
    });

    it('unchecking before dismissal does not retain permanent opt-out on remount', () => {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      const onClose = vi.fn();
      const { unmount } = render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );

      const checkbox = screen.getByLabelText(/Don't show this again/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      // User unchecks the box
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);

      // Dismiss via close button
      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();

      // Check storage is clean
      expect(isWelcomeSeen()).toBe(false);
      expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBeNull();

      unmount();

      // Remounting confirms fresh state
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const remountedCheckbox = screen.getByLabelText(/Don't show this again/i) as HTMLInputElement;
      expect(remountedCheckbox.checked).toBe(false);
    });
  });

  // 4. X, Escape, backdrop, and CTA dismissal behavior
  describe('Dismissal pathways', () => {
    it('closes when clicking the close (X) button', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes when clicking the backdrop', () => {
      const onClose = vi.fn();
      const { container } = render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeDefined();
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('closes when pressing Escape key', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('closes and activates CTA button', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const startBtn = screen.getByRole('button', { name: /Start Cognitive Battery/i });
      fireEvent.click(startBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
    });
  });

  // 5. Correct navigation after activating CTA & links
  describe('Navigation destinations', () => {
    it('navigates to /assessments on CTA click and notifies onNavigate', () => {
      const onClose = vi.fn();
      const onNavigate = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} onNavigate={onNavigate} />
        </MemoryRouter>
      );
      const startBtn = screen.getByRole('button', { name: /Start Cognitive Battery/i });
      fireEvent.click(startBtn);
      expect(onNavigate).toHaveBeenCalledWith('assessments');
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
      expect(onClose).toHaveBeenCalled();
    });

    it('navigates to /assessments when clicking step 1 card', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const step1 = screen.getByRole('button', { name: /Pick a test/i });
      fireEvent.click(step1);
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
      expect(onClose).toHaveBeenCalled();
    });

    it('navigates to /assessments when clicking step 2 card', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const step2 = screen.getByRole('button', { name: /Respond/i });
      fireEvent.click(step2);
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
      expect(onClose).toHaveBeenCalled();
    });

    it('navigates to /leaderboard when clicking step 3 card', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const step3 = screen.getByRole('button', { name: /Review/i });
      fireEvent.click(step3);
      expect(mockNavigate).toHaveBeenCalledWith('/leaderboard');
      expect(onClose).toHaveBeenCalled();
    });

    it('renders real navigation links to Leaderboard, Dataset, and Improve', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      expect(screen.getByRole('link', { name: 'Leaderboard' }).getAttribute('href')).toBe('/leaderboard');
      expect(screen.getByRole('link', { name: 'Dataset' }).getAttribute('href')).toBe('/dataset');
      expect(screen.getByRole('link', { name: 'Improve' }).getAttribute('href')).toBe('/improve');
    });
  });

  // 6. Storage failure resilience
  describe('Storage failure resilience', () => {
    it('gracefully handles localStorage.getItem throwing an exception', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: Access denied');
      });
      expect(isWelcomeSeen()).toBe(false);
      getItemSpy.mockRestore();
    });

    it('gracefully returns false when localStorage.setItem throws QuotaExceededError', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const result = setWelcomeSeen(true);
      expect(result).toBe(false);
      setItemSpy.mockRestore();
    });
  });

  // 7. Keyboard accessibility and focus
  describe('Keyboard accessibility & Focus', () => {
    it('allows triggering step 1 with Enter key', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );
      const step1 = screen.getByRole('button', { name: /Pick a test/i });
      fireEvent.keyDown(step1, { key: 'Enter', code: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
      expect(onClose).toHaveBeenCalled();
    });

    it('has close button with accessible name Close dialog', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
      expect(closeBtn.getAttribute('aria-label')).toBe('Close dialog');
    });
  });

  // 8. Mobile and short-viewport layout classes
  describe('Mobile & short viewport resilience', () => {
    it('applies scrollable and height-constrained classes to prevent clipping', () => {
      render(
        <MemoryRouter>
          <WelcomeModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-h-[min(690px,calc(100dvh-2rem))]');
      expect(dialog.className).toContain('overflow-y-auto');
      expect(dialog.className).toContain('max-w-[550px]');
    });
  });
});
