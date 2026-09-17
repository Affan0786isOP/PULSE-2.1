import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { modalManager, BASE_MODAL_Z_INDEX, NESTED_MODAL_Z_STEP } from './modalManager';

describe('ModalManager', () => {
  let mockBody: { style: { overflow: string } };
  let eventListeners: Map<string, Array<(e: any) => void>>;

  beforeEach(() => {
    modalManager.reset();
    mockBody = { style: { overflow: 'visible' } };
    eventListeners = new Map();

    vi.stubGlobal('document', {
      body: mockBody,
      activeElement: null,
    });

    vi.stubGlobal('window', {
      addEventListener: vi.fn((event: string, handler: any) => {
        const list = eventListeners.get(event) || [];
        list.push(handler);
        eventListeners.set(event, list);
      }),
      removeEventListener: vi.fn((event: string, handler: any) => {
        const list = eventListeners.get(event) || [];
        eventListeners.set(event, list.filter(h => h !== handler));
      }),
      setTimeout: vi.fn((fn: any) => fn()),
    });
  });

  afterEach(() => {
    modalManager.reset();
    vi.unstubAllGlobals();
  });

  it('manages stack depth and dynamic z-index layering', () => {
    const dialog1 = { current: null };
    const dialog2 = { current: null };

    const unregister1 = modalManager.register({
      id: 'settings-modal',
      onClose: vi.fn(),
      dialogRef: dialog1,
    });

    expect(modalManager.getStackDepth()).toBe(1);
    expect(modalManager.isTopModal('settings-modal')).toBe(true);
    expect(modalManager.getModalZIndex('settings-modal')).toBe(BASE_MODAL_Z_INDEX);

    const unregister2 = modalManager.register({
      id: 'pwa-modal',
      onClose: vi.fn(),
      dialogRef: dialog2,
    });

    expect(modalManager.getStackDepth()).toBe(2);
    expect(modalManager.isTopModal('settings-modal')).toBe(false);
    expect(modalManager.isTopModal('pwa-modal')).toBe(true);
    expect(modalManager.getModalZIndex('settings-modal')).toBe(BASE_MODAL_Z_INDEX);
    expect(modalManager.getModalZIndex('pwa-modal')).toBe(BASE_MODAL_Z_INDEX + NESTED_MODAL_Z_STEP);

    unregister2();
    expect(modalManager.getStackDepth()).toBe(1);
    expect(modalManager.isTopModal('settings-modal')).toBe(true);

    unregister1();
    expect(modalManager.getStackDepth()).toBe(0);
  });

  it('locks body scroll on first modal and restores on last modal close', () => {
    mockBody.style.overflow = 'auto';

    const unregister1 = modalManager.register({
      id: 'modal-1',
      onClose: vi.fn(),
      dialogRef: { current: null },
    });
    expect(mockBody.style.overflow).toBe('hidden');

    const unregister2 = modalManager.register({
      id: 'modal-2',
      onClose: vi.fn(),
      dialogRef: { current: null },
    });
    expect(mockBody.style.overflow).toBe('hidden');

    // Closing modal-2 keeps scroll locked because modal-1 is still open
    unregister2();
    expect(mockBody.style.overflow).toBe('hidden');

    // Closing modal-1 restores original overflow
    unregister1();
    expect(mockBody.style.overflow).toBe('auto');
  });

  it('routes Escape key strictly to the topmost modal', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    modalManager.register({
      id: 'modal-1',
      onClose: onClose1,
      dialogRef: { current: null },
    });

    modalManager.register({
      id: 'modal-2',
      onClose: onClose2,
      dialogRef: { current: null },
    });

    const keydownHandlers = eventListeners.get('keydown') || [];
    expect(keydownHandlers.length).toBeGreaterThan(0);

    const escapeEvent = {
      key: 'Escape',
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    // Trigger handler
    keydownHandlers[0](escapeEvent);

    expect(escapeEvent.preventDefault).toHaveBeenCalled();
    expect(escapeEvent.stopPropagation).toHaveBeenCalled();
    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();

    // Close top modal and trigger Escape again
    modalManager.unregister('modal-2');
    keydownHandlers[0](escapeEvent);

    expect(onClose1).toHaveBeenCalledTimes(1);
  });

  it('restores focus in stack order to trigger element', () => {
    const trigger1 = { focus: vi.fn() } as unknown as HTMLElement;
    const trigger2 = { focus: vi.fn() } as unknown as HTMLElement;

    modalManager.register({
      id: 'modal-1',
      onClose: vi.fn(),
      dialogRef: { current: null },
      restoreFocusElement: trigger1,
    });

    modalManager.register({
      id: 'modal-2',
      onClose: vi.fn(),
      dialogRef: { current: null },
      restoreFocusElement: trigger2,
    });

    modalManager.unregister('modal-2');
    expect(trigger2.focus).toHaveBeenCalledTimes(1);
    expect(trigger1.focus).not.toHaveBeenCalled();

    modalManager.unregister('modal-1');
    expect(trigger1.focus).toHaveBeenCalledTimes(1);
  });

  it('handles focus trapping within the top modal', () => {
    const btn1 = { offsetParent: {}, focus: vi.fn() } as any;
    const btn2 = { offsetParent: {}, focus: vi.fn() } as any;

    const mockDialogElement = {
      querySelectorAll: vi.fn().mockReturnValue([btn1, btn2]),
      contains: vi.fn((el) => el === btn1 || el === btn2),
    } as any;

    modalManager.register({
      id: 'modal-with-focus',
      onClose: vi.fn(),
      dialogRef: { current: mockDialogElement },
    });

    const keydownHandlers = eventListeners.get('keydown') || [];
    const handler = keydownHandlers[0];

    // Tab forward from last element -> wraps to first
    (document as any).activeElement = btn2;
    const tabForwardEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    };
    handler(tabForwardEvent);
    expect(tabForwardEvent.preventDefault).toHaveBeenCalled();
    expect(btn1.focus).toHaveBeenCalled();

    // Shift+Tab backward from first element -> wraps to last
    (document as any).activeElement = btn1;
    const tabBackwardEvent = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: vi.fn(),
    };
    handler(tabBackwardEvent);
    expect(tabBackwardEvent.preventDefault).toHaveBeenCalled();
    expect(btn2.focus).toHaveBeenCalled();
  });

  it('re-registering with same id updates existing entry without duplication', () => {
    const dialog = { current: null };
    modalManager.register({
      id: 'settings',
      onClose: vi.fn(),
      dialogRef: dialog,
    });
    expect(modalManager.getStackDepth()).toBe(1);

    modalManager.register({
      id: 'settings',
      onClose: vi.fn(),
      dialogRef: dialog,
    });
    expect(modalManager.getStackDepth()).toBe(1);
  });
});
