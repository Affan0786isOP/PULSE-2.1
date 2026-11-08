import { assessmentLockStore } from '../assessment/assessmentLockStore';

function broadcastToAllWorkers(message: { type: string }) {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.active) reg.active.postMessage(message);
      if (reg.waiting) reg.waiting.postMessage(message);
      if (reg.installing) reg.installing.postMessage(message);
    }).catch(() => {});
  }
}

function handleSessionQuery(event: MessageEvent) {
  if (event.data && event.data.type === 'QUERY_PULSE_SESSION_ACTIVE') {
    if (event.ports && event.ports[0]) {
      const isSessionActive = assessmentLockStore.isProtected() || Boolean(typeof window !== 'undefined' && (window as any).__PULSE_SESSION_ACTIVE__);
      event.ports[0].postMessage({
        isSessionActive
      });
    }
  }
}

function handleVisibilityChange() {
  if (typeof document !== 'undefined') {
    if (document.visibilityState === 'hidden' || document.visibilityState === 'visible') {
      if (!assessmentLockStore.isProtected()) {
        broadcastToAllWorkers({ type: 'PULSE_CLIENT_IDLE' });
      }
    }
  }
}

function handlePageHide() {
  if (!assessmentLockStore.isProtected()) {
    broadcastToAllWorkers({ type: 'PULSE_CLIENT_IDLE' });
  }
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', handleSessionQuery);
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
}
