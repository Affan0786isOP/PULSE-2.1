import React, { useEffect, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { isReducedMotionActive } from '../lib/settingsStore';

export type RiveFeedbackState = 'IDLE' | 'SUCCESS' | 'NEW_BEST';

export interface RiveFeedbackProps {
  state: RiveFeedbackState;
  assetUrl?: string; // Optional asset URL to prevent hardcoding failing paths
  fallback?: React.ReactNode;
}

function RiveAnimation({ 
  state, 
  assetUrl, 
  onReady, 
  onError 
}: { 
  state: RiveFeedbackState, 
  assetUrl: string, 
  onReady: (isReady: boolean) => void, 
  onError: () => void 
}) {
  const { rive, RiveComponent } = useRive({
    src: assetUrl,
    stateMachines: 'State Machine 1',
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
    autoplay: true,
    onLoadError: onError,
  });

  const triggerSuccess = useStateMachineInput(rive, 'State Machine 1', 'SuccessTrigger');
  const triggerNewBest = useStateMachineInput(rive, 'State Machine 1', 'NewBestTrigger');

  useEffect(() => {
    onReady(!!rive);
  }, [rive, onReady]);

  useEffect(() => {
    if (!rive) return;
    if (state === 'SUCCESS' && triggerSuccess) {
      triggerSuccess.fire();
    } else if (state === 'NEW_BEST' && triggerNewBest) {
      triggerNewBest.fire();
    }
  }, [state, rive, triggerSuccess, triggerNewBest]);

  return <RiveComponent className="absolute inset-0 w-full h-full z-10" />;
}

/**
 * RiveFeedback
 * 
 * Wrapper for Rive animations to provide visual feedback for assessment results.
 * If an asset URL is provided, this component will load it and drive the state machine
 * based on the `state` prop. If no asset URL is provided, it falls back safely.
 * 
 * It respects `prefers-reduced-motion` and provides a fallback.
 */
export function RiveFeedback({ state, assetUrl, fallback }: RiveFeedbackProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRiveReady, setIsRiveReady] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReducedMotion(isReducedMotionActive());
    }
  }, []);

  if (reducedMotion || hasError || !assetUrl) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative w-full h-32 flex items-center justify-center -mb-6 mt-2 pointer-events-none">
      <RiveAnimation 
        state={state} 
        assetUrl={assetUrl} 
        onReady={setIsRiveReady} 
        onError={() => setHasError(true)} 
      />
      
      {!isRiveReady && fallback && (
        <div className="z-0 w-full flex justify-center opacity-50">
          {fallback}
        </div>
      )}
    </div>
  );
}
