/**
 * Shared Modal Manager
 * 
 * Provides centralized management for:
 * 1. Safe nested modal stacking with dynamic z-index layering (base 9000 + depth * 100).
 * 2. Topmost modal alone handles Escape dismissals.
 * 3. Topmost modal alone owns keyboard focus trapping (Tab / Shift+Tab).
 * 4. Focus restoration occurs in stack order to the triggering element.
 * 5. Document body scroll locking remains active until all modals are closed.
 */

export interface ModalInstance {
  id: string;
  onClose: () => void;
  dialogRef: React.RefObject<HTMLElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  restoreFocusElement?: HTMLElement | null;
}

export const BASE_MODAL_Z_INDEX = 9000;
export const NESTED_MODAL_Z_STEP = 100;

class ModalManager {
  private stack: ModalInstance[] = [];
  private previousOverflow: string = '';
  private isListenerAttached = false;

  private handleKeyDown = (e: KeyboardEvent) => {
    const top = this.getTopModal();
    if (!top) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      top.onClose();
      return;
    }

    if (e.key === 'Tab' && top.dialogRef.current) {
      const dialog = top.dialogRef.current;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  private ensureListener() {
    if (!this.isListenerAttached && typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown, true);
      this.isListenerAttached = true;
    }
  }

  private removeListener() {
    if (this.isListenerAttached && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown, true);
      this.isListenerAttached = false;
    }
  }

  register(instance: ModalInstance): () => void {
    if (typeof document !== 'undefined') {
      if (this.stack.length === 0) {
        this.previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      if (!instance.restoreFocusElement) {
        instance.restoreFocusElement = document.activeElement as HTMLElement | null;
      }
    }

    // Replace if id already in stack, otherwise push
    const existingIndex = this.stack.findIndex(m => m.id === instance.id);
    if (existingIndex !== -1) {
      this.stack[existingIndex] = instance;
    } else {
      this.stack.push(instance);
    }

    this.ensureListener();

    // Auto focus initial element or first focusable
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (instance.initialFocusRef?.current) {
          instance.initialFocusRef.current.focus();
        } else if (instance.dialogRef.current) {
          const focusable = instance.dialogRef.current.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable) {
            focusable.focus();
          } else {
            instance.dialogRef.current.focus();
          }
        }
      }, 50);
    }

    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;
      this.unregister(instance.id);
    };
  }

  unregister(id: string): void {
    const index = this.stack.findIndex(m => m.id === id);
    if (index === -1) return;

    const [removed] = this.stack.splice(index, 1);

    // Restore focus in stack order
    if (removed?.restoreFocusElement && typeof removed.restoreFocusElement.focus === 'function') {
      try {
        removed.restoreFocusElement.focus();
      } catch {}
    }

    if (this.stack.length === 0) {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = this.previousOverflow;
      }
      this.removeListener();
    }
  }

  getTopModal(): ModalInstance | undefined {
    return this.stack[this.stack.length - 1];
  }

  isTopModal(id: string): boolean {
    const top = this.getTopModal();
    return Boolean(top && top.id === id);
  }

  getModalZIndex(id: string): number {
    const index = this.stack.findIndex(m => m.id === id);
    if (index === -1) {
      return BASE_MODAL_Z_INDEX + this.stack.length * NESTED_MODAL_Z_STEP;
    }
    return BASE_MODAL_Z_INDEX + index * NESTED_MODAL_Z_STEP;
  }

  getStackDepth(): number {
    return this.stack.length;
  }

  reset(): void {
    this.stack = [];
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.previousOverflow;
    }
    this.removeListener();
  }
}

export const modalManager = new ModalManager();
