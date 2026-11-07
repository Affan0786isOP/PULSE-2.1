import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assessmentLockStore } from '../../shared/assessment/assessmentLockStore';

describe('AssessmentLockStore — Lifecycle, Concurrency & Resilience (Phase 3)', () => {
  let mockDb: any;
  let mockStoreData: Map<string, any>;
  let mockTxAbortSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStoreData = new Map();
    mockTxAbortSpy = vi.fn();

    // Mock IndexedDB
    mockDb = {
      transaction: vi.fn(() => {
        const tx: any = {
          abort: mockTxAbortSpy,
          oncomplete: null,
          onerror: null,
          onabort: null,
          objectStore: vi.fn(() => ({
            put: vi.fn((data: any) => {
              mockStoreData.set(data.clientId, data);
              setTimeout(() => tx.oncomplete?.(), 0);
            }),
            get: vi.fn((key: string) => {
              const req: any = { result: mockStoreData.get(key), onsuccess: null, onerror: null };
              setTimeout(() => req.onsuccess?.(), 0);
              return req;
            }),
            delete: vi.fn((key: string) => {
              mockStoreData.delete(key);
              setTimeout(() => tx.oncomplete?.(), 0);
            })
          }))
        };
        return tx;
      })
    };

    // Mock openGateDb on store
    (assessmentLockStore as any).openGateDb = vi.fn().mockResolvedValue(mockDb);

    // Reset store internal state
    (assessmentLockStore as any).state = {
      isLocked: false,
      isAcquiring: false,
      runId: null,
      assessmentId: null,
      submissionStage: 'IDLE',
      timestamp: 0,
    };
    (assessmentLockStore as any).isAcquiringMutex = false;
    (assessmentLockStore as any).isHeartbeatInFlight = false;
    (assessmentLockStore as any).isHeartbeatStopped = false;
    (assessmentLockStore as any).activeHeartbeatPromise = null;
    (assessmentLockStore as any).leaseTimeout = null;
    (assessmentLockStore as any).activeAcquisitionPromise = null;
    (assessmentLockStore as any).activeAcquisitionAbortController = null;
    (assessmentLockStore as any).activeAcquisitionTx = null;
    (assessmentLockStore as any).activeTargetRunId = null;
  });

  afterEach(async () => {
    await (assessmentLockStore as any).stopHeartbeat();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. Acquires lock and transitions to locked state', async () => {
    const acquirePromise = assessmentLockStore.acquireLock('visual-reaction');
    expect(assessmentLockStore.isAcquiring()).toBe(true);
    expect(assessmentLockStore.isProtected()).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    const runId = await acquirePromise;

    expect(runId).toBeTruthy();
    expect(assessmentLockStore.isLocked()).toBe(true);
    expect(assessmentLockStore.isAcquiring()).toBe(false);
    expect(assessmentLockStore.getActiveRunId()).toBe(runId);
  });

  it('2. Prevents concurrent lock acquisitions', async () => {
    const p1 = assessmentLockStore.acquireLock('visual-reaction');
    const p2 = assessmentLockStore.acquireLock('direction');

    const res2 = await p2;
    expect(res2).toBeNull(); // Rejected immediately by mutex

    await vi.advanceTimersByTimeAsync(50);
    const res1 = await p1;
    expect(res1).toBeTruthy();
  });

  it('3. Guarantees single-flight heartbeat renewal without overlapping transactions', async () => {
    const acquirePromise = assessmentLockStore.acquireLock('visual-reaction');
    await vi.advanceTimersByTimeAsync(50);
    const runId = await acquirePromise;
    expect(runId).toBeTruthy();

    let writeCount = 0;
    let pendingWriteResolve: (() => void) | null = null;

    // Simulate slow IndexedDB transaction taking longer than heartbeat interval (5s)
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockImplementation(() => {
      writeCount++;
      return new Promise<void>((resolve) => {
        pendingWriteResolve = resolve;
      });
    });

    // Advance 5 seconds to trigger 1st heartbeat tick
    await vi.advanceTimersByTimeAsync(5000);
    expect(writeCount).toBe(1);
    expect((assessmentLockStore as any).isHeartbeatInFlight).toBe(true);

    // Advance another 5 seconds while previous write is still in flight
    await vi.advanceTimersByTimeAsync(5000);
    // Single-flight guarantee: writeCount MUST NOT increase while in flight
    expect(writeCount).toBe(1);

    // Resolve in-flight write
    pendingWriteResolve!();
    await Promise.resolve();

    expect((assessmentLockStore as any).isHeartbeatInFlight).toBe(false);

    // Next tick
    let nextResolve: (() => void) | null = null;
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockImplementation(() => {
      writeCount++;
      return new Promise<void>((resolve) => {
        nextResolve = resolve;
        resolve();
      });
    });

    await vi.advanceTimersByTimeAsync(5000);
    expect(writeCount).toBe(2);
  });

  it('4. stopHeartbeat() awaits in-flight write before durable lease cleanup', async () => {
    const acquirePromise = assessmentLockStore.acquireLock('visual-reaction');
    await vi.advanceTimersByTimeAsync(50);
    const runId = await acquirePromise;

    let writeSettled = false;
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          writeSettled = true;
          resolve();
        }, 1000);
      });
    });

    // Trigger tick
    await vi.advanceTimersByTimeAsync(5000);
    expect((assessmentLockStore as any).isHeartbeatInFlight).toBe(true);

    // Call stopHeartbeat() concurrently with timer advance
    const stopPromise = (assessmentLockStore as any).stopHeartbeat();
    expect(writeSettled).toBe(false);

    // Advance time for write to settle
    await vi.advanceTimersByTimeAsync(1500);
    await stopPromise;

    expect(writeSettled).toBe(true);
    expect((assessmentLockStore as any).isHeartbeatStopped).toBe(true);
    expect((assessmentLockStore as any).activeHeartbeatPromise).toBeNull();
  });

  it('5. Concurrency isolation: cancelled acquisition clears state cleanly', async () => {
    // Start acquisition A
    let resolveWriteA: (() => void) | null = null;
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockImplementation((runId: string, assessmentId: string, signal?: AbortSignal) => {
      // Set active acquisition tx for abortion check
      (assessmentLockStore as any).activeAcquisitionTx = { abort: mockTxAbortSpy };
      return new Promise<void>((resolve, reject) => {
        resolveWriteA = resolve;
        signal?.addEventListener('abort', () => {
          mockTxAbortSpy();
          reject(new Error('Acquisition aborted'));
        });
      });
    });

    const promiseA = assessmentLockStore.acquireLock('visual-reaction');
    expect(assessmentLockStore.isAcquiring()).toBe(true);

    // Cancel pending acquisition A
    const cancelPromise = assessmentLockStore.cancelPendingAcquisition();
    expect(mockTxAbortSpy).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    await cancelPromise;
    const resA = await promiseA;

    expect(resA).toBeNull();
    expect(assessmentLockStore.isAcquiring()).toBe(false);
    expect(assessmentLockStore.isLocked()).toBe(false);

    // Now start acquisition B - must succeed cleanly
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockResolvedValue(undefined);
    const promiseB = assessmentLockStore.acquireLock('direction');
    await vi.advanceTimersByTimeAsync(50);
    const resB = await promiseB;

    expect(resB).toBeTruthy();
    expect(assessmentLockStore.isLocked()).toBe(true);
    expect(assessmentLockStore.getActiveRunId()).toBe(resB);
  });

  it('6. Strict 4-stage submission lifecycle prevents release or abort while submitting', async () => {
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockResolvedValue(undefined);
    const runId = await assessmentLockStore.acquireLock('visual-reaction');
    await vi.advanceTimersByTimeAsync(50);

    expect(assessmentLockStore.isSubmitting()).toBe(false);

    // Step 1: IDLE -> markSubmissionPending
    const markPending = assessmentLockStore.markSubmissionPending(runId!);
    expect(markPending).toBe(true);
    expect(assessmentLockStore.isSubmitting()).toBe(true);

    // Cannot abort or release while SUBMITTING
    const abortAttempt = await assessmentLockStore.forceAbortLock(runId!);
    expect(abortAttempt).toBe(false);
    const releaseAttempt = await assessmentLockStore.completeSubmissionAndRelease(runId!);
    expect(releaseAttempt).toBe(false);
    expect(assessmentLockStore.isLocked()).toBe(true);

    // Step 2: markSubmissionSettled
    const markSettled = assessmentLockStore.markSubmissionSettled(runId!, true);
    expect(markSettled).toBe(true);
    expect(assessmentLockStore.isSubmitting()).toBe(false);

    // Step 3: completeSubmissionAndRelease settles
    const releaseSuccess = await assessmentLockStore.completeSubmissionAndRelease(runId!);
    expect(releaseSuccess).toBe(true);
    expect(assessmentLockStore.isLocked()).toBe(false);
    expect(assessmentLockStore.getActiveRunId()).toBeNull();
  });

  it('7. Cleanup failure recovery: resumes heartbeat if lease cleanup fails', async () => {
    (assessmentLockStore as any).writeDurableLease = vi.fn().mockResolvedValue(undefined);
    const runId = await assessmentLockStore.acquireLock('visual-reaction');
    await vi.advanceTimersByTimeAsync(50);

    // Mock clearDurableLease failure
    (assessmentLockStore as any).clearDurableLease = vi.fn().mockRejectedValue(new Error('IndexedDB disk failure'));

    const startHeartbeatSpy = vi.spyOn(assessmentLockStore as any, 'startHeartbeat');

    // Attempt force abort
    await expect(assessmentLockStore.forceAbortLock(runId!)).rejects.toThrow('IndexedDB disk failure');

    // Heartbeat resumed to protect the lease
    expect(startHeartbeatSpy).toHaveBeenCalledWith(runId);
    expect(assessmentLockStore.isLocked()).toBe(true);
    expect(assessmentLockStore.getActiveRunId()).toBe(runId);
  });
});
