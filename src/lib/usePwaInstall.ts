import { useState, useEffect } from 'react';
import {
  PwaState,
  getPwaState,
  subscribePwaState,
  promptInstall,
  openInstallGuide,
  closeInstallGuide
} from './pwaStore';

export interface PwaInstallHookResult extends PwaState {
  promptInstall: () => Promise<boolean>;
  openInstallGuide: () => void;
  closeInstallGuide: () => void;
}

export function usePwaInstall(): PwaInstallHookResult {
  const [state, setState] = useState<PwaState>(getPwaState);

  useEffect(() => {
    const unsubscribe = subscribePwaState((updated) => {
      setState(updated);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    promptInstall,
    openInstallGuide,
    closeInstallGuide
  };
}
