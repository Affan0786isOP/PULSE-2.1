// shared/assessment/assessmentLockStore.ts
export type SubmissionStage = 'IDLE' | 'SUBMITTING' | 'SETTLED_SUCCESS' | 'SETTLED_FAILURE';

export type LockState = {
  isLocked: boolean;
  isAcquiring: boolean;
  runId: string | null;
  assessmentId: string | null;
  submissionStage: SubmissionStage;
  timestamp: number;
};

class AssessmentLockStore {
  private state: Readonly<LockState> = {
    isLocked: false,
    isAcquiring: false,
    runId: null,
    assessmentId: null,
    submissionStage: 'IDLE',
    timestamp: 0,
  };
  private isAcquiringMutex: boolean = false;
  private activeAcquisitionPromise: Promise<string | null> | null = null;
  private activeAcquisitionAbortController: AbortController | null = null;
  private activeAcquisitionTx: IDBTransaction | null = null;
  private activeTargetRunId: string | null = null;

  private isHeartbeatInFlight: boolean = false;
  private isHeartbeatStopped: boolean = false;
  private activeHeartbeatPromise: Promise<void> | null = null;
  private leaseTimeout: ReturnType<typeof setTimeout> | null = null;

  private listeners = new Set<(state: Readonly<LockState>) => void>();
  private queuedSurface: 'desktop' | 'mobile' | null = null;

  public async acquireLock(assessmentId: string): Promise<string | null> {
    // 1. Mutex: verify in-memory lock and acquisition in progress
    if (this.state.isLocked || this.isAcquiringMutex) {
      console.warn(`[AssessmentLockStore] Lock acquisition rejected: lock is already held or acquiring.`);
      return null;
    }

    this.isAcquiringMutex = true;
    this.activeAcquisitionAbortController = new AbortController();
    const abortSignal = this.activeAcquisitionAbortController.signal;

    const runId = `${assessmentId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.activeTargetRunId = runId;

    this.state = { ...this.state, isAcquiring: true };
    (window as any).__PULSE_ACQUIRING_LOCK__ = true;
    this.notify();

    const acquisitionExecution = async (): Promise<string | null> => {
      try {
        // 2. Await durable transaction commit
        await this.writeDurableLease(runId, assessmentId, abortSignal);

        // Check if aborted during/immediately after persistence
        if (abortSignal.aborted) {
          console.warn(`[AssessmentLockStore] Lock acquisition aborted for runId ${runId}`);
          await this.clearDurableLease(runId);
          return null;
        }

        this.state = {
          isLocked: true,
          isAcquiring: false,
          runId,
          assessmentId,
          submissionStage: 'IDLE',
          timestamp: Date.now(),
        };

        this.startHeartbeat(runId);
        this.syncGlobal(true);
        this.broadcastToAllWorkers({ type: 'PULSE_SESSION_ACQUIRED', runId });
        this.notify();
        return runId;
      } catch (e) {
        if (abortSignal.aborted) {
          await this.clearDurableLease(runId);
          return null;
        }
        console.error(`[AssessmentLockStore] Durable lock persistence failed:`, e);
        return null;
      } finally {
        this.state = { ...this.state, isAcquiring: false };
        this.activeAcquisitionAbortController = null;
        this.activeAcquisitionTx = null;
        this.activeTargetRunId = null;
        (window as any).__PULSE_ACQUIRING_LOCK__ = false;
        this.isAcquiringMutex = false; // Mutex ONLY released after complete settlement & cleanup
        this.notify();
      }
    };

    this.activeAcquisitionPromise = acquisitionExecution();
    return this.activeAcquisitionPromise;
  }

  public async cancelPendingAcquisition(): Promise<boolean> {
    if (!this.state.isAcquiring || !this.activeAcquisitionAbortController) {
      return false;
    }

    const targetRunId = this.activeTargetRunId;
    this.activeAcquisitionAbortController.abort();

    // Abort active IndexedDB transaction directly if running
    if (this.activeAcquisitionTx) {
      try {
        this.activeAcquisitionTx.abort();
      } catch {}
    }

    // Await completion of the acquisition pipeline including its finally block
    if (this.activeAcquisitionPromise) {
      await this.activeAcquisitionPromise.catch(() => {});
    }

    // Explicitly await runId cleanup and propagate failure
    if (targetRunId) {
      await this.clearDurableLease(targetRunId);
    }

    return true;
  }

  public isAcquiring(): boolean {
    return this.state.isAcquiring;
  }

  public isProtected(): boolean {
    return this.state.isLocked || this.state.isAcquiring;
  }

  public markSubmissionPending(runId: string): boolean {
    if (!this.state.isLocked || this.state.runId !== runId) return false;
    if (this.state.submissionStage !== 'IDLE') {
      console.warn(`[AssessmentLockStore] markSubmissionPending rejected: stage is ${this.state.submissionStage}`);
      return false;
    }
    this.state = { ...this.state, submissionStage: 'SUBMITTING' };
    this.notify();
    return true;
  }

  public markSubmissionSettled(runId: string, success: boolean): boolean {
    if (!this.state.isLocked || this.state.runId !== runId) return false;
    if (this.state.submissionStage !== 'SUBMITTING') {
      console.warn(`[AssessmentLockStore] markSubmissionSettled rejected: stage is not SUBMITTING`);
      return false;
    }
    this.state = { 
      ...this.state, 
      submissionStage: success ? 'SETTLED_SUCCESS' : 'SETTLED_FAILURE' 
    };
    this.notify();
    return true;
  }

  public isSubmitting(): boolean {
    return this.state.submissionStage === 'SUBMITTING';
  }

  public async completeSubmissionAndRelease(runId: string): Promise<boolean> {
    if (!this.state.isLocked || this.state.runId !== runId) return false;
    if (this.state.submissionStage !== 'SETTLED_SUCCESS' && this.state.submissionStage !== 'SETTLED_FAILURE') {
      console.warn(`[AssessmentLockStore] completeSubmissionAndRelease rejected: stage is not SETTLED`);
      return false;
    }

    // Await any in-flight heartbeat write
    await this.stopHeartbeat();

    try {
      // AWAIT complete durable lease deletion (or fallback expiration) targeted to runId
      await this.clearDurableLease(runId);
    } catch (e) {
      console.error(`[AssessmentLockStore] completeSubmissionAndRelease: lease cleanup failed. Resuming heartbeat.`, e);
      this.startHeartbeat(runId);
      throw e;
    }

    this.state = {
      isLocked: false,
      isAcquiring: false,
      runId: null,
      assessmentId: null,
      submissionStage: 'IDLE',
      timestamp: Date.now(),
    };

    this.syncGlobal(false);
    this.broadcastToAllWorkers({ type: 'PULSE_SESSIONS_COMPLETED' });
    this.notify();
    return true;
  }

  public async forceAbortLock(runId: string): Promise<boolean> {
    if (!this.state.isLocked || this.state.runId !== runId) return false;
    if (this.state.submissionStage !== 'IDLE') {
      console.warn(`[AssessmentLockStore] forceAbortLock rejected: cannot abort during/after submission`);
      return false;
    }

    // Await any in-flight heartbeat write
    await this.stopHeartbeat();

    try {
      // AWAIT complete durable lease deletion (or fallback expiration) targeted to runId
      await this.clearDurableLease(runId);
    } catch (e) {
      console.error(`[AssessmentLockStore] forceAbortLock: lease cleanup failed. Resuming heartbeat to preserve protection.`, e);
      this.startHeartbeat(runId);
      throw e;
    }

    this.state = {
      isLocked: false,
      isAcquiring: false,
      runId: null,
      assessmentId: null,
      submissionStage: 'IDLE',
      timestamp: Date.now(),
    };

    this.syncGlobal(false);
    this.broadcastToAllWorkers({ type: 'PULSE_SESSIONS_COMPLETED' });
    this.notify();
    return true;
  }

  public releaseLock(runId: string): Promise<boolean> {
    return this.forceAbortLock(runId);
  }

  public isLocked(): boolean {
    return this.state.isLocked;
  }

  public getActiveRunId(): string | null {
    return this.state.runId;
  }

  public setQueuedSurface(surface: 'desktop' | 'mobile' | null) {
    this.queuedSurface = surface;
  }

  public getAndClearQueuedSurface(): 'desktop' | 'mobile' | null {
    const queued = this.queuedSurface;
    this.queuedSurface = null;
    return queued;
  }

  public resetForTesting() {
    this.isHeartbeatStopped = true;
    if (this.leaseTimeout) {
      clearTimeout(this.leaseTimeout);
      this.leaseTimeout = null;
    }
    this.activeHeartbeatPromise = null;
    this.isHeartbeatInFlight = false;
    this.isAcquiringMutex = false;
    this.activeAcquisitionPromise = null;
    this.activeAcquisitionAbortController = null;
    this.activeAcquisitionTx = null;
    this.activeTargetRunId = null;
    this.queuedSurface = null;
    this.state = {
      isLocked: false,
      isAcquiring: false,
      runId: null,
      assessmentId: null,
      submissionStage: 'IDLE',
      timestamp: 0,
    };
    this.syncGlobal(false);
    this.notify();
  }

  public subscribe(listener: (state: Readonly<LockState>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private syncGlobal(active: boolean) {
    if (typeof window !== 'undefined') {
      (window as any).__PULSE_SESSION_ACTIVE__ = active;
    }
  }

  private broadcastToAllWorkers(message: object) {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.active) reg.active.postMessage(message);
        if (reg.waiting) reg.waiting.postMessage(message);
        if (reg.installing) reg.installing.postMessage(message);
      }).catch(() => {});
    }
  }

  private async writeDurableLease(runId: string, assessmentId: string, signal?: AbortSignal): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    if (signal?.aborted) throw new Error('Acquisition aborted before lease write');

    const db = await this.openGateDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session_locks', 'readwrite');
      this.activeAcquisitionTx = tx;

      const abortHandler = () => {
        try { tx.abort(); } catch {}
        reject(new Error('Acquisition aborted'));
      };

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      tx.oncomplete = () => {
        if (signal) signal.removeEventListener('abort', abortHandler);
        resolve();
      };
      tx.onerror = () => {
        if (signal) signal.removeEventListener('abort', abortHandler);
        reject(tx.error);
      };
      tx.onabort = () => {
        if (signal) signal.removeEventListener('abort', abortHandler);
        reject(new Error('Transaction aborted'));
      };

      tx.objectStore('session_locks').put({
        clientId: this.getClientId(),
        runId,
        assessmentId,
        timestamp: Date.now(),
        leaseExpires: Date.now() + 15000
      });
    });
  }

  private async clearDurableLease(targetRunId?: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    const db = await this.openGateDb();
    const clientId = this.getClientId();
    
    // Attempt 1: Targeted physical deletion
    const deleteSuccess = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction('session_locks', 'readwrite');
        const store = tx.objectStore('session_locks');
        
        if (targetRunId) {
          const getReq = store.get(clientId);
          getReq.onsuccess = () => {
            const record = getReq.result;
            // Only delete if the lease belongs to the targeted runId
            if (record && record.runId === targetRunId) {
              store.delete(clientId);
            }
          };
        } else {
          store.delete(clientId);
        }

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });

    if (deleteSuccess) return;

    // Attempt 2: Immediate lease expiration fallback
    console.warn(`[AssessmentLockStore] Physical lease deletion failed for runId ${targetRunId}; attempting fallback lease expiration`);
    const fallbackSuccess = await new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction('session_locks', 'readwrite');
        const store = tx.objectStore('session_locks');

        if (targetRunId) {
          const getReq = store.get(clientId);
          getReq.onsuccess = () => {
            const record = getReq.result;
            if (record && record.runId === targetRunId) {
              store.put({
                ...record,
                timestamp: Date.now(),
                leaseExpires: 0 // Explicitly expired so workers prune it immediately
              });
            }
          };
        } else {
          store.put({
            clientId,
            runId: 'expired',
            assessmentId: 'expired',
            timestamp: Date.now(),
            leaseExpires: 0
          });
        }

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });

    if (!fallbackSuccess) {
      throw new Error(`[AssessmentLockStore] Failed both physical lease deletion and fallback lease expiration for runId ${targetRunId}`);
    }
  }

  private startHeartbeat(runId: string) {
    this.stopHeartbeat();
    this.isHeartbeatStopped = false;

    const scheduleNextTick = () => {
      if (this.isHeartbeatStopped) return;
      this.leaseTimeout = setTimeout(async () => {
        if (this.isHeartbeatStopped || !this.state.isLocked || this.state.runId !== runId) return;

        // Guarantee single-flight execution
        if (this.isHeartbeatInFlight) {
          scheduleNextTick();
          return;
        }

        this.isHeartbeatInFlight = true;
        const currentPromise = this.writeDurableLease(runId, this.state.assessmentId!);
        this.activeHeartbeatPromise = currentPromise;

        try {
          await currentPromise;
        } catch (e) {
          console.error(`[AssessmentLockStore] Heartbeat lease renewal failed for runId ${runId}:`, e);
        } finally {
          this.isHeartbeatInFlight = false;
          if (this.activeHeartbeatPromise === currentPromise) {
            this.activeHeartbeatPromise = null;
          }
          if (!this.isHeartbeatStopped) {
            scheduleNextTick();
          }
        }
      }, 5000);
    };

    scheduleNextTick();
  }

  private async stopHeartbeat(): Promise<void> {
    this.isHeartbeatStopped = true;
    if (this.leaseTimeout) {
      clearTimeout(this.leaseTimeout);
      this.leaseTimeout = null;
    }
    // Await any in-flight renewal to guarantee no post-stop write occurs
    if (this.activeHeartbeatPromise) {
      await this.activeHeartbeatPromise.catch(() => {});
      this.activeHeartbeatPromise = null;
    }
    this.isHeartbeatInFlight = false;
  }

  private getClientId(): string {
    if (typeof sessionStorage === 'undefined') return 'server_or_test_client';
    let id = sessionStorage.getItem('pulse_client_id');
    if (!id) {
      id = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('pulse_client_id', id);
    }
    return id;
  }

  private openGateDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('pulse_sw_gate', 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('session_locks')) {
          req.result.createObjectStore('session_locks', { keyPath: 'clientId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }
}

export const assessmentLockStore = new AssessmentLockStore();
