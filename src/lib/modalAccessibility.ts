import { useEffect, useState, useRef } from 'react';
import { modalManager, BASE_MODAL_Z_INDEX } from './modalManager';

let modalCounter = 0;

export interface ModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  dialogRef: React.RefObject<HTMLElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  modalId?: string;
}

export function useModalAccessibility({
  isOpen,
  onClose,
  dialogRef,
  initialFocusRef,
  modalId,
}: ModalAccessibilityOptions): { zIndex: number; isTopModal: boolean } {
  const defaultIdRef = useRef<string | null>(null);
  if (!defaultIdRef.current) {
    defaultIdRef.current = modalId || `pulse-modal-${++modalCounter}`;
  }
  const id = modalId || defaultIdRef.current;
  const [zIndex, setZIndex] = useState<number>(() => {
    if (isOpen) {
      return modalManager.getModalZIndex(id);
    }
    return BASE_MODAL_Z_INDEX;
  });
  const [isTopModal, setIsTopModal] = useState<boolean>(() => isOpen && modalManager.isTopModal(id));

  useEffect(() => {
    if (!isOpen) {
      modalManager.unregister(id);
      setIsTopModal(false);
      return;
    }

    const unregister = modalManager.register({
      id,
      onClose,
      dialogRef,
      initialFocusRef,
    });

    setZIndex(modalManager.getModalZIndex(id));
    setIsTopModal(modalManager.isTopModal(id));

    return () => {
      unregister();
    };
  }, [isOpen, onClose, dialogRef, initialFocusRef, id]);

  return { zIndex, isTopModal };
}
