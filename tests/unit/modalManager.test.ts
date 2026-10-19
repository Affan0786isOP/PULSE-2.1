import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { modalManager, BASE_MODAL_Z_INDEX, NESTED_MODAL_Z_STEP } from '@/lib/modalManager';

describe('modalManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    modalManager.reset();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should initialize empty', () => {
    expect(modalManager.getStackDepth()).toBe(0);
    expect(modalManager.getTopModal()).toBeUndefined();
  });

  describe('Registration and Z-Index', () => {
    it('registers a modal and sets body overflow hidden', () => {
      document.body.style.overflow = 'auto';
      const onClose = vi.fn();
      const unregister = modalManager.register({
        id: 'modal1',
        onClose,
        dialogRef: { current: null },
      });

      expect(modalManager.getStackDepth()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');

      unregister();
      expect(modalManager.getStackDepth()).toBe(0);
      expect(document.body.style.overflow).toBe('auto');
    });

    it('manages z-indexes for nested modals correctly', () => {
      modalManager.register({ id: 'modal1', onClose: vi.fn(), dialogRef: { current: null } });
      modalManager.register({ id: 'modal2', onClose: vi.fn(), dialogRef: { current: null } });

      expect(modalManager.getModalZIndex('modal1')).toBe(BASE_MODAL_Z_INDEX);
      expect(modalManager.getModalZIndex('modal2')).toBe(BASE_MODAL_Z_INDEX + NESTED_MODAL_Z_STEP);

      // Requesting an unknown modal should simulate it being placed at the top
      expect(modalManager.getModalZIndex('unknown')).toBe(BASE_MODAL_Z_INDEX + 2 * NESTED_MODAL_Z_STEP);
    });

    it('replaces modal if already registered with the same id', () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      modalManager.register({ id: 'modal1', onClose: onClose1, dialogRef: { current: null } });
      expect(modalManager.getStackDepth()).toBe(1);

      modalManager.register({ id: 'modal1', onClose: onClose2, dialogRef: { current: null } });
      expect(modalManager.getStackDepth()).toBe(1);
      expect(modalManager.getTopModal()?.onClose).toBe(onClose2);
    });

    it('isTopModal identifies the topmost modal', () => {
      modalManager.register({ id: 'modal1', onClose: vi.fn(), dialogRef: { current: null } });
      modalManager.register({ id: 'modal2', onClose: vi.fn(), dialogRef: { current: null } });

      expect(modalManager.isTopModal('modal1')).toBe(false);
      expect(modalManager.isTopModal('modal2')).toBe(true);
      expect(modalManager.isTopModal('unknown')).toBe(false);
    });
  });

  describe('Focus Management', () => {
    it('auto-focuses initialFocusRef upon registration', () => {
      const focusEl = document.createElement('input');
      focusEl.focus = vi.fn();

      modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: null },
        initialFocusRef: { current: focusEl },
      });

      vi.advanceTimersByTime(50);
      expect(focusEl.focus).toHaveBeenCalled();
    });

    it('auto-focuses first focusable element in dialogRef if no initialFocusRef', () => {
      const dialog = document.createElement('div');
      const btn = document.createElement('button');
      btn.focus = vi.fn();
      dialog.appendChild(btn);

      modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: dialog },
      });

      vi.advanceTimersByTime(50);
      expect(btn.focus).toHaveBeenCalled();
    });

    it('falls back to focusing dialog itself if no focusable children', () => {
      const dialog = document.createElement('div');
      dialog.focus = vi.fn();

      modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: dialog },
      });

      vi.advanceTimersByTime(50);
      expect(dialog.focus).toHaveBeenCalled();
    });

    it('restores focus to previous active element upon unregister', () => {
      const prevFocus = document.createElement('button');
      document.body.appendChild(prevFocus);
      prevFocus.focus();
      expect(document.activeElement).toBe(prevFocus);

      // Add mock focus function since JSDOM might not completely handle focus updates syncly in this exact setup
      prevFocus.focus = vi.fn();

      const unregister = modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: null },
      });

      unregister();
      expect(prevFocus.focus).toHaveBeenCalled();
    });

    it('gracefully handles missing restoreFocusElement upon unregister', () => {
      const unregister = modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: null },
        restoreFocusElement: null,
      });

      expect(() => unregister()).not.toThrow();
    });
  });

  describe('Escape Handling', () => {
    it('calls onClose of top modal on Escape key', () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      modalManager.register({ id: 'modal1', onClose: onClose1, dialogRef: { current: null } });
      modalManager.register({ id: 'modal2', onClose: onClose2, dialogRef: { current: null } });

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);

      expect(onClose2).toHaveBeenCalled();
      expect(onClose1).not.toHaveBeenCalled();
    });

    it('ignores non-Escape keys for closing', () => {
      const onClose = vi.fn();
      modalManager.register({ id: 'modal1', onClose, dialogRef: { current: null } });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Tab Focus Trapping', () => {
    it('traps focus forward (Tab) inside the top modal', () => {
      const dialog = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      // Mock offsetParent so it's considered visible
      Object.defineProperty(btn1, 'offsetParent', { get: () => document.body });
      Object.defineProperty(btn2, 'offsetParent', { get: () => document.body });

      btn1.focus = vi.fn();
      btn2.focus = vi.fn();
      dialog.appendChild(btn1);
      dialog.appendChild(btn2);
      document.body.appendChild(dialog);

      modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: dialog },
      });

      // Mock active element to be the last button
      Object.defineProperty(document, 'activeElement', { value: btn2, configurable: true });

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, cancelable: true });
      event.preventDefault = vi.fn();
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(btn1.focus).toHaveBeenCalled();

      // Cleanup mock
      // @ts-ignore
      delete document.activeElement;
    });

    it('traps focus backward (Shift+Tab) inside the top modal', () => {
      const dialog = document.createElement('div');
      const btn1 = document.createElement('button');
      const btn2 = document.createElement('button');
      Object.defineProperty(btn1, 'offsetParent', { get: () => document.body });
      Object.defineProperty(btn2, 'offsetParent', { get: () => document.body });

      btn1.focus = vi.fn();
      btn2.focus = vi.fn();
      dialog.appendChild(btn1);
      dialog.appendChild(btn2);
      document.body.appendChild(dialog);

      modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: dialog },
      });

      // Mock active element to be the first button
      Object.defineProperty(document, 'activeElement', { value: btn1, configurable: true });

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
      event.preventDefault = vi.fn();
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(btn2.focus).toHaveBeenCalled();

      // Cleanup mock
      // @ts-ignore
      delete document.activeElement;
    });

    it('prevents default if no focusable elements inside modal', () => {
      const dialog = document.createElement('div');
      document.body.appendChild(dialog);

      modalManager.register({
        id: 'modal1',
        onClose: vi.fn(),
        dialogRef: { current: dialog },
      });

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      event.preventDefault = vi.fn();
      window.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('resets the modal stack and overflow', () => {
      document.body.style.overflow = 'auto';
      modalManager.register({ id: 'modal1', onClose: vi.fn(), dialogRef: { current: null } });

      expect(modalManager.getStackDepth()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');

      modalManager.reset();

      expect(modalManager.getStackDepth()).toBe(0);
      expect(document.body.style.overflow).toBe('auto');
    });
  });
});
