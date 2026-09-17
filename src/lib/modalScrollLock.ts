import { modalManager } from './modalManager';

let manualLockCounter = 0;

export function acquireScrollLock(): () => void {
  manualLockCounter++;
  const id = `manual-lock-${manualLockCounter}`;
  const unregister = modalManager.register({
    id,
    onClose: () => {},
    dialogRef: { current: null },
  });

  return () => {
    unregister();
  };
}

export function resetScrollLock(): void {
  modalManager.reset();
}
