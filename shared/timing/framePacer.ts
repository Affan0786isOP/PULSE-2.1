/**
 * Shared live-timer pacing helper.
 *
 * Targets an average of approximately 60 UI updates per second. It does not
 * change the physical display refresh rate or quantize stimulus timestamps.
 */
export function createFramePacer(targetFps = 60) {
  if (!Number.isFinite(targetFps) || targetFps <= 0) {
    throw new RangeError('targetFps must be a finite number greater than zero');
  }

  const targetInterval = 1000 / targetFps;
  let lastTimestamp: number | null = null;
  let accumulator = 0;

  return {
    /**
     * Decide whether the timer UI should update on this RAF tick.
     * @param now Monotonic timestamp from requestAnimationFrame.
     */
    shouldUpdate(now: number): boolean {
      if (!Number.isFinite(now)) return false;

      if (lastTimestamp === null) {
        lastTimestamp = now;
        return true;
      }

      const elapsed = Math.max(0, now - lastTimestamp);
      lastTimestamp = now;
      accumulator += elapsed;

      if (accumulator >= targetInterval) {
        accumulator %= targetInterval;
        return true;
      }

      return false;
    },

    /** Reset the pacing phase at the start of each stimulus. */
    reset(): void {
      lastTimestamp = null;
      accumulator = 0;
    },
  };
}
