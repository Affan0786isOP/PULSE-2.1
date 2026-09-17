/**
 * Safe reference-counted modal scroll-lock mechanism.
 * Prevents multiple simultaneous/stacked modals from accidentally unlocking the body.
 */

let lockCount = 0;
let previousOverflow = '';

export function acquireScrollLock(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0 && typeof document !== 'undefined') {
      document.body.style.overflow = previousOverflow;
    }
  };
}

export function resetScrollLock(): void {
  lockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousOverflow;
  }
}
