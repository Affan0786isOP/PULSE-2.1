// shared/telemetry/pageViewTrackerGuard.ts

class PageViewTrackerGuard {
  private lastTrackedKey: string | null = null;
  private lastTrackedTimestamp: number = 0;

  /**
   * Evaluates whether a page-view telemetry event should be tracked.
   * Deduplicates duplicate events for the same navigation step (e.g. React 19 StrictMode,
   * surface re-mounts between desktop and mobile) while allowing distinct navigations
   * to the same route.
   */
  public shouldTrack(route: string, navigationKey: string): boolean {
    const now = Date.now();
    const compoundKey = `${route}::${navigationKey}`;

    // If identical navigation identity was tracked within 2000ms, deduplicate
    if (this.lastTrackedKey === compoundKey && now - this.lastTrackedTimestamp < 2000) {
      return false;
    }

    this.lastTrackedKey = compoundKey;
    this.lastTrackedTimestamp = now;
    return true;
  }

  public resetForTest(): void {
    this.lastTrackedKey = null;
    this.lastTrackedTimestamp = 0;
  }
}

export const pageViewTrackerGuard = new PageViewTrackerGuard();
