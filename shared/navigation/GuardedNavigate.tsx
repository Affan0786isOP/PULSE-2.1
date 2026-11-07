import React, { useEffect, useRef } from 'react';
import { To } from 'react-router-dom';
import { useGuardedNavigate } from './useGuardedNavigate';

interface GuardedNavigateProps {
  to: To;
  replace?: boolean;
  state?: any;
}

export function GuardedNavigate({ to, replace, state }: GuardedNavigateProps) {
  const guardedNavigate = useGuardedNavigate();
  const lastDispatchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const destinationKey = `${typeof to === 'string' ? to : JSON.stringify(to)}_${Boolean(replace)}`;
    
    // Ensure idempotency across re-renders and Strict Mode double invocations
    if (lastDispatchedKeyRef.current === destinationKey) {
      return;
    }

    lastDispatchedKeyRef.current = destinationKey;
    guardedNavigate(to, { replace, state });
  }, [to, replace, state, guardedNavigate]);

  return null;
}
